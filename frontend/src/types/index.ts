export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type DealStage = 'INQUIRY' | 'PRICE_QUOTED' | 'NEGOTIATING' | 'SOLD' | 'LOST';
export type LeakedReason = 'PRICE_HIGH' | 'OUT_OF_STOCK' | 'UNSERVICEABLE_LOCATION' | 'GHOSTED' | 'COMPETITOR' | 'NONE';

export interface Vendor {
  id: number;
  phone: string;
  storeName: string;
  upiId?: string;
  currency?: string;
  storePolicies?: string;
  isOnboarded?: boolean;
  createdAt?: string;
}

export interface Product {
  id?: number;
  vendorId: number;
  name: string;
  sku?: string;
  category?: string;
  price: number;
  imageUrl?: string;
  stockStatus: StockStatus;
  description?: string;
  usageInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerDeal {
  id: number;
  vendorId: number;
  customerPhone: string;
  customerName: string;
  stage: DealStage;
  dealValue: number;
  leakedReason: LeakedReason;
  productMentioned?: string;
  summary?: string;
  isClosed: boolean;
  isTracked?: boolean;
  lastInteractionAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  dealId: number;
  sender: 'CUSTOMER' | 'AI' | 'VENDOR';
  content: string;
  timestamp: string;
}

export interface LeakedCategory {
  reason: string;
  count: number;
  totalAmount: number;
}

export interface DemandStat {
  productName: string;
  count: number;
  carriedInCatalog: boolean;
}

export interface DashboardSummary {
  vendorId: number;
  storeName: string;
  currency: string;
  totalSalesToday: number;
  totalLeakedRevenue: number;
  totalTrackedCustomers: number;
  conversionRatePercent: number;
  inquiryCount: number;
  priceQuotedCount: number;
  negotiatingCount: number;
  soldCount: number;
  lostCount: number;
  leakedBreakdown: LeakedCategory[];
  topDemandedProducts: DemandStat[];
  unmetDemand: DemandStat[];
  recentDeals: CustomerDeal[];
}
