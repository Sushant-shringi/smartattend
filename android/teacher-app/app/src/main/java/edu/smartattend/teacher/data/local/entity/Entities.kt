package edu.smartattend.teacher.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "teacher_cache")
data class TeacherCacheEntity(
    @PrimaryKey val teacherId: String,
    val userId: String,
    val username: String,
    val fullName: String,
    val employeeId: String,
    val designation: String?,
    val departmentName: String?,
    val authToken: String,
    val passwordHash: String,
    val lastLoginTimestamp: Long
)

@Entity(tableName = "teacher_assigned_classes")
data class TeacherClassEntity(
    @PrimaryKey val id: String, // Timetable ID
    val subjectId: String,
    val subjectCode: String,
    val subjectName: String,
    val classroomId: String,
    val classroomName: String,
    val bleIdentifier: String,
    val semesterId: String,
    val sectionId: String?,
    val dayOfWeek: Int,
    val startTime: String,
    val endTime: String
)

@Entity(tableName = "teacher_sessions")
data class TeacherSessionEntity(
    @PrimaryKey val sessionId: String,
    val subjectId: String,
    val subjectName: String,
    val classroomId: String,
    val classroomName: String,
    val bleIdentifier: String,
    val startTime: String,
    val expiryTime: String,
    val durationMinutes: Int,
    val status: String, // ACTIVE, STOPPED
    val rawSessionToken: String? = null
)
