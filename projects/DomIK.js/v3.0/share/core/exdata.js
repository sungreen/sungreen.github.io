function makeHost(mode = 'user', room) {
  const host = simpleHost(773, 'rocket', { mode: mode });

  host.doSend = (content) => { }
  host.doStatus = (status, param) => { };
  host.doConnect = () => { };
  host.doFailure = (error) => { };
  host.doMessage = (ret) => { };

  host.sendData = ( id, x, y ) => {
    host.send(0, id, x, y );
  }

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
        if (ret) {
        }
      },
      (status) => {
        host.doStatus(status);
      }
    );
  };
  return host;
}