import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 px-6 bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-xl flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Production Backend Connected
        </span>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30 font-medium text-xs">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-200">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-pink-400" /> {user?.role || 'ADMIN'}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-150"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
