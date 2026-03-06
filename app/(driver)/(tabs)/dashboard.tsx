import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
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
};

type Load = {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  fareOffer: number;
  status: string;
};

export default function DriverDashboardScreen() {
  const { user, token } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async () => {
      if (!token) { setLoading(false); return; }
      try {
        const [shipmentsData, loadsData] = await Promise.all([
          apiFetch<Shipment[]>('/api/shipments', { method: 'GET', token }),
          apiFetch<Load[]>('/api/loads', { method: 'GET', token }),
        ]);
        setShipments(shipmentsData);
        setLoads(loadsData);
        setError(null);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load data');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => { fetchData(); }, [fetchData]);

  const total = shipments.length;
  const active = shipments.filter((s) => s.status !== 'delivered' && s.status !== 'cancelled').length;
  const delivered = shipments.filter((s) => s.status === 'delivered').length;
  const activeLoads = loads.filter((l) => l.status === 'available').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.hello}>Welcome back</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Driver actions */}
      <Text style={styles.sectionLabel}>As a driver</Text>
      <View style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          onPress={() => router.push({ pathname: '/(driver)/(tabs)/load-board', params: { live: '1' } })}
        >
          <Text style={styles.primaryButtonText}>Go live & find loads</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/(driver)/(tabs)/shipments')}
        >
          <Text style={styles.secondaryButtonText}>My shipments</Text>
        </Pressable>
      </View>

      {/* Driver stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active</Text>
          <Text style={styles.statValue}>{active}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statValue}>{delivered}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total trips</Text>
          <Text style={styles.statValue}>{total}</Text>
        </View>
      </View>

      {/* Shipper actions */}
      <Text style={styles.sectionLabel}>As a shipper</Text>
      <View style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, { backgroundColor: '#111827' }, pressed && styles.buttonPressed]}
          onPress={() => router.push('/(driver)/create-load')}
        >
          <Text style={styles.primaryButtonText}>+ Post a load</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/(driver)/(tabs)/my-loads')}
        >
          <Text style={styles.secondaryButtonText}>My posted loads</Text>
        </Pressable>
      </View>

      {/* Posted loads stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Live loads</Text>
          <Text style={styles.statValue}>{activeLoads}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total posted</Text>
          <Text style={styles.statValue}>{loads.length}</Text>
        </View>
      </View>

      {/* Recent shipments */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent shipments</Text>
        <Pressable onPress={() => router.push('/(driver)/(tabs)/shipments')}>
          <Text style={styles.sectionLink}>View all</Text>
        </Pressable>
      </View>

      {loading && total === 0 && (
        <View style={styles.center}><ActivityIndicator /></View>
      )}
      {!loading && error && (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      )}
      {!loading && !error && total === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No shipments yet.</Text>
          <Text style={styles.emptySubText}>Go live to start picking loads and earning.</Text>
        </View>
      )}
      {shipments.length > 0 && (
        <FlatList
          data={shipments.slice(0, 3)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardRoute}>{item.pickupAddress} → {item.deliveryAddress}</Text>
              <Text style={styles.cardMeta}>₦{item.fareOffer.toLocaleString()}</Text>
              <Text style={styles.cardStatus}>{item.status}</Text>
            </View>
          )}
        />
      )}

      {/* Recent posted loads */}
      {loads.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent posted loads</Text>
            <Pressable onPress={() => router.push('/(driver)/(tabs)/my-loads')}>
              <Text style={styles.sectionLink}>View all</Text>
            </Pressable>
          </View>
          <FlatList
            data={loads.slice(0, 3)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardRoute}>{item.pickupAddress} → {item.deliveryAddress}</Text>
                <Text style={styles.cardMeta}>₦{item.fareOffer.toLocaleString()}</Text>
                <Text style={[styles.cardStatus, { color: item.status === 'available' ? '#111827' : '#6B7280' }]}>
                  {item.status === 'available' ? 'Live' : item.status}
                </Text>
              </View>
            )}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 32, gap: 20 },
  header: { gap: 4 },
  hello: { fontSize: 24, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6B7280' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: { color: '#111827', fontSize: 14, fontWeight: '500' },
  buttonPressed: { opacity: 0.9 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
  },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  sectionLink: { fontSize: 13, color: '#007AFF', fontWeight: '500' },
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  errorText: { color: '#b91c1c' },
  emptyBox: { alignItems: 'center', gap: 4, marginTop: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  emptySubText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  listContent: { gap: 10, marginTop: 8 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  cardRoute: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardMeta: { fontSize: 13, color: '#6B7280' },
  cardStatus: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
});


