import {
  getFirestore,
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc
} from '@react-native-firebase/firestore';

// Initialize Firestore
const db = getFirestore();

// Firebase Drivers Service
export const firebaseDriversService = {
  // Get available drivers for a shipment
  getAvailableDrivers: async (shipmentData = {}) => {
    try {
      let q = collection(db, 'drivers');

      // Filter by status (available)
      q = query(q, where('status', '==', 'available'));

      // Filter by truck type if specified
      if (shipmentData.truckType) {
        q = query(q, where('truckType', '==', shipmentData.truckType));
      }

      // Filter by location (drivers near pickup location)
      if (shipmentData.pickupLocation) {
        // This would require geolocation queries - simplified for now
        q = query(q, orderBy('rating', 'desc'));
      } else {
        q = query(q, orderBy('rating', 'desc'));
      }

      // Limit results
      q = query(q, orderBy('rating', 'desc'));

      const querySnapshot = await getDocs(q);
      const drivers = [];

      querySnapshot.forEach((doc) => {
        drivers.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        });
      });

      return { success: true, data: drivers };
    } catch (error) {
      console.error('Error fetching drivers:', error);
      return { success: false, error: error.message };
    }
  },

  // Get driver by ID
  getDriverById: async (driverId) => {
    try {
      const driverRef = doc(db, 'drivers', driverId);
      const driverDoc = await getDoc(driverRef);

      if (driverDoc.exists()) {
        return {
          success: true,
          data: {
            id: driverDoc.id,
            ...driverDoc.data(),
            createdAt: driverDoc.data().createdAt?.toDate?.() || new Date(driverDoc.data().createdAt),
          }
        };
      } else {
        return { success: false, error: 'Driver not found' };
      }
    } catch (error) {
      console.error('Error fetching driver:', error);
      return { success: false, error: error.message };
    }
  },

  // Search drivers by criteria
  searchDrivers: async (filters = {}) => {
    try {
      let q = collection(db, 'drivers');

      // Apply filters
      if (filters.truckType) {
        q = query(q, where('truckType', '==', filters.truckType));
      }

      if (filters.minRating) {
        q = query(q, where('rating', '>=', filters.minRating));
      }

      if (filters.maxPrice) {
        q = query(q, where('pricePerKm', '<=', filters.maxPrice));
      }

      // Order by rating
      q = query(q, orderBy('rating', 'desc'));

      const querySnapshot = await getDocs(q);
      const drivers = [];

      querySnapshot.forEach((doc) => {
        drivers.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        });
      });

      return { success: true, data: drivers };
    } catch (error) {
      console.error('Error searching drivers:', error);
      return { success: false, error: error.message };
    }
  },

  // Update driver status
  updateDriverStatus: async (driverId, status, location = null) => {
    try {
      const updates = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (location) {
        updates.currentLocation = location;
      }

      await updateDoc(doc(db, 'drivers', driverId), updates);

      return { success: true };
    } catch (error) {
      console.error('Error updating driver status:', error);
      return { success: false, error: error.message };
    }
  },

  // Update driver location
  updateDriverLocation: async (driverId, location) => {
    try {
      await updateDoc(doc(db, 'drivers', driverId), {
        currentLocation: location,
        lastLocationUpdate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating driver location:', error);
      return { success: false, error: error.message };
    }
  },

  // Listen to drivers in real-time
  subscribeToDrivers: (callback, filters = {}) => {
    let q = collection(db, 'drivers');

    // Apply filters
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters.truckType) {
      q = query(q, where('truckType', '==', filters.truckType));
    }

    q = query(q, orderBy('rating', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const drivers = [];
      querySnapshot.forEach((doc) => {
        drivers.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        });
      });
      callback(drivers);
    });

    return unsubscribe;
  },

  // Get driver statistics
  getDriverStats: async (driverId) => {
    try {
      // Get completed shipments count
      const completedShipmentsQuery = query(
        collection(db, 'shipments'),
        where('driverId', '==', driverId),
        where('status', '==', 'delivered')
      );

      const completedShipments = await getDocs(completedShipmentsQuery);

      // Get total earnings (this would need a separate earnings collection)
      const earningsQuery = query(
        collection(db, 'earnings'),
        where('driverId', '==', driverId)
      );

      const earnings = await getDocs(earningsQuery);
      let totalEarnings = 0;
      earnings.forEach(doc => {
        totalEarnings += doc.data().amount || 0;
      });

      return {
        success: true,
        data: {
          completedDeliveries: completedShipments.size,
          totalEarnings,
          rating: 4.5, // This would come from driver profile
        }
      };
    } catch (error) {
      console.error('Error fetching driver stats:', error);
      return { success: false, error: error.message };
    }
  }
};
