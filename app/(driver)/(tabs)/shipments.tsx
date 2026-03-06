import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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
  load: {
    truckType: string;
    loadDescription: string;
    recipientName: string | null;
    recipientNumber: string | null;
    loadImageUrl: string | null;
  };
  shipper: {
    businessName: string | null;
    phone: string | null;
  };
  driverRating: number | null;
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
};

export default function DriverShipmentsScreen() {
  const { token } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleOpenDetails = (shipmentId: string) => {
    router.push(`/(driver)/shipment/${shipmentId}`);
  };

  const handleRepeatDelivery = (shipment: Shipment) => {
    router.push({
      pathname: '/(driver)/create-load',
      params: {
        pickup: shipment.pickupAddress,
        delivery: shipment.deliveryAddress,
      },
    });
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
            const statusLabel = STATUS_LABEL[item.status] ?? item.status;
            const color = STATUS_COLOR[item.status] ?? '#6B7280';
            const created = new Date(item.createdAt);
            const dateStr = created.toLocaleDateString();
            const timeStr = created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.96 }]}
                onPress={() => handleOpenDetails(item.id)}
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
                    <Text style={styles.amountLine}>₦{item.fareOffer.toLocaleString()}</Text>
                  </View>
                  <View style={styles.cardButtonsCol}>
                    <Pressable
                      style={({ pressed }) => [styles.repeatBtn, pressed && { opacity: 0.9 }]}
                      onPress={() => handleRepeatDelivery(item)}
                    >
                      <Text style={styles.repeatBtnText}>↻ Repeat delivery</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.detailsBtn, pressed && { opacity: 0.9 }]}
                      onPress={() => handleOpenDetails(item.id)}
                    >
                      <Text style={styles.detailsBtnText}>Details</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.statusPill}>
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                  <Text style={[styles.statusText, { color: color }]}>
                    {statusLabel}
                  </Text>
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
    backgroundColor: '#F9FAFB',
    gap: 10,
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
  amountLine: { fontSize: 13, color: '#111827', fontWeight: '600', marginTop: 2 },
  cardButtonsCol: { justifyContent: 'center', alignItems: 'flex-end', gap: 6 },
  repeatBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E0F2FE',
  },
  repeatBtnText: { fontSize: 12, fontWeight: '600', color: '#0284C7' },
  detailsBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  detailsBtnText: { fontSize: 12, fontWeight: '600', color: '#111827' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6B7280' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
});
