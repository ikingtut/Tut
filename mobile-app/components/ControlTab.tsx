import { View, Text, Button, Image } from 'react-native';
import { RTCView } from 'react-native-webrtc';

type Props = {
  selectedFileName: string | null;
  selectedFileSize: number | null;
  pickFile: () => void;
  sendFileToAgent: () => void;
  sendRemoteControl: (action: string, payload?: object) => void;
  remoteStreamUrl: string;
  screenshotUri: string;
};

export default function ControlTab({
  selectedFileName,
  selectedFileSize,
  pickFile,
  sendFileToAgent,
  sendRemoteControl,
  remoteStreamUrl,
  screenshotUri,
}: Props) {
  const AnyRTCView = RTCView as any;

  return (
    <View style={{ marginTop: 16, marginBottom: 16, padding: 10, backgroundColor: '#fbfbff', borderRadius: 14, borderWidth: 1, borderColor: '#e6e9f6' }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>File transfer</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Button title="Pick File" onPress={pickFile} />
        <Button title="Send File" onPress={sendFileToAgent} disabled={!selectedFileName} />
      </View>
      {selectedFileName ? (
        <Text style={{ color: '#666', marginBottom: 10 }}>{selectedFileName} ({selectedFileSize ?? 0} bytes)</Text>
      ) : null}

      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>Remote Commands</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Button title="Request Screenshot" onPress={() => sendRemoteControl('screenshot')} />
        <Button title="Mouse Click" onPress={() => sendRemoteControl('mouseClick', { button: 'left' })} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Button title="Type Hello" onPress={() => sendRemoteControl('type', { text: 'Hello from Android' })} />
        <Button title="Press Enter" onPress={() => sendRemoteControl('press', { key: 'enter' })} />
      </View>

      {remoteStreamUrl ? (
        <AnyRTCView streamURL={remoteStreamUrl} style={{ width: '100%', height: 260, borderRadius: 12, backgroundColor: '#000' }} objectFit="cover" />
      ) : screenshotUri ? (
        <Image source={{ uri: screenshotUri }} style={{ width: '100%', height: 260, borderRadius: 12, backgroundColor: '#000' }} resizeMode="contain" />
      ) : (
        <Text style={{ color: '#666', marginBottom: 10 }}>No stream or screenshot received yet.</Text>
      )}
    </View>
  );
}
