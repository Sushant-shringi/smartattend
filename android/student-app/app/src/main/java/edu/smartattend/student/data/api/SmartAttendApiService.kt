package edu.smartattend.student.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface SmartAttendApiService {

    @POST("auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    @GET("student/offline-bundle")
    suspend fun getOfflineBundle(
        @Header("Authorization") token: String
    ): Response<StudentOfflineBundleResponse>

    @POST("sync/attendance")
    suspend fun syncAttendanceBatch(
        @Header("Authorization") token: String,
        @Body batch: SyncBatchRequest
    ): Response<SyncBatchResponse>

    @GET("student/today-classes")
    suspend fun getTodayClasses(
        @Header("Authorization") token: String
    ): Response<List<TodayClassResponse>>

    @GET("attendance/history")
    suspend fun getAttendanceHistory(
        @Header("Authorization") token: String
    ): Response<List<AttendanceHistoryItemDto>>
}
