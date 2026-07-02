import { View, Text, TextInput, TouchableOpacity } from 'react-native';

type Device = {
  agent_id: string;
  name: string;
  platform: string;
  status: string;
};

type Session = {
  id: number;
  agent_id: string;
  status: string;
  created_at: string;
  ended_at: string | null;
};

type Props = {
  devices: Device[];
  sessions: Session[];
  selectedAgent: string;
  setSelectedAgent: (agent: string) => void;
};

export default function DashboardTab({ devices, sessions, selectedAgent, setSelectedAgent }: Props) {
  return (
    <View style={{ marginTop: 16, marginBottom: 16, padding: 10, backgroundColor: '#fbfbff', borderRadius: 14, borderWidth: 1, borderColor: '#e6e9f6' }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>Registered Devices</Text>
      {devices.length === 0 && <Text style={{ color: '#666', marginBottom: 10 }}>Login to load your registered devices.</Text>}
      {devices.map((device) => (
        <TouchableOpacity
          key={device.agent_id}
          style={{ padding: 12, borderWidth: 1, borderColor: selectedAgent === device.agent_id ? '#007aff' : '#ddd', borderRadius: 10, marginBottom: 10, backgroundColor: selectedAgent === device.agent_id ? '#eaf4ff' : '#fff' }}
          onPress={() => setSelectedAgent(device.agent_id)}
        >
          <Text style={{ fontWeight: '700', marginBottom: 4 }}>{device.name}</Text>
          <Text style={{ color: '#555', fontSize: 12 }}>{device.platform} · {device.status}</Text>
          <Text style={{ color: '#555', fontSize: 12 }}>id: {device.agent_id}</Text>
        </TouchableOpacity>
      ))}

      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>Recent Viewer Sessions</Text>
      {sessions.length === 0 && <Text style={{ color: '#666', marginBottom: 10 }}>No session history yet.</Text>}
      {sessions.map((session) => (
        <View key={session.id} style={{ padding: 12, borderWidth: 1, borderColor: '#cfd8dc', borderRadius: 10, marginBottom: 10, backgroundColor: '#f7fafc' }}>
          <Text style={{ fontWeight: '700', marginBottom: 4 }}>Agent: {session.agent_id}</Text>
          <Text style={{ color: '#555', fontSize: 12 }}>Status: {session.status}</Text>
          <Text style={{ color: '#555', fontSize: 12 }}>Started: {new Date(session.created_at).toLocaleString()}</Text>
          <Text style={{ color: '#555', fontSize: 12 }}>Ended: {session.ended_at ? new Date(session.ended_at).toLocaleString() : 'Active'}</Text>
        </View>
      ))}

      <Text style={{ marginTop: 12, marginBottom: 6, fontWeight: '600' }}>Selected Agent ID</Text>
      <TextInput style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }} value={selectedAgent} onChangeText={setSelectedAgent} placeholder="laptop-1" autoCapitalize="none" />
    </View>
  );
}
