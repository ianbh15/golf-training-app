import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// ── Tab bar label (monochrome text-based — caddie book style) ──
//
// We intentionally render the label via `tabBarLabel` (and suppress the icon)
// because React Navigation wraps `tabBarIcon` output in a fixed-width 31px
// container — which truncated our text labels to "TO…", "CO…", "ST…" in the
// previous implementation. `tabBarLabel`, on the other hand, sits inside the
// flex:1 tab item and lays out at full width.
function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
      }}
    >
      <Text
        numberOfLines={1}
        allowFontScaling={false}
        style={{
          fontFamily: 'DMMono_500Medium',
          fontSize: 11,
          color: focused ? '#4ADE80' : '#4A4E4C',
          textTransform: 'uppercase',
          letterSpacing: 1,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
      <View
        style={{
          width: 24,
          height: 2,
          backgroundColor: focused ? '#4ADE80' : 'transparent',
          marginTop: 6,
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Guard: redirect to login if no session
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/(auth)/login');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login');
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // ~76px of content area above the safe-area inset gives a comfortable thumb
  // target on iPhone 12+ size devices while remaining compact on smaller ones.
  const TAB_BAR_CONTENT_HEIGHT = 76;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D0F0E',
          borderTopWidth: 1,
          borderTopColor: '#2A2E2C',
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          flex: 1,
          paddingVertical: 0,
        },
        tabBarActiveTintColor: '#4ADE80',
        tabBarInactiveTintColor: '#4A4E4C',
        // We render the label ourselves via `tabBarLabel` and hide the icon.
        tabBarShowLabel: true,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarLabel: ({ focused }) => <TabLabel label="Today" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarLabel: ({ focused }) => <TabLabel label="Practice" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="rounds"
        options={{
          title: 'Rounds',
          tabBarLabel: ({ focused }) => <TabLabel label="Rounds" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarLabel: ({ focused }) => <TabLabel label="Coach" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarLabel: ({ focused }) => <TabLabel label="Stats" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
