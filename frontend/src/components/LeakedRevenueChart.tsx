import React from 'react';
import { AlertCircle, DollarSign, PackageX, UserMinus, ShieldAlert, Sparkles } from 'lucide-react';
import { LeakedCategory } from '../types';

interface LeakedRevenueChartProps {
  breakdown: LeakedCategory[];
  totalLeaked: number;
  currency: string;
}

export const LeakedRevenueChart: React.FC<LeakedRevenueChartProps> = ({ breakdown, totalLeaked, currency }) => {
  const getReasonConfig = (reason: string) => {
    switch (reason.toUpperCase()) {
      case 'PRICE_HIGH':
        return {
          label: 'Price Objection / Too Costly',
          icon: DollarSign,
          color: 'bg-rose-500',
          textColor: 'text-rose-700',
          bgColor: 'bg-rose-50',
          borderColor: 'border-rose-200'
        };
      case 'OUT_OF_STOCK':
        return {
          label: 'Out of Stock / Unavailable',
          icon: PackageX,
          color: 'bg-amber-500',
          textColor: 'text-amber-700',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
      case 'GHOSTED':
        return {
          label: 'Ghosted After Price Quote',
          icon: UserMinus,
          color: 'bg-purple-500',
          textColor: 'text-purple-700',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        };
      case 'UNSERVICEABLE_LOCATION':
        return {
          label: 'Delivery Unserviceable',
          icon: ShieldAlert,
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      default:
        return {
          label: 'Other Objections',
          icon: AlertCircle,
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Leaked Revenue Diagnostic
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Where your store is losing deals during WhatsApp conversations
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Leaked</span>
          <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
            {currency}{totalLeaked.toLocaleString()}
          </p>
        </div>
      </div>

      {breakdown.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No leaked deals logged yet. AI is monitoring WhatsApp chats!
        </div>
      ) : (
        <div className="space-y-4">
          {breakdown.map((item, idx) => {
            const config = getReasonConfig(item.reason);
            const Icon = config.icon;
            const pct = totalLeaked > 0 ? Math.round((item.totalAmount / totalLeaked) * 100) : 0;

            return (
              <div key={idx} className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg ${config.bgColor} ${config.textColor} flex items-center justify-center border ${config.borderColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{config.label}</span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-2">({item.count} customers)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{currency}{item.totalAmount.toLocaleString()}</span>
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 ml-1.5">({pct}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${config.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actionable AI Tip */}
      <div className="mt-5 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-emerald-900 font-medium leading-relaxed">
          <strong>FollowLytics Recommendation:</strong> Top lost reason is <em>Out of Stock</em> items. Restocking your out-of-stock items could immediately recover up to <strong>{currency}2,900</strong> in lost WhatsApp sales this week.
        </p>
      </div>
    </div>
  );
};
