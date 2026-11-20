document.addEventListener('DOMContentLoaded', () => {
  const phoneInput = document.getElementById('vendor-phone');
  const backendUrlInput = document.getElementById('backend-url');
  const modeSelect = document.getElementById('default-mode');
  const saveBtn = document.getElementById('save-btn');
  const openDashBtn = document.getElementById('open-dash-btn');
  const statusBadge = document.getElementById('status-badge');
  const trackedCount = document.getElementById('tracked-count');

  let currentBackendUrl = 'http://localhost:8080';

  // 1. Load from local extension storage
  chrome.storage.local.get(['vendorPhone', 'storeName', 'defaultMode', 'trackedCustomers', 'backendUrl'], (res) => {
    if (res.backendUrl) {
      currentBackendUrl = res.backendUrl;
      backendUrlInput.value = res.backendUrl;
    } else {
      backendUrlInput.value = currentBackendUrl;
    }

    if (res.vendorPhone) {
      phoneInput.value = res.storeName ? `${res.vendorPhone} (${res.storeName})` : res.vendorPhone;
    } else {
      phoneInput.value = 'Not Logged In (Please sign in on Web App)';
    }

    modeSelect.value = res.defaultMode || 'COPILOT';

    const tracked = res.trackedCustomers || {};
    trackedCount.innerText = Object.keys(tracked).length;

    // 2. Fetch current active session from Backend to guarantee 100% real-time sync
    syncWithBackendSession(currentBackendUrl);
  });

  function syncWithBackendSession(baseUrl) {
    statusBadge.className = 'badge';
    statusBadge.innerText = 'Checking...';

    fetch(`${baseUrl}/api/auth/current`)
      .then(r => {
        if (r.status === 200) return r.json();
        return null;
      })
      .then(activeVendor => {
        if (activeVendor && activeVendor.phone) {
          phoneInput.value = activeVendor.storeName ? `${activeVendor.phone} (${activeVendor.storeName})` : activeVendor.phone;
          chrome.storage.local.set({
            vendorPhone: activeVendor.phone,
            vendorId: activeVendor.id,
            storeName: activeVendor.storeName
          });
          statusBadge.className = 'badge badge-online';
          statusBadge.innerText = 'Online ✓';
        } else {
          checkBackendHealthOnly(baseUrl);
        }
      })
      .catch(() => {
        statusBadge.className = 'badge badge-offline';
        statusBadge.innerText = 'Backend Offline';
      });
  }

  function checkBackendHealthOnly(baseUrl) {
    fetch(`${baseUrl}/api/analytics/health`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'UP') {
          statusBadge.className = 'badge badge-online';
          statusBadge.innerText = 'Online ✓';
        }
      })
      .catch(() => {
        statusBadge.className = 'badge badge-offline';
        statusBadge.innerText = 'Backend Offline';
      });
  }

  saveBtn.onclick = () => {
    let url = backendUrlInput.value.trim();
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.startsWith('http')) url = 'http://' + url;

    chrome.storage.local.set({
      defaultMode: modeSelect.value,
      backendUrl: url
    }, () => {
      saveBtn.innerText = 'Saved! ✓';
      syncWithBackendSession(url);
      setTimeout(() => saveBtn.innerText = 'Save Settings', 1500);
    });
  };

  openDashBtn.onclick = () => {
    chrome.storage.local.get(['dashboardUrl', 'backendUrl'], (res) => {
      let url = res.dashboardUrl;
      if (!url) {
        url = (res.backendUrl && !res.backendUrl.includes(':8080')) ? res.backendUrl : 'http://localhost:5173';
      }
      chrome.tabs.create({ url });
    });
  };
});
