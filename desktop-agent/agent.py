import asyncio
import base64
import os
import platform
import time
from io import BytesIO
from pathlib import Path

import pyautogui
import requests
import socketio
from aiortc import RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, VideoStreamTrack
from av import VideoFrame
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')
SIGNALING_URL = os.getenv('SIGNALING_URL', 'http://localhost:4000')
AGENT_ID = os.getenv('AGENT_ID', 'laptop-1')
DEVICE_NAME = os.getenv('DEVICE_NAME', platform.node())
OWNER_EMAIL = os.getenv('OWNER_EMAIL')
OWNER_PASSWORD = os.getenv('OWNER_PASSWORD')
SECRET_TOKEN = os.getenv('SECRET_TOKEN', 'secret-token')
SCREEN_INTERVAL = float(os.getenv('SCREEN_INTERVAL', '4.0'))
RECEIVED_DIR = Path('received_files')
SHARED_FILES_DIR = Path('shared_files')

sio = socketio.Client(transports=['websocket'])
pc: RTCPeerConnection | None = None
session_token = None


class ScreenTrack(VideoStreamTrack):
    def __init__(self, fps: int = 2):
        super().__init__()
        self.fps = fps

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        image = pyautogui.screenshot()
        frame = VideoFrame.from_image(image)
        frame.pts = pts
        frame.time_base = time_base
        return frame


def login():
    global session_token
    if not OWNER_EMAIL or not OWNER_PASSWORD:
        raise ValueError('OWNER_EMAIL and OWNER_PASSWORD must be set in .env')

    response = requests.post(f'{BACKEND_URL}/auth/login', json={
        'email': OWNER_EMAIL,
        'password': OWNER_PASSWORD
    })
    response.raise_for_status()
    session_token = response.json()['token']
    print('Logged into backend as', OWNER_EMAIL)


def register_device():
    headers = {'Authorization': f'Bearer {session_token}'}
    payload = {
        'agent_id': AGENT_ID,
        'name': DEVICE_NAME,
        'platform': platform.system(),
        'status': 'online'
    }
    response = requests.post(f'{BACKEND_URL}/devices/register', json=payload, headers=headers)
    response.raise_for_status()
    print('Registered device:', response.json()['device'])


def send_screenshot():
    screenshot = pyautogui.screenshot()
    buffer = BytesIO()
    screenshot.save(buffer, format='PNG')
    encoded = base64.b64encode(buffer.getvalue()).decode('utf-8')

    sio.emit('screenFrame', {
        'agentId': AGENT_ID,
        'image': encoded,
        'timestamp': int(time.time() * 1000)
    })
    print('Sent screenshot frame')


def ensure_signaling_connection():
    if not sio.connected:
        sio.connect(SIGNALING_URL, auth={'token': SECRET_TOKEN})


@sio.event
def connect():
    print('Connected to signaling server')
    sio.emit('registerClient', {'clientType': 'agent', 'agentId': AGENT_ID})


async def handle_offer(payload):
    global pc
    viewer_socket_id = payload.get('viewerSocketId')

    if pc is not None:
        await pc.close()

    pc = RTCPeerConnection()
    pc.addTrack(ScreenTrack(fps=2))

    @pc.on('icecandidate')
    async def on_icecandidate(event):
        if event.candidate:
            sio.emit('iceCandidate', {
                'agentId': AGENT_ID,
                'candidate': {
                    'candidate': event.candidate.candidate,
                    'sdpMid': event.candidate.sdpMid,
                    'sdpMLineIndex': event.candidate.sdpMLineIndex
                },
                'targetSocketId': viewer_socket_id
            })

    @pc.on('connectionstatechange')
    async def on_connectionstatechange():
        print('WebRTC connection state:', pc.connectionState)

    offer = RTCSessionDescription(sdp=payload['sdp'], type=payload['type'])
    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    sio.emit('answer', {
        'viewerSocketId': viewer_socket_id,
        'agentId': AGENT_ID,
        'sdp': pc.localDescription.sdp,
        'type': pc.localDescription.type
    })
    print('Sent WebRTC answer to viewer')


@sio.on('offer')
def on_offer(payload):
    print('Received WebRTC offer', payload)
    asyncio.run(handle_offer(payload))


@sio.on('iceCandidate')
def on_ice_candidate(payload):
    if payload.get('agentId') != AGENT_ID or not payload.get('candidate'):
        return
    if not pc:
        print('No active RTCPeerConnection to apply remote ICE candidate')
        return

    candidate = RTCIceCandidate(payload['candidate'])
    asyncio.run(pc.addIceCandidate(candidate))
    print('Applied remote ICE candidate')


def emit_remote_control_response(data, message, success=True):
    response = {
        'agentId': AGENT_ID,
        'requester': data.get('requester'),
        'action': data.get('action'),
        'message': message,
        'success': success,
        'timestamp': int(time.time() * 1000)
    }
    sio.emit('remoteControlResponse', response)


@sio.on('remoteControl')
def on_remote_control(data):
    print('Remote control event:', data)
    action = data.get('action')
    payload = data.get('payload', {})
    try:
        if action == 'mouseMove':
            pyautogui.moveTo(payload.get('x', 0), payload.get('y', 0))
            emit_remote_control_response(data, 'Mouse moved')
        elif action == 'mouseClick':
            pyautogui.click(button=payload.get('button', 'left'))
            emit_remote_control_response(data, 'Mouse click executed')
        elif action == 'type':
            pyautogui.write(payload.get('text', ''), interval=0.01)
            emit_remote_control_response(data, 'Text typed')
        elif action == 'press':
            pyautogui.press(payload.get('key', 'enter'))
            emit_remote_control_response(data, 'Key pressed')
        elif action == 'screenshot':
            send_screenshot()
            emit_remote_control_response(data, 'Screenshot sent')
        elif action == 'fileTransfer':
            RECEIVED_DIR.mkdir(parents=True, exist_ok=True)
            filename = payload.get('filename') or f'transfer-{int(time.time())}.bin'
            file_path = RECEIVED_DIR / filename
            file_data = payload.get('data')
            if isinstance(file_data, str):
                file_bytes = base64.b64decode(file_data)
                file_path.write_bytes(file_bytes)
                emit_remote_control_response(data, f'File saved to {file_path}')
            else:
                emit_remote_control_response(data, 'Invalid file payload', False)
        elif action in ('fileList', 'listDirectory'):
            SHARED_FILES_DIR.mkdir(parents=True, exist_ok=True)
            requested_path = payload.get('path', '') or ''
            target_dir = (SHARED_FILES_DIR / requested_path).resolve()
            try:
                if not target_dir.exists() or not target_dir.is_dir() or not str(target_dir).startswith(str(SHARED_FILES_DIR.resolve())):
                    raise FileNotFoundError('Directory not found')
                files = []
                for child in sorted(target_dir.iterdir()):
                    files.append({
                        'name': child.name,
                        'size': child.stat().st_size if child.is_file() else 0,
                        'modifiedAt': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(child.stat().st_mtime)),
                        'isDirectory': child.is_dir(),
                    })
                sio.emit('fileListResponse', {
                    'agentId': AGENT_ID,
                    'requester': data.get('requester'),
                    'path': requested_path,
                    'files': files
                })
                emit_remote_control_response(data, 'File list sent')
            except Exception as e:
                emit_remote_control_response(data, f'Error listing directory: {e}', False)
        elif action == 'downloadFile':
            SHARED_FILES_DIR.mkdir(parents=True, exist_ok=True)
            requested_path = payload.get('filename')
            if not requested_path:
                emit_remote_control_response(data, 'Filename required for download', False)
            else:
                file_path = (SHARED_FILES_DIR / requested_path).resolve()
                if not str(file_path).startswith(str(SHARED_FILES_DIR.resolve())) or not file_path.exists() or not file_path.is_file():
                    emit_remote_control_response(data, 'File not found', False)
                else:
                    file_data = base64.b64encode(file_path.read_bytes()).decode('utf-8')
                    sio.emit('fileDownload', {
                        'agentId': AGENT_ID,
                        'requester': data.get('requester'),
                        'filename': requested_path,
                        'size': file_path.stat().st_size,
                        'data': file_data
                    })
                    emit_remote_control_response(data, f'Download started for {requested_path}')
        else:
            emit_remote_control_response(data, f'Unknown remote action: {action}', False)
            print('Unknown remote action:', action)
    except Exception as e:
        print('Remote control error:', e)
        emit_remote_control_response(data, f'Error: {e}', False)


@sio.event
def disconnect():
    print('Disconnected from signaling server')


def main():
    login()
    register_device()
    sio.connect(SIGNALING_URL, auth={'token': SECRET_TOKEN})

    try:
        while True:
            if sio.connected:
                send_screenshot()
            time.sleep(SCREEN_INTERVAL)
    except KeyboardInterrupt:
        print('Agent stopped by user')
    finally:
        sio.disconnect()


if __name__ == '__main__':
    main()
