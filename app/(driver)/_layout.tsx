import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="apply-load/[id]" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}

