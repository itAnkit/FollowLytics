import React, { useState, useEffect } from 'react';
import { DashboardSummary } from '../types';
import { MetricCards } from '../components/MetricCards';
import { LeakedRevenueChart } from '../components/LeakedRevenueChart';
import { DemandRadar } from '../components/DemandRadar';
import { LivePipeline } from '../components/LivePipeline';
import { api } from '../services/api';
import { RefreshCw, Sparkles } from 'lucide-react';

interface DashboardProps {
  vendorId: number;
  onNavigateToCatalog: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ vendorId, onNavigateToCatalog }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDashboard = async () => {
    try {
      const data = await api.getDashboard(vendorId);
      setSummary(data);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 10 seconds for real-time demonstration
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, [vendorId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-gray-500">Loading FollowLytics Intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded">
              Live Commerce Intel
            </span>
            <span className="text-xs text-emerald-200">
              • Connected to WhatsApp
            </span>
          </div>
          <h1 className="text-2xl font-black mt-1">
            {summary?.storeName || 'Merchant Store Dashboard'}
          </h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
            Real-time analytics extracted from customer WhatsApp conversations: converted sales, lost opportunities, and unmet product demand.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-sm border border-white/10 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <MetricCards summary={summary} />

      {/* Leaked Revenue Breakdown */}
      {summary && (
        <LeakedRevenueChart
          breakdown={summary.leakedBreakdown || []}
          totalLeaked={summary.totalLeakedRevenue || 0}
          currency={summary.currency || '₹'}
        />
      )}

      {/* Demand Radar */}
      {summary && (
        <DemandRadar
          topDemanded={summary.topDemandedProducts || []}
          unmetDemand={summary.unmetDemand || []}
          onAddCatalogItem={() => onNavigateToCatalog()}
        />
      )}

      {/* Live Deals Pipeline */}
      {summary && (
        <LivePipeline
          deals={summary.recentDeals || []}
          currency={summary.currency || '₹'}
          onRefresh={fetchDashboard}
        />
      )}
    </div>
  );
};
