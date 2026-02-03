import React, {useEffect} from 'react';
import {LogBox, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryClient, QueryClientProvider} from 'react-query';
import {AppProvider} from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import {AuthProvider} from './src/context/AuthContext';
import SplashScreen from 'react-native-splash-screen';
import auth from '@react-native-firebase/auth';
import notificationService from './src/services/firebase/notificationService';

export default function App() {
  LogBox.ignoreAllLogs(true);
  const queryClient = new QueryClient();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (!auth().currentUser) {
          await auth().signInAnonymously();
          console.log('User signed in anonymously on app start');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    // Initialize notifications when user is authenticated
    const unsubscribeAuth = auth().onAuthStateChanged(user => {
      if (user) {
        notificationService.initialize();
      }
    });

    return () => {
      unsubscribeAuth();
      notificationService.cleanup();
    };
  }, []);

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppProvider>
            <SafeAreaProvider>
              <AppNavigator />
            </SafeAreaProvider>
          </AppProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
