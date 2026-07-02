const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const SECRET_TOKEN = process.env.SECRET_TOKEN || 'secret-token';
const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.get('/', (_, res) => {
  res.send('Remote access relay server is running.');
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token !== SECRET_TOKEN) {
    return next(new Error('Authentication failed'));
  }
  next();
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('registerAgent', (data) => {
    if (data?.agentId) {
      socket.data.agentId = data.agentId;
      socket.join(data.agentId);
      console.log(`Agent registered: ${data.agentId}`);
    }
  });

  socket.on('command', (data) => {
    if (!data?.target) {
      return;
    }
    console.log(`Routing command to ${data.target}`);
    io.to(data.target).emit('command', data);
  });

  socket.on('commandResponse', (response) => {
    console.log('Command response received:', response);
    if (response?.requester) {
      io.to(response.requester).emit('commandResponse', response);
    }
  });

  socket.on('agentStatus', (payload) => {
    if (payload?.agentId) {
      io.to(payload.agentId).emit('agentStatus', payload);
      io.emit('agentStatus', payload);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.data.agentId) {
      io.emit('agentStatus', { agentId: socket.data.agentId, status: 'offline', time: new Date().toISOString() });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Relay server listening on port ${PORT}`);
});
