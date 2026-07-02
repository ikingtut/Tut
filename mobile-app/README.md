# Remote Desktop Android Client

This Expo app is the Android-focused client for the remote desktop system. It authenticates with the backend API, loads registered devices, and connects to the signaling server for remote control actions.

## Setup

1. In `mobile-app`, install dependencies:
   ```bash
   npm install
   ```
2. Install React Native WebRTC:
   ```bash
   npm install react-native-webrtc
   ```
3. Start the Expo development server:
   ```bash
   npm run start
   ```
4. Open the app in Android emulator or physical device.

> Note: `react-native-webrtc` may require a custom development build or a bare workflow on Android to work correctly with Expo.

## Configuration

- Enter the `Backend API URL` for the backend service (default `http://localhost:5000`).
- Enter the `Signaling Server URL` for the signaling service (default `http://localhost:4000`).
- Enter the `Signaling Token` to match the server secret.
- Sign in with email/password to load registered devices.

## Usage

- Log in with a registered backend user.
- Select a registered device from the list.
- Connect to the signaling server.
- Use the connect/disconnect button to manage the viewer session.
- Send remote control actions such as screenshot requests, mouse clicks, typing, and enter key presses.
- View live screen streaming through WebRTC when available, or fallback PNG screenshot frames.
- Remote control responses are returned from the desktop agent and shown in the app event log.

## Notes

- The current implementation uses HTTP authentication and Socket.IO signaling.
- Full WebRTC-based screen streaming is available in the app, with fallback screenshots from the agent.
- If using Expo managed workflow, `react-native-webrtc` may require a custom development build or bare workflow.
