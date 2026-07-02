const io = require('socket.io-client');
const { exec } = require('child_process');

const RELAY_SERVER_URL = process.env.RELAY_SERVER_URL || 'http://localhost:4000';
const AGENT_ID = process.env.AGENT_ID || 'laptop-1';
const SECRET_TOKEN = process.env.SECRET_TOKEN || 'secret-token';

const socket = io(RELAY_SERVER_URL, {
  transports: ['websocket'],
  auth: { token: SECRET_TOKEN }
});

socket.on('connect', () => {
  console.log(`Connected to relay server as ${AGENT_ID}`);
  socket.emit('registerAgent', { agentId: AGENT_ID });
  socket.emit('agentStatus', { agentId: AGENT_ID, status: 'online', time: new Date().toISOString() });
});

socket.on('disconnect', () => {
  console.log('Disconnected from relay server.');
});

socket.on('connect_error', (error) => {
  console.error('Connect error:', error.message);
});

socket.on('command', async (data) => {
  if (!data || data.target !== AGENT_ID) {
    return;
  }

  console.log('Received command:', data.type, data.payload);

  const response = {
    requester: data.requester,
    agentId: AGENT_ID,
    type: data.type,
    time: new Date().toISOString()
  };

  try {
    if (data.type === 'ping') {
      response.message = 'pong';
    } else if (data.type === 'shell') {
      response.output = await runShell(data.payload.command);
    } else if (data.type === 'screenshot') {
      response.message = 'Screenshot request received. Install a screenshot utility and extend this agent to capture desktop images.';
    } else {
      response.message = `Unknown command type: ${data.type}`;
    }
  } catch (error) {
    response.output = error?.message || String(error);
  }

  socket.emit('commandResponse', response);
});

function runShell(command) {
  return new Promise((resolve, reject) => {
    exec(command, { shell: true, timeout: 30000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && !stdout && !stderr) {
        return reject(error);
      }
      resolve((stdout || stderr || 'Command completed.').trim());
    });
  });
}
