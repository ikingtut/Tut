# Relay Server

This server brokers communication between the mobile app and the laptop agent.

## Setup

1. In `relay-server`, install dependencies:
   ```bash
   npm install
   ```
2. Start the relay server:
   ```bash
   SECRET_TOKEN=secret-token PORT=4000 npm start
   ```

## Notes

- The relay server must be accessible from the internet for remote access.
- Use a public host, VPN, or tunneling service such as ngrok if needed.
