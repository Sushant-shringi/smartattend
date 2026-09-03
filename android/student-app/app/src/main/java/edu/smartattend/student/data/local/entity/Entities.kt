package edu.smartattend.student.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Stores cached student login credentials & profile for offline authentication.
 */
@Entity(tableName = "user_cache")
data class UserCacheEntity(
    @PrimaryKey val studentId: String,
    val userId: String,
    val username: String,
    val fullName: String,
    val rollNumber: String,
    val email: String,
    val departmentName: String?,
    val semesterNumber: Int?,
    val sectionName: String?,
    val authToken: String,
    val passwordHash: String,
    val lastLoginTimestamp: Long
)

/**
 * Stores student enrolled classes & subjects cached from backend.
 */
@Entity(tableName = "cached_classes")
data class CachedClassEntity(
    @PrimaryKey val subjectId: String,
    val code: String,
    val name: String,
    val credits: Int
)

/**
 * Stores student weekly timetable cached from backend.
 */
@Entity(tableName = "cached_timetable")
data class TimetableEntity(
    @PrimaryKey val id: String,
    val subjectId: String,
    val subjectCode: String,
    val subjectName: String,
    val classroomId: String,
    val classroomName: String,
    val bleIdentifier: String,
    val dayOfWeek: Int,
    val startTime: String,
    val endTime: String
)

/**
 * Stores offline attendance records queued locally on the device (status = PENDING_SYNC).
 */
@Entity(tableName = "pending_attendance")
data class PendingAttendanceEntity(
    @PrimaryKey val attendanceId: String,
    val sessionId: String,
    val subjectId: String,
    val subjectCode: String = "",
    val subjectName: String = "",
    val classroomId: String,
    val classroomName: String = "",
    val sessionToken: String,
    val bleRssi: Int,
    val markedAt: String,
    val syncStatus: String = "PENDING_SYNC",
    val syncRetryCount: Int = 0,
    val lastError: String? = null
)
