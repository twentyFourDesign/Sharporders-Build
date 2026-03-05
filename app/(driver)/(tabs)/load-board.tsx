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

type Load = {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  truckType: string;
  loadDescription: string;
  fareOffer: number;
  loadStatus: string;
  appliedByMe: boolean;
  myBidStatus: 'pending' | 'accepted' | 'rejected' | null;
};

export default function DriverLoadBoardScreen() {
  const { token } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [offerByLoadId, setOfferByLoadId] = useState<Record<string, string>>({});

  const fetchLoads = useCallback(
    async (silent = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch<Load[]>('/api/driver/loads', {
          method: 'GET',
          token,
        });
        setLoads(data);
        // Pre-fill offer inputs with previous values or the load's fareOffer
        setOfferByLoadId((prev) => {
          const next: Record<string, string> = {};
          for (const load of data) {
            next[load.id] = prev[load.id] ?? String(load.fareOffer ?? '');
          }
          return next;
        });
        setError(null);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load board');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchLoads();
  }, [fetchLoads]);

  // Poll every 1.5 seconds so new loads and bid outcomes appear in real-time
  useEffect(() => {
    if (!token) return;
    intervalRef.current = setInterval(() => fetchLoads(true), 1500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, fetchLoads]);

  const handleApply = async (loadId: string) => {
    if (!token) return;
    const raw = offerByLoadId[loadId];
    const amount = raw != null ? Number(raw) : NaN;
    if (!raw || Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid bid amount.');
      return;
    }
    try {
      setApplyingId(loadId);
      await apiFetch('/api/bids', {
        method: 'POST',
        body: JSON.stringify({ loadId, offerAmount: amount }),
        token,
      });
      // Optimistically mark as applied
      setLoads((prev) =>
        prev.map((l) =>
          l.id === loadId ? { ...l, appliedByMe: true, myBidStatus: 'pending' } : l,
        ),
      );
    } catch (err: any) {
      Alert.alert('Failed to apply', err.message ?? 'Please try again.');
    } finally {
      setApplyingId(null);
    }
  };

  const renderApplyButton = (item: Load) => {
    if (item.myBidStatus === 'accepted') {
      return (
        <View style={styles.acceptedPill}>
          <Text style={styles.acceptedPillText}>✓ Accepted!</Text>
        </View>
      );
    }

    if (item.myBidStatus === 'rejected') {
      return (
        <View style={styles.rejectedPill}>
          <Text style={styles.rejectedPillText}>Rejected</Text>
        </View>
      );
    }

    if (item.myBidStatus === 'pending') {
      return (
        <View style={styles.pendingPill}>
          <Text style={styles.pendingPillText}>Applied — awaiting shipper</Text>
        </View>
      );
    }

    // Not applied yet
    return (
      <Pressable
        style={({ pressed }) => [
          styles.applyButton,
          pressed && { opacity: 0.85 },
          applyingId === item.id && { opacity: 0.6 },
        ]}
        onPress={() => handleApply(item.id)}
        disabled={!!applyingId}>
        <Text style={styles.applyButtonText}>
          {applyingId === item.id ? 'Applying…' : 'Apply'}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Load board</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
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
          <Text style={styles.emptyText}>No loads available right now.</Text>
          <Text style={styles.emptySubText}>This board auto-refreshes.</Text>
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
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                item.myBidStatus === 'accepted' && styles.cardAccepted,
                item.myBidStatus === 'rejected' && styles.cardRejected,
              ]}>
              <Text style={styles.cardRoute}>
                {item.pickupAddress} → {item.deliveryAddress}
              </Text>
              <Text style={styles.cardMeta}>
                {item.truckType} • ₦{item.fareOffer}
              </Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.loadDescription}
              </Text>
              {/* Bid amount input */}
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Your offer (₦)</Text>
                <TextInput
                  style={styles.amountInput}
                  value={offerByLoadId[item.id] ?? ''}
                  onChangeText={(text) =>
                    setOfferByLoadId((prev) => ({ ...prev, [item.id]: text }))
                  }
                  placeholder={String(item.fareOffer ?? '')}
                  keyboardType="numeric"
                  editable={!applyingId && item.myBidStatus == null}
                />
              </View>
              {renderApplyButton(item)}
            </View>
          )}
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
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0fdf4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  errorText: { color: '#b91c1c' },
  emptyText: { color: '#111827', fontWeight: '600', fontSize: 15 },
  emptySubText: { color: '#6B7280', fontSize: 13 },
  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 5,
  },
  cardAccepted: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  cardRejected: {
    opacity: 0.45,
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
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  amountInput: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  applyButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#111827',
    marginTop: 4,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 4,
  },
  pendingPillText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  acceptedPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    marginTop: 4,
  },
  acceptedPillText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
  },
  rejectedPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginTop: 4,
  },
  rejectedPillText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '600',
  },
});
