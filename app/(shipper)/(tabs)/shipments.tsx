import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';
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
            const created = new Date(item.createdAt);
            const dateStr = created.toLocaleDateString();
            const timeStr = created.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const driverName =
              item.driver.firstName || item.driver.lastName
                ? `${item.driver.firstName ?? ''} ${item.driver.lastName ?? ''}`.trim()
                : 'Driver';

            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.96 }]}
                onPress={() => router.push(`/(shipper)/shipment/${item.id}`)}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.route} numberOfLines={1}>
                      {item.pickupAddress}
                    </Text>
                    <Text style={styles.subRoute} numberOfLines={1}>
                      {item.deliveryAddress}
                    </Text>
                    <Text style={styles.metaLine}>
                      {dateStr} {timeStr}
                    </Text>
                    <Text style={styles.amountLine}>
                      ₦{item.fareOffer.toLocaleString()}
                    </Text>
                    <Text style={styles.metaLineSmall} numberOfLines={1}>
                      Driver: {driverName}
                    </Text>
                    {item.currentLocation && (
                      <Text style={styles.metaLineSmall} numberOfLines={1}>
                        📍 {item.currentLocation}
                      </Text>
                    )}
                  </View>
                  <View style={styles.cardButtonsCol}>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: statusColor + '18' },
                      ]}
                    >
                      <View
                        style={[styles.statusDot, { backgroundColor: statusColor }]}
                      />
                      <Text
                        style={[styles.statusText, { color: statusColor }]}
                        numberOfLines={1}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                    {item.status === 'delivered' && (
                      <View style={styles.ratingSummary}>
                        <Text style={styles.ratingSummaryText}>
                          {item.driverRating
                            ? `★ ${item.driverRating}/5`
                            : 'Not rated yet'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTextCol: { flex: 1, gap: 3 },
  route: { fontSize: 15, fontWeight: '700', color: '#111827' },
  subRoute: { fontSize: 13, color: '#4B5563' },
  metaLine: { fontSize: 12, color: '#9CA3AF' },
  metaLineSmall: { fontSize: 12, color: '#9CA3AF' },
  amountLine: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginTop: 2,
  },
  cardButtonsCol: { justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6B7280' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  ratingSummary: {
    marginTop: 6,
    alignSelf: 'flex-end',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
  },
  ratingSummaryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
});
