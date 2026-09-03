package edu.smartattend.student.data.repository

import android.util.Log
import edu.smartattend.student.data.api.ApiClient
import edu.smartattend.student.data.api.LoginRequest
import edu.smartattend.student.data.local.dao.ClassDao
import edu.smartattend.student.data.local.dao.TimetableDao
import edu.smartattend.student.data.local.dao.UserDao
import edu.smartattend.student.data.local.entity.CachedClassEntity
import edu.smartattend.student.data.local.entity.TimetableEntity
import edu.smartattend.student.data.local.entity.UserCacheEntity
import org.json.JSONObject
import java.security.MessageDigest

class AuthRepository(
    private val userDao: UserDao,
    private val classDao: ClassDao,
    private val timetableDao: TimetableDao
) {
    private fun hashPassword(password: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(password.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * Attempts online authentication first; falls back seamlessly to offline cached credentials.
     */
    suspend fun login(username: String, password: String): Result<UserCacheEntity> {
        val passwordHash = hashPassword(password)

        // 1. Try Online Login
        try {
            Log.d("SmartAttendAuth", "Attempting online login to ${ApiClient.getBaseUrl()} for user $username")
            val response = ApiClient.apiService.login(LoginRequest(username, password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val userDto = body.user
                val studentProfile = userDto.studentProfile

                val userEntity = UserCacheEntity(
                    studentId = studentProfile?.id ?: userDto.id,
                    userId = userDto.id,
                    username = userDto.username,
                    fullName = userDto.fullName,
                    rollNumber = studentProfile?.studentId ?: "N/A",
                    email = userDto.email,
                    departmentName = null,
                    semesterNumber = null,
                    sectionName = null,
                    authToken = "Bearer ${body.accessToken}",
                    passwordHash = passwordHash,
                    lastLoginTimestamp = System.currentTimeMillis()
                )
                userDao.saveUser(userEntity)

                // Trigger bundle caching after successful online login
                refreshOfflineBundle(userEntity.authToken)

                return Result.success(userEntity)
            } else {
                // Online request reached server, but returned an error status (e.g. 401 Unauthorized, 400 Bad Request)
                val errorBody = response.errorBody()?.string()
                val errorDetail = try {
                    JSONObject(errorBody ?: "").getString("detail")
                } catch (e: Exception) {
                    "HTTP ${response.code()}: Invalid credentials or unauthorized"
                }
                Log.e("SmartAttendAuth", "Online login rejected by server: $errorDetail")
                return Result.failure(Exception(errorDetail))
            }
        } catch (e: Exception) {
            Log.w("SmartAttendAuth", "Online network connection failed: ${e.message}. Checking offline cache...")
            
            // 2. Offline Fallback Login
            val cachedUser = userDao.getUserByUsername(username)
            return if (cachedUser != null && cachedUser.passwordHash == passwordHash) {
                Log.d("SmartAttendAuth", "Offline login successful using cached credentials for $username")
                Result.success(cachedUser)
            } else if (cachedUser != null) {
                Result.failure(Exception("Cannot reach server at ${ApiClient.getBaseUrl()}. Offline password does not match cached credentials."))
            } else {
                Result.failure(Exception("Cannot reach server at ${ApiClient.getBaseUrl()}.\nError: ${e.localizedMessage ?: "Network connection failed"}.\nPlease verify your phone is on the same Wi-Fi network and check Server URL settings."))
            }
        }
    }

    suspend fun refreshOfflineBundle(token: String): Result<Boolean> {
        return try {
            val res = ApiClient.apiService.getOfflineBundle(token)
            if (res.isSuccessful && res.body() != null) {
                val bundle = res.body()!!

                // Cache Classes
                val classEntities = bundle.subjects.map {
                    CachedClassEntity(
                        subjectId = it.id,
                        code = it.code,
                        name = it.name,
                        credits = it.credits
                    )
                }
                classDao.clearClasses()
                classDao.insertClasses(classEntities)

                // Cache Timetable
                val timetableEntities = bundle.timetable.map {
                    TimetableEntity(
                        id = it.id,
                        subjectId = it.subjectId,
                        subjectCode = it.subjectCode,
                        subjectName = it.subjectName,
                        classroomId = it.classroomId,
                        classroomName = it.classroomName,
                        bleIdentifier = it.bleIdentifier,
                        dayOfWeek = it.dayOfWeek,
                        startTime = it.startTime,
                        endTime = it.endTime
                    )
                }
                timetableDao.clearTimetable()
                timetableDao.insertTimetable(timetableEntities)

                // Update user profile fields
                val current = userDao.getCachedUser()
                if (current != null) {
                    val updated = current.copy(
                        departmentName = bundle.student.departmentName,
                        semesterNumber = bundle.student.semesterNumber,
                        sectionName = bundle.student.sectionName,
                        rollNumber = bundle.student.rollNumber,
                        fullName = bundle.student.fullName
                    )
                    userDao.saveUser(updated)
                }

                Result.success(true)
            } else {
                Result.failure(Exception("Failed to fetch offline bundle: ${res.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchTodayClasses(token: String): Result<List<edu.smartattend.student.data.api.TodayClassResponse>> {
        return try {
            val res = ApiClient.apiService.getTodayClasses(token)
            if (res.isSuccessful && res.body() != null) {
                Result.success(res.body()!!)
            } else {
                Result.failure(Exception("HTTP ${res.code()}: Failed to fetch today classes"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCachedUser(): UserCacheEntity? = userDao.getCachedUser()
}
