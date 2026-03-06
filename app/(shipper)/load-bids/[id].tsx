import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

type Bid = {
  id: string;
  offerAmount: number | null;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  driver: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    truckType: string | null;
  };
};

type LoadSummary = {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  truckType: string;
  loadDescription: string;
  fareOffer: number;
  loadImageUrl: string | null;
};

export default function LoadBidsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [load, setLoad] = useState<LoadSummary | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [payingBidId, setPayingBidId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadId = params.id as string;

  const fetchBids = useCallback(
    async (silent = false) => {
      if (!token || !loadId) { setLoading(false); return; }
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch<{ load: LoadSummary; bids: Bid[] }>(`/api/loads/${loadId}/bids`, { method: 'GET', token });
        setLoad(data.load);
        setBids(data.bids);
        setError(null);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load bids');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, loadId],
  );

  useEffect(() => { fetchBids(); }, [fetchBids]);

  // Poll every 2 seconds for new bids
  useEffect(() => {
    if (!token || !loadId) return;
    intervalRef.current = setInterval(() => fetchBids(true), 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [token, loadId, fetchBids]);

  const handleReject = async (bidId: string) => {
    if (!token) return;
    try {
      setActingId(bidId);
      await apiFetch('/api/bids/respond', {
        method: 'POST',
        body: JSON.stringify({ bidId, action: 'reject' }),
        token,
      });
      setBids((prev) => prev.map((b) => (b.id === bidId ? { ...b, status: 'rejected' } : b)));
    } catch (err: any) {
      Alert.alert('Failed', err.message ?? 'Please try again.');
    } finally {
      setActingId(null);
    }
  };

  const handleAccept = async (bidId: string) => {
    if (!token) return;

    // Stop the polling while we handle payment so we don't get noisy re-renders
    if (intervalRef.current) clearInterval(intervalRef.current);

    try {
      setPayingBidId(bidId);

      // 1. Ask backend to initialise a Paystack transaction
      const initRes = await apiFetch<{
        status: string;
        authorizationUrl: string;
        reference: string;
      }>('/api/bids/respond', {
        method: 'POST',
        body: JSON.stringify({ bidId, action: 'accept' }),
        token,
      });

      if (initRes.status !== 'payment_required') {
        throw new Error('Unexpected response from server');
      }

      // 2. Open Paystack hosted payment page in the browser
      const result = await WebBrowser.openBrowserAsync(initRes.authorizationUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });

      // 3. Verify payment — retry up to 4 times with a 2s delay so we don't
      //    race against Paystack's own processing time after the browser closes.
      let verifyRes: { status: string } | null = null;
      let lastVerifyError = 'Payment was not completed. You can try again.';

      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        try {
          verifyRes = await apiFetch<{ status: string }>('/api/payments/verify', {
            method: 'POST',
            body: JSON.stringify({ reference: initRes.reference }),
            token,
          });
          if (verifyRes.status === 'success' || verifyRes.status === 'already_processed') {
            break; // confirmed — stop retrying
          }
        } catch (e: any) {
          lastVerifyError = e.message ?? lastVerifyError;
          // Keep retrying unless it's a hard 404/401
          if (e.message?.includes('not found') || e.message?.includes('Unauthorized')) break;
        }
      }

      if (verifyRes?.status === 'success' || verifyRes?.status === 'already_processed') {
        Alert.alert(
          '🎉 Payment confirmed!',
          'Driver has been accepted and a shipment has been created.',
          [{ text: 'View shipments', onPress: () => router.replace('/(shipper)/(tabs)/shipments') }],
        );
      } else {
        Alert.alert('Payment incomplete', lastVerifyError);
        // Resume polling
        intervalRef.current = setInterval(() => fetchBids(true), 2000);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong. Please try again.');
      // Resume polling
      intervalRef.current = setInterval(() => fetchBids(true), 2000);
    } finally {
      setPayingBidId(null);
    }
  };

  if (loading && bids.length === 0) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  if (error && bids.length === 0 && !load) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchBids(true); }}
        />
      }>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      {load && (
        <View style={styles.loadSummary}>
          {load.loadImageUrl ? (
            <Image
              source={{ uri: load.loadImageUrl }}
              style={styles.loadSummaryImage}
              resizeMode="cover"
            />
          ) : null}
          <Text style={styles.loadSummaryRoute}>
            {load.pickupAddress} → {load.deliveryAddress}
          </Text>
          <Text style={styles.loadSummaryMeta}>
            {load.truckType} • ₦{load.fareOffer.toLocaleString()}
          </Text>
          <Text style={styles.loadSummaryDesc} numberOfLines={2}>{load.loadDescription}</Text>
        </View>
      )}

      <Text style={styles.title}>Driver bids</Text>
      <Text style={styles.subtitle}>
        {bids.length === 0
          ? 'Waiting for drivers to apply…'
          : `${bids.filter((b) => b.status === 'pending').length} pending bid${bids.filter((b) => b.status === 'pending').length !== 1 ? 's' : ''}`}
      </Text>

      {bids.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No bids yet. This page auto-refreshes.</Text>
        </View>
      )}

      {bids.map((bid) => {
        const name =
          bid.driver.firstName || bid.driver.lastName
            ? `${bid.driver.firstName ?? ''} ${bid.driver.lastName ?? ''}`.trim()
            : bid.driver.email;

        const isPending = bid.status === 'pending';
        const isAccepted = bid.status === 'accepted';
        const isPaying = payingBidId === bid.id;

        return (
          <View
            key={bid.id}
            style={[
              styles.card,
              isAccepted && styles.cardAccepted,
              bid.status === 'rejected' && styles.cardRejected,
            ]}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{name}</Text>
              {!isPending && (
                <View style={[styles.statusPill, isAccepted ? styles.pillAccepted : styles.pillRejected]}>
                  <Text style={[styles.pillText, isAccepted ? styles.pillTextAccepted : styles.pillTextRejected]}>
                    {isAccepted ? 'Accepted' : 'Rejected'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.meta}>
              {bid.driver.truckType || 'Truck type not set'} • {bid.driver.phoneNumber || 'No phone'}
            </Text>
            <Text style={styles.offer}>
              Offer: {bid.offerAmount != null ? `₦${bid.offerAmount.toLocaleString()}` : 'No amount'}
            </Text>

            {isPending && (
              <View style={styles.actionsRow}>
                <Pressable
                  style={({ pressed }) => [styles.rejectButton, pressed && { opacity: 0.8 }, (!!actingId || !!payingBidId) && { opacity: 0.5 }]}
                  onPress={() => handleReject(bid.id)}
                  disabled={!!actingId || !!payingBidId}>
                  <Text style={styles.rejectButtonText}>
                    {actingId === bid.id ? 'Rejecting…' : 'Reject'}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.acceptButton, pressed && { opacity: 0.8 }, (!!actingId || !!payingBidId) && { opacity: 0.5 }]}
                  onPress={() => handleAccept(bid.id)}
                  disabled={!!actingId || !!payingBidId}>
                  {isPaying ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.acceptButtonText}>Accept & Pay ₦{(bid.offerAmount ?? 0).toLocaleString()}</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: { paddingVertical: 4 },
  backBtnText: { fontSize: 14, color: '#111827', fontWeight: '600' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0fdf4', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16a34a' },
  liveText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  emptyBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14 },
  errorText: { color: '#b91c1c' },
  card: { borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, backgroundColor: '#F9FAFB', gap: 5 },
  cardAccepted: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  cardRejected: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillAccepted: { backgroundColor: '#dcfce7' },
  pillRejected: { backgroundColor: '#fee2e2' },
  pillText: { fontSize: 12, fontWeight: '600' },
  pillTextAccepted: { color: '#16a34a' },
  pillTextRejected: { color: '#dc2626' },
  meta: { fontSize: 13, color: '#6B7280' },
  offer: { fontSize: 14, color: '#111827', marginTop: 2 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  rejectButton: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: '#F97316', backgroundColor: '#ffffff' },
  rejectButtonText: { color: '#F97316', fontSize: 13, fontWeight: '600' },
  acceptButton: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#16a34a', minWidth: 140, alignItems: 'center' },
  acceptButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  loadSummary: { borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, backgroundColor: '#F9FAFB', gap: 6, marginBottom: 16 },
  loadSummaryImage: { width: '100%', height: 140, borderRadius: 10, backgroundColor: '#E5E7EB' },
  loadSummaryRoute: { fontSize: 15, fontWeight: '600', color: '#111827' },
  loadSummaryMeta: { fontSize: 13, color: '#6B7280' },
  loadSummaryDesc: { fontSize: 13, color: '#4B5563' },
});
