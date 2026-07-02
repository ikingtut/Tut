require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;
const SECRET_TOKEN = process.env.SECRET_TOKEN || 'secret-token';
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:5000';
const SIGNALING_API_KEY = process.env.SIGNALING_API_KEY || 'supersecret-signaling-key';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const clients = new Map();
const agents = new Map();

app.get('/', (_, res) => {
  res.send('Remote desktop signaling server is running.');
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token !== SECRET_TOKEN) {
    return next(new Error('Authentication failed')); 
  }
  next();
});

async function createSession(agentId, viewerSocketId) {
  try {
    await fetch(`${BACKEND_URL}/sessions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SIGNALING_API_KEY
      },
      body: JSON.stringify({ agent_id: agentId, viewer_socket_id: viewerSocketId })
    });
    console.log(`Session created for viewer ${viewerSocketId} and agent ${agentId}`);
  } catch (error) {
    console.error('Failed to create session:', error);
  }
}

async function endSession(agentId, viewerSocketId) {
  try {
    await fetch(`${BACKEND_URL}/sessions/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SIGNALING_API_KEY
      },
      body: JSON.stringify({ agent_id: agentId, viewer_socket_id: viewerSocketId })
    });
    console.log(`Session ended for viewer ${viewerSocketId} and agent ${agentId}`);
  } catch (error) {
    console.error('Failed to end session:', error);
  }
}

io.on('connection', (socket) => {
  socket.on('registerClient', async ({ clientType, agentId }) => {
    if (clientType === 'agent' && agentId) {
      agents.set(agentId, socket.id);
      socket.data.agentId = agentId;
      socket.data.clientType = 'agent';
      console.log(`Agent registered: ${agentId}`);
      return;
    }

    if (clientType === 'viewer' && agentId) {
      clients.set(socket.id, { agentId });
      socket.data.agentId = agentId;
      socket.data.clientType = 'viewer';
      console.log(`Viewer connected for agent: ${agentId}`);
      await createSession(agentId, socket.id);
    }
  });

  socket.on('offer', (payload) => {
    const targetId = agents.get(payload.agentId);
    if (targetId) {
      io.to(targetId).emit('offer', payload);
    }
  });

  socket.on('answer', (payload) => {
    const viewerSocketId = payload.viewerSocketId;
    if (viewerSocketId) {
      io.to(viewerSocketId).emit('answer', payload);
    }
  });

  socket.on('iceCandidate', (payload) => {
    const targetId = payload.targetSocketId || agents.get(payload.agentId);
    if (targetId) {
      io.to(targetId).emit('iceCandidate', payload);
    }
  });

  socket.on('remoteControl', (payload) => {
    const targetAgent = agents.get(payload.agentId);
    if (targetAgent) {
      io.to(targetAgent).emit('remoteControl', payload);
    }
  });

  socket.on('remoteControlResponse', (payload) => {
    const requesterId = payload?.requester;
    if (requesterId) {
      io.to(requesterId).emit('remoteControlResponse', payload);
      return;
    }
    for (const [clientId, client] of clients) {
      if (client.agentId === socket.data.agentId) {
        io.to(clientId).emit('remoteControlResponse', payload);
      }
    }
  });

  socket.on('fileListResponse', (payload) => {
    const requesterId = payload?.requester;
    if (requesterId) {
      io.to(requesterId).emit('fileListResponse', payload);
    }
  });

  socket.on('fileDownload', (payload) => {
    const requesterId = payload?.requester;
    if (requesterId) {
      io.to(requesterId).emit('fileDownload', payload);
    }
  });

  socket.on('screenFrame', (frame) => {
    for (const [clientId, client] of clients) {
      if (client.agentId === socket.data.agentId) {
        io.to(clientId).emit('screenFrame', frame);
      }
    }
  });

  socket.on('disconnect', async () => {
    if (socket.data.agentId) {
      if (socket.data.clientType === 'agent') {
        agents.forEach((value, key) => {
          if (value === socket.id) {
            agents.delete(key);
            console.log(`Agent disconnected: ${key}`);
          }
        });
      }

      if (socket.data.clientType === 'viewer') {
        await endSession(socket.data.agentId, socket.id);
      }
    }
    clients.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
