const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

let players = {};
let messages = [];

wss.on('connection', (ws) => {
  // Создаём игрока с уникальным id
  const id = Math.random().toString(36).substr(2, 9);
  players[id] = {
    x: 10000,
    y: 10000,
    msg: '',
    msgTime: 0,
  };

  ws.id = id;

  ws.send(JSON.stringify({ type: 'init', id, players }));

  // Рассылаем всем обновлённый список игроков
  broadcast({ type: 'players', players });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'move') {
        if (players[id]) {
          players[id].x = data.x;
          players[id].y = data.y;
        }
      } else if (data.type === 'chat') {
        if (players[id]) {
          players[id].msg = data.msg;
          players[id].msgTime = Date.now();
        }
      }

      broadcast({ type: 'players', players });
    } catch (e) {
      console.error(e);
    }
  });

  ws.on('close', () => {
    delete players[id];
    broadcast({ type: 'players', players });
  });
});

function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
