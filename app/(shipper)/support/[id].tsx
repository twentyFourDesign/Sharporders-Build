import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

type Reply = { id: string; message: string; isFromStaff: boolean; createdAt: string };
type TicketDetail = { id: string; title: string; description: string; status: string; createdAt: string; replies: Reply[] };

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTicket = useCallback(
    async (silent = false) => {
      if (!token || !id) return;
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch<TicketDetail>(`/api/support/tickets/${id}`, { method: 'GET', token });
        setTicket(data);
      } catch {
        setTicket(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, id],
  );

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Refetch when screen comes into focus so new admin replies show
  useFocusEffect(
    useCallback(() => {
      fetchTicket(true);
    }, [fetchTicket]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTicket(true);
  }, [fetchTicket]);

  const sendReply = async () => {
    const msg = replyText.trim();
    if (!msg || !token || !id) return;
    try {
      setSending(true);
      await apiFetch(`/api/support/tickets/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
        token,
      });
      setReplyText('');
      fetchTicket(true);
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not send reply.');
    } finally {
      setSending(false);
    }
  };

  if (loading && !ticket) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Ticket not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
          <Pressable onPress={onRefresh} style={styles.refreshBtn} disabled={refreshing}>
            <Text style={styles.refreshBtnText}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{ticket.title}</Text>
        <Text style={styles.meta}>{formatDate(ticket.createdAt)} · Status: {ticket.status}</Text>
        <View style={styles.initialMessage}>
          <Text style={styles.initialLabel}>Your message</Text>
          <Text style={styles.bodyText}>{ticket.description}</Text>
        </View>

        <Text style={styles.repliesTitle}>Replies</Text>
        {(ticket.replies ?? []).length === 0 ? (
          <Text style={styles.noReplies}>No replies yet. Support will respond here.</Text>
        ) : (
          (ticket.replies ?? []).map((r) => (
            <View key={r.id} style={[styles.replyBubble, r.isFromStaff ? styles.replyStaff : styles.replyUser]}>
              <Text style={styles.replyLabel}>{r.isFromStaff ? 'Support' : 'You'}</Text>
              <Text style={styles.replyMessage}>{r.message}</Text>
              <Text style={styles.replyTime}>{formatDate(r.createdAt)}</Text>
            </View>
          ))
        )}

        <View style={styles.replyInputRow}>
          <TextInput
            style={styles.replyInput}
            placeholder="Type a reply…"
            placeholderTextColor="#9CA3AF"
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <Pressable
            style={[styles.sendBtn, (!replyText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendReply}
            disabled={!replyText.trim() || sending}>
            <Text style={styles.sendBtnText}>{sending ? 'Sending…' : 'Send'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#6B7280', marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { paddingVertical: 8, paddingRight: 12 },
  backBtnText: { fontSize: 16, color: '#007AFF', fontWeight: '500' },
  refreshBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  refreshBtnText: { fontSize: 14, color: '#007AFF', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  meta: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  initialMessage: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  initialLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  bodyText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  repliesTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  noReplies: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 20 },
  replyBubble: { borderRadius: 12, padding: 12, marginBottom: 10, maxWidth: '90%' },
  replyUser: { backgroundColor: '#EFF6FF', alignSelf: 'flex-end' },
  replyStaff: { backgroundColor: '#F3F4F6', alignSelf: 'flex-start', borderLeftWidth: 4, borderLeftColor: '#10B981' },
  replyLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  replyMessage: { fontSize: 14, color: '#111827', lineHeight: 20 },
  replyTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  replyInputRow: { marginTop: 24, gap: 10 },
  replyInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendBtn: { backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
