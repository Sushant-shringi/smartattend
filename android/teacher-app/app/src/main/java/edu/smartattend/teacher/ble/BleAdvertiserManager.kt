package edu.smartattend.teacher.ble

import android.annotation.SuppressLint
import android.bluetooth.*
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
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.util.*

data class BleAttendanceEvent(
    val attendanceId: String,
    val sessionId: String,
    val studentId: String,
    val rollNumber: String,
    val fullName: String,
    val markedAt: String,
    val bleRssi: Int?,
    val authProof: String? = null
)

class BleAdvertiserManager(private val context: Context) {

    private val TAG = "SmartAttendBleAdv"

    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager?.adapter
    private val advertiser: BluetoothLeAdvertiser?
        get() = bluetoothAdapter?.bluetoothLeAdvertiser

    private var gattServer: BluetoothGattServer? = null
    private var onAttendanceReceivedListener: ((BleAttendanceEvent) -> Unit)? = null
    private var activeSessionId: String? = null

    private val _isAdvertising = MutableStateFlow(false)
    val isAdvertising: StateFlow<Boolean> = _isAdvertising.asStateFlow()

    private val _activeBeaconName = MutableStateFlow<String?>(null)
    val activeBeaconName: StateFlow<String?> = _activeBeaconName.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // SmartAttend BLE Service & Characteristic UUIDs
    val SERVICE_UUID: UUID = UUID.fromString("0000feaa-0000-1000-8000-00805f9b34fb")
    val ATTENDANCE_CHAR_UUID: UUID = UUID.fromString("0000feab-0000-1000-8000-00805f9b34fb")
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

    private val preparedBuffers = java.util.concurrent.ConcurrentHashMap<String, java.io.ByteArrayOutputStream>()

    private val gattServerCallback = object : BluetoothGattServerCallback() {
        override fun onConnectionStateChange(device: BluetoothDevice?, status: Int, newState: Int) {
            val stateName = when (newState) {
                BluetoothProfile.STATE_CONNECTED -> "CONNECTED"
                BluetoothProfile.STATE_DISCONNECTED -> "DISCONNECTED"
                BluetoothProfile.STATE_CONNECTING -> "CONNECTING"
                BluetoothProfile.STATE_DISCONNECTING -> "DISCONNECTING"
                else -> "STATE_$newState"
            }
            Log.i(TAG, "GATT Server Connection state change: device=${device?.address}, status=$status, newState=$stateName")
            if (newState == BluetoothProfile.STATE_DISCONNECTED && device != null) {
                preparedBuffers.remove(device.address)
            }
        }

        override fun onMtuChanged(device: BluetoothDevice?, mtu: Int) {
            Log.i(TAG, "GATT Server MTU changed: device=${device?.address}, mtu=$mtu")
        }

        @SuppressLint("MissingPermission")
        override fun onCharacteristicWriteRequest(
            device: BluetoothDevice?,
            requestId: Int,
            characteristic: BluetoothGattCharacteristic?,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            val devAddr = device?.address ?: "UNKNOWN"
            Log.i(TAG, "==================================================")
            Log.i(TAG, "GATT SERVER WRITE RECEIVED")
            Log.i(TAG, "device_address = $devAddr")
            Log.i(TAG, "characteristic = ${characteristic?.uuid}")
            Log.i(TAG, "payload_size = ${value?.size ?: 0} bytes (offset=$offset, prepared=$preparedWrite)")

            if (characteristic?.uuid == ATTENDANCE_CHAR_UUID && value != null) {
                if (preparedWrite || offset > 0) {
                    val buffer = preparedBuffers.getOrPut(devAddr) { java.io.ByteArrayOutputStream() }
                    buffer.write(value)
                    Log.d(TAG, "GATT Server buffered ${value.size} bytes (total buffered: ${buffer.size()})")
                    if (responseNeeded && device != null) {
                        gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                    }
                    Log.i(TAG, "==================================================")
                    return
                }

                // Single-packet direct write
                val success = processAttendancePayload(value, devAddr)
                if (responseNeeded && device != null) {
                    val gattStatus = if (success) BluetoothGatt.GATT_SUCCESS else BluetoothGatt.GATT_FAILURE
                    gattServer?.sendResponse(device, requestId, gattStatus, offset, value)
                }
                Log.i(TAG, "==================================================")
                return
            }

            if (responseNeeded && device != null) {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, offset, null)
            }
            Log.i(TAG, "==================================================")
        }

        @SuppressLint("MissingPermission")
        override fun onExecuteWrite(device: BluetoothDevice?, requestId: Int, execute: Boolean) {
            val devAddr = device?.address ?: "UNKNOWN"
            Log.i(TAG, "GATT Server onExecuteWrite: device=$devAddr, execute=$execute")
            var success = false
            if (execute) {
                val buffer = preparedBuffers.remove(devAddr)
                if (buffer != null && buffer.size() > 0) {
                    val fullPayload = buffer.toByteArray()
                    Log.i(TAG, "Executing write for accumulated payload: ${fullPayload.size} bytes")
                    success = processAttendancePayload(fullPayload, devAddr)
                }
            } else {
                preparedBuffers.remove(devAddr)
                success = true
            }

            if (device != null) {
                val gattStatus = if (success) BluetoothGatt.GATT_SUCCESS else BluetoothGatt.GATT_FAILURE
                gattServer?.sendResponse(device, requestId, gattStatus, 0, null)
            }
        }
    }

    private fun processAttendancePayload(bytes: ByteArray, devAddr: String): Boolean {
        return try {
            val jsonStr = String(bytes, StandardCharsets.UTF_8).trim()
            Log.i(TAG, "✓ Received Student Attendance Event over BLE: $jsonStr")
            val json = JSONObject(jsonStr)

            val rawAttendanceId = json.optString("attendance_id", json.optString("event_id", UUID.randomUUID().toString()))
            val rawSessionId = json.optString("session_id", "")
            val studentId = json.optString("student_id", "")
            val rollNumber = json.optString("roll_number", "")
            val fullName = json.optString("full_name", "Student")
            val markedAt = json.optString("marked_at", "")
            val bleRssi = if (json.has("ble_rssi")) json.optInt("ble_rssi") else null
            val authProof = if (json.has("auth_proof")) json.optString("auth_proof") else null

            Log.i(TAG, "session_id = $rawSessionId")
            Log.i(TAG, "attendance_id = $rawAttendanceId")
            Log.i(TAG, "TEACHER ACTIVE SESSION = $activeSessionId")
            Log.i(TAG, "RECEIVED BLE SESSION = $rawSessionId")

            val effectiveSessionId = if (!activeSessionId.isNullOrBlank()) activeSessionId!! else rawSessionId

            val event = BleAttendanceEvent(
                attendanceId = rawAttendanceId,
                sessionId = effectiveSessionId,
                studentId = studentId,
                rollNumber = rollNumber,
                fullName = fullName,
                markedAt = markedAt,
                bleRssi = bleRssi,
                authProof = authProof
            )

            // Notify listener immediately
            onAttendanceReceivedListener?.invoke(event)
            true
        } catch (e: Exception) {
            Log.e(TAG, "BLE PAYLOAD PARSE FAILED: ${e.message} (Payload size=${bytes.size})", e)
            false
        }
    }

    fun setOnAttendanceReceivedListener(listener: (BleAttendanceEvent) -> Unit) {
        this.onAttendanceReceivedListener = listener
    }

    fun isBleAdvertisingSupported(): Boolean {
        return bluetoothAdapter != null &&
               bluetoothAdapter.isEnabled &&
               bluetoothAdapter.isMultipleAdvertisementSupported
    }

    @SuppressLint("MissingPermission")
    fun startAdvertising(beaconIdentifier: String, sessionId: String? = null) {
        val cleanIdentifier = beaconIdentifier.trim()
        _activeBeaconName.value = cleanIdentifier
        _errorMessage.value = null
        this.activeSessionId = sessionId

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

        // Start GATT Server to receive attendance from student devices
        startGattServer()

        // Advertise as connectable so students can write attendance to GATT characteristic
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true) // Connectable for GATT write
            .setTimeout(0)
            .build()

        // Standard 17-byte payload: "SMARTATTEND-RM204"
        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addServiceUuid(PARCEL_SERVICE_UUID)
            .addServiceData(PARCEL_SERVICE_UUID, cleanIdentifier.toByteArray(StandardCharsets.UTF_8))
            .build()

        try {
            currentAdvertiser.stopAdvertising(advertiseCallback)
        } catch (e: Exception) {}

        try {
            Log.d(TAG, "Calling BluetoothLeAdvertiser.startAdvertising with identifier: $cleanIdentifier (connectable=true)")
            currentAdvertiser.startAdvertising(settings, data, advertiseCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Exception starting BLE advertisement: ${e.message}", e)
            _isAdvertising.value = false
            _errorMessage.value = e.message
        }
    }

    @SuppressLint("MissingPermission")
    private fun startGattServer() {
        if (gattServer != null || bluetoothManager == null) return
        try {
            gattServer = bluetoothManager.openGattServer(context, gattServerCallback)
            val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)

            val characteristic = BluetoothGattCharacteristic(
                ATTENDANCE_CHAR_UUID,
                BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
                BluetoothGattCharacteristic.PERMISSION_WRITE
            )

            service.addCharacteristic(characteristic)
            gattServer?.addService(service)
            Log.i(TAG, "✓ BLE GATT Server opened with Service: $SERVICE_UUID and Characteristic: $ATTENDANCE_CHAR_UUID")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting GATT server: ${e.message}", e)
        }
    }

    @SuppressLint("MissingPermission")
    fun stopAdvertising() {
        try {
            advertiser?.stopAdvertising(advertiseCallback)
            Log.i(TAG, "BLE advertising stopped.")
        } catch (e: Exception) {}

        try {
            gattServer?.close()
            gattServer = null
            Log.i(TAG, "BLE GATT Server closed.")
        } catch (e: Exception) {}

        _isAdvertising.value = false
        _activeBeaconName.value = null
        _errorMessage.value = null
        activeSessionId = null
    }
}
