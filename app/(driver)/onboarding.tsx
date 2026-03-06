import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

type Truck = {
  id: string;
  name: string;
};

export default function DriverOnboardingScreen() {
  const { token } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [truckType, setTruckType] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadTrucks = async () => {
      try {
        const data = await apiFetch<Truck[]>('/api/trucks', { method: 'GET' });
        if (!isMounted) return;
        setTrucks(data);
      } catch {
        // ignore
      }
    };

    loadTrucks();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!token) {
      Alert.alert('Not signed in', 'Please sign in again.');
      router.replace('/(auth)');
      return;
    }

    if (!firstName || !lastName) {
      Alert.alert('Missing details', 'First and last name are required.');
      return;
    }

    try {
      setSaving(true);
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim() || null,
          truckType: truckType.trim() || null,
          licenseNumber: licenseNumber.trim() || null,
        }),
        token,
      });

      router.replace('/(driver)/(tabs)/profile');
    } catch (error: any) {
      Alert.alert('Could not save details', error.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set up your driver profile</Text>
      <Text style={styles.body}>
        These details help shippers understand who you are and what truck you drive.
      </Text>

      <View style={styles.form}>
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              placeholder="John"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
              placeholder="Doe"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            style={styles.input}
            placeholder="+234 800 000 0000"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Truck type</Text>
          {trucks.length > 0 ? (
            <View style={styles.chipRow}>
              {trucks.map((t) => {
                const selected = truckType === t.name;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTruckType(t.name)}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipSelected,
                      pressed && styles.chipPressed,
                    ]}>
                    <Text style={selected ? styles.chipTextSelected : styles.chipText}>
                      {t.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <TextInput
              value={truckType}
              onChangeText={setTruckType}
              style={styles.input}
              placeholder="10-tyre, 40ft trailer…"
              placeholderTextColor="#9CA3AF"
            />
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>License number</Text>
          <TextInput
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            style={styles.input}
            placeholder="ABC-123-456"
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 24,
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
  form: {
    marginTop: 24,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
    backgroundColor: '#007AFF',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipText: {
    fontSize: 13,
    color: '#111827',
  },
  chipTextSelected: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
});

