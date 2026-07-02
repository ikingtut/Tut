# Remote Desktop System

This workspace now contains a full-stacked remote desktop project package with authentication, device registration, and signaling for internet-based remote desktop control.

## Included components

- `backend-api/`: Node.js Express API with PostgreSQL authentication, device registration, session persistence, heartbeat tracking, and file upload support.
- `signaling-server/`: Socket.IO signaling server for remote control and screen frame forwarding.
- `desktop-agent/`: Python cross-platform desktop agent for Windows, macOS, and Linux with screenshot streaming and keyboard/mouse control.
- `mobile-app/`: Android-focused React Native client with email/password login, device selection, remote control actions, and WebRTC viewer support.
- `docker-compose.yml`: Self-hosted deployment configuration for PostgreSQL, backend API, and signaling server.

## Selected design decisions

- Target laptop OS: Windows + macOS + Linux
- Mobile platform: Android only
- Authentication: Email/password
- Connection type: Over the internet from anywhere
- Deployment preference: Self-hosted on your own server/VPS
- Commercial intent: Personal use

## Getting started

1. Start the deployment stack:
   ```bash
   docker compose up -d
   ```

2. Install the backend schema:
   ```bash
   curl -X POST http://localhost:5000/install-schema
   ```

3. Configure the desktop agent:
   ```bash
   cd desktop-agent
   copy .env.example .env
   pip install -r requirements.txt
   python agent.py
   ```

4. Run the React Native Android app:
   ```bash
   cd mobile-app
   npm install
   npm start
   ```

> This package provides a complete multi-service starting point. It is a practical, self-hosted remote desktop system skeleton with real authentication, device registration, signaling, screenshot streaming, and remote input control.
