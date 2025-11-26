import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc
} from '@react-native-firebase/firestore';

// Initialize Firestore
const db = getFirestore();

// Real-time Data Service
export const realTimeService = {
  // Subscribe to user-specific loads
  subscribeToUserLoads: (userId, callback) => {
    const q = query(
      collection(db, 'loads'),
      where('shipperId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        if (!querySnapshot || typeof querySnapshot.forEach !== 'function') {
          callback([]);
          return;
        }
        const loads = [];
        querySnapshot.forEach((doc) => {
          loads.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          });
        });
        callback(loads);
      } catch (e) {
        console.error('subscribeToUserLoads snapshot error:', e);
        callback([]);
      }
    }, (error) => {
      console.error('subscribeToUserLoads listener error:', error);
      callback([]);
    });

    return unsubscribe;
  },

  // Subscribe to user-specific shipments
  subscribeToUserShipments: (userId, callback) => {
    const q = query(
      collection(db, 'shipments'),
      where('shipperId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        if (!querySnapshot || typeof querySnapshot.forEach !== 'function') {
          callback([]);
          return;
        }
        const shipments = [];
        querySnapshot.forEach((doc) => {
          shipments.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          });
        });
        callback(shipments);
      } catch (e) {
        console.error('subscribeToUserShipments snapshot error:', e);
        callback([]);
      }
    }, (error) => {
      console.error('subscribeToUserShipments listener error:', error);
      callback([]);
    });

    return unsubscribe;
  },

  // Subscribe to available loads for drivers
  subscribeToAvailableLoads: (callback, filters = {}) => {
    // Note: no orderBy here to avoid composite index requirement
    let q = query(
      collection(db, 'loads'),
      where('status', 'in', ['available', 'applied']) // Include both available and applied loads
    );

    if (filters.truckType) {
      q = query(q, where('truckType', '==', filters.truckType));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        if (!querySnapshot || typeof querySnapshot.forEach !== 'function') {
          callback([]);
          return;
        }
        const loads = [];
        querySnapshot.forEach((doc) => {
          loads.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          });
        });
        callback(loads);
      } catch (e) {
        console.error('subscribeToAvailableLoads snapshot error:', e);
        callback([]);
      }
    }, (error) => {
      console.error('subscribeToAvailableLoads listener error:', error);
      callback([]);
    });

    return unsubscribe;
  },

  // Subscribe to driver shipments
  subscribeToDriverShipments: (driverId, callback) => {
    const q = query(
      collection(db, 'shipments'),
      where('driverId', '==', driverId),
      where('status', 'in', ['in_transit', 'picked_up']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        if (!querySnapshot || typeof querySnapshot.forEach !== 'function') {
          callback([]);
          return;
        }
        const shipments = [];
        querySnapshot.forEach((doc) => {
          shipments.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          });
        });
        callback(shipments);
      } catch (e) {
        console.error('subscribeToDriverShipments snapshot error:', e);
        callback([]);
      }
    }, (error) => {
      console.error('subscribeToDriverShipments listener error:', error);
      callback([]);
    });

    return unsubscribe;
  },

  // Subscribe to a specific shipment for real-time updates
  subscribeToShipment: (shipmentId, callback) => {
    const shipmentRef = doc(db, 'shipments', shipmentId);

    const unsubscribe = onSnapshot(shipmentRef, (doc) => {
      if (doc.exists()) {
        callback({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        });
      }
    });

    return unsubscribe;
  },

  // Subscribe to available drivers
  subscribeToAvailableDrivers: (callback, filters = {}) => {
    let q = query(
      collection(db, 'drivers'),
      where('status', '==', 'available'),
      orderBy('rating', 'desc')
    );

    if (filters.truckType) {
      q = query(q, where('truckType', '==', filters.truckType));
    }

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

  // Subscribe to driver location updates
  subscribeToDriverLocation: (driverId, callback) => {
    const driverRef = doc(db, 'drivers', driverId);

    const unsubscribe = onSnapshot(driverRef, (doc) => {
      if (doc.exists()) {
        const driverData = doc.data();
        if (driverData.currentLocation) {
          callback(driverData.currentLocation);
        }
      }
    });

    return unsubscribe;
  },

  // Subscribe to shipment location updates
  subscribeToShipmentLocation: (shipmentId, callback) => {
    const shipmentRef = doc(db, 'shipments', shipmentId);

    const unsubscribe = onSnapshot(shipmentRef, (doc) => {
      if (doc.exists()) {
        const shipmentData = doc.data();
        if (shipmentData.currentLocation) {
          callback(shipmentData.currentLocation);
        }
      }
    });

    return unsubscribe;
  }
};
