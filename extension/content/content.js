// FollowLytics WhatsApp Web Content Script
(function () {
  console.log('[FollowLytics] Content script initialized on WhatsApp Web.');

  let currentChat = null;
  let trackedCustomers = {};
  let currentMode = 'COPILOT'; // 'COPILOT' or 'AUTOPILOT'
  let backendUrl = 'http://localhost:8080';
  let vendorPhone = '';
  let vendorId = null;
  let isProcessing = false;
  let baselineReady = false;
  let baselineTimer = null;
  let autoSendTimer = null;
  let lastAutoSendTime = 0;
  let lastReplySentAt = 0;
  const processedMsgIds = new Set();
  const recentlySentTexts = new Set();
  let resolvedPhones = {};
  let lastDiagKey = '';

  function normalizeMsgText(str) {
    return String(str || '').replace(/\s+/g, ' ').trim();
  }

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

  // Load stored preferences & sync active merchant via background worker (avoids WhatsApp CSP)
  function loadSettings() {
    safeStorageGet(['trackedCustomers', 'defaultMode', 'backendUrl', 'vendorPhone', 'vendorId', 'resolvedPhones'], (res) => {
      if (res.trackedCustomers) trackedCustomers = res.trackedCustomers;
      if (res.defaultMode) currentMode = res.defaultMode;
      if (res.backendUrl) backendUrl = res.backendUrl;
      if (res.vendorPhone) vendorPhone = res.vendorPhone;
      if (res.vendorId) vendorId = res.vendorId;
      if (res.resolvedPhones) resolvedPhones = res.resolvedPhones;

      callExtensionApi('GET_CURRENT_VENDOR', {})
        .then(v => {
          if (v && v.phone) {
            vendorPhone = v.phone;
            vendorId = v.id;
            safeStorageSet({ vendorPhone: v.phone, vendorId: v.id, storeName: v.storeName });
          }
        })
        .catch(() => {});
    });
  }

  loadSettings();

  // Listen for storage changes from popup or web-sync
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.trackedCustomers) trackedCustomers = changes.trackedCustomers.newValue || {};
        if (changes.defaultMode) currentMode = changes.defaultMode.newValue || 'COPILOT';
        if (changes.backendUrl) backendUrl = changes.backendUrl.newValue || backendUrl;
        if (changes.vendorPhone) vendorPhone = changes.vendorPhone.newValue || '';
        if (changes.vendorId) vendorId = changes.vendorId.newValue || null;
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

  // Safety polling every 1.5s in case WhatsApp virtualized DOM skips mutation events
  setInterval(() => {
    detectActiveChat();
    observeIncomingMessages();
  }, 1500);

  // Extract true phone number & display name from WhatsApp Web DOM
  function extractContactInfo(header) {
    // 1. Extract exact WhatsApp JID phone number from message data-id attributes in #main
    let extractedPhone = '';
    const dataIdEl = document.querySelector('#main [data-id*="@c.us"], #main [data-id*="@s.whatsapp.net"]');
    if (dataIdEl) {
      const dataId = dataIdEl.getAttribute('data-id') || '';
      const match = dataId.match(/(\d{8,15})@(?:c\.us|s\.whatsapp\.net)/);
      if (match && match[1]) {
        extractedPhone = '+' + match[1];
      }
    }

    // 2. Check profile avatar img src URL (often contains u=91XXXXXXXXXX)
    if (!extractedPhone) {
      const avatarImgs = document.querySelectorAll('#main header img[src], #pane-side div[aria-selected="true"] img[src]');
      for (const img of avatarImgs) {
        const src = img.getAttribute('src') || '';
        const uMatch = src.match(/[?&]u=(\d{8,15})/);
        if (uMatch && uMatch[1]) {
          extractedPhone = '+' + uMatch[1];
          break;
        }
      }
    }

    // 3. Extract contact display title from #main header (ignoring action buttons/status)
    let contactName = '';
    const ignoredPhrases = [
      'search', 'menu', 'voice call', 'video call', 'profile photo', 'click here',
      'online', 'typing', 'last seen', 'business account', 'get the app', 'encrypt'
    ];
    const titleCandidates = header.querySelectorAll('span[dir="auto"], span[title], h1, h2');
    for (const el of titleCandidates) {
      const txt = (el.getAttribute('title') || el.innerText || '').trim();
      if (!txt || txt.length < 2) continue;
      if (el.closest('button') && el.closest('button').querySelector('svg')) continue;
      const lower = txt.toLowerCase();
      if (ignoredPhrases.some(ig => lower.includes(ig))) continue;
      contactName = txt;
      break;
    }

    // 4. Fallback: Check active selected chat in left sidebar (#pane-side)
    if (!contactName) {
      const activeRow = document.querySelector('#pane-side div[aria-selected="true"] span[title], #pane-side [tabindex="0"] span[title]');
      if (activeRow) {
        contactName = (activeRow.getAttribute('title') || activeRow.innerText || '').trim();
      }
    }

    // 5. Fallback: Check incoming message [data-pre-plain-text]
    if (!extractedPhone || !contactName) {
      const incomingCopyable = document.querySelector('#main .message-in [data-pre-plain-text]');
      if (incomingCopyable) {
        const pre = incomingCopyable.getAttribute('data-pre-plain-text') || '';
        const preMatch = pre.match(/\]\s*(.+?):\s*$/);
        if (preMatch && preMatch[1]) {
          const sender = preMatch[1].trim();
          if (!contactName) contactName = sender;
          if (!extractedPhone) {
            const digits = sender.replace(/[^0-9]/g, '');
            if (digits.length >= 8 && digits.length <= 15) {
              extractedPhone = '+' + digits;
            }
          }
        }
      }
    }

    if (!contactName) {
      contactName = extractedPhone || 'WhatsApp Customer';
    }

    // 6. Check previously cached phone number for this saved contact name
    if (!extractedPhone && resolvedPhones[contactName]) {
      extractedPhone = resolvedPhones[contactName];
    }

    // 7. Check if Contact Info drawer is currently visible on screen
    if (!extractedPhone) {
      const drawerPhone = findPhoneInContactInfoDrawer();
      if (drawerPhone) {
        extractedPhone = drawerPhone;
        resolvedPhones[contactName] = drawerPhone;
        safeStorageSet({ resolvedPhones });
      }
    }

    // 8. If still no phone, check if contactName itself is a phone number
    if (!extractedPhone) {
      const digitsOnly = contactName.replace(/[^0-9]/g, '');
      if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
        extractedPhone = '+' + digitsOnly;
      } else {
        extractedPhone = contactName;
      }
    }

    return { name: contactName, phone: extractedPhone };
  }

  function findPhoneInContactInfoDrawer() {
    // Look in the right-side drawer (outside #main and #pane-side) for phone formatted like +91 89528 98277
    const allSpans = document.querySelectorAll('#app span[dir="auto"], #app span.selectable-text, #app div[data-testid="chat-info-drawer"] span');
    for (const s of allSpans) {
      if (s.closest('#main') || s.closest('#pane-side')) continue;
      const txt = (s.innerText || '').trim();
      const m = txt.match(/^\+(\d[\d\s-]{7,17}\d)$/);
      if (m) {
        const clean = '+' + m[1].replace(/[^0-9]/g, '');
        if (clean.length >= 9 && clean.length <= 16) {
          return clean;
        }
      }
    }
    return '';
  }

  // Silently peek Contact Info drawer once when tracking a saved contact (e.g. "Home") whose phone number is hidden by WhatsApp @lid
  function resolveRealPhoneFromContactInfo(header, contactName) {
    return new Promise((resolve) => {
      const existing = findPhoneInContactInfoDrawer();
      if (existing) {
        resolvedPhones[contactName] = existing;
        safeStorageSet({ resolvedPhones });
        resolve(existing);
        return;
      }

      const clickTarget = header.querySelector('div[role="button"], span[dir="auto"], img');
      if (!clickTarget) {
        resolve('');
        return;
      }

      clickTarget.click();
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        const found = findPhoneInContactInfoDrawer();
        if (found || attempts >= 15) {
          clearInterval(poll);
          if (found) {
            resolvedPhones[contactName] = found;
            safeStorageSet({ resolvedPhones });
            console.log('[FollowLytics] Resolved real phone from Contact Info:', contactName, '->', found);
          }
          // Close the Contact Info drawer cleanly
          const closeBtn = Array.from(document.querySelectorAll('#app button[aria-label="Close"], #app span[data-icon="x"], #app span[data-icon="close"]'))
            .find(el => !el.closest('#main') && !el.closest('#pane-side'));
          if (closeBtn) {
            (closeBtn.closest('button') || closeBtn).click();
          }
          resolve(found || '');
        }
      }, 60);
    });
  }

  function markExistingMessagesAsBaseline() {
    const allMsgs = getMessageBubbles();
    allMsgs.forEach(m => {
      const dataId = m.getAttribute('data-id') || m.closest('[data-id]')?.getAttribute('data-id') || '';
      const prePlain = m.querySelector('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') || '';
      const txt = extractMessageText(m);
      const id = dataId || prePlain || txt;
      if (id) processedMsgIds.add(id);
    });
    baselineReady = true;
    console.log('[FollowLytics] Chat baseline set (' + allMsgs.length + ' existing messages). Waiting for new customer reply.');
  }

  // Detect active open chat
  function detectActiveChat() {
    const header = document.querySelector('#main header, div[data-testid="conversation-header"]');
    if (!header) {
      currentChat = null;
      baselineReady = false;
      removeCopilotCard();
      return;
    }

    const info = extractContactInfo(header);
    const chatKey = info.phone;

    if (!currentChat || currentChat.phone !== chatKey) {
      console.log('[FollowLytics] Active chat detected:', info.name, '| Phone:', info.phone);
      currentChat = {
        name: info.name,
        phone: info.phone,
        headerElement: header
      };
      isProcessing = false;
      baselineReady = false;
      if (baselineTimer) clearTimeout(baselineTimer);
      removeCopilotCard();
      injectHeaderUI();

      // Wait briefly for chat history DOM to render, then record baseline so historical messages don't auto-reply
      baselineTimer = setTimeout(markExistingMessagesAsBaseline, 1000);

      // Check real-time tracking status with backend
      checkBackendTrackStatus(currentChat.phone);
    } else if (!document.getElementById('followlytics-header-bar')) {
      // Re-inject if WhatsApp Web re-rendered the header DOM
      currentChat.headerElement = header;
      injectHeaderUI();
    }
  }

  // Check backend whether this customer is tracked
  function checkBackendTrackStatus(phone) {
    if (!phone) return;

    callExtensionApi('GET_TRACK_STATUS', { customerPhone: phone, vendorPhone })
      .then(res => {
        if (res && res.isTracked !== undefined) {
          if (res.isTracked) {
            trackedCustomers[phone] = true;
          } else {
            delete trackedCustomers[phone];
          }
          safeStorageSet({ trackedCustomers });
          updateHeaderUI();
        }
      })
      .catch(() => {
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

      const targetAnchor = currentChat.headerElement.querySelector('div[role="button"]') || currentChat.headerElement.children[1] || currentChat.headerElement;
      if (targetAnchor && targetAnchor.parentNode) {
        targetAnchor.parentNode.insertBefore(container, targetAnchor.nextSibling);
      } else {
        currentChat.headerElement.appendChild(container);
      }
    }

    updateHeaderUI();
  }

  function updateHeaderUI() {
    const container = document.getElementById('followlytics-header-bar');
    if (!container || !currentChat) return;

    const chatKey = currentChat.phone;
    const isTracked = !!trackedCustomers[chatKey];

    if (!isTracked) {
      container.innerHTML = `
        <button id="fl-btn-track" class="followlytics-btn-track" title="Track ${escapeHtml(currentChat.phone)} in FollowLytics">
          <span>✨ Track Customer</span>
        </button>
      `;

      const trackBtn = container.querySelector('#fl-btn-track');
      if (trackBtn) {
        trackBtn.onclick = async () => {
          trackBtn.innerHTML = '<span>⏳ Resolving...</span>';
          trackBtn.disabled = true;

          // Re-extract in case messages loaded after chat opened
          const freshInfo = extractContactInfo(currentChat.headerElement);
          currentChat.name = freshInfo.name;
          let finalPhone = freshInfo.phone;

          // If saved contact (e.g. "Home") didn't expose numeric phone yet, peek Contact Info drawer cleanly
          if (!/^\+\d{8,15}$/.test(finalPhone)) {
            const resolved = await resolveRealPhoneFromContactInfo(currentChat.headerElement, currentChat.name);
            if (resolved) finalPhone = resolved;
          }
          currentChat.phone = finalPhone;

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
              trackedCustomers[currentChat.phone] = true;
              safeStorageSet({ trackedCustomers });
              markExistingMessagesAsBaseline();
              updateHeaderUI();
            })
            .catch(err => {
              console.error('[FollowLytics] Track failed:', err);
              trackedCustomers[currentChat.phone] = true;
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
        <button id="fl-btn-reply-now" class="followlytics-btn-track" title="Generate AI reply for latest message" style="padding:4px 10px; font-size:11px;">✨ Reply Now</button>
        <button id="fl-btn-untrack" class="followlytics-btn-dismiss" title="Untrack this customer" style="font-size:11px; padding:3px 7px; border:1px solid #e5e7eb; border-radius:10px; background:#fff; color:#374151; cursor:pointer;">✕ Untrack</button>
      `;

      const replyNowBtn = container.querySelector('#fl-btn-reply-now');
      if (replyNowBtn) {
        replyNowBtn.onclick = () => {
          const allMsgs = getMessageBubbles();
          let targetText = '';
          for (let i = allMsgs.length - 1; i >= 0; i--) {
            if (!isOutgoingBubble(allMsgs[i])) {
              targetText = extractMessageText(allMsgs[i]);
              if (targetText) break;
            }
          }
          if (!targetText && allMsgs.length > 0) {
            targetText = extractMessageText(allMsgs[allMsgs.length - 1]);
          }
          if (targetText) {
            isProcessing = false;
            handleIncomingCustomerMessage(targetText);
          } else {
            renderCopilotError('Could not read any message text in this chat.');
          }
        };
      }

      const modeSelect = container.querySelector('#fl-mode-select');
      if (modeSelect) {
        modeSelect.onchange = (e) => {
          currentMode = e.target.value;
          safeStorageSet({ defaultMode: currentMode });
          console.log('[FollowLytics] Mode switched to:', currentMode);

          if (currentMode === 'AUTOPILOT') {
            const openReply = document.getElementById('fl-copilot-reply-text');
            if (openReply && openReply.innerText.trim()) {
              insertAndSendMessage(openReply.innerText.trim());
              removeCopilotCard();
            }
          }
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
              delete trackedCustomers[currentChat.phone];
              safeStorageSet({ trackedCustomers });
              removeCopilotCard();
              updateHeaderUI();
            });
        };
      }
    }
  }

  // Extract clean text from a WhatsApp message element
  function extractMessageText(msgEl) {
    if (!msgEl) return '';
    const sel = msgEl.querySelector('span.selectable-text');
    if (sel && sel.innerText.trim()) return sel.innerText.trim();
    const copyable = msgEl.querySelector('[data-pre-plain-text] span[dir], [data-pre-plain-text]');
    if (copyable && copyable.innerText.trim()) return copyable.innerText.trim();
    const dirSpan = msgEl.querySelector('span[dir="ltr"], span[dir="rtl"]');
    return dirSpan ? dirSpan.innerText.trim() : '';
  }

  function getMessageBubbles() {
    let rows = Array.from(document.querySelectorAll('#main div[data-id]')).filter(r =>
      r.querySelector('span.selectable-text, [data-pre-plain-text]')
    );
    if (rows.length > 0) return rows;

    rows = Array.from(document.querySelectorAll('#main .message-in, #main .message-out'));
    if (rows.length > 0) return rows;

    rows = Array.from(document.querySelectorAll('#main [role="row"]')).filter(r =>
      r.querySelector('span.selectable-text, [data-pre-plain-text]')
    );
    if (rows.length > 0) return rows;

    return Array.from(document.querySelectorAll('#main [data-pre-plain-text]'));
  }

  function isOutgoingBubble(el) {
    if (!el) return false;
    const row = el.closest('[role="row"]') || el;
    if (el.classList.contains('message-out') || el.closest('.message-out') || row.querySelector('.message-out')) return true;
    const dataId = el.getAttribute('data-id') || el.closest('[data-id]')?.getAttribute('data-id') || '';
    if (dataId.startsWith('true_')) return true;
    if (row.querySelector('[data-icon*="check"], [data-icon*="dblcheck"], [data-icon*="time"], [aria-label*="Read"], [aria-label*="Delivered"], [aria-label*="Sent"], [aria-label*="Pending"]')) return true;

    // Never treat a reply we ourselves sent as an incoming customer message
    const normTxt = normalizeMsgText(extractMessageText(el));
    if (normTxt && recentlySentTexts.has(normTxt)) return true;

    // Visual alignment check inside #main: outgoing bubbles sit on the RIGHT side
    const mainEl = document.querySelector('#main');
    const inner = el.querySelector('.copyable-text, span.selectable-text') || el;
    if (mainEl && inner) {
      const mRect = mainEl.getBoundingClientRect();
      const iRect = inner.getBoundingClientRect();
      if (mRect.width > 200 && iRect.width > 0) {
        const leftGap = iRect.left - mRect.left;
        const rightGap = mRect.right - iRect.right;
        if (leftGap > rightGap + 40) return true;
      }
    }
    return false;
  }

  // Scrape visible messages from WhatsApp Web chat DOM
  function scrapeChatHistory() {
    const messages = getMessageBubbles();
    const history = [];
    messages.forEach(m => {
      const isOut = isOutgoingBubble(m);
      const txt = extractMessageText(m);
      if (txt) {
        history.push(`${isOut ? 'Merchant' : 'Customer'}: ${txt}`);
      }
    });
    return history.slice(-6).join('\n');
  }

  // Returns latest message ONLY if it is an incoming customer message (unanswered)
  function getLastCustomerMessageObj() {
    const allMsgs = getMessageBubbles();
    if (!allMsgs || allMsgs.length === 0) return null;

    const latest = allMsgs[allMsgs.length - 1];
    if (isOutgoingBubble(latest)) {
      return null; // Merchant already sent the last message
    }

    const text = extractMessageText(latest);
    if (!text) return null;
    const dataId = latest.getAttribute('data-id') || latest.closest('[data-id]')?.getAttribute('data-id') || '';
    const prePlain = latest.querySelector('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') || '';
    return { id: dataId || prePlain || text, text };
  }

  function getLastCustomerMessage() {
    const obj = getLastCustomerMessageObj();
    return obj ? obj.text : null;
  }

  // Observe incoming messages in real-time (ONLY triggers when a brand-new incoming customer message arrives after baseline)
  function observeIncomingMessages() {
    if (!currentChat || !trackedCustomers[currentChat.phone] || isProcessing || !baselineReady) return;
    if (Date.now() - lastReplySentAt < 3000) return;

    const allMsgs = getMessageBubbles();
    if (allMsgs.length === 0) return;

    const latest = allMsgs[allMsgs.length - 1];
    const dataId = latest.getAttribute('data-id') || latest.closest('[data-id]')?.getAttribute('data-id') || '';
    const prePlain = latest.querySelector('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') || '';
    const txt = extractMessageText(latest);
    const normTxt = normalizeMsgText(txt);
    const msgId = dataId || prePlain || normTxt;
    if (!msgId) return;

    // Record outgoing merchant messages (and our own sent replies) so we stop and wait for customer's next reply
    if (isOutgoingBubble(latest) || (normTxt && recentlySentTexts.has(normTxt))) {
      processedMsgIds.add(msgId);
      return;
    }

    if (!normTxt || processedMsgIds.has(msgId)) return;

    processedMsgIds.add(msgId);
    console.log('[FollowLytics] Customer replied:', txt, '| Mode:', currentMode);
    handleIncomingCustomerMessage(txt);
  }

  // Handle incoming message through FollowLytics AI
  function handleIncomingCustomerMessage(msgText) {
    if (isProcessing) return;
    isProcessing = true;

    // Safety timeout so processing lock never gets stuck
    const safetyTimer = setTimeout(() => { isProcessing = false; }, 15000);

    showCopilotLoading(msgText);

    const payload = {
      vendorId: vendorId,
      vendorPhone: vendorPhone,
      customerPhone: currentChat.phone,
      customerName: currentChat.name,
      message: msgText,
      mode: currentMode
    };

    callExtensionApi('PROCESS_CHAT_MESSAGE', payload)
      .then(data => {
        clearTimeout(safetyTimer);
        isProcessing = false;
        if (data && data.replyText) {
          renderCopilotResponse(data);
        } else {
          renderCopilotError('Empty AI response received.');
        }
      })
      .catch(err => {
        clearTimeout(safetyTimer);
        isProcessing = false;
        renderCopilotError(err.message || 'Error communicating with AI engine');
      });
  }

  // Unified API caller routed through Extension Background Service Worker (bypasses WhatsApp CSP)
  function callExtensionApi(action, payload) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
          chrome.runtime.sendMessage({
            action,
            payload,
            customerPhone: payload?.customerPhone,
            vendorPhone: payload?.vendorPhone || vendorPhone,
            backendUrl
          }, (res) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!res || !res.success) {
              reject(new Error(res?.error || 'Backend request failed'));
            } else {
              resolve(res.data);
            }
          });
          return;
        }
      } catch (e) {
        reject(e);
        return;
      }
      reject(new Error('Extension runtime disconnected. Please refresh WhatsApp Web (F5).'));
    });
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
        "${escapeHtml(prompt.length > 70 ? prompt.substring(0, 67) + '...' : prompt)}"
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
    const actionBadge = data.needsHumanAttention ? ' • 🚨 Action Needed' : '';

    card.innerHTML = `
      <div class="followlytics-copilot-header">
        <div class="followlytics-copilot-title">
          <span>✨ FollowLytics AI Suggestion</span>
        </div>
        <div class="followlytics-copilot-meta">
          <span class="followlytics-stage-badge ${data.needsHumanAttention ? 'stage-lost' : stageClass}">${stageName}${dealBadge}${leakBadge}${actionBadge}</span>
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
    if (autoSendTimer) clearTimeout(autoSendTimer);
    if (currentMode === 'AUTOPILOT') {
      sendBtn.innerHTML = `<span>⏳ Autopilot sending in 2s...</span>`;
      autoSendTimer = setTimeout(() => {
        autoSendTimer = null;
        insertAndSendMessage(data.replyText);
        removeCopilotCard();
      }, 2000);
    }
  }

  function renderCopilotError(errMsg) {
    let card = document.getElementById('followlytics-copilot-card');
    if (!card) card = createCopilotCard();
    card.innerHTML = `
      <div class="followlytics-copilot-header">
        <div class="followlytics-copilot-title" style="color: #dc2626;">
          <span>⚠️ FollowLytics Backend Notice</span>
        </div>
        <button id="fl-card-close" class="followlytics-btn-dismiss">✕</button>
      </div>
      <div class="followlytics-copilot-text" style="color: #dc2626; font-size: 12px;">
        ${escapeHtml(errMsg)}<br><small style="color:#6b7280;">Ensure FollowLytics backend is running on <code>${escapeHtml(backendUrl)}</code>.</small>
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
    document.body.appendChild(card);
    return card;
  }

  function removeCopilotCard() {
    if (autoSendTimer) {
      clearTimeout(autoSendTimer);
      autoSendTimer = null;
    }
    const card = document.getElementById('followlytics-copilot-card');
    if (card) card.remove();
  }

  // Insert text into WhatsApp's Lexical contenteditable composer (exactly once)
  function insertIntoComposer(text) {
    const composer = document.querySelector('#main footer div[contenteditable="true"][data-tab="10"], #main footer div[contenteditable="true"][role="textbox"], #main footer div[contenteditable="true"]');
    if (!composer) {
      console.warn('[FollowLytics] WhatsApp composer not found.');
      return false;
    }

    const cleanText = String(text || '').trim();
    if (!cleanText) return false;

    // Avoid duplicate insertion if already placed in composer
    if ((composer.textContent || '').trim() === cleanText) {
      return true;
    }

    composer.focus();

    // Primary method: execCommand('insertText') inserts cleanly into WhatsApp Lexical editor once
    let inserted = false;
    try {
      document.execCommand('selectAll', false, null);
      inserted = document.execCommand('insertText', false, cleanText);
    } catch (e) {
      console.warn('[FollowLytics] execCommand insertText failed:', e);
    }

    // Fallback ONLY if execCommand failed AND composer is still completely empty
    if (!inserted && (composer.textContent || '').trim().length === 0) {
      try {
        composer.dispatchEvent(new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: cleanText
        }));
      } catch (e) {}
    }

    return true;
  }

  // Insert and fire send (with 3s duplicate send guard + anti-self-reply tracking)
  function insertAndSendMessage(text) {
    const now = Date.now();
    if (now - lastAutoSendTime < 3000) {
      console.log('[FollowLytics] Skipping duplicate send within 3s window.');
      return;
    }
    lastAutoSendTime = now;
    lastReplySentAt = now;

    const norm = normalizeMsgText(text);
    if (norm) {
      recentlySentTexts.add(norm);
    }

    console.log('[FollowLytics] Auto-inserting reply into WhatsApp composer...');
    const inserted = insertIntoComposer(text);
    if (!inserted) return;

    setTimeout(() => {
      const sendIcon = document.querySelector(
        '#main footer button[aria-label="Send"], #main footer button[data-testid="compose-btn-send"], #main footer span[data-icon="wds-ic-send-filled"], #main footer span[data-icon="send"]'
      );
      if (sendIcon) {
        const btn = sendIcon.closest('button') || sendIcon;
        console.log('[FollowLytics] Clicking WhatsApp Send button...');
        btn.click();
      } else {
        console.log('[FollowLytics] Send button not found, dispatching Enter key...');
        const composer = document.querySelector('#main footer div[contenteditable="true"][data-tab="10"], #main footer div[contenteditable="true"][role="textbox"], #main footer div[contenteditable="true"]');
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
    }, 350);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
