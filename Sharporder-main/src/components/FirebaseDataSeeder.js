import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView
} from 'react-native';
import { seedSampleData, clearSampleData } from '../services/firebase/sampleData';

const FirebaseDataSeeder = () => {
  const [loading, setLoading] = useState(false);

  const handleSeedData = async () => {
    Alert.alert(
      'Seed Sample Data',
      'This will add sample loads, shipments, and drivers to your Firebase database for testing. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Seed Data',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await seedSampleData();
              if (result.success) {
                Alert.alert('Success', 'Sample data seeded successfully!');
              } else {
                Alert.alert('Error', result.error || 'Failed to seed data');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to seed data');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear Sample Data',
      'This will remove all sample data from your Firebase database. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear Data',
          style: { color: 'red' },
          onPress: async () => {
            setLoading(true);
            try {
              const result = await clearSampleData();
              if (result.success) {
                Alert.alert('Success', 'Sample data cleared successfully!');
              } else {
                Alert.alert('Error', result.error || 'Failed to clear data');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to clear data');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🔥 Firebase Data Seeder</Text>
        <Text style={styles.description}>
          Use this tool to seed sample data into your Firebase Firestore database for testing your SharpOrder app.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📊 Sample Data Includes:</Text>
          <Text style={styles.infoItem}>• 2 Sample Loads (Lagos→Abuja, Port Harcourt→Kano)</Text>
          <Text style={styles.infoItem}>• 2 Sample Shipments (with different statuses)</Text>
          <Text style={styles.infoItem}>• 3 Sample Drivers (with ratings and locations)</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.seedButton]}
            onPress={handleSeedData}
            disabled={loading}
          >
            <Text style={styles.seedButtonText}>
              {loading ? 'Seeding...' : '🌱 Seed Sample Data'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClearData}
            disabled={loading}
          >
            <Text style={styles.clearButtonText}>
              {loading ? 'Clearing...' : '🗑️ Clear Sample Data'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          💡 Note: Make sure your Firebase security rules allow these operations.
          You may need to temporarily modify your rules for testing.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976d2',
  },
  infoItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  seedButton: {
    backgroundColor: '#4caf50',
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  seedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default FirebaseDataSeeder;
