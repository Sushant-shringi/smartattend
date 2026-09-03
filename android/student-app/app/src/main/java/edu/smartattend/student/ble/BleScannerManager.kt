package edu.smartattend.student.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.ParcelUuid
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

    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager?.adapter
    private val scanner = bluetoothAdapter?.bluetoothLeScanner

    private val SERVICE_UUID = UUID.fromString("0000feaa-0000-1000-8000-00805f9b34fb")
    private val PARCEL_SERVICE_UUID = ParcelUuid(SERVICE_UUID)

    private val _scanState = MutableStateFlow<List<DiscoveredBeacon>>(emptyList())
    val scanState: StateFlow<List<DiscoveredBeacon>> = _scanState.asStateFlow()

    private val _isScanning = MutableStateFlow(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()

    private val discoveredMap = mutableMapOf<String, DiscoveredBeacon>()

    private val scanCallback = object : ScanCallback() {
        @SuppressLint("MissingPermission")
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val device = result.device
            val scanRecord = result.scanRecord
            val rawName = scanRecord?.deviceName ?: device.name ?: ""
            val rssi = result.rssi

            // Check if beacon identifier, real session ID & session token are provided in service data
            val serviceData = scanRecord?.getServiceData(PARCEL_SERVICE_UUID)
            val serviceDataStr = if (serviceData != null && serviceData.isNotEmpty()) {
                String(serviceData, StandardCharsets.UTF_8)
            } else null

            val rawPayload = when {
                serviceDataStr != null && serviceDataStr.isNotBlank() -> serviceDataStr
                rawName.isNotBlank() -> rawName
                else -> null
            }

            if (rawPayload != null) {
                // Parse payload format: "SMARTATTEND-RM204#<sessionId>#<token>" or "SMARTATTEND-RM204#<token>" or "SMARTATTEND-RM204"
                var beaconName = rawPayload
                var sId: String? = null
                var sToken: String? = null

                if (rawPayload.contains("#")) {
                    val parts = rawPayload.split("#")
                    if (parts.size >= 3) {
                        beaconName = parts[0]
                        sId = parts[1].trim()
                        sToken = parts[2].trim()
                    } else if (parts.size == 2) {
                        beaconName = parts[0]
                        sToken = parts[1].trim()
                    }
                }

                // Filter strictly for authentic SmartAttend classroom BLE beacons
                if (beaconName.startsWith("SMARTATTEND-") || beaconName.contains("SMARTATTEND")) {
                    val beacon = DiscoveredBeacon(
                        deviceName = beaconName,
                        deviceAddress = device.address,
                        rssi = rssi,
                        isSignalAcceptable = rssi >= -85,
                        sessionId = if (!sId.isNullOrBlank()) sId else null,
                        sessionToken = if (!sToken.isNullOrBlank()) sToken else null
                    )
                    discoveredMap[device.address] = beacon
                    _scanState.value = discoveredMap.values.toList()
                }
            }
        }

        override fun onScanFailed(errorCode: Int) {
            _isScanning.value = false
        }
    }

    @SuppressLint("MissingPermission")
    fun startScan() {
        if (scanner == null || bluetoothAdapter?.isEnabled != true) return
        discoveredMap.clear()
        _scanState.value = emptyList()

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        scanner.startScan(null, settings, scanCallback)
        _isScanning.value = true
    }

    @SuppressLint("MissingPermission")
    fun stopScan() {
        try {
            scanner?.stopScan(scanCallback)
        } catch (e: Exception) {
            // Ignore if already stopped
        }
        _isScanning.value = false
    }
}
