import React, { useState } from 'react';
import { Send, Bot, User, Sparkles, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

interface SimulatorProps {
  vendorId: number;
  onRefreshDashboard?: () => void;
}

interface SimMessage {
  id: string;
  sender: 'CUSTOMER' | 'AI';
  text: string;
  meta?: {
    stage?: string;
    dealValue?: number;
    leakedReason?: string;
    productMentioned?: string;
  };
}

export const Simulator: React.FC<SimulatorProps> = ({ vendorId, onRefreshDashboard }) => {
  const [messages, setMessages] = useState<SimMessage[]>([
    {
      id: 'init-1',
      sender: 'CUSTOMER',
      text: 'Namaste! Do you have that heavy-duty adhesive tape in stock? What is the price?'
    },
    {
      id: 'init-2',
      sender: 'AI',
      text: 'Namaste! Yes, our Heavy Duty Adhesive Tape 50m is in stock for ₹240. It holds up to 15kg/m and is completely waterproof. Shall we pack one for you?',
      meta: {
        stage: 'PRICE_QUOTED',
        dealValue: 240,
        productMentioned: 'Heavy Duty Adhesive Tape 50m'
      }
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('Rohan Mehta');
  const [customerPhone, setCustomerPhone] = useState('+919811223344');

  const sampleScenarios = [
    { label: '🏷️ Pricing & Stock', text: 'What is the price of the 650W Impact Drill?' },
    { label: '💡 Product Usage', text: 'How should I apply the silicone sealant for my bathroom tiles?' },
    { label: '⚠️ Price Objection (Leak)', text: '₹2,150 is too costly for me, other shops have it cheaper.' },
    { label: '📦 Out of Stock Item (Leak)', text: 'Do you have the Smart WiFi MCB switch in stock right now?' },
    { label: '🔍 Unmet Demand', text: 'Do you guys sell 12V cordless screwdrivers?' },
    { label: '🎉 Confirm Purchase (Won)', text: 'Ok confirm! Pack 1 unit of the 650W Drill, I will pay via UPI.' }
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: SimMessage = {
      id: Date.now().toString(),
      sender: 'CUSTOMER',
      text: text.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.processMessage({
        vendorId,
        customerPhone,
        customerName,
        message: text.trim(),
        mode: 'COPILOT'
      });

      const aiMsg: SimMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'AI',
        text: response.replyText,
        meta: {
          stage: response.stage,
          dealValue: response.dealValue,
          leakedReason: response.leakedReason,
          productMentioned: response.productMentioned
        }
      };

      setMessages(prev => [...prev, aiMsg]);
      if (onRefreshDashboard) onRefreshDashboard();
    } catch (e) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'AI',
          text: 'Backend error: Please ensure FollowLytics backend is running on http://localhost:8080.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Bot className="w-6 h-6 text-emerald-600" />
          Interactive WhatsApp AI Simulator
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Test and experience how FollowLytics AI answers queries, extracts deal values, and identifies leaked revenue in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Scenario Triggers */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              One-Click Test Scenarios
            </h3>
            <div className="space-y-2">
              {sampleScenarios.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sc.text)}
                  disabled={loading}
                  className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 border border-gray-100 text-xs font-semibold text-gray-800 transition flex items-center justify-between group"
                >
                  <div>
                    <span className="block font-bold text-gray-900">{sc.label}</span>
                    <span className="text-[11px] text-gray-500 font-normal line-clamp-1">{sc.text}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <Sparkles className="w-4 h-4" />
              <span>How Analytics Are Extracted</span>
            </div>
            <p className="leading-relaxed">
              Every message you send here is passed to the FollowLytics engine. The AI parses prices, checks stock, detects customer objections, and immediately updates your <strong>Dashboard metrics</strong>.
            </p>
          </div>
        </div>

        {/* Right: WhatsApp-like Mock Phone Frame */}
        <div className="lg:col-span-2 bg-[#efeae2] rounded-3xl border border-gray-300 shadow-lg overflow-hidden flex flex-col h-[650px] relative">
          {/* WhatsApp Header */}
          <div className="bg-[#075e54] text-white px-5 py-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                RM
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight">{customerName}</h4>
                <p className="text-[11px] text-emerald-200">{customerPhone} • Online</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
              ⭐ Tracked Customer
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => {
              const isCust = m.sender === 'CUSTOMER';
              return (
                <div key={m.id} className={`flex flex-col ${isCust ? 'items-start' : 'items-end'}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed relative ${
                      isCust
                        ? 'bg-white text-gray-900 rounded-tl-none border border-gray-200'
                        : 'bg-[#d9fdd3] text-gray-900 rounded-tr-none'
                    }`}
                  >
                    {m.text}

                    {/* Metadata Pill */}
                    {m.meta && (
                      <div className="mt-2 pt-1.5 border-t border-emerald-200/60 flex flex-wrap gap-1.5 text-[10px] font-bold text-emerald-800">
                        {m.meta.stage && (
                          <span className="bg-white/80 px-1.5 py-0.5 rounded shadow-2xs">
                            Stage: {m.meta.stage}
                          </span>
                        )}
                        {m.meta.dealValue ? (
                          <span className="bg-white/80 px-1.5 py-0.5 rounded shadow-2xs">
                            Value: ₹{m.meta.dealValue}
                          </span>
                        ) : null}
                        {m.meta.leakedReason && m.meta.leakedReason !== 'NONE' && (
                          <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                            ⚠️ Leak: {m.meta.leakedReason}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 bg-white/90 text-gray-500 px-3.5 py-2 rounded-2xl text-xs w-max shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                <span>FollowLytics AI drafting reply...</span>
              </div>
            )}
          </div>

          {/* Composer Footer */}
          <div className="bg-[#f0f2f5] p-3 border-t border-gray-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type customer message or use scenarios on the left..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-white text-xs px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-emerald-600 shadow-inner"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-full bg-[#075e54] hover:bg-[#064e46] text-white flex items-center justify-center shadow-md transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
