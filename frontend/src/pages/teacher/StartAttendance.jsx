import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService } from '../../services/attendanceService';
import { adminService } from '../../services/adminService';
import { useConnectivity } from '../../context/ConnectivityContext';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import {
  Radio,
  Clock,
  Building2,
  BookOpen,
  StopCircle,
  Bluetooth,
  Sliders,
  CheckCircle2,
  Shield,
  Key,
  Eye,
  EyeOff,
  Copy,
  ArrowRight
} from 'lucide-react';

export const StartAttendance = () => {
  const [activeSession, setActiveSession] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [formData, setFormData] = useState({
    subject_id: '',
    classroom_id: '',
    semester_id: '',
    section_id: '',
    duration_minutes: 50,
    late_threshold_minutes: 5,
    rssi_threshold: -85
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopOpen, setIsStopOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [showToken, setShowToken] = useState(false);

  const { registerActiveSessionBeacon } = useConnectivity();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchSessionAndOptions = async () => {
    try {
      const [active, teacherClasses, crList] = await Promise.all([
        attendanceService.getActiveTeacherSession(),
        attendanceService.getTeacherClasses(),
        adminService.getClassrooms()
      ]);

      setClassrooms(crList);
      setSubjects(teacherClasses);

      if (teacherClasses.length > 0 && !formData.subject_id) {
        setFormData(prev => ({
          ...prev,
          subject_id: teacherClasses[0].subject_id,
          semester_id: teacherClasses[0].timetables[0]?.semester_id || '',
          section_id: teacherClasses[0].timetables[0]?.section_id || '',
          classroom_id: teacherClasses[0].timetables[0]?.classroom_id || crList[0]?.id || ''
        }));
      }

      if (active) {
        setActiveSession(active);
        registerActiveSessionBeacon(active.ble_identifier, active.classroom?.name || 'Classroom');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndOptions();
  }, []);

  // Active Session Timer
  useEffect(() => {
    if (!activeSession?.expiry_time) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(activeSession.expiry_time).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Session Expired');
        clearInterval(interval);
      } else {
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleSubjectSelect = (subId) => {
    const selected = subjects.find(s => s.subject_id === subId);
    if (selected && selected.timetables.length > 0) {
      const tt = selected.timetables[0];
      setFormData(prev => ({
        ...prev,
        subject_id: subId,
        semester_id: tt.semester_id,
        section_id: tt.section_id,
        classroom_id: tt.classroom_id || prev.classroom_id
      }));
    } else {
      setFormData(prev => ({ ...prev, subject_id: subId }));
    }
  };

  const handleStartAttendance = async (e) => {
    e.preventDefault();
    if (!formData.subject_id || !formData.classroom_id) {
      showToast('Please select subject and classroom', 'warning');
      return;
    }

    setIsStarting(true);
    try {
      const session = await attendanceService.startSession(formData);
      setActiveSession(session);
      registerActiveSessionBeacon(session.ble_identifier, session.classroom?.name || 'Classroom');
      showToast('BLE Attendance session started successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to start attendance session', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopAttendance = async () => {
    if (!activeSession) return;
    try {
      await attendanceService.stopSession(activeSession.id);
      setActiveSession(null);
      setIsStopOpen(false);
      showToast('Attendance session stopped', 'info');
      fetchSessionAndOptions();
    } catch (err) {
      showToast('Failed to stop session', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Smart Attendance Broadcast
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Initiate Bluetooth Low Energy proximity attendance with cryptographic session tokens
        </p>
      </div>

      {activeSession ? (
        /* ACTIVE SESSION LIVE CONTROLS */
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Session Header Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wide">
                  BLE SESSION ACTIVE
                </span>
                <h2 className="text-xl font-bold text-slate-100 mt-1">
                  {activeSession.subject?.name}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeSession.classroom?.name} ({activeSession.classroom?.building})
                </p>
              </div>
            </div>

            {/* Countdown Badge */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-5 py-3 text-center sm:text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Remaining Time</p>
              <h3 className="text-2xl font-mono font-extrabold text-teal-400 mt-0.5">{timeLeft || '50:00'}</h3>
            </div>
          </div>

          {/* BLE Payload Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                <Bluetooth className="w-4 h-4" />
                <span>BLE Beacon Broadcast Payload</span>
              </div>
              <p className="font-mono text-sm text-slate-200 font-bold break-all">{activeSession.ble_identifier}</p>
              <p className="text-[10px] text-slate-400 mt-1">Nearby student devices scan and match this beacon identifier.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-teal-400">
                <span className="flex items-center gap-1.5"><Key className="w-4 h-4" /> Raw Session Token</span>
                {activeSession.raw_session_token && (
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <p className="font-mono text-xs text-slate-300 truncate">
                {showToken ? (activeSession.raw_session_token || 'Encrypted on Server') : '••••••••••••••••••••••••••••••••'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Stored as SHA-256 hash in DB. Never stored in raw format.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => setIsStopOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 transition-all"
            >
              <StopCircle className="w-4 h-4" />
              Stop Attendance
            </button>

            <button
              onClick={() => navigate('/teacher/live-attendance')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/25 hover:from-teal-400 hover:to-emerald-400 transition-all"
            >
              <span>View Live Attendance Monitor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* START SESSION FORM */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Configure Attendance Session
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select your assigned course subject, classroom hall, and proximity validation rules
              </p>
            </div>
          </div>

          <form onSubmit={handleStartAttendance} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Course Subject
                </label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => handleSubjectSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
                >
                  {subjects.map((s) => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.subject_code}: {s.subject_name} (Sem {s.semester_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Classroom / Hall
                </label>
                <select
                  value={formData.classroom_id}
                  onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
                >
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.building}) • BLE: {c.ble_identifier}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Session Duration
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500 font-mono"
                  />
                  <span className="text-xs text-slate-500 font-medium">mins</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Late Window Threshold
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.late_threshold_minutes}
                    onChange={(e) => setFormData({ ...formData, late_threshold_minutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500 font-mono"
                  />
                  <span className="text-xs text-slate-500 font-medium">mins</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  BLE RSSI Cutoff
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="-95"
                    max="-40"
                    value={formData.rssi_threshold}
                    onChange={(e) => setFormData({ ...formData, rssi_threshold: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500 font-mono"
                  />
                  <span className="text-xs text-slate-500 font-medium">dBm</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isStarting}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-lg shadow-teal-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>{isStarting ? 'Broadcasting BLE Session...' : 'START ATTENDANCE SESSION'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Stop Session Confirm Dialog */}
      <ConfirmDialog
        isOpen={isStopOpen}
        onClose={() => setIsStopOpen(false)}
        onConfirm={handleStopAttendance}
        title="Stop Attendance Session"
        message="Are you sure you want to end this attendance session? Students will no longer be able to mark attendance."
        confirmText="Stop Session"
        isDangerous={true}
      />
    </div>
  );
};
