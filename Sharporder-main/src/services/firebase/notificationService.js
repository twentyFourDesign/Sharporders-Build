import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid, Alert} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

class NotificationService {
  constructor() {
    this.unsubscribe = null;
  }

  // Request permission for notifications
  async requestUserPermission() {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('iOS Notification permission granted:', authStatus);
          return true;
        } else {
          console.log('iOS Notification permission denied');
          return false;
        }
      } else {
        // Android 13+ requires runtime permission
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Android Notification permission granted');
            return true;
          } else {
            console.log('Android Notification permission denied');
            return false;
          }
        }
        return true; // Android < 13 doesn't need runtime permission
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Get FCM token and save to Firestore
  async getFCMToken() {
    try {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);

      // Save token to user's Firestore document
      await this.saveFCMToken(token);

      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Save FCM token to Firestore
  async saveFCMToken(token) {
    try {
      const user = auth().currentUser;
      if (!user) {
        console.log('No user logged in, cannot save FCM token');
        return;
      }

      await firestore()
        .collection('users')
        .doc(user.uid)
        .set(
          {
            fcmTokens: firestore.FieldValue.arrayUnion(token),
            lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        );

      console.log('FCM token saved to Firestore');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  // Remove FCM token (on logout)
  async removeFCMToken() {
    try {
      const token = await messaging().getToken();
      const user = auth().currentUser;

      if (!user) return;

      await firestore()
        .collection('users')
        .doc(user.uid)
        .update({
          fcmTokens: firestore.FieldValue.arrayRemove(token),
        });

      console.log('FCM token removed from Firestore');
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  // Initialize notification listeners
  async initialize() {
    try {
      // Request permission
      const hasPermission = await this.requestUserPermission();
      if (!hasPermission) {
        console.log('Notification permission not granted');
        return;
      }

      // Get and save FCM token
      await this.getFCMToken();

      // Listen for token refresh
      messaging().onTokenRefresh(async token => {
        console.log('FCM token refreshed:', token);
        await this.saveFCMToken(token);
      });

      // Handle notifications when app is in foreground
      this.unsubscribe = messaging().onMessage(async remoteMessage => {
        console.log('Foreground notification:', remoteMessage);

        // Show alert or custom notification
        Alert.alert(
          remoteMessage.notification?.title || 'New Notification',
          remoteMessage.notification?.body || '',
        );
      });

      // Handle notification when app is opened from background/quit state
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification opened app from background:', remoteMessage);
        this.handleNotificationNavigation(remoteMessage);
      });

      // Handle notification when app is opened from quit state
      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          if (remoteMessage) {
            console.log(
              'Notification opened app from quit state:',
              remoteMessage,
            );
            this.handleNotificationNavigation(remoteMessage);
          }
        });

      // Handle background messages (iOS)
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Background message:', remoteMessage);
      });

      console.log('Notification service initialized');
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  // Handle navigation based on notification data
  handleNotificationNavigation(remoteMessage) {
    const {data} = remoteMessage;

    // Navigate based on notification type
    if (data?.type === 'new_bid') {
      // Navigate to load details
      // navigation.navigate('LoadDetails', { loadId: data.loadId });
    } else if (data?.type === 'bid_accepted') {
      // Navigate to shipment details
      // navigation.navigate('ShipmentDetails', { shipmentId: data.shipmentId });
    }
    // Add more navigation logic as needed
  }

  // Cleanup
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export default new NotificationService();
