import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Loader2,
  Boxes,
  AlertTriangle,
  Send,
  Share2,
  Hash,
  Film,
  Link as LinkIcon,
  Unlink,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { productsApi } from '../../api/products';
import { instagramApi, type OrganicInstagramMedia } from '../../api/instagram';
import type { Product } from '../../types';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Instagram Publish Modal State
  const [publishModalOpen, setPublishModalOpen] = useState<boolean>(false);
  const [publishingProduct, setPublishingProduct] = useState<Product | null>(null);
  const [publishMediaType, setPublishMediaType] = useState<'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'REELS'>('IMAGE');
  const [selectedPublishUrls, setSelectedPublishUrls] = useState<string[]>([]);
  const [postCaption, setPostCaption] = useState<string>('');
  const [generatingCaption, setGeneratingCaption] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);

  // Organic Instagram Posts Sync & Linking State
  const [organicModalOpen, setOrganicModalOpen] = useState<boolean>(false);
  const [organicMedia, setOrganicMedia] = useState<OrganicInstagramMedia[]>([]);
  const [loadingOrganic, setLoadingOrganic] = useState<boolean>(false);
  const [selectedProductToLink, setSelectedProductToLink] = useState<string>('');
  const [linkingMediaId, setLinkingMediaId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getAll({
        search: searchQuery || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      });
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, activeFilter]);

  const handleOpenAdd = () => {
    navigate('/products/new');
  };

  const handleOpenEdit = (p: Product) => {
    navigate(`/products/${p.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    try {
      await productsApi.delete(id);
      setDeleteConfirmId(null);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // Open Publish to Instagram Modal
  const handleOpenPublishModal = (product: Product) => {
    setPublishingProduct(product);
    const urls = product.media?.map((m) => m.imageUrl) || [];
    setSelectedPublishUrls(urls);

    // Auto-detect best post type
    const hasVideo = product.media?.some((m) => m.type === 'VIDEO');
    if (hasVideo && urls.length === 1) {
      setPublishMediaType('REELS');
    } else if (urls.length > 1) {
      setPublishMediaType('CAROUSEL');
    } else {
      setPublishMediaType('IMAGE');
    }

    setPublishModalOpen(true);
    handleGenerateCaption(product.name, product.price, product.description || '');
  };

  const handleGenerateCaption = async (
    pName: string,
    pPrice: number,
    pDesc: string
  ) => {
    try {
      setGeneratingCaption(true);
      const res: any = await productsApi.generateCaption({
        name: pName,
        price: pPrice,
        description: pDesc,
      });
      if (res?.caption) {
        setPostCaption(res.caption);
      }
    } catch (err: any) {
      console.warn('Failed to generate caption:', err);
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handlePublishToInstagram = async () => {
    if (!publishingProduct || selectedPublishUrls.length === 0) {
      alert('Please select at least one image or video for this post.');
      return;
    }

    try {
      setPublishing(true);
      await productsApi.publishToInstagram(publishingProduct.id, {
        caption: postCaption.trim(),
        mediaType: publishMediaType,
        mediaUrls: selectedPublishUrls,
      });
      alert('🎉 Product published to Instagram successfully! Media ID is linked for automated DM replies.');
      setPublishModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to publish post to Instagram');
    } finally {
      setPublishing(false);
    }
  };

  // Open Organic Instagram Post Linking Modal
  const handleOpenOrganicModal = async (defaultProductId?: string) => {
    if (defaultProductId) {
      setSelectedProductToLink(defaultProductId);
    } else if (products.length > 0) {
      setSelectedProductToLink(products[0].id);
    }
    setOrganicModalOpen(true);
    fetchOrganicPosts();
  };

  const fetchOrganicPosts = async () => {
    try {
      setLoadingOrganic(true);
      const posts = await instagramApi.getOrganicMedia({ limit: 30 });
      setOrganicMedia(posts);
    } catch (err: any) {
      alert(`Could not fetch Instagram posts: ${err.message}`);
    } finally {
      setLoadingOrganic(false);
    }
  };

  const handleLinkOrganicPost = async (post: OrganicInstagramMedia, targetProductId?: string) => {
    const prodId = targetProductId || selectedProductToLink;
    if (!prodId) {
      alert('Please select a product to link with this Instagram post.');
      return;
    }

    try {
      setLinkingMediaId(post.id);
      await productsApi.linkInstagramMedia(prodId, {
        instagramMediaId: post.id,
        mediaUrl: post.mediaUrl || post.thumbnailUrl || undefined,
        mediaType: post.mediaType === 'VIDEO' ? 'VIDEO' : post.mediaType === 'CAROUSEL_ALBUM' ? 'CAROUSEL' : 'IMAGE',
      });
      alert('✅ Connected! This Instagram post is now linked to your product.');
      fetchOrganicPosts();
      fetchProducts();
    } catch (err: any) {
      alert(`Failed to link post: ${err.message}`);
    } finally {
      setLinkingMediaId(null);
    }
  };

  const handleUnlinkOrganicPost = async (productId: string, instagramMediaId: string) => {
    if (!confirm('Are you sure you want to unlink this Instagram post from the product?')) return;
    try {
      await productsApi.unlinkInstagramMedia(productId, instagramMediaId);
      alert('Instagram post unlinked successfully.');
      fetchOrganicPosts();
      fetchProducts();
    } catch (err: any) {
      alert(`Failed to unlink: ${err.message}`);
    }
  };

  const totalStockCount = products.reduce((acc, p) => {
    const vStock = p.variants?.reduce((s, v) => s + v.stock, 0) || 0;
    return acc + vStock;
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            Products & Inventory <Package className="w-6 h-6 text-pink-500" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cloudinary multi-media uploads, post as Reels/Carousels, and link live Instagram organic posts to your catalog.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenOrganicModal()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-pink-400 border border-pink-500/30 shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <LinkIcon className="w-4 h-4" /> Link Organic IG Posts
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{products.length}</div>
            <div className="text-xs text-slate-400">Total Products</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {products.filter((p) => p.active).length}
            </div>
            <div className="text-xs text-slate-400">Active in Catalog</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalStockCount}</div>
            <div className="text-xs text-slate-400">Total Units in Stock</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400">Filter:</span>
          {['all', 'active', 'inactive'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                activeFilter === f
                  ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                  : 'bg-slate-800/40 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="glass-panel p-16 rounded-2xl text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading catalog...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">No products found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Add items to your store with images and videos to enable automated DM replies, stock tracking, and direct Instagram posting.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-xs font-semibold text-white shadow-lg shadow-pink-500/20"
          >
            + Add First Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const hasMedia = product.media && product.media.length > 0;
            const primaryMedia = hasMedia ? product.media![0] : null;
            const stockSum = product.variants?.reduce((acc, v) => acc + v.stock, 0) || 0;
            const linkedIgMedia = product.media?.find((m) => m.instagramMediaId);

            return (
              <div
                key={product.id}
                className="glass-panel rounded-2xl overflow-hidden border border-slate-800 hover:border-slate-700 transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Media Banner */}
                  <div className="h-48 bg-slate-900/80 relative overflow-hidden flex items-center justify-center">
                    {primaryMedia ? (
                      primaryMedia.type === 'VIDEO' ? (
                        <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
                          <video
                            src={primaryMedia.imageUrl}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            loop
                          />
                          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-purple-600/90 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-md">
                            <Film className="w-3 h-3" /> Reel / Video
                          </div>
                        </div>
                      ) : (
                        <img
                          src={primaryMedia.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=60';
                          }}
                        />
                      )
                    ) : (
                      <div className="text-slate-600 flex flex-col items-center gap-1">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-xs">No media</span>
                      </div>
                    )}

                    {/* Media count badge */}
                    {product.media && product.media.length > 1 && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-semibold flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {product.media.length} files
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md ${
                          product.active
                            ? 'bg-emerald-500/80 text-white'
                            : 'bg-slate-700/80 text-slate-300'
                        }`}
                      >
                        {product.active ? 'Active' : 'Inactive'}
                      </span>

                      {linkedIgMedia?.instagramMediaId && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gradient-to-r from-pink-600 to-purple-600 text-white backdrop-blur-md flex items-center gap-1 shadow-md">
                          <Share2 className="w-3 h-3" /> Linked to IG
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      <span className="px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md text-white font-bold text-sm border border-slate-700/50">
                        ₹{product.price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-semibold text-base text-white line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
                      {product.description || 'No description provided.'}
                    </p>

                    {/* Variants list tags */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 mr-1">
                        <Layers className="w-3 h-3" /> Variants:
                      </span>
                      {product.variants && product.variants.length > 0 ? (
                        product.variants.map((v) => (
                          <span
                            key={v.id}
                            className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[11px] text-slate-300 border border-slate-700/40"
                          >
                            {v.size ? `${v.size}` : ''} {v.color ? `(${v.color})` : ''} - {v.stock} in stock
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-500">None</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Boxes className="w-3.5 h-3.5 text-slate-500" /> Stock: {stockSum} units
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(product)}
                        className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(product.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenPublishModal(product)}
                      className="py-2 px-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/30 text-xs font-semibold text-pink-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Post to IG
                    </button>
                    <button
                      onClick={() => handleOpenOrganicModal(product.id)}
                      className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-pink-400" /> Link IG Post
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-sm w-full space-y-4 border border-red-500/30">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Delete Product?</h3>
              <p className="text-xs text-slate-400 mt-1">
                This action cannot be undone. This product and its variants will be removed from catalog.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish to Instagram Modal (Reels, Carousels, & Single Post) */}
      {publishModalOpen && publishingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel p-6 rounded-2xl max-w-xl w-full my-8 space-y-5 border border-pink-500/40 shadow-2xl shadow-pink-500/10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Publish to Instagram <Share2 className="w-5 h-5 text-pink-500" />
              </h3>
              <button
                onClick={() => setPublishModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Post Type Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Instagram Post Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPublishMediaType('CAROUSEL')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      publishMediaType === 'CAROUSEL'
                        ? 'bg-pink-500/20 border-pink-500 text-pink-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Carousel (Multi-file)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublishMediaType('REELS')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      publishMediaType === 'REELS'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Film className="w-4 h-4" />
                    <span>Instagram Reel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublishMediaType('IMAGE')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      publishMediaType === 'IMAGE'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Single Photo</span>
                  </button>
                </div>
              </div>

              {/* Media Preview & Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Attached Media ({selectedPublishUrls.length} items)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {selectedPublishUrls.map((url, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden aspect-square bg-slate-950 border border-slate-800"
                    >
                      {/\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url) || url.includes('/video/upload/') ? (
                        <video src={url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={url} alt={`Slide ${i}`} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/70 text-white">
                        Slide {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Caption & Hashtags Generator */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-pink-500" /> Caption & Trending Hashtags
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateCaption(
                        publishingProduct.name,
                        publishingProduct.price,
                        publishingProduct.description || ''
                      )
                    }
                    disabled={generatingCaption}
                    className="text-xs font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1 bg-pink-500/10 px-2.5 py-1 rounded-lg border border-pink-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {generatingCaption ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" /> Regenerate AI Caption ✨
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="AI-generated post caption and trending hashtags..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 leading-relaxed font-sans"
                />
              </div>

              {/* Publish Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPublishModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePublishToInstagram}
                  disabled={publishing || selectedPublishUrls.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-xs font-bold text-white shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing & Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Publish to Instagram Now 🚀
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync & Link Organic Instagram Posts Modal */}
      {organicModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel p-6 rounded-2xl max-w-4xl w-full my-8 space-y-5 border border-pink-500/40 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Connect Live Instagram Posts to Catalog <LinkIcon className="w-5 h-5 text-pink-500" />
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Posts & Reels published directly in the Instagram app can be linked to your products so the AI bot recognizes them.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchOrganicPosts}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  title="Refresh Posts"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingOrganic ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setOrganicModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Target Product Selector Dropdown */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-300">
                Default product to connect:
              </span>
              <select
                value={selectedProductToLink}
                onChange={(e) => setSelectedProductToLink(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-pink-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Posts Grid */}
            {loadingOrganic ? (
              <div className="p-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Fetching live posts from Instagram...</p>
              </div>
            ) : organicMedia.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm">No Instagram posts found for this connected account.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
                {organicMedia.map((post) => {
                  const isLinked = !!post.linkedProduct;

                  return (
                    <div
                      key={post.id}
                      className="glass-panel p-3 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2.5"
                    >
                      <div className="space-y-2">
                        {/* Thumbnail */}
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-950">
                          {post.mediaType === 'VIDEO' ? (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900">
                              <video
                                src={post.mediaUrl || ''}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-purple-600/90 text-white text-[9px] font-bold flex items-center gap-1">
                                <Film className="w-2.5 h-2.5" /> REEL
                              </div>
                            </div>
                          ) : (
                            <img
                              src={post.mediaUrl || post.thumbnailUrl || ''}
                              alt="Post"
                              className="w-full h-full object-cover"
                            />
                          )}

                          {post.mediaType === 'CAROUSEL_ALBUM' && (
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-pink-600/90 text-white text-[9px] font-bold flex items-center gap-1">
                              <Layers className="w-2.5 h-2.5" /> CAROUSEL
                            </div>
                          )}

                          <a
                            href={post.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 p-1 rounded bg-black/70 text-white hover:text-pink-400 transition-colors"
                            title="View on Instagram"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {/* Caption snippet */}
                        <p className="text-[11px] text-slate-300 line-clamp-2">
                          {post.caption || 'No caption'}
                        </p>

                        <div className="text-[10px] text-slate-500">
                          {new Date(post.timestamp).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Connection status and actions */}
                      <div className="pt-2 border-t border-slate-800/80">
                        {isLinked ? (
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-semibold text-emerald-400 truncate flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              {post.linkedProduct?.name}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUnlinkOrganicPost(post.linkedProduct!.id, post.id)
                              }
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                              title="Unlink"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={linkingMediaId === post.id}
                            onClick={() => handleLinkOrganicPost(post)}
                            className="w-full py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 hover:text-white border border-pink-500/30 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {linkingMediaId === post.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <LinkIcon className="w-3.5 h-3.5" /> Connect to Product
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
