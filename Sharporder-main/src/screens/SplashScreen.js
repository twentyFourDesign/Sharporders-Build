import React, { useEffect, useContext, useRef } from 'react';
import { View, StyleSheet, StatusBar, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PropTypes from 'prop-types';
import auth from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';

// Get the default firestore instance
const db = getFirestore();

const SplashScreen = ({ navigation }) => {
  const authContext = useContext(AuthContext);
  const [isLoading, setIsLoading] = React.useState(true);
  const [initialized, setInitialized] = React.useState(false);
  
  // Handle case when context is not yet available
  if (!authContext) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  const { setUser, setUserType, initializing } = authContext;
  
  // Use a ref to track if we've already initialized navigation
  const navigationInitialized = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const navigateToScreen = (routeName, params = {}) => {
    if (!navigation || !navigation.navigate) {
      console.warn('Navigation not available yet');
      return;
    }
    
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: routeName, params }],
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      if (navigationInitialized.current) return;
      
      // Check retry count to prevent infinite loops
      if (retryCount.current >= maxRetries) {
        console.error('Max retries reached, stopping navigation attempts');
        setIsLoading(false);
        return;
      }
      
      retryCount.current += 1;
      
      try {
        // Small delay to ensure navigation is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if user has seen onboarding
        const hasSeenOnboarding = await AsyncStorage.getItem('@hasSeenOnboarding').catch(() => 'false');
        
        // Check if user is authenticated using the auth instance
        const currentUser = auth().currentUser;
        
        if (!currentUser) {
          // No user is signed in
          if (hasSeenOnboarding === 'true') {
            // User has seen onboarding before, go to login
            navigateToScreen('Auth', { screen: 'Login' });
          } else {
            // First time user, show onboarding
            navigateToScreen('Onboarding');
          }
          navigationInitialized.current = true;
          return;
        }

        // User is authenticated, check their type using the firestore instance
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists) {
          // User document doesn't exist, sign out and show login
          await auth().signOut();
          navigateToScreen('Auth', { screen: 'Login' });
          navigationInitialized.current = true;
          return;
        }

        const userData = userDoc.data();
        
        if (!userData || !userData.userType) {
          // User data is incomplete, sign out and show login
          await auth().signOut();
          navigateToScreen('Auth', { screen: 'Login' });
          navigationInitialized.current = true;
          return;
        }

        // Update context with user data
        setUser(currentUser);
        setUserType(userData.userType);
        
        // Navigate to appropriate dashboard based on user type
        const routeName = userData.userType === 'shipper' ? 'ShipperApp' : 'DriverApp';
        const screenName = userData.userType === 'shipper' ? 'Dashboard' : 'DriverDashboard';
        navigateToScreen(routeName, { screen: screenName });
        navigationInitialized.current = true;
        
      } catch (error) {
        console.error('Error during auth check:', error);
        // On any error, go to onboarding (first-time users) or login
        try {
          const hasSeenOnboarding = await AsyncStorage.getItem('@hasSeenOnboarding').catch(() => 'false');
          const routeName = hasSeenOnboarding === 'true' ? 'Auth' : 'Onboarding';
          const params = hasSeenOnboarding === 'true' ? { screen: 'Login' } : undefined;
          
          if (navigation && navigation.navigate) {
            navigation.reset({
              index: 0,
              routes: [{ name: routeName, params }],
            });
            navigationInitialized.current = true;
          } else {
            // If navigation is not available, retry with exponential backoff
            console.warn(`Navigation not available, retrying... (attempt ${retryCount.current}/${maxRetries})`);
            if (retryCount.current < maxRetries) {
              setTimeout(checkAuthAndNavigate, 1000 * retryCount.current);
            } else {
              console.error('Max retries reached, navigation still not available');
              setIsLoading(false);
            }
          }
        } catch (nestedError) {
          console.error('Error in error handler:', nestedError);
          setIsLoading(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to show splash screen
    const timer = setTimeout(() => {
      checkAuthAndNavigate();
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigation, setUser, setUserType]);

  return (
    <View style={styles.splashContainer}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <View style={styles.logoContainer}>
        <Image source={require('../assets/splash.png')} style={styles.logoIcon} />
        {isLoading && (
          <ActivityIndicator 
            size="large" 
            color="#0000ff" 
            style={{ marginTop: 20 }} 
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    width: 250,
    height: 250,
    marginBottom: 20,
    resizeMode: 'contain',
  },
});

// Add prop types for better type checking
SplashScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    reset: PropTypes.func.isRequired,
  }),
};

SplashScreen.defaultProps = {
  navigation: {
    navigate: () => {},
    reset: () => {},
  },
};

export default SplashScreen;
