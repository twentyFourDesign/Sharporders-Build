import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '100';
const COMPANY_NAME = 'SharpOrder';
const SUPPORT_EMAIL = 'support@sharporder.app';
const WEBSITE_URL = 'https://sharporder.app';

type LinkRowProps = { label: string; value?: string; onPress?: () => void; chevron?: boolean };

function LinkRow({ label, value, onPress, chevron }: LinkRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && { backgroundColor: '#F9FAFB' }]}
      onPress={onPress}
      disabled={!onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {chevron && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>About</Text>
      </View>

      {/* App identity card */}
      <View style={styles.heroCard}>
        <View style={styles.appIcon}>
          <Text style={styles.appIconText}>🚚</Text>
        </View>
        <Text style={styles.appName}>{COMPANY_NAME}</Text>
        <Text style={styles.appTagline}>Connecting drivers with shippers across Nigeria</Text>
        <View style={styles.versionPill}>
          <Text style={styles.versionPillText}>v{APP_VERSION} (build {BUILD_NUMBER})</Text>
        </View>
      </View>

      {/* App info */}
      <Text style={styles.sectionTitle}>App Info</Text>
      <View style={styles.sheet}>
        <LinkRow label="Version" value={APP_VERSION} />
        <View style={styles.separator} />
        <LinkRow label="Build" value={BUILD_NUMBER} />
        <View style={styles.separator} />
        <LinkRow label="Platform" value="iOS & Android" />
      </View>

      {/* Company */}
      <Text style={styles.sectionTitle}>Company</Text>
      <View style={styles.sheet}>
        <LinkRow label="Company" value={COMPANY_NAME} />
        <View style={styles.separator} />
        <LinkRow
          label="Website"
          value={WEBSITE_URL}
          chevron
          onPress={() => Linking.openURL(WEBSITE_URL)}
        />
        <View style={styles.separator} />
        <LinkRow
          label="Contact Support"
          value={SUPPORT_EMAIL}
          chevron
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
      </View>

      {/* Legal */}
      <Text style={styles.sectionTitle}>Legal</Text>
      <View style={styles.sheet}>
        <LinkRow
          label="Privacy Policy"
          chevron
          onPress={() => Linking.openURL(`${WEBSITE_URL}/privacy`)}
        />
        <View style={styles.separator} />
        <LinkRow
          label="Terms of Service"
          chevron
          onPress={() => Linking.openURL(`${WEBSITE_URL}/terms`)}
        />
        <View style={styles.separator} />
        <LinkRow
          label="Cookie Policy"
          chevron
          onPress={() => Linking.openURL(`${WEBSITE_URL}/cookies`)}
        />
      </View>

      {/* Mission */}
      <View style={styles.missionCard}>
        <Text style={styles.missionTitle}>Our Mission</Text>
        <Text style={styles.missionText}>
          SharpOrder makes logistics simple and transparent for both drivers and shippers across Nigeria.
          We believe every driver deserves fair pay and every shipment deserves reliable delivery.
        </Text>
      </View>

      <Text style={styles.copyright}>© {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 48 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backBtnText: { fontSize: 22, color: '#111827', fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

  heroCard: {
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  appIconText: { fontSize: 36 },
  appName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  appTagline: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 18, marginBottom: 12 },
  versionPill: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  versionPillText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  sheet: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLabel: { fontSize: 15, color: '#111827' },
  rowValue: { fontSize: 14, color: '#6B7280' },
  chevron: { fontSize: 18, color: '#9CA3AF' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 16 },

  missionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 24,
  },
  missionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  missionText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },

  copyright: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
});
