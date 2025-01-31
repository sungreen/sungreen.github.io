'use strict';

const destinationName = '/quizzy'; 

function MQTT( staticRoom=777, onConnect, onFailure, onMessage, id ) {
	const _mqtt_ = {};
	_mqtt_.room = `${destinationName}${staticRoom}`;

	const location = {
		// hivemq.cloud
		// host: "d8b235f2986140de80c0ce6f9d8bd5ed.s1.eu.hivemq.cloud",
		// port: 8884
		// 	// userName: "hivemq.webclient.1734721971482",
		// 	// password: "NHJeE:$!1%OaMfvxs098",
		host: "broker.hivemq.com",
		port: 8884,
	}

	const connectOptions = {
		timeout: 30,
		// userName:"string", 
		// password:"string", 
		// willMessage:"object", 
		keepAliveInterval: 60, // default 60 
		cleanSession: true, 
		useSSL: true,
		// invocationContext:"object", 
		onSuccess: () => { _mqtt_.client.subscribe( _mqtt_.room ); if( onConnect ) onConnect( _mqtt_.client ); }, 
		// onFailure:"function",
		// hosts:"object",
		// ports:"object",
		// mqttVersion:"number"
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
