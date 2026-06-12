"use strict";

/**
 * SensorMidiIntegration
 * Integrates sensor MIDI triggering with the GridSound DAW
 */
class SensorMidiIntegration {
	constructor( dawCore ) {
		this.dawCore = dawCore;
		this.sensorTrigger = null;
		this.midiAccess = null;
		this.midiOutput = null;
		this.sensors = new Map();
		this.ui = null;
	}

	/**
	 * Initialize MIDI access and sensor triggering
	 */
	async initialize() {
		try {
			// Request MIDI access
			this.midiAccess = await navigator.requestMIDIAccess();
			
			// Use first available MIDI output or create virtual output
			const outputs = this.midiAccess.outputs.values();
			this.midiOutput = outputs.next().value || this._createVirtualOutput();

			// Initialize sensor MIDI trigger
			this.sensorTrigger = new SensorMidiTrigger( this.midiOutput );

			// Initialize all available sensors
			this._initializeAvailableSensors();

			// Setup UI controls
			this._setupUI();

			console.log( "Sensor MIDI Integration initialized successfully" );
			return true;
		} catch ( error ) {
			console.error( "Failed to initialize Sensor MIDI Integration:", error );
			return false;
		}
	}

	/**
	 * Initialize all available sensors based on device capabilities
	 */
	_initializeAvailableSensors() {
		// Body Tracking (requires camera permission and pose detection library)
		if ( typeof PoseLandmarker !== "undefined" || typeof MediaPipe !== "undefined" ) {
			this.sensorTrigger.initSensor( "bodyTracking", {
				enabled: true,
				channel: 1,
				noteRange: { min: 60, max: 84 },
				velocityMode: "dynamic",
				sensitivity: 0.5,
				debounceTime: 50
			} );
			this.sensors.set( "bodyTracking", { status: "ready" } );
		}

		// Heart Rate Sensor (via Web Bluetooth API)
		if ( "bluetooth" in navigator ) {
			this.sensorTrigger.initSensor( "heartRate", {
				enabled: false,
				channel: 2,
				noteRange: { min: 48, max: 72 },
				velocityMode: "dynamic",
				sensitivity: 0.3,
				beatPattern: []
			} );
			this.sensors.set( "heartRate", { status: "available" } );
		}

		// Gesture Recognition
		if ( typeof GestureRecognizer !== "undefined" || typeof MediaPipe !== "undefined" ) {
			this.sensorTrigger.initSensor( "gesture", {
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
			} );
			this.sensors.set( "gesture", { status: "ready" } );
		}

		// Accelerometer (Device Motion)
		if ( "DeviceMotionEvent" in window ) {
			this.sensorTrigger.initSensor( "accelerometer", {
				enabled: false,
				channel: 4,
				noteRange: { min: 60, max: 96 },
				velocityMode: "dynamic",
				sensitivity: 1.0,
				axisThresholds: {
					x: 15,
					y: 15,
					z: 15
				},
				debounceTime: 100
			} );
			this.sensors.set( "accelerometer", { status: "available" } );
		}

		// Gyroscope (Device Orientation)
		if ( "DeviceOrientationEvent" in window ) {
			this.sensorTrigger.initSensor( "gyroscope", {
				enabled: false,
				channel: 5,
				noteRange: { min: 48, max: 84 },
				velocityMode: "dynamic",
				rotationThresholds: {
					alpha: 10,
					beta: 10,
					gamma: 10
				},
				debounceTime: 100
			} );
			this.sensors.set( "gyroscope", { status: "available" } );
		}

		// Touch Sensor
		if ( "ontouchstart" in window ) {
			this.sensorTrigger.initSensor( "touch", {
				enabled: true,
				channel: 6,
				noteRange: { min: 36, max: 120 },
				velocityMode: "dynamic",
				touchZones: this._createDefaultTouchZones(),
				debounceTime: 50
			} );
			this.sensors.set( "touch", { status: "ready" } );
		}
	}

	/**
	 * Create default touch zones for the UI
	 */
	_createDefaultTouchZones() {
		const zones = [];
		const screenWidth = window.innerWidth;
		const screenHeight = window.innerHeight;
		const cols = 8;
		const rows = 4;
		const zoneWidth = screenWidth / cols;
		const zoneHeight = screenHeight / rows;

		for ( let y = 0; y < rows; y++ ) {
			for ( let x = 0; x < cols; x++ ) {
				zones.push( {
					x: x * zoneWidth,
					y: y * zoneHeight,
					width: zoneWidth,
					height: zoneHeight,
					index: y * cols + x,
					note: 48 + ( y * cols + x ) // Maps to MIDI notes starting from 48
				} );
			}
		}

		return zones;
	}

	/**
	 * Create virtual MIDI output if no hardware available
	 */
	_createVirtualOutput() {
		// Fallback to internal MIDI queue
		return {
			send: ( message ) => {
				this._handleInternalMidi( message );
			}
		};
	}

	/**
	 * Handle internal MIDI messages
	 */
	_handleInternalMidi( message ) {
		const [ status, data1, data2 ] = message;
		const command = status >> 4;
		const channel = ( status & 0x0F ) + 1;

		switch ( command ) {
			case 0x9: // Note On
				this._handleNoteOn( data1, data2, channel );
				break;
			case 0x8: // Note Off
				this._handleNoteOff( data1, data2, channel );
				break;
			case 0xB: // Control Change
				this._handleControlChange( data1, data2, channel );
				break;
		}
	}

	/**
	 * Handle MIDI Note On
	 */
	_handleNoteOn( note, velocity, channel ) {
		// Route to DAW core
		if ( this.dawCore && typeof this.dawCore.triggerNote === "function" ) {
			this.dawCore.triggerNote( note, velocity, channel );
		}
	}

	/**
	 * Handle MIDI Note Off
	 */
	_handleNoteOff( note, velocity, channel ) {
		if ( this.dawCore && typeof this.dawCore.releaseNote === "function" ) {
			this.dawCore.releaseNote( note, velocity, channel );
		}
	}

	/**
	 * Handle MIDI Control Change
	 */
	_handleControlChange( controller, value, channel ) {
		if ( this.dawCore && typeof this.dawCore.handleCC === "function" ) {
			this.dawCore.handleCC( controller, value, channel );
		}
	}

	/**
	 * Setup UI for sensor management
	 */
	_setupUI() {
		// Create sensor control panel
		const panel = document.createElement( "div" );
		panel.id = "sensor-midi-panel";
		panel.className = "sensor-midi-panel";

		// Create toggle buttons for each sensor
		this.sensors.forEach( ( sensorData, sensorType ) => {
			const button = document.createElement( "button" );
			button.textContent = `${sensorType} (${sensorData.status})`;
			button.onclick = () => this._toggleSensor( sensorType );
			panel.appendChild( button );
		} );

		// Create main enable/disable button
		const mainToggle = document.createElement( "button" );
		mainToggle.id = "sensor-midi-main-toggle";
		mainToggle.textContent = "Enable Sensor MIDI";
		mainToggle.onclick = () => this._toggleAllSensors( mainToggle );
		panel.appendChild( mainToggle );

		this.ui = panel;
		return panel;
	}

	/**
	 * Toggle a specific sensor
	 */
	_toggleSensor( sensorType ) {
		const config = this.sensorTrigger.getConfig( sensorType );
		if ( config ) {
			config.enabled = !config.enabled;
			console.log( `Sensor "${sensorType}" ${config.enabled ? "enabled" : "disabled"}` );
		}
	}

	/**
	 * Toggle all sensors on/off
	 */
	_toggleAllSensors( button ) {
		const isActive = this.sensorTrigger.isActive;
		
		if ( isActive ) {
			this.sensorTrigger.disable();
			button.textContent = "Enable Sensor MIDI";
			button.classList.remove( "active" );
		} else {
			this.sensorTrigger.enable();
			button.textContent = "Disable Sensor MIDI";
			button.classList.add( "active" );
		}
	}

	/**
	 * Attach sensor event listeners
	 */
	attachSensorListeners() {
		// Attach body tracking listener
		if ( window.poseDetector ) {
			const listener = this.sensorTrigger.getListener( "bodyTracking" );
			if ( listener ) {
				window.poseDetector.onPose = listener;
			}
		}

		// Attach gesture listener
		if ( window.gestureRecognizer ) {
			const listener = this.sensorTrigger.getListener( "gesture" );
			if ( listener ) {
				window.gestureRecognizer.onGesture = listener;
			}
		}

		// Attach device motion listener
		const accelListener = this.sensorTrigger.getListener( "accelerometer" );
		if ( accelListener && "DeviceMotionEvent" in window ) {
			window.addEventListener( "devicemotion", ( event ) => {
				accelListener( event.acceleration );
			} );
		}

		// Attach device orientation listener
		const gyroListener = this.sensorTrigger.getListener( "gyroscope" );
		if ( gyroListener && "DeviceOrientationEvent" in window ) {
			window.addEventListener( "deviceorientation", ( event ) => {
				gyroListener( {
					alpha: event.alpha,
					beta: event.beta,
					gamma: event.gamma
				} );
			} );
		}

		// Attach touch listener
		const touchListener = this.sensorTrigger.getListener( "touch" );
		if ( touchListener ) {
			document.addEventListener( "touchstart", ( event ) => {
				touchListener( { touches: Array.from( event.touches ) } );
			} );
			document.addEventListener( "touchend", ( event ) => {
				touchListener( { 
					touches: Array.from( event.touches ),
					endedTouches: Array.from( event.changedTouches )
				} );
			} );
		}
	}

	/**
	 * Calibrate a sensor
	 */
	calibrateSensor( sensorType, duration = 5000 ) {
		return new Promise( ( resolve ) => {
			console.log( `Calibrating ${sensorType} for ${duration}ms...` );
			setTimeout( () => {
				this.sensorTrigger.calibrateSensor( sensorType, {} );
				resolve( true );
			}, duration );
		} );
	}

	/**
	 * Get UI panel
	 */
	getPanel() {
		return this.ui;
	}

	/**
	 * Get sensor status
	 */
	getSensorStatus() {
		return {
			allSensorsActive: this.sensorTrigger.isActive,
			activeSensors: this.sensorTrigger.getActiveSensors(),
			sensors: Object.fromEntries( this.sensors )
		};
	}

	/**
	 * Configure sensor MIDI mapping
	 */
	configureSensorMapping( sensorType, mapping ) {
		const config = this.sensorTrigger.getConfig( sensorType );
		if ( config ) {
			this.sensorTrigger.updateConfig( sensorType, mapping );
			console.log( `Updated ${sensorType} mapping:`, mapping );
		}
	}

	/**
	 * Cleanup and release resources
	 */
	destroy() {
		this.sensorTrigger.reset();
		if ( this.ui && this.ui.parentNode ) {
			this.ui.parentNode.removeChild( this.ui );
		}
	}
}
