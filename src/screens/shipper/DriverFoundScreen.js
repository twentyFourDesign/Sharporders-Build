import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Modal, Image, TouchableWithoutFeedback, Alert } from 'react-native';
import { useAppContext } from '../../context/AppContext';
import { firebaseLoadsService, firebaseShipmentsService } from '../../services/firebase';

const DriverFoundScreen = ({ navigation, route }) => {
  const { 
    showDeliveryAlert, 
    setShowDeliveryAlert, 
    showSuccessModal, 
    setShowSuccessModal, 
    alertResolved, 
    setAlertResolved 
  } = useAppContext();

  const loadId = route?.params?.loadId;
  const initialLoad = route?.params?.load || null;
  const [processing, setProcessing] = useState(false);

  // Local state to prevent double modals
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleDeliveryComplete = () => {
    setShowSuccessModal(false);
    setAlertResolved(false);
    navigation.navigate('DeliveryComplete');
  };

  const handleMessagePress = () => {
    console.log('Message driver pressed');
  };

  const handleCancelRequest = () => {
    if (isTransitioning) return; // Prevent multiple clicks
    
    // Reset states
    setAlertResolved(false);
    setShowSuccessModal(false);
    
    // Show delivery alert
    setShowDeliveryAlert(true);
  };

  const handleAcceptDriver = async () => {
    if (processing) return;
    try {
      setProcessing(true);
      const load = initialLoad;
      if (!loadId || !load) {
        Alert.alert('Error', 'No load information available.');
        return;
      }
      if (!load.driverId) {
        Alert.alert('No Driver', 'No driver has applied yet.');
        return;
      }

      // Create a shipment in Firestore
      const shipmentData = {
        loadId,
        shipperId: load.shipperId,
        driverId: load.driverId,
        pickupAddress: load.pickupAddress || '',
        deliveryAddress: load.deliveryAddress || '',
        fareOffer: load.fareOffer || 0,
        status: 'in_transit',
      };
      const created = await firebaseShipmentsService.createShipment(shipmentData);
      if (!created?.success) {
        throw new Error(created?.error || 'Failed to create shipment');
      }

      const shipmentId = created.data.id;

      // Update the load to in_transit and set shipmentId
      const upd = await firebaseLoadsService.updateLoad(loadId, { status: 'in_transit', shipmentId });
      if (!upd?.success) {
        throw new Error(upd?.error || 'Failed to update load');
      }

      Alert.alert('Driver accepted', 'Trip has started.');
      // Optionally navigate back or to a tracking screen; the driver will transition via realtime.
      navigation.navigate('Dashboard');
    } catch (e) {
      console.error('Accept driver error:', e);
      Alert.alert('Error', e.message || 'Could not accept driver. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseAlert = () => {
    if (isTransitioning) return; // Prevent multiple clicks
    
    setIsTransitioning(true);
    setShowDeliveryAlert(false);
    
    // Wait for alert modal to close completely before showing success
    setTimeout(() => {
      setShowSuccessModal(true);
      setIsTransitioning(false);
    }, 500);
  };

  const handleCloseSuccess = () => {
    if (isTransitioning) return; // Prevent multiple clicks
    
    setShowSuccessModal(false);
    setAlertResolved(false);
    navigation.navigate('Dashboard');
  };

  // Handle backdrop press for delivery alert modal
  const handleAlertBackdropPress = () => {
    if (!isTransitioning) {
      setShowDeliveryAlert(false);
      setAlertResolved(false);
    }
  };

  // Handle backdrop press for success modal
  const handleSuccessBackdropPress = () => {
    if (!isTransitioning) {
      setShowSuccessModal(false);
      setAlertResolved(false);
    }
  };

  // Cleanup effect to prevent state issues
  useEffect(() => {
    return () => {
      setIsTransitioning(false);
    };
  }, []);

  // Subscribe to load to detect completion and navigate
  useEffect(() => {
    if (!loadId) return;
    const unsubscribe = firebaseLoadsService.subscribeToLoad(loadId, (updated) => {
      if (updated && updated.status === 'completed') {
        navigation.navigate('DeliveryComplete');
      }
    });
    return () => { unsubscribe && unsubscribe(); };
  }, [loadId]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      
      {/* Map Area - Updated with pickup image */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          {/* Pickup Location Circle */}
          <View style={styles.pickupCircle}>
            <Image source={require('../../assets/pickup.png')} style={styles.pickupImage} />
          </View>
        </View>
      </View>

      {/* Driver Found Card - Updated design */}
      <View style={styles.driverFoundCard}>
        <Text style={styles.driverFoundTitle}>Driver found</Text>
        <Text style={styles.driverFoundSubtitle}>The driver is on the way to you</Text>
        
        <View style={styles.assignedDriverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>👤</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>Kunle Alamu</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.starIcon}>⭐</Text>
              <Text style={styles.ratingText}>4.8</Text>
              <Text style={styles.deliveryText}>50 successful deliveries</Text>
            </View>
            <Text style={styles.driverDetails}>Standard Rigid Dump Truck</Text>
            <Text style={styles.driverDetails}>LSR 123 AB • 10 mins away</Text>
          </View>
          <View style={styles.driverActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonIcon}>📞</Text>
              <Text style={styles.actionButtonLabel}>Call driver</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleMessagePress}
            >
              <Text style={styles.actionButtonIcon}>💬</Text>
              <Text style={styles.actionButtonLabel}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={{ gap: 10 }}>
          <TouchableOpacity 
            style={[styles.primaryButton, processing && styles.disabledButton]}
            onPress={handleAcceptDriver}
            disabled={processing}
          >
            <Text style={styles.primaryButtonText}>{processing ? 'PROCESSING...' : 'ACCEPT DRIVER'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.cancelButton, isTransitioning && styles.disabledButton]}
            onPress={handleCancelRequest}
            disabled={isTransitioning}
          >
            <Text style={styles.cancelButtonText}>CANCEL REQUEST</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delivery Alert Modal */}
      <Modal 
        visible={showDeliveryAlert && !showSuccessModal} 
        transparent 
        animationType="slide"
        onRequestClose={handleAlertBackdropPress}
      >
        <TouchableWithoutFeedback onPress={handleAlertBackdropPress}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.alertModal}>
                <Text style={styles.alertTitle}>Delivery alert!</Text>
                
                <View style={[styles.alertCard, alertResolved && styles.resolvedAlert]}>
                  <Text style={styles.alertIcon}>⚠️</Text>
                  <View style={styles.alertContent}>
                    <Text style={styles.alertType}>Route diversion</Text>
                    <Text style={styles.alertDescription}>
                      The driver has deviated from the planned route.
                    </Text>
                    <Text style={styles.alertDetails}>Detected at: 3:28 PM</Text>
                    <Text style={styles.alertDetails}>Deviation: 1.5 km off route</Text>
                    
                    {alertResolved && (
                      <View style={styles.resolvedMessage}>
                        <Text style={styles.resolvedText}>
                          The issue has been resolved and the driver is enroute the right destination.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.locationDetails}>
                  <Text style={styles.locationTitle}>Location details</Text>
                  <View style={styles.locationItem}>
                    <Text style={styles.locationPin}>📍</Text>
                    <View>
                      <Text style={styles.locationLabel}>Current location</Text>
                      <Text style={styles.locationText}>Orile Iganmu</Text>
                    </View>
                  </View>
                  <View style={styles.locationItem}>
                    <Text style={styles.locationPin}>📍</Text>
                    <View>
                      <Text style={styles.locationLabel}>Expected location</Text>
                      <Text style={styles.locationText}>Hakeem Dickson, Lekki</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.quickActions}>
                  <Text style={styles.quickActionsTitle}>Quick actions</Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.quickActionButton}>
                      <Text style={styles.quickActionIcon}>📞</Text>
                      <Text style={styles.quickActionText}>Call driver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionButton}>
                      <Text style={styles.quickActionIcon}>💬</Text>
                      <Text style={styles.quickActionText}>Message driver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.ignoreButton}
                      onPress={() => setAlertResolved(true)}
                    >
                      <Text style={styles.ignoreIcon}>🚫</Text>
                      <Text style={styles.ignoreText}>Ignore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionButton}>
                      <Text style={styles.quickActionIcon}>💬</Text>
                      <Text style={styles.quickActionText}>Message admin</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[styles.closeButton, isTransitioning && styles.disabledButton]}
                  onPress={handleCloseAlert}
                  disabled={isTransitioning}
                >
                  <Text style={styles.closeButtonText}>CLOSE</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Success Modal */}
      <Modal 
        visible={showSuccessModal && !showDeliveryAlert} 
        transparent 
        animationType="slide"
        onRequestClose={handleSuccessBackdropPress}
      >
        <TouchableWithoutFeedback onPress={handleSuccessBackdropPress}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.successModal}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Delivery successful!</Text>
                <Text style={styles.successDescription}>
                  Your order was delivered by Kunle Alamu at 3:45 PM. We hope everything met your 
                  expectations and would appreciate your feedback to help us improve.
                </Text>
                
                <Text style={styles.rateTitle}>Rate your delivery</Text>
                <View style={styles.starContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} style={styles.star}>
                      <Text style={styles.starText}>⭐</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={handleDeliveryComplete}
                >
                  <Text style={styles.outlineButtonText}>VIEW RECEIPT</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.fullWidthButton}
                  onPress={handleCloseSuccess}
                >
                  <Text style={styles.fullWidthButtonText}>CLOSE</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mapContainer: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pickupImage: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  driverFoundCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  driverFoundTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  driverFoundSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  assignedDriverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  driverAvatarText: {
    fontSize: 24,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  starIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginRight: 8,
  },
  deliveryText: {
    fontSize: 14,
    color: '#666666',
  },
  driverDetails: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  driverActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#00BFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  actionButtonIcon: {
    fontSize: 14,
  },
  actionButtonLabel: {
    color: '#00BFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#00BFFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  alertModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 15,
    paddingHorizontal: 20,
    paddingBottom: 30, // Added more padding for better attachment to bottom
    maxHeight: '90%', // Prevent modal from going too high
  },
  alertTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  alertCard: {
    flexDirection: 'row',
    padding: 15,
    borderWidth: 1,
    borderColor: '#FFA500',
    borderRadius: 10,
    backgroundColor: '#FFF8E1',
    marginBottom: 15,
  },
  resolvedAlert: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  alertContent: {
    flex: 1,
  },
  alertType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 10,
  },
  alertDetails: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 2,
  },
  resolvedMessage: {
    backgroundColor: '#C8E6C9',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  resolvedText: {
    fontSize: 14,
    color: '#2E7D32',
  },
  locationDetails: {
    marginBottom: 15,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  locationPin: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#666666',
  },
  quickActions: {
    marginBottom: 20, // Increased margin for better spacing
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#00BFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  quickActionIcon: {
    fontSize: 12,
  },
  quickActionText: {
    color: '#00BFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  ignoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  ignoreIcon: {
    fontSize: 12,
  },
  ignoreText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#00BFFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 0, // Removed margin to attach to bottom
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  successModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 25,
    paddingHorizontal: 25,
    paddingBottom: 30, // Added more padding for better attachment to bottom
    alignItems: 'center',
    maxHeight: '80%', // Prevent modal from going too high
  },
  successIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  successDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  rateTitle: {
    fontSize: 18,
    color: '#333333',
    marginBottom: 15,
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 25,
    gap: 10,
  },
  star: {
    padding: 5,
  },
  starText: {
    fontSize: 24,
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: '#00BFFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 30,
  },
  outlineButtonText: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fullWidthButton: {
    backgroundColor: '#00BFFF',
    paddingVertical: 15,
    borderRadius: 0,
    alignItems: 'center',
    marginTop: 15,
    marginHorizontal: -25,
    paddingHorizontal: 30,
    marginBottom: 0, // Explicitly set bottom margin to 0
    borderBottomWidth: 0, // Remove bottom border
  },
  fullWidthButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DriverFoundScreen;