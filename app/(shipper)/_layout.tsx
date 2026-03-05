import { Stack } from 'expo-router';

export default function ShipperLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}

