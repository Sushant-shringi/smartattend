import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncQueue } from '../offline/syncQueue';
import { getPendingAttendanceQueue } from '../offline/db';
import { bleService } from '../offline/bleService';

const ConnectivityContext = createContext(null);

export const ConnectivityProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // BLE state
  const [isBleScanning, setIsBleScanning] = useState(false);
  const [discoveredBeacons, setDiscoveredBeacons] = useState([]);
  const [isBleDemoMode, setIsBleDemoMode] = useState(bleService.isDemoMode);
  const [simulatedRssi, setSimulatedRssi] = useState(-58);

  const refreshPendingCount = async () => {
    try {
      const items = await getPendingAttendanceQueue();
      setPendingCount(items.length);
    } catch (e) {
      console.warn('Error reading pending queue:', e);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshPendingCount();
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to syncQueue events
    const unsubSync = syncQueue.subscribe((event) => {
      if (event.type === 'SYNCING') {
        setIsSyncing(true);
      } else if (event.type === 'SUCCESS' || event.type === 'ERROR' || event.type === 'IDLE') {
        setIsSyncing(false);
        setLastSyncResult(event);
        refreshPendingCount();
      }
    });

    // Start background sync polling every 15s
    syncQueue.startPeriodicSync(15000);
    refreshPendingCount();

    // Subscribe to BLE beacons
    const unsubBle = bleService.subscribe((beacons) => {
      setDiscoveredBeacons(beacons);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubSync();
      unsubBle();
      syncQueue.stopPeriodicSync();
    };
  }, []);

  const triggerSync = async () => {
    setIsSyncing(true);
    await syncQueue.processQueue();
    await refreshPendingCount();
  };

  const startBleScan = async () => {
    setIsBleScanning(true);
    await bleService.startScanning();
  };

  const stopBleScan = () => {
    bleService.stopScanning();
    setIsBleScanning(false);
  };

  const updateSimulatedRssi = (val) => {
    setSimulatedRssi(val);
    bleService.setSimulatedRssi(val);
  };

  return (
    <ConnectivityContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        lastSyncResult,
        triggerSync,
        refreshPendingCount,
        // BLE
        isBleScanning,
        discoveredBeacons,
        isBleDemoMode,
        simulatedRssi,
        startBleScan,
        stopBleScan,
        updateSimulatedRssi,
        registerActiveSessionBeacon: (id, name) => bleService.registerActiveSessionBeacon(id, name)
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
};

export const useConnectivity = () => {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error('useConnectivity must be used within ConnectivityProvider');
  }
  return context;
};
