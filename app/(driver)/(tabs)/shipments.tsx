import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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
  load: {
    truckType: string;
    loadDescription: string;
    recipientName: string | null;
    recipientNumber: string | null;
  };
  shipper: {
    businessName: string | null;
    phone: string | null;
  };
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
  pending: '#d97706',
  picked_up: '#2563eb',
  in_transit: '#7c3aed',
  approaching_dropoff: '#0891b2',
  delivered: '#16a34a',
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

export default function DriverShipmentsScreen() {
  const { token } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [locationByShipment, setLocationByShipment] = useState<Record<string, string>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchShipments = useCallback(
    async (silent = false) => {
      if (!token) { setLoading(false); return; }
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch<Shipment[]>('/api/shipments', { method: 'GET', token });
        setShipments(data);
        setError(null);
        // Prefill location inputs
        setLocationByShipment((prev) => {
          const next: Record<string, string> = {};
          for (const s of data) {
            next[s.id] = prev[s.id] ?? s.currentLocation ?? '';
          }
          return next;
        });
      } catch (err: any) {
        setError(err.message ?? 'Failed to load shipments');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  useEffect(() => {
    if (!token) return;
    intervalRef.current = setInterval(() => fetchShipments(true), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [token, fetchShipments]);

  const handleUpdateStatus = async (shipment: Shipment) => {
    if (!token) return;
    const nextStatus = NEXT_STATUS[shipment.status as StatusKey];
    if (!nextStatus) return;

    const locationText = locationByShipment[shipment.id]?.trim() || null;

    try {
      setUpdatingId(shipment.id);
      const updated = await apiFetch<Shipment>(
        `/api/shipments/${shipment.id}/update`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus, currentLocation: locationText }),
          token,
        },
      );
      setShipments((prev) => prev.map((s) => (s.id === shipment.id ? { ...s, ...updated } : s)));
    } catch (err: any) {
      Alert.alert('Update failed', err.message ?? 'Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateLocation = async (shipmentId: string) => {
    if (!token) return;
    const locationText = locationByShipment[shipmentId]?.trim();
    if (!locationText) return;

    try {
      setUpdatingId(shipmentId);
      const updated = await apiFetch<Shipment>(
        `/api/shipments/${shipmentId}/update`,
        {
          method: 'PATCH',
          body: JSON.stringify({ currentLocation: locationText }),
          token,
        },
      );
      setShipments((prev) => prev.map((s) => (s.id === shipmentId ? { ...s, ...updated } : s)));
    } catch (err: any) {
      Alert.alert('Failed', err.message ?? 'Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My shipments</Text>

      {loading && shipments.length === 0 && (
        <View style={styles.center}><ActivityIndicator /></View>
      )}

      {!loading && error && shipments.length === 0 && (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      )}

      {!loading && !error && shipments.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No active shipments.</Text>
          <Text style={styles.emptySubText}>Apply for loads on the load board to get started.</Text>
        </View>
      )}

      {shipments.length > 0 && (
        <FlatList
          data={shipments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchShipments(true); }}
            />
          }
          renderItem={({ item }) => {
            const statusKey = item.status as StatusKey;
            const statusStep = STATUS_STEPS.find((s) => s.key === statusKey);
            const color = STATUS_COLOR[statusKey] ?? '#6B7280';
            const nextLabel = NEXT_LABEL[statusKey];
            const isDelivered = statusKey === 'delivered';
            const isUpdating = updatingId === item.id;
            const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === statusKey);

            return (
              <View style={[styles.card, isDelivered && styles.cardDelivered]}>
                {/* Status badge */}
                <View style={[styles.badge, { backgroundColor: color + '18' }]}>
                  <View style={[styles.badgeDot, { backgroundColor: color }]} />
                  <Text style={[styles.badgeText, { color }]}>{statusStep?.label ?? item.status}</Text>
                </View>

                <Text style={styles.route}>
                  {item.pickupAddress} → {item.deliveryAddress}
                </Text>

                <View style={styles.row}>
                  <Text style={styles.label}>Amount</Text>
                  <Text style={styles.valueHighlight}>₦{item.fareOffer.toLocaleString()}</Text>
                </View>

                {item.load.recipientName && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Recipient</Text>
                    <Text style={styles.value}>
                      {item.load.recipientName}
                      {item.load.recipientNumber ? ` • ${item.load.recipientNumber}` : ''}
                    </Text>
                  </View>
                )}

                {/* Progress steps */}
                <View style={styles.stepsRow}>
                  {STATUS_STEPS.slice(0, -1).map((step, index) => (
                    <View
                      key={step.key}
                      style={[
                        styles.stepDot,
                        index <= currentStepIndex
                          ? { backgroundColor: color }
                          : { backgroundColor: '#E5E7EB' },
                      ]}
                    />
                  ))}
                </View>

                {/* Location update */}
                {!isDelivered && (
                  <View style={styles.locationSection}>
                    <Text style={styles.locationLabel}>Current location</Text>
                    <View style={styles.locationInputRow}>
                      <TextInput
                        style={styles.locationInput}
                        value={locationByShipment[item.id] ?? ''}
                        onChangeText={(text) =>
                          setLocationByShipment((prev) => ({ ...prev, [item.id]: text }))
                        }
                        placeholder="e.g. Lagos expressway toll gate"
                        placeholderTextColor="#9CA3AF"
                      />
                      <Pressable
                        style={({ pressed }) => [styles.locationSaveBtn, pressed && { opacity: 0.8 }, isUpdating && { opacity: 0.5 }]}
                        onPress={() => handleUpdateLocation(item.id)}
                        disabled={isUpdating}>
                        <Text style={styles.locationSaveBtnText}>Update</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Next status button */}
                {nextLabel && (
                  <Pressable
                    style={({ pressed }) => [styles.nextStatusBtn, { backgroundColor: color }, pressed && { opacity: 0.85 }, isUpdating && { opacity: 0.6 }]}
                    onPress={() => handleUpdateStatus(item)}
                    disabled={isUpdating}>
                    {isUpdating
                      ? <ActivityIndicator color="#ffffff" size="small" />
                      : <Text style={styles.nextStatusBtnText}>{nextLabel}</Text>
                    }
                  </Pressable>
                )}

                {isDelivered && (
                  <View style={styles.deliveredBanner}>
                    <Text style={styles.deliveredBannerText}>🎉 Shipment delivered!</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 80, backgroundColor: '#ffffff' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  errorText: { color: '#b91c1c' },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  emptySubText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  listContent: { paddingTop: 4, paddingBottom: 40, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, backgroundColor: '#F9FAFB', gap: 8 },
  cardDelivered: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, gap: 5, marginBottom: 2 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  route: { fontSize: 15, fontWeight: '600', color: '#111827' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: '#9CA3AF' },
  value: { fontSize: 13, color: '#374151', fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  valueHighlight: { fontSize: 14, color: '#111827', fontWeight: '700' },
  stepsRow: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  stepDot: { flex: 1, height: 4, borderRadius: 2 },
  locationSection: { gap: 4 },
  locationLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  locationInputRow: { flexDirection: 'row', gap: 8 },
  locationInput: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827', backgroundColor: '#ffffff' },
  locationSaveBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center' },
  locationSaveBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  nextStatusBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  nextStatusBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  deliveredBanner: { backgroundColor: '#dcfce7', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  deliveredBannerText: { color: '#166534', fontSize: 14, fontWeight: '700' },
});
