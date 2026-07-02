import { View, Text, TextInput, Button } from 'react-native';

type Props = {
  backendUrl: string;
  setBackendUrl: (value: string) => void;
  signalingUrl: string;
  setSignalingUrl: (value: string) => void;
  signalingToken: string;
  setSignalingToken: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  isViewerConnected: boolean;
  login: () => void;
  connectSignaling: () => void;
  disconnectSignaling: () => void;
  refreshDevices: () => void;
  refreshSessions: () => void;
  token: string;
};

export default function ConnectionPanel({
  backendUrl,
  setBackendUrl,
  signalingUrl,
  setSignalingUrl,
  signalingToken,
  setSignalingToken,
  email,
  setEmail,
  password,
  setPassword,
  isViewerConnected,
  login,
  connectSignaling,
  disconnectSignaling,
  refreshDevices,
  refreshSessions,
  token,
}: Props) {
  return (
    <>
      <Text style={{ marginTop: 12, marginBottom: 6, fontWeight: '600' }}>Backend API URL</Text>
      <TextInput style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }} value={backendUrl} onChangeText={setBackendUrl} placeholder="http://localhost:5000" autoCapitalize="none" />

      <Text style={{ marginTop: 12, marginBottom: 6, fontWeight: '600' }}>Signaling Server URL</Text>
      <TextInput style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }} value={signalingUrl} onChangeText={setSignalingUrl} placeholder="http://localhost:4000" autoCapitalize="none" />

      <Text style={{ marginTop: 12, marginBottom: 6, fontWeight: '600' }}>Signaling Token</Text>
      <TextInput style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }} value={signalingToken} onChangeText={setSignalingToken} placeholder="secret-token" autoCapitalize="none" secureTextEntry />

      <Text style={{ marginTop: 12, marginBottom: 6, fontWeight: '600' }}>Email</Text>
      <TextInput style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }} value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />

      <Text style={{ marginTop: 12, marginBottom: 6, fontWeight: '600' }}>Password</Text>
      <TextInput style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 }}>
        <Button title="Login" onPress={login} />
        <Button title={isViewerConnected ? 'Disconnect' : 'Connect'} onPress={isViewerConnected ? disconnectSignaling : connectSignaling} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Button title="Refresh Devices" onPress={refreshDevices} disabled={!token} />
        <Button title="Refresh Sessions" onPress={refreshSessions} disabled={!token} />
      </View>
    </>
  );
}
