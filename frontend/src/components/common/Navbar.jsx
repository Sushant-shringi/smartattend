import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConnectivity } from '../../context/ConnectivityContext';
import {
  Menu,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  RefreshCw,
  Bluetooth,
  Sliders,
  Bell,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const Navbar = ({ onToggleSidebar, onToggleSimulator }) => {
  const { user, theme, toggleTheme } = useAuth();
  const {
    isOnline,
    isSyncing,
    pendingCount,
    triggerSync,
    isBleDemoMode,
    simulatedRssi
  } = useConnectivity();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between">
      {/* Left section: Sidebar toggle for mobile & Page context */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
            {user?.role} PORTAL
          </span>
        </div>
      </div>

      {/* Right section: System Status & Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* BLE Simulator Controller Toggle */}
        <button
          onClick={onToggleSimulator}
          title="Toggle BLE Simulator & Signal strength controls"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isBleDemoMode
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30'
          }`}
        >
          <Bluetooth className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{isBleDemoMode ? 'BLE Demo Mode' : 'Web BLE'}</span>
          <span className="font-mono text-[11px] opacity-80">{simulatedRssi}dBm</span>
          <Sliders className="w-3 h-3 ml-1" />
        </button>

        {/* Sync Status Badge */}
        {pendingCount > 0 && (
          <button
            onClick={triggerSync}
            disabled={isSyncing || !isOnline}
            title={isOnline ? 'Click to sync offline attendance records now' : 'Offline: Will sync when connection returns'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : `${pendingCount} Pending Sync`}</span>
          </button>
        )}

        {/* Online / Offline Connection Status */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
          }`}
        >
          {isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline font-medium">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="font-medium">Offline Mode</span>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Light / Dark mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
              {user?.full_name}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              @{user?.username}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
