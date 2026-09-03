import React from 'react';
import { Bluetooth, Radio, Wifi, WifiOff } from 'lucide-react';

export const BleRadar = ({
  isScanning = false,
  rssi = -65,
  beaconName = 'Classroom Beacon',
  beaconId = 'SMARTATTEND-RM204',
  rssiThreshold = -85,
  isDemoMode = false
}) => {
  // Signal strength percentage (from -95 dBm = 0% to -30 dBm = 100%)
  const signalPct = Math.max(0, Math.min(100, Math.round(((rssi - (-95)) / (-30 - (-95))) * 100)));
  const isSignalValid = rssi >= rssiThreshold;

  const getSignalQuality = () => {
    if (rssi >= -60) return { label: 'Excellent Signal', color: 'text-emerald-500', bg: 'bg-emerald-500' };
    if (rssi >= -75) return { label: 'Good Signal', color: 'text-teal-500', bg: 'bg-teal-500' };
    if (rssi >= -85) return { label: 'Fair Signal (In Range)', color: 'text-amber-500', bg: 'bg-amber-500' };
    return { label: 'Weak Signal (Out of Range)', color: 'text-rose-500', bg: 'bg-rose-500' };
  };

  const quality = getSignalQuality();

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden border border-slate-800 shadow-xl">
      {/* Background Radar Waves */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className={`w-72 h-72 rounded-full border border-teal-400 ${isScanning ? 'animate-radar' : ''}`} />
        <div className={`w-52 h-52 rounded-full border border-teal-400/60 ${isScanning ? 'animate-radar [animation-delay:0.6s]' : ''}`} />
        <div className={`w-32 h-32 rounded-full border border-teal-400/40 ${isScanning ? 'animate-radar [animation-delay:1.2s]' : ''}`} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* BLE Header & Demo Mode Tag */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isScanning ? 'text-teal-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isScanning ? 'Scanning for BLE Beacon' : 'BLE Proximity Radar'}
            </span>
          </div>
          {isDemoMode && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              BLE Demo Mode
            </span>
          )}
        </div>

        {/* Central Pulse Icon */}
        <div className="relative my-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isSignalValid ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}>
            <Bluetooth className="w-9 h-9 animate-bounce" />
          </div>
          {isScanning && (
            <div className="absolute -inset-2 rounded-full border-2 border-teal-400/30 animate-ping" />
          )}
        </div>

        {/* Beacon Details */}
        <h4 className="text-lg font-bold text-slate-100">{beaconName}</h4>
        <p className="text-xs font-mono text-slate-400 mt-0.5">{beaconId}</p>

        {/* RSSI Signal Gauge Bar */}
        <div className="w-full max-w-xs mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className={quality.color}>{quality.label}</span>
            <span className="font-mono text-slate-300">{rssi} dBm</span>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ${quality.bg}`}
              style={{ width: `${signalPct}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-95 dBm (Limit)</span>
            <span>Threshold: {rssiThreshold} dBm</span>
            <span>-30 dBm (Max)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
