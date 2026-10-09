import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Upload,
  Film,
  Sparkles,
  Layers,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  Trash2,
  Plus,
  Save,
  HelpCircle,
} from 'lucide-react';
import { productsApi, type CreateProductInput } from '../../api/products';

interface MediaItem {
  id?: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  instagramMediaId?: string | null;
}

export const ProductEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState<boolean>(isEditing);
  const [saving, setSaving] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [active, setActive] = useState(true);
  const [allowCod, setAllowCod] = useState(true);
  const [allowPrepayment, setAllowPrepayment] = useState(true);

  // Media
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [manualUrlInput, setManualUrlInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Variants
  const [variants, setVariants] = useState<
    { id?: string; size: string; color: string; stock: number; priceOverride?: number }[]
  >([
    { size: 'M', color: 'Black', stock: 10 },
    { size: 'L', color: 'Black', stock: 10 },
  ]);

  // Load existing product if editing
  useEffect(() => {
    if (!id) return;

    const loadProduct = async () => {
      try {
        setLoading(true);
        const product = await productsApi.getById(id);
        setName(product.name || '');
        setDescription(product.description || '');
        setPrice(product.price ? String(product.price) : '');
        setActive(product.active ?? true);
        setAllowCod(product.allowCod ?? true);
        setAllowPrepayment(product.allowPrepayment ?? true);

        if (product.media && product.media.length > 0) {
          setMediaList(
            product.media.map((m: any) => ({
              id: m.id,
              url: m.imageUrl,
              type: m.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
              instagramMediaId: m.instagramMediaId,
            })),
          );
        } else {
          setMediaList([]);
        }

        if (product.variants && product.variants.length > 0) {
          setVariants(
            product.variants.map((v: any) => ({
              id: v.id,
              size: v.size || '',
              color: v.color || '',
              stock: v.stock || 0,
              priceOverride: v.priceOverride || undefined,
            })),
          );
        } else {
          setVariants([{ size: 'Standard', color: 'Default', stock: 10 }]);
        }
      } catch (err: any) {
        alert(`Failed to load product: ${err.message || 'Product not found'}`);
        navigate('/products');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, navigate]);

  // Upload to Cloudinary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingFiles(true);
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const results = await productsApi.uploadMedia(formData);
      const newItems: MediaItem[] = results.map((item) => ({
        url: item.secureUrl || item.url,
        type: item.resourceType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      }));

      setMediaList((prev) => [...prev, ...newItems]);
    } catch (err: any) {
      alert(`File upload failed: ${err.message || 'Error uploading to Cloudinary'}`);
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddManualUrl = () => {
    if (!manualUrlInput.trim()) return;
    const url = manualUrlInput.trim();
    const isVideo = /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url) || url.includes('/video/upload/');
    setMediaList((prev) => [
      ...prev,
      {
        url,
        type: isVideo ? 'VIDEO' : 'IMAGE',
      },
    ]);
    setManualUrlInput('');
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddVariant = () => {
    setVariants([...variants, { size: 'M', color: 'Default', stock: 5 }]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: string, value: string | number) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      alert('Please provide product name and price.');
      return;
    }
    if (!allowCod && !allowPrepayment) {
      alert('Please select at least one available payment method (COD or Prepayment).');
      return;
    }

    try {
      setSaving(true);
      const payload: CreateProductInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: parseFloat(price),
        allowCod,
        allowPrepayment,
        active,
        media: mediaList.map((m) => ({
          imageUrl: m.url,
          type: m.type,
          instagramMediaId: m.instagramMediaId || undefined,
        })),
        variants: variants.map((v) => ({
          size: v.size.trim(),
          color: v.color.trim(),
          stock: Number(v.stock) || 0,
          priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
          active: true,
        })),
      };

      if (isEditing && id) {
        await productsApi.update(id, payload);
      } else {
        await productsApi.create(payload);
      }

      navigate('/products');
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-16 rounded-2xl text-center flex flex-col items-center justify-center space-y-3 max-w-5xl mx-auto my-12">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading product details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-pink-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
          </Link>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-2">
            {isEditing ? `Edit Product: ${name || 'Item'}` : 'Add New Product'}
            <Sparkles className="w-5 h-5 text-pink-500" />
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveProduct}
            disabled={saving || uploadingFiles}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-xs font-bold text-white shadow-lg shadow-pink-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> {isEditing ? 'Update Product' : 'Save & Publish Product'}
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Core Info, Media & Variants */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-pink-500" /> General Information
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Product Title / Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Heavyweight Oversized Hoodie"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Description & Fitting Notes
              </label>
              <textarea
                rows={4}
                placeholder="Fabric composition, fit style, wash care instructions. The AI sales agent uses this to answer customer questions accurately."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Base Price (₹ INR) *
              </label>
              <div className="relative">
                <span className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="1299.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Media & Cloudinary Upload Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-pink-500" /> Media & Videos (Cloudinary Upload)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select multiple photos and videos from your device. Automatically uploaded to Cloudinary for Instagram publishing.
                </p>
              </div>
              <span className="text-xs font-semibold text-pink-400">
                {mediaList.length} media attached
              </span>
            </div>

            {/* Drag & Drop File Picker */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-pink-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/70 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="image/*,video/*"
                className="hidden"
              />
              {uploadingFiles ? (
                <div className="flex flex-col items-center gap-2 text-pink-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-semibold">Uploading to Cloudinary...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-slate-300">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold">
                    Click to select multiple <span className="text-pink-400">Images</span> and <span className="text-purple-400">Videos</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Supports JPG, PNG, WEBP, MP4, MOV. Used for Instagram Carousels & Reels.
                  </p>
                </div>
              )}
            </div>

            {/* Manual URL entry fallback */}
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="Or paste direct image/video URL..."
                value={manualUrlInput}
                onChange={(e) => setManualUrlInput(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={handleAddManualUrl}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
              >
                Add URL
              </button>
            </div>

            {/* Gallery Grid */}
            {mediaList.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                {mediaList.map((m, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-xl overflow-hidden aspect-square bg-slate-950 border border-slate-800 group shadow-md"
                  >
                    {m.type === 'VIDEO' ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <video src={m.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Film className="w-6 h-6 text-purple-400" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={m.url}
                        alt={`Media ${idx}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-black/80 text-white backdrop-blur-sm">
                      {m.type === 'VIDEO' ? '🎬 REEL' : `#${idx + 1}${idx === 0 ? ' (Cover)' : ''}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                      title="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variants, Sizes & Inventory Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-pink-500" /> Sizes, Colours & Stock Inventory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure sizes and colors. The bot will automatically prompt customers to select their size & colour during DM checkout!
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddVariant}
                className="px-3 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-xs font-semibold text-pink-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Variant
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-400 px-3 pb-1">
                <span className="col-span-3">Size</span>
                <span className="col-span-4">Colour</span>
                <span className="col-span-3">Units in Stock</span>
                <span className="col-span-2 text-right">Action</span>
              </div>

              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800"
                >
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="e.g. M"
                      value={v.size}
                      onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800 rounded-lg text-xs text-white border border-slate-700 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="e.g. Jet Black"
                      value={v.color}
                      onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800 rounded-lg text-xs text-white border border-slate-700 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Stock"
                      value={v.stock}
                      onChange={(e) =>
                        handleVariantChange(idx, 'stock', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-800 rounded-lg text-xs text-white border border-slate-700 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Remove Variant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Status & Settings Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Product Status</h3>
            <p className="text-xs text-slate-400">
              Control whether this product is active and recommended to customers by the AI Sales Bot.
            </p>

            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`w-full py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                active
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {active ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Active (Visible in Store)
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" /> Inactive / Draft
                </>
              )}
            </button>
          </div>

          {/* Payment Methods Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Payment Options *</h3>
              <HelpCircle className="w-4 h-4 text-slate-500" />
            </div>

            <div className="space-y-2.5">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  allowCod
                    ? 'bg-slate-800/90 border-pink-500/60 text-white shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={allowCod}
                  onChange={(e) => setAllowCod(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-pink-500 focus:ring-0 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-white">Cash on Delivery (COD)</div>
                  <div className="text-[11px] text-slate-400">Customers can pay upon physical delivery</div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  allowPrepayment
                    ? 'bg-slate-800/90 border-pink-500/60 text-white shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={allowPrepayment}
                  onChange={(e) => setAllowPrepayment(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-pink-500 focus:ring-0 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-white">Prepayment (Online / UPI)</div>
                  <div className="text-[11px] text-slate-400">Direct bank transfer or UPI QR payment</div>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button Sidebar Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <button
              type="submit"
              disabled={saving || uploadingFiles}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Product...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {isEditing ? 'Update Changes' : 'Create Product'}
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              Changes are instantly synced with PostgreSQL and accessible by the AI assistant.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
