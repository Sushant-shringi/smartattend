/**
 * SmartAttend BLE Service & Demo Simulator Architecture
 * 
 * Supports:
 * 1. Web Bluetooth API (`navigator.bluetooth`) for real BLE peripheral scanning where supported.
 * 2. High-fidelity Interactive Demo BLE Adapter with controllable signal strength (RSSI),
 *    beacon discovery, and simulated classroom beacons.
 */

// Known SmartAttend Beacon Service UUID (Standard 128-bit)
const SMARTATTEND_SERVICE_UUID = '0000feaa-0000-1000-8000-00805f9b34fb';

class BleAdapter {
  constructor() {
    this.isScanning = false;
    this.isDemoMode = !Boolean(navigator?.bluetooth);
    this.listeners = new Set();
    this.simulatedBeacons = [
      {
        id: 'SMARTATTEND-RM204',
        name: 'Room 204 (Computing Block)',
        rssi: -58,
        classroom_id: '',
        txPower: -59,
        distanceMeters: 1.8,
        lastSeen: Date.now()
      },
      {
        id: 'SMARTATTEND-RM305',
        name: 'Room 305 (Main Science Block)',
        rssi: -78,
        classroom_id: '',
        txPower: -59,
        distanceMeters: 5.2,
        lastSeen: Date.now()
      },
      {
        id: 'SMARTATTEND-LAB102',
        name: 'Lab 102 (Innovation Wing)',
        rssi: -88,
        classroom_id: '',
        txPower: -59,
        distanceMeters: 9.5,
        lastSeen: Date.now()
      }
    ];
    this.demoRssiOffset = 0; // Adjustable by user in simulator UI
    this.activeDevice = null;
    this.scanInterval = null;
  }

  // Subscribe to discovered BLE beacons
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(beacons) {
    this.listeners.forEach((callback) => {
      try {
        callback(beacons);
      } catch (err) {
        console.error('BLE listener error:', err);
      }
    });
  }

  setDemoMode(enabled) {
    this.isDemoMode = enabled;
  }

  setSimulatedRssi(rssiValue) {
    if (this.simulatedBeacons.length > 0) {
      this.simulatedBeacons[0].rssi = Math.max(-99, Math.min(-20, rssiValue));
      this.simulatedBeacons[0].distanceMeters = this.calculateDistance(this.simulatedBeacons[0].rssi);
      this.notifyListeners([...this.simulatedBeacons]);
    }
  }

  calculateDistance(rssi, txPower = -59) {
    if (rssi === 0) return -1.0;
    const ratio = (txPower - rssi) / (10 * 2.0);
    return Math.round(Math.pow(10, ratio) * 10) / 10;
  }

  async startScanning() {
    this.isScanning = true;

    // 1. Try real Web Bluetooth if available and not explicitly in demo mode
    if (navigator.bluetooth && !this.isDemoMode) {
      try {
        console.log('[BLE] Requesting Web Bluetooth device...');
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: 'SMARTATTEND' }],
          optionalServices: ['generic_access', SMARTATTEND_SERVICE_UUID]
        });

        this.activeDevice = device;
        const rssi = -62; // Default estimated RSSI for web bluetooth connected device
        const discovered = [{
          id: device.name || 'SMARTATTEND-BEACON',
          name: device.name || 'SmartAttend Teacher Beacon',
          rssi: rssi,
          distanceMeters: this.calculateDistance(rssi),
          isRealBle: true,
          lastSeen: Date.now()
        }];
        this.notifyListeners(discovered);
        return discovered;
      } catch (err) {
        console.warn('[BLE] Web Bluetooth scan cancelled or unsupported. Falling back to Demo Adapter.', err);
        this.isDemoMode = true;
      }
    }

    // 2. High-fidelity Demo Simulation Adapter
    this.isDemoMode = true;
    this.runSimulatedScan();
  }

  runSimulatedScan() {
    if (this.scanInterval) clearInterval(this.scanInterval);

    // Broadcast discovered simulated beacons periodically with realistic signal jitter (±2 dBm)
    this.scanInterval = setInterval(() => {
      if (!this.isScanning) return;

      const updated = this.simulatedBeacons.map((beacon, idx) => {
        const jitter = Math.floor(Math.random() * 5) - 2;
        const currentRssi = Math.max(-95, Math.min(-30, beacon.rssi + jitter));
        return {
          ...beacon,
          rssi: currentRssi,
          distanceMeters: this.calculateDistance(currentRssi),
          lastSeen: Date.now()
        };
      });

      this.notifyListeners(updated);
    }, 1500);

    this.notifyListeners([...this.simulatedBeacons]);
  }

  stopScanning() {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  // Register an active classroom beacon into the simulator (called when student detects teacher session)
  registerActiveSessionBeacon(classroomBleIdentifier, classroomName = 'Active Classroom') {
    const existing = this.simulatedBeacons.find(b => b.id === classroomBleIdentifier);
    if (!existing) {
      this.simulatedBeacons.unshift({
        id: classroomBleIdentifier,
        name: classroomName,
        rssi: -54,
        distanceMeters: 1.4,
        lastSeen: Date.now()
      });
    } else {
      existing.rssi = -52;
      existing.lastSeen = Date.now();
    }
    if (this.isScanning) {
      this.notifyListeners([...this.simulatedBeacons]);
    }
  }
}

export const bleService = new BleAdapter();
