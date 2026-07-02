# Desktop Agent

This Python agent connects to the backend and signaling server, registers the device, and streams screenshots to the mobile viewer.

## Setup

1. Copy the example environment file:
   ```bash
   cd desktop-agent
   copy .env.example .env
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the agent:
   ```bash
   python agent.py
   ```

## Features

- Registers a device against the backend API using owner credentials
- Connects to the signaling server with a shared secret
- Sends periodic screen frames as base64 PNG data
- Accepts remote control actions for mouse, keyboard, and screenshot requests
