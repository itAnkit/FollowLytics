import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Catalog } from './pages/Catalog';
import { Settings } from './pages/Settings';
import { LivePipeline } from './components/LivePipeline';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { Vendor, CustomerDeal } from './types';
import { api } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [deals, setDeals] = useState<CustomerDeal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('followlytics_theme') === 'dark';
  });

  // Apply dark mode class to root HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('followlytics_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('followlytics_theme', 'light');
    }
  }, [darkMode]);

  // Load existing session
  useEffect(() => {
    const saved = localStorage.getItem('followlytics_vendor');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setVendor(parsed);
        // Refresh vendor profile from backend
        api.getVendor(parsed.id)
          .then(fresh => {
            setVendor(fresh);
            localStorage.setItem('followlytics_vendor', JSON.stringify(fresh));
            api.setCurrentSession(fresh.id);
            window.dispatchEvent(new Event('followlytics_session_change'));
            return api.getDeals(fresh.id);
          })
          .then(dealList => {
            if (dealList) setDeals(dealList);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
        return;
      } catch (e) {
        localStorage.removeItem('followlytics_vendor');
      }
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (loggedInVendor: Vendor, isOnboarded: boolean) => {
    const v = { ...loggedInVendor, isOnboarded };
    setVendor(v);
    localStorage.setItem('followlytics_vendor', JSON.stringify(v));

    // Notify backend and extension content script of new active merchant
    api.setCurrentSession(v.id);
    window.dispatchEvent(new Event('followlytics_session_change'));

    // Direct extension sync if running within same context
    try {
      if (typeof window !== 'undefined' && (window as any).chrome?.storage?.local) {
        (window as any).chrome.storage.local.set({
          vendorPhone: v.phone,
          vendorId: v.id,
          storeName: v.storeName
        });
      }
    } catch (e) {}

    if (isOnboarded) {
      api.getDeals(v.id).then(d => setDeals(d)).catch(() => {});
    }
  };

  const handleOnboardingComplete = (onboardedVendor: Vendor) => {
    const v = { ...onboardedVendor, isOnboarded: true };
    setVendor(v);
    localStorage.setItem('followlytics_vendor', JSON.stringify(v));
    api.setCurrentSession(v.id);
    window.dispatchEvent(new Event('followlytics_session_change'));
    api.getDeals(v.id).then(d => setDeals(d)).catch(() => {});
  };

  const handleLogout = () => {
    localStorage.removeItem('followlytics_vendor');
    window.dispatchEvent(new Event('followlytics_session_change'));
    setVendor(null);
    setDeals([]);
    setCurrentTab('dashboard');
  };

  const refreshDeals = async () => {
    if (vendor) {
      try {
        const dealList = await api.getDeals(vendor.id);
        setDeals(dealList);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Loading FollowLytics...</p>
        </div>
      </div>
    );
  }

  // 1. Not Logged In -> Show Login Page
  if (!vendor) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Logged in but not completed onboarding -> Show Onboarding Wizard
  if (!vendor.isOnboarded) {
    return (
      <Onboarding
        vendor={vendor}
        onOnboardingComplete={handleOnboardingComplete}
      />
    );
  }

  // 3. Logged in and Onboarded -> Full Commerce Intelligence App
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        vendor={vendor}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <Dashboard
            vendorId={vendor.id}
            onNavigateToCatalog={() => setCurrentTab('catalog')}
          />
        )}

        {currentTab === 'catalog' && (
          <Catalog vendorId={vendor.id} />
        )}

        {currentTab === 'pipeline' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <LivePipeline
              deals={deals}
              currency={vendor.currency || '₹'}
              onRefresh={refreshDeals}
            />
          </div>
        )}

        {currentTab === 'settings' && (
          <Settings
            vendor={vendor}
            onUpdateVendor={(v) => {
              setVendor(v);
              localStorage.setItem('followlytics_vendor', JSON.stringify(v));
            }}
            onLogout={handleLogout}
          />
        )}
      </main>

      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
        <p className="font-semibold text-gray-700 dark:text-gray-300">FollowLytics AI Commerce Engine</p>
        <p className="mt-1">Empowering local merchants with WhatsApp conversation tracking, AI replies & revenue leak detection.</p>
      </footer>
    </div>
  );
}

export default App;
