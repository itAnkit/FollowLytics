import React, { useState } from 'react';
import { CustomerDeal, DealStage, LeakedReason, ChatMessage } from '../types';
import { Check, X, MessageSquare, ChevronRight, Phone, Clock, DollarSign, Trash2, PackageCheck } from 'lucide-react';
import { api } from '../services/api';

interface LivePipelineProps {
  deals: CustomerDeal[];
  currency: string;
  onRefresh: () => void;
}

export const LivePipeline: React.FC<LivePipelineProps> = ({ deals, currency, onRefresh }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedDeal, setSelectedDeal] = useState<CustomerDeal | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);

  const actionNeededCount = deals.filter(d => d.needsAction).length;

  const filteredDeals = deals.filter(d => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTION_NEEDED') return !!d.needsAction;
    if (filter === 'OPEN') return !d.isClosed && !d.isDelivered;
    if (filter === 'CLOSED') return !!d.isClosed || !!d.isDelivered;
    if (filter === 'TRACKED') return d.isTracked !== false;
    if (filter === 'UNTRACKED') return d.isTracked === false;
    return d.stage === filter;
  });

  const handleToggleDelivered = async (deal: CustomerDeal) => {
    try {
      const nextVal = !(deal.isDelivered || deal.isClosed);
      await api.updateDealStage(deal.id, undefined, undefined, undefined, nextVal ? false : undefined, nextVal, nextVal);
      onRefresh();
    } catch (e) {
      alert('Failed to update delivery status');
    }
  };

  const handleResolveAction = async (dealId: number) => {
    try {
      await api.updateDealStage(dealId, undefined, undefined, undefined, false);
      onRefresh();
    } catch (e) {
      alert('Failed to resolve action');
    }
  };

  const handleDeleteDeal = async (dealId: number) => {
    if (!confirm('Remove this customer entry from pipeline?')) return;
    try {
      await api.deleteDeal(dealId);
      onRefresh();
    } catch (e) {
      alert('Failed to remove customer deal');
    }
  };

  const handleToggleTrack = async (deal: CustomerDeal) => {
    try {
      const newStatus = !(deal.isTracked !== false);
      await api.trackCustomer({
        customerPhone: deal.customerPhone,
        customerName: deal.customerName,
        vendorId: deal.vendorId,
        isTracked: newStatus
      });
      onRefresh();
    } catch (e) {
      alert('Failed to update tracking');
    }
  };

  const getStageBadge = (stage: DealStage) => {
    switch (stage) {
      case 'SOLD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Won / Sold</span>;
      case 'LOST':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">Lost</span>;
      case 'PRICE_QUOTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Price Quoted</span>;
      case 'NEGOTIATING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Negotiating</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Inquiry</span>;
    }
  };

  const handleStatusChange = async (dealId: number, stage: DealStage, leakedReason?: LeakedReason) => {
    try {
      await api.updateDealStage(dealId, stage, undefined, leakedReason);
      onRefresh();
    } catch (e) {
      alert('Failed to update stage');
    }
  };

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

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
      {/* Table Header & Filters */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Tracked WhatsApp Customer Deals</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time pipeline synced directly from WhatsApp conversations
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {['ALL', 'ACTION_NEEDED', 'OPEN', 'CLOSED', 'TRACKED', 'UNTRACKED', 'INQUIRY', 'PRICE_QUOTED', 'SOLD', 'LOST'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filter === f
                  ? f === 'ACTION_NEEDED'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : f === 'ACTION_NEEDED' && actionNeededCount > 0
                  ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {f === 'ACTION_NEEDED' ? `🚨 Action Needed (${actionNeededCount})` : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/75 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Stage</th>
              <th className="py-3 px-4">Target Product</th>
              <th className="py-3 px-4">Deal Value</th>
              <th className="py-3 px-4">Item Delivered / Picked Up</th>
              <th className="py-3 px-4">Latest AI Summary</th>
              <th className="py-3 px-4 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
            {filteredDeals.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                  No customer deals matching "{filter}".
                </td>
              </tr>
            ) : (
              filteredDeals.map((deal) => (
                <tr key={deal.id} className={`transition group ${
                  deal.needsAction
                    ? 'bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/30'
                    : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
                }`}>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-gray-900 dark:text-white">{deal.customerName}</span>
                      {deal.needsAction && (
                        <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-200 bg-amber-200 dark:bg-amber-900/80 px-2 py-0.5 rounded-full animate-pulse">
                          🚨 Action Needed
                        </span>
                      )}
                      {deal.isTracked !== false ? (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                          Tracked
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          Untracked
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{deal.customerPhone}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">{getStageBadge(deal.stage)}</td>
                  <td className="py-3.5 px-4 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {deal.productMentioned || '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {currency}{deal.dealValue?.toLocaleString() || '0'}
                    </span>
                    {deal.stage === 'LOST' && deal.leakedReason !== 'NONE' && (
                      <span className="block text-[10px] text-rose-500 font-semibold mt-0.5">
                        Lost: {deal.leakedReason}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <label className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer select-none transition ${
                      deal.isDelivered || deal.isClosed
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={!!(deal.isDelivered || deal.isClosed)}
                        onChange={() => handleToggleDelivered(deal)}
                        className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                      />
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>{deal.isDelivered || deal.isClosed ? 'Closed ✓' : 'Mark Delivered'}</span>
                    </label>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 max-w-xs">
                      {deal.summary || 'Customer engaged with AI'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => openChatModal(deal)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                        title="View Full Chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      {deal.needsAction && (
                        <button
                          onClick={() => handleResolveAction(deal.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 border border-amber-300 dark:border-amber-700 transition"
                          title="Mark 1-on-1 Attention Resolved"
                        >
                          Resolve ✓
                        </button>
                      )}

                      {deal.stage !== 'SOLD' && (
                        <button
                          onClick={() => handleStatusChange(deal.id, 'SOLD')}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition"
                          title="Mark as Closed Sale"
                        >
                          Won ✓
                        </button>
                      )}

                      {deal.stage !== 'LOST' && (
                        <button
                          onClick={() => handleStatusChange(deal.id, 'LOST', 'PRICE_HIGH')}
                          className="px-2 py-1 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition"
                          title="Mark as Lost Deal"
                        >
                          Lost ✕
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleTrack(deal)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${
                          deal.isTracked !== false
                            ? 'text-gray-500 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 dark:bg-gray-800 dark:hover:bg-rose-950/60 border-gray-200 dark:border-gray-700'
                            : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border-emerald-200 dark:border-emerald-800'
                        }`}
                        title={deal.isTracked !== false ? 'Untrack Customer' : 'Track Customer'}
                      >
                        {deal.isTracked !== false ? 'Untrack' : 'Track +'}
                      </button>

                      <button
                        onClick={() => handleDeleteDeal(deal.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Chat Messages Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedDeal.customerName}</h3>
                <p className="text-xs text-gray-500">{selectedDeal.customerPhone} • {selectedDeal.stage}</p>
              </div>
              <button
                onClick={() => setSelectedDeal(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-50 rounded-xl mb-4">
              {loadingChat ? (
                <p className="text-center text-xs text-gray-400 py-6">Loading conversation...</p>
              ) : chatMessages.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">No chat messages logged yet.</p>
              ) : (
                chatMessages.map((msg) => {
                  const isCustomer = msg.sender === 'CUSTOMER';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <span className="text-[10px] text-gray-400 mb-0.5 px-1">
                        {isCustomer ? 'Customer' : 'FollowLytics AI'}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          isCustomer
                            ? 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                            : 'bg-emerald-600 text-white shadow-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedDeal(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
