import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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

type Transaction = {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string | null;
  status: 'pending' | 'success' | 'failed';
  reference: string | null;
  createdAt: string;
  invoiceUrl?: string;
  bankReferenceNumber?: string;
  processedAt?: string;
};

type WalletData = {
  balance: number;
  completedTrips: number;
  platformDeduction: number;
  totalPayout: number;
  transactions: Transaction[];
};

const PLATFORM_FEE_PCT = 10;

function fmt(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const mo = (d.getMonth() + 1).toString().padStart(2, '0');
  const yy = d.getFullYear();
  return `${hh}:${mm}am, ${dd}/${mo}/${yy}`;
}

export default function WalletScreen() {
  const { token } = useAuth();
  const [view, setView] = useState<'wallet' | 'withdraw'>('wallet');
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchWallet = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch<WalletData>('/api/driver/wallet', {
          method: 'GET',
          token,
        });
        setWalletData(data);
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
    fetchWallet();
  }, [fetchWallet]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWallet(true);
  }, [fetchWallet]);

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (walletData && amount > walletData.balance) {
      Alert.alert('Insufficient balance', 'You cannot withdraw more than your available balance.');
      return;
    }
    try {
      setWithdrawing(true);
      const result = await apiFetch<{ balance: number; message?: string }>('/api/driver/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount }),
        token: token!,
      });
      setWalletData((prev) => (prev ? { ...prev, balance: result.balance } : prev));
      setWithdrawAmount('');
      await fetchWallet(true);
      Alert.alert('Success', `Withdrawal of ${fmt(amount)} has been submitted. You will be notified when it is processed.`);
    } catch (e: any) {
      Alert.alert('Withdrawal failed', e?.message ?? 'Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Filter transactions by tab (weekly = last 7 days, monthly = last 30 days)
  const filteredTxs = walletData?.transactions.filter((tx) => {
    const date = new Date(tx.createdAt);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return tab === 'weekly' ? diffDays <= 7 : diffDays <= 30;
  }) ?? [];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // ─── Withdraw view ───
  if (view === 'withdraw') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => setView('wallet')} style={styles.backBtn}>
              <Text style={styles.backBtnText}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Withdraw</Text>
          </View>

          <Text style={styles.availableLabel}>Available Balance</Text>
          <Text style={styles.bigBalance}>{fmt(walletData?.balance ?? 0)}</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter withdrawal amount"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.withdrawBtn, pressed && { opacity: 0.9 }]}
            onPress={handleWithdraw}
            disabled={withdrawing}>
            <Text style={styles.withdrawBtnText}>
              {withdrawing ? 'PROCESSING…' : 'WITHDRAW'}
            </Text>
          </Pressable>

          {walletData && walletData.transactions.length > 0 && (
            <View style={styles.txList}>
              {walletData.transactions.map((tx) => (
                <TransactionCard key={tx.id} tx={tx} onPress={tx.type === 'debit' ? () => setSelectedTx(tx) : undefined} />
              ))}
            </View>
          )}

          <Modal visible={!!selectedTx} transparent animationType="slide">
            <Pressable style={styles.modalOverlay} onPress={() => setSelectedTx(null)}>
              <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                {selectedTx && <TransactionDetailSheet tx={selectedTx} onClose={() => setSelectedTx(null)} />}
              </Pressable>
            </Pressable>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Wallet view ───
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Wallet</Text>
      </View>

      {/* Weekly / Monthly tabs */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, tab === 'weekly' && styles.tabBtnActive]}
          onPress={() => setTab('weekly')}>
          <Text style={[styles.tabText, tab === 'weekly' && styles.tabTextActive]}>Weekly</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'monthly' && styles.tabBtnActive]}
          onPress={() => setTab('monthly')}>
          <Text style={[styles.tabText, tab === 'monthly' && styles.tabTextActive]}>Monthly</Text>
        </Pressable>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{fmt(walletData?.balance ?? 0)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.withdrawPillBtn, pressed && { opacity: 0.85 }]}
          onPress={() => setView('withdraw')}>
          <Text style={styles.withdrawPillText}>WITHDRAW</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Completed Trips</Text>
          <Text style={styles.statValue}>{walletData?.completedTrips ?? 0}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Platform's deduction ({PLATFORM_FEE_PCT}%)</Text>
          <Text style={[styles.statValue, styles.deductionText]}>
            -{fmt(walletData?.platformDeduction ?? 0)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Payout</Text>
          <Text style={styles.statValue}>{fmt(walletData?.totalPayout ?? 0)}</Text>
        </View>
      </View>

      {/* Transaction history */}
      {filteredTxs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No transactions for this period</Text>
        </View>
      ) : (
        <View style={styles.txList}>
          {filteredTxs.map((tx) => (
            <TransactionCard key={tx.id} tx={tx} onPress={() => tx.type === 'debit' && setSelectedTx(tx)} />
          ))}
        </View>
      )}

      {/* Withdrawal transaction detail modal */}
      <Modal visible={!!selectedTx} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedTx(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedTx && <TransactionDetailSheet tx={selectedTx} onClose={() => setSelectedTx(null)} />}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function TransactionCard({ tx, onPress }: { tx: Transaction; onPress?: () => void }) {
  const isCredit = tx.type === 'credit';
  const isDebit = tx.type === 'debit';
  const isSuccess = tx.status === 'success';
  const isFailed = tx.status === 'failed';
  const isPending = tx.status === 'pending';

  // Status label and styling based on type + status
  let statusLabel: string;
  let statusColor: string;
  let icon: string;
  let iconBg: string;
  let iconColor: string;

  if (isCredit) {
    statusLabel = isFailed ? 'Payment Unsuccessful' : 'Payment Successful';
    statusColor = isFailed ? '#DC2626' : '#16A34A';
    icon = isFailed ? '✗' : '✓';
    iconBg = isFailed ? '#FEE2E2' : '#DCFCE7';
    iconColor = isFailed ? '#DC2626' : '#16A34A';
  } else {
    // Debit (withdrawal)
    if (isPending) {
      statusLabel = 'Pending approval';
      statusColor = '#D97706';
      icon = '⏳';
      iconBg = '#FEF3C7';
      iconColor = '#D97706';
    } else if (isFailed) {
      statusLabel = 'Withdrawal rejected';
      statusColor = '#DC2626';
      icon = '✗';
      iconBg = '#FEE2E2';
      iconColor = '#DC2626';
    } else {
      statusLabel = 'Withdrawal completed';
      statusColor = '#16A34A';
      icon = '✓';
      iconBg = '#DCFCE7';
      iconColor = '#16A34A';
    }
  }

  return (
    <Pressable style={styles.txCard} onPress={onPress} disabled={!onPress}>
      <View style={[styles.txIconWrap, { backgroundColor: iconBg }]}>
        <Text style={[styles.txIcon, { color: iconColor }]}>{icon}</Text>
      </View>
      <View style={styles.txBody}>
        <Text style={styles.txTime}>{formatTime(tx.createdAt)}</Text>
        <Text style={styles.txAmount}>{fmt(tx.amount)}</Text>
        <Text style={[styles.txStatus, { color: statusColor }]}>{statusLabel}</Text>
        {(tx.invoiceUrl || (tx.type === 'debit' && onPress)) && (
          <Pressable onPress={(e) => { e.stopPropagation(); onPress ? onPress() : tx.invoiceUrl && Linking.openURL(tx.invoiceUrl); }}>
            <Text style={styles.invoiceLink}>View details</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function TransactionDetailSheet({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const processedDate = tx.processedAt ? new Date(tx.processedAt) : null;
  const processedStr = processedDate
    ? processedDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;
  const pathBeforeQuery = tx.invoiceUrl?.split('?')[0] ?? '';
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(pathBeforeQuery);

  return (
    <View style={styles.detailSheet}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailTitle}>Withdrawal details</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.detailClose}>✕</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>{fmt(tx.amount)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date & time</Text>
          <Text style={styles.detailValue}>{processedStr ?? formatTime(tx.createdAt)}</Text>
        </View>
        {tx.bankReferenceNumber && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction reference</Text>
            <Text style={styles.detailValue}>{tx.bankReferenceNumber}</Text>
          </View>
        )}
        {tx.invoiceUrl && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice / proof of payment</Text>
            {isImage ? (
              <Pressable onPress={() => Linking.openURL(tx.invoiceUrl!)} style={styles.invoiceImageWrap}>
                <Image source={{ uri: tx.invoiceUrl }} style={styles.invoiceImage} resizeMode="cover" />
                <Text style={styles.invoiceLink}>Tap to view full size</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => Linking.openURL(tx.invoiceUrl!)}>
                <Text style={styles.invoiceLink}>View invoice</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
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
    marginBottom: 20,
  },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backBtnText: { fontSize: 22, color: '#111827', fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#007AFF', fontWeight: '700' },

  // Balance card
  balanceCard: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  balanceAmount: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  withdrawPillBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  withdrawPillText: { color: '#ffffff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },

  // Stats
  statsSection: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#ffffff',
    marginBottom: 20,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  statLabel: { fontSize: 14, color: '#6B7280' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  deductionText: { color: '#DC2626' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },

  // Transactions
  txList: { gap: 12 },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    backgroundColor: '#ffffff',
  },
  txIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIcon: { fontSize: 16, fontWeight: '700' },
  txBody: { flex: 1 },
  txTime: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  txAmount: { fontSize: 17, fontWeight: '700', color: '#111827' },
  txStatus: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  invoiceLink: { fontSize: 12, color: '#007AFF', fontWeight: '500', marginTop: 4 },

  // Empty
  emptyBox: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 14, color: '#9CA3AF' },

  // Withdraw view
  availableLabel: { fontSize: 14, color: '#007AFF', fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  bigBalance: { fontSize: 36, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 28 },
  inputWrapper: { marginBottom: 20 },
  inputLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  withdrawBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  withdrawBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },

  // Transaction detail modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  detailSheet: { paddingBottom: 32 },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  detailClose: { fontSize: 24, color: '#6B7280', fontWeight: '300' },
  detailBody: { paddingHorizontal: 24, paddingTop: 20 },
  detailRow: { marginBottom: 20 },
  detailLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  invoiceImageWrap: { marginTop: 8 },
  invoiceImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
});
