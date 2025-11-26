import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase v9+ modular imports
import { initializeApp } from '@react-native-firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail, 
  deleteUser, 
  onAuthStateChanged,
  sendEmailVerification,
} from '@react-native-firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  writeBatch 
} from '@react-native-firebase/firestore';

// Initialize Firebase
const firebaseConfig = {
  // Your Firebase config here
  // apiKey: "YOUR_API_KEY",
  // authDomain: "YOUR_AUTH_DOMAIN",
  // projectId: "YOUR_PROJECT_ID",
  // storageBucket: "YOUR_STORAGE_BUCKET",
  // messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  // appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const AuthContext = createContext(null);

export { AuthContext }; // Explicitly export AuthContext

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Initialize state with proper default values
  const [state, setState] = useState({
    user: null,
    userType: null, // 'shipper' or 'driver'
    loading: true,
    initializing: true
  });
  
  const navigationRef = useRef(null);
  
  // Extract state for easier access
  const { user, userType, loading, initializing } = state;
  
  // State updater functions
  const setUser = (userData) => setState(prev => ({ ...prev, user: userData }));
  const setUserType = (type) => setState(prev => ({ ...prev, userType: type }));
  const setLoading = (isLoading) => setState(prev => ({ ...prev, loading: isLoading }));
  const setInitializing = (isInitializing) => setState(prev => ({ ...prev, initializing: isInitializing }));
  
  // Get user data from Firestore
  const getUserDataFromFirestore = async (uid) => {
    try {
      if (!uid) {
        console.error('No UID provided to getUserDataFromFirestore');
        return null;
      }
      
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      // Check if document exists (handle both function and boolean cases)
      const docExists = typeof userDoc.exists === 'function' 
        ? userDoc.exists() 
        : userDoc.exists;

      if (docExists) {
        const userData = userDoc.data();
        console.log('Retrieved user data:', { uid, userData });
        
        // Ensure userType is always set, default to 'shipper' if not specified
        return {
          ...userData,
          userType: userData.userType || 'shipper'
        };
      } else {
        console.error('User document does not exist for UID:', uid);
        return null;
      }
    } catch (error) {
      console.error('Error getting user data from Firestore:', error);
      return null;
    }
  };

  // Sign up function
  const signUp = async (email, password, userData) => {
    try {
      setLoading(true);
      console.log('Starting sign up process for:', email);

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;

      if (!user) {
        throw new Error('Failed to create user account');
      }

      // Create user document in Firestore
      const userDoc = {
        ...userData,
        email: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Ensure userType is set, default to 'shipper' if not provided
        userType: userData.userType || 'shipper'
      };

      await setDoc(doc(db, 'users', user.uid), userDoc);

      // Send email verification (best-effort, do not fail signup if this throws)
      try {
        if (!user.emailVerified) {
          await sendEmailVerification(user);
        }
      } catch (verificationError) {
        console.error('Error sending email verification:', verificationError);
      }

      // Update local state
      const updatedUser = {
        ...user,
        ...userDoc
      };

      setUser(updatedUser);
      setUserType(userDoc.userType);

      // Save to AsyncStorage
      await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
      await AsyncStorage.setItem('@userType', userDoc.userType);

      return {
        success: true,
        user: updatedUser,
        userType: userDoc.userType
      };
    } catch (error) {
      console.error('Sign up error:', error);
      // If user was created but Firestore failed, delete the user
      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (deleteError) {
          console.error('Error cleaning up user after failed signup:', deleteError);
        }
      }
      
      return {
        success: false,
        error: getAuthErrorMessage(error.code) || 'Failed to create account. Please try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      console.log('Starting sign in process for:', email);

      // Clear any existing auth state
      try {
        await AsyncStorage.multiRemove(['@user', '@userType']);
      } catch (storageError) {
        console.warn('Error clearing storage before sign in:', storageError);
      }
      
      // Clear any existing user state
      setUser(null);
      setUserType(null);

      console.log('Attempting to sign in with Firebase...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const { user } = userCredential;
      console.log('Firebase auth successful, user:', user ? user.uid : 'no user');

      if (!user) {
        throw new Error('No user returned from authentication');
      }

      // Get user data from Firestore
      console.log('Fetching user data from Firestore for UID:', user.uid);
      const userData = await getUserDataFromFirestore(user.uid);
      
      if (!userData) {
        console.error('No user data found in Firestore for UID:', user.uid);
        await firebaseSignOut(auth);
        throw new Error('User data not found. Please contact support.');
      }
      
      const userType = userData.userType || 'shipper';
      console.log('User type determined as:', userType);

      // Enforce email verification ONLY for drivers (case-insensitive)
      if (
        typeof userType === 'string' &&
        userType.toLowerCase() === 'driver' &&
        !user.emailVerified
      ) {
        console.log('Blocking sign in for unverified driver email:', user.email);
        try {
          await firebaseSignOut(auth);
        } catch (signOutError) {
          console.error('Error signing out unverified driver:', signOutError);
        }

        return {
          success: false,
          error:
            'Your email is not verified. Please check your inbox and verify your email before logging in.',
        };
      }

      // Create updated user object with profile data
      const updatedUser = {
        ...user,
        ...userData,
        displayName: userData.displayName || user.displayName || email.split('@')[0],
      };

      // Update local state
      console.log('Updating local state with user data');
      setUser(updatedUser);
      setUserType(userType);

      // Save to AsyncStorage
      try {
        console.log('Saving user data to AsyncStorage');
        await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
        await AsyncStorage.setItem('@userType', userType);
      } catch (storageError) {
        console.error('Error saving to AsyncStorage:', storageError);
        // Don't fail the login if storage fails
      }

      // Return success with user data - navigation will be handled by the auth state listener
      return {
        success: true,
        user: updatedUser,
        userType,
      };
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Clear any partial state on error
      setUser(null);
      setUserType(null);
      try {
        await AsyncStorage.multiRemove(['@user', '@userType']);
      } catch (storageError) {
        console.error('Error clearing storage on sign in error:', storageError);
      }
      
      return {
        success: false,
        error: error.message || 'Failed to sign in. Please try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function - properly call Firebase signOut and clear local state
  const signOut = async () => {
    try {
      // Sign out from Firebase first
      await firebaseSignOut(auth);
      console.log('Firebase sign out successful');
    } catch (error) {
      console.error('Firebase sign out error:', error);
      // Continue with local cleanup even if Firebase sign out fails
    }

    // Clear local state
    setUser(null);
    setUserType(null);

    // Clear storage (don't wait for it)
    AsyncStorage.multiRemove(['@user', '@userType'])
      .then(() => console.log('App data cleared'))
      .catch(err => console.log('Error clearing data:', err));

    // Navigate to login screen
    if (navigationRef.current) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }

    // Always return success - we don't care about errors
    return { success: true };
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      if (user) {
        // Update in Firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, userData, { merge: true });
        
        // Update local state
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        
        // Update AsyncStorage
        await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
        
        return { success: true };
      }
      return { success: false, error: 'No user is currently logged in' };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  };

  // Get user data from Firestore
  const getUserData = async () => {
    try {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          return { success: true, data: userDoc.data() };
        }
      }
      return { success: false, error: 'User not found' };
    } catch (error) {
      console.error('Get user data error:', error);
      return { success: false, error: error.message };
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      if (!email || !email.trim()) {
        throw new Error('Email is required');
      }

      // Use the modular API for sending password reset email
      await sendPasswordResetEmail(auth, email.trim());

      return {
        success: true,
        message: 'Password reset email sent successfully. Please check your inbox.',
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: getAuthErrorMessage(error.code) || 'Failed to send password reset email. Please try again.',
      };
    }
  };

  // Resend email verification for a user by signing in temporarily
  const resendVerificationEmail = async (email, password) => {
    try {
      if (!email || !email.trim() || !password) {
        return {
          success: false,
          error: 'Email and password are required to resend verification.',
        };
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const { user } = userCredential;

      if (!user) {
        throw new Error('No user returned from authentication');
      }

      if (user.emailVerified) {
        await firebaseSignOut(auth);
        return {
          success: false,
          error: 'Your email is already verified. You can log in normally.',
        };
      }

      await sendEmailVerification(user);

      try {
        await firebaseSignOut(auth);
      } catch (signOutError) {
        console.error('Error signing out after resendVerificationEmail:', signOutError);
      }

      return {
        success: true,
        message: 'Verification email resent. Please check your inbox.',
      };
    } catch (error) {
      console.error('Resend verification email error:', error);
      return {
        success: false,
        error:
          getAuthErrorMessage(error.code) ||
          'Failed to resend verification email. Please try again.',
      };
    }
  };

  // Helper function to get readable error messages
  const getAuthErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email address is already registered. Please use a different email or try signing in.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please contact support.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  // Set up auth state listener (simplified)
  useEffect(() => {
    let isMounted = true;
    
    const handleAuthStateChange = async (currentUser) => {
      try {
        if (!isMounted) return;
        
        if (currentUser) {
          // User is signed in
          console.log('Auth state: User is signed in');
          
          // Get user data from Firestore
          const userData = await getUserDataFromFirestore(currentUser.uid);
          
          if (!isMounted) return;
          
          if (userData) {
            const userType = userData.userType || 'shipper';
            console.log('User data retrieved, type:', userType);

            // If this is a driver with unverified email, treat as signed out
            if (
              typeof userType === 'string' &&
              userType.toLowerCase() === 'driver' &&
              !currentUser.emailVerified
            ) {
              console.log(
                'Auth state: unverified driver detected, signing out in listener',
              );
              try {
                await firebaseSignOut(auth);
              } catch (e) {
                console.error('Error signing out unverified driver in listener:', e);
              }
              // Do not set user state; leave them on auth screens
              return;
            }

            // Create updated user object with profile data
            const updatedUser = {
              ...currentUser,
              ...userData,
              displayName:
                userData.displayName ||
                currentUser.displayName ||
                currentUser.email?.split('@')[0],
            };

            // Update state
            setUser(updatedUser);
            setUserType(userType);
            
            // Save to AsyncStorage
            try {
              await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
              await AsyncStorage.setItem('@userType', userType);
            } catch (storageError) {
              console.error('Error saving to AsyncStorage:', storageError);
            }
          } else {
            // User document doesn't exist in Firestore yet. This can happen right after sign up
            // due to eventual consistency. We'll retry once after a short delay and then fall back
            // to AsyncStorage/currentUser without signing the user out.
            console.log('No user data found, retrying fetch...');
            await new Promise(res => setTimeout(res, 1200));
            const retryData = await getUserDataFromFirestore(currentUser.uid);

            if (!isMounted) return;

            if (retryData) {
              const userType = retryData.userType || 'shipper';
              const updatedUser = {
                ...currentUser,
                ...retryData,
                displayName: retryData.displayName || currentUser.displayName || currentUser.email?.split('@')[0],
              };
              setUser(updatedUser);
              setUserType(userType);
              try {
                await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
                await AsyncStorage.setItem('@userType', userType);
              } catch (storageError) {
                console.error('Error saving to AsyncStorage after retry:', storageError);
              }
            } else {
              console.log('No user data found after retry, keeping user signed in with fallback data.');
              try {
                const storedUserJSON = await AsyncStorage.getItem('@user');
                const storedUserType = await AsyncStorage.getItem('@userType');
                const storedUser = storedUserJSON ? JSON.parse(storedUserJSON) : null;

                const fallbackUser = storedUser || {
                  ...currentUser,
                  displayName: currentUser.displayName || currentUser.email?.split('@')[0],
                };
                const fallbackUserType = storedUserType || fallbackUser.userType || 'shipper';

                setUser(fallbackUser);
                setUserType(fallbackUserType);
              } catch (fallbackErr) {
                console.error('Error applying fallback user state:', fallbackErr);
                // As a last resort, at least set the basic currentUser
                setUser({
                  ...currentUser,
                  displayName: currentUser.displayName || currentUser.email?.split('@')[0],
                });
                setUserType('shipper');
              }
            }
          }
        } else {
          // User is signed out - we don't need to do anything here
          // as the signOut function already handles everything
          console.log('User signed out');
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };
    
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);
    
    // Cleanup function
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Set up navigation reference
  const setNavigation = (navRef) => {
    navigationRef.current = navRef;
  };

  // Create the context value object
  const contextValue = {
    user,
    userType,
    loading,
    initializing,
    signIn,
    signUp, // Use our custom signUp function
    signOut,
    resetPassword,
    resendVerificationEmail,
    updateProfile,
    getUserData,
    getAuthErrorMessage,
    setNavigation, // Add setNavigation to context
    setUser, // Add setUser to context
    setUserType // Add setUserType to context
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
