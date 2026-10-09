import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  ShoppingBag,
  Settings,
  Sparkles,
  Bot,
} from 'lucide-react';
import { InstagramIcon } from '../common/InstagramIcon';
import clsx from 'clsx';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'Conversations', path: '/conversations', icon: MessageSquare },
  { name: 'Orders & Approvals', path: '/orders', icon: ShoppingBag },
  { name: 'Instagram', path: '/instagram', icon: InstagramIcon },
  { name: 'AI Settings', path: '/settings/ai', icon: Settings },
];


export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-900/80 border-r border-slate-800/80 flex flex-col backdrop-blur-xl shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20 text-white font-bold text-lg">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            InstaSales <span className="text-xs px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 font-mono font-medium border border-pink-500/30">AI</span>
          </h1>
          <p className="text-xs text-slate-400">Sales Automation</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Core Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/10 text-pink-400 border border-pink-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Live AI Status Widget */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate flex items-center gap-1">
              AI Engine Ready <Sparkles className="w-3 h-3 text-pink-400" />
            </p>
            <p className="text-[11px] text-slate-400 font-mono">OpenRouter Llama-3.3</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
