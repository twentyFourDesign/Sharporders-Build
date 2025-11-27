import React from 'react';
import {LogBox, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryClient, QueryClientProvider} from 'react-query';
import {AppProvider} from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import {AuthProvider} from './src/context/AuthContext';

export default function App() {
  LogBox.ignoreAllLogs(true);
  const queryClient = new QueryClient();
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
