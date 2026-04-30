import { Stack } from 'expo-router';

export default function RoundsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0D0F0E' },
      }}
    />
  );
}
