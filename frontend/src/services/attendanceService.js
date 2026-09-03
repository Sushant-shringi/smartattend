import { api } from './api';
import { saveOfflineAttendance } from '../offline/db';
import { syncQueue } from '../offline/syncQueue';

export const attendanceService = {
  // Teacher Endpoints
  getTeacherDashboard: async () => {
    const res = await api.get('/teacher/dashboard');
    return res.data;
  },

  getTeacherClasses: async () => {
    const res = await api.get('/teacher/classes');
    return res.data;
  },

  getTeacherSchedule: async () => {
    const res = await api.get('/teacher/schedule');
    return res.data;
  },

  startSession: async (sessionData) => {
    const res = await api.post('/attendance/sessions', sessionData);
    return res.data;
  },

  stopSession: async (sessionId) => {
    const res = await api.post(`/attendance/sessions/${sessionId}/stop`);
    return res.data;
  },

  getActiveTeacherSession: async () => {
    const res = await api.get('/attendance/sessions/active');
    return res.data;
  },

  getLiveAttendance: async (sessionId) => {
    const res = await api.get(`/teacher/live-attendance/${sessionId}`);
    return res.data;
  },

  getTeacherReports: async (params = {}) => {
    const res = await api.get('/teacher/reports', { params });
    return res.data;
  },

  // Student Endpoints & Offline Attendance Marking
  getStudentDashboard: async () => {
    const res = await api.get('/student/dashboard');
    return res.data;
  },

  getStudentTodayClasses: async () => {
    const res = await api.get('/student/today-classes');
    return res.data;
  },

  getStudentSchedule: async () => {
    const res = await api.get('/student/schedule');
    return res.data;
  },

  getStudentNotifications: async () => {
    const res = await api.get('/student/notifications');
    return res.data;
  },

  markNotificationRead: async (id) => {
    const res = await api.post(`/student/notifications/${id}/read`);
    return res.data;
  },

  getAttendanceHistory: async (limit = 50) => {
    const res = await api.get('/attendance/history', { params: { limit } });
    return res.data;
  },

  /**
   * Offline-First Mark Attendance:
   * 1. If online, attempts instant direct backend post.
   * 2. If offline or network error, immediately persists in IndexedDB as PENDING_SYNC.
   */
  markAttendance: async (payload) => {
    const clientAttendanceId = payload.attendance_id || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const fullPayload = {
      ...payload,
      attendance_id: clientAttendanceId,
      marked_at: payload.marked_at || new Date().toISOString()
    };

    if (navigator.onLine) {
      try {
        const res = await api.post('/attendance/mark', fullPayload);
        // Save copy to local indexedDB as SYNCED for offline history view
        await saveOfflineAttendance({
          ...fullPayload,
          status: res.data.status,
          sync_status: 'SYNCED'
        });
        return {
          success: true,
          mode: 'ONLINE',
          record: res.data
        };
      } catch (err) {
        // If server 5xx or connection timeout, fallback to offline storage
        if (!err.response || err.response.status >= 500) {
          console.warn('Network issue during attendance mark, saving to offline queue:', err);
          const saved = await saveOfflineAttendance(fullPayload);
          return {
            success: true,
            mode: 'OFFLINE_SAVED',
            record: saved,
            message: 'Saved offline. Will sync automatically when connection restores.'
          };
        }
        // Genuine validation error (e.g. invalid token, weak BLE RSSI)
        throw err;
      }
    } else {
      // Browser is completely offline
      const saved = await saveOfflineAttendance(fullPayload);
      return {
        success: true,
        mode: 'OFFLINE_SAVED',
        record: saved,
        message: 'Saved offline. Will sync automatically when connection restores.'
      };
    }
  },

  triggerManualSync: async () => {
    return await syncQueue.processQueue();
  }
};
