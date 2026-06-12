"use strict";

/**
 * SensorMidiTrigger
 * Manages MIDI triggering from various sensors and biometric inputs
 */
class SensorMidiTrigger {
	constructor( midiOutput ) {
		this.midiOutput = midiOutput;
		this.sensorMaps = new Map();
		this.isActive = false;
		this.sensorConfigs = new Map();
		this.calibrationData = new Map();
		this.eventListeners = new Map();
	}

	/**
	 * Initialize a sensor type with specific configuration
	 * @param {string} sensorType - Type of sensor (bodyTracking, heartRate, gesture, accelerometer, etc.)
	 * @param {Object} config - Configuration object with MIDI mappings
	 */
	initSensor( sensorType, config = {} ) {
		const defaultConfig = {
			enabled: true,
			channel: 1,
			noteRange: { min: 36, max: 96 },
			velocityMode: "fixed", // fixed, dynamic, pressure
			velocityValue: 100,
			sensitivity: 1.0,
			calibrated: false,
			...config
		};

		this.sensorConfigs.set( sensorType, defaultConfig );

		// Initialize sensor-specific handlers
		switch ( sensorType ) {
			case "bodyTracking":
				this._initBodyTracking( defaultConfig );
				break;
			case "heartRate":
				this._initHeartRateSensor( defaultConfig );
				break;
			case "gesture":
				this._initGestureSensor( defaultConfig );
				break;
			case "accelerometer":
				this._initAccelerometer( defaultConfig );
				break;
			case "gyroscope":
				this._initGyroscope( defaultConfig );
				break;
			case "touch":
				this._initTouchSensor( defaultConfig );
				break;
		}
	}

	/**
	 * Body tracking initialization (pose detection via camera)
	 */
	_initBodyTracking( config ) {
		const bodyTrackingListener = ( poseData ) => {
			this._processPoseData( poseData, config );
		};

		this.eventListeners.set( "bodyTracking", bodyTrackingListener );
		this.sensorMaps.set( "bodyTracking", {
			keypoints: new Map(),
			lastTriggered: new Map(),
			debounceTime: config.debounceTime || 100
		} );
	}

	/**
	 * Process body pose data and convert to MIDI
	 */
	_processPoseData( poseData, config ) {
		if ( !config.enabled || !this.isActive ) return;

		// Map keypoints to MIDI notes
		poseData.keypoints?.forEach( ( keypoint, index ) => {
			if ( keypoint.score > config.sensitivity ) {
				const note = this._calculateNoteFromPosition( 
					keypoint, 
					index, 
					config.noteRange 
				);
				
				const velocity = this._calculateVelocity(
					keypoint.score,
					config
				);

				this._triggerMidiNote( note, velocity, config.channel );
			}
		} );
	}

	/**
	 * Heart rate sensor initialization
	 */
	_initHeartRateSensor( config ) {
		const heartRateListener = ( heartRateData ) => {
			this._processHeartRateData( heartRateData, config );
		};

		this.eventListeners.set( "heartRate", heartRateListener );
		this.sensorMaps.set( "heartRate", {
			lastBPM: 0,
			beatNotes: [],
			beatPattern: config.beatPattern || []
		} );
	}

	/**
	 * Process heart rate data and trigger MIDI on beats
	 */
	_processHeartRateData( heartRateData, config ) {
		if ( !config.enabled || !this.isActive ) return;

		const { bpm, isBeat } = heartRateData;
		const sensorMap = this.sensorMaps.get( "heartRate" );

		if ( isBeat ) {
			const note = this._mapBPMToNote( bpm, config.noteRange );
			const velocity = this._calculateVelocityFromBPM( bpm, config );
			
			this._triggerMidiNote( note, velocity, config.channel );
		}

		sensorMap.lastBPM = bpm;
	}

	/**
	 * Gesture sensor initialization (hand gestures, etc.)
	 */
	_initGestureSensor( config ) {
		const gestureListener = ( gestureData ) => {
			this._processGestureData( gestureData, config );
		};

		this.eventListeners.set( "gesture", gestureListener );
		this.sensorMaps.set( "gesture", {
			lastGesture: null,
			gestureMappings: config.gestureMappings || {},
			debounceTime: config.debounceTime || 200
		} );
	}

	/**
	 * Process gesture data and trigger MIDI
	 */
	_processGestureData( gestureData, config ) {
		if ( !config.enabled || !this.isActive ) return;

		const { type, confidence, position } = gestureData;
		const sensorMap = this.sensorMaps.get( "gesture" );

		if ( confidence > config.sensitivity && type !== sensorMap.lastGesture ) {
			const mapping = sensorMap.gestureMappings[ type ];
			if ( mapping ) {
				this._triggerMidiNote(
					mapping.note,
					mapping.velocity || 100,
					config.channel
				);
			}
			
			sensorMap.lastGesture = type;
		}
	}

	/**
	 * Accelerometer initialization (device motion)
	 */
	_initAccelerometer( config ) {
		const accelListener = ( accelData ) => {
			this._processAccelerometerData( accelData, config );
		};

		this.eventListeners.set( "accelerometer", accelListener );
		this.sensorMaps.set( "accelerometer", {
			lastTriggeredAxis: null,
			axisThresholds: config.axisThresholds || {
				x: 15,
				y: 15,
				z: 15
			},
			lastTriggerTime: 0
		} );
	}

	/**
	 * Process accelerometer data and trigger MIDI
	 */
	_processAccelerometerData( accelData, config ) {
		if ( !config.enabled || !this.isActive ) return;

		const sensorMap = this.sensorMaps.get( "accelerometer" );
		const now = Date.now();
		const debounce = config.debounceTime || 100;

		if ( now - sensorMap.lastTriggerTime < debounce ) return;

		Object.entries( accelData ).forEach( ( [ axis, value ] ) => {
			const threshold = sensorMap.axisThresholds[ axis ];
			const absValue = Math.abs( value );

			if ( absValue > threshold ) {
				const note = config.noteRange.min + 
					Math.floor( ( absValue - threshold ) * 
						( config.noteRange.max - config.noteRange.min ) / 50 );
				
				const velocity = Math.min( 
					127, 
					Math.floor( absValue * 2 ) 
				);

				this._triggerMidiNote( note, velocity, config.channel );
				sensorMap.lastTriggerTime = now;
			}
		} );
	}

	/**
	 * Gyroscope initialization (device rotation)
	 */
	_initGyroscope( config ) {
		const gyroListener = ( gyroData ) => {
			this._processGyroscopeData( gyroData, config );
		};

		this.eventListeners.set( "gyroscope", gyroListener );
		this.sensorMaps.set( "gyroscope", {
			lastTriggeredAxis: null,
			rotationThresholds: config.rotationThresholds || {
				alpha: 10,
				beta: 10,
				gamma: 10
			},
			lastTriggerTime: 0
		} );
	}

	/**
	 * Process gyroscope data and trigger MIDI
	 */
	_processGyroscopeData( gyroData, config ) {
		if ( !config.enabled || !this.isActive ) return;

		const sensorMap = this.sensorMaps.get( "gyroscope" );
		const now = Date.now();
		const debounce = config.debounceTime || 100;

		if ( now - sensorMap.lastTriggerTime < debounce ) return;

		Object.entries( gyroData ).forEach( ( [ axis, value ] ) => {
			const threshold = sensorMap.rotationThresholds[ axis ];
			const absValue = Math.abs( value );

			if ( absValue > threshold ) {
				const axisIndex = Object.keys( gyroData ).indexOf( axis );
				const baseNote = config.noteRange.min + ( axisIndex * 12 );
				const note = baseNote + Math.floor( absValue / 10 );

				this._triggerMidiNote( note, 100, config.channel );
				sensorMap.lastTriggerTime = now;
			}
		} );
	}

	/**
	 * Touch sensor initialization
	 */
	_initTouchSensor( config ) {
		const touchListener = ( touchData ) => {
			this._processTouchData( touchData, config );
		};

		this.eventListeners.set( "touch", touchListener );
		this.sensorMaps.set( "touch", {
			activeFingers: new Map(),
			touchZones: config.touchZones || [],
			lastTouchTime: 0
		} );
	}

	/**
	 * Process touch data and trigger MIDI
	 */
	_processTouchData( touchData, config ) {
		if ( !config.enabled || !this.isActive ) return;

		const sensorMap = this.sensorMaps.get( "touch" );

		touchData.touches?.forEach( ( touch ) => {
			const zone = this._findTouchZone( touch, sensorMap.touchZones );
			
			if ( zone ) {
				const note = zone.note || this._calculateNoteFromPosition(
					touch,
					zone.index || 0,
					config.noteRange
				);

				const velocity = touch.force ? 
					Math.floor( touch.force * 127 ) : 100;

				if ( !sensorMap.activeFingers.has( touch.identifier ) ) {
					this._triggerMidiNote( note, velocity, config.channel );
					sensorMap.activeFingers.set( touch.identifier, note );
				}
			}
		} );

		// Handle touch end
		touchData.endedTouches?.forEach( ( touch ) => {
			sensorMap.activeFingers.delete( touch.identifier );
		} );
	}

	/**
	 * Calculate MIDI note from spatial position
	 */
	_calculateNoteFromPosition( position, index, noteRange ) {
		const { min, max } = noteRange;
		const range = max - min;
		
		// Normalize position to 0-1
		const normalized = ( position.x || index ) / 1000; // Adjust divisor as needed
		const noteOffset = Math.floor( normalized * range );
		
		return Math.min( max, Math.max( min, min + noteOffset ) );
	}

	/**
	 * Calculate MIDI velocity based on confidence/pressure
	 */
	_calculateVelocity( confidence, config ) {
		switch ( config.velocityMode ) {
			case "dynamic":
				return Math.floor( confidence * 127 );
			case "pressure":
				return Math.floor( ( confidence || 0 ) * 127 );
			case "fixed":
			default:
				return config.velocityValue || 100;
		}
	}

	/**
	 * Map BPM to MIDI note
	 */
	_mapBPMToNote( bpm, noteRange ) {
		const { min, max } = noteRange;
		const range = max - min;
		
		// Normalize BPM (typically 40-200)
		const normalized = ( bpm - 40 ) / 160;
		const noteOffset = Math.floor( normalized * range );
		
		return Math.min( max, Math.max( min, min + noteOffset ) );
	}

	/**
	 * Calculate velocity from BPM
	 */
	_calculateVelocityFromBPM( bpm, config ) {
		const normalized = Math.max( 0, Math.min( 1, bpm / 200 ) );
		return Math.floor( normalized * 127 );
	}

	/**
	 * Find touch zone at position
	 */
	_findTouchZone( touch, zones ) {
		return zones.find( zone => 
			touch.clientX >= zone.x &&
			touch.clientX <= zone.x + zone.width &&
			touch.clientY >= zone.y &&
			touch.clientY <= zone.y + zone.height
		);
	}

	/**
	 * Trigger a MIDI note on/off
	 */
	_triggerMidiNote( note, velocity, channel ) {
		if ( !this.midiOutput ) return;

		note = Math.floor( Math.max( 0, Math.min( 127, note ) ) );
		velocity = Math.floor( Math.max( 0, Math.min( 127, velocity ) ) );

		// Send Note On
		const noteOnMessage = [
			0x90 | ( ( channel - 1 ) & 0x0F ),
			note,
			velocity
		];

		this.midiOutput.send( noteOnMessage );

		// Auto Note Off after short duration
		setTimeout( () => {
			const noteOffMessage = [
				0x80 | ( ( channel - 1 ) & 0x0F ),
				note,
				0
			];
			this.midiOutput.send( noteOffMessage );
		}, 100 );
	}

	/**
	 * Calibrate a sensor
	 */
	calibrateSensor( sensorType, calibrationData ) {
		this.calibrationData.set( sensorType, calibrationData );
		const config = this.sensorConfigs.get( sensorType );
		if ( config ) {
			config.calibrated = true;
		}
	}

	/**
	 * Enable sensor MIDI triggering
	 */
	enable() {
		this.isActive = true;
	}

	/**
	 * Disable sensor MIDI triggering
	 */
	disable() {
		this.isActive = false;
	}

	/**
	 * Get listener for a sensor type
	 */
	getListener( sensorType ) {
		return this.eventListeners.get( sensorType );
	}

	/**
	 * Get configuration for a sensor
	 */
	getConfig( sensorType ) {
		return this.sensorConfigs.get( sensorType );
	}

	/**
	 * Update sensor configuration
	 */
	updateConfig( sensorType, updates ) {
		const config = this.sensorConfigs.get( sensorType );
		if ( config ) {
			Object.assign( config, updates );
		}
	}

	/**
	 * Get all active sensors
	 */
	getActiveSensors() {
		return Array.from( this.sensorConfigs.entries() )
			.filter( ( [ , config ] ) => config.enabled )
			.map( ( [ type ] ) => type );
	}

	/**
	 * Reset all sensors
	 */
	reset() {
		this.isActive = false;
		this.sensorMaps.clear();
		this.sensorConfigs.clear();
		this.calibrationData.clear();
		this.eventListeners.clear();
	}
}
