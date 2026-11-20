import React, { useState, useEffect, useRef } from 'react';
import { Product, StockStatus } from '../types';
import { api } from '../services/api';
import { Plus, Search, Tag, Trash2, Edit3, Check, AlertCircle, Package, FileSpreadsheet, Download, Upload, X } from 'lucide-react';

interface CatalogProps {
  vendorId: number;
}

export const Catalog: React.FC<CatalogProps> = ({ vendorId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Form State for Add
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formPrice, setFormPrice] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formStock, setFormStock] = useState<StockStatus>('IN_STOCK');
  const [formDesc, setFormDesc] = useState('');
  const [formUsage, setFormUsage] = useState('');
  const [formSku, setFormSku] = useState('');
  const [saving, setSaving] = useState(false);

  // Form State for Edit
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editPrice, setEditPrice] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editStock, setEditStock] = useState<StockStatus>('IN_STOCK');
  const [editDesc, setEditDesc] = useState('');
  const [editUsage, setEditUsage] = useState('');
  const [editSku, setEditSku] = useState('');

  // CSV Upload State
  const [csvContent, setCsvContent] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvPreviewRows, setCsvPreviewRows] = useState<Array<{ name: string; category: string; price: string; stock: string }>>([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvMessage, setCsvMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts(vendorId, search);
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [vendorId, search]);

  const handleStockToggle = async (product: Product, newStatus: StockStatus) => {
    if (!product.id) return;
    try {
      await api.updateProduct(product.id, { stockStatus: newStatus });
      setProducts(products.map(p => p.id === product.id ? { ...p, stockStatus: newStatus } : p));
    } catch (e) {
      alert('Failed to update stock status');
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
    } catch (e) {
      alert('Failed to delete product');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice) return;

    setSaving(true);
    try {
      const newP: Product = {
        vendorId,
        name: formName.trim(),
        category: formCategory.trim() || 'General',
        price: parseFloat(formPrice),
        imageUrl: formImageUrl.trim() || undefined,
        stockStatus: formStock,
        sku: formSku.trim() || undefined,
        description: formDesc.trim() || undefined,
        usageInstructions: formUsage.trim() || undefined
      };
      await api.createProduct(newP);
      setShowAddModal(false);
      resetForm();
      fetchProducts();
    } catch (e) {
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory(p.category || 'General');
    setEditPrice(p.price.toString());
    setEditImageUrl(p.imageUrl || '');
    setEditStock(p.stockStatus);
    setEditDesc(p.description || '');
    setEditUsage(p.usageInstructions || '');
    setEditSku(p.sku || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.id || !editName || !editPrice) return;

    setSaving(true);
    try {
      const updated = await api.updateProduct(editingProduct.id, {
        name: editName.trim(),
        category: editCategory.trim() || 'General',
        price: parseFloat(editPrice),
        imageUrl: editImageUrl.trim() || undefined,
        stockStatus: editStock,
        sku: editSku.trim() || undefined,
        description: editDesc.trim() || undefined,
        usageInstructions: editUsage.trim() || undefined
      });
      setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
      setEditingProduct(null);
    } catch (e) {
      alert('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCategory('General');
    setFormPrice('');
    setFormImageUrl('');
    setFormStock('IN_STOCK');
    setFormDesc('');
    setFormUsage('');
    setFormSku('');
  };

  // CSV Handling
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);

      // Parse preview rows
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const rows: Array<{ name: string; category: string; price: string; stock: string }> = [];
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const parts = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
        if (parts[0]) {
          rows.push({
            name: parts[0] || 'Unknown Product',
            category: parts[1] || 'General',
            price: parts[2] || '0',
            stock: parts[3] || 'IN_STOCK'
          });
        }
      }
      setCsvPreviewRows(rows);
      setCsvMessage(null);
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async () => {
    if (!csvContent.trim()) {
      setCsvMessage({ text: 'Please select a CSV file first.', isError: true });
      return;
    }

    setCsvUploading(true);
    setCsvMessage(null);
    try {
      const res = await api.uploadCsv(vendorId, csvContent);
      setCsvMessage({ text: `✓ Successfully imported ${res.importedCount} products into your catalog!`, isError: false });
      setTimeout(() => {
        setShowCsvModal(false);
        setCsvContent('');
        setCsvFileName('');
        setCsvPreviewRows([]);
        setCsvMessage(null);
        fetchProducts();
      }, 1500);
    } catch (err: any) {
      setCsvMessage({ text: err.message || 'Failed to upload CSV file', isError: true });
    } finally {
      setCsvUploading(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sample = `Name,Category,Price,StockStatus,Description,UsageInstructions,SKU,ImageUrl
Heavy Duty Adhesive Tape 50m,Tapes & Adhesives,240,IN_STOCK,"Industrial strength double-sided waterproof tape. Holds up to 15kg/m.","Clean surface thoroughly before sticking. Press firmly for 30s. Full cure 2h.",TAPE-50M,https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=400
Waterproof Silicone Sealant 300ml,Chemicals & Sealants,320,IN_STOCK,"Clear RTV acetic silicone for bathrooms, kitchens, glass joints. Anti-fungal.","Apply with caulking gun. Skins over in 10 mins, fully cured in 24 hours.",SEAL-300ML,https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400
Outdoor LED Flood Light 50W,Electricals,890,IN_STOCK,"IP66 weatherproof aluminium die-cast casing, 5000 Lumens cool day light.","Mount securely on wall. Connect to 220V AC with earthing.",LED-50W,https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400`;

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'followlytics_catalog_template.csv');
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
            <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Product & Pricing Catalog
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            FollowLytics AI references these exact prices, specifications, and usage instructions when answering customers on WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* CSV Import Button */}
          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Upload CSV</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex justify-between items-center gap-4 bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by title or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
          Total Products: <span className="text-gray-900 dark:text-white font-bold">{products.length}</span>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs text-gray-400">Loading catalog...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 p-8">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">No products found</h3>
          <p className="text-xs text-gray-400 mt-1 mb-4">Add your store products individually or upload a CSV file so AI can quote prices and usage instructions.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowCsvModal(true)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-lg hover:bg-gray-200"
            >
              Upload CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700"
            >
              Add First Product
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => {
            const isOutOfStock = p.stockStatus === 'OUT_OF_STOCK';
            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition ${
                  isOutOfStock ? 'border-rose-200 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/10' : 'border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                <div>
                  {p.imageUrl && (
                    <div className="w-full h-36 rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-800">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {p.category || 'General'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(p)}
                        className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded transition"
                        title="Edit Product"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-gray-400 hover:text-rose-600 p-1 rounded transition"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{p.name}</h3>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{p.price.toLocaleString()}</div>

                  {p.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}

                  {p.usageInstructions && (
                    <div className="mt-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300">
                      <strong className="text-gray-800 dark:text-gray-200 block mb-0.5">💡 Usage Instructions for AI:</strong>
                      <span className="line-clamp-2">{p.usageInstructions}</span>
                    </div>
                  )}
                </div>

                {/* Stock Status Selector */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Stock:</span>
                  <select
                    value={p.stockStatus}
                    onChange={(e) => handleStockToggle(p, e.target.value as StockStatus)}
                    className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                      p.stockStatus === 'IN_STOCK'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : p.stockStatus === 'LOW_STOCK'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <option value="IN_STOCK">In Stock ✓</option>
                    <option value="LOW_STOCK">Low Stock ⚠️</option>
                    <option value="OUT_OF_STOCK">Out of Stock ✕</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Product to Store</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Waterproof Silicone Sealant 300ml"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="320"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Chemicals / Tools"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">SKU / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SEAL-300ML"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Stock Status</label>
                  <select
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value as StockStatus)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="IN_STOCK">In Stock</option>
                    <option value="LOW_STOCK">Low Stock</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Product Image URL <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/product.jpg"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Specifications & Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Clear acetic silicone for bathroom & kitchen glass joints. Anti-fungal."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                ></textarea>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Product Usage Instructions (What the AI tells the customer)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Clean surface thoroughly. Apply with caulking gun. Skins over in 10 mins, fully cured in 24 hours."
                  value={formUsage}
                  onChange={(e) => setFormUsage(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  {saving ? 'Saving...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                Edit Product: {editingProduct.name}
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Stock Status</label>
                  <select
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value as StockStatus)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="IN_STOCK">In Stock</option>
                    <option value="LOW_STOCK">Low Stock</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Product Image URL</label>
                <input
                  type="url"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Specifications & Description</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                ></textarea>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Product Usage Instructions (What the AI tells the customer)
                </label>
                <textarea
                  rows={2}
                  value={editUsage}
                  onChange={(e) => setEditUsage(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  {saving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Import Products via CSV</h3>
              </div>
              <button onClick={() => setShowCsvModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg">✕</button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Bulk upload your products from Excel or Google Sheets. The AI will immediately use the uploaded prices and descriptions to answer customer WhatsApp queries.
            </p>

            {/* Template Download Card */}
            <div className="p-3.5 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 block">Need the standard CSV format?</span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Download our pre-formatted template with sample products</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Template</span>
              </button>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer bg-gray-50 dark:bg-gray-800/40 transition"
            >
              <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {csvFileName ? `Selected: ${csvFileName}` : 'Click to browse or drop your .csv file here'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Columns supported: Name, Category, Price, StockStatus, Description, UsageInstructions, SKU, ImageUrl</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileChange}
                className="hidden"
              />
            </div>

            {/* Preview of Parsed Rows */}
            {csvPreviewRows.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  CSV Preview (Showing first {csvPreviewRows.length} items):
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                      {csvPreviewRows.map((r, i) => (
                        <tr key={i}>
                          <td className="p-2 font-semibold line-clamp-1">{r.name}</td>
                          <td className="p-2">{r.category}</td>
                          <td className="p-2 font-mono text-emerald-600 font-bold">₹{r.price}</td>
                          <td className="p-2">{r.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Status message */}
            {csvMessage && (
              <div className={`mt-3.5 p-3 rounded-xl text-xs font-semibold ${
                csvMessage.isError
                  ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              }`}>
                {csvMessage.text}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={csvUploading || !csvContent}
                onClick={handleImportCsv}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md text-xs transition"
              >
                {csvUploading ? 'Importing Products...' : 'Confirm & Import Products'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
