import { getPendingAttendanceQueue, updateRecordSyncStatus, db } from './db';
import axios from 'axios';

class SyncQueueManager {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = new Set();
    this.autoSyncTimer = null;
    this.baseURL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname ? `http://${window.location.hostname}:8000/api/v1` : 'http://192.168.1.8:8000/api/v1');

    // Auto-listen to window online events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SyncQueue] Network restored. Triggering automatic background sync...');
        this.processQueue();
      });
    }
  }

  setBaseURL(url) {
    this.baseURL = url;
  }

  subscribe(callback) {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  notify(event) {
    this.syncListeners.forEach(cb => {
      try { cb(event); } catch (e) { console.error(e); }
    });
  }

  startPeriodicSync(intervalMs = 15000) {
    if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
    this.autoSyncTimer = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.processQueue();
      }
    }, intervalMs);
  }

  stopPeriodicSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  async processQueue() {
    if (!navigator.onLine || this.isSyncing) return;

    const token = localStorage.getItem('smartattend_token');
    if (!token) return;

    const pending = await getPendingAttendanceQueue();
    if (!pending || pending.length === 0) {
      this.notify({ type: 'IDLE', pendingCount: 0 });
      return;
    }

    this.isSyncing = true;
    this.notify({ type: 'SYNCING', pendingCount: pending.length });

    try {
      const itemsPayload = pending.map(item => ({
        attendance_id: item.id,
        session_id: item.session_id,
        subject_id: item.subject_id,
        classroom_id: item.classroom_id,
        session_token: item.session_token,
        ble_rssi: item.ble_rssi,
        device_id: item.device_id,
        marked_at: item.marked_at,
        verification_source: item.verification_source || 'BLE'
      }));

      const response = await axios.post(`${this.baseURL}/sync/attendance`, {
        items: itemsPayload
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      if (data && data.results) {
        for (const res of data.results) {
          if (res.status === 'SYNCED') {
            await updateRecordSyncStatus(res.attendance_id, 'SYNCED');
          } else {
            await updateRecordSyncStatus(res.attendance_id, 'SYNC_FAILED', res.message);
          }
        }
      }

      this.notify({
        type: 'SUCCESS',
        processed: data.total_processed,
        successCount: data.success_count,
        failureCount: data.failure_count
      });

    } catch (err) {
      console.error('[SyncQueue] Sync batch request failed:', err);
      // Increment retry counts with exponential backoff logic
      for (const item of pending) {
        await db.attendance_queue.update(item.id, {
          retry_count: (item.retry_count || 0) + 1,
          last_error: err.response?.data?.detail || err.message
        });
      }

      this.notify({
        type: 'ERROR',
        error: err.response?.data?.detail || err.message,
        pendingCount: pending.length
      });
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncQueue = new SyncQueueManager();
