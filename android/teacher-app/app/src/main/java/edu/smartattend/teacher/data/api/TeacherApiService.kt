package edu.smartattend.teacher.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface TeacherApiService {

    @POST("auth/login")
    suspend fun login(
        @Body request: TeacherLoginRequest
    ): Response<TeacherLoginResponse>

    @GET("teacher/offline-bundle")
    suspend fun getOfflineBundle(
        @Header("Authorization") token: String
    ): Response<TeacherOfflineBundleResponse>

    @POST("attendance/sessions")
    suspend fun startSession(
        @Header("Authorization") token: String,
        @Body request: StartSessionApiRequest
    ): Response<StartSessionApiResponse>

    @POST("attendance/sessions/{sessionId}/stop")
    suspend fun stopSession(
        @Header("Authorization") token: String,
        @Path("sessionId") sessionId: String
    ): Response<StartSessionApiResponse>

    @GET("teacher/live-attendance/{sessionId}")
    suspend fun getLiveAttendance(
        @Header("Authorization") token: String,
        @Path("sessionId") sessionId: String
    ): Response<LiveAttendanceSummaryResponse>
}
