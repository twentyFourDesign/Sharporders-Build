import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/lib/auth-context';
import { apiFetch, uploadProfileImage, uploadTruckImage, uploadLicenseImage } from '@/lib/api';

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

  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [licenseImageUri, setLicenseImageUri] = useState<string | null>(null);
  const [truckImageUris, setTruckImageUris] = useState<string[]>([]);
  const [profileUploading, setProfileUploading] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [truckUploading, setTruckUploading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

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

  const pickProfilePhoto = async () => {
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
    if (!result.canceled && result.assets[0]) {
      setProfilePhotoUri(result.assets[0].uri);
    }
  };

  const pickLicensePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to upload licence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLicenseImageUri(result.assets[0].uri);
    }
  };

  const pickTruckImage = async () => {
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
    if (!result.canceled && result.assets[0]) {
      setTruckImageUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeTruckImage = (index: number) => {
    setTruckImageUris((prev) => prev.filter((_, i) => i !== index));
  };

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

      if (profilePhotoUri) {
        setProfileUploading(true);
        try {
          await uploadProfileImage(
            { uri: profilePhotoUri, type: 'image/jpeg', name: 'avatar.jpg' },
            token,
          );
        } finally {
          setProfileUploading(false);
        }
      }

      if (licenseImageUri) {
        setLicenseUploading(true);
        try {
          await uploadLicenseImage(
            { uri: licenseImageUri, type: 'image/jpeg', name: 'license.jpg' },
            token,
          );
        } finally {
          setLicenseUploading(false);
        }
      }

      if (truckImageUris.length > 0) {
        setTruckUploading(true);
        try {
          for (const uri of truckImageUris) {
            await uploadTruckImage(
              { uri, type: 'image/jpeg', name: 'truck.jpg' },
              token,
            );
          }
        } finally {
          setTruckUploading(false);
        }
      }

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

  const uploading = saving || profileUploading || truckUploading || licenseUploading;
  const canGoNext = firstName.trim() && lastName.trim();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: step === 1 ? '50%' : '100%' },
          ]}
        />
      </View>

      {step === 1 ? (
        <>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Personal details</Text>
          </View>
          <Text style={styles.body}>Please provide accurate information.</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                style={styles.input}
                placeholder="+234 08012345678"
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
                <Text style={styles.noTrucksText}>Loading truck types…</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>License number</Text>
              <TextInput
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                style={styles.input}
                placeholder="L/No AKW06968AAA2"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                !canGoNext && { opacity: 0.6 },
              ]}
              onPress={() => canGoNext && setStep(2)}
              disabled={!canGoNext}
            >
              <Text style={styles.primaryButtonText}>NEXT</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={styles.headerRow}>
            <Pressable onPress={() => setStep(1)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Photo verification</Text>
              <Text style={styles.body}>
                Take a clear photo of your face for verification. No hats, sunglasses, or filters.
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.photoVerifyBox}>
              <Pressable
                style={({ pressed }) => [styles.photoVerifyCircle, pressed && { opacity: 0.9 }]}
                onPress={pickProfilePhoto}
              >
                {profilePhotoUri ? (
                  <Image
                    source={{ uri: profilePhotoUri }}
                    style={styles.photoVerifyImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.photoVerifyPlus}>+</Text>
                )}
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Document upload</Text>
            <Text style={styles.sectionSubtitle}>
              Upload your documents for verification.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Driver's licence</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.uploadRow,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={pickLicensePhoto}
              >
                <Text style={styles.uploadPlaceholder}>
                  {licenseImageUri ? 'Licence selected' : 'Upload here'}
                </Text>
                <Text style={styles.uploadIcon}>⇪</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Photo of truck</Text>
              <View style={styles.truckThumbsRow}>
                {truckImageUris.map((uri, index) => (
                  <View key={index} style={styles.truckThumbWrap}>
                    <Image source={{ uri }} style={styles.truckThumb} resizeMode="cover" />
                    <Pressable
                      style={styles.truckThumbRemove}
                      onPress={() => removeTruckImage(index)}>
                      <Text style={styles.truckThumbRemoveText}>×</Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  style={({ pressed }) => [styles.addTruckThumb, pressed && { opacity: 0.9 }]}
                  onPress={pickTruckImage}
                  disabled={truckUploading}>
                  <Text style={styles.addTruckThumbText}>+</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                uploading && { opacity: 0.7 },
              ]}
              onPress={handleSave}
              disabled={uploading}
            >
              <Text style={styles.primaryButtonText}>
                {uploading ? 'UPLOADING…' : 'UPLOAD'}
              </Text>
            </Pressable>
          </View>
        </>
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
  progressBarTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
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
  primaryButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  photoVerifyBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photoVerifyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoVerifyImage: { width: '100%', height: '100%' },
  photoVerifyPlus: { fontSize: 32, color: '#007AFF', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 8 },
  sectionSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  uploadPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  uploadIcon: { fontSize: 16, color: '#007AFF', fontWeight: '700' },
  truckThumbsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  addTruckThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTruckThumbText: { fontSize: 24, color: '#6B7280', fontWeight: '500' },
  noTrucksText: { fontSize: 13, color: '#9CA3AF' },
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
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backBtnText: { fontSize: 18, color: '#111827', fontWeight: '500' },
});
