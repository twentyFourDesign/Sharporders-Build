import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth-context';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, uploadProfileImage } from '@/lib/api';

const CACHE_KEY = 'profile_driver';

type DriverProfile = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  truckType: string;
  licenseNumber: string;
  profilePhotoUrl: string | null;
};

type Truck = { id: string; name: string };

type LoadStats = { total: number; active: number };

export default function DriverProfileScreen() {
  const { user, token, signOut } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [truckType, setTruckType] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loadStats, setLoadStats] = useState<LoadStats>({ total: 0, active: 0 });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!token) return;

      // 1. Show cached data immediately — no blank flash
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw && isMounted) {
          const cached: DriverProfile = JSON.parse(raw);
          setFirstName(cached.firstName ?? '');
          setLastName(cached.lastName ?? '');
          setPhoneNumber(cached.phoneNumber ?? '');
          setTruckType(cached.truckType ?? '');
          setLicenseNumber(cached.licenseNumber ?? '');
          setProfilePhotoUrl(cached.profilePhotoUrl ?? null);
        }
      } catch { /* ignore */ }

      // 2. Fetch fresh data in background and update
      try {
        const me = await apiFetch<{
          firstName: string | null;
          lastName: string | null;
          phoneNumber: string | null;
          truckType: string | null;
          licenseNumber: string | null;
          profilePhotoUrl?: string | null;
        }>('/api/me', { method: 'GET', token });
        if (!isMounted) return;
        const fresh: DriverProfile = {
          firstName: me.firstName ?? '',
          lastName: me.lastName ?? '',
          phoneNumber: me.phoneNumber ?? '',
          truckType: me.truckType ?? '',
          licenseNumber: me.licenseNumber ?? '',
          profilePhotoUrl: me.profilePhotoUrl ?? null,
        };
        setFirstName(fresh.firstName);
        setLastName(fresh.lastName);
        setPhoneNumber(fresh.phoneNumber);
        setTruckType(fresh.truckType);
        setLicenseNumber(fresh.licenseNumber);
        setProfilePhotoUrl(fresh.profilePhotoUrl);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      } catch { /* ignore */ }

      // 3. Load available truck types for enum-style selection
      try {
        const data = await apiFetch<Truck[]>('/api/trucks', { method: 'GET' });
        if (!isMounted) return;
        setTrucks(data);
      } catch {
        // ignore, fallback to free text
      }

      // 4. Fetch load stats (driver acting as shipper)
      try {
        const loadsData = await apiFetch<{ id: string; status: string }[]>('/api/loads', { method: 'GET', token });
        if (!isMounted) return;
        setLoadStats({
          total: loadsData.length,
          active: loadsData.filter((l) => l.status === 'available').length,
        });
      } catch {
        // ignore
      }
    };

    loadProfile();
    return () => { isMounted = false; };
  }, [token]);

  const handlePickImage = async () => {
    if (!token) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to set your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setLocalImageUri(asset.uri);
    setImageUploading(true);
    try {
      const { url } = await uploadProfileImage(
        { uri: asset.uri, type: asset.mimeType ?? 'image/jpeg', name: 'avatar.jpg' },
        token,
      );
      setProfilePhotoUrl(url);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not upload image.');
      setLocalImageUri(null);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
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
      // Update cache immediately after save
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          truckType: truckType.trim(),
          licenseNumber: licenseNumber.trim(),
        }),
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
        <View style={styles.headerTitleBlock}>
          <Text style={styles.title}>Driver profile</Text>
          <Text style={styles.subTitle}>{user?.email}</Text>
        </View>
        <View style={styles.avatarWrapper}>
          {profilePhotoUrl || localImageUri ? (
            <Image
              source={{ uri: profilePhotoUrl ?? localImageUri ?? undefined }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {user?.email?.[0]?.toUpperCase() ?? 'D'}
              </Text>
            </View>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.8 }]}
          onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>

      {!editing && (
        <View style={styles.summaryCard}>
          <Pressable
            style={({ pressed }) => [styles.avatarButton, pressed && { opacity: 0.85 }]}
            onPress={handlePickImage}
            disabled={imageUploading}
          >
            <Text style={styles.avatarButtonText}>
              {profilePhotoUrl ? (imageUploading ? 'Updating photo…' : 'Change photo') : (imageUploading ? 'Uploading…' : 'Add profile photo')}
            </Text>
          </Pressable>
          <Text style={styles.summaryLabel}>Name</Text>
          <Text style={styles.summaryValue}>
            {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Not set'}
          </Text>
          <Text style={styles.summaryLabel}>Phone number</Text>
          <Text style={styles.summaryValue}>{phoneNumber || 'Not set'}</Text>
          <Text style={styles.summaryLabel}>Truck type</Text>
          <Text style={styles.summaryValue}>{truckType || 'Not set'}</Text>
          <Text style={styles.summaryLabel}>License number</Text>
          <Text style={styles.summaryValue}>{licenseNumber || 'Not set'}</Text>
          <Pressable
            style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.85 }]}
            onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Edit details</Text>
          </Pressable>
        </View>
      )}

      {/* My Posted Loads section */}
      {!editing && (
        <View style={styles.loadsSection}>
          <View style={styles.loadsSectionHeader}>
            <Text style={styles.loadsSectionTitle}>My posted loads</Text>
            <Pressable onPress={() => router.push('/(driver)/(tabs)/my-loads')}>
              <Text style={styles.loadsSectionLink}>View all</Text>
            </Pressable>
          </View>
          <View style={styles.loadsStatsRow}>
            <View style={styles.loadsStat}>
              <Text style={styles.loadsStatValue}>{loadStats.active}</Text>
              <Text style={styles.loadsStatLabel}>Live</Text>
            </View>
            <View style={styles.loadsStat}>
              <Text style={styles.loadsStatValue}>{loadStats.total}</Text>
              <Text style={styles.loadsStatLabel}>Total posted</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.postLoadBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/(driver)/create-load')}>
            <Text style={styles.postLoadBtnText}>+ Post a new load</Text>
          </Pressable>
        </View>
      )}

      {editing && (
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
  headerRow: { flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12 },
  headerTitleBlock: { alignItems: 'center', gap: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subTitle: { fontSize: 14, color: '#6B7280' },
  avatarWrapper: { marginLeft: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: '#4B5563' },
  summaryCard: {
    padding: 16, borderRadius: 16, borderWidth: 1,
    borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', gap: 8,
  },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 8 },
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 14, color: '#111827' },
  input: {
    borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
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
  button: {
    flex: 1, borderRadius: 999, backgroundColor: '#007AFF',
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
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#007AFF',
  },
  editButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  loadsSection: { borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, backgroundColor: '#F9FAFB', gap: 10 },
  loadsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loadsSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  loadsSectionLink: { fontSize: 13, color: '#007AFF', fontWeight: '500' },
  loadsStatsRow: { flexDirection: 'row', gap: 12 },
  loadsStat: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#ffffff', paddingVertical: 10, paddingHorizontal: 12 },
  loadsStatValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  loadsStatLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  postLoadBtn: { borderRadius: 8, paddingVertical: 10, backgroundColor: '#111827', alignItems: 'center' },
  postLoadBtn: { borderRadius: 8, paddingVertical: 10, backgroundColor: '#007AFF', alignItems: 'center' },
  postLoadBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  avatarButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  avatarButtonText: { fontSize: 12, color: '#111827', fontWeight: '500' },
});
