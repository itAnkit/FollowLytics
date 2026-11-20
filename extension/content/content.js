// FollowLytics WhatsApp Web Content Script
(function () {
  console.log('[FollowLytics] Content script initialized on WhatsApp Web.');

  let currentChat = null;
  let trackedCustomers = {};
  let currentMode = 'COPILOT'; // 'COPILOT' or 'AUTOPILOT'
  let backendUrl = 'http://localhost:8080';
  let vendorPhone = '+919876543210';
  let isProcessing = false;
  let lastProcessedMsgText = '';

  // Safe storage wrappers to gracefully handle Chrome extension reload invalidations
  function safeStorageGet(keys, callback) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.local) {
        chrome.storage.local.get(keys, callback);
        return;
      }
    } catch (e) {}
    callback({});
  }

  function safeStorageSet(data) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.local) {
        chrome.storage.local.set(data);
      }
    } catch (e) {
      console.warn('[FollowLytics] Extension storage unavailable. Operating in-memory.');
    }
  }

  // Load stored preferences & sync active merchant
  function loadSettings() {
    safeStorageGet(['trackedCustomers', 'defaultMode', 'backendUrl', 'vendorPhone'], (res) => {
      if (res.trackedCustomers) trackedCustomers = res.trackedCustomers;
      if (res.defaultMode) currentMode = res.defaultMode;
      if (res.backendUrl) backendUrl = res.backendUrl;
      if (res.vendorPhone) vendorPhone = res.vendorPhone;

      // Query current active merchant from backend
      fetchActiveMerchant();
    });
  }

  function fetchActiveMerchant() {
    fetch(`${backendUrl}/api/auth/current`)
      .then(r => r.status === 200 ? r.json() : null)
      .then(v => {
        if (v && v.phone) {
          vendorPhone = v.phone;
          safeStorageSet({ vendorPhone: v.phone, vendorId: v.id, storeName: v.storeName });
        }
      })
      .catch(() => {});
  }

  loadSettings();

  // Listen for storage changes from popup or web-sync
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.trackedCustomers) trackedCustomers = changes.trackedCustomers.newValue || {};
        if (changes.defaultMode) currentMode = changes.defaultMode.newValue || 'COPILOT';
        if (changes.backendUrl) backendUrl = changes.backendUrl.newValue || backendUrl;
        if (changes.vendorPhone) vendorPhone = changes.vendorPhone.newValue || vendorPhone;
        updateHeaderUI();
      });
    }
  } catch (e) {}

  // Main DOM Observer to detect active chat and incoming messages
  const observer = new MutationObserver(() => {
    detectActiveChat();
    observeIncomingMessages();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Detect active open chat
  function detectActiveChat() {
    const header = document.querySelector('#main header, div[data-testid="conversation-header"]');
    if (!header) {
      currentChat = null;
      removeCopilotCard();
      return;
    }

    // Extract contact title / phone
    const titleEl = header.querySelector('span[title], div[role="button"] span[dir="auto"], span._ao3e');
    const contactName = titleEl ? (titleEl.getAttribute('title') || titleEl.innerText.trim()) : 'Customer';

    if (!currentChat || currentChat.name !== contactName) {
      const cleanPhone = contactName.replace(/[^0-9+]/g, '') || contactName;
      currentChat = {
        name: contactName,
        phone: cleanPhone,
        headerElement: header
      };
      lastProcessedMsgText = '';
      removeCopilotCard();
      injectHeaderUI();

      // Check real-time tracking status with backend
      checkBackendTrackStatus(currentChat.phone, currentChat.name);
    }
  }

  // Check backend whether this customer is tracked
  function checkBackendTrackStatus(phone, name) {
    if (!phone) return;

    callExtensionApi('GET_TRACK_STATUS', { customerPhone: phone, vendorPhone })
      .then(res => {
        if (res && res.isTracked !== undefined) {
          if (res.isTracked) {
            trackedCustomers[name] = true;
          } else {
            delete trackedCustomers[name];
          }
          safeStorageSet({ trackedCustomers });
          updateHeaderUI();
        }
      })
      .catch(() => {
        // Fallback to local cache
        updateHeaderUI();
      });
  }

  // Inject or update header buttons
  function injectHeaderUI() {
    if (!currentChat || !currentChat.headerElement) return;

    let container = document.getElementById('followlytics-header-bar');
    if (!container) {
      container = document.createElement('div');
      container.id = 'followlytics-header-bar';
      container.className = 'followlytics-header-container';

      // Insert right next to contact header details
      const targetAnchor = currentChat.headerElement.querySelector('div[role="button"]') || currentChat.headerElement.children[1] || currentChat.headerElement;
      targetAnchor.parentNode.insertBefore(container, targetAnchor.nextSibling);
    }

    updateHeaderUI();
  }

  function updateHeaderUI() {
    const container = document.getElementById('followlytics-header-bar');
    if (!container || !currentChat) return;

    const isTracked = !!trackedCustomers[currentChat.name];

    if (!isTracked) {
      container.innerHTML = `
        <button id="fl-btn-track" class="followlytics-btn-track" title="Track this customer conversation in FollowLytics">
          <span>✨ Track Customer</span>
        </button>
      `;

      const trackBtn = container.querySelector('#fl-btn-track');
      if (trackBtn) {
        trackBtn.onclick = () => {
          trackBtn.innerHTML = '<span>⏳ Tracking...</span>';
          trackBtn.disabled = true;

          const recentContext = scrapeChatHistory();
          const payload = {
            customerPhone: currentChat.phone,
            customerName: currentChat.name,
            vendorPhone: vendorPhone,
            isTracked: true,
            recentContext: recentContext
          };

          callExtensionApi('TRACK_CUSTOMER', payload)
            .then(() => {
              trackedCustomers[currentChat.name] = true;
              safeStorageSet({ trackedCustomers });
              updateHeaderUI();

              // Trigger immediate Copilot suggestion if customer has an inquiry
              const lastInquiry = getLastCustomerMessage();
              if (lastInquiry) {
                handleIncomingCustomerMessage(lastInquiry);
              }
            })
            .catch(err => {
              console.error('[FollowLytics] Track failed:', err);
              // Set local anyway as fallback
              trackedCustomers[currentChat.name] = true;
              safeStorageSet({ trackedCustomers });
              updateHeaderUI();
            });
        };
      }
    } else {
      container.innerHTML = `
        <span class="followlytics-active-badge">⭐ FollowLytics Active</span>
        <select id="fl-mode-select" class="followlytics-mode-select" title="Toggle AI Copilot or Autopilot">
          <option value="COPILOT" ${currentMode === 'COPILOT' ? 'selected' : ''}>Copilot (Draft)</option>
          <option value="AUTOPILOT" ${currentMode === 'AUTOPILOT' ? 'selected' : ''}>Autopilot (Auto)</option>
        </select>
        <button id="fl-btn-untrack" class="followlytics-btn-dismiss" title="Untrack this customer" style="font-size:11px; padding:3px 7px; border:1px solid #e5e7eb; border-radius:10px; background:#fff; cursor:pointer;">✕ Untrack</button>
      `;

      const modeSelect = container.querySelector('#fl-mode-select');
      if (modeSelect) {
        modeSelect.onchange = (e) => {
          currentMode = e.target.value;
          safeStorageSet({ defaultMode: currentMode });
        };
      }

      const untrackBtn = container.querySelector('#fl-btn-untrack');
      if (untrackBtn) {
        untrackBtn.onclick = () => {
          untrackBtn.innerText = '...';
          const payload = {
            customerPhone: currentChat.phone,
            customerName: currentChat.name,
            vendorPhone: vendorPhone,
            isTracked: false
          };

          callExtensionApi('TRACK_CUSTOMER', payload)
            .finally(() => {
              delete trackedCustomers[currentChat.name];
              safeStorageSet({ trackedCustomers });
              removeCopilotCard();
              updateHeaderUI();
            });
        };
      }
    }
  }

  // Scrape visible messages from WhatsApp Web chat DOM
  function scrapeChatHistory() {
    const messages = document.querySelectorAll('#main .message-in, #main .message-out');
    const history = [];
    messages.forEach(m => {
      const isCustomer = m.classList.contains('message-in');
      const textEl = m.querySelector('span.selectable-text, div.copyable-text span, span[dir="ltr"]');
      if (textEl && textEl.innerText.trim()) {
        history.push(`${isCustomer ? 'Customer' : 'Merchant'}: ${textEl.innerText.trim()}`);
      }
    });
    return history.slice(-6).join('\n');
  }

  function getLastCustomerMessage() {
    const incoming = document.querySelectorAll('#main .message-in');
    if (!incoming || incoming.length === 0) return null;
    const latest = incoming[incoming.length - 1];
    const textEl = latest.querySelector('span.selectable-text, div.copyable-text span, span[dir="ltr"]');
    return textEl ? textEl.innerText.trim() : null;
  }

  // Observe incoming messages in real-time
  function observeIncomingMessages() {
    if (!currentChat || !trackedCustomers[currentChat.name] || isProcessing) return;

    const incomingMessages = document.querySelectorAll('#main .message-in');
    if (!incomingMessages || incomingMessages.length === 0) return;

    const latestMsg = incomingMessages[incomingMessages.length - 1];
    const textEl = latestMsg.querySelector('span.selectable-text, div.copyable-text span, span[dir="ltr"]');
    if (!textEl) return;

    const text = textEl.innerText.trim();
    if (!text || text === lastProcessedMsgText) return;

    lastProcessedMsgText = text;
    handleIncomingCustomerMessage(text);
  }

  // Handle incoming message through FollowLytics AI
  function handleIncomingCustomerMessage(msgText) {
    if (isProcessing) return;
    isProcessing = true;

    showCopilotLoading(msgText);

    const payload = {
      vendorPhone: vendorPhone,
      customerPhone: currentChat.phone,
      customerName: currentChat.name,
      message: msgText,
      mode: currentMode
    };

    callExtensionApi('PROCESS_CHAT_MESSAGE', payload)
      .then(data => {
        isProcessing = false;
        renderCopilotResponse(data);
      })
      .catch(err => {
        isProcessing = false;
        renderCopilotError(err.message || 'Error communicating with AI engine');
      });
  }

  // Unified API caller through background worker with direct fallback
  function callExtensionApi(action, payload) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
          chrome.runtime.sendMessage({ action, payload, backendUrl }, (res) => {
            if (chrome.runtime.lastError || !res || !res.success) {
              directApiFallback(action, payload).then(resolve).catch(reject);
            } else {
              resolve(res.data);
            }
          });
          return;
        }
      } catch (e) {}

      directApiFallback(action, payload).then(resolve).catch(reject);
    });
  }

  function directApiFallback(action, payload) {
    if (action === 'PROCESS_CHAT_MESSAGE') {
      return fetch(`${backendUrl}/api/chat/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());
    }
    if (action === 'TRACK_CUSTOMER') {
      return fetch(`${backendUrl}/api/chat/track-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());
    }
    if (action === 'GET_TRACK_STATUS') {
      return fetch(`${backendUrl}/api/chat/track-status?customerPhone=${encodeURIComponent(payload.customerPhone)}&vendorPhone=${encodeURIComponent(payload.vendorPhone || '')}`)
        .then(r => r.json());
    }
    return Promise.reject(new Error('Unknown action'));
  }

  // Show Copilot Loading State
  function showCopilotLoading(prompt) {
    let card = document.getElementById('followlytics-copilot-card');
    if (!card) card = createCopilotCard();

    card.innerHTML = `
      <div class="followlytics-copilot-header">
        <div class="followlytics-copilot-title">
          <span class="followlytics-spinner"></span>
          <span>FollowLytics AI analyzing customer inquiry...</span>
        </div>
        <button id="fl-card-close" class="followlytics-btn-dismiss">✕</button>
      </div>
      <div class="followlytics-copilot-text" style="color: #6b7280; font-style: italic;">
        "${prompt.length > 70 ? prompt.substring(0, 67) + '...' : prompt}"
      </div>
    `;

    card.querySelector('#fl-card-close').onclick = removeCopilotCard;
  }

  // Render AI Suggestion Card
  function renderCopilotResponse(data) {
    let card = document.getElementById('followlytics-copilot-card');
    if (!card) card = createCopilotCard();

    const stageClass = 'stage-' + (data.stage ? data.stage.toLowerCase() : 'inquiry');
    const stageName = data.stage ? data.stage.replace('_', ' ') : 'INQUIRY';
    const dealBadge = (data.dealValue && data.dealValue > 0) ? ` • ₹${data.dealValue}` : '';
    const leakBadge = (data.leakedReason && data.leakedReason !== 'NONE') ? ` • ⚠️ Lost: ${data.leakedReason}` : '';

    card.innerHTML = `
      <div class="followlytics-copilot-header">
        <div class="followlytics-copilot-title">
          <span>✨ FollowLytics AI Suggestion</span>
        </div>
        <div class="followlytics-copilot-meta">
          <span class="followlytics-stage-badge ${stageClass}">${stageName}${dealBadge}${leakBadge}</span>
          <button id="fl-card-close" class="followlytics-btn-dismiss" title="Dismiss">✕</button>
        </div>
      </div>
      <div class="followlytics-copilot-text" id="fl-copilot-reply-text">
        ${escapeHtml(data.replyText)}
      </div>
      <div class="followlytics-copilot-actions">
        <button id="fl-btn-edit" class="followlytics-btn-edit">✏️ Edit in Chat</button>
        <button id="fl-btn-send" class="followlytics-btn-send">
          <span>🚀 Send Reply</span>
          <span style="font-size: 10px; opacity: 0.8;">(Enter)</span>
        </button>
      </div>
    `;

    card.querySelector('#fl-card-close').onclick = removeCopilotCard;

    const sendBtn = card.querySelector('#fl-btn-send');
    const editBtn = card.querySelector('#fl-btn-edit');

    sendBtn.onclick = () => {
      insertAndSendMessage(data.replyText);
      removeCopilotCard();
    };

    editBtn.onclick = () => {
      insertIntoComposer(data.replyText);
      removeCopilotCard();
    };

    // If Autopilot Mode is ON, automatically dispatch after a brief natural delay
    if (currentMode === 'AUTOPILOT') {
      sendBtn.innerHTML = `<span>⏳ Autopilot sending in 2s...</span>`;
      setTimeout(() => {
        insertAndSendMessage(data.replyText);
        removeCopilotCard();
      }, 2000);
    }
  }

  function renderCopilotError(errMsg) {
    let card = document.getElementById('followlytics-copilot-card');
    if (!card) return;
    card.innerHTML = `
      <div class="followlytics-copilot-header">
        <div class="followlytics-copilot-title" style="color: #dc2626;">
          <span>⚠️ FollowLytics Backend Notice</span>
        </div>
        <button id="fl-card-close" class="followlytics-btn-dismiss">✕</button>
      </div>
      <div class="followlytics-copilot-text" style="color: #dc2626; font-size: 12px;">
        ${errMsg}<br><small style="color:#6b7280;">Ensure FollowLytics backend is running on <code>${backendUrl}</code>.</small>
      </div>
    `;
    card.querySelector('#fl-card-close').onclick = removeCopilotCard;
  }

  function createCopilotCard() {
    let card = document.getElementById('followlytics-copilot-card');
    if (card) return card;

    card = document.createElement('div');
    card.id = 'followlytics-copilot-card';
    card.className = 'followlytics-copilot-container';

    const mainChat = document.querySelector('#main');
    if (mainChat) {
      mainChat.appendChild(card);
    } else {
      document.body.appendChild(card);
    }
    return card;
  }

  function removeCopilotCard() {
    const card = document.getElementById('followlytics-copilot-card');
    if (card) card.remove();
  }

  // Insert text into WhatsApp's contenteditable composer
  function insertIntoComposer(text) {
    const composer = document.querySelector('#main footer div[contenteditable="true"]');
    if (!composer) return;

    composer.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);

    composer.dispatchEvent(new Event('input', { bubbles: true }));
    composer.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Insert and fire send
  function insertAndSendMessage(text) {
    insertIntoComposer(text);

    setTimeout(() => {
      const sendBtn = document.querySelector('#main footer button[data-testid="compose-btn-send"], #main footer span[data-icon="send"]');
      if (sendBtn) {
        sendBtn.click();
      } else {
        const composer = document.querySelector('#main footer div[contenteditable="true"]');
        if (composer) {
          const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13
          });
          composer.dispatchEvent(enterEvent);
        }
      }
    }, 250);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
