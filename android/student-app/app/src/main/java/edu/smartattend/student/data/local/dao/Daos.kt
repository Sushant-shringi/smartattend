package edu.smartattend.student.data.local.dao

import androidx.room.*
import edu.smartattend.student.data.local.entity.*
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM user_cache LIMIT 1")
    suspend fun getCachedUser(): UserCacheEntity?

    @Query("SELECT * FROM user_cache WHERE username = :username LIMIT 1")
    suspend fun getUserByUsername(username: String): UserCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveUser(user: UserCacheEntity)

    @Query("DELETE FROM user_cache")
    suspend fun clearUser()
}

@Dao
interface ClassDao {
    @Query("SELECT * FROM cached_classes")
    fun getAllClasses(): Flow<List<CachedClassEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClasses(classes: List<CachedClassEntity>)

    @Query("DELETE FROM cached_classes")
    suspend fun clearClasses()
}

@Dao
interface TimetableDao {
    @Query("SELECT * FROM cached_timetable WHERE dayOfWeek = :dayOfWeek ORDER BY startTime ASC")
    fun getTimetableForDay(dayOfWeek: Int): Flow<List<TimetableEntity>>

    @Query("SELECT * FROM cached_timetable ORDER BY dayOfWeek ASC, startTime ASC")
    fun getFullTimetable(): Flow<List<TimetableEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTimetable(entries: List<TimetableEntity>)

    @Query("DELETE FROM cached_timetable")
    suspend fun clearTimetable()
}

@Dao
interface AttendanceDao {
    @Query("SELECT * FROM pending_attendance ORDER BY markedAt DESC")
    fun getAllAttendanceRecords(): Flow<List<PendingAttendanceEntity>>

    @Query("SELECT * FROM pending_attendance WHERE syncStatus != 'SYNCED'")
    suspend fun getPendingSyncRecords(): List<PendingAttendanceEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: PendingAttendanceEntity)

    @Query("UPDATE pending_attendance SET syncStatus = 'SYNCED', lastError = null WHERE attendanceId = :attendanceId")
    suspend fun markAsSynced(attendanceId: String)

    @Query("UPDATE pending_attendance SET syncStatus = 'SYNC_FAILED', lastError = :error, syncRetryCount = syncRetryCount + 1 WHERE attendanceId = :attendanceId")
    suspend fun markAsFailed(attendanceId: String, error: String)

    @Query("UPDATE pending_attendance SET syncStatus = 'PENDING_SYNC' WHERE syncStatus = 'SYNC_FAILED'")
    suspend fun resetFailedToPending()

    @Query("SELECT COUNT(*) FROM pending_attendance WHERE syncStatus != 'SYNCED'")
    fun getPendingCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM pending_attendance WHERE syncStatus = 'SYNCED'")
    fun getSyncedCount(): Flow<Int>
}
