import React from 'react';
import { Flame, Lightbulb, ArrowUpRight, PlusCircle } from 'lucide-react';
import { DemandStat } from '../types';

interface DemandRadarProps {
  topDemanded: DemandStat[];
  unmetDemand: DemandStat[];
  onAddCatalogItem?: (name: string) => void;
}

export const DemandRadar: React.FC<DemandRadarProps> = ({ topDemanded, unmetDemand, onAddCatalogItem }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Top Inquired Catalog Products */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Highest Inquired Products</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Items customers are actively chatting about in WhatsApp
          </p>

          <div className="space-y-3">
            {topDemanded.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No catalog demand recorded yet</p>
            ) : (
              topDemanded.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{item.productName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{item.count} inquiries</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Unmet Customer Demand */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Unmet Market Demand (New Opportunities)</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Items customers asked for that your store <strong>does not sell yet</strong>
          </p>

          <div className="space-y-3">
            {unmetDemand.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No unmet queries detected yet</p>
            ) : (
              unmetDemand.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center">
                      ★
                    </span>
                    <div>
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{item.productName}</span>
                      <p className="text-[10px] text-amber-800 dark:text-amber-400 font-medium">{item.count} customers requested</p>
                    </div>
                  </div>
                  {onAddCatalogItem && (
                    <button
                      onClick={() => onAddCatalogItem(item.productName)}
                      className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-md transition shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Stock This</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
