import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { attendanceService } from '../../services/attendanceService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import {
  Radio,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  StopCircle,
  RefreshCw,
  Bluetooth,
  ArrowLeft
} from 'lucide-react';

export const LiveAttendance = () => {
  const [liveData, setLiveData] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStopOpen, setIsStopOpen] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchLiveSession = async () => {
    try {
      const active = await attendanceService.getActiveTeacherSession();
      setActiveSession(active);
      if (active) {
        const live = await attendanceService.getLiveAttendance(active.id);
        setLiveData(live);
      } else {
        setLiveData(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveSession();
    // Real-time live polling every 4 seconds while session is active
    const pollInterval = setInterval(() => {
      if (activeSession) {
        attendanceService.getLiveAttendance(activeSession.id)
          .then(setLiveData)
          .catch(console.warn);
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [activeSession?.id]);

  const handleStopSession = async () => {
    if (!activeSession) return;
    try {
      await attendanceService.stopSession(activeSession.id);
      showToast('Attendance session ended', 'info');
      setIsStopOpen(false);
      fetchLiveSession();
    } catch (e) {
      showToast('Failed to stop attendance session', 'error');
    }
  };

  if (isLoading) return <LoadingSkeleton type="table" count={5} />;

  if (!activeSession) {
    return (
      <EmptyState
        icon={Radio}
        title="No Active Attendance Session"
        description="You do not have an active BLE attendance session running right now."
        actionLabel="Start New Session"
        onAction={() => navigate('/teacher/start-attendance')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 uppercase">
                LIVE ROSTER
              </span>
              <span className="font-mono text-xs text-slate-400">{activeSession.ble_identifier}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1">
              {activeSession.subject?.name}
            </h1>
            <p className="text-xs text-slate-400">
              Classroom: {activeSession.classroom?.name} • Semester {activeSession.semester?.number}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsStopOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors"
          >
            <StopCircle className="w-4 h-4" />
            Stop Session
          </button>
        </div>
      </div>

      {/* Live Metrics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Enrolled</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{liveData?.total_enrolled || 0}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Present (On Time)</p>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{liveData?.present_count || 0}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Late Marked</p>
          <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{liveData?.late_count || 0}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Yet to Mark (Absent)</p>
          <h3 className="text-2xl font-bold text-slate-400">{liveData?.absent_count || 0}</h3>
        </div>
      </div>

      {/* Live Students Roster Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            Class Attendance List
          </h3>
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Auto-refreshing live
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Roll Number</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Marked Time</th>
                <th className="px-6 py-4">BLE RSSI</th>
                <th className="px-6 py-4">Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-xs">
              {liveData?.attendance_list?.map((st) => (
                <tr key={st.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                    {st.full_name}
                  </td>
                  <td className="px-6 py-3.5 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {st.roll_number}
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={st.status} />
                  </td>
                  <td className="px-6 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                    {st.marked_at ? new Date(st.marked_at).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-6 py-3.5 font-mono">
                    {st.ble_rssi !== null && st.ble_rssi !== undefined ? (
                      <span className={st.ble_rssi >= -85 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                        {st.ble_rssi} dBm
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {st.sync_status ? <StatusBadge status={st.sync_status} /> : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isStopOpen}
        onClose={() => setIsStopOpen(false)}
        onConfirm={handleStopSession}
        title="Stop Active Session"
        message="Are you sure you want to stop this live attendance session?"
        confirmText="Stop Session"
        isDangerous={true}
      />
    </div>
  );
};
