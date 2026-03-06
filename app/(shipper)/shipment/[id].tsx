import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { WebView } from 'react-native-webview';

type Shipment = {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  fareOffer: number;
  status: string;
  currentLocation: string | null;
  createdAt: string;
  driverRating: number | null;
  load?: {
    truckType: string;
    loadDescription: string;
    recipientName: string | null;
    recipientNumber: string | null;
    loadImageUrl: string | null;
    pickupMapsUrl?: string | null;
    deliveryMapsUrl?: string | null;
  } | null;
  driver: {
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    truckType: string | null;
  };
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Awaiting pickup' },
  { key: 'picked_up', label: 'Picked up' },
  { key: 'in_transit', label: 'In transit' },
  { key: 'approaching_dropoff', label: 'Near drop-off' },
  { key: 'delivered', label: 'Delivered' },
] as const;

type StatusKey = (typeof STATUS_STEPS)[number]['key'];

const STATUS_COLOR: Record<StatusKey, string> = {
  pending: '#F59E0B',
  picked_up: '#007AFF',
  in_transit: '#2563EB',
  approaching_dropoff: '#0EA5E9',
  delivered: '#1D4ED8',
};

const MAP_HEIGHT = 340;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ShipperShipmentDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [pendingRating, setPendingRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const shipmentId = params.id as string;

  const fetchShipment = useCallback(
    async (silent = false) => {
      if (!token || !shipmentId) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const all = await apiFetch<Shipment[]>('/api/shipments', {
          method: 'GET',
          token,
        });
        const found = all.find((s) => s.id === shipmentId) ?? null;
        if (!found) {
          setError('Shipment not found.');
        } else {
          setShipment(found);
          setPendingRating(found.driverRating ?? 0);
          setError(null);
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to load shipment');
      } finally {
        setLoading(false);
      }
    },
    [token, shipmentId],
  );

  useEffect(() => {
    fetchShipment();
  }, [fetchShipment]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchShipment(true);
    setRefreshing(false);
  }, [fetchShipment]);

  const handleSubmitRating = useCallback(
    async () => {
      if (!token || !shipment || !pendingRating) return;
      try {
        setRatingSubmitting(true);
        const updated = await apiFetch<{ id: string; driverRating: number }>(
          `/api/shipments/${shipment.id}/rating`,
          {
            method: 'POST',
            body: JSON.stringify({ rating: pendingRating }),
            token,
          },
        );
        setShipment((prev) =>
          prev ? { ...prev, driverRating: updated.driverRating } : prev,
        );
        setRatingModalOpen(false);
      } catch (err: any) {
        Alert.alert('Could not save rating', err.message ?? 'Please try again.');
      } finally {
        setRatingSubmitting(false);
      }
    },
    [token, shipment, pendingRating],
  );

  const openPickupInMaps = () => {
    if (!shipment) return;
    const url =
      shipment.load?.pickupMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        shipment.pickupAddress,
      )}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open maps');
    });
  };

  const openDropoffInMaps = () => {
    if (!shipment) return;
    const url =
      shipment.load?.deliveryMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        shipment.deliveryAddress,
      )}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open maps');
    });
  };

  if (loading && !shipment) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && !shipment) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!shipment) return null;

  const statusKey = (shipment.status as StatusKey) ?? 'pending';
  const statusStep = STATUS_STEPS.find((s) => s.key === statusKey);
  const color = STATUS_COLOR[statusKey] ?? '#6B7280';
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === statusKey);
  const created = new Date(shipment.createdAt);
  const driverName =
    shipment.driver.firstName || shipment.driver.lastName
      ? `${shipment.driver.firstName ?? ''} ${shipment.driver.lastName ?? ''}`.trim()
      : 'Driver';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.mapContainer}>
        {process.env.EXPO_PUBLIC_GMAPSAPI ? (
          <WebView
            source={{
              html: (() => {
                const embedUrl = `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(
                  process.env.EXPO_PUBLIC_GMAPSAPI!,
                )}&origin=${encodeURIComponent(
                  shipment.pickupAddress,
                )}&destination=${encodeURIComponent(shipment.deliveryAddress)}`;
                return `<!DOCTYPE html><html style="height:${MAP_HEIGHT}px;width:100%;margin:0;padding:0;overflow:hidden"><head><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/></head><body style="margin:0;padding:0;height:${MAP_HEIGHT}px;min-height:${MAP_HEIGHT}px;width:100%;min-width:100%;position:relative;overflow:hidden;box-sizing:border-box"><iframe style="position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;border:0;display:block" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${embedUrl.replace(
                  /"/g,
                  '&quot;',
                )}"></iframe></body></html>`;
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
              Add EXPO_PUBLIC_GMAPSAPI and enable Maps Embed API to show route
            </Text>
          </View>
        )}
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Shipment details</Text>
        <Text style={styles.headerStatus}>{statusStep?.label ?? shipment.status}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.route}>{shipment.pickupAddress}</Text>
        <Text style={styles.subRoute}>{shipment.deliveryAddress}</Text>
        <Text style={styles.metaLine}>
          {created.toLocaleDateString()} •{' '}
          {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.amountLine}>
          ₦{shipment.fareOffer.toLocaleString()}
        </Text>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>
            {statusStep?.label ?? shipment.status}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Driver</Text>
          <Text style={styles.infoValue}>
            {driverName}
            {shipment.driver.phoneNumber ? ` • ${shipment.driver.phoneNumber}` : ''}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Truck</Text>
          <Text style={styles.infoValue}>
            {shipment.driver.truckType ?? shipment.load?.truckType ?? 'Unknown'}
          </Text>
        </View>

        {shipment.load?.recipientName && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Recipient</Text>
            <Text style={styles.infoValue}>
              {shipment.load.recipientName}
              {shipment.load.recipientNumber
                ? ` • ${shipment.load.recipientNumber}`
                : ''}
            </Text>
          </View>
        )}

        {shipment.load?.loadDescription ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Load</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {shipment.load.loadDescription}
            </Text>
          </View>
        ) : null}

        {shipment.currentLocation && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current location</Text>
            <Text style={styles.infoValue}>{shipment.currentLocation}</Text>
          </View>
        )}

        <View style={styles.mapsRow}>
          <Text style={styles.mapsLabel}>Open in Maps</Text>
          <View style={styles.mapsButtonsRow}>
            <Text style={styles.mapLink} onPress={openPickupInMaps}>
              Pickup
            </Text>
            <Text style={styles.mapLinkSeparator}>•</Text>
            <Text style={styles.mapLink} onPress={openDropoffInMaps}>
              Drop-off
            </Text>
          </View>
        </View>

        <View style={styles.ratingRow}>
          <View style={styles.ratingLeft}>
            <Text style={styles.ratingLabel}>Your rating</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (shipment.driverRating ?? 0) >= star;
                return (
                  <Text key={star} style={[styles.star, filled && styles.starFilled]}>
                    {filled ? '★' : '☆'}
                  </Text>
                );
              })}
            </View>
          </View>
          {statusKey === 'delivered' && (
            <Pressable
              style={({ pressed }) => [
                styles.rateButton,
                pressed && { opacity: 0.9 },
              ]}
              onPress={() => {
                setPendingRating(shipment.driverRating ?? 0);
                setRatingModalOpen(true);
              }}
            >
              <Text style={styles.rateButtonText}>
                {shipment.driverRating ? 'Edit rating' : 'Rate delivery'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress</Text>
        <View style={styles.stepsRow}>
          {STATUS_STEPS.map((step, index) => (
            <View key={step.key} style={styles.stepCol}>
              <View
                style={[
                  styles.stepCircle,
                  index <= currentStepIndex
                    ? { backgroundColor: color }
                    : { backgroundColor: '#E5E7EB' },
                ]}
              />
              <Text
                style={[
                  styles.stepLabel,
                  index === currentStepIndex && { color: color, fontWeight: '600' },
                ]}
                numberOfLines={2}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {ratingModalOpen && (
        <Modal
          transparent
          animationType="fade"
          visible
          onRequestClose={() => {
            if (!ratingSubmitting) setRatingModalOpen(false);
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Rate this delivery</Text>
              <Text style={styles.modalSubtitle} numberOfLines={2}>
                {shipment.pickupAddress} → {shipment.deliveryAddress}
              </Text>
              <View style={styles.modalStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = pendingRating >= star;
                  return (
                    <Pressable
                      key={star}
                      onPress={() => setPendingRating(star)}
                      disabled={ratingSubmitting}
                      hitSlop={8}
                    >
                      <Text
                        style={[
                          styles.modalStar,
                          filled && styles.modalStarFilled,
                          ratingSubmitting && styles.modalStarDisabled,
                        ]}
                      >
                        {filled ? '★' : '☆'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalCancelBtn,
                    pressed && { opacity: 0.9 },
                    ratingSubmitting && { opacity: 0.6 },
                  ]}
                  onPress={() => !ratingSubmitting && setRatingModalOpen(false)}
                  disabled={ratingSubmitting}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalSubmitBtn,
                    pressed && { opacity: 0.95 },
                    (!pendingRating || ratingSubmitting) && { opacity: 0.6 },
                  ]}
                  onPress={handleSubmitRating}
                  disabled={!pendingRating || ratingSubmitting}
                >
                  {ratingSubmitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Submit</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  errorText: { color: '#b91c1c' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerStatus: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  mapContainer: {
    height: MAP_HEIGHT,
    width: SCREEN_WIDTH,
    marginLeft: -24,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  mapWebView: { width: SCREEN_WIDTH, height: MAP_HEIGHT },
  mapPlaceholder: {
    width: SCREEN_WIDTH,
    height: MAP_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    padding: 16,
  },
  mapPlaceholderText: { fontSize: 18, fontWeight: '600', color: '#6B7280' },
  mapPlaceholderSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  route: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subRoute: { fontSize: 14, color: '#4B5563' },
  metaLine: { fontSize: 12, color: '#9CA3AF' },
  amountLine: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#EEF2FF',
    gap: 6,
    marginTop: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4F46E5' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 12, color: '#9CA3AF' },
  infoValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  mapsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapsLabel: { fontSize: 12, color: '#6B7280' },
  mapsButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapLink: { fontSize: 12, fontWeight: '600', color: '#007AFF' },
  mapLinkSeparator: { fontSize: 12, color: '#9CA3AF' },
  ratingRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingLabel: { fontSize: 12, color: '#6B7280' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  star: { fontSize: 18, color: '#D1D5DB' },
  starFilled: { color: '#F59E0B' },
  rateButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#E5E7EB',
  },
  rateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepCol: { flex: 1, alignItems: 'center', gap: 4 },
  stepCircle: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E7EB' },
  stepLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalSubtitle: { fontSize: 13, color: '#6B7280' },
  modalStarsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modalStar: { fontSize: 30, color: '#D1D5DB' },
  modalStarFilled: { color: '#F59E0B' },
  modalStarDisabled: { opacity: 0.5 },
  modalActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  modalSubmitBtn: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
  },
  modalSubmitText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
});

