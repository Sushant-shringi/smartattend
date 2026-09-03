import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../common/Sidebar';
import { Navbar } from '../common/Navbar';
import { BleSimulatorDrawer } from '../common/BleSimulatorDrawer';
import { useConnectivity } from '../../context/ConnectivityContext';
import { WifiOff, RefreshCw } from 'lucide-react';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const { isOnline, pendingCount, isSyncing, triggerSync } = useConnectivity();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Persistent Offline Banner */}
      {!isOnline && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-slate-950 text-xs font-bold py-2 px-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>OFFLINE MODE: Attendance is stored locally in IndexedDB and will auto-sync when connection returns.</span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-amber-950 text-amber-200 px-2.5 py-0.5 rounded-full text-[10px]">
              {pendingCount} record{pendingCount > 1 ? 's' : ''} queued
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          <Navbar
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            onToggleSimulator={() => setSimulatorOpen(prev => !prev)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Floating BLE Simulator Control Drawer */}
      <BleSimulatorDrawer isOpen={simulatorOpen} onClose={() => setSimulatorOpen(false)} />
    </div>
  );
};
