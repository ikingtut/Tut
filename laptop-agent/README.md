# Laptop Agent

This Node.js agent connects to the relay server and executes remote commands.

## Setup

1. In `laptop-agent`, install dependencies:
   ```bash
   npm install
   ```
2. Start the agent with environment variables:
   ```bash
   RELAY_SERVER_URL=http://yourRelayHost:4000 AGENT_ID=laptop-1 SECRET_TOKEN=secret-token npm start
   ```

## Notes

- The agent currently supports `ping` and `shell` commands.
- `screenshot` is a placeholder; add a screenshot library to capture desktop images.
