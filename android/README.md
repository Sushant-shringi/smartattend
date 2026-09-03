# SmartAttend Android Applications

This folder contains the native Android applications for the SmartAttend Offline-First University Attendance platform:

1. **Student Android App (`student-app/`)**:
   - **Offline-First Storage**: Room database (`AppDatabase`) caching enrolled courses, weekly timetable, and offline login credentials.
   - **BLE Scanner**: Native `BluetoothLeScanner` scanning for teacher beacons (`SMARTATTEND-RMxxx`) with RSSI proximity verification (`RSSI >= -85 dBm`).
   - **Pending Sync Queue**: Local attendance marking with status `PENDING_SYNC`.
   - **WorkManager Auto-Sync**: Background worker (`AttendanceSyncWorker`) triggered automatically on network connectivity (`NetworkType.CONNECTED`) to batch-sync attendance to `POST /api/v1/sync/attendance`.

2. **Teacher Android App (`teacher-app/`)**:
   - **Offline Timetable & Session Cache**: Room database (`TeacherDatabase`) caching assigned subjects, classrooms, and timetable schedules.
   - **BLE Beacon Advertiser**: Native `BluetoothLeAdvertiser` broadcasting classroom beacon identifiers (`SMARTATTEND-RM204`, etc.) and service UUIDs.
   - **Live Attendance Roster**: Displays real-time verified student attendance markings with signal strengths (dBm) and sync statuses.
