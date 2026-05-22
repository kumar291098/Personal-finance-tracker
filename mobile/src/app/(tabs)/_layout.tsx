import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme';

type TabIconProps = {
  emoji: string;
  label: string;
  focused: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
};

function TabIcon({ emoji, label, focused, colors }: TabIconProps) {
  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderRadius: 20,
          minWidth: 42,
        },
        focused && {
          backgroundColor: `${colors.primary}22`,
          flexDirection: 'row',
          gap: 5,
          paddingHorizontal: 12,
        },
      ]}
    >
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      {focused && (
        <Text
          style={{
            color: colors.primary,
            fontSize: 11,
            fontWeight: '700',
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💳" label="Txns" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Analytics" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏷️" label="Categories" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⭐" label="Plan" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} colors={colors} />
          ),
        }}
      />
    </Tabs>
  );
}
