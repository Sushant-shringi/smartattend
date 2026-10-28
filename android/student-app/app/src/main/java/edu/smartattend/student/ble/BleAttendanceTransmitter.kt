package edu.smartattend.student.ble

import android.annotation.SuppressLint
import android.bluetooth.*
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.util.UUID

object BleAttendanceTransmitter {

    private const val TAG = "SmartAttendTransmitter"

    val SERVICE_UUID: UUID = UUID.fromString("0000feaa-0000-1000-8000-00805f9b34fb")
    val ATTENDANCE_CHAR_UUID: UUID = UUID.fromString("0000feab-0000-1000-8000-00805f9b34fb")

    @SuppressLint("MissingPermission")
    fun transmitAttendanceEvent(
        context: Context,
        teacherDeviceAddress: String,
        attendanceId: String,
        sessionId: String,
        studentId: String,
        rollNumber: String,
        fullName: String,
        markedAt: String,
        bleRssi: Int,
        onResult: (Boolean, String?) -> Unit
    ) {
        Log.i(TAG, "==================================================")
        Log.i(TAG, "BLE TRANSMISSION START")
        Log.i(TAG, "attendance_id = $attendanceId")
        Log.i(TAG, "student_id = $studentId")
        Log.i(TAG, "session_id = $sessionId")
        Log.i(TAG, "target teacher device = $teacherDeviceAddress")
        Log.i(TAG, "RSSI = $bleRssi")
        Log.i(TAG, "==================================================")

        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter = bluetoothManager?.adapter

        if (adapter == null || !adapter.isEnabled) {
            Log.e(TAG, "GATT FAILED: Bluetooth is disabled")
            onResult(false, "Bluetooth is disabled")
            return
        }

        val device: BluetoothDevice = try {
            adapter.getRemoteDevice(teacherDeviceAddress)
        } catch (e: Exception) {
            Log.e(TAG, "GATT FAILED: Invalid teacher device address: ${e.message}")
            onResult(false, "Invalid teacher device address: ${e.message}")
            return
        }

        val payload = JSONObject().apply {
            put("attendance_id", attendanceId)
            put("event_id", attendanceId)
            put("session_id", sessionId)
            put("student_id", studentId)
            put("roll_number", rollNumber)
            put("full_name", fullName)
            put("marked_at", markedAt)
            put("ble_rssi", bleRssi)
        }.toString()

        val payloadBytes = payload.toByteArray(StandardCharsets.UTF_8)
        val mainHandler = Handler(Looper.getMainLooper())
        var gattInstance: BluetoothGatt? = null
        var isCompleted = false
        var servicesDiscovered = false

        // Timeout after 8 seconds to close GATT safely if no response
        val timeoutRunnable = Runnable {
            if (!isCompleted) {
                isCompleted = true
                Log.w(TAG, "GATT connection timed out")
                try {
                    gattInstance?.disconnect()
                    gattInstance?.close()
                } catch (e: Exception) {}
                Log.i(TAG, "DISCONNECTED (Timeout)")
                onResult(false, "Connection timeout to Teacher BLE")
            }
        }
        mainHandler.postDelayed(timeoutRunnable, 8000)

        val gattCallback = object : BluetoothGattCallback() {
            override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                Log.d(TAG, "onConnectionStateChange: status=$status, newState=$newState")
                if (status == BluetoothGatt.GATT_SUCCESS && newState == BluetoothProfile.STATE_CONNECTED) {
                    Log.i(TAG, "GATT CONNECTED to Teacher ${gatt.device.address}")
                    
                    // Request high MTU for immediate single-packet JSON transfer
                    Log.i(TAG, "REQUESTING MTU 512...")
                    val mtuRequested = gatt.requestMtu(512)
                    if (!mtuRequested) {
                        Log.w(TAG, "requestMtu returned false, proceeding directly to discoverServices")
                        gatt.discoverServices()
                    } else {
                        // Fallback discovery in case MTU callback is delayed
                        mainHandler.postDelayed({
                            if (!servicesDiscovered && !isCompleted) {
                                Log.i(TAG, "MTU callback delayed, starting discoverServices fallback...")
                                gatt.discoverServices()
                            }
                        }, 600)
                    }
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    Log.i(TAG, "DISCONNECTED from Teacher GATT Server (status=$status)")
                    try {
                        gatt.close()
                    } catch (e: Exception) {}
                }
            }

            override fun onMtuChanged(gatt: BluetoothGatt, mtu: Int, status: Int) {
                Log.i(TAG, "MTU CHANGED = $mtu, STATUS = $status")
                if (!servicesDiscovered) {
                    servicesDiscovered = true
                    Log.i(TAG, "Starting discoverServices after MTU negotiation...")
                    gatt.discoverServices()
                }
            }

            override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
                servicesDiscovered = true
                val discoveredSuccess = (status == BluetoothGatt.GATT_SUCCESS)
                Log.i(TAG, "SERVICE DISCOVERED = $discoveredSuccess")

                if (discoveredSuccess) {
                    val service = gatt.getService(SERVICE_UUID)
                    val characteristic = service?.getCharacteristic(ATTENDANCE_CHAR_UUID)
                    val charFound = (characteristic != null)
                    Log.i(TAG, "WRITE CHARACTERISTIC FOUND = $charFound")

                    if (characteristic != null) {
                        Log.i(TAG, "WRITE STARTED: Sending ${payloadBytes.size} bytes payload...")
                        characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT

                        val writeInitiated = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            val writeResult = gatt.writeCharacteristic(
                                characteristic,
                                payloadBytes,
                                BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
                            )
                            writeResult == BluetoothStatusCodes.SUCCESS
                        } else {
                            @Suppress("DEPRECATION")
                            characteristic.value = payloadBytes
                            @Suppress("DEPRECATION")
                            gatt.writeCharacteristic(characteristic)
                        }

                        if (!writeInitiated) {
                            Log.e(TAG, "WRITE INITIATION FAILED")
                            if (!isCompleted) {
                                isCompleted = true
                                mainHandler.removeCallbacks(timeoutRunnable)
                                try { gatt.disconnect(); gatt.close() } catch (e: Exception) {}
                                Log.i(TAG, "DISCONNECTED")
                                onResult(false, "Failed to initiate characteristic write")
                            }
                        }
                    } else {
                        if (!isCompleted) {
                            isCompleted = true
                            mainHandler.removeCallbacks(timeoutRunnable)
                            try { gatt.disconnect(); gatt.close() } catch (e: Exception) {}
                            Log.i(TAG, "DISCONNECTED")
                            onResult(false, "Attendance characteristic not found on Teacher device")
                        }
                    }
                } else {
                    if (!isCompleted) {
                        isCompleted = true
                        mainHandler.removeCallbacks(timeoutRunnable)
                        try { gatt.disconnect(); gatt.close() } catch (e: Exception) {}
                        Log.i(TAG, "DISCONNECTED")
                        onResult(false, "Service discovery failed: $status")
                    }
                }
            }

            override fun onCharacteristicWrite(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
                status: Int
            ) {
                Log.i(TAG, "WRITE CALLBACK")
                Log.i(TAG, "WRITE STATUS = $status (GATT_SUCCESS = ${status == BluetoothGatt.GATT_SUCCESS})")
                if (!isCompleted) {
                    isCompleted = true
                    mainHandler.removeCallbacks(timeoutRunnable)
                    val success = (status == BluetoothGatt.GATT_SUCCESS)
                    try {
                        gatt.disconnect()
                        gatt.close()
                    } catch (e: Exception) {}
                    Log.i(TAG, "DISCONNECTED")

                    if (success) {
                        Log.i(TAG, "✓ Attendance successfully delivered to Teacher over BLE!")
                        onResult(true, null)
                    } else {
                        onResult(false, "GATT Write failed with status: $status")
                    }
                }
            }
        }

        try {
            Log.i(TAG, "GATT CONNECTING to Teacher at ${device.address}...")
            gattInstance = device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
        } catch (e: Exception) {
            if (!isCompleted) {
                isCompleted = true
                mainHandler.removeCallbacks(timeoutRunnable)
                Log.e(TAG, "GATT CONNECT EXCEPTION: ${e.message}", e)
                onResult(false, "GATT connect exception: ${e.message}")
            }
        }
    }
}
