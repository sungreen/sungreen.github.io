'use strict';

const destinationName = '/quizzy'; 

function MQTT( room, onConnect, onFailure, onMessage, id ) {
	const _mqtt_ = {};
	_mqtt_.room = `${destinationName}${room}`;

	const location = {
		host: "test.mosquitto.org",
		port: 8080,
	}

	const connectOptions = {
		timeout: 30,
		keepAliveInterval: 60,
		cleanSession: true, 
		useSSL: false,
		onSuccess: () => { _mqtt_.client.subscribe( _mqtt_.room ); if( onConnect ) onConnect( _mqtt_.client ); }, 
	}

	_mqtt_.newID = () => {
		_mqtt_.id = id? id: 1000 + Math.floor( Math.random() * 9000 );
		return _mqtt_.id
	};

	_mqtt_.client = new Paho.MQTT.Client( location.host, location.port, `ID${_mqtt_.newID()}` );
	if( onMessage ) _mqtt_.client.onMessageArrived = onMessage;

	_mqtt_.client.onMessageArrived = ( message ) => { if( onMessage ) onMessage( message ); }
	_mqtt_.client.onConnectionLost = ( responseObject ) => { if( responseObject.errorCode !== 0 ) { console.log( `MQTT Error ${responseObject.errorMessage}` ); if( onFailure ) onFailure(); } }

	_mqtt_.message = ( content ) => {
		const message = new Paho.MQTT.Message( content );
		message.destinationName = _mqtt_.room;
		_mqtt_.client.send( message );
	}

	_mqtt_.client.connect( connectOptions );

	return _mqtt_;
}
