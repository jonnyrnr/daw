"use strict";

document.addEventListener( "gsui", ( { detail: d } ) => console.warn( `uncatched event: "${ d.$event }"`, d.$args, d.$target ) );

new Promise( resolve => {
	const el = $( "#splashScreen" );
	const elFirefox = el.$query( "[data-alert=firefox]" );

	GSUonFirefox
		? elFirefox.$css( "display", "block" )
		: elFirefox.$remove();
	el.$addAttr( "data-loaded" )
		.$query( "button" )
		.$onclick( () => {
			el.$addAttr( "data-starting" );
			GSUsetTimeout( resolve, .1 );
		} )
		.$disabled( false );
} )
	.then( () => GSUloadJSFile( "assets/gsuiLibrarySamples-v1.js" ) )
	.then( () => GSUloadJSFile( "assets/gsuiWaveletList-v1.js" ) )
	.then( () => GSUloadJSFile( "assets/lame.1.2.1.min.js" ) )
	.then( () => GSUloadJSFile( "src/sensors/sensorMidiTrigger.js" ) )
	.then( () => GSUloadJSFile( "src/sensors/sensorMidiIntegration.js" ) )
	.then( () => {
		const daw = new GSDAW();
		const el = $( "#splashScreen" );

		// Initialize sensor MIDI integration with DAW
		const sensorIntegration = new SensorMidiIntegration( daw.getDAWCore?.() || daw );
		sensorIntegration.initialize().then( success => {
			if ( success ) {
				// Attach sensor event listeners
				sensorIntegration.attachSensorListeners();
				
				// Store reference for later access
				if ( window.$daw ) {
					window.$daw.$sensorMidi = sensorIntegration;
				}
				
				console.log( "Sensor MIDI system initialized and ready" );
			} else {
				console.warn( "Sensor MIDI system failed to initialize" );
			}
		} ).catch( err => {
			console.error( "Error initializing sensor MIDI:", err );
		} );

		// window.$daw = daw.getDAWCore();
		el.$addAttr( "data-started" );
		GSUsetTimeout( () => el.$remove(), .8 );
	} );
