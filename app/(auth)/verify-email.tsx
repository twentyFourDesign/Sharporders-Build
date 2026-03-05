import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

type Role = 'shipper' | 'driver';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ role?: Role; email?: string }>();
  const { verifyOtp } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roleParam: Role = (params.role as Role) ?? 'shipper';
  const email = (params.email as string) ?? '';

  const handleVerify = async () => {
    if (!code) {
      Alert.alert('Missing code', 'Enter the code from your email.');
      return;
    }

    try {
      setSubmitting(true);
      const role = await verifyOtp({ email, code });

      if (role === 'shipper') {
        router.replace('/(shipper)/onboarding');
      } else {
        router.replace('/(driver)/onboarding');
      }
    } catch (error: any) {
      Alert.alert('Verification failed', error?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTP verification</Text>
      <Text style={styles.body}>
        Enter the 6 digit code sent to {email || 'your email'} to verify your account.
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Verification code</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoCapitalize="none"
          style={styles.input}
          placeholder="••••••"
          placeholderTextColor="#A0AEC0"
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={handleVerify}
        disabled={submitting}>
        <Text style={styles.buttonText}>
          {submitting ? 'Verifying…' : 'VERIFY'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
  },
  field: {
    marginTop: 24,
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  button: {
    marginTop: 24,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

