import { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, Button, View, Alert, Image, TouchableOpacity, Linking } from 'react-native';
import io, { Socket } from 'socket.io-client';
import { RTCPeerConnection, RTCView } from 'react-native-webrtc';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConnectionPanel from './components/ConnectionPanel';
import TabBar from './components/TabBar';
import DashboardTab from './components/DashboardTab';
import ControlTab from './components/ControlTab';
import FilesTab from './components/FilesTab';
import HistoryTab from './components/HistoryTab';

type Device = {
  agent_id: string;
  name: string;
  platform: string;
  status: string;
  last_seen: string;
};

type FileItem = {
  name: string;
  size: number;
  uri: string;
};

type LocalDownloadItem = {
  name: string;
  size: number;
  uri: string;
};

type RemoteFileItem = {
  name: string;
  size: number;
  modifiedAt: string;
  isDirectory: boolean;
};

type FileHistoryEntry = {
  id: string;
  name: string;
  size: number;
  direction: 'sent' | 'received' | 'downloaded';
  agentId: string;
  timestamp: number;
  status: string;
  path?: string;
};

type Session = {
  id: number;
  agent_id: string;
  viewer_socket_id: string;
  status: string;
  created_at: string;
  ended_at: string | null;
};

type LogLine = { time: string; message: string };

type AppTab = 'dashboard' | 'control' | 'files' | 'history';

export default function App() {
  const [backendUrl, setBackendUrl] = useState('http://localhost:5000');
  const [signalingUrl, setSignalingUrl] = useState('http://localhost:4000');
  const [signalingToken, setSignalingToken] = useState('secret-token');
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('Password123');
  const [token, setToken] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('laptop-1');
  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');
  const [remotePath, setRemotePath] = useState<string>('');
  const [remoteFiles, setRemoteFiles] = useState<RemoteFileItem[]>([]);
  const [selectedRemoteFile, setSelectedRemoteFile] = useState<string>('');
  const [downloadedFiles, setDownloadedFiles] = useState<LocalDownloadItem[]>([]);
  const [fileHistory, setFileHistory] = useState<FileHistoryEntry[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState('');
  const [screenshotUri, setScreenshotUri] = useState('');
  const [log, setLog] = useState<LogLine[]>([]);
  const [isViewerConnected, setIsViewerConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<any | null>(null);
  const HISTORY_STORAGE_KEY = '@remote_access_file_history';
  const REMOTE_DOWNLOAD_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}downloads/` : '';

  useEffect(() => {
    const initialize = async () => {
      try {
        const stored = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
          setFileHistory(JSON.parse(stored));
        }
        if (REMOTE_DOWNLOAD_DIR) {
          await FileSystem.makeDirectoryAsync(REMOTE_DOWNLOAD_DIR, { intermediates: true });
          await loadDownloadedFiles();
        }
      } catch (error: any) {
        appendLog(`History init error: ${error.message}`);
      }
    };
    initialize();

    return () => {
      socketRef.current?.disconnect();
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, []);

  const appendLog = (message: string) => {
    setLog((prev) => [{ time: new Date().toLocaleTimeString(), message }, ...prev].slice(0, 50));
  };

  const saveHistory = async (history: FileHistoryEntry[]) => {
    try {
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error: any) {
      appendLog(`Save history error: ${error.message}`);
    }
  };

  const addFileHistory = async (entry: FileHistoryEntry) => {
    setFileHistory((prev) => {
      const next = [{ ...entry, id: `${entry.agentId}-${entry.name}-${entry.timestamp}` }, ...prev].slice(0, 40);
      saveHistory(next);
      return next;
    });
  };

  const loadDownloadedFiles = async () => {
    if (!REMOTE_DOWNLOAD_DIR) {
      return;
    }
    try {
      const names = await FileSystem.readDirectoryAsync(REMOTE_DOWNLOAD_DIR);
      const downloads = await Promise.all(names.map(async (name) => {
        const info = await FileSystem.getInfoAsync(`${REMOTE_DOWNLOAD_DIR}${name}`);
        return {
          name,
          size: info.exists ? info.size ?? 0 : 0,
          uri: info.uri || `${REMOTE_DOWNLOAD_DIR}${name}`
        };
      }));
      setDownloadedFiles(downloads);
    } catch (error: any) {
      appendLog(`Load downloads error: ${error.message}`);
    }
  };

  const openLocalFile = async (file: LocalDownloadItem) => {
    try {
      await Linking.openURL(file.uri);
    } catch (error: any) {
      appendLog(`Open local file error: ${error.message}`);
      Alert.alert('Unable to open file', error.message);
    }
  };

  const login = async () => {
    try {
      const response = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      setToken(data.token);
      appendLog('Logged in successfully');
      await loadDevices(data.token);
      await loadSessions(data.token);
    } catch (error: any) {
      appendLog(`Login error: ${error.message}`);
      Alert.alert('Login failed', error.message);
    }
  };

  const loadDevices = async (authToken: string) => {
    try {
      const response = await fetch(`${backendUrl}/devices`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to fetch devices');
      }
      setDevices(data.devices);
      appendLog(`Loaded ${data.devices.length} device(s)`);
      if (data.devices[0]?.agent_id) {
        setSelectedAgent(data.devices[0].agent_id);
      }
    } catch (error: any) {
      appendLog(`Device load error: ${error.message}`);
    }
  };

  const loadSessions = async (authToken: string) => {
    try {
      const response = await fetch(`${backendUrl}/sessions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to fetch sessions');
      }
      setSessions(data.sessions);
      appendLog(`Loaded ${data.sessions.length} session(s)`);
    } catch (error: any) {
      appendLog(`Session load error: ${error.message}`);
    }
  };

  const createPeerConnection = (socket: Socket) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        socket.emit('iceCandidate', {
          agentId: selectedAgent,
          candidate: event.candidate,
          targetSocketId: undefined
        });
        appendLog('Sent local ICE candidate');
      }
    };

    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreamUrl(event.streams[0].toURL());
        appendLog('Received remote WebRTC stream');
      }
    };

    return pc;
  };

  const createOffer = async (socket: Socket) => {
    if (!selectedAgent) {
      Alert.alert('Agent required', 'Select a registered agent before connecting.');
      return;
    }

    try {
      const pc = createPeerConnection(socket);
      pcRef.current = pc;

      const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: true } as any);
      await pc.setLocalDescription(offer as any);
      socket.emit('offer', {
        agentId: selectedAgent,
        sdp: (offer as any).sdp,
        type: (offer as any).type,
        viewerSocketId: socket.id
      });
      appendLog('Sent WebRTC offer to agent');
    } catch (error: any) {
      appendLog(`Offer error: ${error.message}`);
      Alert.alert('WebRTC error', error.message);
    }
  };

  const connectSignaling = () => {
    if (!token) {
      Alert.alert('Not authenticated', 'Log in first to obtain your session token.');
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(signalingUrl, {
      transports: ['websocket'],
      auth: { token: signalingToken }
    });

    socket.on('connect', () => {
      setIsViewerConnected(true);
      appendLog('Connected to signaling server.');
      socket.emit('registerClient', { clientType: 'viewer', agentId: selectedAgent });
      createOffer(socket);
    });

    socket.on('disconnect', () => {
      setIsViewerConnected(false);
      appendLog('Disconnected from signaling server.');
      pcRef.current?.close();
      pcRef.current = null;
      setRemoteStreamUrl('');
    });

    socket.on('answer', async (payload: any) => {
      if (payload?.sdp && pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription({ type: payload.type, sdp: payload.sdp });
          appendLog('Received WebRTC answer from agent');
        } catch (error: any) {
          appendLog(`Answer error: ${error.message}`);
        }
      }
    });

    socket.on('iceCandidate', async (payload: any) => {
      if (payload?.candidate && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(payload.candidate);
          appendLog('Applied remote ICE candidate');
        } catch (error: any) {
          appendLog(`ICE candidate error: ${error.message}`);
        }
      }
    });

    socket.on('screenFrame', (payload: any) => {
      if (payload?.image) {
        setScreenshotUri(`data:image/png;base64,${payload.image}`);
        appendLog('Received fallback screenshot frame');
      }
    });

    socket.on('connect_error', (error) => {
      appendLog(`Signaling connection error: ${error.message}`);
      Alert.alert('Connection error', error.message);
    });

    socket.on('remoteControlResponse', (payload: any) => {
      appendLog(`Agent response: ${payload?.message || 'ok'}`);
      if (payload?.action === 'fileTransfer') {
        addFileHistory({
          id: `${payload.requester}-${payload.action}-${Date.now()}`,
          name: selectedFile?.name || 'unknown',
          size: selectedFile?.size || 0,
          direction: 'sent',
          agentId: selectedAgent,
          timestamp: Date.now(),
          status: payload.success ? 'Delivered' : 'Failed',
          path: payload.success ? `Agent received file` : undefined,
        });
      }
    });

    socket.on('fileListResponse', (payload: any) => {
      setRemoteLoading(false);
      if (payload?.files) {
        setRemoteFiles(payload.files);
        setRemotePath(payload.path || '');
        const firstFile = payload.files.find((f: any) => !f.isDirectory);
        setSelectedRemoteFile(firstFile?.name || '');
        appendLog(`Received file list from ${payload.agentId}`);
      }
    });

    socket.on('fileDownload', async (payload: any) => {
      if (!payload?.filename || !payload?.data) {
        appendLog('Received invalid file download payload');
        return;
      }
      try {
        if (!REMOTE_DOWNLOAD_DIR) {
          throw new Error('Download directory unavailable');
        }
        const downloadPath = `${REMOTE_DOWNLOAD_DIR}${payload.filename}`;
        await FileSystem.writeAsStringAsync(downloadPath, payload.data, { encoding: FileSystem.EncodingType.Base64 });
        appendLog(`Downloaded ${payload.filename} from ${payload.agentId}`);
        addFileHistory({
          id: `${payload.agentId}-${payload.filename}-${Date.now()}`,
          name: payload.filename,
          size: payload.size || 0,
          direction: 'downloaded',
          agentId: payload.agentId,
          timestamp: Date.now(),
          status: 'Downloaded',
          path: downloadPath,
        });
        await loadDownloadedFiles();
      } catch (error: any) {
        appendLog(`File download error: ${error.message}`);
        Alert.alert('Download error', error.message);
      }
    });

    socketRef.current = socket;
  };

  const disconnectSignaling = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    setIsViewerConnected(false);
    setRemoteStreamUrl('');
    appendLog('Disconnected from signaling server.');
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true }) as any;
      if (result?.uri) {
        setSelectedFile({ name: result.name, size: result.size ?? 0, uri: result.uri });
        appendLog(`Selected file: ${result.name}`);
      }
    } catch (error: any) {
      appendLog(`File pick error: ${error.message}`);
      Alert.alert('File picker error', error.message);
    }
  };

  const sendFileToAgent = async () => {
    if (!selectedFile) {
      Alert.alert('No file selected', 'Please pick a file first.');
      return;
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, { encoding: FileSystem.EncodingType.Base64 });
      const socket = socketRef.current;
      if (!socket || socket.disconnected) {
        Alert.alert('Not connected', 'Please connect to the signaling server first.');
        return;
      }

      socket.emit('remoteControl', {
        agentId: selectedAgent,
        action: 'fileTransfer',
        payload: {
          filename: selectedFile.name,
          data: base64
        },
        requester: socket.id
      });
      appendLog(`Sent file ${selectedFile.name} to ${selectedAgent}`);
      addFileHistory({
        id: `${selectedAgent}-${selectedFile.name}-${Date.now()}`,
        name: selectedFile.name,
        size: selectedFile.size,
        direction: 'sent',
        agentId: selectedAgent,
        timestamp: Date.now(),
        status: 'Pending',
      });
    } catch (error: any) {
      appendLog(`File send error: ${error.message}`);
      Alert.alert('File send error', error.message);
    }
  };

  const sendRemoteControl = (action: string, payload: object = {}) => {
    const socket = socketRef.current;
    if (!socket || socket.disconnected) {
      Alert.alert('Not connected', 'Please connect to the signaling server first.');
      return;
    }
    socket.emit('remoteControl', { agentId: selectedAgent, action, payload, requester: socket.id });
    appendLog(`Sent control action: ${action}`);
  };

  const requestAgentFileList = (path = '') => {
    const socket = socketRef.current;
    if (!socket || socket.disconnected) {
      Alert.alert('Not connected', 'Please connect to the signaling server first.');
      return;
    }
    setRemoteLoading(true);
    setRemoteFiles([]);
    setSelectedRemoteFile('');
    socket.emit('remoteControl', { agentId: selectedAgent, action: 'fileList', payload: { path }, requester: socket.id });
    appendLog(`Requested agent file list for ${path || '/'} `);
  };

  const navigateRemoteDirectory = (path: string) => {
    setRemotePath(path);
    setSelectedRemoteFile('');
    requestAgentFileList(path);
  };

  const goUpDirectory = () => {
    if (!remotePath) {
      return;
    }
    const pieces = remotePath.split('/').filter(Boolean);
    const nextPath = pieces.slice(0, -1).join('/');
    setRemotePath(nextPath);
    requestAgentFileList(nextPath);
  };

  const downloadRemoteFile = () => {
    if (!selectedRemoteFile) {
      Alert.alert('No file selected', 'Select a remote file to download first.');
      return;
    }
    const socket = socketRef.current;
    if (!socket || socket.disconnected) {
      Alert.alert('Not connected', 'Please connect to the signaling server first.');
      return;
    }
    const filename = remotePath ? `${remotePath}/${selectedRemoteFile}` : selectedRemoteFile;
    socket.emit('remoteControl', { agentId: selectedAgent, action: 'downloadFile', payload: { filename }, requester: socket.id });
    appendLog(`Requested download for ${filename}`);
  };

  const refreshDevices = async () => {
    if (!token) {
      Alert.alert('Not authenticated', 'Log in first to refresh devices.');
      return;
    }
    await loadDevices(token);
  };

  const refreshSessions = async () => {
    if (!token) {
      Alert.alert('Not authenticated', 'Log in first to refresh sessions.');
      return;
    }
    await loadSessions(token);
  };

  const clearHistory = async () => {
    setFileHistory([]);
    try {
      await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (error: any) {
      appendLog(`Clear history error: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLog([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Remote Desktop Android Client</Text>

        <Text style={styles.label}>Backend API URL</Text>
        <TextInput style={styles.input} value={backendUrl} onChangeText={setBackendUrl} placeholder="http://localhost:5000" autoCapitalize="none" />

        <Text style={styles.label}>Signaling Server URL</Text>
        <TextInput style={styles.input} value={signalingUrl} onChangeText={setSignalingUrl} placeholder="http://localhost:4000" autoCapitalize="none" />

        <Text style={styles.label}>Signaling Token</Text>
        <TextInput style={styles.input} value={signalingToken} onChangeText={setSignalingToken} placeholder="secret-token" autoCapitalize="none" secureTextEntry />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />

        <View style={styles.sectionHeader}>
          <Text style={styles.subheading}>Connection</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.badgeText}>{isViewerConnected ? 'Connected' : 'Disconnected'}</Text>
          </View>
        </View>
        <ConnectionPanel
          backendUrl={backendUrl}
          setBackendUrl={setBackendUrl}
          signalingUrl={signalingUrl}
          setSignalingUrl={setSignalingUrl}
          signalingToken={signalingToken}
          setSignalingToken={setSignalingToken}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          isViewerConnected={isViewerConnected}
          login={login}
          connectSignaling={connectSignaling}
          disconnectSignaling={disconnectSignaling}
          refreshDevices={refreshDevices}
          refreshSessions={refreshSessions}
          token={token}
        />
        <Text style={styles.statusText}>Backend: {backendUrl}</Text>
        <Text style={styles.statusText}>Signaling: {signalingUrl}</Text>

        <TabBar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        {currentTab === 'dashboard' && (
          <DashboardTab
            devices={devices}
            sessions={sessions}
            selectedAgent={selectedAgent}
            setSelectedAgent={setSelectedAgent}
          />
        )}

        {currentTab === 'control' && (
          <ControlTab
            selectedFileName={selectedFile?.name ?? null}
            selectedFileSize={selectedFile?.size ?? null}
            pickFile={pickFile}
            sendFileToAgent={sendFileToAgent}
            sendRemoteControl={sendRemoteControl}
            remoteStreamUrl={remoteStreamUrl}
            screenshotUri={screenshotUri}
          />
        )}

        {currentTab === 'files' && (
          <FilesTab
            remotePath={remotePath}
            remoteFiles={remoteFiles}
            remoteLoading={remoteLoading}
            selectedRemoteFile={selectedRemoteFile}
            requestAgentFileList={requestAgentFileList}
            goUpDirectory={goUpDirectory}
            downloadRemoteFile={downloadRemoteFile}
            navigateRemoteDirectory={navigateRemoteDirectory}
            setSelectedRemoteFile={setSelectedRemoteFile}
            downloadedFiles={downloadedFiles}
            openLocalFile={openLocalFile}
          />
        )}

        {currentTab === 'history' && (
          <HistoryTab fileHistory={fileHistory} log={log} clearHistory={clearHistory} clearLogs={clearLogs} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  subheading: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  label: { marginTop: 12, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  helpText: { color: '#666', marginBottom: 10 },
  screenshot: { width: '100%', height: 260, borderRadius: 12, backgroundColor: '#000' },
  deviceCard: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 10 },
  sessionCard: { padding: 12, borderWidth: 1, borderColor: '#cfd8dc', borderRadius: 10, marginBottom: 10, backgroundColor: '#f7fafc' },
  deviceName: { fontWeight: '700', marginBottom: 4 },
  deviceMeta: { color: '#555', fontSize: 12 },
  selectedDeviceCard: { borderColor: '#007aff', backgroundColor: '#eaf4ff' },
  statusText: { marginTop: 8, marginBottom: 10, color: '#333', fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  statusBadge: { backgroundColor: '#e0f7e9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#0a7d3a', fontWeight: '700' },
  historyControls: { flexDirection: 'row', alignItems: 'center' },
  controlButton: { marginLeft: 8 },
  tabBar: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12, backgroundColor: '#f0f4ff', borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTabButton: { backgroundColor: '#d9e7ff' },
  tabLabel: { color: '#444', fontWeight: '600' },
  activeTabLabel: { color: '#0f4cbb' },
  pageSection: { marginTop: 16, marginBottom: 16, padding: 10, backgroundColor: '#fbfbff', borderRadius: 14, borderWidth: 1, borderColor: '#e6e9f6' },
  fileCard: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 8, backgroundColor: '#fff' },
  fileCardSelected: { borderColor: '#007aff', backgroundColor: '#e8f0ff' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  historyCard: { padding: 12, borderWidth: 1, borderColor: '#d1c4e9', borderRadius: 10, marginBottom: 10, backgroundColor: '#faf4ff' },
  logHeading: { marginTop: 16, fontSize: 18, fontWeight: '600' },
  logLine: { marginTop: 8, padding: 10, backgroundColor: '#f2f2f2', borderRadius: 8 },
  logTime: { fontSize: 12, color: '#888' },
  logText: { marginTop: 4 }
});
