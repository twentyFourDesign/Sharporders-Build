import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useRef, useState} from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useAppContext} from '../../context/AppContext';
import {Formik, useFormikContext} from 'formik';
import * as Yup from 'yup';
import ImagePicker from 'react-native-image-crop-picker';
import {imageUploadService} from '../../services/firebase';

const validationSchema = Yup.object().shape({
  pickupAddress: Yup.string(),
  deliveryAddress: Yup.string().required('Delivery address is required'),
  truckType: Yup.string().required('Please select a truck type'),
  loadDescription: Yup.string().required('Load description is required'),
  recipientName: Yup.string().required("Recipient's name is required"),
  recipientNumber: Yup.string()
    .matches(/^\+?\d{10,15}$/, 'Enter a valid phone number')
    .required("Recipient's number is required"),
});

// ✅ Truck Selector Modal that consumes Formik context
const TruckSelector = ({showTruckSelector, setShowTruckSelector}) => {
  const {values, setFieldValue} = useFormikContext();

  const handleSelect = truckType => {
    setFieldValue('truckType', truckType);
    setShowTruckSelector(false);
  };

  return (
    <Modal visible={showTruckSelector} transparent animationType="slide">
      <View style={styles.truckModalOverlay}>
        <TouchableOpacity
          style={styles.truckBackdrop}
          activeOpacity={1}
          onPress={() => setShowTruckSelector(false)}
        />
        <View style={styles.truckModal}>
          <View style={styles.dragHandle} />
          <Text style={styles.modalTitle}>Select your truck</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.truckScrollContent}>
            {[
              {
                name: 'Dump Truck 8 tires',
                specs: [
                  'Capacity: 20-25 tons',
                  'Tyres: 8',
                ],
              },
              {
                name: 'Dump Truck 10 tires',
                specs: [
                  'Capacity: 30-35 tons',
                  'Tyres: 10',
                ],
              },
              {
                name: 'Dump Truck 12 tires',
                specs: [
                  'Capacity: 35-40 tons',
                  'Tyres: 12',
                ],
              },
              {
                name: 'Dump Truck 16 tires',
                specs: [
                  'Capacity: 50-60 tons',
                  'Tyres: 16',
                ],
              },
            ].map(truck => (
              <TouchableOpacity
                key={truck.name}
                style={[
                  styles.truckOption,
                  values.truckType === truck.name && styles.selectedTruckOption,
                ]}
                onPress={() => handleSelect(truck.name)}>
                <View style={styles.truckIconContainer}>
                  <Text style={styles.truckIcon}>🚛</Text>
                </View>
                <View style={styles.truckDetails}>
                  <Text style={styles.truckName}>{truck.name}</Text>
                  {truck.specs.map((s, i) => (
                    <Text key={i} style={styles.truckSpec}>
                      {s}
                    </Text>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const DeliveryDetailsScreen = ({
  visible,
  onClose = () => {},
  onContinue = () => {},
}) => {
  const {showTruckSelector, setShowTruckSelector} = useAppContext();
  const navigation = useNavigation();
  const [isReceiving, setIsReceiving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [deliveryQuery, setDeliveryQuery] = useState('');
  const [deliverySuggestions, setDeliverySuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDeliverySuggestions, setShowDeliverySuggestions] = useState(false);
  const deliverySearchTimeoutRef = useRef(null);

  const fetchDeliverySuggestions = async query => {
    if (!query || query.trim().length < 3) {
      setDeliverySuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    try {
      setLoadingSuggestions(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query,
        )}&format=json&limit=5`,
        {
          headers: {
            'User-Agent': 'Sharporder/1.0 umerjaved3333@gmail.com',
            Accept: 'application/json',
          },
        },
      );

      const text = await response.text();
      const results = JSON.parse(text);

      setDeliverySuggestions(
        Array.isArray(results)
          ? results.map(item => ({
              id: `${item.place_id}`,
              label: item.display_name,
            }))
          : [],
      );
    } catch (error) {
      console.error('Delivery address suggestions error:', error);
      setDeliverySuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (deliverySearchTimeoutRef.current) {
      clearTimeout(deliverySearchTimeoutRef.current);
    }

    if (!deliveryQuery || deliveryQuery.trim().length < 3) {
      setDeliverySuggestions([]);
      return;
    }

    deliverySearchTimeoutRef.current = setTimeout(() => {
      fetchDeliverySuggestions(deliveryQuery.trim());
    }, 500);

    return () => {
      if (deliverySearchTimeoutRef.current) {
        clearTimeout(deliverySearchTimeoutRef.current);
      }
    };
  }, [deliveryQuery]);

  const handleContinue = values => {
    onClose();
    if (typeof onContinue === 'function') {
      onContinue(values);
      return;
    }
    navigation.navigate('TripDetails');
  };

  const handleClose = () => {
    onClose();
    navigation.navigate('Dashboard');
  };

  return (
    <>
      {/* Main Delivery Details Modal */}
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleClose}
          />
          <View style={styles.modalContainer}>
            <View style={styles.dragHandle} />

            <Formik
              initialValues={{
                pickupAddress: '',
                deliveryAddress: '',
                truckType: '',
                loadDescription: '',
                loadImageUrl: '',
                recipientName: '',
                recipientNumber: '',
              }}
              validationSchema={validationSchema}
              onSubmit={handleContinue}>
              {({handleChange, handleSubmit, setFieldValue, values, errors, touched}) => (
                <>
                  <ScrollView
                    style={styles.formContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled">
                    <Text style={styles.pageTitle}>Delivery details</Text>

                    {/* Pickup Address */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Pickup address</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter here"
                        value={values.pickupAddress}
                        onChangeText={handleChange('pickupAddress')}
                        placeholderTextColor="#C0C0C0"
                      />
                      {touched.pickupAddress && errors.pickupAddress && (
                        <Text style={{color: 'red'}}>
                          {errors.pickupAddress}
                        </Text>
                      )}
                    </View>

                    {/* Delivery Address */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Delivery address</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter here"
                        value={values.deliveryAddress}
                        onChangeText={text => {
                          handleChange('deliveryAddress')(text);
                          setDeliveryQuery(text);
                          setShowDeliverySuggestions(true);
                        }}
                        placeholderTextColor="#C0C0C0"
                      />
                      {touched.deliveryAddress && errors.deliveryAddress && (
                        <Text style={{color: 'red'}}>
                          {errors.deliveryAddress}
                        </Text>
                      )}

                      {showDeliverySuggestions &&
                        (deliverySuggestions.length > 0 || loadingSuggestions) && (
                          <View style={styles.suggestionsContainer}>
                            {loadingSuggestions && (
                              <View style={styles.suggestionItem}>
                                <Text style={styles.suggestionText}>
                                  Searching addresses...
                                </Text>
                              </View>
                            )}
                            {deliverySuggestions.map(item => (
                              <TouchableOpacity
                                key={item.id}
                                style={styles.suggestionItem}
                                activeOpacity={0.7}
                                onPress={() => {
                                  setShowDeliverySuggestions(false);
                                  setDeliveryQuery(item.label);
                                  setFieldValue('deliveryAddress', item.label);
                                }}>
                                <Text style={styles.suggestionText}>{item.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                    </View>

                    {/* Truck Type */}
                    <TouchableOpacity
                      style={styles.inputContainer}
                      onPress={() => setShowTruckSelector(true)}>
                      <Text style={styles.inputLabel}>Truck type</Text>
                      <View style={styles.selectInput}>
                        <Text
                          style={[
                            styles.selectText,
                            values.truckType && styles.selectedText,
                          ]}>
                          {values.truckType || 'Select here'}
                        </Text>
                        <Text style={styles.selectArrow}>⌄</Text>
                      </View>
                      {touched.truckType && errors.truckType && (
                        <Text style={{color: 'red'}}>{errors.truckType}</Text>
                      )}
                    </TouchableOpacity>

                    {/* Load Description */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Load description</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter here"
                        value={values.loadDescription}
                        onChangeText={handleChange('loadDescription')}
                        placeholderTextColor="#C0C0C0"
                      />
                      {touched.loadDescription && errors.loadDescription && (
                        <Text style={{color: 'red'}}>
                          {errors.loadDescription}
                        </Text>
                      )}
                    </View>

                    {/* Load Image */}
                    <TouchableOpacity
                      style={styles.inputContainer}
                      onPress={async () => {
                        try {
                          setIsUploadingImage(true);
                          const image = await ImagePicker.openPicker({
                            width: 800,
                            height: 800,
                            cropping: true,
                            mediaType: 'photo',
                          });

                          if (!image?.path) {
                            setIsUploadingImage(false);
                            return;
                          }

                          const downloadUrl = await imageUploadService.uploadImage(
                            image.path,
                            'load-images',
                          );

                          setFieldValue('loadImageUrl', downloadUrl);
                        } catch (error) {
                          console.error('Load image pick/upload error:', error);
                        } finally {
                          setIsUploadingImage(false);
                        }
                      }}>
                      <Text style={styles.inputLabel}>
                        Load image (optional)
                      </Text>
                      <View style={styles.uploadContainer}>
                        <Text style={styles.uploadText}>
                          {isUploadingImage
                            ? 'Uploading...'
                            : values.loadImageUrl
                            ? 'Image selected'
                            : 'Upload here'}
                        </Text>
                        <Text style={styles.uploadIcon}>↗</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Recipient Name */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Recipient's name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter here"
                        value={values.recipientName}
                        onChangeText={handleChange('recipientName')}
                        placeholderTextColor="#C0C0C0"
                      />
                      {touched.recipientName && errors.recipientName && (
                        <Text style={{color: 'red'}}>
                          {errors.recipientName}
                        </Text>
                      )}
                    </View>

                    {/* Recipient Number */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Recipient's number</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="+234 08012345678"
                        value={values.recipientNumber}
                        onChangeText={handleChange('recipientNumber')}
                        keyboardType="phone-pad"
                        placeholderTextColor="#C0C0C0"
                      />
                      {touched.recipientNumber && errors.recipientNumber && (
                        <Text style={{color: 'red'}}>
                          {errors.recipientNumber}
                        </Text>
                      )}
                    </View>

                    {/* Toggle */}
                    <View style={styles.toggleContainer}>
                      <Text style={styles.toggleText}>I'm receiving it</Text>
                      <TouchableOpacity
                        style={[
                          styles.toggle,
                          isReceiving && styles.toggleActive,
                        ]}
                        onPress={() => setIsReceiving(!isReceiving)}>
                        <View
                          style={[
                            styles.toggleThumb,
                            isReceiving && styles.toggleThumbActive,
                          ]}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                      style={styles.fullWidthButton}
                      onPress={handleSubmit}>
                      <Text style={styles.fullWidthButtonText}>CONTINUE</Text>
                    </TouchableOpacity>
                  </ScrollView>

                  {/* Truck Selector Modal lives inside Formik ✅ */}
                  <TruckSelector
                    showTruckSelector={showTruckSelector}
                    setShowTruckSelector={setShowTruckSelector}
                    styles={styles}
                  />
                </>
              )}
            </Formik>
          </View>
        </View>
      </Modal>
    </>
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
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#333333',
  },
  selectInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 16,
    color: '#C0C0C0',
  },
  selectedText: {
    color: '#333333',
  },
  selectArrow: {
    fontSize: 16,
    color: '#007AFF',
  },
  uploadContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 16,
    color: '#C0C0C0',
  },
  uploadIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  toggleText: {
    fontSize: 16,
    color: '#333333',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  fullWidthButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  fullWidthButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  truckModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  truckBackdrop: {
    flex: 1,
  },
  truckModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
    height: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 20,
  },
  truckScrollContent: {
    paddingBottom: 30,
  },
  truckOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedTruckOption: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
    borderWidth: 2,
  },
  truckIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
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
});

export default DeliveryDetailsScreen;
