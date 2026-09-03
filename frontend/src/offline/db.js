import Dexie from 'dexie';

export const db = new Dexie('SmartAttendDB');

db.version(1).stores({
  attendance_queue: 'id, session_id, student_id, sync_status, marked_at, retry_count',
  cached_sessions: 'id, ble_identifier, status, expiry_time',
  cached_timetable: 'id, day_of_week, start_time',
  cached_profile: 'id, user_id, student_id'
});

export const saveOfflineAttendance = async (attendanceData) => {
  const record = {
    id: attendanceData.attendance_id || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
    session_id: attendanceData.session_id,
    student_id: attendanceData.student_id,
    subject_id: attendanceData.subject_id,
    classroom_id: attendanceData.classroom_id,
    subject_name: attendanceData.subject_name,
    classroom_name: attendanceData.classroom_name,
    session_token: attendanceData.session_token,
    ble_rssi: attendanceData.ble_rssi || -65,
    device_id: attendanceData.device_id || 'web-client',
    marked_at: attendanceData.marked_at || new Date().toISOString(),
    verification_source: attendanceData.verification_source || 'BLE',
    status: attendanceData.status || 'PRESENT',
    sync_status: 'PENDING_SYNC',
    retry_count: 0,
    last_error: null,
    created_at: new Date().toISOString()
  };

  await db.attendance_queue.put(record);
  return record;
};

export const getPendingAttendanceQueue = async () => {
  return await db.attendance_queue.where('sync_status').equals('PENDING_SYNC').toArray();
};

export const getAllLocalAttendance = async () => {
  return await db.attendance_queue.orderBy('marked_at').reverse().toArray();
};

export const updateRecordSyncStatus = async (id, status, errorMsg = null) => {
  await db.attendance_queue.update(id, {
    sync_status: status,
    last_error: errorMsg,
    synced_at: status === 'SYNCED' ? new Date().toISOString() : null
  });
};
