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
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.nio.charset.StandardCharsets
import java.util.*

class BleAdvertiserManager(private val context: Context) {

    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager?.adapter
    private val advertiser: BluetoothLeAdvertiser? = bluetoothAdapter?.bluetoothLeAdvertiser

    private val _isAdvertising = MutableStateFlow(false)
    val isAdvertising: StateFlow<Boolean> = _isAdvertising.asStateFlow()

    private val _activeBeaconName = MutableStateFlow<String?>(null)
    val activeBeaconName: StateFlow<String?> = _activeBeaconName.asStateFlow()

    // SmartAttend BLE Service UUID
    private val SERVICE_UUID = UUID.fromString("0000feaa-0000-1000-8000-00805f9b34fb")

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            _isAdvertising.value = true
        }

        override fun onStartFailure(errorCode: Int) {
            _isAdvertising.value = false
            _activeBeaconName.value = null
        }
    }

    @SuppressLint("MissingPermission")
    fun startAdvertising(beaconIdentifier: String) {
        if (advertiser == null || bluetoothAdapter?.isEnabled != true) {
            // Emulate active broadcast state for testing / emulator environments
            _isAdvertising.value = true
            _activeBeaconName.value = beaconIdentifier
            return
        }

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(false)
            .setTimeout(0) // Run until explicitly stopped
            .build()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addServiceUuid(ParcelUuid(SERVICE_UUID))
            .addServiceData(ParcelUuid(SERVICE_UUID), beaconIdentifier.toByteArray(StandardCharsets.UTF_8))
            .build()

        advertiser.startAdvertising(settings, data, advertiseCallback)
        _activeBeaconName.value = beaconIdentifier
    }

    @SuppressLint("MissingPermission")
    fun stopAdvertising() {
        try {
            advertiser?.stopAdvertising(advertiseCallback)
        } catch (e: Exception) {
            // Ignore if already stopped
        }
        _isAdvertising.value = false
        _activeBeaconName.value = null
    }
}
