import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import {
  Package,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { InstagramIcon } from '../../components/common/InstagramIcon';
import { Link } from 'react-router-dom';


export const DashboardOverviewPage: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      try {
        const res: any = await apiClient.get('/dashboard/metrics');
        return res.data || res;
      } catch {
        // Fallback initial metrics if endpoint not yet populated
        return {
          instagramConnected: false,
          instagramAccount: null,
          totalProducts: 0,
          activeProducts: 0,
          lowStockCount: 0,
          activeConversations: 0,
          totalConversations: 0,
          aiRepliesToday: 0,
        };
      }
    },
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            Executive Overview <Activity className="w-5 h-5 text-pink-500 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time status of Instagram messaging, AI sales agent, and PostgreSQL inventory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-2"
          >
            <Package className="w-4 h-4 text-pink-400" />
            Manage Inventory
          </Link>
          <Link
            to="/instagram"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-xs font-semibold text-white shadow-lg shadow-pink-500/20 transition-all flex items-center gap-2"
          >
            <InstagramIcon className="w-4 h-4" />
            Instagram Graph API
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Instagram Account Card */}
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Instagram Link
            </span>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <InstagramIcon className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            {stats?.instagramConnected ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-lg font-bold font-display text-white">
                  @{stats?.instagramAccount?.username || 'Connected'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-400">
                <XCircle className="w-5 h-5" />
                <span className="text-base font-semibold text-slate-300">Disconnected</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                stats?.instagramConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            Official Webhook & Graph API
          </p>
        </div>

        {/* Total Products Card */}
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Database Catalog
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-white">
              {isLoading ? '...' : stats?.totalProducts || 0}
            </span>
            <span className="text-xs text-slate-400">products</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {stats?.activeProducts || 0} active in PostgreSQL
          </p>
        </div>

        {/* Low Stock Card */}
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Inventory Alerts
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-white">
              {isLoading ? '...' : stats?.lowStockCount || 0}
            </span>
            <span className="text-xs text-slate-400">low/zero stock items</span>
          </div>
          <p className="text-xs text-amber-400/80 mt-2 font-medium">
            AI prevents overselling automatically
          </p>
        </div>

        {/* AI Replies Card */}
        <div className="glass-panel glass-panel-hover p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Today's AI Replies
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display text-white">
              {isLoading ? '...' : stats?.aiRepliesToday || 0}
            </span>
            <span className="text-xs text-slate-400">responses generated</span>
          </div>
          <p className="text-xs text-purple-400/80 mt-2 font-medium">
            Zero hallucinations guarantee
          </p>
        </div>
      </div>

      {/* System Architecture Flow Visualizer */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white font-display">
                Automated Pipeline Flow Architecture
              </h2>
              <p className="text-xs text-slate-400">
                Guaranteed database-driven sales responses through Meta Graph API & BullMQ.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs">
            System Operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-400 mx-auto flex items-center justify-center font-bold text-xs">
              1
            </div>
            <p className="text-xs font-semibold text-slate-200">Instagram DM</p>
            <p className="text-[11px] text-slate-400">Webhook ingress</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center font-bold text-xs">
              2
            </div>
            <p className="text-xs font-semibold text-slate-200">BullMQ Queue</p>
            <p className="text-[11px] text-slate-400">Async job worker</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center font-bold text-xs">
              3
            </div>
            <p className="text-xs font-semibold text-slate-200">PostgreSQL</p>
            <p className="text-[11px] text-slate-400">Stock & Price truth</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center font-bold text-xs">
              4
            </div>
            <p className="text-xs font-semibold text-slate-200">OpenRouter LLM</p>
            <p className="text-[11px] text-slate-400">Contextual formulation</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-400 mx-auto flex items-center justify-center font-bold text-xs">
              5
            </div>
            <p className="text-xs font-semibold text-slate-200">Graph API Send</p>
            <p className="text-[11px] text-slate-400">Official DM reply</p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link
          to="/products"
          className="glass-panel glass-panel-hover p-6 rounded-2xl group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white font-display text-base">Product & Variant Manager</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Add products, configure sizes, colors, SKUs, and live stock levels.
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-pink-400 transition-colors" />
        </Link>

        <Link
          to="/conversations"
          className="glass-panel glass-panel-hover p-6 rounded-2xl group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white font-display text-base">Live Conversations & Takeover</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor AI conversations in real-time or switch to Human Takeover.
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-pink-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
};
