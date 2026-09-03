import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService } from '../../services/attendanceService';
import { useConnectivity } from '../../context/ConnectivityContext';
import { BleRadar } from '../../components/common/BleRadar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useToast } from '../../components/common/Toast';
import confetti from 'canvas-confetti';
import {
  Radio,
  Bluetooth,
  CheckCircle2,
  AlertTriangle,
  Building2,
  BookOpen,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

export const MarkAttendance = () => {
  const [todayClasses, setTodayClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState(null);

  const {
    isOnline,
    isBleScanning,
    startBleScan,
    discoveredBeacons,
    isBleDemoMode,
    simulatedRssi,
    refreshPendingCount
  } = useConnectivity();

  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchActiveClasses = async () => {
    try {
      const classes = await attendanceService.getStudentTodayClasses();
      setTodayClasses(classes);

      // Find active class session if any
      const active = classes.find(c => c.is_session_active && !c.already_marked);
      if (active) {
        setSelectedClass(active);
      } else if (classes.length > 0) {
        setSelectedClass(classes[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveClasses();
    startBleScan();

    // Teacher and student are separate browser sessions. Poll the API so the
    // student panel notices a newly-started attendance session automatically.
    const poll = setInterval(fetchActiveClasses, 2000);
    return () => clearInterval(poll);
  }, []);

  // Compute matched beacon for the selected classroom
  const targetBeaconId = selectedClass?.ble_identifier || 'SMARTATTEND-RM204';
  const matchedBeacon = discoveredBeacons.find(b => b.id.includes(selectedClass?.classroom_name?.replace(' ', '') || '204'))
    || discoveredBeacons[0]
    || { id: targetBeaconId, rssi: simulatedRssi, distanceMeters: 1.5 };

  const currentRssi = matchedBeacon.rssi;
  const isSignalSufficient = currentRssi >= -85;

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleMarkAttendance = async () => {
    if (!selectedClass?.is_session_active) {
      showToast('No active attendance session for this class.', 'warning');
      return;
    }

    if (!isSignalSufficient) {
      showToast(`BLE signal too weak (${currentRssi} dBm). You are too far from the teacher.`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        session_id: selectedClass.active_session_id,
        subject_id: selectedClass.subject_id,
        classroom_id: selectedClass.active_session_classroom_id || selectedClass.classroom_id,
        subject_name: selectedClass.subject_name,
        classroom_name: selectedClass.active_session_classroom_name || selectedClass.classroom_name,
        session_token: selectedClass.active_session_token || 'valid-ble-proximity-token',
        ble_rssi: currentRssi,
        device_id: navigator.userAgent.slice(0, 50),
        verification_source: 'BLE'
      };

      const result = await attendanceService.markAttendance(payload);
      setAttendanceResult(result);
      triggerCelebration();

      if (result.mode === 'OFFLINE_SAVED') {
        showToast('✓ Attendance saved locally in Offline Mode!', 'success');
      } else {
        showToast('✓ Attendance successfully recorded and verified!', 'success');
      }

      await refreshPendingCount();
      fetchActiveClasses();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to record attendance';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSkeleton type="cards" count={3} />;

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 mb-2">
          <Bluetooth className="w-3.5 h-3.5 animate-pulse" /> Proximity Smart Attendance
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          Mark Class Presence
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Attendance works seamlessly offline and online via BLE beacon verification
        </p>
      </div>

      {/* Class Selection Pill Bar */}
      {todayClasses.length > 0 && (
        <div className="flex items-center justify-center gap-2 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          {todayClasses.map((c) => (
            <button
              key={c.timetable_id}
              onClick={() => {
                setSelectedClass(c);
                setAttendanceResult(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedClass?.timetable_id === c.timetable_id
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{c.subject_code}</span>
              {c.already_marked ? (
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded">✓</span>
              ) : c.is_session_active ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              ) : null}
            </button>
          ))}
        </div>
      )}

      {/* SUCCESS CARD (When marked) */}
      {attendanceResult ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase">
              {attendanceResult.record?.status || 'PRESENT'}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
              Attendance Marked Successfully!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {selectedClass?.subject_name} • {selectedClass?.classroom_name}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 max-w-sm mx-auto space-y-2 text-xs text-left">
            <div className="flex justify-between">
              <span className="text-slate-400">Marked Time:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">BLE Proximity RSSI:</span>
              <span className="font-mono font-bold text-emerald-500">
                {currentRssi} dBm (Verified)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Sync Status:</span>
              <StatusBadge status={attendanceResult.mode === 'OFFLINE_SAVED' ? 'PENDING_SYNC' : 'SYNCED'} />
            </div>
          </div>

          {attendanceResult.mode === 'OFFLINE_SAVED' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-500 text-center font-medium">
              Saved in local IndexedDB. Will automatically sync to university servers when connection returns.
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/student/history')}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-colors"
            >
              View Attendance History
            </button>
            <button
              onClick={() => {
                setAttendanceResult(null);
                fetchActiveClasses();
              }}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : selectedClass?.already_marked ? (
        /* ALREADY MARKED CARD */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Attendance Already Marked
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You have already registered your attendance for {selectedClass?.subject_name}. Duplicate markings are prevented.
          </p>
          <div className="pt-2">
            <StatusBadge status={selectedClass?.marked_status || 'PRESENT'} />
          </div>
        </div>
      ) : (
        /* ACTIVE BLE SCANNING & MARK ATTENDANCE INTERFACE */
        <div className="space-y-6">
          {/* Class Summary Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                  {selectedClass?.subject_code}
                </span>
                {selectedClass?.is_session_active ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500 text-slate-950 animate-pulse">
                    ACTIVE NOW
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400">
                    Session Not Active
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {selectedClass?.subject_name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instructor: {selectedClass?.teacher_name} • {selectedClass?.classroom_name}
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between text-xs">
              <span className="text-slate-400">Schedule</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {selectedClass?.start_time} - {selectedClass?.end_time}
              </span>
            </div>
          </div>

          {/* BLE Radar Visualization Component */}
          <BleRadar
            isScanning={isBleScanning}
            rssi={currentRssi}
            beaconName={selectedClass?.classroom_name || 'Classroom Hall 204'}
            beaconId={targetBeaconId}
            rssiThreshold={-85}
            isDemoMode={isBleDemoMode}
          />

          {/* Online / Offline Sync Capability Indicator */}
          <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Internet Online (Instant Sync)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-amber-500">Offline Mode Active (Will save to IndexedDB)</span>
                </>
              )}
            </div>

            <span className="text-[11px] text-slate-400">
              Zero internet required
            </span>
          </div>

          {/* BIG MARK ATTENDANCE BUTTON */}
          <button
            onClick={handleMarkAttendance}
            disabled={isSubmitting || !selectedClass?.is_session_active || !isSignalSufficient}
            className={`w-full py-5 rounded-3xl font-extrabold text-base tracking-wide text-white shadow-2xl transition-all transform active:scale-98 flex items-center justify-center gap-3 ${
              selectedClass?.is_session_active && isSignalSufficient
                ? 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-500/30'
                : 'bg-slate-700 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Recording Proximity Attendance...</span>
              </div>
            ) : !selectedClass?.is_session_active ? (
              <span>Teacher Has Not Started Session</span>
            ) : !isSignalSufficient ? (
              <span>Out of Range (Move Closer to Teacher)</span>
            ) : (
              <>
                <Radio className="w-6 h-6 animate-pulse" />
                <span>MARK ATTENDANCE NOW</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
