import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function RoleSelectScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join SharpOrder</Text>
      <Text style={styles.subtitle}>Choose how you want to use the app</Text>

      <View style={styles.cards}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/(auth)/signup-shipper')}>
          <Text style={styles.cardTitle}>I am a Shipper</Text>
          <Text style={styles.cardBody}>
            Post loads, choose drivers, track deliveries and pay securely.
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/(auth)/signup-driver')}>
          <Text style={styles.cardTitle}>I am a Driver</Text>
          <Text style={styles.cardBody}>
            Find nearby loads that match your truck, stay active and get paid.
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.footerLink, pressed && styles.footerLinkPressed]}
        onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.footerLinkText}>Already have an account? Log in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    gap: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: -16,
  },
  cards: {
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    color: '#4B5563',
  },
  footerLink: {
    marginTop: 'auto',
    paddingVertical: 8,
  },
  footerLinkPressed: {
    opacity: 0.7,
  },
  footerLinkText: {
    textAlign: 'center',
    color: '#111827',
    fontSize: 14,
  },
});

