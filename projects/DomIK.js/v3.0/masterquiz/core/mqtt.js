'use strict'

const broker = 'wss://test.mosquitto.org:8081'
//const broker = 'wss://test.mosquitto.org:8884'
//const broker = 'ws://test.mosquitto.org:8080'
//const broker = 'wss://mqtt.eclipseprojects.io:443/mqtt'

const topic = 'quizzy'

function MQTT(room = 777, onConnect, onFailure, onMessage, changeStatus) {
    const mq = { topic: `${topic}${room}`, status: 'new' };

    mq.newID = () => {
        mq.id = 1000 + Math.floor(Math.random() * 9000);
        return mq.id
    }

    function call(status, func, param) {
        if (changeStatus) changeStatus(status, param);
        if (func) func(param);
    }

    mq.message = (content) => {
        if (mq.client && mq.client.connected) {
            mq.client.publish(mq.topic, content, { qos: 0 }, (error) => {
                if (error) {
                    console.error('SSL Publish failed', error);
                } else {
                }
            });
        }
    }

    try {
        mq.client = mqtt.connect(broker, {
            clientId: 'id' + mq.newID(),
            clean: true,
            path: "/mqtt",
            connectTimeout: 40000,
            reconnectPeriod: 2000,
            rejectUnauthorized: false,
            protocolVersion: 5
        });

        mq.client.on('connect', () => {
            mq.client.subscribe(mq.topic, (error) => {
                if (error) { console.log(error); }
                else call('connect', onConnect);
            });
        });

        mq.client.on('message', (receivedTopic, message) => {
            const content = (typeof message === 'string') ? message : new TextDecoder('utf-8').decode(message);
            call('message', onMessage, content);
        });

        mq.client.on('error', (error) => { call('error', onFailure, error); });

        mq.client.on('close', () => { call('close', () => { console.log('SSL Connection close', mq.id) }) });

        mq.client.on('offline', () => { call('offline', () => { console.log('Clien is offline', mq.id) }) });

    } catch (error) {
        console.error('SSL Connection failed', error);
    }

    return mq;
}