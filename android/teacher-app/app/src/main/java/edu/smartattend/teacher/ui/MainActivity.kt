package edu.smartattend.teacher.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import edu.smartattend.teacher.ble.BleAdvertiserManager
import edu.smartattend.teacher.data.local.TeacherDatabase
import edu.smartattend.teacher.data.local.entity.TeacherClassEntity
import edu.smartattend.teacher.data.local.entity.TeacherSessionEntity
import edu.smartattend.teacher.data.repository.TeacherRepository
import edu.smartattend.teacher.notification.TeacherNotificationHelper
import edu.smartattend.teacher.ui.screens.*
import edu.smartattend.teacher.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.*

class MainActivity : ComponentActivity() {

    private lateinit var teacherRepository: TeacherRepository
    private lateinit var bleAdvertiserManager: BleAdvertiserManager

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.values.all { it }
        if (!allGranted) {
            Toast.makeText(this, "Permissions required for BLE broadcast & notifications", Toast.LENGTH_SHORT).show()
        }
    }

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize faculty notification channel & API Client
        TeacherNotificationHelper.createNotificationChannel(this)
        edu.smartattend.teacher.data.api.TeacherApiClient.init(this)

        val db = TeacherDatabase.getDatabase(this)
        teacherRepository = TeacherRepository(db.teacherDao(), db.sessionDao())
        bleAdvertiserManager = BleAdvertiserManager(this)

        checkPermissions()

        setContent {
            SmartAttendTeacherTheme {
                val navController = rememberNavController()
                var isLoading by remember { mutableStateOf(false) }
                var isRefreshing by remember { mutableStateOf(false) }
                var errorMessage by remember { mutableStateOf<String?>(null) }

                var currentTeacher by remember { mutableStateOf<edu.smartattend.teacher.data.local.entity.TeacherCacheEntity?>(null) }
                var selectedClassItem by remember { mutableStateOf<TeacherClassEntity?>(null) }
                var activeSession by remember { mutableStateOf<TeacherSessionEntity?>(null) }
                var liveSummary by remember { mutableStateOf<edu.smartattend.teacher.data.api.LiveAttendanceSummaryResponse?>(null) }
                var isRosterLoading by remember { mutableStateOf(false) }

                val isAdvertising by bleAdvertiserManager.isAdvertising.collectAsState()

                // Day of week
                val dayOfWeek = Calendar.getInstance().get(Calendar.DAY_OF_WEEK).let { (it + 5) % 7 }
                val todayClasses by teacherRepository.getClassesForDay(dayOfWeek).collectAsState(initial = emptyList())
                val allClasses by db.teacherDao().getAllClasses().collectAsState(initial = emptyList())

                LaunchedEffect(Unit) {
                    val cached = teacherRepository.getCachedTeacher()
                    if (cached != null) {
                        currentTeacher = cached
                        activeSession = db.sessionDao().getActiveSession()
                    }
                }

                // Background polling & notification for live roster
                LaunchedEffect(activeSession?.sessionId, currentTeacher?.authToken) {
                    val session = activeSession
                    val teacher = currentTeacher
                    if (session != null && teacher != null) {
                        while (true) {
                            try {
                                val res = teacherRepository.fetchLiveAttendance(session.sessionId, teacher.authToken)
                                if (res.isSuccess) {
                                    val summary = res.getOrNull()
                                    liveSummary = summary
                                    // Check for new attendees and trigger notification
                                    summary?.attendanceList?.forEach { att ->
                                        if (att.status == "PRESENT" || att.status == "LATE") {
                                            TeacherNotificationHelper.notifyNewAttendee(
                                                context = this@MainActivity,
                                                studentName = att.fullName,
                                                rollNumber = att.rollNumber,
                                                subjectName = session.subjectName,
                                                status = att.status,
                                                rssi = att.bleRssi,
                                                recordUniqueKey = "${session.sessionId}-${att.studentId}"
                                            )
                                        }
                                    }
                                }
                            } catch (e: Exception) {
                                // Silent retry
                            }
                            delay(4000)
                        }
                    }
                }

                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                Scaffold(
                    topBar = {
                        if (currentTeacher != null && currentRoute != "login") {
                            TopAppBar(
                                title = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .size(38.dp)
                                                .clip(CircleShape)
                                                .background(BrandIndigo),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = currentTeacher?.fullName?.take(1)?.uppercase() ?: "T",
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 16.sp
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text(
                                                text = when (currentRoute) {
                                                    "dashboard" -> "Faculty Portal"
                                                    "session" -> "Start Attendance"
                                                    "roster" -> "Live Roster"
                                                    "schedule" -> "Teaching Schedule"
                                                    "profile" -> "Faculty Profile"
                                                    else -> "SmartAttend"
                                                },
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                            Text(
                                                text = "${currentTeacher?.employeeId} • ${currentTeacher?.designation ?: "Associate Professor"}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                },
                                actions = {
                                    if (activeSession != null) {
                                        Surface(
                                            shape = RoundedCornerShape(20.dp),
                                            color = SuccessGreenContainer,
                                            modifier = Modifier.padding(end = 8.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(7.dp)
                                                        .clip(CircleShape)
                                                        .background(SuccessGreen)
                                                )
                                                Spacer(modifier = Modifier.width(5.dp))
                                                Text(
                                                    text = "BLE Active",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    fontWeight = FontWeight.Bold,
                                                    color = SuccessGreen
                                                )
                                            }
                                        }
                                    }
                                },
                                colors = TopAppBarDefaults.topAppBarColors(
                                    containerColor = MaterialTheme.colorScheme.surface
                                )
                            )
                        }
                    },
                    bottomBar = {
                        if (currentTeacher != null && currentRoute != "login") {
                            NavigationBar(
                                containerColor = MaterialTheme.colorScheme.surface,
                                tonalElevation = 8.dp
                            ) {
                                NavigationBarItem(
                                    icon = { Icon(Icons.Default.Dashboard, contentDescription = "Dashboard") },
                                    label = { Text("Home") },
                                    selected = currentRoute == "dashboard",
                                    onClick = {
                                        navController.navigate("dashboard") {
                                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                )
                                NavigationBarItem(
                                    icon = { Icon(Icons.Default.Sensors, contentDescription = "Start") },
                                    label = { Text("Broadcast") },
                                    selected = currentRoute == "session",
                                    onClick = {
                                        if (selectedClassItem == null && todayClasses.isNotEmpty()) {
                                            selectedClassItem = todayClasses.first()
                                        }
                                        navController.navigate("session") {
                                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                )
                                NavigationBarItem(
                                    icon = {
                                        BadgedBox(
                                            badge = {
                                                if (activeSession != null) {
                                                    Badge(containerColor = SuccessGreen) { Text("LIVE") }
                                                }
                                            }
                                        ) {
                                            Icon(Icons.Default.People, contentDescription = "Roster")
                                        }
                                    },
                                    label = { Text("Live Roster") },
                                    selected = currentRoute == "roster",
                                    onClick = {
                                        navController.navigate("roster") {
                                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                )
                                NavigationBarItem(
                                    icon = { Icon(Icons.Default.CalendarMonth, contentDescription = "Schedule") },
                                    label = { Text("Schedule") },
                                    selected = currentRoute == "schedule",
                                    onClick = {
                                        navController.navigate("schedule") {
                                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                )
                                NavigationBarItem(
                                    icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                                    label = { Text("Profile") },
                                    selected = currentRoute == "profile",
                                    onClick = {
                                        navController.navigate("profile") {
                                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                )
                            }
                        }
                    },
                    containerColor = MaterialTheme.colorScheme.background
                ) { padding ->
                    Box(modifier = Modifier.padding(padding)) {
                        NavHost(
                            navController = navController,
                            startDestination = if (currentTeacher == null) "login" else "dashboard"
                        ) {
                            composable("login") {
                                TeacherLoginScreen(
                                    onLoginClick = { u, p ->
                                        isLoading = true
                                        errorMessage = null
                                        lifecycleScope.launch {
                                            val result = teacherRepository.login(u, p)
                                            isLoading = false
                                            if (result.isSuccess) {
                                                currentTeacher = result.getOrNull()
                                                navController.navigate("dashboard") {
                                                    popUpTo("login") { inclusive = true }
                                                }
                                            } else {
                                                errorMessage = result.exceptionOrNull()?.message ?: "Login failed"
                                            }
                                        }
                                    },
                                    isLoading = isLoading,
                                    errorMessage = errorMessage
                                )
                            }

                            composable("dashboard") {
                                currentTeacher?.let { teacher ->
                                    TeacherDashboardScreen(
                                        teacher = teacher,
                                        todayClasses = todayClasses,
                                        allClasses = allClasses,
                                        activeSession = activeSession,
                                        onStartSessionClick = { classItem ->
                                            selectedClassItem = classItem
                                            lifecycleScope.launch {
                                                val sessionResult = teacherRepository.startAttendanceSession(
                                                    classItem = classItem,
                                                    durationMinutes = 50,
                                                    authToken = teacher.authToken
                                                )
                                                if (sessionResult.isSuccess) {
                                                    activeSession = sessionResult.getOrNull()
                                                    bleAdvertiserManager.startAdvertising(classItem.bleIdentifier)
                                                    Toast.makeText(this@MainActivity, "BLE Broadcast Active: ${classItem.bleIdentifier}", Toast.LENGTH_SHORT).show()
                                                    navController.navigate("session")
                                                } else {
                                                    Toast.makeText(this@MainActivity, "Failed to start session", Toast.LENGTH_SHORT).show()
                                                }
                                            }
                                        },
                                        onStopSessionClick = { sId ->
                                            lifecycleScope.launch {
                                                teacherRepository.stopSession(sId)
                                                bleAdvertiserManager.stopAdvertising()
                                                activeSession = null
                                                TeacherNotificationHelper.clearNotifiedCache()
                                                Toast.makeText(this@MainActivity, "Attendance session ended", Toast.LENGTH_SHORT).show()
                                            }
                                        },
                                        onViewActiveRosterClick = {
                                            navController.navigate("roster")
                                        },
                                        onViewScheduleClick = {
                                            navController.navigate("schedule")
                                        },
                                        onRefreshBundle = {
                                            isRefreshing = true
                                            lifecycleScope.launch {
                                                teacherRepository.refreshOfflineBundle(teacher.authToken)
                                                isRefreshing = false
                                                Toast.makeText(this@MainActivity, "Schedule & Classes updated", Toast.LENGTH_SHORT).show()
                                            }
                                        },
                                        isRefreshing = isRefreshing
                                    )
                                }
                            }

                            composable("session") {
                                val sessionClass = selectedClassItem ?: todayClasses.firstOrNull()
                                if (sessionClass != null) {
                                    StartAttendanceScreen(
                                        classItem = sessionClass,
                                        isAdvertising = isAdvertising,
                                        onToggleAdvertising = {
                                            if (isAdvertising) {
                                                bleAdvertiserManager.stopAdvertising()
                                            } else {
                                                bleAdvertiserManager.startAdvertising(sessionClass.bleIdentifier)
                                            }
                                        },
                                        onStopSession = {
                                            activeSession?.let { s ->
                                                lifecycleScope.launch {
                                                    teacherRepository.stopSession(s.sessionId)
                                                    bleAdvertiserManager.stopAdvertising()
                                                    activeSession = null
                                                    TeacherNotificationHelper.clearNotifiedCache()
                                                    navController.navigate("dashboard")
                                                }
                                            } ?: navController.navigate("dashboard")
                                        },
                                        onViewLiveRoster = {
                                            navController.navigate("roster")
                                        },
                                        onBack = { navController.popBackStack() }
                                    )
                                } else {
                                    Box(
                                        modifier = Modifier.fillMaxSize(),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("Please select a course from Dashboard to start broadcast")
                                    }
                                }
                            }

                            composable("roster") {
                                val session = activeSession
                                val teacher = currentTeacher
                                if (session != null && teacher != null) {
                                    LiveRosterScreen(
                                        sessionName = session.subjectName,
                                        classroomName = session.classroomName,
                                        bleIdentifier = session.bleIdentifier,
                                        liveSummary = liveSummary,
                                        isLoading = isRosterLoading,
                                        onRefresh = {
                                            lifecycleScope.launch {
                                                isRosterLoading = true
                                                val res = teacherRepository.fetchLiveAttendance(session.sessionId, teacher.authToken)
                                                isRosterLoading = false
                                                if (res.isSuccess) {
                                                    liveSummary = res.getOrNull()
                                                    Toast.makeText(this@MainActivity, "Roster updated (${liveSummary?.presentCount ?: 0} present)", Toast.LENGTH_SHORT).show()
                                                }
                                            }
                                        },
                                        onBack = { navController.popBackStack() }
                                    )
                                } else {
                                    LiveRosterScreen(
                                        sessionName = "No Active Session",
                                        classroomName = "Start a session to monitor live roster",
                                        bleIdentifier = "IDLE",
                                        liveSummary = null,
                                        isLoading = false,
                                        onRefresh = {},
                                        onBack = { navController.popBackStack() }
                                    )
                                }
                            }

                            composable("schedule") {
                                TeacherScheduleScreen(
                                    allClasses = allClasses,
                                    onStartSessionClick = { classItem ->
                                        selectedClassItem = classItem
                                        currentTeacher?.let { teacher ->
                                            lifecycleScope.launch {
                                                val sessionResult = teacherRepository.startAttendanceSession(
                                                    classItem = classItem,
                                                    durationMinutes = 50,
                                                    authToken = teacher.authToken
                                                )
                                                if (sessionResult.isSuccess) {
                                                    activeSession = sessionResult.getOrNull()
                                                    bleAdvertiserManager.startAdvertising(classItem.bleIdentifier)
                                                    Toast.makeText(this@MainActivity, "BLE Broadcast Active", Toast.LENGTH_SHORT).show()
                                                    navController.navigate("session")
                                                }
                                            }
                                        }
                                    }
                                )
                            }

                            composable("profile") {
                                currentTeacher?.let { teacher ->
                                    TeacherProfileScreen(
                                        teacher = teacher,
                                        onLogoutClick = {
                                            lifecycleScope.launch {
                                                db.teacherDao().clearTeacher()
                                                currentTeacher = null
                                                activeSession = null
                                                bleAdvertiserManager.stopAdvertising()
                                                navController.navigate("login") {
                                                    popUpTo(0) { inclusive = true }
                                                }
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private fun checkPermissions() {
        val permissions = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_ADVERTISE)
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            permissions.add(Manifest.permission.BLUETOOTH)
            permissions.add(Manifest.permission.BLUETOOTH_ADMIN)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) {
            permissionLauncher.launch(needed.toTypedArray())
        }
    }
}
