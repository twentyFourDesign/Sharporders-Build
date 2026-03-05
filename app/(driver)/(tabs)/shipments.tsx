import { StyleSheet, Text, View } from 'react-native';

export default function DriverShipmentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My shipments</Text>
      <Text style={styles.subtitle}>
        This screen will show shipments assigned to you with their current status.
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
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
});

