package edu.smartattend.teacher.notification

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import edu.smartattend.teacher.ui.MainActivity

object TeacherNotificationHelper {

    const val CHANNEL_ID = "smartattend_teacher_channel"
    private const val CHANNEL_NAME = "SmartAttend Faculty Alerts"
    private const val CHANNEL_DESC = "Notifications for student attendance verification and session state"

    private val notifiedAttendanceRecords = mutableSetOf<String>()

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = CHANNEL_DESC
                enableVibration(true)
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun hasPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    fun notifyNewAttendee(
        context: Context,
        studentName: String,
        rollNumber: String,
        subjectName: String,
        status: String,
        rssi: Int?,
        recordUniqueKey: String
    ) {
        if (!hasPermission(context)) return

        // Duplicate prevention: do not re-notify for the same student record
        if (notifiedAttendanceRecords.contains(recordUniqueKey)) return
        notifiedAttendanceRecords.add(recordUniqueKey)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            recordUniqueKey.hashCode(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val signalText = if (rssi != null) " (BLE RSSI: $rssi dBm)" else ""
        val title = "Attendance Marked • $status"
        val message = "$studentName ($rollNumber) verified $status in $subjectName$signalText"

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_upload_done)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(recordUniqueKey.hashCode(), notification)
        } catch (e: SecurityException) {
            // Permission not granted
        }
    }

    fun clearNotifiedCache() {
        notifiedAttendanceRecords.clear()
    }
}
