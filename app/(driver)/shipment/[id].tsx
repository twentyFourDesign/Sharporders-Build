import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Shipment = {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  fareOffer: number;
  status: string;
  currentLocation: string | null;
  createdAt: string;
  driverRating: number | null;
  load?: {
    truckType: string;
    loadDescription: string;
    recipientName: string | null;
    recipientNumber: string | null;
    loadImageUrl: string | null;
    pickupMapsUrl?: string | null;
    deliveryMapsUrl?: string | null;
  } | null;
  shipper?: {
    businessName: string | null;
    phone: string | null;
  } | null;
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Awaiting pickup' },
  { key: 'picked_up', label: 'Picked up' },
  { key: 'in_transit', label: 'In transit' },
  { key: 'approaching_dropoff', label: 'Near drop-off' },
  { key: 'delivered', label: 'Delivered' },
] as const;

type StatusKey = (typeof STATUS_STEPS)[number]['key'];

const STATUS_COLOR: Record<StatusKey, string> = {
  pending: '#F59E0B',
  picked_up: '#007AFF',
  in_transit: '#2563EB',
  approaching_dropoff: '#0EA5E9',
  delivered: '#1D4ED8',
};

const NEXT_STATUS: Partial<Record<StatusKey, StatusKey>> = {
  pending: 'picked_up',
  picked_up: 'in_transit',
  in_transit: 'approaching_dropoff',
  approaching_dropoff: 'delivered',
};

const NEXT_LABEL: Partial<Record<StatusKey, string>> = {
  pending: '📦 Mark as Picked Up',
  picked_up: '🚛 Start Transit',
  in_transit: '🏁 Approaching Drop-off',
  approaching_dropoff: '✅ Mark as Delivered',
};

export default function DriverShipmentDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [locationText, setLocationText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const shipmentId = params.id as string;

  const fetchShipment = useCallback(
    async (silent = false) => {
      if (!token || !shipmentId) { setLoading(false); return; }
      if (!silent) setLoading(true);
      try {
        const all = await apiFetch<Shipment[]>('/api/shipments', { method: 'GET', token });
        const found = all.find((s) => s.id === shipmentId) ?? null;
        if (!found) {
          setError('Shipment not found.');
        } else {
          setShipment(found);
          setLocationText(found.currentLocation ?? '');
          setError(null);
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to load shipment');
      } finally {
        setLoading(false);
      }
    },
    [token, shipmentId],
  );

  useEffect(() => { fetchShipment(); }, [fetchShipment]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchShipment(true);
    setRefreshing(false);
  }, [fetchShipment]);

  const handleUpdateStatus = async () => {
    if (!token || !shipment) return;
    const statusKey = shipment.status as StatusKey;
    const nextStatus = NEXT_STATUS[statusKey];
    if (!nextStatus) return;

    try {
      setUpdatingId(shipment.id);
      const updated = await apiFetch<Shipment>(
        `/api/shipments/${shipment.id}/update`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus, currentLocation: locationText.trim() || null }),
          token,
        },
      );
      setShipment(updated);
    } catch (err: any) {
      Alert.alert('Update failed', err.message ?? 'Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateLocation = async () => {
    if (!token || !shipment) return;
    if (!locationText.trim()) return;

    try {
      setUpdatingId(shipment.id);
      const updated = await apiFetch<Shipment>(
        `/api/shipments/${shipment.id}/update`,
        {
          method: 'PATCH',
          body: JSON.stringify({ currentLocation: locationText.trim() }),
          token,
        },
      );
      setShipment(updated);
    } catch (err: any) {
      Alert.alert('Failed', err.message ?? 'Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openPickupInMaps = () => {
    if (!shipment) return;
    const url =
      shipment.load?.pickupMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        shipment.pickupAddress,
      )}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open maps');
    });
  };

  const openDropoffInMaps = () => {
    if (!shipment) return;
    const url =
      shipment.load?.deliveryMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        shipment.deliveryAddress,
      )}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open maps');
    });
  };

  if (loading && !shipment) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && !shipment) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!shipment) return null;

  const statusKey = shipment.status as StatusKey;
  const statusStep = STATUS_STEPS.find((s) => s.key === statusKey);
  const color = STATUS_COLOR[statusKey] ?? '#6B7280';
  const nextLabel = NEXT_LABEL[statusKey];
  const isDelivered = statusKey === 'delivered';
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === statusKey);
  const created = new Date(shipment.createdAt);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Shipment details</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.route}>
          {shipment.pickupAddress}
        </Text>
        <Text style={styles.subRoute}>{shipment.deliveryAddress}</Text>
        <Text style={styles.metaLine}>
          {created.toLocaleDateString()} • {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.amountLine}>₦{shipment.fareOffer.toLocaleString()}</Text>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>
            {statusStep?.label ?? shipment.status}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Shipper</Text>
          <Text style={styles.infoValue}>
            {shipment.shipper?.businessName ?? 'Unknown'}
            {shipment.shipper?.phone ? ` • ${shipment.shipper.phone}` : ''}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Truck</Text>
          <Text style={styles.infoValue}>{shipment.load?.truckType ?? 'Unknown'}</Text>
        </View>
        {shipment.load?.loadDescription ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Load</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {shipment.load?.loadDescription}
            </Text>
          </View>
        ) : null}

        <View style={styles.mapsRow}>
          <Pressable
            style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.9 }]}
            onPress={openPickupInMaps}
          >
            <Text style={styles.mapBtnText}>Open pickup in Maps</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.9 }]}
            onPress={openDropoffInMaps}
          >
            <Text style={styles.mapBtnText}>Open drop-off in Maps</Text>
          </Pressable>
        </View>

        <View style={styles.ratingRow}>
          <Text style={styles.ratingLabel}>Shipper rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = (shipment.driverRating ?? 0) >= star;
              return (
                <Text key={star} style={[styles.star, filled && styles.starFilled]}>
                  {filled ? '★' : '☆'}
                </Text>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress</Text>
        <View style={styles.stepsRow}>
          {STATUS_STEPS.map((step, index) => (
            <View key={step.key} style={styles.stepCol}>
              <View
                style={[
                  styles.stepCircle,
                  index <= currentStepIndex
                    ? { backgroundColor: color }
                    : { backgroundColor: '#E5E7EB' },
                ]}
              />
              <Text
                style={[
                  styles.stepLabel,
                  index === currentStepIndex && { color: color, fontWeight: '600' },
                ]}
                numberOfLines={2}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {nextLabel && !isDelivered && (
          <Pressable
            style={({ pressed }) => [
              styles.nextStatusBtn,
              { backgroundColor: color },
              pressed && { opacity: 0.9 },
              updatingId && { opacity: 0.7 },
            ]}
            onPress={handleUpdateStatus}
            disabled={!!updatingId}
          >
            {updatingId ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.nextStatusBtnText}>{nextLabel}</Text>
            )}
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current location</Text>
        <View style={styles.locationInputRow}>
          <TextInput
            style={styles.locationInput}
            value={locationText}
            onChangeText={setLocationText}
            placeholder="e.g. Lagos expressway toll gate"
            placeholderTextColor="#9CA3AF"
          />
          <Pressable
            style={({ pressed }) => [
              styles.locationSaveBtn,
              pressed && { opacity: 0.9 },
              updatingId && { opacity: 0.6 },
            ]}
            onPress={handleUpdateLocation}
            disabled={!!updatingId}
          >
            <Text style={styles.locationSaveBtnText}>Update</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  errorText: { color: '#b91c1c' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backBtnText: { fontSize: 14, color: '#111827', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  route: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subRoute: { fontSize: 14, color: '#4B5563' },
  metaLine: { fontSize: 12, color: '#9CA3AF' },
  amountLine: { fontSize: 14, color: '#111827', fontWeight: '700', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#EEF2FF',
    gap: 6,
    marginTop: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4F46E5' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 12, color: '#9CA3AF' },
  infoValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  mapsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  mapBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
  },
  mapBtnText: { fontSize: 12, fontWeight: '600', color: '#0369A1' },
  ratingRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingLabel: { fontSize: 12, color: '#6B7280' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  star: { fontSize: 18, color: '#D1D5DB' },
  starFilled: { color: '#F59E0B' },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepCol: { flex: 1, alignItems: 'center', gap: 4 },
  stepCircle: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E7EB' },
  stepLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  nextStatusBtn: {
    marginTop: 4,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  nextStatusBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  locationInputRow: { flexDirection: 'row', gap: 8 },
  locationInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  locationSaveBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
  },
  locationSaveBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
});

