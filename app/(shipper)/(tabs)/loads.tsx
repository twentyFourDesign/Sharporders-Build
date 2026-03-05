import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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

export default function ShipperLoadsScreen() {
  const { token } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch<Load[]>('/api/loads', { method: 'GET', token });
        if (!isMounted) return;
        setLoads(data);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message ?? 'Failed to load loads');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My loads</Text>
        <Pressable
          style={({ pressed }) => [styles.createButton, pressed && styles.createButtonPressed]}
          onPress={() => router.push('/(shipper)/create-load')}>
          <Text style={styles.createButtonText}>Create load</Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && loads.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>You haven&apos;t created any loads yet.</Text>
        </View>
      )}

      {!loading && !error && loads.length > 0 && (
        <FlatList
          data={loads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardRoute}>
                {item.pickupAddress} → {item.deliveryAddress}
              </Text>
              <Text style={styles.cardMeta}>
                {item.truckType} • ₦{item.fareOffer} • {item.status}
              </Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.loadDescription}
              </Text>
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
  createButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#111827',
  },
  createButtonPressed: {
    opacity: 0.9,
  },
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
  errorText: {
    color: '#b91c1c',
  },
  emptyText: {
    color: '#6B7280',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  cardRoute: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#4B5563',
  },
});


