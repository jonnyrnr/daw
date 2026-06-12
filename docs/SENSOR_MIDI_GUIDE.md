# Sensor MIDI Triggering System

## Overview

The Sensor MIDI Triggering System enables GridSound DAW to accept real-time input from various biometric and device sensors, converting sensor data into MIDI messages to trigger instruments and effects.

## Supported Sensors

### 1. Body Tracking (Pose Detection)
Captures full body or hand poses using computer vision and converts pose landmarks into MIDI notes.

**Setup:**
- Requires a front-facing camera
- Supports MediaPipe PoseLandmarker or similar pose detection libraries
- Maps 33+ keypoints to MIDI note ranges

**Configuration:**
```javascript
sensorTrigger.initSensor("bodyTracking", {
  enabled: true,
  channel: 1,
  noteRange: { min: 60, max: 84 },
  velocityMode: "dynamic", // Uses keypoint confidence
  sensitivity: 0.5,        // 0-1, higher = stricter confidence threshold
  debounceTime: 50
});
```

**Use Cases:**
- Dance-controlled musical performance
- Gesture-based melody playing
- Pose-triggered drum patterns

---

### 2. Heart Rate Sensor
Monitors biometric heart rate data and triggers MIDI on detected heartbeats.

**Setup:**
- Requires Web Bluetooth API support
- Compatible with Bluetooth heart rate monitors (Polar, Garmin, Apple Watch, etc.)
- Converts BPM to MIDI note pitch

**Configuration:**
```javascript
sensorTrigger.initSensor("heartRate", {
  enabled: false,
  channel: 2,
  noteRange: { min: 48, max: 72 },
  velocityMode: "dynamic",
  sensitivity: 0.3,
  beatPattern: [] // Optional: predefined beat patterns
});
```

**Use Cases:**
- Heartbeat-synchronized rhythms
- Pulse-driven bass lines
- Biofeedback compositions

---

### 3. Gesture Recognition
Recognizes hand gestures (thumbs up, pinch, open palm, etc.) and maps each to specific MIDI notes.

**Setup:**
- Requires MediaPipe GestureRecognizer
- Real-time hand tracking via camera
- 8+ predefined gesture types

**Configuration:**
```javascript
sensorTrigger.initSensor("gesture", {
  enabled: true,
  channel: 3,
  noteRange: { min: 36, max: 48 },
  velocityMode: "fixed",
  velocityValue: 100,
  gestureMappings: {
    "thumbs_up": { note: 60, velocity: 100 },
    "thumbs_down": { note: 55, velocity: 100 },
    "open_palm": { note: 64, velocity: 120 },
    "closed_fist": { note: 50, velocity: 80 },
    "pinch": { note: 72, velocity: 90 }
  },
  debounceTime: 200
});
```

**Use Cases:**
- Intuitive gesture-based controls
- Sign language-to-music translation
- Accessible performance interfaces

---

### 4. Accelerometer (Device Motion)
Detects linear acceleration on X, Y, Z axes and maps motion intensity to MIDI.

**Setup:**
- Built-in device accelerometer (phones, tablets, laptops)
- Requires DeviceMotionEvent permission
- Real-time motion capture

**Configuration:**
```javascript
sensorTrigger.initSensor("accelerometer", {
  enabled: false,
  channel: 4,
  noteRange: { min: 60, max: 96 },
  velocityMode: "dynamic",
  sensitivity: 1.0,
  axisThresholds: {
    x: 15, // m/s² threshold
    y: 15,
    z: 15
  },
  debounceTime: 100
});
```

**Use Cases:**
- Motion-controlled sequencers
- Shake-triggered effects
- Accelerometer-based drum machines

---

### 5. Gyroscope (Device Orientation)
Detects device rotation (alpha, beta, gamma) and converts to MIDI.

**Setup:**
- Built-in device gyroscope
- Requires DeviceOrientationEvent permission
- 3-axis rotation sensing

**Configuration:**
```javascript
sensorTrigger.initSensor("gyroscope", {
  enabled: false,
  channel: 5,
  noteRange: { min: 48, max: 84 },
  velocityMode: "dynamic",
  rotationThresholds: {
    alpha: 10, // degrees
    beta: 10,
    gamma: 10
  },
  debounceTime: 100
});
```

**Use Cases:**
- Tilt-controlled pitch modulation
- Rotation-based navigation
- Device orientation sequencing

---

### 6. Touch Sensor
Maps touch interactions to MIDI with configurable touch zones on screen.

**Setup:**
- Standard touch screen support
- Multi-touch capable
- Customizable zones (grid-based or custom)

**Configuration:**
```javascript
sensorTrigger.initSensor("touch", {
  enabled: true,
  channel: 6,
  noteRange: { min: 36, max: 120 },
  velocityMode: "dynamic",
  touchZones: [
    { x: 0, y: 0, width: 100, height: 100, note: 48 },
    { x: 100, y: 0, width: 100, height: 100, note: 50 }
    // ... more zones
  ],
  debounceTime: 50
});
```

**Use Cases:**
- Virtual keyboard performance
- Touch pad drum machines
- Screen-based MIDI controllers

---

## Integration with GridSound DAW

### Initialize Sensor MIDI System

```javascript
// In your DAW initialization code
const sensorIntegration = new SensorMidiIntegration( dawCore );
await sensorIntegration.initialize();

// Attach to DAW UI
const sensorPanel = sensorIntegration.getPanel();
document.getElementById("controls").appendChild( sensorPanel );

// Attach sensor event listeners
sensorIntegration.attachSensorListeners();

// Enable sensor MIDI triggering
sensorIntegration.sensorTrigger.enable();
```

### MIDI Routing

Sensor data is converted to standard MIDI messages and routed through:

1. **Note On**: `0x90 | channel, note, velocity`
2. **Note Off**: `0x80 | channel, note, 0`
3. **Control Change**: `0xB0 | channel, controller, value`

Each sensor can be assigned to different MIDI channels to control different DAW instruments.

---

## Calibration

Sensors can be calibrated to improve accuracy:

```javascript
// Calibrate a sensor for 5 seconds
await sensorIntegration.calibrateSensor( "bodyTracking", 5000 );

// Calibration data is stored internally
const calibrationData = sensorIntegration.sensorTrigger.calibrationData;
```

---

## Configuration Management

### Get Sensor Status

```javascript
const status = sensorIntegration.getSensorStatus();
console.log( status );
// {
//   allSensorsActive: true,
//   activeSensors: [ "bodyTracking", "touch", "gesture" ],
//   sensors: { ... }
// }
```

### Update Sensor Configuration

```javascript
sensorIntegration.configureSensorMapping( "gesture", {
  "thumbs_up": { note: 62, velocity: 110 }
} );
```

### Get Active Sensors

```javascript
const active = sensorIntegration.sensorTrigger.getActiveSensors();
console.log( active ); // [ "bodyTracking", "gesture", "touch" ]
```

---

## Velocity Modes

Control how MIDI velocity is calculated:

- **fixed**: Always use a fixed velocity value
- **dynamic**: Map sensor confidence/intensity to velocity (0-127)
- **pressure**: Use pressure/force data (for touch sensors)

---

## Performance Considerations

1. **Debouncing**: Each sensor includes debounce timing to prevent excessive MIDI messages
2. **Sensitivity**: Adjustable thresholds to filter noisy sensor data
3. **Channel Distribution**: Use different MIDI channels for different sensors to avoid conflicts
4. **GPU Acceleration**: Body tracking and gesture recognition use hardware acceleration

---

## Browser Compatibility

| Sensor | Chrome | Firefox | Safari | Mobile |
|--------|--------|---------|--------|--------|
| Body Tracking | ✅ | ✅ | ✅ | ✅ |
| Heart Rate | ✅ | ✅ | ⚠️ | ✅ |
| Gesture | ✅ | ✅ | ✅ | ✅ |
| Accelerometer | ✅ | ✅ | ⚠️ | ✅ |
| Gyroscope | ✅ | ✅ | ⚠️ | ✅ |
| Touch | ✅ | ✅ | ✅ | ✅ |

---

## Permissions Required

- **Camera**: For body tracking and gesture recognition
- **Bluetooth**: For heart rate sensors
- **Motion/Orientation**: For accelerometer and gyroscope (some browsers require HTTPS)

---

## Example: Create a Gesture-Controlled Synth

```javascript
// Initialize integration
const sensorIntegration = new SensorMidiIntegration( dawCore );
await sensorIntegration.initialize();

// Configure gesture sensor
sensorIntegration.configureSensorMapping( "gesture", {
  "thumbs_up": { note: 60, velocity: 100 },
  "thumbs_down": { note: 58, velocity: 100 },
  "open_palm": { note: 65, velocity: 120 },
  "pinch": { note: 67, velocity: 90 }
} );

// Attach listeners and enable
sensorIntegration.attachSensorListeners();
sensorIntegration.sensorTrigger.enable();

// Gestures now trigger synth notes!
```

---

## API Reference

See `sensorMidiTrigger.js` and `sensorMidiIntegration.js` for complete class documentation.

### Key Methods

- `initSensor(sensorType, config)` - Initialize a sensor
- `calibrateSensor(sensorType, duration)` - Calibrate a sensor
- `enable()` / `disable()` - Toggle sensor MIDI triggering
- `getActiveSensors()` - Get list of enabled sensors
- `configureSensorMapping(sensorType, mapping)` - Update sensor configuration
