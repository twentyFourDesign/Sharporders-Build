import React, {useState} from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useAppContext} from '../../context/AppContext';
import back from '../../assets/icons/back.png';
import eye from '../../assets/icons/eye.png';
import ImagePicker from 'react-native-image-crop-picker';
import {imageUploadService} from '../../services/firebase';
import DateTimePickerCom from '../../components/DateTimePickerCom';

const SignUpScreen = ({navigation}) => {
  const {formData, setFormData, showOTPModal, setShowOTPModal} =
    useAppContext();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSignUp = async () => {
    if (
      !formData.email ||
      !formData.password ||
      !formData.businessName ||
      !formData.phone
    ) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Create user with email and password
      const userCredential = await auth().createUserWithEmailAndPassword(
        formData.email.trim(),
        formData.password,
      );

      const {uid, email} = userCredential.user;

      // Add user data to Firestore
      await firestore().collection('users').doc(uid).set({
        uid: uid,
        businessName: formData.businessName.trim(),
        dateOfBirth: formData.dateOfBirth || null,
        email: email,
        phone: formData.phone.trim(),
        logoUrl: formData.logoUrl || null,
        userType: 'shipper',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Send email verification (best-effort)
      try {
        const currentUser = auth().currentUser;
        if (currentUser && !currentUser.emailVerified) {
          await currentUser.sendEmailVerification();
        }
      } catch (verificationError) {
        console.error('Error sending email verification:', verificationError);
      }

      // Show success message and navigate to root
      Alert.alert(
        'Verify your email',
        'Account created successfully. We have sent a verification link to your email. Please verify your email address before using the app.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{name: 'ShipperApp'}],
              });
            },
          },
        ],
      );
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'An error occurred during sign up. Please try again.';

      try {
        // Safely access error properties
        const errorCode = error?.code;
        const errorMsg = error?.message || String(error);

        console.log('Error details:', {errorCode, errorMsg});

        // Handle common Firebase auth errors
        if (errorCode === 'auth/email-already-in-use') {
          errorMessage = 'An account with this email already exists.';
        } else if (errorCode === 'auth/invalid-email') {
          errorMessage = 'The email address is not valid.';
        } else if (errorCode === 'auth/weak-password') {
          errorMessage =
            'The password is too weak. Please choose a stronger password (minimum 6 characters).';
        } else if (errorCode === 'auth/operation-not-allowed') {
          errorMessage = 'Email/password accounts are not enabled.';
        } else if (errorMsg) {
          errorMessage =
            typeof errorMsg === 'string'
              ? errorMsg
              : 'An unknown error occurred.';
        }
      } catch (nestedError) {
        console.error('Error processing error message:', nestedError);
        errorMessage = 'An unexpected error occurred. Please try again later.';
      }

      // Show error message to user
      if (typeof Alert.alert === 'function') {
        Alert.alert('Sign Up Failed', errorMessage);
      } else {
        console.error('Alert.alert is not available. Error:', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = () => {
    navigation.navigate('Dashboard');
  };

  const handleOTPNumber = number => {
    const currentIndex = otpValues.findIndex(val => val === '');
    if (currentIndex !== -1 && currentIndex < 5) {
      const newOtpValues = [...otpValues];
      newOtpValues[currentIndex] = number.toString();
      setOtpValues(newOtpValues);

      // Auto complete when all 5 digits are entered
      if (currentIndex === 4) {
        setTimeout(() => {
          setShowOTPModal(false);
          handleOTPComplete();
        }, 500);
      }
    }
  };

  const handleOTPDelete = () => {
    const lastFilledIndex = otpValues
      .map((val, index) => (val !== '' ? index : -1))
      .filter(index => index !== -1)
      .pop();
    if (lastFilledIndex !== undefined) {
      const newOtpValues = [...otpValues];
      newOtpValues[lastFilledIndex] = '';
      setOtpValues(newOtpValues);
    }
  };

  const closeOTPModal = () => {
    setShowOTPModal(false);
    setOtpValues(['', '', '', '', '']);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <ScrollView
        style={styles.formContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Image source={back} style={styles.backArrow} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Create your account</Text>
            <Text style={styles.headerSubtitle}>
              Please provide accurate details to proceed
            </Text>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Business logo (optional)</Text>
          <TouchableOpacity
            style={styles.uploadContainer}
            onPress={async () => {
              try {
                setIsUploadingLogo(true);
                const image = await ImagePicker.openPicker({
                  width: 800,
                  height: 800,
                  cropping: true,
                  mediaType: 'photo',
                });

                if (!image?.path) {
                  setIsUploadingLogo(false);
                  return;
                }

                const downloadUrl = await imageUploadService.uploadImage(
                  image.path,
                  'shipper-logos',
                );

                setFormData({...formData, logoUrl: downloadUrl});
              } catch (error) {
                console.error('Business logo upload error:', error);
                if (typeof Alert.alert === 'function') {
                  Alert.alert(
                    'Upload failed',
                    'Could not upload business logo. Please try again.',
                  );
                }
              } finally {
                setIsUploadingLogo(false);
              }
            }}>
            <Text style={styles.uploadText}>
              {isUploadingLogo
                ? 'Uploading...'
                : formData.logoUrl
                ? 'Logo selected'
                : 'Upload here'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Business name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            value={formData.businessName}
            onChangeText={text =>
              setFormData({...formData, businessName: text})
            }
            placeholderTextColor="#C0C0C0"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Date of birth</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}>
            <Text
              style={{
                fontSize: 16,
                color: formData.dateOfBirth ? '#333333' : '#C0C0C0',
              }}>
              {formData.dateOfBirth || 'YYYY-MM-DD'}
            </Text>
          </TouchableOpacity>

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
              setFormData({...formData, dateOfBirth: formatted});
            }}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            value={formData.email}
            onChangeText={text => setFormData({...formData, email: text})}
            keyboardType="email-address"
            placeholderTextColor="#C0C0C0"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="+234 08012345678"
            value={formData.phone}
            onChangeText={text => setFormData({...formData, phone: text})}
            keyboardType="phone-pad"
            placeholderTextColor="#C0C0C0"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter here"
              value={formData.password}
              onChangeText={text => setFormData({...formData, password: text})}
              secureTextEntry={!showPassword}
              placeholderTextColor="#C0C0C0"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}>
              <Image source={eye} style={styles.eyeIcon} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirm password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter here"
              value={formData.confirmPassword}
              onChangeText={text =>
                setFormData({...formData, confirmPassword: text})
              }
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor="#C0C0C0"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}>
              <Image source={eye} style={styles.eyeIcon} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setIsChecked(!isChecked)}>
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
            {isChecked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxText}>
            I agree to the{' '}
            <Text style={styles.linkText}>Terms and Conditions</Text> and{' '}
            <Text style={styles.linkText}>Privacy policy</Text> of this platform
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fullWidthButton}
          onPress={handleSignUp}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.fullWidthButtonText}>CREATE ACCOUNT</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* OTP Modal */}

      <Modal visible={showOTPModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeOTPModal}>
          <TouchableOpacity
            style={styles.otpModal}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}>
            <View style={styles.dragHandle} />

            <Text style={styles.otpTitle}>OTP verification</Text>
            <Text style={styles.otpDescription}>
              Enter the 5 digit code sent to your registered phone number below
              to verify your account.
            </Text>

            <View style={styles.otpInputContainer}>
              {otpValues.map((value, index) => (
                <View key={index} style={styles.otpInput}>
                  {value !== '' && (
                    <Text style={styles.otpInputText}>{value}</Text>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.keypadContainer}>
              {/* Row 1: 1, 2, 3 */}
              <View style={styles.keypadRow}>
                {[1, 2, 3].map(number => (
                  <TouchableOpacity
                    key={number}
                    style={styles.keypadButton}
                    onPress={() => handleOTPNumber(number)}>
                    <Text style={styles.keypadButtonText}>{number}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Row 2: 4, 5, 6 */}
              <View style={styles.keypadRow}>
                {[4, 5, 6].map(number => (
                  <TouchableOpacity
                    key={number}
                    style={styles.keypadButton}
                    onPress={() => handleOTPNumber(number)}>
                    <Text style={styles.keypadButtonText}>{number}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Row 3: 7, 8, 9 */}
              <View style={styles.keypadRow}>
                {[7, 8, 9].map(number => (
                  <TouchableOpacity
                    key={number}
                    style={styles.keypadButton}
                    onPress={() => handleOTPNumber(number)}>
                    <Text style={styles.keypadButtonText}>{number}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Row 4: 0, DELETE */}
              <View style={styles.keypadRow}>
                <View style={styles.emptyKeypadSpace} />
                <TouchableOpacity
                  style={styles.keypadButton}
                  onPress={() => handleOTPNumber(0)}>
                  <Text style={styles.keypadButtonText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleOTPDelete}>
                  <Text style={styles.deleteButtonText}>DELETE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
    marginTop: 10,
    marginBottom: 40,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  backArrow: {
    width: 20,
    height: 20,
    tintColor: '#007AFF',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333333',
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  eyeIcon: {
    width: 30,
    height: 20,
    tintColor: '#007AFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 40,
    marginTop: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 3,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  linkText: {
    color: '#007AFF',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  otpModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 30,
    paddingBottom: 50,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    marginBottom: 20,
  },
  otpTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  otpDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  otpInputContainer: {
    flexDirection: 'row',
    marginBottom: 40,
    gap: 15,
  },
  otpInput: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInputText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
  },
  keypadContainer: {
    alignItems: 'center',
    gap: 15,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  emptyKeypadSpace: {
    width: 70,
    height: 70,
  },
  keypadButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
  },
  deleteButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
});

export default SignUpScreen;
