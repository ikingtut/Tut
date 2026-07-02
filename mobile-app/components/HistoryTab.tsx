import { View, Text, Button } from 'react-native';

type FileHistoryEntry = {
  id: string;
  name: string;
  direction: 'sent' | 'received' | 'downloaded';
  agentId: string;
  timestamp: number;
  status: string;
  path?: string;
};

type LogLine = { time: string; message: string };

type Props = {
  fileHistory: FileHistoryEntry[];
  log: LogLine[];
  clearHistory: () => void;
  clearLogs: () => void;
};

export default function HistoryTab({ fileHistory, log, clearHistory, clearLogs }: Props) {
  return (
    <View style={{ marginTop: 16, marginBottom: 16, padding: 10, backgroundColor: '#fbfbff', borderRadius: 14, borderWidth: 1, borderColor: '#e6e9f6' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Transfer History</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginLeft: 8 }}>
            <Button title="Clear" onPress={clearHistory} />
          </View>
          <View style={{ marginLeft: 8 }}>
            <Button title="Clear logs" onPress={clearLogs} />
          </View>
        </View>
      </View>

      {fileHistory.length === 0 ? (
        <Text style={{ color: '#666', marginBottom: 10 }}>No file transfer history yet.</Text>
      ) : fileHistory.map((entry) => (
        <View key={entry.id} style={{ padding: 12, borderWidth: 1, borderColor: '#d1c4e9', borderRadius: 10, marginBottom: 10, backgroundColor: '#faf4ff' }}>
          <Text style={{ fontWeight: '700', marginBottom: 4 }}>{entry.name}</Text>
          <Text style={{ color: '#555', fontSize: 12 }}>{entry.direction.toUpperCase()} · {entry.agentId}</Text>
          <Text style={{ color: '#555', fontSize: 12 }}>{new Date(entry.timestamp).toLocaleString()} · {entry.status}</Text>
          {entry.path ? <Text style={{ color: '#555', fontSize: 12 }}>Saved: {entry.path}</Text> : null}
        </View>
      ))}

      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>Event Log</Text>
      {log.length === 0 ? (
        <Text style={{ color: '#666', marginBottom: 10 }}>No logs yet.</Text>
      ) : log.map((entry, index) => (
        <View key={`${entry.time}-${index}`} style={{ marginTop: 8, padding: 10, backgroundColor: '#f2f2f2', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#888' }}>{entry.time}</Text>
          <Text style={{ marginTop: 4 }}>{entry.message}</Text>
        </View>
      ))}
    </View>
  );
}
