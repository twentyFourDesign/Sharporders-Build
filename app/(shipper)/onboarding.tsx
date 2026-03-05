import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function ShipperOnboardingScreen() {
  const { token } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!token) {
      Alert.alert('Not signed in', 'Please sign in again.');
      router.replace('/(auth)');
      return;
    }

    if (!businessName) {
      Alert.alert('Missing details', 'Business name is required.');
      return;
    }

    try {
      setSaving(true);
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          businessName: businessName.trim(),
          phone: phone.trim() || null,
        }),
        token,
      });

      router.replace('/(shipper)/(tabs)/profile');
    } catch (error: any) {
      Alert.alert('Could not save details', error.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tell us about your business</Text>
      <Text style={styles.body}>These details help drivers recognise and trust your loads.</Text>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Business name</Text>
          <TextInput
            value={businessName}
            onChangeText={setBusinessName}
            style={styles.input}
            placeholder="Sharp Logistics Ltd."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Business phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            placeholder="+234 800 000 0000"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleSave}
          disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Continue to profile'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  form: {
    marginTop: 24,
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
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});

