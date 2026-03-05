import { useCallback, useEffect, useState } from 'react';
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

type Load = {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  truckType: string;
  loadDescription: string;
  fareOffer: number;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  available: 'Live',
  in_transit: 'In transit',
  at_pickup: 'At pickup',
  approaching_dropoff: 'Near drop-off',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  available: '#007AFF',
  in_transit: '#2563eb',
  at_pickup: '#1D4ED8',
  approaching_dropoff: '#0EA5E9',
  delivered: '#6B7280',
  cancelled: '#DC2626',
};

export default function ShipperLoadsScreen() {
  const { token } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLoads = useCallback(
    async (silent = false) => {
      if (!token) { setLoading(false); return; }
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch<Load[]>('/api/loads', { method: 'GET', token });
        setLoads(data);
        setError(null);
      } catch (err: any) {
        setError(err.message ?? 'Failed to fetch loads');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => { fetchLoads(); }, [fetchLoads]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My loads</Text>
        <Pressable
          style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(shipper)/create-load')}>
          <Text style={styles.createButtonText}>+ Create load</Text>
        </Pressable>
      </View>

      {loading && loads.length === 0 && (
        <View style={styles.center}><ActivityIndicator /></View>
      )}

      {!loading && error && loads.length === 0 && (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      )}

      {!loading && !error && loads.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No loads yet.</Text>
          <Text style={styles.emptySubText}>Tap "Create load" to post your first load.</Text>
        </View>
      )}

      {loads.length > 0 && (
        <FlatList
          data={loads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchLoads(true); }}
            />
          }
          renderItem={({ item }) => {
            const statusLabel = STATUS_LABEL[item.status] ?? item.status;
            const statusColor = STATUS_COLOR[item.status] ?? '#6B7280';
            const canViewBids = item.status === 'available';

            return (
              <View style={styles.card}>
                <View style={[styles.badge, { backgroundColor: statusColor + '1A' }]}>
                  <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>

                <Text style={styles.cardRoute}>
                  {item.pickupAddress} → {item.deliveryAddress}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.truckType} • ₦{item.fareOffer.toLocaleString()}
                </Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {item.loadDescription}
                </Text>

                {canViewBids && (
                  <Pressable
                    style={({ pressed }) => [styles.bidsButton, pressed && { opacity: 0.85 }]}
                    onPress={() =>
                      router.push({
                        pathname: '/(shipper)/load-bids/[id]',
                        params: { id: item.id },
                      })
                    }>
                    <Text style={styles.bidsButtonText}>View bids</Text>
                  </Pressable>
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
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  createButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  errorText: { color: '#b91c1c' },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  emptySubText: { fontSize: 13, color: '#6B7280' },
  listContent: { paddingTop: 4, paddingBottom: 32, gap: 12 },
  card: {
    borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, backgroundColor: '#F9FAFB', gap: 6,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
    gap: 5, marginBottom: 2,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardRoute: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardMeta: { fontSize: 13, color: '#6B7280' },
  cardDescription: { fontSize: 13, color: '#4B5563' },
  bidsButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    marginTop: 4,
  },
  bidsButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
