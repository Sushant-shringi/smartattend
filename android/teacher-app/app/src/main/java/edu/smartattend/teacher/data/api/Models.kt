package edu.smartattend.teacher.data.api

import com.google.gson.annotations.SerializedName

data class TeacherLoginRequest(
    val username: String,
    val password: String
)

data class TeacherLoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String,
    val role: String,
    val user: TeacherUserDto
)

data class TeacherUserDto(
    val id: String,
    val username: String,
    val email: String,
    @SerializedName("full_name") val fullName: String,
    val role: String,
    val status: String,
    @SerializedName("teacher_profile") val teacherProfile: TeacherProfileDto?
)

data class TeacherProfileDto(
    val id: String,
    @SerializedName("employee_id") val employeeId: String,
    val designation: String?,
    @SerializedName("department_id") val departmentId: String?
)

data class StartSessionApiRequest(
    @SerializedName("subject_id") val subjectId: String,
    @SerializedName("classroom_id") val classroomId: String,
    @SerializedName("semester_id") val semesterId: String,
    @SerializedName("section_id") val sectionId: String,
    @SerializedName("duration_minutes") val durationMinutes: Int = 50,
    @SerializedName("late_threshold_minutes") val lateThresholdMinutes: Int = 5,
    @SerializedName("rssi_threshold") val rssiThreshold: Int = -85
)

data class StartSessionApiResponse(
    val id: String,
    @SerializedName("teacher_id") val teacherId: String,
    @SerializedName("subject_id") val subjectId: String,
    @SerializedName("classroom_id") val classroomId: String,
    @SerializedName("ble_identifier") val bleIdentifier: String,
    @SerializedName("raw_session_token") val rawSessionToken: String?,
    val status: String,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("expiry_time") val expiryTime: String
)

data class TeacherOfflineBundleResponse(
    @SerializedName("sync_time") val syncTime: String,
    val teacher: TeacherBundleInfo,
    val subjects: List<TeacherSubjectBundleInfo>,
    val timetable: List<TeacherTimetableBundleInfo>,
    val classrooms: List<TeacherClassroomBundleInfo>
)

data class TeacherBundleInfo(
    val id: String,
    @SerializedName("user_id") val userId: String,
    @SerializedName("employee_id") val employeeId: String,
    @SerializedName("full_name") val fullName: String,
    val email: String,
    val designation: String?,
    @SerializedName("department_id") val departmentId: String?,
    @SerializedName("department_name") val departmentName: String?
)

data class TeacherSubjectBundleInfo(
    val id: String,
    val code: String,
    val name: String,
    val credits: Int,
    @SerializedName("semester_id") val semesterId: String,
    @SerializedName("semester_number") val semesterNumber: Int
)

data class TeacherTimetableBundleInfo(
    val id: String,
    @SerializedName("subject_id") val subjectId: String,
    @SerializedName("subject_code") val subjectCode: String,
    @SerializedName("subject_name") val subjectName: String,
    @SerializedName("classroom_id") val classroomId: String,
    @SerializedName("classroom_name") val classroomName: String,
    @SerializedName("ble_identifier") val bleIdentifier: String,
    @SerializedName("semester_id") val semesterId: String,
    @SerializedName("section_id") val sectionId: String?,
    @SerializedName("day_of_week") val dayOfWeek: Int,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String
)

data class TeacherClassroomBundleInfo(
    val id: String,
    val name: String,
    val building: String,
    @SerializedName("room_number") val roomNumber: String,
    @SerializedName("ble_identifier") val bleIdentifier: String
)

data class LiveAttendanceSummaryResponse(
    val session: StartSessionApiResponse,
    @SerializedName("total_enrolled") val totalEnrolled: Int,
    @SerializedName("present_count") val presentCount: Int,
    @SerializedName("late_count") val lateCount: Int,
    @SerializedName("absent_count") val absentCount: Int,
    @SerializedName("attendance_list") val attendanceList: List<LiveStudentAttendanceDto>
)

data class LiveStudentAttendanceDto(
    @SerializedName("student_id") val studentId: String,
    @SerializedName("roll_number") val rollNumber: String,
    @SerializedName("full_name") val fullName: String,
    val status: String,
    @SerializedName("marked_at") val markedAt: String?,
    @SerializedName("ble_rssi") val bleRssi: Int?,
    @SerializedName("sync_status") val syncStatus: String?
)
