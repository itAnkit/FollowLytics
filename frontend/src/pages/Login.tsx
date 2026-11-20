import React, { useState, useEffect } from 'react';
import { Store, Phone, ShieldCheck, ArrowRight, Sparkles, CheckCircle2, AlertCircle, UserCheck, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { Vendor } from '../types';

interface LoginProps {
  onLoginSuccess: (vendor: Vendor, isOnboarded: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('+919876543210');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<{
    checked: boolean;
    isRegistered: boolean;
    isOnboarded: boolean;
    storeName?: string;
  }>({ checked: false, isRegistered: false, isOnboarded: false });

  // Real-time phone registration check
  useEffect(() => {
    if (!phone || phone.trim().length < 8) {
      setUserStatus({ checked: false, isRegistered: false, isOnboarded: false });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkPhone(phone.trim());
        setUserStatus({
          checked: true,
          isRegistered: res.isRegistered,
          isOnboarded: res.isOnboarded,
          storeName: res.storeName
        });
      } catch (e) {
        setUserStatus({ checked: false, isRegistered: false, isOnboarded: false });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [phone]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone || phone.length < 8) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.sendOtp(phone.trim());
      setSimulatedOtp(res.otp);
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otp || otp.length < 4) {
      setError('Please enter the 4-digit OTP');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyOtp(phone.trim(), otp.trim());
      // If already registered / onboarded, res.isOnboarded is true -> goes directly to Dashboard!
      onLoginSuccess(res.vendor, res.isOnboarded);
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setPhone('+919876543210');
    setLoading(true);
    try {
      const res = await api.verifyOtp('+919876543210', '4826');
      onLoginSuccess(res.vendor, res.isOnboarded);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/20 mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">FollowLytics</h1>
          <p className="text-emerald-200/80 text-sm mt-1">
            WhatsApp Conversational Commerce & Revenue Intelligence
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl border border-emerald-500/20 backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {step === 'PHONE' ? 'Merchant Sign In' : 'Verify Mobile Number'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {step === 'PHONE'
                ? 'Enter your WhatsApp Business number to manage your catalog & analytics'
                : `Enter the 4-digit code sent to ${phone}`}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  WhatsApp Business Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Real-time Account Status Chip */}
              {userStatus.checked && (
                userStatus.isRegistered ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                    <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold">Registered: {userStatus.storeName || 'Merchant'}</div>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">Account exists. Directly signing into your dashboard.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                    <UserPlus className="w-4 h-4 text-sky-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold">New Merchant Account</div>
                      <p className="text-[11px] text-sky-700/80 dark:text-sky-300/80">Verify with OTP to set up your WhatsApp store.</p>
                    </div>
                  </div>
                )
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
              >
                {loading ? 'Sending Verification Code...' : 'Send Verification OTP'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* Simulated OTP Notification Banner */}
              {simulatedOtp && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Freeware SMS OTP Simulator
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtp(simulatedOtp)}
                      className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 underline"
                    >
                      Fill: {simulatedOtp}
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                    Your simulated security code is: <strong className="font-mono text-sm tracking-widest">{simulatedOtp}</strong>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Enter 4-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • •"
                  className="w-full text-center tracking-[1em] text-2xl font-bold py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="w-1/3 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl"
                >
                  Change Phone
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Test Access */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
            <button
              onClick={handleQuickDemoLogin}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-center gap-1.5 mx-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instant Demo Store Sign-In (+919876543210)</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-emerald-200/60 font-medium">
          Protected by FollowLytics End-to-End Merchant Security
        </div>
      </div>
    </div>
  );
};
