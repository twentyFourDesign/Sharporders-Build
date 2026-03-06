import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
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
    loadImageUrl: string | null;
  };
  driver: {
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    truckType: string | null;
  };
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting pickup',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  approaching_dropoff: 'Near drop-off',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  picked_up: '#007AFF',
  in_transit: '#2563EB',
  approaching_dropoff: '#0EA5E9',
  delivered: '#1D4ED8',
  cancelled: '#DC2626',
};

export default function ShipperShipmentsScreen() {
  const { token } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchShipments = useCallback(
    async (silent = false) => {
      if (!token) { setLoading(false); return; }
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch<Shipment[]>('/api/shipments', { method: 'GET', token });
        setShipments(data);
        setError(null);
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

  // Poll every 4s so driver status updates appear in near-real-time
  useEffect(() => {
    if (!token) return;
    intervalRef.current = setInterval(() => fetchShipments(true), 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [token, fetchShipments]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shipments</Text>

      {loading && shipments.length === 0 && (
        <View style={styles.center}><ActivityIndicator /></View>
      )}

      {!loading && error && shipments.length === 0 && (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      )}

      {!loading && !error && shipments.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No shipments yet.</Text>
          <Text style={styles.emptySubText}>Accept a driver bid to create your first shipment.</Text>
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
            const statusLabel = STATUS_LABEL[item.status] ?? item.status;
            const statusColor = STATUS_COLOR[item.status] ?? '#6B7280';
            const driverName =
              item.driver.firstName || item.driver.lastName
                ? `${item.driver.firstName ?? ''} ${item.driver.lastName ?? ''}`.trim()
                : 'Driver';

            return (
              <View style={[styles.card, item.status === 'delivered' && styles.cardDelivered]}>
                {/* Status badge */}
                <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
                  <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>

                {item.load.loadImageUrl ? (
                  <Image
                    source={{ uri: item.load.loadImageUrl }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : null}

                <Text style={styles.route}>
                  {item.pickupAddress} → {item.deliveryAddress}
                </Text>

                <View style={styles.row}>
                  <Text style={styles.label}>Driver</Text>
                  <Text style={styles.value}>
                    {driverName} • {item.driver.phoneNumber ?? 'No phone'}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Truck</Text>
                  <Text style={styles.value}>{item.load.truckType}</Text>
                </View>

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

                {item.currentLocation && (
                  <View style={styles.locationRow}>
                    <Text style={styles.locationIcon}>📍</Text>
                    <Text style={styles.locationText}>{item.currentLocation}</Text>
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
  listContent: { paddingTop: 4, paddingBottom: 40, gap: 12 },
  card: {
    borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, backgroundColor: '#F9FAFB', gap: 6,
  },
  cardImage: {
    width: '100%', height: 140, borderRadius: 10, backgroundColor: '#E5E7EB',
  },
  cardDelivered: { borderColor: '#1D4ED8', backgroundColor: '#EFF6FF' },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, gap: 5, marginBottom: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  route: { fontSize: 15, fontWeight: '600', color: '#111827' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: '#9CA3AF' },
  value: { fontSize: 13, color: '#374151', fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  valueHighlight: { fontSize: 14, color: '#111827', fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  locationIcon: { fontSize: 12 },
  locationText: { fontSize: 12, color: '#1D4ED8', fontWeight: '500', flex: 1 },
});
