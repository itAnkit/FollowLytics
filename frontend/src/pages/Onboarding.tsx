import React, { useState } from 'react';
import { Store, Package, Plus, Trash2, ArrowRight, CheckCircle2, Sparkles, Image as ImageIcon, DollarSign } from 'lucide-react';
import { api } from '../services/api';
import { Vendor, Product } from '../types';

interface OnboardingProps {
  vendor: Vendor;
  onOnboardingComplete: (vendor: Vendor) => void;
}

interface DraftProduct {
  name: string;
  price: string;
  imageUrl?: string;
  description?: string;
  usageInstructions?: string;
}

export const Onboarding: React.FC<OnboardingProps> = ({ vendor, onOnboardingComplete }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [storeName, setStoreName] = useState(vendor.storeName || '');
  const [upiId, setUpiId] = useState(vendor.upiId || '');
  const [storePolicies, setStorePolicies] = useState(vendor.storePolicies || '');

  // Catalog items
  const [products, setProducts] = useState<DraftProduct[]>([
    {
      name: '',
      price: '',
      imageUrl: '',
      description: '',
      usageInstructions: ''
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddProductRow = () => {
    setProducts([
      ...products,
      { name: '', price: '', imageUrl: '', description: '', usageInstructions: '' }
    ]);
  };

  const handleRemoveProductRow = (index: number) => {
    if (products.length <= 1) return;
    setProducts(products.filter((_, idx) => idx !== index));
  };

  const handleProductChange = (index: number, field: keyof DraftProduct, val: string) => {
    const updated = [...products];
    updated[index][field] = val;
    setProducts(updated);
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setError('Store Name is required');
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate that at least 1 product has name and price
    const validProducts = products.filter(p => p.name.trim() && p.price.trim());
    if (validProducts.length === 0) {
      setError('Please add at least one product with a Name and Price.');
      return;
    }

    setLoading(true);
    try {
      const payloadProducts = validProducts.map(p => ({
        name: p.name.trim(),
        price: parseFloat(p.price) || 0,
        imageUrl: p.imageUrl?.trim() || undefined,
        description: p.description?.trim() || undefined,
        usageInstructions: p.usageInstructions?.trim() || undefined,
        stockStatus: 'IN_STOCK' as const
      }));

      const res = await api.completeOnboarding({
        vendorId: vendor.id,
        storeName: storeName.trim(),
        upiId: upiId.trim() || undefined,
        storePolicies: storePolicies.trim() || undefined,
        products: payloadProducts
      });

      onOnboardingComplete(res.vendor);
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Progress */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Welcome to FollowLytics! Let's Set Up Your Store
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            One-time setup so our AI knows your business rules and products
          </p>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold ${
              currentStep === 1
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
            }`}>
              <span>1. Business Details</span>
            </div>
            <span className="text-gray-300 dark:text-gray-700">→</span>
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold ${
              currentStep === 2
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              <span>2. Product Catalogue</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* STEP 1: Business Details */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-600" />
                Step 1: Your Business Profile
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Tell us about your store so the AI can greet customers appropriately.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Store / Business Name * <span className="text-emerald-600 font-normal">(Required)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Hardware & Tools"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  UPI ID for Payments <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. storename@okaxis"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  AI will share this UPI ID when a customer confirms an order on WhatsApp.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Delivery Policies, Hours & Rules <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Free local delivery on orders above ₹500. Open 9 AM to 8 PM Monday-Saturday. 100% genuine products."
                  value={storePolicies}
                  onChange={(e) => setStorePolicies(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition"
              >
                <span>Continue to Catalogue Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Product Catalogue */}
        {currentStep === 2 && (
          <form onSubmit={handleFinishOnboarding} className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Step 2: Add Initial Products
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <strong>Name & Price</strong> are required. Image, description, and usage instructions help AI give precise answers.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddProductRow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg hover:bg-emerald-100 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Item</span>
              </button>
            </div>

            {/* Product Cards List */}
            <div className="space-y-4">
              {products.map((prod, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 relative space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Product #{idx + 1}
                    </span>
                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveProductRow(idx)}
                        className="text-gray-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Required Row: Name & Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Product Name * <span className="text-emerald-600 font-normal">(Required)</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Waterproof Adhesive Tape 50m"
                        value={prod.name}
                        onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Price (₹) * <span className="text-emerald-600 font-normal">(Required)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="240"
                        value={prod.price}
                        onChange={(e) => handleProductChange(idx, 'price', e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Optional: Product Image URL */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Product Image URL <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <ImageIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        placeholder="https://example.com/tape.jpg"
                        value={prod.imageUrl || ''}
                        onChange={(e) => handleProductChange(idx, 'imageUrl', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Optional: Description & Usage */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Description / Specifications <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. 50m length, double-sided, 15kg weight holding capacity."
                        value={prod.description || ''}
                        onChange={(e) => handleProductChange(idx, 'description', e.target.value)}
                        className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Usage Directions for AI <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Clean surface first, apply pressure for 30s. Full bond in 2 hrs."
                        value={prod.usageInstructions || ''}
                        onChange={(e) => handleProductChange(idx, 'usageInstructions', e.target.value)}
                        className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl"
              >
                ← Back to Business Details
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Saving Setup...' : 'Complete Setup & Launch Dashboard'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
