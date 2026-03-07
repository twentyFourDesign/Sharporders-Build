import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; borderColor: string }> = {
  open: { label: 'Open', color: '#007AFF', bg: '#EFF6FF', borderColor: '#BFDBFE' },
  in_progress: { label: 'In-progress', color: '#007AFF', bg: '#DBEAFE', borderColor: '#93C5FD' },
  resolved: { label: 'Resolved', color: '#B45309', bg: '#FFFBEB', borderColor: '#FDE68A' },
  closed: { label: 'Closed', color: '#6B7280', bg: '#F3F4F6', borderColor: '#D1D5DB' },
};

const FAQS: { q: string; a: string }[] = [
  { q: 'How do I create a load?', a: 'Go to Loads, tap "Create load", fill in pickup, delivery, truck type, and offer amount. Submit to publish.' },
  { q: 'How do I accept a driver bid?', a: 'Open the load, go to Bids. Tap a bid to view details and accept. The driver will be assigned to the shipment.' },
  { q: 'When is payment taken?', a: 'Payment is processed when you accept a bid. The agreed amount is charged; the driver receives payout after delivery.' },
  { q: 'Can I cancel a load?', a: 'Yes. From the load or bids screen you can cancel before a driver is assigned. After assignment, contact support.' },
  { q: 'How do I track my shipment?', a: 'Open the trip in Shipments. You’ll see status updates and can contact the driver from the details screen.' },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const cfg = STATUS_CONFIG[ticket.status];
  return (
    <Pressable
      style={({ pressed }) => [styles.ticketCard, pressed && { opacity: 0.9 }]}
      onPress={() => router.push(`/(shipper)/support/${ticket.id}`)}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketTitle}>{ticket.title}</Text>
        <Text style={styles.ticketTime}>{formatTime(ticket.createdAt)}</Text>
      </View>
      <Text style={styles.ticketDesc}>{ticket.description}</Text>
      <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.borderColor }]}>
        <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
      <Text style={styles.viewRepliesHint}>Tap to view replies</Text>
    </Pressable>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable style={[styles.faqItem, open && styles.faqItemOpen]} onPress={() => setOpen((v) => !v)}>
      <View style={styles.faqRow}>
        <Text style={[styles.faqQuestion, open && styles.faqQuestionOpen]}>{q}</Text>
        <Text style={styles.faqChevron}>{open ? '∧' : '∨'}</Text>
      </View>
      {open && <Text style={styles.faqAnswer}>{a}</Text>}
    </Pressable>
  );
}

export default function SupportScreen() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch<Ticket[]>('/api/support/tickets', { method: 'GET', token });
        setTickets(data);
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
    fetchTickets();
  }, [fetchTickets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTickets(true);
  }, [fetchTickets]);

  const handleSubmit = async () => {
    if (!newTitle.trim() || !newDesc.trim()) {
      Alert.alert('Missing fields', 'Please fill in both the subject and description.');
      return;
    }
    try {
      setSubmitting(true);
      const ticket = await apiFetch<Ticket>('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() }),
        token: token!,
      });
      setTickets((prev) => [ticket, ...prev]);
      setModalVisible(false);
      setNewTitle('');
      setNewDesc('');
      Alert.alert('Ticket submitted', "We've received your request. We'll get back to you shortly.");
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const closedTickets = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Support</Text>
          <Pressable style={styles.newTicketBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.newTicketBtnText}>+ New</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Open Tickets</Text>
        {openTickets.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No open tickets — you're all good!</Text>
          </View>
        ) : (
          <View style={styles.ticketList}>
            {openTickets.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Closed Tickets</Text>
        {closedTickets.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No closed tickets yet</Text>
          </View>
        ) : (
          <View style={styles.ticketList}>
            {closedTickets.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>FAQ's</Text>
        <View style={styles.faqList}>
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit a Ticket</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Issue with a load"
              placeholderTextColor="#9CA3AF"
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Describe your issue in detail…"
              placeholderTextColor="#9CA3AF"
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9 }]}
              onPress={handleSubmit}
              disabled={submitting}>
              <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : 'Submit Ticket'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backBtnText: { fontSize: 22, color: '#111827', fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1 },
  newTicketBtn: { backgroundColor: '#007AFF', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  newTicketBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  ticketList: { gap: 12 },
  ticketCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    backgroundColor: '#ffffff',
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  ticketTitle: { fontSize: 14, fontWeight: '600', color: '#007AFF', flex: 1, marginRight: 8 },
  ticketTime: { fontSize: 12, color: '#9CA3AF' },
  ticketDesc: { fontSize: 13, color: '#374151', lineHeight: 19, marginBottom: 10 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  viewRepliesHint: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  emptyBox: { padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  faqList: { gap: 10 },
  faqItem: { borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#ffffff' },
  faqItemOpen: { borderColor: '#BFDBFE', backgroundColor: '#F0F7FF' },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 14, color: '#111827', flex: 1, marginRight: 8, fontWeight: '500' },
  faqQuestionOpen: { color: '#007AFF', fontWeight: '600' },
  faqChevron: { fontSize: 13, color: '#6B7280' },
  faqAnswer: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginTop: 10 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalClose: { fontSize: 18, color: '#6B7280', padding: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 14,
  },
  textarea: { minHeight: 100 },
  submitBtn: { backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
