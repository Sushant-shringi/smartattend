package edu.smartattend.teacher.data.local.dao

import androidx.room.*
import edu.smartattend.teacher.data.local.entity.TeacherCacheEntity
import edu.smartattend.teacher.data.local.entity.TeacherClassEntity
import edu.smartattend.teacher.data.local.entity.TeacherSessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TeacherDao {
    @Query("SELECT * FROM teacher_cache LIMIT 1")
    suspend fun getCachedTeacher(): TeacherCacheEntity?

    @Query("SELECT * FROM teacher_cache WHERE username = :username LIMIT 1")
    suspend fun getTeacherByUsername(username: String): TeacherCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveTeacher(teacher: TeacherCacheEntity)

    @Query("DELETE FROM teacher_cache")
    suspend fun clearTeacher()

    @Query("SELECT * FROM teacher_assigned_classes WHERE dayOfWeek = :dayOfWeek ORDER BY startTime ASC")
    fun getClassesForDay(dayOfWeek: Int): Flow<List<TeacherClassEntity>>

    @Query("SELECT * FROM teacher_assigned_classes ORDER BY dayOfWeek ASC, startTime ASC")
    fun getAllClasses(): Flow<List<TeacherClassEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClasses(classes: List<TeacherClassEntity>)

    @Query("DELETE FROM teacher_assigned_classes")
    suspend fun clearClasses()
}

@Dao
interface SessionDao {
    @Query("SELECT * FROM teacher_sessions ORDER BY startTime DESC")
    fun getAllSessions(): Flow<List<TeacherSessionEntity>>

    @Query("SELECT * FROM teacher_sessions WHERE status = 'ACTIVE' LIMIT 1")
    suspend fun getActiveSession(): TeacherSessionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: TeacherSessionEntity)

    @Query("UPDATE teacher_sessions SET status = 'STOPPED' WHERE sessionId = :sessionId")
    suspend fun stopSession(sessionId: String)
}
