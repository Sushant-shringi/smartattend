package edu.smartattend.student.sync

import android.content.Context
import androidx.work.*
import edu.smartattend.student.data.local.AppDatabase
import edu.smartattend.student.data.repository.AttendanceRepository
import edu.smartattend.student.data.repository.AuthRepository
import java.util.concurrent.TimeUnit

class AttendanceSyncWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val db = AppDatabase.getDatabase(applicationContext)
        val authRepo = AuthRepository(db.userDao(), db.classDao(), db.timetableDao())
        val attendanceRepo = AttendanceRepository(db.attendanceDao())

        val user = authRepo.getCachedUser() ?: return Result.failure()

        return try {
            attendanceRepo.retryFailedRecords()
            val syncResult = attendanceRepo.syncPendingRecords(user.authToken)
            if (syncResult.isSuccess) {
                Result.success()
            } else {
                if (runAttemptCount < 3) Result.retry() else Result.failure()
            }
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }

    companion object {
        private const val SYNC_WORK_NAME = "SmartAttendAttendanceSync"

        fun schedulePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val periodicRequest = PeriodicWorkRequestBuilder<AttendanceSyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                SYNC_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                periodicRequest
            )
        }

        fun triggerImmediateSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val oneTimeRequest = OneTimeWorkRequestBuilder<AttendanceSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                "ImmediateSyncWork",
                ExistingWorkPolicy.REPLACE,
                oneTimeRequest
            )
        }
    }
}
