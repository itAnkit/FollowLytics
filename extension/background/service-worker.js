// FollowLytics Background Service Worker

chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.get(['vendorPhone', 'defaultMode', 'backendUrl'], (res) => {
    chrome.storage.local.set({
      backendUrl: res.backendUrl || 'http://localhost:8080',
      vendorPhone: res.vendorPhone || '',
      defaultMode: res.defaultMode || 'COPILOT',
      autoDetectCustomers: true
    });
  });

  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  }
  console.log('[FollowLytics] Extension Installed & Ready');
});

// Proxy API requests from content script to bypass CORS and WhatsApp CSP restrictions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  chrome.storage.local.get(['backendUrl', 'vendorPhone', 'vendorId'], (stored) => {
    const baseUrl = request.backendUrl || stored.backendUrl || 'http://localhost:8080';

    if (request.action === 'PROCESS_CHAT_MESSAGE') {
      const payload = {
        ...request.payload,
        vendorPhone: request.payload.vendorPhone || stored.vendorPhone,
        vendorId: request.payload.vendorId || stored.vendorId
      };

      fetch(`${baseUrl}/api/chat/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => sendResponse({ success: true, data }))
        .catch(err => {
          console.error('[FollowLytics] Background process error:', err);
          sendResponse({ success: false, error: err.message });
        });

      return true;
    }

    if (request.action === 'TRACK_CUSTOMER') {
      const payload = {
        ...request.payload,
        vendorPhone: request.payload.vendorPhone || stored.vendorPhone,
        vendorId: request.payload.vendorId || stored.vendorId
      };

      fetch(`${baseUrl}/api/chat/track-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => sendResponse({ success: true, data }))
        .catch(err => {
          console.error('[FollowLytics] Track customer error:', err);
          sendResponse({ success: false, error: err.message });
        });

      return true;
    }

    if (request.action === 'GET_TRACK_STATUS') {
      const params = new URLSearchParams({
        customerPhone: request.customerPhone || ''
      });
      const vPhone = request.vendorPhone || stored.vendorPhone;
      if (vPhone) params.set('vendorPhone', vPhone);

      fetch(`${baseUrl}/api/chat/track-status?${params.toString()}`)
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));

      return true;
    }
  });

  return true; // Keep message channel open
});
