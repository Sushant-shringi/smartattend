package edu.smartattend.student

import android.app.Application
import edu.smartattend.student.sync.AttendanceSyncWorker

class SmartAttendStudentApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Register periodic background synchronization worker with CONNECTED network constraints
        AttendanceSyncWorker.schedulePeriodicSync(this)
    }
}
