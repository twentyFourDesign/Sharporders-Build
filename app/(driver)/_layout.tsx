import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="apply-load/[id]" />
      <Stack.Screen name="create-load" />
      <Stack.Screen name="load-bids/[id]" />
      <Stack.Screen name="shipment/[id]" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="support" />
      <Stack.Screen name="support/[id]" />
      <Stack.Screen name="about" />
    </Stack>
  );
}

