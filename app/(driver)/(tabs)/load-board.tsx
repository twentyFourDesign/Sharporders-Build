import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

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
  const params = useLocalSearchParams<{ live?: string }>();
  const [isLive, setIsLive] = useState(params.live === '1');
  const [loads, setLoads] = useState<Load[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [offerByLoadId, setOfferByLoadId] = useState<Record<string, string>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLoads = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setFetching(true);
      try {
        const data = await apiFetch<Load[]>('/api/driver/loads', { method: 'GET', token });
        setLoads(data);
        setError(null);
        setOfferByLoadId((prev) => {
          const next: Record<string, string> = {};
          for (const load of data) {
            next[load.id] = prev[load.id] ?? String(load.fareOffer ?? '');
          }
          return next;
        });
      } catch (err: any) {
        setError(err.message ?? 'Failed to load board');
      } finally {
        setFetching(false);
      }
    },
    [token],
  );

  // Start / stop polling based on isLive toggle
  useEffect(() => {
    if (!isLive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Immediate fetch when going live, then poll every 2s
    fetchLoads();
    intervalRef.current = setInterval(() => fetchLoads(true), 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLive, fetchLoads]);

  const handleGoLive = () => {
    setLoads([]);
    setError(null);
    setIsLive(true);
  };

  const handleGoOffline = () => {
    setIsLive(false);
    setLoads([]);
    setError(null);
  };

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

  const renderBidState = (item: Load) => {
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

    return (
      <>
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
            editable={!applyingId}
          />
        </View>
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
      </>
    );
  };

  // ── OFFLINE STATE ──
  if (!isLive) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Load board</Text>
        <View style={styles.offlineBox}>
          <Text style={styles.offlineEmoji}>🚛</Text>
          <Text style={styles.offlineHeading}>You are offline</Text>
          <Text style={styles.offlineSubtext}>
            Tap Go Live to start seeing available loads and receive bids in real-time.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.goLiveBtn, pressed && { opacity: 0.85 }]}
            onPress={handleGoLive}>
            <Text style={styles.goLiveBtnText}>Go Live</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── LIVE STATE ──
  return (
    <View style={styles.container}>
      {/* Header with live indicator + stop button */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Load board</Text>
        <View style={styles.headerRight}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.8 }]}
            onPress={handleGoOffline}>
            <Text style={styles.stopBtnText}>Stop</Text>
          </Pressable>
        </View>
      </View>

      {fetching && loads.length === 0 && (
        <View style={styles.center}><ActivityIndicator /></View>
      )}

      {!fetching && error && loads.length === 0 && (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      )}

      {!fetching && !error && loads.length === 0 && (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#9CA3AF" style={{ marginBottom: 10 }} />
          <Text style={styles.waitingText}>Waiting for available loads…</Text>
          <Text style={styles.waitingSubText}>This board updates automatically.</Text>
        </View>
      )}

      {loads.length > 0 && (
        <FlatList
          data={loads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
                {item.truckType} • ₦{item.fareOffer.toLocaleString()}
              </Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.loadDescription}
              </Text>
              {renderBidState(item)}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 80, backgroundColor: '#ffffff' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#007AFF' },
  liveText: { fontSize: 12, fontWeight: '700', color: '#007AFF' },
  stopBtn: {
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA',
  },
  stopBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },

  // Offline screen
  offlineBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingHorizontal: 24,
  },
  offlineEmoji: { fontSize: 52, marginBottom: 4 },
  offlineHeading: { fontSize: 20, fontWeight: '700', color: '#111827' },
  offlineSubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  goLiveBtn: {
    marginTop: 16,
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
  },
  goLiveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Live list
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  errorText: { color: '#b91c1c' },
  waitingText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  waitingSubText: { fontSize: 13, color: '#9CA3AF' },
  listContent: { paddingTop: 4, paddingBottom: 32, gap: 12 },
  card: {
    borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, backgroundColor: '#F9FAFB', gap: 6,
  },
  cardAccepted: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  cardRejected: { opacity: 0.45 },
  cardRoute: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardMeta: { fontSize: 13, color: '#6B7280' },
  cardDescription: { fontSize: 13, color: '#4B5563', marginBottom: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountLabel: { fontSize: 12, color: '#6B7280' },
  amountInput: {
    flex: 1, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 13, color: '#111827', backgroundColor: '#ffffff',
  },
  applyButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    marginTop: 2,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  pendingPill: {
    alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12,
    paddingVertical: 6, backgroundColor: '#fffbeb',
    borderWidth: 1, borderColor: '#fde68a',
  },
  pendingPillText: { color: '#92400e', fontSize: 12, fontWeight: '600' },
  acceptedPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  acceptedPillText: { color: '#1D4ED8', fontSize: 13, fontWeight: '700' },
  rejectedPill: {
    alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12,
    paddingVertical: 6, backgroundColor: '#fee2e2',
    borderWidth: 1, borderColor: '#fca5a5',
  },
  rejectedPillText: { color: '#991b1b', fontSize: 12, fontWeight: '600' },
});
