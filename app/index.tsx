import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

export default function Index() {
  const { user, token, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!token || !user) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (user.role === 'shipper') {
    return <Redirect href="/(shipper)/(tabs)/dashboard" />;
  }

  return <Redirect href="/(driver)/(tabs)/dashboard" />;
}

