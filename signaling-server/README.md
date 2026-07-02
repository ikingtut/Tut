# Remote Desktop Signaling Server

This service brokers signaling events for WebRTC and remote control between mobile viewers and desktop agents.

## Setup

1. Install dependencies:
   ```bash
   cd signaling-server
   npm install
   ```
2. Create a `.env` file or pass environment variables:
   ```bash
   BACKEND_URL=http://localhost:5000
   SECRET_TOKEN=secret-token
   SIGNALING_API_KEY=supersecret-signaling-key
   ```
3. Start the server:
   ```bash
   npm start
   ```

## Supported events

- `registerClient` - identifies viewers and agents
- `offer`, `answer`, `iceCandidate` - WebRTC signaling messages
- `remoteControl` - keyboard/mouse and screenshot requests
- `remoteControlResponse` - acknowledgements from agents back to viewers
- `screenFrame` - image frames forwarded to connected viewers
