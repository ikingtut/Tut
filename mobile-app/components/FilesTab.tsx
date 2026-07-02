import { View, Text, Button, TouchableOpacity } from 'react-native';

type RemoteFileItem = {
  name: string;
  size: number;
  modifiedAt: string;
  isDirectory: boolean;
};

type LocalDownloadItem = {
  name: string;
  size: number;
  uri: string;
};

type Props = {
  remotePath: string;
  remoteFiles: RemoteFileItem[];
  remoteLoading: boolean;
  selectedRemoteFile: string;
  requestAgentFileList: (path?: string) => void;
  goUpDirectory: () => void;
  downloadRemoteFile: () => void;
  navigateRemoteDirectory: (path: string) => void;
  setSelectedRemoteFile: (name: string) => void;
  downloadedFiles: LocalDownloadItem[];
  openLocalFile: (file: LocalDownloadItem) => void;
};

export default function FilesTab({
  remotePath,
  remoteFiles,
  remoteLoading,
  selectedRemoteFile,
  requestAgentFileList,
  goUpDirectory,
  downloadRemoteFile,
  navigateRemoteDirectory,
  setSelectedRemoteFile,
  downloadedFiles,
  openLocalFile,
}: Props) {
  return (
    <View style={{ marginTop: 16, marginBottom: 16, padding: 10, backgroundColor: '#fbfbff', borderRadius: 14, borderWidth: 1, borderColor: '#e6e9f6' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Agent File Browser</Text>
        <Text style={{ color: '#0a7d3a', fontWeight: '700' }}>/{remotePath || ''}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Button title="Refresh" onPress={() => requestAgentFileList(remotePath)} />
        <Button title="Up" onPress={goUpDirectory} disabled={!remotePath} />
        <Button title="Download" onPress={downloadRemoteFile} disabled={!selectedRemoteFile} />
      </View>
      {remoteLoading ? (
        <Text style={{ color: '#666', marginBottom: 10 }}>Loading remote files...</Text>
      ) : remoteFiles.length === 0 ? (
        <Text style={{ color: '#666', marginBottom: 10 }}>No remote files loaded. Refresh to browse agent files.</Text>
      ) : (
        remoteFiles.map((file) => (
          <TouchableOpacity
            key={file.name}
            style={{ padding: 12, borderWidth: 1, borderColor: selectedRemoteFile === file.name ? '#007aff' : '#ddd', borderRadius: 10, marginBottom: 8, backgroundColor: selectedRemoteFile === file.name ? '#e8f0ff' : '#fff' }}
            onPress={() => {
              if (file.isDirectory) {
                navigateRemoteDirectory(remotePath ? `${remotePath}/${file.name}` : file.name);
              } else {
                setSelectedRemoteFile(file.name);
              }
            }}
          >
            <Text style={{ fontWeight: '700', marginBottom: 4 }}>{file.name}</Text>
            <Text style={{ color: '#555', fontSize: 12 }}>{file.isDirectory ? 'Folder' : `${file.size} bytes`} · {file.modifiedAt}</Text>
          </TouchableOpacity>
        ))
      )}

      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>Downloaded Files</Text>
      {downloadedFiles.length === 0 ? (
        <Text style={{ color: '#666', marginBottom: 10 }}>No downloaded files yet.</Text>
      ) : downloadedFiles.map((file) => (
        <TouchableOpacity key={file.name} style={{ padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 8, backgroundColor: '#fff' }} onPress={() => openLocalFile(file)}>
          <Text style={{ fontWeight: '700', marginBottom: 4 }}>{file.name}</Text>
          <Text style={{ color: '#555', fontSize: 12 }}>{file.size} bytes</Text>
          <Text style={{ color: '#555', fontSize: 12 }}>Path: {file.uri}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
