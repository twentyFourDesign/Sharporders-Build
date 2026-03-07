import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth-context';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, uploadProfileImage, uploadTruckImage, updateMeTruckImages } from '@/lib/api';

const CACHE_KEY = 'profile_driver';

type DriverProfile = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  truckType: string;
  licenseNumber: string;
  profilePhotoUrl: string | null;
  truckImageUrls: string[];
};

type Truck = { id: string; name: string };

type LoadStats = { total: number; active: number };

function Row({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <Pressable style={styles.infoRow} onPress={onEdit}>
      <View style={styles.infoRowLeft}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not set'}</Text>
      </View>
      <Text style={styles.editLink}>Edit</Text>
    </Pressable>
  );
}

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
  const [truckImageUrls, setTruckImageUrls] = useState<string[]>([]);
  const [truckImageUploading, setTruckImageUploading] = useState(false);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(
    async (fromPull = false) => {
      if (!token) return;
      if (fromPull) setRefreshing(true);

      let isMounted = true;
      try {
        if (!fromPull) {
          const raw = await AsyncStorage.getItem(CACHE_KEY);
          if (raw && isMounted) {
            const cached: DriverProfile = JSON.parse(raw);
            setFirstName(cached.firstName ?? '');
            setLastName(cached.lastName ?? '');
            setPhoneNumber(cached.phoneNumber ?? '');
            setTruckType(cached.truckType ?? '');
            setLicenseNumber(cached.licenseNumber ?? '');
            setProfilePhotoUrl(cached.profilePhotoUrl ?? null);
            setTruckImageUrls(Array.isArray(cached.truckImageUrls) ? cached.truckImageUrls : []);
          }
        }

        try {
          const me = await apiFetch<{
            firstName: string | null;
            lastName: string | null;
            phoneNumber: string | null;
            truckType: string | null;
            licenseNumber: string | null;
            profilePhotoUrl?: string | null;
            truckImageUrls?: string[];
            isBlacklisted?: boolean;
            suspendedUntil?: string | null;
          }>('/api/me', { method: 'GET', token });
          if (!isMounted) return;
          const urls = Array.isArray(me.truckImageUrls) ? me.truckImageUrls : [];
          const fresh: DriverProfile = {
            firstName: me.firstName ?? '',
            lastName: me.lastName ?? '',
            phoneNumber: me.phoneNumber ?? '',
            truckType: me.truckType ?? '',
            licenseNumber: me.licenseNumber ?? '',
            profilePhotoUrl: me.profilePhotoUrl ?? null,
            truckImageUrls: urls,
          };
          setFirstName(fresh.firstName);
          setLastName(fresh.lastName);
          setPhoneNumber(fresh.phoneNumber);
          setTruckType(fresh.truckType);
          setLicenseNumber(fresh.licenseNumber);
          setProfilePhotoUrl(fresh.profilePhotoUrl);
          setTruckImageUrls(urls);
          setIsBlacklisted(me.isBlacklisted ?? false);
          setSuspendedUntil(me.suspendedUntil ?? null);
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
        } catch { /* ignore */ }

        try {
          const data = await apiFetch<Truck[]>('/api/trucks', { method: 'GET' });
          if (!isMounted) return;
          setTrucks(data);
        } catch { /* ignore */ }

        try {
          const loadsData = await apiFetch<{ id: string; status: string }[]>('/api/loads', {
            method: 'GET',
            token,
          });
          if (!isMounted) return;
          setLoadStats({
            total: loadsData.length,
            active: loadsData.filter((l) => l.status === 'available').length,
          });
        } catch { /* ignore */ }
      } finally {
        if (fromPull) setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          truckType: truckType.trim(),
          licenseNumber: licenseNumber.trim(),
          profilePhotoUrl,
          truckImageUrls,
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

  const handleDeleteTruck = () => {
    Alert.alert(
      'Remove truck type',
      'Clear your truck type from profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setTruckType('');
            if (token) {
              apiFetch('/api/users', {
                method: 'POST',
                body: JSON.stringify({ truckType: null }),
                token,
              }).catch(() => {});
            }
          },
        },
      ],
    );
  };

  const handlePickTruckImage = async () => {
    if (!token) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to add truck images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setTruckImageUploading(true);
    try {
      const { url } = await uploadTruckImage(
        { uri: asset.uri, type: asset.mimeType ?? 'image/jpeg', name: 'truck.jpg' },
        token,
      );
      setTruckImageUrls((prev) => [...prev, url]);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not upload image.');
    } finally {
      setTruckImageUploading(false);
    }
  };

  const handleRemoveTruckImage = (url: string) => {
    const next = truckImageUrls.filter((u) => u !== url);
    setTruckImageUrls(next);
    if (token) {
      updateMeTruckImages(next, token).catch(() => {});
    }
  };

  const displayName =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : user?.email ?? 'Driver';

  // ─── Edit mode (full form) ───
  if (editing) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setEditing(false)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Edit profile</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                placeholder="First name"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                placeholder="Last name"
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
              placeholder="e.g. 123-569-897"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>License number</Text>
            <TextInput
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              style={styles.input}
              placeholder="e.g. 123-569-897"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Truck type (choose from list)</Text>
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
              <Text style={styles.noTrucksHint}>Loading truck types from database…</Text>
            )}
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.9 }]}
              onPress={() => setEditing(false)}
              disabled={saving}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
              onPress={handleSave}
              disabled={saving}>
              <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  const isSuspended =
    suspendedUntil != null && new Date(suspendedUntil) > new Date();

  // ─── View mode (design from reference) ───
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} />
      }>
      {(isBlacklisted || isSuspended) && (
        <View style={[styles.statusBanner, isBlacklisted && styles.statusBannerBlacklist, isSuspended && styles.statusBannerSuspended]}>
          <Text style={styles.statusBannerText}>
            {isBlacklisted
              ? 'Your account is blacklisted. Please contact support.'
              : `Your account is suspended until ${new Date(suspendedUntil!).toLocaleString()}. Please contact support.`}
          </Text>
        </View>
      )}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Avatar + Name */}
      <Pressable
        style={({ pressed }) => [styles.avatarSection, pressed && { opacity: 0.9 }]}
        onPress={handlePickImage}
        disabled={imageUploading}>
        <View style={styles.avatarRing}>
          {profilePhotoUrl || localImageUri ? (
            <Image
              source={{ uri: profilePhotoUrl ?? localImageUri ?? undefined }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
          )}
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        {imageUploading && (
          <Text style={styles.avatarHint}>Updating photo…</Text>
        )}
      </Pressable>

      {/* Personal & license info rows */}
      <View style={styles.sheet}>
        <Row
          label="Phone Number"
          value={phoneNumber}
          onEdit={() => setEditing(true)}
        />
        <View style={styles.separator} />
        <Row
          label="License Number"
          value={licenseNumber}
          onEdit={() => setEditing(true)}
        />
        <View style={styles.separator} />
        <Row
          label="Truck Type"
          value={truckType}
          onEdit={() => setEditing(true)}
        />
      </View>

      {/* Truck details card */}
      <View style={styles.truckCard}>
        <View style={styles.truckCardHeader}>
          <Text style={styles.truckIcon}>🚛</Text>
          <View style={styles.truckCardBody}>
            <Text style={styles.truckLine}>
              Truck: {truckType || 'Not set'}
            </Text>
            <Text style={styles.truckModel}>Model: —</Text>
          </View>
        </View>
        {truckImageUrls.length > 0 && (
          <View style={styles.truckThumbsRow}>
            {truckImageUrls.map((url) => (
              <View key={url} style={styles.truckThumbWrap}>
                <Image source={{ uri: url }} style={styles.truckThumb} resizeMode="cover" />
                <Pressable
                  style={styles.truckThumbRemove}
                  onPress={() => handleRemoveTruckImage(url)}>
                  <Text style={styles.truckThumbRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <View style={styles.truckActions}>
          <Pressable
            style={({ pressed }) => [styles.truckActionBtn, pressed && { opacity: 0.8 }]}
            onPress={handleDeleteTruck}>
            <Text style={styles.deleteText}>🗑 Delete</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.truckActionBtn, pressed && { opacity: 0.8 }]}
            onPress={() => setEditing(true)}>
            <Text style={styles.addNewText}>Truck type</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.truckActionBtn, pressed && { opacity: 0.8 }]}
            onPress={handlePickTruckImage}
            disabled={truckImageUploading}>
            <Text style={styles.addNewText}>
              {truckImageUploading ? '…' : '+ Truck photo'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Quick links */}
      <View style={styles.sheet}>
        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/(driver)/wallet')}>
          <Text style={styles.settingLabel}>💰 My Wallet</Text>
          <Text style={styles.settingChevron}>›</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/(driver)/notifications')}>
          <Text style={styles.settingLabel}>🔔 Notification Center</Text>
          <Text style={styles.settingChevron}>›</Text>
        </Pressable>
      </View>

      {/* App settings */}
      <View style={styles.sheet}>
        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/(driver)/support')}>
          <Text style={styles.settingLabel}>🎧 Support</Text>
          <Text style={styles.settingChevron}>›</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable
          style={styles.settingRow}
          onPress={async () => {
            if (!token) return;
            try {
              const ticket = await apiFetch<{ id: string }>('/api/support/chat-with-admin', { method: 'GET', token });
              router.push(`/(driver)/support/${ticket.id}`);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not open chat.');
            }
          }}>
          <Text style={styles.settingLabel}>💬 Chat with admin</Text>
          <Text style={styles.settingChevron}>›</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/(driver)/about')}>
          <Text style={styles.settingLabel}>ℹ️ About</Text>
          <Text style={styles.settingChevron}>›</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable
          style={styles.settingRow}
          onPress={() => Alert.alert('Coming soon', 'App settings will be available in a future update.')}>
          <Text style={styles.settingLabel}>Settings</Text>
          <Text style={styles.settingChevron}>›</Text>
        </Pressable>
        <View style={styles.separator} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Language</Text>
          <Text style={styles.settingValue}>English ▾</Text>
        </View>
      </View>

      {/* Driver acting as shipper (My posted loads) is temporarily disabled */}

      {/* Log out */}
      <Pressable
        style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.9 }]}
        onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>LOG OUT</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backBtnText: { fontSize: 18, color: '#111827', fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 44 },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  avatarIcon: { fontSize: 40 },
  displayName: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 12 },
  avatarHint: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  sheet: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoRowLeft: { flex: 1 },
  infoLabel: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500', color: '#111827' },
  editLink: { fontSize: 14, fontWeight: '500', color: '#007AFF' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 16 },

  truckCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  truckCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  truckIcon: { fontSize: 28 },
  truckCardBody: { flex: 1 },
  truckLine: { fontSize: 15, fontWeight: '600', color: '#111827' },
  truckModel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  truckThumbsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  truckThumbWrap: { position: 'relative' },
  truckThumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#E5E7EB' },
  truckThumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  truckThumbRemoveText: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 20 },
  truckActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  truckActionBtn: { paddingVertical: 4 },
  deleteText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
  addNewText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLabel: { fontSize: 15, color: '#111827' },
  settingAction: { fontSize: 14, color: '#007AFF', fontWeight: '500' },
  settingChevron: { fontSize: 18, color: '#9CA3AF', fontWeight: '300' },
  settingValue: { fontSize: 14, color: '#6B7280' },

  loadsSection: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#F9FAFB',
    marginBottom: 24,
  },
  loadsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loadsSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  loadsSectionLink: { fontSize: 13, color: '#007AFF', fontWeight: '500' },
  loadsStatsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  loadsStat: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  loadsStatValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  loadsStatLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  postLoadBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginTop: 12,
  },
  postLoadBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  logoutButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Edit form
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 14, color: '#111827', fontWeight: '500' },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  chipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipPressed: { opacity: 0.9 },
  chipText: { fontSize: 13, color: '#111827' },
  chipTextSelected: { fontSize: 13, color: '#ffffff', fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  secondaryButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#111827', fontSize: 14, fontWeight: '500' },
  primaryButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  statusBanner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusBannerBlacklist: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  statusBannerSuspended: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
  statusBannerText: { fontSize: 14, color: '#1F2937', fontWeight: '600', textAlign: 'center' },
});
