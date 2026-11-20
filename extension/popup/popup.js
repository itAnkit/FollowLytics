document.addEventListener('DOMContentLoaded', () => {
  const phoneInput = document.getElementById('vendor-phone');
  const modeSelect = document.getElementById('default-mode');
  const saveBtn = document.getElementById('save-btn');
  const openDashBtn = document.getElementById('open-dash-btn');
  const statusBadge = document.getElementById('status-badge');
  const trackedCount = document.getElementById('tracked-count');

  const BACKEND_URL = 'http://localhost:8080';

  // 1. Load from local extension storage
  chrome.storage.local.get(['vendorPhone', 'storeName', 'defaultMode', 'trackedCustomers'], (res) => {
    if (res.vendorPhone) {
      phoneInput.value = res.storeName ? `${res.vendorPhone} (${res.storeName})` : res.vendorPhone;
    } else {
      phoneInput.value = 'Not Logged In (Please sign in on Web App)';
    }

    modeSelect.value = res.defaultMode || 'COPILOT';

    const tracked = res.trackedCustomers || {};
    trackedCount.innerText = Object.keys(tracked).length;

    // 2. Fetch current active session from Backend to guarantee 100% real-time sync
    syncWithBackendSession();
  });

  function syncWithBackendSession() {
    statusBadge.className = 'badge';
    statusBadge.innerText = 'Checking...';

    fetch(`${BACKEND_URL}/api/auth/current`)
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
          checkBackendHealthOnly();
        }
      })
      .catch(() => {
        statusBadge.className = 'badge badge-offline';
        statusBadge.innerText = 'Backend Offline';
      });
  }

  function checkBackendHealthOnly() {
    fetch(`${BACKEND_URL}/api/analytics/health`)
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
    chrome.storage.local.set({
      defaultMode: modeSelect.value
    }, () => {
      saveBtn.innerText = 'Saved! ✓';
      setTimeout(() => saveBtn.innerText = 'Save Mode', 1500);
    });
  };

  openDashBtn.onclick = () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  };
});
