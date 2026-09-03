package edu.smartattend.student.data.api

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String,
    val role: String,
    val user: UserDto
)

data class UserDto(
    val id: String,
    val username: String,
    val email: String,
    @SerializedName("full_name") val fullName: String,
    val role: String,
    val status: String,
    @SerializedName("student_profile") val studentProfile: StudentProfileDto?
)

data class StudentProfileDto(
    val id: String,
    @SerializedName("student_id") val studentId: String,
    @SerializedName("department_id") val departmentId: String?,
    @SerializedName("semester_id") val semesterId: String?,
    @SerializedName("section_id") val sectionId: String?
)

data class SyncBatchRequest(
    val items: List<SyncItemDto>
)

data class SyncItemDto(
    @SerializedName("attendance_id") val attendanceId: String,
    @SerializedName("session_id") val sessionId: String,
    @SerializedName("subject_id") val subjectId: String,
    @SerializedName("classroom_id") val classroomId: String,
    @SerializedName("session_token") val sessionToken: String,
    @SerializedName("ble_rssi") val bleRssi: Int,
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("marked_at") val markedAt: String,
    @SerializedName("verification_source") val verificationSource: String = "BLE"
)

data class SyncBatchResponse(
    @SerializedName("total_processed") val totalProcessed: Int,
    @SerializedName("success_count") val successCount: Int,
    @SerializedName("failure_count") val failureCount: Int,
    val results: List<SyncItemResultDto>
)

data class SyncItemResultDto(
    @SerializedName("attendance_id") val attendanceId: String,
    val status: String,
    @SerializedName("attendance_status") val attendanceStatus: String?,
    val message: String
)

data class StudentOfflineBundleResponse(
    @SerializedName("sync_time") val syncTime: String,
    val student: StudentBundleInfo,
    val subjects: List<SubjectBundleInfo>,
    val timetable: List<TimetableBundleInfo>,
    val classrooms: List<ClassroomBundleInfo>,
    @SerializedName("active_sessions") val activeSessions: List<ActiveSessionBundleInfo>
)

data class StudentBundleInfo(
    val id: String,
    @SerializedName("user_id") val userId: String,
    @SerializedName("roll_number") val rollNumber: String,
    @SerializedName("full_name") val fullName: String,
    val email: String,
    @SerializedName("department_id") val departmentId: String?,
    @SerializedName("department_name") val departmentName: String?,
    @SerializedName("semester_id") val semesterId: String?,
    @SerializedName("semester_number") val semesterNumber: Int?,
    @SerializedName("section_id") val sectionId: String?,
    @SerializedName("section_name") val sectionName: String?
)

data class SubjectBundleInfo(
    val id: String,
    val code: String,
    val name: String,
    val credits: Int
)

data class TimetableBundleInfo(
    val id: String,
    @SerializedName("subject_id") val subjectId: String,
    @SerializedName("subject_code") val subjectCode: String,
    @SerializedName("subject_name") val subjectName: String,
    @SerializedName("classroom_id") val classroomId: String,
    @SerializedName("classroom_name") val classroomName: String,
    @SerializedName("ble_identifier") val bleIdentifier: String,
    @SerializedName("day_of_week") val dayOfWeek: Int,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String
)

data class ClassroomBundleInfo(
    val id: String,
    val name: String,
    val building: String,
    @SerializedName("room_number") val roomNumber: String,
    @SerializedName("ble_identifier") val bleIdentifier: String
)

data class ActiveSessionBundleInfo(
    val id: String,
    @SerializedName("subject_id") val subjectId: String,
    @SerializedName("classroom_id") val classroomId: String,
    @SerializedName("ble_identifier") val bleIdentifier: String,
    @SerializedName("expiry_time") val expiryTime: String,
    @SerializedName("duration_minutes") val durationMinutes: Int,
    @SerializedName("rssi_threshold") val rssiThreshold: Int
)

data class TodayClassResponse(
    @SerializedName("timetable_id") val timetableId: String,
    @SerializedName("subject_id") val subjectId: String,
    @SerializedName("subject_code") val subjectCode: String,
    @SerializedName("subject_name") val subjectName: String,
    @SerializedName("teacher_name") val teacherName: String,
    @SerializedName("classroom_id") val classroomId: String,
    @SerializedName("classroom_name") val classroomName: String,
    @SerializedName("ble_identifier") val bleIdentifier: String,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String,
    @SerializedName("is_session_active") val isSessionActive: Boolean,
    @SerializedName("active_session_id") val activeSessionId: String?,
    @SerializedName("active_session_token") val activeSessionToken: String?,
    @SerializedName("already_marked") val alreadyMarked: Boolean,
    @SerializedName("marked_status") val markedStatus: String?
)

data class AttendanceHistoryItemDto(
    val id: String,
    @SerializedName("session_id") val sessionId: String,
    @SerializedName("subject_id") val subjectId: String,
    @SerializedName("classroom_id") val classroomId: String,
    @SerializedName("marked_at") val markedAt: String,
    val status: String,
    @SerializedName("ble_rssi") val bleRssi: Int?,
    @SerializedName("sync_status") val syncStatus: String?,
    @SerializedName("verification_source") val verificationSource: String?
)
