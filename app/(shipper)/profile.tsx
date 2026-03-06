import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth-context';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, uploadProfileImage } from '@/lib/api';

const CACHE_KEY = 'profile_shipper';

type ShipperProfile = {
  businessName: string;
  phone: string;
  profilePhotoUrl: string | null;
};

export default function ShipperProfileScreen() {
  const { user, token, signOut } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
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
          const cached: ShipperProfile = JSON.parse(raw);
          setBusinessName(cached.businessName ?? '');
          setPhone(cached.phone ?? '');
          setProfilePhotoUrl(cached.profilePhotoUrl ?? null);
        }
      } catch { /* ignore */ }

      // 2. Fetch fresh data in background and update
      try {
        const me = await apiFetch<{ businessName: string | null; phone: string | null; profilePhotoUrl?: string | null }>(
          '/api/me', { method: 'GET', token },
        );
        if (!isMounted) return;
        const fresh: ShipperProfile = {
          businessName: me.businessName ?? '',
          phone: me.phone ?? '',
          profilePhotoUrl: me.profilePhotoUrl ?? null,
        };
        setBusinessName(fresh.businessName);
        setPhone(fresh.phone);
        setProfilePhotoUrl(fresh.profilePhotoUrl);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      } catch { /* ignore */ }
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
    try {
      setSaving(true);
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          businessName: businessName.trim(),
          phone: phone.trim() || null,
          profilePhotoUrl: profilePhotoUrl ?? null,
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
        <View style={styles.headerTitleBlock}>
          <Text style={styles.title}>Shipper profile</Text>
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
                {user?.email?.[0]?.toUpperCase() ?? 'S'}
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
  headerRow: { flexDirection: 'column', alignItems: 'center', gap: 12 },
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
  field: { gap: 6 },
  label: { fontSize: 14, color: '#111827' },
  input: {
    borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
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
