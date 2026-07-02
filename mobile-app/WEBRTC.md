# WebRTC Integration Notes

This file describes how to extend the Android client with WebRTC offer/answer support for real-time remote desktop streaming.

## Goal

- Use the signaling server to exchange WebRTC SDP offer/answer and ICE candidates.
- Establish a direct peer connection between the mobile viewer and the desktop agent.
- Stream real-time screen frames and audio/video data over WebRTC.

## Signaling events

The signaling server already supports these events:

- `offer`
- `answer`
- `iceCandidate`

### Viewer flow

1. Create a peer connection in the mobile app.
2. Add local tracks if needed.
3. Generate an SDP offer.
4. Send `{ agentId, sdp, type: 'offer' }` to the signaling server.
5. Listen for `answer` from the agent.
6. Forward received ICE candidates to the agent.

### Agent flow

1. Create a peer connection in the desktop agent.
2. Listen for `offer` from the viewer.
3. Set remote description and create an SDP answer.
4. Send `{ viewerSocketId, agentId, sdp, type: 'answer' }` back to the signaling server.
5. Forward ICE candidates to the viewer.

## React Native library

For Android + iOS, use a native WebRTC library such as `react-native-webrtc`.

Install the package and any required native configuration:

```bash
npm install react-native-webrtc
```

If using Expo, you may need a custom dev client or EAS build.

## Desktop agent library

On the Python side, use a WebRTC implementation such as `aiortc`.

Example:

```bash
pip install aiortc
```
```

1. Create an `RTCPeerConnection`.
2. Add a `MediaStreamTrack` for screen capture.
3. Exchange offer/answer through the signaling server.
```

## Recommended next steps

- Add a lightweight peer connection module in `mobile-app/`.
- Add signaling event handlers for `offer`, `answer`, and `iceCandidate`.
- Implement screen capture on the agent and attach it to the peer connection.
- Use the WebRTC connection for low-latency remote desktop streaming.
