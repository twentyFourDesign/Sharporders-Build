import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, router } from 'expo-router';

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
  loadImageUrl?: string | null;
  appliedByMe: boolean;
  myBidStatus: 'pending' | 'accepted' | 'rejected' | null;
  myBidId?: string | null;
  myBidOfferAmount?: number | null;
};

const LOAD_BOARD_CACHE_KEY = 'driver_load_board_loads_v1';

export default function DriverLoadBoardScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ live?: string }>();
  const [isLive, setIsLive] = useState(params.live === '1');
  const [loads, setLoads] = useState<Load[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLoads = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setFetching(true);
      try {
        const data = await apiFetch<Load[]>('/api/driver/loads', { method: 'GET', token });
        setLoads(data);
        // Persist latest loads so going live feels instant next time
        try {
          await AsyncStorage.setItem(LOAD_BOARD_CACHE_KEY, JSON.stringify(data));
        } catch {
          // ignore cache errors
        }
        setError(null);
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

    let cancelled = false;

    // Hydrate from cache immediately so UI feels instant, then refresh in background.
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(LOAD_BOARD_CACHE_KEY);
        if (!cancelled && cached) {
          try {
            const parsed = JSON.parse(cached) as Load[];
            if (Array.isArray(parsed)) {
              setLoads(parsed);
            }
          } catch {
            // ignore bad cache
          }
        }
      } catch {
        // ignore cache read errors
      }
      if (!cancelled) {
        // Background refresh; keep existing list visible while fetching
        fetchLoads(true);
      }
    })();

    // Then poll every 2s to keep loads fresh
    intervalRef.current = setInterval(() => fetchLoads(true), 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      cancelled = true;
    };
  }, [isLive, fetchLoads]);

  const handleRefresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    await fetchLoads(true);
    setRefreshing(false);
  }, [token, fetchLoads]);

  const handleGoLive = () => {
    setError(null);
    setIsLive(true);
  };

  const handleGoOffline = () => {
    setIsLive(false);
    setLoads([]);
    setError(null);
  };

  const openApplyScreen = (item: Load) => {
    router.push(`/(driver)/apply-load/${item.id}?offer=${encodeURIComponent(String(item.fareOffer ?? ''))}`);
  };

  const handleCancelBid = async (bidId: string) => {
    if (!token) return;
    Alert.alert('Cancel bid?', 'This will withdraw your bid for this load.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/bids/${bidId}`, { method: 'DELETE', token });
            await fetchLoads(true);
          } catch (e: any) {
            Alert.alert('Failed', e?.message ?? 'Could not cancel bid.');
          }
        },
      },
    ]);
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
      const bidId = item.myBidId ?? null;
      return (
        <View style={styles.pendingBlock}>
          <View style={styles.pendingPill}>
            <Text style={styles.pendingPillText}>Applied — awaiting shipper</Text>
          </View>
          <View style={styles.pendingActionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.pendingActionBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() =>
                router.push(
                  `/(driver)/apply-load/${item.id}?offer=${encodeURIComponent(
                    String(item.myBidOfferAmount ?? item.fareOffer ?? ''),
                  )}&bidId=${encodeURIComponent(String(bidId ?? ''))}`,
                )
              }
            >
              <Text style={styles.pendingActionBtnText}>Update bid</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.pendingCancelBtn,
                pressed && { opacity: 0.85 },
                !bidId && { opacity: 0.5 },
              ]}
              onPress={() => bidId && handleCancelBid(bidId)}
              disabled={!bidId}
            >
              <Text style={styles.pendingCancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <Pressable
        style={({ pressed }) => [styles.applyButton, pressed && { opacity: 0.85 }]}
        onPress={() => openApplyScreen(item)}>
        <Text style={styles.applyButtonText}>Apply</Text>
      </Pressable>
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

          {/* Driver posting their own loads is disabled for now */}
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                item.myBidStatus === 'accepted' && styles.cardAccepted,
                item.myBidStatus === 'rejected' && styles.cardRejected,
              ]}>
              {item.loadImageUrl ? (
                <Image
                  source={{ uri: item.loadImageUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : null}
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
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, width: '80%' },
  divider: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  postLoadBtn: {
    borderRadius: 8, paddingHorizontal: 32, paddingVertical: 14,
    backgroundColor: '#007AFF', borderWidth: 0,
  },
  postLoadBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  postLoadSubtext: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

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
  cardImage: {
    width: '100%', height: 140, borderRadius: 10, backgroundColor: '#E5E7EB',
  },
  cardAccepted: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  cardRejected: { opacity: 0.45 },
  cardRoute: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardMeta: { fontSize: 13, color: '#6B7280' },
  cardDescription: { fontSize: 13, color: '#4B5563', marginBottom: 2 },
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
  pendingBlock: { gap: 10, marginTop: 2 },
  pendingActionsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pendingActionBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
  },
  pendingActionBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  pendingCancelBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#ffffff',
  },
  pendingCancelBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
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
