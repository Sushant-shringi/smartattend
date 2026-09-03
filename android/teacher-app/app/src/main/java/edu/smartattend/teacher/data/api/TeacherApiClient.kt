package edu.smartattend.teacher.data.api

import android.content.Context
import android.content.SharedPreferences
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object TeacherApiClient {
    const val DEFAULT_BASE_URL = "http://10.34.92.77:8000/api/v1/"
    private const val PREFS_NAME = "smartattend_teacher_prefs"
    private const val KEY_BASE_URL = "backend_base_url"

    private var baseUrl: String = DEFAULT_BASE_URL
    private var prefs: SharedPreferences? = null

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedUrl = prefs?.getString(KEY_BASE_URL, DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
        setBaseUrl(savedUrl)
    }

    fun getBaseUrl(): String = baseUrl

    fun setBaseUrl(url: String) {
        val sanitized = if (url.endsWith("/")) url else "$url/"
        baseUrl = sanitized
        prefs?.edit()?.putString(KEY_BASE_URL, sanitized)?.apply()
        retrofitInstance = null
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .writeTimeout(12, TimeUnit.SECONDS)
        .addInterceptor(loggingInterceptor)
        .build()

    private var retrofitInstance: Retrofit? = null

    private fun getRetrofit(): Retrofit {
        return retrofitInstance ?: synchronized(this) {
            val instance = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            retrofitInstance = instance
            instance
        }
    }

    val apiService: TeacherApiService
        get() = getRetrofit().create(TeacherApiService::class.java)
}
