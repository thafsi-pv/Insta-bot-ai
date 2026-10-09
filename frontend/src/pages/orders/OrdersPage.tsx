import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  CreditCard,
  Package,
  RefreshCw,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { ordersApi } from '../../api/orders';
import type { Order, OrderStatus } from '../../types';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_APPROVAL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await ordersApi.getAll({
        status:
          statusFilter === 'all' ? undefined : (statusFilter as OrderStatus),
        search: searchQuery || undefined,
      });
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchQuery]);

  // Polling every 5s for new pending orders
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [statusFilter, searchQuery]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    try {
      setActionLoadingId(id);
      await ordersApi.approve(id);
      fetchOrders(true);
    } catch (err: any) {
      alert(err.message || 'Failed to approve order');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionLoadingId(id);
      await ordersApi.reject(id);
      fetchOrders(true);
    } catch (err: any) {
      alert(err.message || 'Failed to reject order');
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = orders.filter(
    (o) => o.status === 'PENDING_APPROVAL',
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            Orders & Approvals <ShoppingBag className="w-6 h-6 text-pink-500" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review orders placed by Instagram DM customers, approve orders to reduce stock and notify customers.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-2 text-xs font-semibold transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, address, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            {
              id: 'PENDING_APPROVAL',
              label: 'Pending Approval',
              icon: Clock,
              badge: pendingCount > 0 ? pendingCount : null,
            },
            { id: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
            { id: 'REJECTED', label: 'Rejected', icon: XCircle },
            { id: 'all', label: 'All Orders', icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] text-white font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white">No orders found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When customers send their order details via Instagram DM, they will automatically appear here for your review and one-click stock deduction.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((order) => {
            const isPending = order.status === 'PENDING_APPROVAL';
            const isApproved = order.status === 'APPROVED';
            const isReject = order.status === 'REJECTED';
            const isActionLoading = actionLoadingId === order.id;

            return (
              <div
                key={order.id}
                className={`glass-panel rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  isPending
                    ? 'border-amber-500/40 bg-slate-900/90 shadow-lg shadow-amber-500/5'
                    : isApproved
                    ? 'border-emerald-500/30 bg-slate-900/60'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Row: Customer & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">
                          {order.customerName}
                        </h3>
                        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                          @{order.customer?.username || 'customer'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Placed:{' '}
                        {new Date(order.createdAt).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    <div>
                      {isPending && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Awaiting Approval
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {isReject && (
                        <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-pink-500" /> Ordered Items & Variants:
                      </span>
                    </div>

                    {order.items && order.items.length > 0 ? (
                      order.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-white">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-bold text-pink-400">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>

                          {(item.variant || item.product) && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {item.variant?.size && (
                                <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-300 text-[10px] font-semibold border border-pink-500/20">
                                  Size: {item.variant.size}
                                </span>
                              )}
                              {item.variant?.color && (
                                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-semibold border border-purple-500/20">
                                  Color: {item.variant.color}
                                </span>
                              )}
                              {item.variant?.sku && (
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
                                  SKU: {item.variant.sku}
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[10px] text-emerald-400/90 font-medium ml-auto flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Stock reserved (-{item.quantity})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">
                        Custom items inquiry
                      </span>
                    )}

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-white">
                      <span>Total Amount:</span>
                      <span className="text-pink-400 text-sm font-display">
                        ₹{order.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Shipping & Payment Details */}
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Address:</strong> {order.shippingAddress}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>
                        <strong>Payment:</strong>{' '}
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            order.paymentMethod === 'COD'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          }`}
                        >
                          {order.paymentMethod === 'COD'
                            ? 'Cash on Delivery (COD)'
                            : 'Prepayment / Online'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions (Approve / Reject) */}
                {isPending && (
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex gap-3">
                    <button
                      onClick={() => handleReject(order.id)}
                      disabled={isActionLoading}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-rose-300 hover:text-rose-200 border border-rose-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Reject order and restore stock back to inventory"
                    >
                      <X className="w-3.5 h-3.5" /> Reject (Revert Stock)
                    </button>

                    <button
                      onClick={() => handleApprove(order.id)}
                      disabled={isActionLoading}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Approve & Confirm Order
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
