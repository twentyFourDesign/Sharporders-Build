import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';

const RoleSelectionScreen = ({ navigation }) => {
  const handleSelect = (role) => {
    if (role === 'driver') {
      navigation.navigate('DriverSignup');
    } else {
      navigation.navigate('SignUp', { role });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      <View style={styles.header}> 
        <Text style={styles.title}>Select your role</Text>
        <Text style={styles.subtitle}>Choose how you want to use Sharporder</Text>
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity style={styles.card} onPress={() => handleSelect('shipper')}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Shipper</Text>
          </View>
          <Text style={styles.cardTitle}>I want to ship items</Text>
          <Text style={styles.cardDesc}>
            Post loads, get bids from drivers and manage your deliveries easily.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => handleSelect('driver')}>
          <View style={[styles.badge, styles.driverBadge]}> 
            <Text style={styles.badgeText}>Driver</Text>
          </View>
          <Text style={styles.cardTitle}>I want to deliver loads</Text>
          <Text style={styles.cardDesc}>
            Browse available loads, place bids and complete deliveries to get paid.
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.secondaryLink} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.secondaryLinkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  driverBadge: {
    backgroundColor: '#00BFFF',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  secondaryLink: {
    marginTop: 'auto',
    marginBottom: 30,
    alignItems: 'center',
  },
  secondaryLinkText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default RoleSelectionScreen;