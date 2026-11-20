// FollowLytics Web Sync Script (Injected on FollowLytics Web Apps)
(function () {
  function syncSession() {
    try {
      const stored = localStorage.getItem('followlytics_vendor');
      let currentBackendUrl = window.location.origin;
      if (window.location.port === '5173') {
        currentBackendUrl = 'http://localhost:8080';
      }

      if (stored) {
        const vendor = JSON.parse(stored);
        if (vendor && vendor.phone) {
          chrome.storage.local.set({
            vendorPhone: vendor.phone,
            vendorId: vendor.id,
            storeName: vendor.storeName,
            backendUrl: currentBackendUrl
          }, () => {
            console.log('[FollowLytics Extension] Synced active merchant from Web App:', vendor.phone, 'Backend:', currentBackendUrl);
          });
        }
      } else {
        // User logged out
        chrome.storage.local.remove(['vendorPhone', 'vendorId', 'storeName']);
      }
    } catch (e) {
      console.error('[FollowLytics Extension] Sync error:', e);
    }
  }

  // Sync immediately when page loads
  syncSession();

  // Listen to custom login/update events dispatched by the React web app
  window.addEventListener('followlytics_session_change', syncSession);
  window.addEventListener('storage', (e) => {
    if (e.key === 'followlytics_vendor') {
      syncSession();
    }
  });

  // Periodic safety check every 4 seconds while web app is open
  setInterval(syncSession, 4000);
})();
