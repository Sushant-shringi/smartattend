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
    val isSignalAcceptable: Boolean // RSSI >= -85 dBm
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

            // Check if beacon identifier is provided in service data
            val serviceData = scanRecord?.getServiceData(PARCEL_SERVICE_UUID)
            val serviceDataName = if (serviceData != null && serviceData.isNotEmpty()) {
                String(serviceData, StandardCharsets.UTF_8)
            } else null

            val effectiveName = when {
                serviceDataName != null && serviceDataName.isNotBlank() -> serviceDataName
                rawName.isNotBlank() -> rawName
                else -> null
            }

            // Filter for SmartAttend classroom beacons
            if (effectiveName != null && (effectiveName.startsWith("SMARTATTEND-") || effectiveName.contains("SMARTATTEND"))) {
                val beacon = DiscoveredBeacon(
                    deviceName = effectiveName,
                    deviceAddress = device.address,
                    rssi = rssi,
                    isSignalAcceptable = rssi >= -85
                )
                discoveredMap[device.address] = beacon
                _scanState.value = discoveredMap.values.toList()
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

    /**
     * For demonstration & offline testing without physical BLE peripherals:
     * simulates discovering a classroom beacon at a verified RSSI.
     */
    fun simulateDiscoveredBeacon(beaconName: String = "SMARTATTEND-RM204", rssi: Int = -62) {
        val simulated = DiscoveredBeacon(
            deviceName = beaconName,
            deviceAddress = "00:11:22:33:44:55",
            rssi = rssi,
            isSignalAcceptable = rssi >= -85
        )
        discoveredMap[simulated.deviceAddress] = simulated
        _scanState.value = discoveredMap.values.toList()
    }
}
