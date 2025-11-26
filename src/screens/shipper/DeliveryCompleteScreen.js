import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import minimap from '../../assets/mini-map.png';
import back from '../../assets/icons/back.png';

const DeliveryCompleteScreen = ({ navigation }) => {
  const [rating, setRating] = useState(0);

  const handleBack = () => {
    navigation.navigate('Dashboard');
  };

  const handleRepeatDelivery = () => {
    navigation.navigate('Dashboard');
  };

  const handleStarPress = (star) => {
    setRating(star);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Image source={back} style={styles.backIcon} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Delivery complete</Text>
            <Text style={styles.headerSubtitle}>
              Your package has been successfully delivered.
            </Text>
          </View>
        </View>

        <View style={styles.mapContainer}>
          <Image source={minimap} style={styles.mapImage} resizeMode="cover" />
        </View>

        <View style={styles.deliveryCompleteCard}>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>👤</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>Kunle Alamu</Text>
              <Text style={styles.driverDetails}>Standard Rigid Dump Truck</Text>
              <Text style={styles.driverDetails}>LSR 123 AB</Text>
            </View>
            <View style={styles.deliveryMeta}>
              <Text style={styles.deliveryDate}>10/07/2025 12:58 PM</Text>
              <Text style={styles.deliveryPrice}>NGN 12,500</Text>
            </View>
          </View>

          <View style={styles.routeInfo}>
            <View style={styles.routeItem}>
              <View style={styles.routeIconContainer}>
                <View style={[styles.routeIcon, styles.startIcon]} />
              </View>
              <View style={styles.routeDetails}>
                <Text style={styles.routeAddress}>15 Bode Thomas Street, Surulere, Lagos</Text>
                <Text style={styles.routeTime}>08:30 AM</Text>
              </View>
            </View>
            <View style={styles.routeItem}>
              <View style={styles.routeIconContainer}>
                <View style={[styles.routeIcon, styles.endIcon]} />
              </View>
              <View style={styles.routeDetails}>
                <Text style={styles.routeAddress}>35 Hakeem Dickson Street, Lekki Phase 1...</Text>
                <Text style={styles.routeTime}>12:58 PM</Text>
              </View>
            </View>
          </View>

          <Text style={styles.rateTitle}>Rate your delivery</Text>
          <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity 
                key={star} 
                style={styles.star}
                onPress={() => handleStarPress(star)}
              >
                <Text style={[
                  styles.starText, 
                  rating >= star ? styles.starFilled : styles.starEmpty
                ]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, styles.receiptIcon]}>
              <Text style={styles.actionIconText}>📄</Text>
            </View>
            <Text style={styles.actionText}>Receipt</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, styles.supportIcon]}>
              <Text style={styles.actionIconText}>🎧</Text>
            </View>
            <Text style={styles.actionText}>Support</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, styles.returnIcon]}>
              <Text style={styles.actionIconText}>↩️</Text>
            </View>
            <Text style={styles.actionText}>Return trip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleRepeatDelivery}
          >
            <View style={[styles.actionIcon, styles.repeatIcon]}>
              <Text style={styles.actionIconText}>🔄</Text>
            </View>
            <Text style={styles.actionText}>Repeat delivery</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#00BFFF',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  deliveryCompleteCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarText: {
    fontSize: 20,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  driverDetails: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 2,
  },
  deliveryMeta: {
    alignItems: 'flex-end',
  },
  deliveryDate: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 4,
  },
  deliveryPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  routeInfo: {
    marginBottom: 24,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routeIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  routeIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  startIcon: {
    backgroundColor: '#00C851',
  },
  endIcon: {
    backgroundColor: '#8B5CF6',
  },
  routeDetails: {
    flex: 1,
  },
  routeAddress: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
    fontWeight: '500',
  },
  routeTime: {
    fontSize: 12,
    color: '#666666',
  },
  rateTitle: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  star: {
    padding: 4,
  },
  starText: {
    fontSize: 24,
  },
  starFilled: {
    color: '#FFD700',
  },
  starEmpty: {
    color: '#E0E0E0',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingBottom: 30,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptIcon: {
    backgroundColor: '#E3F2FD',
  },
  supportIcon: {
    backgroundColor: '#E8F5E8',
  },
  returnIcon: {
    backgroundColor: '#FFF3E0',
  },
  repeatIcon: {
    backgroundColor: '#F3E5F5',
  },
  actionIconText: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default DeliveryCompleteScreen;