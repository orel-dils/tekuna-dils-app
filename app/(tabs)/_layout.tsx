import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '\u{1F3E0}',
    send: '\u2191',
    receive: '\u2193',
    history: '\u{1F4CB}',
  };
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
      }}
    >
      <Text
        style={{
          fontSize: name === 'send' || name === 'receive' ? 20 : 18,
          color: focused ? Colors.gold : Colors.textTertiary,
          fontWeight: focused ? '800' : '400',
        }}
      >
        {icons[name]}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: 'rgba(197,160,40,0.15)',
          borderTopWidth: 0.5,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          writingDirection: 'rtl',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '\u05D1\u05D9\u05EA',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: '\u05E9\u05DC\u05D7',
          tabBarIcon: ({ focused }) => <TabIcon name="send" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: '\u05E7\u05D1\u05DC',
          tabBarIcon: ({ focused }) => <TabIcon name="receive" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="history" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
