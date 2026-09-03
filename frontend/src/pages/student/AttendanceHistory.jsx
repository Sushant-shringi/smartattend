import React, { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { getAllLocalAttendance } from '../../offline/db';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useConnectivity } from '../../context/ConnectivityContext';
import { History as HistoryIcon, RefreshCw, Smartphone, Bluetooth } from 'lucide-react';

export const AttendanceHistory = () => {
  const [history, setHistory] = useState([]);
  const [localQueue, setLocalQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline, triggerSync, isSyncing } = useConnectivity();

  const fetchHistory = async () => {
    try {
      const [remote, local] = await Promise.all([
        attendanceService.getAttendanceHistory(50).catch(() => []),
        getAllLocalAttendance()
      ]);
      setHistory(remote);
      setLocalQueue(local);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (isLoading) return <LoadingSkeleton type="table" count={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Attendance Record History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete log of verified attendances, offline storage queue, and sync statuses
          </p>
        </div>

        {localQueue.some(i => i.sync_status === 'PENDING_SYNC') && (
          <button
            onClick={triggerSync}
            disabled={isSyncing || !isOnline}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Pending Records'}</span>
          </button>
        )}
      </div>

      {/* Offline Pending Sync Records Banner if any */}
      {localQueue.filter(i => i.sync_status === 'PENDING_SYNC').length > 0 && (
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400">
            <Smartphone className="w-4 h-4" />
            <span>Locally Saved Attendance in IndexedDB Queue</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            These records were marked while offline. They will automatically upload when network connectivity is established.
          </p>
        </div>
      )}

      {history.length === 0 && localQueue.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No Attendance Records Yet"
          description="Your marked lectures and classes will appear here."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Marked Date & Time</th>
                  <th className="px-6 py-4">Course Subject</th>
                  <th className="px-6 py-4">BLE Signal (RSSI)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-xs">
                {/* 1. Show local pending items first */}
                {localQueue.filter(i => i.sync_status === 'PENDING_SYNC').map((l) => (
                  <tr key={l.id} className="bg-sky-500/5 hover:bg-sky-500/10 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {new Date(l.marked_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                      {l.subject_name || 'Course Lecture'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-teal-600 dark:text-teal-400 font-bold">
                      {l.ble_rssi} dBm
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status="PENDING_SYNC" />
                    </td>
                  </tr>
                ))}

                {/* 2. Show server history items */}
                {history.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                      {new Date(r.marked_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                      {r.session?.subject?.name || 'Course Lecture'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-teal-600 dark:text-teal-400 font-bold">
                      {r.ble_rssi !== null ? `${r.ble_rssi} dBm` : '-'}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={r.sync_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
