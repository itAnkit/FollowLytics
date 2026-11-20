// FollowLytics Web Sync Script (Injected on FollowLytics Web Apps)
(function () {
  let syncInterval = null;

  function syncSession() {
    try {
      // Stop cleanly if extension was reloaded/invalidated
      if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.storage?.local) {
        if (syncInterval) clearInterval(syncInterval);
        return;
      }

      const stored = localStorage.getItem('followlytics_vendor');
      const dashboardUrl = window.location.origin;
      let currentBackendUrl = dashboardUrl;
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
            backendUrl: currentBackendUrl,
            dashboardUrl: dashboardUrl
          });
        }
      } else {
        // User logged out (still keep dashboardUrl & backendUrl synced to current app origin)
        chrome.storage.local.set({ dashboardUrl: dashboardUrl, backendUrl: currentBackendUrl });
        chrome.storage.local.remove(['vendorPhone', 'vendorId', 'storeName']);
      }
    } catch (e) {
      // Ignore context invalidation if extension reloaded
      if (e?.message?.includes('invalidated') && syncInterval) {
        clearInterval(syncInterval);
      }
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
  syncInterval = setInterval(syncSession, 4000);
})();
