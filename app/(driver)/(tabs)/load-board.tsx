import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
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
};

export default function DriverLoadBoardScreen() {
  const { token } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch<Load[]>('/api/driver/loads', {
          method: 'GET',
          token,
        });
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

  const handleApply = async (loadId: string) => {
    if (!token) return;
    try {
      setApplyingId(loadId);
      await apiFetch('/api/bids', {
        method: 'POST',
        body: JSON.stringify({ loadId }),
        token,
      });
      setLoads((prev) => prev.filter((l) => l.id !== loadId));
    } catch (err: any) {
      setError(err.message ?? 'Failed to apply for load');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Load board</Text>

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
          <Text style={styles.emptyText}>No loads available right now.</Text>
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
                {item.truckType} • ₦{item.fareOffer}
              </Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.loadDescription}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.applyButton,
                  pressed && styles.applyButtonPressed,
                  applyingId === item.id && styles.applyButtonDisabled,
                ]}
                onPress={() => handleApply(item.id)}
                disabled={!!applyingId}>
                <Text style={styles.applyButtonText}>
                  {applyingId === item.id ? 'Applying…' : 'Apply'}
                </Text>
              </Pressable>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
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
    marginBottom: 8,
  },
  applyButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#111827',
  },
  applyButtonPressed: {
    opacity: 0.9,
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});


