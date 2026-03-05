import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

const CACHE_KEY = 'profile_shipper';

type ShipperProfile = {
  businessName: string;
  phone: string;
};

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

      // 1. Show cached data immediately — no blank flash
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw && isMounted) {
          const cached: ShipperProfile = JSON.parse(raw);
          setBusinessName(cached.businessName ?? '');
          setPhone(cached.phone ?? '');
        }
      } catch { /* ignore */ }

      // 2. Fetch fresh data in background and update
      try {
        const me = await apiFetch<{ businessName: string | null; phone: string | null }>(
          '/api/me', { method: 'GET', token },
        );
        if (!isMounted) return;
        const fresh: ShipperProfile = {
          businessName: me.businessName ?? '',
          phone: me.phone ?? '',
        };
        setBusinessName(fresh.businessName);
        setPhone(fresh.phone);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      } catch { /* ignore */ }
    };

    loadProfile();
    return () => { isMounted = false; };
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
      // Update cache immediately after save
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ businessName: businessName.trim(), phone: phone.trim() }),
      );
      Alert.alert('Saved', 'Your profile has been updated.');
      setEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(CACHE_KEY);
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
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.8 }]}
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
            style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.85 }]}
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
              style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.9 }]}
              onPress={() => setEditing(false)}
              disabled={saving}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, gap: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subTitle: { fontSize: 14, color: '#6B7280' },
  summaryCard: {
    padding: 16, borderRadius: 16, borderWidth: 1,
    borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', gap: 8,
  },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 8 },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 14, color: '#111827' },
  input: {
    borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
  },
  button: {
    flex: 1, borderRadius: 999, backgroundColor: '#111827',
    paddingVertical: 12, alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  secondaryButton: {
    flex: 1, borderRadius: 999, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#ffffff', alignItems: 'center',
  },
  secondaryButtonText: { color: '#111827', fontSize: 14, fontWeight: '500' },
  logoutButton: {
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#ffffff',
  },
  logoutButtonText: { color: '#b91c1c', fontSize: 13, fontWeight: '500' },
  editButton: {
    alignSelf: 'flex-start', marginTop: 8, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#111827',
  },
  editButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
});
