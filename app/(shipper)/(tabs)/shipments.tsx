import { StyleSheet, Text, View } from 'react-native';

export default function ShipperShipmentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shipments</Text>
      <Text style={styles.subtitle}>
        This screen will show your past and active shipments with filters by status.
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

