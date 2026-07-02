# Remote Desktop Backend API

This backend provides authentication, device registration, heartbeat tracking, and file upload support for the remote desktop system.

## Setup

1. Install dependencies:
   ```bash
   cd backend-api
   npm install
   ```

2. Copy the environment example:
   ```bash
   cp .env.example .env
   ```

3. Run the server:
   ```bash
   npm start
   ```

4. Install the initial schema:
   ```bash
   curl -X POST http://localhost:5000/install-schema
   ```

## API endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /devices`
- `POST /devices/register`
- `POST /devices/heartbeat`
- `POST /files/upload`
- `GET /sessions`
- `POST /sessions/create` (internal signaling server use)
- `POST /sessions/end` (internal signaling server use)
