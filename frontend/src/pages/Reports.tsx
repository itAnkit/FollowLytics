import React, { useState, useEffect, useMemo } from 'react';
import { CustomerDeal, Vendor, ChatMessage } from '../types';
import { api } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText,
  Download,
  Search,
  Calendar,
  Filter,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

interface ReportsProps {
  vendor: Vendor;
}

export const Reports: React.FC<ReportsProps> = ({ vendor }) => {
  const [deals, setDeals] = useState<CustomerDeal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [trackedFilter, setTrackedFilter] = useState<string>('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [attentionFilter, setAttentionFilter] = useState<string>('ALL');
  const [chatFilter, setChatFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Chat transcript modal
  const [selectedDeal, setSelectedDeal] = useState<CustomerDeal | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);

  const currency = vendor.currency || '₹';

  const loadDeals = async () => {
    try {
      const list = await api.getDeals(vendor.id);
      setDeals(list);
    } catch (e) {
      console.error('Failed to load report data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDeals();
  }, [vendor.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDeals();
  };

  const applyDatePreset = (preset: 'ALL' | 'TODAY' | '7D' | 'MONTH') => {
    const now = new Date();
    const toStr = now.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'TODAY') {
      setFromDate(toStr);
      setToDate(toStr);
    } else if (preset === '7D') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setFromDate(d.toISOString().split('T')[0]);
      setToDate(toStr);
    } else if (preset === 'MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(firstDay.toISOString().split('T')[0]);
      setToDate(toStr);
    }
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setStageFilter('ALL');
    setTrackedFilter('ALL');
    setOrderStatusFilter('ALL');
    setAttentionFilter('ALL');
    setChatFilter('ALL');
    setSearchQuery('');
  };

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      // 1. Date Range (uses lastInteractionAt or createdAt)
      const dateStr = d.lastInteractionAt || d.createdAt;
      if (dateStr && (fromDate || toDate)) {
        const itemDate = new Date(dateStr);
        if (fromDate) {
          const start = new Date(fromDate + 'T00:00:00');
          if (itemDate < start) return false;
        }
        if (toDate) {
          const end = new Date(toDate + 'T23:59:59');
          if (itemDate > end) return false;
        }
      }

      // 2. Stage
      if (stageFilter !== 'ALL' && d.stage !== stageFilter) return false;

      // 3. Tracked / Untracked
      if (trackedFilter === 'TRACKED' && d.isTracked === false) return false;
      if (trackedFilter === 'UNTRACKED' && d.isTracked !== false) return false;

      // 4. Order Status (Open / Closed / Delivered)
      const isClosedOrDelivered = !!(d.isClosed || d.isDelivered);
      if (orderStatusFilter === 'OPEN' && isClosedOrDelivered) return false;
      if (orderStatusFilter === 'CLOSED' && !isClosedOrDelivered) return false;
      if (orderStatusFilter === 'DELIVERED' && !d.isDelivered) return false;

      // 5. Needs Attention
      if (attentionFilter === 'NEEDS_ACTION' && !d.needsAction) return false;
      if (attentionFilter === 'NORMAL' && d.needsAction) return false;

      // 6. Chat to Conversation
      const msgCount = d.messageCount ?? 0;
      if (chatFilter === 'HAS_CHAT' && msgCount === 0) return false;
      if (chatFilter === 'NO_CHAT' && msgCount > 0) return false;

      // 7. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = `${d.customerName || ''} ${d.customerPhone || ''} ${d.productMentioned || ''} ${d.summary || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [deals, fromDate, toDate, stageFilter, trackedFilter, orderStatusFilter, attentionFilter, chatFilter, searchQuery]);

  // Dynamic Summary KPIs for filtered rows
  const stats = useMemo(() => {
    let wonValue = 0;
    let leakedValue = 0;
    let closedCount = 0;
    let openCount = 0;
    let attentionCount = 0;

    for (const d of filteredDeals) {
      const val = Number(d.dealValue || 0);
      if (d.stage === 'SOLD') wonValue += val;
      if (d.stage === 'LOST') leakedValue += val;
      if (d.isClosed || d.isDelivered) closedCount++;
      else openCount++;
      if (d.needsAction) attentionCount++;
    }

    return { wonValue, leakedValue, closedCount, openCount, attentionCount };
  }, [filteredDeals]);

  const openChatModal = async (deal: CustomerDeal) => {
    setSelectedDeal(deal);
    setLoadingChat(true);
    try {
      const msgs = await api.getMessages(deal.id);
      setChatMessages(msgs);
    } catch (e) {
      setChatMessages([]);
    } finally {
      setLoadingChat(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pdfCurrency = currency === '₹' ? 'INR ' : currency;

    // Header Banner
    doc.setFillColor(5, 150, 105);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${vendor.storeName || 'FollowLytics'} — Orders & Customers Report`, 36, 30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateRangeLabel = fromDate || toDate
      ? `Period: ${fromDate || 'Start'} to ${toDate || 'Present'}`
      : 'Period: All Time';
    doc.text(
      `Phone: ${vendor.phone}   |   ${dateRangeLabel}   |   Generated: ${new Date().toLocaleString()}`,
      36,
      48
    );

    // Active Filters & KPI Summary
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(9.5);
    const activeFilters = [
      `Stage: ${stageFilter}`,
      `Tracking: ${trackedFilter}`,
      `Order: ${orderStatusFilter}`,
      `Attention: ${attentionFilter}`,
      `Chat: ${chatFilter}`
    ].join('  •  ');
    doc.text(`Filters: ${activeFilters}`, 36, 84);

    doc.setFont('helvetica', 'bold');
    doc.text(
      `Total Orders: ${filteredDeals.length}   |   Won Sales: ${pdfCurrency}${stats.wonValue.toLocaleString()}   |   Leaked: ${pdfCurrency}${stats.leakedValue.toLocaleString()}   |   Open: ${stats.openCount}   |   Closed/Delivered: ${stats.closedCount}   |   Action Needed: ${stats.attentionCount}`,
      36,
      102
    );

    const rows = filteredDeals.map((d, idx) => [
      String(idx + 1),
      formatDate(d.lastInteractionAt || d.createdAt),
      `${d.customerName || 'Customer'}\n${d.customerPhone || ''}`,
      d.stage.replace('_', ' '),
      d.productMentioned || '-',
      `${pdfCurrency}${Number(d.dealValue || 0).toLocaleString()}`,
      d.isTracked !== false ? 'Tracked' : 'Untracked',
      `${d.messageCount ?? 0} msgs`,
      d.isDelivered ? 'Delivered / Closed' : d.isClosed ? 'Closed' : 'Open',
      d.needsAction ? 'ACTION NEEDED' : 'Normal',
      (d.summary || '').slice(0, 65)
    ]);

    autoTable(doc, {
      startY: 118,
      head: [[
        '#',
        'Last Activity',
        'Customer',
        'Stage',
        'Product',
        'Value',
        'Tracking',
        'Chat',
        'Order Status',
        'Attention',
        'Summary'
      ]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 36, right: 36 }
    });

    const today = new Date().toISOString().split('T')[0];
    doc.save(`FollowLytics_Orders_Report_${today}.pdf`);
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Order ID', 'Date', 'Customer Name', 'Customer Phone', 'Stage',
      'Product', 'Value', 'Tracked', 'Chat Messages', 'Delivered/Picked Up',
      'Order Status', 'Needs Attention', 'Summary'
    ];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.join(',')];

    for (const d of filteredDeals) {
      lines.push([
        d.id,
        esc(formatDate(d.lastInteractionAt || d.createdAt)),
        esc(d.customerName),
        esc(d.customerPhone),
        esc(d.stage),
        esc(d.productMentioned || ''),
        d.dealValue || 0,
        d.isTracked !== false ? 'Tracked' : 'Untracked',
        d.messageCount ?? 0,
        d.isDelivered ? 'Yes' : 'No',
        (d.isClosed || d.isDelivered) ? 'Closed' : 'Open',
        d.needsAction ? 'Needs Attention' : 'Normal',
        esc(d.summary || '')
      ].join(','));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FollowLytics_Orders_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Orders & Customer Reports
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Filter all orders by date range, stage, tracking, conversation activity, escalation, or delivery status and export as PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={filteredDeals.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200 font-bold text-xs shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={filteredDeals.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Report Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: '7D', label: 'Last 7 Days' },
              { id: 'MONTH', label: 'This Month' }
            ] as const).map((p) => (
              <button
                key={p.id}
                onClick={() => applyDatePreset(p.id)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-gray-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-300 text-[11px] font-bold transition"
              >
                {p.label}
              </button>
            ))}

            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* From Date */}
          <div>
            <label className="font-bold text-gray-600 dark:text-gray-400 block mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="font-bold text-gray-600 dark:text-gray-400 block mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Deal Stage */}
          <div>
            <label className="font-bold text-gray-600 dark:text-gray-400 block mb-1">Deal Stage</label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Stages</option>
              <option value="SOLD">Won / Sold</option>
              <option value="LOST">Lost</option>
              <option value="NEGOTIATING">Negotiating</option>
              <option value="PRICE_QUOTED">Price Quoted</option>
              <option value="INQUIRY">Inquiry</option>
            </select>
          </div>

          {/* Tracking Status */}
          <div>
            <label className="font-bold text-gray-600 dark:text-gray-400 block mb-1">Tracking Status</label>
            <select
              value={trackedFilter}
              onChange={(e) => setTrackedFilter(e.target.value)}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Customers</option>
              <option value="TRACKED">Tracked Only</option>
              <option value="UNTRACKED">Untracked Only</option>
            </select>
          </div>

          {/* Order Fulfillment (Open / Closed / Delivered) */}
          <div>
            <label className="font-bold text-gray-600 dark:text-gray-400 block mb-1">Order Status</label>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All Orders (Open & Closed)</option>
              <option value="OPEN">Open Orders Only</option>
              <option value="CLOSED">Closed Orders Only</option>
              <option value="DELIVERED">Delivered / Picked Up ✓</option>
            </select>
          </div>

          {/* Needs Attention */}
          <div>
            <label className="font-bold text-gray-600 dark:text-gray-400 block mb-1">Customer Attention</label>
            <select
              value={attentionFilter}
              onChange={(e) => setAttentionFilter(e.target.value)}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All</option>
              <option value="NEEDS_ACTION">🚨 Needs Attention Only</option>
              <option value="NORMAL">Standard (No Escalation)</option>
            </select>
          </div>

          {/* Chat to Conversation */}
          <div>
            <label className="font-bold text-gray-600 dark:text-gray-400 block mb-1">Chat / Conversation</label>
            <select
              value={chatFilter}
              onChange={(e) => setChatFilter(e.target.value)}
              className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none font-semibold"
            >
              <option value="ALL">All</option>
              <option value="HAS_CHAT">Has Chat Conversation</option>
              <option value="NO_CHAT">No Chat Messages Yet</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="font-bold text-gray-600 dark:text-gray-400 block mb-1">Search</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Name, phone, product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Strip for Filtered Results */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Filtered Orders</span>
          <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{filteredDeals.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Won Revenue</span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {currency}{stats.wonValue.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Leaked Value</span>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
            {currency}{stats.leakedValue.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Open / Closed</span>
          <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
            {stats.openCount} <span className="text-xs font-semibold text-gray-400">Open</span> / {stats.closedCount} <span className="text-xs font-semibold text-emerald-600">Closed</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Needs Attention</span>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {stats.attentionCount}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Order Status</th>
                <th className="py-3 px-4">Chat</th>
                <th className="py-3 px-4">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400">Loading report records...</td>
                </tr>
              ) : filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400">
                    No orders match your selected filters. Try adjusting or resetting filters.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((d) => {
                  const isClosed = !!(d.isClosed || d.isDelivered);
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition">
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(d.lastInteractionAt || d.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-gray-900 dark:text-white">{d.customerName || 'Customer'}</span>
                          {d.needsAction && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
                              🚨 Action Needed
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            d.isTracked !== false
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          }`}>
                            {d.isTracked !== false ? 'Tracked' : 'Untracked'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">{d.customerPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          d.stage === 'SOLD' ? 'bg-emerald-100 text-emerald-800'
                            : d.stage === 'LOST' ? 'bg-rose-100 text-rose-800'
                            : d.stage === 'PRICE_QUOTED' ? 'bg-blue-100 text-blue-800'
                            : d.stage === 'NEGOTIATING' ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {d.stage.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300">
                        {d.productMentioned || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {currency}{Number(d.dealValue || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isClosed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                            <PackageCheck className="w-3 h-3" />
                            {d.isDelivered ? 'Delivered / Closed' : 'Closed'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800">
                            Open
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => openChatModal(d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-gray-700 dark:text-gray-200 font-bold transition"
                          title="Inspect Chat Conversation"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>{d.messageCount ?? 0} msgs</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 max-w-xs line-clamp-1">
                        {d.summary || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chat Transcript Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{selectedDeal.customerName}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedDeal.customerPhone} • {selectedDeal.stage}
                </p>
              </div>
              <button
                onClick={() => setSelectedDeal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              {loadingChat ? (
                <div className="text-center py-6 text-xs text-gray-400">Loading conversation...</div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">No chat messages logged yet.</div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] rounded-2xl px-3.5 py-2 text-xs ${
                      msg.sender === 'CUSTOMER'
                        ? 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 self-start text-gray-800 dark:text-gray-200 shadow-xs'
                        : 'bg-emerald-600 text-white self-end ml-auto shadow-xs'
                    }`}
                  >
                    <span className="text-[10px] font-bold opacity-75 mb-0.5">
                      {msg.sender === 'CUSTOMER' ? selectedDeal.customerName : 'FollowLytics AI'}
                    </span>
                    <span className="leading-relaxed">{msg.content}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
