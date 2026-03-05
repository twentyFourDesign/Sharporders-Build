import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="role-select" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup-shipper" />
      <Stack.Screen name="signup-driver" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}


