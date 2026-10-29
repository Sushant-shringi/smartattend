package edu.smartattend.student.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.nio.charset.StandardCharsets
import java.util.UUID

data class DiscoveredBeacon(
    val deviceName: String,
    val deviceAddress: String,
    val rssi: Int,
    val isSignalAcceptable: Boolean, // RSSI >= -85 dBm
    val sessionId: String? = null,    // REAL Teacher session ID from BLE air packet
    val sessionToken: String? = null  // REAL dynamic token from teacher broadcast
)

class BleScannerManager(private val context: Context) {

    private val TAG = "SmartAttendScanner"

    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? get() = bluetoothManager?.adapter
    private val scanner: BluetoothLeScanner? get() = bluetoothAdapter?.bluetoothLeScanner

    private val SERVICE_UUID = UUID.fromString("0000feaa-0000-1000-8000-00805f9b34fb")
    private val PARCEL_SERVICE_UUID = ParcelUuid(SERVICE_UUID)

    private val _scanState = MutableStateFlow<List<DiscoveredBeacon>>(emptyList())
    val scanState: StateFlow<List<DiscoveredBeacon>> = _scanState.asStateFlow()

    private val _isScanning = MutableStateFlow(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()

    private val discoveredMap = mutableMapOf<String, DiscoveredBeacon>()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isScanRestarting = false

    val isBluetoothEnabled: Boolean
        get() = bluetoothAdapter?.isEnabled == true

    // Watchdog to periodically refresh scan every 10 seconds if no beacon found yet
    // This prevents Android OS 30-second silent scan throttling
    private val scanWatchdogRunnable = object : Runnable {
        override fun run() {
            if (_isScanning.value && !isScanRestarting) {
                if (discoveredMap.isEmpty()) {
                    Log.d(TAG, "Watchdog cycling BLE scanner to maintain low-latency reception...")
                    restartScanInternal()
                }
            }
            if (_isScanning.value) {
                mainHandler.postDelayed(this, 10000)
            }
        }
    }

    private val scanCallback = object : ScanCallback() {
        @SuppressLint("MissingPermission")
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val device = result.device
            val scanRecord = result.scanRecord
            val rssi = result.rssi

            var rawPayload: String? = null

            // 1. Direct Service Data Lookup with PARCEL_SERVICE_UUID
            val directServiceData = scanRecord?.getServiceData(PARCEL_SERVICE_UUID)
            if (directServiceData != null && directServiceData.isNotEmpty()) {
                rawPayload = String(directServiceData, StandardCharsets.UTF_8).trim()
            }

            // 2. Iterate all serviceData map entries (handles 16-bit vs 128-bit ParcelUuid format variation across OEM stacks)
            if (rawPayload.isNullOrBlank() && scanRecord?.serviceData != null) {
                for ((uuid, bytes) in scanRecord.serviceData) {
                    if (bytes != null && bytes.isNotEmpty()) {
                        val str = String(bytes, StandardCharsets.UTF_8).trim()
                        if (str.contains("SMARTATTEND", ignoreCase = true) || uuid.toString().contains("feaa", ignoreCase = true)) {
                            rawPayload = str
                            break
                        }
                    }
                }
            }

            // 3. ScanRecord Device Name / BluetoothDevice Name
            if (rawPayload.isNullOrBlank()) {
                val devName = (scanRecord?.deviceName ?: device.name ?: "").trim()
                if (devName.contains("SMARTATTEND", ignoreCase = true)) {
                    rawPayload = devName
                }
            }

            // 4. Raw Packet Byte Inspection for "SMARTATTEND" (Bulletproof fallback across all Android vendors)
            if (rawPayload.isNullOrBlank() && scanRecord?.bytes != null) {
                val rawBytes = scanRecord.bytes
                val rawAscii = String(rawBytes, StandardCharsets.ISO_8859_1)
                val smartIndex = rawAscii.indexOf("SMARTATTEND")
                if (smartIndex >= 0) {
                    val sb = StringBuilder()
                    for (i in smartIndex until rawBytes.size) {
                        val b = rawBytes[i].toInt() and 0xFF
                        if (b in 32..126) {
                            sb.append(b.toChar())
                        } else {
                            break
                        }
                    }
                    val extracted = sb.toString().trim()
                    if (extracted.contains("SMARTATTEND", ignoreCase = true)) {
                        rawPayload = extracted
                    }
                }
            }

            if (!rawPayload.isNullOrBlank()) {
                var beaconName = rawPayload
                var sId: String? = null
                var sToken: String? = null

                if (rawPayload.contains("#")) {
                    val parts = rawPayload.split("#")
                    if (parts.size >= 3) {
                        beaconName = parts[0].trim()
                        sId = parts[1].trim()
                        sToken = parts[2].trim()
                    } else if (parts.size == 2) {
                        beaconName = parts[0].trim()
                        sToken = parts[1].trim()
                    }
                }

                if (beaconName.startsWith("SMARTATTEND", ignoreCase = true) || beaconName.contains("SMARTATTEND", ignoreCase = true)) {
                    val beacon = DiscoveredBeacon(
                        deviceName = beaconName,
                        deviceAddress = device.address,
                        rssi = rssi,
                        isSignalAcceptable = rssi >= -85,
                        sessionId = if (!sId.isNullOrBlank()) sId else null,
                        sessionToken = if (!sToken.isNullOrBlank()) sToken else null
                    )
                    Log.i(TAG, "✓ Discovered SmartAttend Beacon: ${beacon.deviceName} from ${device.address} (RSSI=$rssi dBm)")
                    discoveredMap[device.address] = beacon
                    _scanState.value = discoveredMap.values.toList()
                }
            }
        }

        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "BLE Scan failed with errorCode: $errorCode")
            if (errorCode == SCAN_FAILED_ALREADY_STARTED) {
                _isScanning.value = true
                return
            }
            _isScanning.value = false
            // Schedule safe retry after 1.5 seconds if scanner should be running
            mainHandler.postDelayed({
                if (!_isScanning.value && isBluetoothEnabled) {
                    startScan()
                }
            }, 1500)
        }
    }

    @SuppressLint("MissingPermission")
    fun startScan() {
        val currentAdapter = bluetoothAdapter
        if (currentAdapter == null || !currentAdapter.isEnabled) {
            Log.w(TAG, "Cannot start scan: Bluetooth adapter is disabled or null")
            _isScanning.value = false
            return
        }

        val currentScanner = scanner
        if (currentScanner == null) {
            Log.w(TAG, "Cannot start scan: BluetoothLeScanner is null")
            _isScanning.value = false
            return
        }

        try {
            val settings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setReportDelay(0)
                .apply {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
                        setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE)
                        setNumOfMatches(ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT)
                    }
                }
                .build()

            currentScanner.stopScan(scanCallback)
            currentScanner.startScan(null, settings, scanCallback)
            _isScanning.value = true
            Log.i(TAG, "✓ BLE Scanning started in LOW_LATENCY mode")

            mainHandler.removeCallbacks(scanWatchdogRunnable)
            mainHandler.postDelayed(scanWatchdogRunnable, 10000)
        } catch (e: Exception) {
            Log.e(TAG, "Exception in startScan: ${e.message}", e)
            _isScanning.value = false
        }
    }

    @SuppressLint("MissingPermission")
    private fun restartScanInternal() {
        if (!_isScanning.value || isScanRestarting) return
        val currentScanner = scanner ?: return
        isScanRestarting = true
        try {
            currentScanner.stopScan(scanCallback)
        } catch (e: Exception) {}

        mainHandler.postDelayed({
            isScanRestarting = false
            if (_isScanning.value && isBluetoothEnabled) {
                try {
                    val settings = ScanSettings.Builder()
                        .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                        .setReportDelay(0)
                        .apply {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
                                setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE)
                                setNumOfMatches(ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT)
                            }
                        }
                        .build()
                    currentScanner.startScan(null, settings, scanCallback)
                    Log.d(TAG, "BLE Scan refreshed successfully by watchdog")
                } catch (e: Exception) {
                    Log.e(TAG, "Error in watchdog restartScan: ${e.message}")
                }
            }
        }, 200)
    }

    @SuppressLint("MissingPermission")
    fun stopScan() {
        mainHandler.removeCallbacks(scanWatchdogRunnable)
        try {
            scanner?.stopScan(scanCallback)
        } catch (e: Exception) {
            // Ignore if already stopped
        }
        _isScanning.value = false
        Log.i(TAG, "BLE Scanning stopped")
    }
}
