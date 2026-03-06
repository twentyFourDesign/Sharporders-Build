import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { WebView } from 'react-native-webview';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type LoadDetail = {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  truckType: string;
  loadDescription: string;
  fareOffer: number;
  loadStatus: string;
  loadImageUrl: string | null;
  appliedByMe: boolean;
  myBidStatus: 'pending' | 'accepted' | 'rejected' | null;
};

const MAP_HEIGHT = 340;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DriverApplyLoadScreen() {
  const params = useLocalSearchParams<{ id: string; offer?: string }>();
  const { token } = useAuth();
  const loadId = params.id as string;
  const initialOffer = params.offer ?? '';

  const [load, setLoad] = useState<LoadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState(initialOffer);
  const [submitting, setSubmitting] = useState(false);

  const fetchLoad = useCallback(async () => {
    if (!token || !loadId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<LoadDetail>(`/api/driver/loads/${loadId}`, {
        method: 'GET',
        token,
      });
      setLoad(data);
      setError(null);
      if (!initialOffer && data.fareOffer) {
        setOffer((prev) => (prev === '' ? String(data.fareOffer) : prev));
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load load details');
    } finally {
      setLoading(false);
    }
  }, [token, loadId, initialOffer]);

  useEffect(() => {
    fetchLoad();
  }, [fetchLoad]);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLoad();
    setRefreshing(false);
  }, [fetchLoad]);

  const handlePlaceBid = async () => {
    if (!token) return;
    const amount = Number(offer);
    if (!offer.trim() || Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid bid amount (₦).');
      return;
    }
    try {
      setSubmitting(true);
      await apiFetch('/api/bids', {
        method: 'POST',
        body: JSON.stringify({ loadId, offerAmount: amount }),
        token,
      });
      Alert.alert('Bid placed', 'Your bid has been submitted. The shipper will review it.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Failed to bid', err.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !load) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && !load) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!load) return null;

  const alreadyApplied = load.appliedByMe;
  const canBid = load.loadStatus === 'available' && !alreadyApplied;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Place bid</Text>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {process.env.EXPO_PUBLIC_GMAPSAPI ? (
          <WebView
            source={{
              html: (() => {
                const embedUrl = `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(process.env.EXPO_PUBLIC_GMAPSAPI!)}&origin=${encodeURIComponent(load.pickupAddress)}&destination=${encodeURIComponent(load.deliveryAddress)}`;
                return `<!DOCTYPE html><html style="height:${MAP_HEIGHT}px;width:100%;margin:0;padding:0;overflow:hidden"><head><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/></head><body style="margin:0;padding:0;height:${MAP_HEIGHT}px;min-height:${MAP_HEIGHT}px;width:100%;min-width:100%;position:relative;overflow:hidden;box-sizing:border-box"><iframe style="position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;border:0;display:block" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${embedUrl.replace(/"/g, '&quot;')}"></iframe></body></html>`;
              })(),
            }}
            style={styles.mapWebView}
            scrollEnabled={false}
            nestedScrollEnabled
            originWhitelist={['*']}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>Map</Text>
            <Text style={styles.mapPlaceholderSubtext}>
              {load.pickupAddress} → {load.deliveryAddress}
            </Text>
          </View>
        )}
      </View>

      {/* Route summary */}
      <Text style={styles.routeText}>
        {load.pickupAddress} → {load.deliveryAddress}
      </Text>
      <Text style={styles.metaText}>
        {load.truckType} • Shipper offer ₦{load.fareOffer.toLocaleString()}
      </Text>

      {alreadyApplied ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>
            {load.myBidStatus === 'pending'
              ? 'Applied — awaiting shipper'
              : load.myBidStatus === 'accepted'
                ? '✓ Accepted!'
                : 'Rejected'}
          </Text>
          <Pressable style={styles.backToBoardBtn} onPress={() => router.back()}>
            <Text style={styles.backToBoardBtnText}>Back to load board</Text>
          </Pressable>
        </View>
      ) : canBid ? (
        <View style={styles.form}>
          <Text style={styles.label}>Your offer (₦)</Text>
          <TextInput
            style={styles.input}
            value={offer}
            onChangeText={setOffer}
            placeholder={String(load.fareOffer)}
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            editable={!submitting}
          />
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && { opacity: 0.85 },
              submitting && { opacity: 0.6 },
            ]}
            onPress={handlePlaceBid}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Place bid</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>This load is no longer available.</Text>
          <Pressable style={styles.backToBoardBtn} onPress={() => router.back()}>
            <Text style={styles.backToBoardBtnText}>Back to load board</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { paddingVertical: 4, marginRight: 12 },
  backBtnText: { fontSize: 16, color: '#111827', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  mapContainer: { height: MAP_HEIGHT, width: SCREEN_WIDTH, marginLeft: -24, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  mapWebView: { width: SCREEN_WIDTH, height: MAP_HEIGHT },
  mapPlaceholder: { width: SCREEN_WIDTH, height: MAP_HEIGHT, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E7EB', padding: 16 },
  mapPlaceholderText: { fontSize: 18, fontWeight: '600', color: '#6B7280' },
  mapPlaceholderSubtext: { fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  routeText: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 16 },
  metaText: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  form: { marginTop: 24, gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827' },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  statusBox: { marginTop: 24, padding: 16, backgroundColor: '#F3F4F6', borderRadius: 12 },
  statusTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  backToBoardBtn: { marginTop: 12, paddingVertical: 8 },
  backToBoardBtnText: { fontSize: 14, color: '#007AFF', fontWeight: '600' },
  errorText: { color: '#b91c1c', marginBottom: 16 },
});
