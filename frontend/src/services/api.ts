import { DashboardSummary, Product, Vendor, CustomerDeal, ChatMessage } from '../types';

const API_BASE = 'http://localhost:8080/api';

export const api = {
  // Auth & OTP
  async sendOtp(phone: string): Promise<{ success: boolean; message: string; otp: string }> {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    if (!res.ok) throw new Error('Failed to send OTP');
    return res.json();
  },

  async verifyOtp(phone: string, otp: string): Promise<{ success: boolean; vendor: Vendor; isOnboarded: boolean }> {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Verification failed' }));
      throw new Error(err.message || 'Failed to verify OTP');
    }
    return res.json();
  },

  async completeOnboarding(data: {
    vendorId: number;
    storeName: string;
    upiId?: string;
    storePolicies?: string;
    products: Partial<Product>[];
  }): Promise<{ success: boolean; vendor: Vendor }> {
    const res = await fetch(`${API_BASE}/auth/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to complete onboarding');
    return res.json();
  },

  // Vendor & Auth
  async getVendors(): Promise<Vendor[]> {
    const res = await fetch(`${API_BASE}/auth/vendors`);
    if (!res.ok) throw new Error('Failed to load vendors');
    return res.json();
  },

  async getVendor(id: number): Promise<Vendor> {
    const res = await fetch(`${API_BASE}/auth/vendor/${id}`);
    if (!res.ok) throw new Error('Failed to load vendor');
    return res.json();
  },

  async updateVendor(id: number, data: Partial<Vendor>): Promise<Vendor> {
    const res = await fetch(`${API_BASE}/auth/vendor/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update vendor');
    return res.json();
  },

  async setCurrentSession(vendorId: number): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/current`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId })
      });
    } catch (e) {}
  },

  // Products & Catalog
  async getProducts(vendorId: number, search?: string): Promise<Product[]> {
    const url = new URL(`${API_BASE}/products`);
    url.searchParams.set('vendorId', vendorId.toString());
    if (search) url.searchParams.set('search', search);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  async createProduct(product: Product): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error('Failed to create product');
    return res.json();
  },

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error('Failed to update product');
    return res.json();
  },

  async deleteProduct(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete product');
  },

  // Analytics & Intelligence
  async getDashboard(vendorId: number): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/analytics/dashboard?vendorId=${vendorId}`);
    if (!res.ok) throw new Error('Failed to fetch dashboard analytics');
    return res.json();
  },

  // Deals & Chats
  async getDeals(vendorId: number): Promise<CustomerDeal[]> {
    const res = await fetch(`${API_BASE}/chat/deals?vendorId=${vendorId}`);
    if (!res.ok) throw new Error('Failed to fetch deals');
    return res.json();
  },

  async getMessages(dealId: number): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE}/chat/deals/${dealId}/messages`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async updateDealStage(dealId: number, stage: string, dealValue?: number, leakedReason?: string): Promise<CustomerDeal> {
    const res = await fetch(`${API_BASE}/chat/deals/${dealId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, dealValue, leakedReason })
    });
    if (!res.ok) throw new Error('Failed to update deal stage');
    return res.json();
  },

  // Process message (Chat AI Simulator)
  async processMessage(payload: {
    vendorId: number;
    customerPhone: string;
    customerName: string;
    message: string;
    mode?: string;
  }) {
    const res = await fetch(`${API_BASE}/chat/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to process message');
    return res.json();
  }
};
