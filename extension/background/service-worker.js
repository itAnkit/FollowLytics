// FollowLytics Background Service Worker

chrome.runtime.onInstalled.addListener((details) => {
  // Set default settings without hardcoding fake temporary phone numbers
  chrome.storage.local.get(['vendorPhone', 'defaultMode'], (res) => {
    chrome.storage.local.set({
      backendUrl: 'http://localhost:8080',
      vendorPhone: res.vendorPhone || '',
      defaultMode: res.defaultMode || 'COPILOT',
      autoDetectCustomers: true
    });
  });

  // Navigate to UI application on install for registration / login
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  }
  console.log('[FollowLytics] Extension Installed & Ready');
});

// Proxy API requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PROCESS_CHAT_MESSAGE') {
    const payload = request.payload;
    const url = 'http://localhost:8080';

    fetch(`${url}/api/chat/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => sendResponse({ success: true, data }))
      .catch(err => {
        console.error('FollowLytics background fetch error:', err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Keep channel open for async response
  }
});
