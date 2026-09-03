package edu.smartattend.student.ui

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
import edu.smartattend.student.ble.BleScannerManager
import edu.smartattend.student.data.local.AppDatabase
import edu.smartattend.student.data.local.entity.TimetableEntity
import edu.smartattend.student.data.repository.AttendanceRepository
import edu.smartattend.student.data.repository.AuthRepository
import edu.smartattend.student.notification.NotificationHelper
import edu.smartattend.student.sync.AttendanceSyncWorker
import edu.smartattend.student.ui.screens.*
import edu.smartattend.student.ui.theme.*
import kotlinx.coroutines.launch
import java.util.*

class MainActivity : ComponentActivity() {

    private lateinit var authRepository: AuthRepository
    private lateinit var attendanceRepository: AttendanceRepository
    private lateinit var bleScannerManager: BleScannerManager

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.values.all { it }
        if (!allGranted) {
            Toast.makeText(this, "Permissions required for BLE radar proximity & notifications", Toast.LENGTH_SHORT).show()
        }
    }

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize notification channel & API Client
        NotificationHelper.createNotificationChannel(this)
        edu.smartattend.student.data.api.ApiClient.init(this)

        val db = AppDatabase.getDatabase(this)
        authRepository = AuthRepository(db.userDao(), db.classDao(), db.timetableDao())
        attendanceRepository = AttendanceRepository(db.attendanceDao(), applicationContext)
        bleScannerManager = BleScannerManager(this)

        // Schedule periodic background sync with WorkManager
        AttendanceSyncWorker.schedulePeriodicSync(this)

        checkPermissions()

        setContent {
            SmartAttendTheme {
                val navController = rememberNavController()
                var isLoading by remember { mutableStateOf(false) }
                var isSyncing by remember { mutableStateOf(false) }
                var errorMessage by remember { mutableStateOf<String?>(null) }

                var currentUser by remember { mutableStateOf<edu.smartattend.student.data.local.entity.UserCacheEntity?>(null) }
                var selectedTimetableItem by remember { mutableStateOf<TimetableEntity?>(null) }

                val isScanning by bleScannerManager.isScanning.collectAsState()
                val discoveredBeacons by bleScannerManager.scanState.collectAsState()

                val allRecords by attendanceRepository.getAllRecords().collectAsState(initial = emptyList())
                val pendingCount by attendanceRepository.getPendingCount().collectAsState(initial = 0)

                // Day of week calculation (0 = Monday, ..., 5 = Saturday)
                val dayOfWeek = Calendar.getInstance().get(Calendar.DAY_OF_WEEK).let { (it + 5) % 7 }
                val todayTimetable by db.timetableDao().getTimetableForDay(dayOfWeek).collectAsState(initial = emptyList())
                val fullTimetable by db.timetableDao().getFullTimetable().collectAsState(initial = emptyList())

                val syncedCount = allRecords.count { it.syncStatus == "SYNCED" }

                LaunchedEffect(Unit) {
                    val cached = authRepository.getCachedUser()
                    if (cached != null) {
                        currentUser = cached
                    }
                }

                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                Scaffold(
                    topBar = {
                        if (currentUser != null && currentRoute != "login") {
                            TopAppBar(
                                title = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .size(38.dp)
                                                .clip(CircleShape)
                                                .background(BrandTeal),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = currentUser?.fullName?.take(1)?.uppercase() ?: "S",
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 16.sp
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text(
                                                text = when (currentRoute) {
                                                    "dashboard" -> "SmartAttend"
                                                    "schedule" -> "Class Schedule"
                                                    "history" -> "Attendance Logs"
                                                    "profile" -> "Student Profile"
                                                    else -> "SmartAttend"
                                                },
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                            Text(
                                                text = "${currentUser?.rollNumber} • ${currentUser?.sectionName ?: "Sec A"}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                },
                                actions = {
                                    Surface(
                                        shape = RoundedCornerShape(20.dp),
                                        color = if (pendingCount > 0) WarningAmberContainer else SuccessGreenContainer,
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
                                                    .background(if (pendingCount > 0) WarningAmber else SuccessGreen)
                                            )
                                            Spacer(modifier = Modifier.width(5.dp))
                                            Text(
                                                text = if (pendingCount > 0) "$pendingCount Pending" else "Synced",
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = if (pendingCount > 0) WarningAmber else SuccessGreen
                                            )
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
                        if (currentUser != null && currentRoute != "login" && currentRoute != "scanner") {
                            NavigationBar(
                                containerColor = MaterialTheme.colorScheme.surface,
                                tonalElevation = 8.dp
                            ) {
                                NavigationBarItem(
                                    icon = { Icon(Icons.Default.Dashboard, contentDescription = "Dashboard") },
                                    label = { Text("Dashboard") },
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
                                    icon = {
                                        BadgedBox(
                                            badge = {
                                                if (pendingCount > 0) {
                                                    Badge(containerColor = WarningAmber) { Text("$pendingCount") }
                                                }
                                            }
                                        ) {
                                            Icon(Icons.Default.History, contentDescription = "Records")
                                        }
                                    },
                                    label = { Text("Records") },
                                    selected = currentRoute == "history",
                                    onClick = {
                                        navController.navigate("history") {
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
                            startDestination = if (currentUser == null) "login" else "dashboard"
                        ) {
                            composable("login") {
                                LoginScreen(
                                    onLoginClick = { u, p ->
                                        isLoading = true
                                        errorMessage = null
                                        lifecycleScope.launch {
                                            val result = authRepository.login(u, p)
                                            isLoading = false
                                            if (result.isSuccess) {
                                                currentUser = result.getOrNull()
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
                                currentUser?.let { user ->
                                    DashboardScreen(
                                        user = user,
                                        todayTimetable = todayTimetable,
                                        pendingCount = pendingCount,
                                        syncedCount = syncedCount,
                                        onMarkAttendanceClick = { item ->
                                            selectedTimetableItem = item
                                            bleScannerManager.startScan()
                                            navController.navigate("scanner")
                                        },
                                        onSyncNowClick = {
                                            isSyncing = true
                                            lifecycleScope.launch {
                                                attendanceRepository.retryFailedRecords()
                                                val result = attendanceRepository.syncPendingRecords(user.authToken)
                                                isSyncing = false
                                                if (result.isSuccess) {
                                                    val count = result.getOrDefault(0)
                                                    if (count > 0) {
                                                        Toast.makeText(this@MainActivity, "Successfully synced $count attendance record(s)!", Toast.LENGTH_SHORT).show()
                                                    } else {
                                                        Toast.makeText(this@MainActivity, "All attendance records are synced!", Toast.LENGTH_SHORT).show()
                                                    }
                                                } else {
                                                    Toast.makeText(this@MainActivity, "Sync failed — saved locally. Will retry when connection is restored.", Toast.LENGTH_LONG).show()
                                                }
                                            }
                                        },
                                        onViewScheduleClick = { navController.navigate("schedule") },
                                        onViewHistoryClick = { navController.navigate("history") },
                                        isSyncing = isSyncing
                                    )
                                }
                            }

                            composable("schedule") {
                                StudentScheduleScreen(
                                    fullTimetable = fullTimetable,
                                    onMarkAttendanceClick = { item ->
                                        selectedTimetableItem = item
                                        bleScannerManager.startScan()
                                        navController.navigate("scanner")
                                    }
                                )
                            }

                            composable("scanner") {
                                val selectedItem = selectedTimetableItem
                                val user = currentUser
                                if (selectedItem != null && user != null) {
                                    AttendanceScannerScreen(
                                        timetableItem = selectedItem,
                                        user = user,
                                        discoveredBeacons = discoveredBeacons,
                                        isScanning = isScanning,
                                        onStartScan = { bleScannerManager.startScan() },
                                        onStopScan = { bleScannerManager.stopScan() },
                                        onMarkOfflineAttendance = { beacon ->
                                            lifecycleScope.launch {
                                                attendanceRepository.markAttendanceOffline(
                                                    sessionId = beacon.sessionId ?: selectedItem.id,
                                                    subjectId = selectedItem.subjectId,
                                                    subjectCode = selectedItem.subjectCode,
                                                    subjectName = selectedItem.subjectName,
                                                    classroomId = selectedItem.classroomId,
                                                    classroomName = selectedItem.classroomName,
                                                    sessionToken = beacon.sessionToken ?: "",
                                                    bleRssi = beacon.rssi
                                                )
                                                bleScannerManager.stopScan()
                                                Toast.makeText(this@MainActivity, "Attendance saved locally (PENDING_SYNC)", Toast.LENGTH_SHORT).show()
                                                // Trigger auto-sync worker if connected
                                                AttendanceSyncWorker.triggerImmediateSync(this@MainActivity)
                                            }
                                        },
                                        onViewHistoryClick = { navController.navigate("history") },
                                        onBack = {
                                            bleScannerManager.stopScan()
                                            navController.popBackStack()
                                        }
                                    )
                                }
                            }

                            composable("history") {
                                currentUser?.let { user ->
                                    HistoryScreen(
                                        records = allRecords,
                                        onRetrySync = {
                                            isSyncing = true
                                            lifecycleScope.launch {
                                                attendanceRepository.retryFailedRecords()
                                                val result = attendanceRepository.syncPendingRecords(user.authToken)
                                                isSyncing = false
                                                if (result.isSuccess) {
                                                    val count = result.getOrDefault(0)
                                                    Toast.makeText(this@MainActivity, "Synced $count records!", Toast.LENGTH_SHORT).show()
                                                } else {
                                                    Toast.makeText(this@MainActivity, "Sync failed — saved locally and will retry.", Toast.LENGTH_SHORT).show()
                                                }
                                            }
                                        },
                                        isSyncing = isSyncing,
                                        onBack = { navController.popBackStack() }
                                    )
                                }
                            }

                            composable("profile") {
                                currentUser?.let { user ->
                                    StudentProfileScreen(
                                        user = user,
                                        onLogoutClick = {
                                            lifecycleScope.launch {
                                                db.userDao().clearUser()
                                                currentUser = null
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
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            permissions.add(Manifest.permission.BLUETOOTH)
            permissions.add(Manifest.permission.BLUETOOTH_ADMIN)
        }
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
        permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }
}
