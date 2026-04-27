import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// ── Tab bar icons (monochrome text-based — caddie book style) ──

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
      <Text
        style={{
          fontFamily: 'DMMono_500Medium',
          fontSize: 8,
          color: focused ? '#4ADE80' : '#4A4E4C',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
        }}
      >
        {label}
      </Text>
      {focused && (
        <View
          style={{
            width: 18,
            height: 1,
            backgroundColor: '#4ADE80',
            marginTop: 3,
          }}
        />
      )}
    </View>
  );
}

export default function TabLayout() {
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D0F0E',
          borderTopWidth: 1,
          borderTopColor: '#2A2E2C',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#4ADE80',
        tabBarInactiveTintColor: '#4A4E4C',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => <TabIcon label="Today" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: ({ focused }) => <TabIcon label="Practice" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="rounds"
        options={{
          title: 'Rounds',
          tabBarIcon: ({ focused }) => <TabIcon label="Rounds" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ focused }) => <TabIcon label="Coach" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused }) => <TabIcon label="Stats" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
