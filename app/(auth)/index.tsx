import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function AuthLandingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SharpOrder</Text>
      <Text style={styles.subtitle}>Sign in or create an account to continue.</Text>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryText}>Sign in</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/role-select')}>
          <Text style={styles.secondaryText}>Sign up</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  buttons: {
    marginTop: 40,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: '#111827',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.9,
  },
});

