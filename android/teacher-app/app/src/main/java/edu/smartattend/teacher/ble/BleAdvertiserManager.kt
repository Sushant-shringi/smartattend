package edu.smartattend.teacher.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.nio.charset.StandardCharsets
import java.util.*

class BleAdvertiserManager(private val context: Context) {

    private val TAG = "SmartAttendBleAdv"

    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager?.adapter
    private val advertiser: BluetoothLeAdvertiser?
        get() = bluetoothAdapter?.bluetoothLeAdvertiser

    private val _isAdvertising = MutableStateFlow(false)
    val isAdvertising: StateFlow<Boolean> = _isAdvertising.asStateFlow()

    private val _activeBeaconName = MutableStateFlow<String?>(null)
    val activeBeaconName: StateFlow<String?> = _activeBeaconName.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // SmartAttend BLE Service UUID (16-bit 0xFEAA compatible)
    private val SERVICE_UUID = UUID.fromString("0000feaa-0000-1000-8000-00805f9b34fb")
    private val PARCEL_SERVICE_UUID = ParcelUuid(SERVICE_UUID)

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            Log.i(TAG, "✓ onStartSuccess: BLE Advertising active for beacon: ${_activeBeaconName.value}")
            _isAdvertising.value = true
            _errorMessage.value = null
        }

        override fun onStartFailure(errorCode: Int) {
            val errorText = when (errorCode) {
                ADVERTISE_FAILED_DATA_TOO_LARGE -> "ADVERTISE_FAILED_DATA_TOO_LARGE (Code 1): Broadcast payload exceeds 31-byte BLE limit."
                ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "ADVERTISE_FAILED_TOO_MANY_ADVERTISERS (Code 2): No advertising instances available."
                ADVERTISE_FAILED_ALREADY_STARTED -> "ADVERTISE_FAILED_ALREADY_STARTED (Code 3): Advertising is already running."
                ADVERTISE_FAILED_INTERNAL_ERROR -> "ADVERTISE_FAILED_INTERNAL_ERROR (Code 4): Internal Bluetooth controller error."
                ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "ADVERTISE_FAILED_FEATURE_UNSUPPORTED (Code 5): Device hardware does not support BLE advertising."
                else -> "BLE Advertising Failed with error code: $errorCode"
            }
            Log.e(TAG, "✗ onStartFailure: $errorText")
            _isAdvertising.value = false
            _activeBeaconName.value = null
            _errorMessage.value = errorText
        }
    }

    /**
     * Checks if physical hardware supports BLE advertising.
     */
    fun isBleAdvertisingSupported(): Boolean {
        return bluetoothAdapter != null &&
               bluetoothAdapter.isEnabled &&
               bluetoothAdapter.isMultipleAdvertisementSupported
    }

    @SuppressLint("MissingPermission")
    fun startAdvertising(beaconIdentifier: String) {
        val cleanIdentifier = beaconIdentifier.trim()
        _activeBeaconName.value = cleanIdentifier
        _errorMessage.value = null

        val currentAdvertiser = advertiser
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            val err = "Bluetooth is turned off. Please enable Bluetooth in settings."
            Log.e(TAG, err)
            _errorMessage.value = err
            _isAdvertising.value = false
            return
        }

        if (currentAdvertiser == null) {
            val err = "Bluetooth LE Advertiser not available on this device."
            Log.e(TAG, err)
            _errorMessage.value = err
            _isAdvertising.value = false
            return
        }

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(false)
            .setTimeout(0) // Advertise continuously until stopped
            .build()

        // Standard 17-byte payload: "SMARTATTEND-RM204" fits cleanly within 31-byte legacy limit
        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addServiceUuid(PARCEL_SERVICE_UUID)
            .addServiceData(PARCEL_SERVICE_UUID, cleanIdentifier.toByteArray(StandardCharsets.UTF_8))
            .build()

        try {
            // Stop any existing active advertisement before starting a new one
            currentAdvertiser.stopAdvertising(advertiseCallback)
        } catch (e: Exception) {
            // Ignore
        }

        try {
            Log.d(TAG, "Calling BluetoothLeAdvertiser.startAdvertising with identifier: $cleanIdentifier")
            currentAdvertiser.startAdvertising(settings, data, advertiseCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Exception starting BLE advertisement: ${e.message}", e)
            _isAdvertising.value = false
            _errorMessage.value = e.message
        }
    }

    @SuppressLint("MissingPermission")
    fun stopAdvertising() {
        try {
            advertiser?.stopAdvertising(advertiseCallback)
            Log.i(TAG, "BLE advertising stopped.")
        } catch (e: Exception) {
            // Ignore if already stopped
        }
        _isAdvertising.value = false
        _activeBeaconName.value = null
        _errorMessage.value = null
    }
}
