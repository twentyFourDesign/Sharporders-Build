import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import eye from '../assets/icons/eye.png';
import logo from '../assets/icons/logo.png';
import {useAppContext} from '../context/AppContext';
import {useAuth} from '../context/AuthContext';

const LoginScreen = ({navigation}) => {
  const {formData, setFormData} = useAppContext();
  const {signIn, resetPassword, resendVerificationEmail} = useAuth();

  const [submitting, setSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};

    // Email validation (changed from phone to email for Firebase)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [loginError, setLoginError] = useState('');

  const handleResendVerification = async () => {
    if (!email.trim() || !formData.password) {
      Alert.alert(
        'Email and password required',
        'Please enter your email and password first, then try resending the verification email.',
      );
      return;
    }

    try {
      setSubmitting(true);
      const result = await resendVerificationEmail(email, formData.password);

      if (result.success) {
        Alert.alert('Verification Email Sent', result.message);
      } else {
        Alert.alert('Unable to Resend', result.error || 'Please try again.');
      }
    } catch (error) {
      console.error('handleResendVerification error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while resending verification email.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoginError('');
      console.log('Attempting to log in...');
      setSubmitting(true);

      const result = await signIn(email, formData.password);
      console.log('Sign in result:', result);

      if (result && result.success) {
        console.log('Login successful, waiting for navigation...');
        // Navigation is handled by the auth state change in AppNavigator
      } else {
        const errorMessage = result?.error || 'Login failed. Please try again.';
        console.error('Login failed:', errorMessage);
        setLoginError(errorMessage);

        if (errorMessage.toLowerCase().includes('not verified')) {
          Alert.alert('Login Failed', errorMessage, [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Resend verification email',
              onPress: handleResendVerification,
            },
          ]);
        } else {
          Alert.alert('Login Failed', errorMessage);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';

      // Handle common Firebase auth errors
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage =
          'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage =
          'This account has been disabled. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error('Login error details:', {
        code: error.code,
        message: error.message,
        error: error,
      });

      setLoginError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = () => {
    navigation.navigate('RoleSelection');
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address first.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    Alert.alert(
      'Reset Password',
      'Are you sure you want to reset your password? We will send a reset link to your email.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Send Reset Link',
          onPress: async () => {
            const result = await resetPassword(email);
            if (result.success) {
              Alert.alert(
                'Reset Link Sent',
                'Please check your email for password reset instructions.',
              );
            } else {
              Alert.alert('Error', result.error);
            }
          },
        },
      ],
    );
  };

  const renderInputError = fieldName => {
    if (validationErrors[fieldName]) {
      return (
        <Text style={styles.errorText}>{validationErrors[fieldName]}</Text>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.loginLogoContainer}>
          <Image source={logo} style={styles.logoImage} />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.loginTitle}>Welcome back</Text>
          <Text style={styles.loginSubtitle}>
            Sign in to your account to continue shipping
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email address</Text>
            <TextInput
              style={[
                styles.input,
                validationErrors.email && styles.inputError,
              ]}
              placeholder="Enter your email"
              value={email}
              onChangeText={text => {
                setEmail(text);
                if (validationErrors.email) {
                  setValidationErrors({...validationErrors, email: null});
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#C0C0C0"
              editable={!submitting}
            />
            {renderInputError('email')}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View
              style={[
                styles.passwordContainer,
                validationErrors.password && styles.inputError,
              ]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={text => {
                  setFormData({...formData, password: text});
                  if (validationErrors.password) {
                    setValidationErrors({...validationErrors, password: null});
                  }
                }}
                secureTextEntry={!showPassword}
                placeholderTextColor="#C0C0C0"
                editable={!submitting}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                disabled={submitting}>
                <Image source={eye} style={styles.eyeIcon} />
              </TouchableOpacity>
            </View>
            {renderInputError('password')}
          </View>

          {loginError &&
            loginError
              .toLowerCase()
              .includes('not verified') && (
              <TouchableOpacity
                onPress={handleResendVerification}
                disabled={submitting}
                style={styles.resendLinkContainer}>
                <Text style={styles.resendLinkText}>
                  Resend verification email
                </Text>
              </TouchableOpacity>
            )}

          <View style={styles.loginLinks}>
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={submitting}>
              <Text style={styles.signUpText}>Forgot password?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignUp} disabled={submitting}>
              <Text style={styles.linkText}>
                Don't have an account?{' '}
                <Text style={styles.signUpText}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.fullWidthButton,
              submitting && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.fullWidthButtonText}>LOGIN</Text>
            )}
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  loginLogoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 0,
  },
  logoImage: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },
  formSection: {
    flex: 1,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 40,
    lineHeight: 20,
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
  inputError: {
    borderColor: '#FF3B30',
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
  loginLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  linkText: {
    color: '#000000',
    fontSize: 14,
  },
  signUpText: {
    fontWeight: '600',
    color: '#007AFF',
  },
  fullWidthButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  fullWidthButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666666',
    fontSize: 12,
    fontWeight: '500',
  },
  driverLoginButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  driverLoginText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default LoginScreen;
