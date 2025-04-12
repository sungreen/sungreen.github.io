'use strict'

const broker = 'wss://test.mosquitto.org:8081'
//const broker = 'wss://test.mosquitto.org:8884'
//const broker = 'ws://test.mosquitto.org:8080'
//const broker = 'wss://mqtt.eclipseprojects.io:443/mqtt'

const DEBUG = true

function MQTT(room = 777, topic, onConnect, onFailure, onMessage, onSend, changeStatus ) {
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
            let error = null;
            mq.client.publish(mq.topic, content, { qos: 0 }, (error) => {
                if (error) {
                    console.error('SSL Publish failed', error);
                } else {
                    if(DEBUG) console.log('Сообщение отправлено', content);
                    onSend(content);
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
            if(DEBUG) console.log('Сообщение получено', content);
        });

        mq.client.on('error', (error) => { call('error', onFailure, error); });

        mq.client.on('close', () => { call('close', () => { console.log('SSL Connection close', mq.id) }) });

        mq.client.on('offline', () => { call('offline', () => { console.log('Clien is offline', mq.id) }) });

    } catch (error) {
        console.error('SSL Connection failed', error);
    }

    return mq;
}

function simpleHost(room, topic, options = {}) {
    const host = { room: room, topic: topic, options: options }

    host.recode = (ret) => { return ret }

    host.decode = (content) => {
        const ret = { mode: "none" };
        const lex = msplit(content, "~", "~");
        const [to, from, code, value, check] = lex[0].split(":").map(Number)

        if (
        //    !code ||
            from === to ||
            from === host.mqtt.id
        )
            return null

        ret.to = to
        ret.from = from
        ret.code = code
        ret.value = value
        ret.check = check
        ret.data = lex.length > 1 ? lex[1].split(":").map(Number) : null
        if (lex.length > 2 && lex[2] !== "") ret.text = lex[2]
        if (lex.length > 3 && lex[3] !== "") ret.objs = JSON.parse(lex[3])
        return host.recode(ret)
    }

    host.send = (
        id = 0,
        code = 0,
        value = 0,
        check = 0,
        data = null,
        text = null,
        objs = null
    ) => {
        if (host.mqtt) {
            const msg = `${id}:${host.mqtt.id}:${[code, value, check].join(":")}~${data ? data.join(":") : ""
                }~${text ? text : ""}~${objs ? JSON.stringify(objs) : ""}`;
            host.mqtt.message(msg);
        }
    };

    host.doSend = (content) => { };

    host.doStatus = (status, param) => { };

    host.doConnect = () => { };

    host.doFailure = (error) => { };

    host.doMessage = (ret) => { };

    host.timer = makeTimer();

    host.run = () => {
        host.mqtt = MQTT(
            host.room,
            host.topic,
            () => {
                host.timer.clear();
                host.doConnect();
            },
            (error) => {
                host.doFailure(error);
            },
            (msg) => {
                const ret = host.decode(msg);
                if (ret) host.doMessage(ret);
            },
            (content) => {
                host.doSend(content);
            },
            (status) => {
                host.doStatus(status);
            }
        );
    };
    return host;
}