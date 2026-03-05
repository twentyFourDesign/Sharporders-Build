import { StyleSheet, Text, View } from 'react-native';

export default function DriverDashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver dashboard</Text>
      <Text style={styles.subtitle}>
        Here you&apos;ll see your active trip, stats and shortcuts once wired to backend data.
      </Text>
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
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
});

