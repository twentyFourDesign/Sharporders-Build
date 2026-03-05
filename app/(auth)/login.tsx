import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing details', 'Please fill in email and password.');
      return;
    }

    try {
      setSubmitting(true);
      const roleOrStatus = await signIn(email.trim(), password);

      if (roleOrStatus === 'otp_required') {
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: email.trim() },
        });
        return;
      }

      if (roleOrStatus === 'shipper') {
        router.replace('/(shipper)/(tabs)/dashboard');
      } else {
        router.replace('/(driver)/(tabs)/dashboard');
      }
    } catch (error: any) {
      Alert.alert('Login failed', error.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Log in to manage your shipments and loads.</Text>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#6B7280"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#6B7280"
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            submitting && styles.buttonDisabled,
          ]}>
          <Text style={styles.buttonText}>{submitting ? 'Logging in…' : 'Log in'}</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.footerLink, pressed && styles.footerLinkPressed]}
        onPress={() => router.replace('/(auth)/role-select')}>
        <Text style={styles.footerLinkText}>New to SharpOrder? Create an account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  form: {
    marginTop: 8,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: '#111827',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  button: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#111827',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  footerLink: {
    marginTop: 'auto',
    paddingVertical: 8,
  },
  footerLinkPressed: {
    opacity: 0.7,
  },
  footerLinkText: {
    textAlign: 'center',
    color: '#111827',
    fontSize: 14,
  },
});

