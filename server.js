const fs = require('fs');
const https = require('https');
const express = require('express');
const WebSocket = require('ws');

const app = express();

const server = https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
}, app);

const wss = new WebSocket.Server({ server });

const PORT = 3443;

app.use(express.static(__dirname));

let players = {};

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).substr(2, 9);
  players[id] = { x: 10000, y: 10000, msg: '', msgTime: 0 };
  ws.id = id;

  ws.send(JSON.stringify({ type: 'init', id, players }));

  broadcast({ type: 'players', players });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'move' && players[id]) {
        players[id].x = data.x;
        players[id].y = data.y;
      }
      if (data.type === 'chat' && players[id]) {
        players[id].msg = data.msg;
        players[id].msgTime = Date.now();
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
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

server.listen(PORT, () => {
  console.log(`HTTPS server started on port ${PORT}`);
});
