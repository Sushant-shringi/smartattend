package edu.smartattend.teacher.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import edu.smartattend.teacher.data.local.dao.SessionDao
import edu.smartattend.teacher.data.local.dao.TeacherDao
import edu.smartattend.teacher.data.local.entity.TeacherCacheEntity
import edu.smartattend.teacher.data.local.entity.TeacherClassEntity
import edu.smartattend.teacher.data.local.entity.TeacherSessionEntity

@Database(
    entities = [
        TeacherCacheEntity::class,
        TeacherClassEntity::class,
        TeacherSessionEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class TeacherDatabase : RoomDatabase() {
    abstract fun teacherDao(): TeacherDao
    abstract fun sessionDao(): SessionDao

    companion object {
        @Volatile
        private var INSTANCE: TeacherDatabase? = null

        fun getDatabase(context: Context): TeacherDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    TeacherDatabase::class.java,
                    "smartattend_teacher_db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
