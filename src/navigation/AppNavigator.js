import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Import screens
import {
  SplashScreen,
  OnboardingScreen,
  LoginScreen,
  SignUpScreen,
  RoleSelectionScreen,
  DashboardScreen,
  DeliveryDetailsScreen,
  TripDetailsScreen,
  DriverSearchScreen,
  DriverFoundScreen,
  DeliveryCompleteScreen,
  LoadBoardScreen,
  MyShipmentsScreen,
  DriverSignupScreen,
  DriverDashboardScreen,
  DriverLoadBoardScreen,
  DriverOnTheWayScreen,
  DriverDeliveryCompleteScreen,
} from '../screens';

const Stack = createNativeStackNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="DriverSignup" component={DriverSignupScreen} />
  </Stack.Navigator>
);

// Shipper Stack
const ShipperStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
    <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
    <Stack.Screen name="DriverSearch" component={DriverSearchScreen} />
    <Stack.Screen name="DriverFound" component={DriverFoundScreen} />
    <Stack.Screen name="DeliveryComplete" component={DeliveryCompleteScreen} />
    <Stack.Screen name="LoadBoard" component={LoadBoardScreen} />
    <Stack.Screen name="MyShipments" component={MyShipmentsScreen} />
  </Stack.Navigator>
);

// Driver Stack
const DriverStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
    <Stack.Screen name="DriverLoadBoard" component={DriverLoadBoardScreen} />
    <Stack.Screen name="DriverOnTheWay" component={DriverOnTheWayScreen} />
    <Stack.Screen
      name="DriverDeliveryComplete"
      component={DriverDeliveryCompleteScreen}
    />
    <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
  </Stack.Navigator>
);

// Loading component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);

const AppNavigator = () => {
  const { user, userType, loading, setNavigation } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const [appIsReady, setAppIsReady] = useState(false);

  // Set navigation reference in AuthContext
  useEffect(() => {
    if (navigationRef.current) {
      setNavigation(navigationRef.current);
    }
    
    // Cleanup function
    return () => {
      setNavigation(null);
    };
  }, [navigationRef.current]);

  // Handle initial app loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppIsReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Show splash screen while app is initializing
  if (!appIsReady) {
    return <SplashScreen />;
  }

  // Show loading indicator while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Determine which stack to show based on user type
  const getActiveStack = () => {
    if (!user) {
      // No user is signed in
      return (
        <Stack.Screen name="Auth">
          {() => (
            <AuthStack />
          )}
        </Stack.Screen>
      );
    }
    
    if (userType === 'shipper') {
      // User is a shipper
      return (
        <Stack.Screen name="ShipperApp">
          {() => (
            <ShipperStack />
          )}
        </Stack.Screen>
      );
    }
    
    // User is a driver
    return (
      <Stack.Screen name="DriverApp">
        {() => (
          <DriverStack />
        )}
      </Stack.Screen>
    );
  };

  return (
    <NavigationContainer 
      ref={navigationRef}
      onStateChange={(state) => {
        // This helps with debugging navigation state
        console.log('Navigation state changed:', state);
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {getActiveStack()}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
