import { View, TouchableOpacity, Text } from 'react-native';

type AppTab = 'dashboard' | 'control' | 'files' | 'history';

type Props = {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
};

export default function TabBar({ currentTab, setCurrentTab }: Props) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12, backgroundColor: '#f0f4ff', borderRadius: 12, padding: 4 }}>
      {(['dashboard', 'control', 'files', 'history'] as AppTab[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: currentTab === tab ? '#d9e7ff' : 'transparent' }}
          onPress={() => setCurrentTab(tab)}
        >
          <Text style={{ color: currentTab === tab ? '#0f4cbb' : '#444', fontWeight: '600' }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
