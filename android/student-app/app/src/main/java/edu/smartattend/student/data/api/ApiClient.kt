package edu.smartattend.student.data.api

import android.content.Context
import android.content.SharedPreferences
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    const val DEFAULT_BASE_URL = "https://smartattend-ab65.onrender.com/api/v1/"
    private const val PREFS_NAME = "smartattend_student_prefs"
    private const val KEY_BASE_URL = "backend_base_url"

    private var baseUrl: String = DEFAULT_BASE_URL
    private var prefs: SharedPreferences? = null

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedUrl = prefs?.getString(KEY_BASE_URL, DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
        // Automatically migrate any legacy local development IPs to production Render URL
        if (savedUrl.contains("192.168.") || savedUrl.contains("10.34.") || savedUrl.contains("localhost") || savedUrl.contains("127.0.0.1")) {
            setBaseUrl(DEFAULT_BASE_URL)
        } else {
            setBaseUrl(savedUrl)
        }
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
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
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

    val apiService: SmartAttendApiService
        get() = getRetrofit().create(SmartAttendApiService::class.java)
}
