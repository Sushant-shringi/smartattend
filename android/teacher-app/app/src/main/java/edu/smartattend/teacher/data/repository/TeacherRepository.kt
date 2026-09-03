package edu.smartattend.teacher.data.repository

import android.util.Log
import edu.smartattend.teacher.data.api.StartSessionApiRequest
import edu.smartattend.teacher.data.api.TeacherApiClient
import edu.smartattend.teacher.data.api.TeacherLoginRequest
import edu.smartattend.teacher.data.local.dao.SessionDao
import edu.smartattend.teacher.data.local.dao.TeacherDao
import edu.smartattend.teacher.data.local.entity.TeacherCacheEntity
import edu.smartattend.teacher.data.local.entity.TeacherClassEntity
import edu.smartattend.teacher.data.local.entity.TeacherSessionEntity
import kotlinx.coroutines.flow.Flow
import org.json.JSONObject
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.*

class TeacherRepository(
    private val teacherDao: TeacherDao,
    private val sessionDao: SessionDao
) {
    private fun hashPassword(password: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(password.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    suspend fun login(username: String, password: String): Result<TeacherCacheEntity> {
        val passwordHash = hashPassword(password)

        // 1. Try Online Login
        try {
            Log.d("SmartAttendAuth", "Teacher online login to ${TeacherApiClient.getBaseUrl()} for user $username")
            val response = TeacherApiClient.apiService.login(TeacherLoginRequest(username, password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val userDto = body.user
                val profile = userDto.teacherProfile

                val teacherEntity = TeacherCacheEntity(
                    teacherId = profile?.id ?: userDto.id,
                    userId = userDto.id,
                    username = userDto.username,
                    fullName = userDto.fullName,
                    employeeId = profile?.employeeId ?: "EMP-000",
                    designation = profile?.designation,
                    departmentName = null,
                    authToken = "Bearer ${body.accessToken}",
                    passwordHash = passwordHash,
                    lastLoginTimestamp = System.currentTimeMillis()
                )
                teacherDao.saveTeacher(teacherEntity)

                // Refresh cache
                refreshOfflineBundle(teacherEntity.authToken)

                return Result.success(teacherEntity)
            } else {
                // Online request reached server, but returned an error status (e.g. 401 Unauthorized, 400 Bad Request)
                val errorBody = response.errorBody()?.string()
                val errorDetail = try {
                    JSONObject(errorBody ?: "").getString("detail")
                } catch (e: Exception) {
                    "HTTP ${response.code()}: Invalid teacher credentials"
                }
                Log.e("SmartAttendAuth", "Teacher login rejected: $errorDetail")
                return Result.failure(Exception(errorDetail))
            }
        } catch (e: Exception) {
            Log.w("SmartAttendAuth", "Teacher network connection failed: ${e.message}. Checking offline cache...")
            
            // 2. Offline Fallback
            val cached = teacherDao.getTeacherByUsername(username)
            return if (cached != null && cached.passwordHash == passwordHash) {
                Log.d("SmartAttendAuth", "Teacher offline login successful for $username")
                Result.success(cached)
            } else if (cached != null) {
                Result.failure(Exception("Cannot reach server at ${TeacherApiClient.getBaseUrl()}. Offline password invalid."))
            } else {
                Result.failure(Exception("Cannot reach server at ${TeacherApiClient.getBaseUrl()}.\nError: ${e.localizedMessage ?: "Network connection failed"}.\nPlease verify your phone is on the same Wi-Fi network and check Server URL settings."))
            }
        }
    }

    suspend fun refreshOfflineBundle(token: String): Result<Boolean> {
        return try {
            val res = TeacherApiClient.apiService.getOfflineBundle(token)
            if (res.isSuccessful && res.body() != null) {
                val bundle = res.body()!!

                val classes = bundle.timetable.map {
                    TeacherClassEntity(
                        id = it.id,
                        subjectId = it.subjectId,
                        subjectCode = it.subjectCode,
                        subjectName = it.subjectName,
                        classroomId = it.classroomId,
                        classroomName = it.classroomName,
                        bleIdentifier = it.bleIdentifier,
                        semesterId = it.semesterId,
                        sectionId = it.sectionId,
                        dayOfWeek = it.dayOfWeek,
                        startTime = it.startTime,
                        endTime = it.endTime
                    )
                }
                teacherDao.clearClasses()
                teacherDao.insertClasses(classes)

                // Update designation / dept
                val current = teacherDao.getCachedTeacher()
                if (current != null) {
                    val updated = current.copy(
                        departmentName = bundle.teacher.departmentName,
                        designation = bundle.teacher.designation,
                        fullName = bundle.teacher.fullName
                    )
                    teacherDao.saveTeacher(updated)
                }

                Result.success(true)
            } else {
                Result.failure(Exception("Failed to load bundle: ${res.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun startAttendanceSession(
        classItem: TeacherClassEntity,
        durationMinutes: Int = 50,
        authToken: String
    ): Result<TeacherSessionEntity> {
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val startTime = isoFormat.format(Date())
        val expiryTime = isoFormat.format(Date(System.currentTimeMillis() + durationMinutes * 60 * 1000))

        // Attempt online start session
        try {
            val response = TeacherApiClient.apiService.startSession(
                token = authToken,
                request = StartSessionApiRequest(
                    subjectId = classItem.subjectId,
                    classroomId = classItem.classroomId,
                    semesterId = classItem.semesterId,
                    sectionId = classItem.sectionId ?: "",
                    durationMinutes = durationMinutes
                )
            )
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val session = TeacherSessionEntity(
                    sessionId = body.id,
                    subjectId = body.subjectId,
                    subjectName = classItem.subjectName,
                    classroomId = body.classroomId,
                    classroomName = classItem.classroomName,
                    bleIdentifier = body.bleIdentifier,
                    startTime = body.startTime,
                    expiryTime = body.expiryTime,
                    durationMinutes = durationMinutes,
                    status = "ACTIVE"
                )
                sessionDao.insertSession(session)
                return Result.success(session)
            }
        } catch (e: Exception) {
            // Fall through to offline session creation
        }

        // Local Offline Session Fallback
        val localSession = TeacherSessionEntity(
            sessionId = UUID.randomUUID().toString(),
            subjectId = classItem.subjectId,
            subjectName = classItem.subjectName,
            classroomId = classItem.classroomId,
            classroomName = classItem.classroomName,
            bleIdentifier = classItem.bleIdentifier,
            startTime = startTime,
            expiryTime = expiryTime,
            durationMinutes = durationMinutes,
            status = "ACTIVE"
        )
        sessionDao.insertSession(localSession)
        return Result.success(localSession)
    }

    suspend fun stopSession(sessionId: String) {
        sessionDao.stopSession(sessionId)
    }

    fun getClassesForDay(dayOfWeek: Int): Flow<List<TeacherClassEntity>> = teacherDao.getClassesForDay(dayOfWeek)

    suspend fun getCachedTeacher(): TeacherCacheEntity? = teacherDao.getCachedTeacher()

    suspend fun fetchLiveAttendance(sessionId: String, authToken: String): Result<edu.smartattend.teacher.data.api.LiveAttendanceSummaryResponse> {
        return try {
            val res = TeacherApiClient.apiService.getLiveAttendance(authToken, sessionId)
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!)
            } else {
                Result.failure(Exception("HTTP ${res.code()}: Failed to fetch live attendance"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
