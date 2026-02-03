import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import {useAuth} from '../../context/AuthContext';
import back from '../../assets/icons/back.png';
import eye from '../../assets/icons/eye.png';
import upload from '../../assets/icons/upload.png';
import calender from '../../assets/icons/calender.png';
import camera from '../../assets/icons/camera.png';
import {firebase} from '@react-native-firebase/auth';
import ImagePicker from 'react-native-image-crop-picker';
import {imageUploadService} from '../../services/firebase';
import DateTimePickerCom from '../../components/DateTimePickerCom';

const DriverSignupScreen = ({navigation}) => {
  const {signUp} = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [isUploadingLicenseImage, setIsUploadingLicenseImage] = useState(false);
  const [isUploadingTruckPhoto, setIsUploadingTruckPhoto] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    email: '',
    truckType: '',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
    profilePhotoUrl: '',
    licenseImageUrl: '',
    truckPhotoUrl: '',
  });

  const [truckTypes, setTruckTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    firebase
      .firestore()
      .collection('trucks')
      .get()
      .then(querySnapshot => {
        const types = [];
        querySnapshot.forEach(doc => {
          types.push(doc.data());
        });
        setTruckTypes(types);
      })
      .catch(error => {
        console.error('Error fetching truck types: ', error);
      });
  }, []);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleNext = () => {
    if (validatePersonalDetails()) {
      setCurrentStep(2);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const validatePersonalDetails = () => {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.dateOfBirth.trim()) {
      errors.dateOfBirth = 'Date of birth is required';
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (formData.phoneNumber.length < 10) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.truckType.trim()) {
      errors.truckType = 'Please select a truck type';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateForm = () => {
    const errors = {};

    // Validate personal details
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.dateOfBirth.trim()) {
      errors.dateOfBirth = 'Date of birth is required';
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (formData.phoneNumber.length < 10) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.truckType.trim()) {
      errors.truckType = 'Please select a truck type';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Validate license number
    if (!formData.licenseNumber.trim()) {
      errors.licenseNumber = 'License number is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      // Create user data object
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        dateOfBirth: formData.dateOfBirth,
        truckType: formData.truckType,
        licenseNumber: formData.licenseNumber.trim(),
        profilePhotoUrl: formData.profilePhotoUrl || null,
        licenseImageUrl: formData.licenseImageUrl || null,
        truckPhotoUrl: formData.truckPhotoUrl || null,
        userType: 'driver',
        displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      };

      // Use AuthContext's signUp function (this also sends email verification)
      const result = await signUp(
        formData.email.trim(),
        formData.password,
        userData,
      );

      if (result.success) {
        Alert.alert(
          'Verify your email',
          'Account created successfully. We have sent a verification link to your email. Please verify your email address before logging in as a driver.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{name: 'Login'}],
                });
              },
            },
          ],
        );
      } else {
        Alert.alert(
          'Registration Failed',
          result.error ||
            'An error occurred during registration. Please try again.',
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Failed',
        'An error occurred during registration. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const showTruckTypePicker = () => {
    setShowModal(true);
    // Alert.alert(
    //   'Select Truck Type',
    //   'Choose your truck type:',
    //   [
    //     ...truckTypes.map(type => ({
    //       text: type,
    //       onPress: () => handleInputChange('truckType', type)
    //     })),
    //     { text: 'Cancel', style: 'cancel' }
    //   ]
    // );
  };

  const renderInputError = fieldName => {
    if (validationErrors[fieldName]) {
      return (
        <Text style={styles.errorText}>{validationErrors[fieldName]}</Text>
      );
    }
    return null;
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View
        style={[styles.progressBar, {width: `${(currentStep / 2) * 100}%`}]}
      />
    </View>
  );

  const renderPersonalDetails = () => (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Image source={back} style={styles.backIcon} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Personal details</Text>
          <Text style={styles.headerSubtitle}>
            Please provide accurate information.
          </Text>
        </View>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>First name</Text>
          <TextInput
            style={[
              styles.textInput,
              validationErrors.firstName && styles.inputError,
            ]}
            placeholder="First name"
            placeholderTextColor="#C7C7CD"
            value={formData.firstName}
            onChangeText={value => handleInputChange('firstName', value)}
            editable={!submitting}
          />
          {renderInputError('firstName')}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Last name</Text>
          <TextInput
            style={[
              styles.textInput,
              validationErrors.lastName && styles.inputError,
            ]}
            placeholder="Last name"
            placeholderTextColor="#C7C7CD"
            value={formData.lastName}
            onChangeText={value => handleInputChange('lastName', value)}
            editable={!submitting}
          />
          {renderInputError('lastName')}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date of birth</Text>
          <View style={styles.inputWithIcon}>
            <TouchableOpacity
              style={[
                styles.textInput,
                styles.textInputWithIcon,
                validationErrors.dateOfBirth && styles.inputError,
              ]}
              onPress={() => setShowDatePicker(true)}
              disabled={submitting}>
              <Text
                style={{
                  fontSize: 17,
                  color: formData.dateOfBirth ? '#000000' : '#C7C7CD',
                }}>
                {formData.dateOfBirth || 'YYYY-MM-DD'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowDatePicker(true)}
              disabled={submitting}>
              <Image source={calender} style={styles.inputCalenderImage} />
            </TouchableOpacity>
          </View>
          {renderInputError('dateOfBirth')}

          <DateTimePickerCom
            show={showDatePicker}
            setShow={setShowDatePicker}
            initialDate={
              formData.dateOfBirth
                ? new Date(formData.dateOfBirth)
                : undefined
            }
            onDateChange={selectedDate => {
              const year = selectedDate.getFullYear();
              const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const day = String(selectedDate.getDate()).padStart(2, '0');
              const formatted = `${year}-${month}-${day}`;
              handleInputChange('dateOfBirth', formatted);
            }}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone number</Text>
          <View
            style={[
              styles.phoneInputContainer,
              validationErrors.phoneNumber && styles.inputError,
            ]}>
            <Text style={styles.countryCode}>+234</Text>
            <TextInput
              style={[styles.textInput, styles.phoneInput]}
              placeholder="08012345678"
              placeholderTextColor="#C7C7CD"
              value={formData.phoneNumber}
              onChangeText={value => handleInputChange('phoneNumber', value)}
              keyboardType="phone-pad"
              editable={!submitting}
            />
          </View>
          {renderInputError('phoneNumber')}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email address</Text>
          <TextInput
            style={[
              styles.textInput,
              validationErrors.email && styles.inputError,
            ]}
            placeholder="Email address"
            placeholderTextColor="#C7C7CD"
            value={formData.email}
            onChangeText={value => handleInputChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!submitting}
          />
          {renderInputError('email')}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Truck type</Text>
          <TouchableOpacity
            style={[
              styles.dropdown,
              validationErrors.truckType && styles.inputError,
            ]}
            onPress={showTruckTypePicker}
            disabled={submitting}>
            <Text
              style={[
                styles.dropdownText,
                !formData.truckType && styles.placeholderText,
              ]}>
              {formData.truckType || 'Select here'}
            </Text>
            <Text style={styles.dropdownIcon}>⌄</Text>
          </TouchableOpacity>
          {renderInputError('truckType')}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Create password</Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              style={[
                styles.textInput,
                styles.textInputWithIcon,
                validationErrors.password && styles.inputError,
              ]}
              placeholder="Enter here"
              placeholderTextColor="#C7C7CD"
              value={formData.password}
              onChangeText={value => handleInputChange('password', value)}
              secureTextEntry={!showPassword}
              editable={!submitting}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.iconButton}
              disabled={submitting}>
              <Image source={eye} style={styles.inputIconImage} />
            </TouchableOpacity>
          </View>
          {renderInputError('password')}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm password</Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              style={[
                styles.textInput,
                styles.textInputWithIcon,
                validationErrors.confirmPassword && styles.inputError,
              ]}
              placeholder="Enter here"
              placeholderTextColor="#C7C7CD"
              value={formData.confirmPassword}
              onChangeText={value =>
                handleInputChange('confirmPassword', value)
              }
              secureTextEntry={!showConfirmPassword}
              editable={!submitting}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.iconButton}
              disabled={submitting}>
              <Image source={eye} style={styles.inputIconImage} />
            </TouchableOpacity>
          </View>
          {renderInputError('confirmPassword')}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.nextButton, submitting && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={submitting}>
        <Text style={styles.nextButtonText}>NEXT</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPhotoVerification = () => (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Image source={back} style={styles.backIcon} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Photo verification</Text>
          <Text style={styles.headerSubtitle}>
            Take a clear photo of your face for verification. No hats,
            sunglasses, or filters.
          </Text>
        </View>
      </View>

      <View style={styles.photoContainer}>
        <TouchableOpacity
          style={styles.photoPlaceholder}
          disabled={submitting}
          onPress={async () => {
            try {
              setIsUploadingProfilePhoto(true);
              const image = await ImagePicker.openCamera({
                width: 800,
                height: 800,
                cropping: true,
                mediaType: 'photo',
              });

              if (!image?.path) {
                setIsUploadingProfilePhoto(false);
                return;
              }

              const downloadUrl = await imageUploadService.uploadImage(
                image.path,
                'driver-profile-photos',
              );

              setFormData(prev => ({
                ...prev,
                profilePhotoUrl: downloadUrl,
              }));
            } catch (error) {
              console.error('Profile photo upload error:', error);
            } finally {
              setIsUploadingProfilePhoto(false);
            }
          }}>
          <Image source={camera} style={styles.cameraIcon} />
        </TouchableOpacity>
      </View>

      <View style={styles.separatorLine} />

      <View style={styles.documentSection}>
        <Text style={styles.sectionTitle}>Document upload</Text>
        <Text style={styles.sectionSubtitle}>
          Upload your documents for verification.
        </Text>

        <View style={styles.documentInputGroup}>
          <Text style={styles.inputLabel}>Driver's licence</Text>
          <TouchableOpacity
            style={styles.uploadField}
            disabled={submitting}
            onPress={async () => {
              try {
                setIsUploadingLicenseImage(true);
                const image = await ImagePicker.openPicker({
                  width: 1200,
                  height: 800,
                  cropping: true,
                  mediaType: 'photo',
                });

                if (!image?.path) {
                  setIsUploadingLicenseImage(false);
                  return;
                }

                const downloadUrl = await imageUploadService.uploadImage(
                  image.path,
                  'driver-licences',
                );

                setFormData(prev => ({
                  ...prev,
                  licenseImageUrl: downloadUrl,
                }));
              } catch (error) {
                console.error("Driver's licence upload error:", error);
              } finally {
                setIsUploadingLicenseImage(false);
              }
            }}>
            <Text style={styles.uploadText}>
              {isUploadingLicenseImage
                ? 'Uploading...'
                : formData.licenseImageUrl
                ? 'Image selected'
                : 'Upload here'}
            </Text>
            <Image source={upload} style={styles.uploadIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.documentInputGroup}>
          <Text style={styles.inputLabel}>Licence number</Text>
          <TextInput
            style={styles.textInput}
            placeholder="L/No AKW06968AA2"
            placeholderTextColor="#C7C7CD"
            value={formData.licenseNumber}
            onChangeText={value => handleInputChange('licenseNumber', value)}
            editable={!submitting}
          />
        </View>

        <View style={styles.documentInputGroup}>
          <Text style={styles.inputLabel}>Photo of truck</Text>
          <TouchableOpacity
            style={styles.uploadField}
            disabled={submitting}
            onPress={async () => {
              try {
                setIsUploadingTruckPhoto(true);
                const image = await ImagePicker.openPicker({
                  width: 1200,
                  height: 800,
                  cropping: true,
                  mediaType: 'photo',
                });

                if (!image?.path) {
                  setIsUploadingTruckPhoto(false);
                  return;
                }

                const downloadUrl = await imageUploadService.uploadImage(
                  image.path,
                  'driver-truck-photos',
                );

                setFormData(prev => ({
                  ...prev,
                  truckPhotoUrl: downloadUrl,
                }));
              } catch (error) {
                console.error('Truck photo upload error:', error);
              } finally {
                setIsUploadingTruckPhoto(false);
              }
            }}>
            <Text style={styles.uploadText}>
              {isUploadingTruckPhoto
                ? 'Uploading...'
                : formData.truckPhotoUrl
                ? 'Image selected'
                : 'Upload here'}
            </Text>
            <Image source={upload} style={styles.uploadIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.nextButton, submitting && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.nextButtonText}>CREATE ACCOUNT</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderVerificationModal = () => (
    <Modal
      visible={showVerificationModal}
      transparent={true}
      animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Account Created Successfully!</Text>
          <Text style={styles.modalText}>
            Your driver account has been created. Our team will review your
            documents and reach out within 24-48 hours once verification is
            complete. You can track your verification status in your dashboard.
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowVerificationModal(false);
              Alert.alert(
                'Account Created',
                'Welcome to our platform! Please check your verification status in the dashboard.',
                [
                  {
                    text: 'Go to Dashboard',
                    onPress: () => navigation.navigate('DriverDashboard'),
                  },
                ],
              );
            }}>
            <Text style={styles.closeButtonText}>CONTINUE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const formatTruckTypeLabel = type => {
    if (!type) {
      return '';
    }

    const name = type.name ?? 'Truck';
    const tyresValue = type.tyres ?? 'N/A';
    const capacityValue = type.capacity ?? 'N/A';

    return `${name} • No. of tyres: ${tyresValue} • Capacity: ${capacityValue}`;
  };

  const renderTruckModal = () => (
    <Modal visible={showModal} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select your Truck Type</Text>
          {truckTypes.map((type, index) => (
            <React.Fragment key={type?.id || index}>
              <TouchableOpacity
                style={styles.truckOption}
                onPress={() => {
                  handleInputChange('truckType', formatTruckTypeLabel(type));
                  setShowModal(false);
                }}>
                {type.imageUrl && (
                  <Image
                    source={{uri: type.imageUrl}}
                    style={{
                      height: 50,
                      width: '100',
                    }}
                  />
                )}
                <View>
                  <Text style={styles.truckName}>{type?.name ?? 'Truck'}</Text>
                  <Text style={styles.truckMeta}>{`No. of tyres: ${
                    type?.tyres ?? 'N/A'
                  }`}</Text>
                  <Text style={styles.truckMeta}>{`Capacity: ${
                    type?.capacity ?? 'N/A'
                  }`}</Text>
                </View>
              </TouchableOpacity>
              {index < truckTypes.length - 1 && (
                <View style={styles.truckDivider} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      {renderProgressBar()}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderPersonalDetails()}
        {currentStep === 2 && renderPhotoVerification()}
      </ScrollView>
      {renderVerificationModal()}
      {renderTruckModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 30,
    marginTop: 10,
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#007AFF',
  },
  scrollContainer: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
    marginTop: 5,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#007AFF',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 17,
    color: '#8E8E93',
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 17,
    color: '#000000',
    marginBottom: 8,
    fontWeight: '400',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textInputWithIcon: {
    paddingRight: 50,
  },
  inputWithIcon: {
    position: 'relative',
  },
  iconButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  inputIconImage: {
    width: 30,
    height: 20,
    tintColor: '#007AFF',
  },
  inputCalenderImage: {
    width: 24,
    height: 24,
    tintColor: '#007AFF',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  countryCode: {
    fontSize: 17,
    color: '#000000',
    paddingLeft: 16,
    paddingRight: 8,
    fontWeight: '400',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 0,
    margin: 0,
    paddingLeft: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  dropdownText: {
    fontSize: 17,
    color: '#000000',
  },
  placeholderText: {
    color: '#C7C7CD',
  },
  dropdownIcon: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E1F5FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    width: 200,
    height: 200,
    tintColor: '#007AFF',
  },
  separatorLine: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 20,
  },
  documentSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 17,
    color: '#8E8E93',
    marginBottom: 30,
  },
  documentInputGroup: {
    marginBottom: 24,
  },
  uploadField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  uploadText: {
    fontSize: 17,
    color: '#C7C7CD',
  },
  uploadIcon: {
    width: 20,
    height: 20,
    tintColor: '#007AFF',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 30,
    paddingTop: 16,
    paddingBottom: 30,
    alignItems: 'center',
    minHeight: 300,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  truckOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 25,
    width: '100%',
    paddingVertical: 12,
  },
  truckName: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  truckMeta: {
    marginTop: 4,
    fontSize: 14,
    color: '#8E8E93',
  },
  truckDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    width: '100%',
    marginVertical: 6,
  },
});

export default DriverSignupScreen;
