# Sensor MIDI Triggering System - Integration Guide

## System Architecture

The Sensor MIDI Triggering System is now fully integrated into GridSound DAW with the following components:

```
┌─────────────────────────────────────────────────────────────┐
│                    GridSound DAW                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Application Startup (src/run.js)                      │  │
│  │  - Loads sensorMidiTrigger.js                          │  │
│  │  - Loads sensorMidiIntegration.js                      │  │
│  │  - Initializes SensorMidiIntegration                   │  │
│  │  - Attaches sensor event listeners                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ▼                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SensorMidiIntegration                                 │  │
│  │  - Manages MIDI access                                 │  │
│  │  - Detects available sensors                           │  │
│  │  - Routes MIDI to DAW instruments                      │  │
│  │  - Provides UI control panel                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ▼                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SensorMidiTrigger                                     │  │
│  │  - Core sensor processing engine                       │  │
│  │  - Converts sensor data to MIDI messages               │  │
│  │  - Manages 6 sensor types                              │  │
│  │  - Handles calibration & configuration                 │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ▼                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Physical Sensors & Device APIs                        │  │
│  │  - Camera (Body Tracking, Gesture)                     │  │
│  │  - Bluetooth (Heart Rate)                              │  │
│  │  - DeviceMotionEvent (Accelerometer)                   │  │
│  │  - DeviceOrientationEvent (Gyroscope)                  │  │
│  │  - Touch Screen                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Application Startup (`src/run.js`)

The sensor MIDI system is loaded during DAW initialization:

```javascript
.then( () => GSUloadJSFile( "src/sensors/sensorMidiTrigger.js" ) )
.then( () => GSUloadJSFile( "src/sensors/sensorMidiIntegration.js" ) )
.then( () => {
    const daw = new GSDAW();
    const sensorIntegration = new SensorMidiIntegration( daw.getDAWCore?.() || daw );
    
    sensorIntegration.initialize().then( success => {
        if ( success ) {
            sensorIntegration.attachSensorListeners();
            window.$daw.$sensorMidi = sensorIntegration;
        }
    } );
} )
```

### 2. Accessing the System at Runtime

Once initialized, access the sensor MIDI system:

```javascript
// Get the integration instance
const sensorMidi = window.$daw.$sensorMidi;

// Check sensor status
const status = sensorMidi.getSensorStatus();
console.log( status );

// Enable/Disable all sensors
sensorMidi.sensorTrigger.enable();
sensorMidi.sensorTrigger.disable();

// Toggle specific sensor
sensorMidi.configureSensorMapping( "gesture", {
    "thumbs_up": { note: 62, velocity: 110 }
} );
```

### 3. MIDI Routing to DAW

The system expects the DAW core to implement these methods:

```javascript
// On MIDI Note On
dawCore.triggerNote( note, velocity, channel );

// On MIDI Note Off
dawCore.releaseNote( note, velocity, channel );

// On MIDI Control Change
dawCore.handleCC( controller, value, channel );
```

If these methods don't exist, the system provides fallback internal routing.

## Sensor Configuration

Each sensor can be configured with specific MIDI mappings:

### Body Tracking
```javascript
sensorMidi.configureSensorMapping( "bodyTracking", {
    channel: 1,
    noteRange: { min: 60, max: 84 },
    velocityMode: "dynamic",
    sensitivity: 0.5
} );
```

### Heart Rate
```javascript
sensorMidi.configureSensorMapping( "heartRate", {
    channel: 2,
    noteRange: { min: 48, max: 72 },
    velocityMode: "dynamic"
} );
```

### Gesture Recognition
```javascript
sensorMidi.configureSensorMapping( "gesture", {
    channel: 3,
    gestureMappings: {
        "thumbs_up": { note: 60, velocity: 100 },
        "open_palm": { note: 64, velocity: 120 }
    }
} );
```

### Accelerometer
```javascript
sensorMidi.configureSensorMapping( "accelerometer", {
    channel: 4,
    axisThresholds: { x: 15, y: 15, z: 15 },
    velocityMode: "dynamic"
} );
```

### Gyroscope
```javascript
sensorMidi.configureSensorMapping( "gyroscope", {
    channel: 5,
    rotationThresholds: { alpha: 10, beta: 10, gamma: 10 }
} );
```

### Touch Screen
```javascript
sensorMidi.configureSensorMapping( "touch", {
    channel: 6,
    noteRange: { min: 36, max: 120 },
    velocityMode: "dynamic"
} );
```

## UI Integration

The system provides a built-in UI panel with controls:

```javascript
// Get the UI panel
const panel = sensorMidi.getPanel();

// Append to your DAW UI
document.getElementById( "controls-container" ).appendChild( panel );
```

The panel includes:
- Individual toggles for each available sensor
- Main enable/disable button for all sensors
- Real-time status indicators

## Calibration

Calibrate sensors for improved accuracy:

```javascript
// Calibrate a single sensor (5 seconds)
await sensorMidi.calibrateSensor( "bodyTracking", 5000 );

// Or use default 5-second duration
await sensorMidi.calibrateSensor( "accelerometer" );
```

## Error Handling

The system gracefully handles missing sensors and API support:

```javascript
sensorIntegration.initialize().then( success => {
    if ( success ) {
        console.log( "Sensor MIDI initialized" );
        // Check which sensors are available
        const status = sensorMidi.getSensorStatus();
        console.log( "Active sensors:", status.activeSensors );
    } else {
        console.warn( "Sensor MIDI failed - using keyboard/MIDI controller only" );
    }
} ).catch( error => {
    console.error( "Sensor MIDI initialization error:", error );
} );
```

## Performance Considerations

- **Debouncing**: Each sensor includes debounce timing to prevent excessive MIDI messages
- **Sensitivity thresholds**: Adjustable per sensor to filter noisy data
- **GPU acceleration**: Pose detection and gesture recognition use hardware acceleration
- **Battery usage**: Motion sensors have minimal impact; disable if not needed

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Sensor MIDI System | ✅ | ✅ | ⚠️ | ✅ |
| MIDI API | ✅ | ⚠️ | ❌ | ✅ |
| Body Tracking | ✅ | ✅ | ✅ | ✅ |
| Bluetooth (Heart Rate) | ✅ | ✅ | ⚠️ | ✅ |
| Device Motion | ✅ | ✅ | ⚠️ | ✅ |

## File Structure

```
src/
├── run.js                          # Main app initialization
└── sensors/
    ├── sensorMidiTrigger.js        # Core sensor processing (11.6 KB)
    └── sensorMidiIntegration.js    # DAW integration layer (10 KB)

docs/
└── SENSOR_MIDI_GUIDE.md            # Comprehensive documentation

Total: ~22 KB of JavaScript code
```

## Troubleshooting

### Sensor not detected
- Verify browser supports the sensor API
- Check browser permissions (camera, Bluetooth, motion)
- Ensure device hardware supports the sensor

### MIDI not triggering notes
- Check DAW core implements `triggerNote()` method
- Verify sensor channel matches instrument MIDI channel
- Check sensor is enabled in UI panel

### Performance issues
- Increase debounce time for sensors
- Disable sensors not in use
- Check for multiple listeners attached to same event

## Future Enhancements

- [ ] EMG (electromyography) sensor support
- [ ] Eye-tracking MIDI control
- [ ] Haptic feedback for MIDI events
- [ ] Preset management for sensor configurations
- [ ] Recording sensor MIDI automation
- [ ] Multiplayer sensor collaboration
