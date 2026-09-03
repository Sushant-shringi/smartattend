import React from 'react';
import { useConnectivity } from '../../context/ConnectivityContext';
import { Bluetooth, Radio, Sliders, X, Wifi, AlertTriangle, ShieldCheck } from 'lucide-react';

export const BleSimulatorDrawer = ({ isOpen, onClose }) => {
  const {
    isBleDemoMode,
    simulatedRssi,
    updateSimulatedRssi,
    discoveredBeacons,
    isBleScanning,
    startBleScan,
    stopBleScan
  } = useConnectivity();

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm bg-slate-900 text-white rounded-3xl border border-slate-700 shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Bluetooth className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">BLE Proximity Simulator</h4>
            <p className="text-[10px] text-amber-400 font-semibold uppercase">BLE Demo Mode Active</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Signal Strength (RSSI) Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300">Classroom Beacon RSSI</span>
            <span className="font-mono text-teal-400 text-sm font-bold">{simulatedRssi} dBm</span>
          </div>
          <input
            type="range"
            min="-95"
            max="-30"
            step="1"
            value={simulatedRssi}
            onChange={(e) => updateSimulatedRssi(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-95 dBm (Too Far / Weak)</span>
            <span className="text-amber-400 font-bold">Cutoff: -85 dBm</span>
            <span>-30 dBm (Beside Teacher)</span>
          </div>
        </div>

        {/* Proximity Status Card */}
        <div className={`p-3 rounded-2xl border text-xs ${
          simulatedRssi >= -85
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
        }`}>
          <div className="flex items-center gap-2 font-bold mb-1">
            {simulatedRssi >= -85 ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Proximity Verified (In Classroom)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Out of Range (&lt; -85 dBm)</span>
              </>
            )}
          </div>
          <p className="text-[11px] opacity-80">
            {simulatedRssi >= -85
              ? 'Signal is strong enough. Student attendance will be accepted.'
              : 'Signal is below minimum threshold. Attendance will be rejected with weak BLE signal warning.'}
          </p>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <button
            onClick={() => updateSimulatedRssi(-45)}
            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 font-medium transition-colors"
          >
            Front Row (-45)
          </button>
          <button
            onClick={() => updateSimulatedRssi(-70)}
            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 font-medium transition-colors"
          >
            Middle (-70)
          </button>
          <button
            onClick={() => updateSimulatedRssi(-92)}
            className="py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-xl text-rose-300 font-medium transition-colors"
          >
            Outside Hall (-92)
          </button>
        </div>

        {/* Discovered Beacons List */}
        <div className="space-y-1 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
            <span>Discovered Beacons ({discoveredBeacons.length})</span>
            <button
              onClick={isBleScanning ? stopBleScan : startBleScan}
              className="text-teal-400 hover:underline font-bold"
            >
              {isBleScanning ? 'Stop Scan' : 'Start Scan'}
            </button>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
            {discoveredBeacons.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[11px]">
                <div>
                  <p className="font-bold text-slate-200">{b.name}</p>
                  <p className="font-mono text-[9px] text-slate-500">{b.id}</p>
                </div>
                <div className="text-right font-mono">
                  <span className={`font-bold ${b.rssi >= -85 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {b.rssi} dBm
                  </span>
                  <p className="text-[9px] text-slate-400">~{b.distanceMeters}m</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
