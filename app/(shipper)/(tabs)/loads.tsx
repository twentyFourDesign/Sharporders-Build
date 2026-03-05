import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  draft: 'Draft',
  available: 'Live',
  applied: 'Has bids',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#6B7280',
  available: '#16a34a',
  applied: '#d97706',
  in_transit: '#2563eb',
  delivered: '#6B7280',
  cancelled: '#dc2626',
};

export default function ShipperLoadsScreen() {
  const { token } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goingLiveId, setGoingLiveId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLoads = useCallback(
    async (silent = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
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

  // Initial fetch
  useEffect(() => {
    fetchLoads();
  }, [fetchLoads]);

  // Poll every 3 seconds so bid counts / statuses update in near-real-time
  useEffect(() => {
    if (!token) return;
    intervalRef.current = setInterval(() => fetchLoads(true), 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, fetchLoads]);

  const handleGoLive = async (loadId: string) => {
    if (!token) return;
    setGoingLiveId(loadId);
    try {
      await apiFetch(`/api/loads/${loadId}/go-live`, { method: 'PATCH', token });
      // Optimistically update status
      setLoads((prev) =>
        prev.map((l) => (l.id === loadId ? { ...l, status: 'available' } : l)),
      );
    } catch (err: any) {
      Alert.alert('Failed to go live', err.message ?? 'Please try again.');
    } finally {
      setGoingLiveId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My loads</Text>
        <Pressable
          style={({ pressed }) => [styles.createButton, pressed && styles.createButtonPressed]}
          onPress={() => router.push('/(shipper)/create-load')}>
          <Text style={styles.createButtonText}>+ Create load</Text>
        </Pressable>
      </View>

      {loading && loads.length === 0 && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}

      {!loading && error && loads.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && loads.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No loads yet. Create one above.</Text>
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
              onRefresh={() => {
                setRefreshing(true);
                fetchLoads(true);
              }}
            />
          }
          renderItem={({ item }) => {
            const statusLabel = STATUS_LABEL[item.status] ?? item.status;
            const statusColor = STATUS_COLOR[item.status] ?? '#6B7280';
            const isLive = item.status === 'available';
            const hasBids = item.status === 'applied';
            const canViewBids = isLive || hasBids;

            return (
              <View style={styles.card}>
                {/* Status badge */}
                <View style={[styles.badge, { backgroundColor: statusColor + '1A' }]}>
                  <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>

                <Text style={styles.cardRoute}>
                  {item.pickupAddress} → {item.deliveryAddress}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.truckType} • ₦{item.fareOffer}
                </Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {item.loadDescription}
                </Text>

                <View style={styles.actionsRow}>
                  {/* Draft: show Go Live button */}
                  {item.status === 'draft' && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.goLiveButton,
                        pressed && { opacity: 0.85 },
                        goingLiveId === item.id && { opacity: 0.6 },
                      ]}
                      onPress={() => handleGoLive(item.id)}
                      disabled={goingLiveId === item.id}>
                      <Text style={styles.goLiveButtonText}>
                        {goingLiveId === item.id ? 'Going live…' : '🚀 Go Live'}
                      </Text>
                    </Pressable>
                  )}

                  {/* Live or has bids: show View Bids button */}
                  {canViewBids && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.bidsButton,
                        pressed && { opacity: 0.85 },
                      ]}
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
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  createButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#111827',
  },
  createButtonPressed: { opacity: 0.9 },
  createButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { color: '#b91c1c' },
  emptyText: { color: '#6B7280' },
  listContent: {
    paddingTop: 4,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 5,
    marginBottom: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardRoute: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cardMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  cardDescription: {
    fontSize: 13,
    color: '#4B5563',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  goLiveButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#16a34a',
  },
  goLiveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  bidsButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#111827',
  },
  bidsButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
