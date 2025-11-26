import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useAuth} from '../../context/AuthContext';
import {firebaseLoadsService} from '../../services/firebase';

const TripDetailsScreen = ({
  visible,
  onClose = () => {},
  navigation,
  formData,
  setFormData = () => {},
}) => {
  const {user} = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSearchDriver = async () => {
    try {
      setLoading(true);
      if (!user || !user.uid) {
        Alert.alert(
          'Not signed in',
          'Please sign in to create a delivery request.',
        );
        return;
      }

      // Prepare load payload
      const loadData = {
        shipperId: user.uid,
        pickupAddress: formData.pickupAddress || '',
        deliveryAddress: formData.deliveryAddress || '',
        truckType: formData.truckType || '',
        loadDescription: formData.loadDescription || '',
        recipientName: formData.recipientName || '',
        recipientNumber: formData.recipientNumber || '',
        fareOffer: parseInt(formData.fareOffer || 1000, 10),
      };

      const result = await firebaseLoadsService.createLoad(loadData);

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to create load');
      }

      const created = result.data; // { id, ...loadData }

      // Close modal and navigate to driver search, passing the new loadId
      onClose();
      if (navigation && navigation.navigate) {
        navigation.navigate('DriverSearch', {loadId: created.id});
      }

      Alert.alert(
        'Request created',
        'Your delivery request has been posted to the load board.',
      );
    } catch (err) {
      console.error('Error creating load:', err);
      Alert.alert(
        'Error',
        err.message || 'Could not create delivery request. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropPress = () => {
    onClose();
    // Navigate to DeliveryDetails when backdrop is pressed
    if (navigation) {
      navigation.navigate('DeliveryDetails');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        {/* Backdrop - only covers the area above the modal */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />

        {/* Modal Content */}
        <View style={styles.modalContainer}>
          <View style={styles.dragHandle} />

          <ScrollView
            style={styles.formContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            keyboardShouldPersistTaps="handled">
            <Text style={styles.pageTitle}>Trip details</Text>

            <View style={styles.tripDetailCard}>
              <Text style={styles.inputLabel}>Pickup address</Text>
              <Text style={styles.addressText}>
                {formData.pickupAddress ||
                  '15 Bode Thomas Street, Surulere, Lagos'}
              </Text>
            </View>

            <View style={styles.tripDetailCard}>
              <Text style={styles.inputLabel}>Delivery address</Text>
              <Text style={styles.addressText}>
                {formData.deliveryAddress ||
                  '35 Hakeem Dickson Street, Lekki Phase 1...'}
              </Text>
            </View>

            <View style={styles.truckSelectedCard}>
              <View style={styles.truckIconContainer}>
                <Text style={styles.truckIcon}>🚛</Text>
              </View>
              <View style={styles.truckDetails}>
                <Text style={styles.truckName}>
                  {formData.truckType || 'Standard Rigid Dump Truck'}
                </Text>
                <Text style={styles.truckSpec}>
                  Capacity: 10-30 cubic yards
                </Text>
                <Text style={styles.truckSpec}>Load weight: 15-25 tons</Text>
                <Text style={styles.truckSpec}>Tyres: 6</Text>
              </View>
            </View>

            <View style={styles.tripDetailCard}>
              <Text style={styles.inputLabel}>Load description</Text>
              <Text style={styles.addressText}>
                {formData.loadDescription || 'Sharp sand for construction'}
              </Text>
            </View>

            <View style={styles.tripDetailCard}>
              <Text style={styles.inputLabel}>Load image</Text>
              <View style={styles.imageContainer}>
                <Text style={styles.imageText}>
                  {formData.loadImageUrl
                    ? formData.loadImageUrl.split('/').pop().split('?')[0]
                    : 'No image selected'}
                </Text>
                <Text style={styles.uploadIcon}>↗</Text>
              </View>
            </View>

            <View style={styles.tripDetailCard}>
              <Text style={styles.inputLabel}>Recipient's name</Text>
              <Text style={styles.addressText}>
                {formData.recipientName || 'Femi Otedola'}
              </Text>
            </View>

            <View style={styles.tripDetailCard}>
              <Text style={styles.inputLabel}>Recipient's number</Text>
              <Text style={styles.addressText}>
                {formData.recipientNumber || '+234 08012345678'}
              </Text>
            </View>

            <View style={styles.fareContainer}>
              <Text style={styles.inputLabel}>Fare offer</Text>
              <View style={styles.fareInputContainer}>
                <Text style={styles.currencyText}>NGN</Text>
                <TextInput
                  style={styles.fareInput}
                  value={formData.fareOffer || '10000'}
                  onChangeText={text =>
                    setFormData({...formData, fareOffer: text})
                  }
                  keyboardType="numeric"
                  placeholder="10000"
                  placeholderTextColor="#C0C0C0"
                />
                <TouchableOpacity style={styles.dropdownButton}>
                  <Text style={styles.dropdownIcon}>⌄</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fareNoteContainer}>
              <Text style={styles.fareNoteIcon}>ⓘ</Text>
              <Text style={styles.fareNote}>
                Please note that the recommended minimum fare for this trip is
                NGN 10,000.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.fullWidthButton}
              onPress={loading ? null : handleSearchDriver}>
              {loading ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.fullWidthButtonText}>
                  SEARCH FOR DRIVER
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingTop: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 30,
  },
  tripDetailCard: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  truckSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: '#FAFAFA',
  },
  truckIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  truckIcon: {
    fontSize: 24,
    color: '#007AFF',
  },
  truckDetails: {
    flex: 1,
  },
  truckName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  truckSpec: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 1,
    lineHeight: 18,
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  imageText: {
    fontSize: 16,
    color: '#333333',
  },
  uploadIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  fareContainer: {
    marginBottom: 20,
  },
  fareInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  currencyText: {
    fontSize: 16,
    color: '#666666',
    paddingLeft: 16,
    paddingRight: 8,
  },
  fareInput: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 8,
    fontSize: 16,
    color: '#333333',
  },
  dropdownButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  fareNoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  fareNoteIcon: {
    fontSize: 16,
    color: '#FF6B35',
    marginRight: 8,
    marginTop: 1,
  },
  fareNote: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B35',
    lineHeight: 20,
  },
  fullWidthButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  fullWidthButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default TripDetailsScreen;
