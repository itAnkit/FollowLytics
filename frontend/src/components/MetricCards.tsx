import React from 'react';
import { IndianRupee, AlertTriangle, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { DashboardSummary } from '../types';

interface MetricCardsProps {
  summary: DashboardSummary | null;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ summary }) => {
  if (!summary) return null;

  const cur = summary.currency || '₹';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Total Sales Today */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-950/60 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
            {summary.soldCount} Deals Won
          </span>
        </div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Sales Today</p>
        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
          {cur}{summary.totalSalesToday.toLocaleString()}
        </h3>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" /> High-confidence converted revenue
        </p>
      </div>

      {/* Leaked Revenue */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-rose-100 dark:border-rose-950/60 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
            {summary.lostCount} Deals Leaked
          </span>
        </div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Leaked Revenue</p>
        <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
          {cur}{summary.totalLeakedRevenue.toLocaleString()}
        </h3>
        <p className="text-xs text-rose-500 dark:text-rose-400 font-medium mt-2">
          Missed due to stock, price, or ghosting
        </p>
      </div>

      {/* Conversion Rate */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-950/60 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
            Funnel Efficiency
          </span>
        </div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chat-to-Sale Conversion</p>
        <h3 className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-1">
          {summary.conversionRatePercent}%
        </h3>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, summary.conversionRatePercent)}%` }}
          ></div>
        </div>
      </div>

      {/* Tracked Customers */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {summary.inquiryCount + summary.priceQuotedCount + summary.negotiatingCount} Active
          </span>
        </div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tracked WhatsApp Customers</p>
        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
          {summary.totalTrackedCustomers}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-2">
          All customer chats managed by AI
        </p>
      </div>
    </div>
  );
};
