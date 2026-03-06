import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
};

const TYPE_CONFIG: Record<
  string,
  { color: string; bg: string; actionLabel?: string; actionRoute?: (data: Record<string, any>) => string }
> = {
  new_payment: {
    color: '#16A34A',
    bg: '#DCFCE7',
    actionLabel: 'View Wallet',
    actionRoute: () => '/(driver)/wallet',
  },
  new_load: {
    color: '#007AFF',
    bg: '#DBEAFE',
    actionLabel: 'Go to Load Board',
    actionRoute: () => '/(driver)/(tabs)/load-board',
  },
  bid_accepted: {
    color: '#7C3AED',
    bg: '#EDE9FE',
    actionLabel: 'View Details',
    actionRoute: (data) => (data?.shipmentId ? `/(driver)/shipment/${data.shipmentId}` : '/(driver)/(tabs)/shipments'),
  },
  bid_rejected: {
    color: '#DC2626',
    bg: '#FEE2E2',
    actionLabel: 'View Load Board',
    actionRoute: () => '/(driver)/(tabs)/load-board',
  },
};

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch<Notification[]>('/api/notifications', {
          method: 'GET',
          token,
        });
        setNotifications(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(true);
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await apiFetch('/api/notifications', { method: 'PATCH', token });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  }, [token]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notification Center</Text>
        {unreadCount > 0 && (
          <Pressable style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtitle}>
            Activity like payments, bids, and new loads will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {notifications.map((notif) => (
            <NotificationItem key={notif.id} notif={notif} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function NotificationItem({ notif }: { notif: Notification }) {
  const cfg = TYPE_CONFIG[notif.type] ?? {
    color: '#6B7280',
    bg: '#F3F4F6',
  };

  const handleAction = () => {
    if (cfg.actionRoute) {
      const route = cfg.actionRoute(notif.data ?? {});
      router.push(route as any);
    }
  };

  return (
    <View style={[styles.card, !notif.isRead && styles.cardUnread]}>
      <View style={styles.cardTop}>
        <View style={styles.titleRow}>
          <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typePillText, { color: cfg.color }]}>{notif.title}</Text>
          </View>
          <Text style={styles.timeText}>{formatTime(notif.createdAt)}</Text>
        </View>
        {!notif.isRead && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.message}>{notif.message}</Text>
      {cfg.actionLabel && (
        <Pressable onPress={handleAction}>
          <Text style={[styles.actionLink, { color: cfg.color }]}>{cfg.actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backBtnText: { fontSize: 22, color: '#111827', fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1 },
  markAllBtn: { paddingVertical: 6, paddingLeft: 12 },
  markAllText: { fontSize: 13, color: '#007AFF', fontWeight: '500' },

  list: { gap: 12 },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    backgroundColor: '#ffffff',
  },
  cardUnread: {
    backgroundColor: '#F0F7FF',
    borderColor: '#BFDBFE',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typePillText: { fontSize: 12, fontWeight: '600' },
  timeText: { fontSize: 12, color: '#9CA3AF' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  message: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 10 },
  actionLink: { fontSize: 13, fontWeight: '600' },

  emptyBox: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
