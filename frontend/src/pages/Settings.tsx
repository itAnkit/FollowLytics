import React, { useState } from 'react';
import { Vendor } from '../types';
import { api } from '../services/api';
import { Store, ShieldCheck, Puzzle, Save, Check, LogOut, User } from 'lucide-react';

interface SettingsProps {
  vendor: Vendor | null;
  onUpdateVendor: (v: Vendor) => void;
  onLogout?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ vendor, onUpdateVendor, onLogout }) => {
  const [storeName, setStoreName] = useState(vendor?.storeName || 'Sharma Hardware & Electricals');
  const [upiId, setUpiId] = useState(vendor?.upiId || 'sharmahardware@upi');
  const [policies, setPolicies] = useState(vendor?.storePolicies || '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    setSaving(true);
    try {
      const updated = await api.updateVendor(vendor.id, {
        storeName,
        upiId,
        storePolicies: policies
      });
      onUpdateVendor(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Store className="w-6 h-6 text-emerald-600" />
          Store Profile & AI Configuration
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure business details, UPI payment IDs, and store policies that FollowLytics AI enforces during WhatsApp interactions.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              WhatsApp Business Phone
            </label>
            <input
              type="text"
              disabled
              value={vendor?.phone || '+919876543210'}
              className="w-full text-xs p-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed font-mono"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">Linked to FollowLytics Chrome Extension</span>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              Store Display Name *
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5">
            Store UPI ID (For Auto-Payment Quotes)
          </label>
          <input
            type="text"
            placeholder="e.g. yourstore@okaxis"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-none font-mono"
          />
          <span className="text-[10px] text-gray-400 mt-1 block">AI includes this UPI ID when a customer agrees to buy</span>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5">
            Store Policies, Delivery Rules & Timings
          </label>
          <textarea
            rows={4}
            value={policies}
            onChange={(e) => setPolicies(e.target.value)}
            placeholder="e.g. Open Monday to Saturday 9am-9pm. Free local delivery on orders above ₹500. Same-day delivery for orders before 4pm. All tools carry 1-year brand warranty."
            className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-none leading-relaxed"
          ></textarea>
        </div>

        <div className="flex justify-end pt-3 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Account & Session Box */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Active Merchant Account</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Logged in as <strong className="font-mono text-gray-800 dark:text-gray-200">{vendor?.phone}</strong> ({vendor?.storeName})
            </p>
          </div>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to sign out? You will need your phone number and OTP to log back in.')) {
                onLogout();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of FollowLytics</span>
          </button>
        )}
      </div>

      {/* Extension Pairing Box */}
      <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <Puzzle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950">Chrome Extension Pairing</h4>
            <p className="text-xs text-emerald-800/80 mt-0.5">
              Make sure your Chrome Extension is connected to: <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono font-bold">http://localhost:8080</code>
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-emerald-800 text-xs font-bold border border-emerald-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Active & Ready
          </span>
        </div>
      </div>
    </div>
  );
};
