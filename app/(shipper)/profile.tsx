import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function ShipperProfileScreen() {
  const { user, token, signOut } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!token) return;
      try {
        const me = await apiFetch<{
          businessName: string | null;
          phone: string | null;
        }>('/api/me', { method: 'GET', token });
        if (!isMounted) return;
        setBusinessName(me.businessName ?? '');
        setPhone(me.phone ?? '');
      } catch {
        // ignore
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSave = async () => {
    if (!token) return;

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

      Alert.alert('Saved', 'Your profile has been updated.');
      setEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/role-select');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Shipper profile</Text>
          <Text style={styles.subTitle}>{user?.email}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>

      {!editing && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Business name</Text>
          <Text style={styles.summaryValue}>{businessName || 'Not set'}</Text>
          <Text style={styles.summaryLabel}>Business phone</Text>
          <Text style={styles.summaryValue}>{phone || 'Not set'}</Text>

          <Pressable
            style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}
            onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Edit details</Text>
          </Pressable>
        </View>
      )}

      {editing && (
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

          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
              onPress={() => setEditing(false)}
              disabled={saving}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleSave}
              disabled={saving}>
              <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save changes'}</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  subTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  secondaryButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  secondaryButtonPressed: {
    opacity: 0.9,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  logoutButtonPressed: {
    opacity: 0.9,
  },
  logoutButtonText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '500',
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#111827',
  },
  editButtonPressed: {
    opacity: 0.9,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});

