import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from '@react-native-firebase/firestore';

// Initialize Firestore
const db = getFirestore();

// Firebase Shipments/Deliveries Service
export const firebaseShipmentsService = {
  // Get shipments for a specific user
  getMyShipments: async (userId, status = null) => {
    try {
      let q = collection(db, 'shipments');

      // Filter by user ID
      q = query(q, where('shipperId', '==', userId));

      // Filter by status if specified
      if (status) {
        q = query(q, where('status', '==', status));
      }

      // Order by created date (newest first)
      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const shipments = [];

      querySnapshot.forEach((doc) => {
        shipments.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        });
      });

      return { success: true, data: shipments };
    } catch (error) {
      console.error('Error fetching shipments:', error);
      return { success: false, error: error.message };
    }
  },

  // Create new shipment
  createShipment: async (shipmentData) => {
    try {
      const docRef = await addDoc(collection(db, 'shipments'), {
        ...shipmentData,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        data: { id: docRef.id, ...shipmentData }
      };
    } catch (error) {
      console.error('Error creating shipment:', error);
      return { success: false, error: error.message };
    }
  },

  // Update shipment
  updateShipment: async (shipmentId, updates) => {
    try {
      const shipmentRef = doc(db, 'shipments', shipmentId);
      await updateDoc(shipmentRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating shipment:', error);
      return { success: false, error: error.message };
    }
  },

  // Update shipment status
  updateShipmentStatus: async (shipmentId, status, location = null) => {
    try {
      const updates = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (location) {
        updates.currentLocation = location;
      }

      await updateDoc(doc(db, 'shipments', shipmentId), updates);

      return { success: true };
    } catch (error) {
      console.error('Error updating shipment status:', error);
      return { success: false, error: error.message };
    }
  },

  // Get shipment by ID
  getShipmentById: async (shipmentId) => {
    try {
      const shipmentRef = doc(db, 'shipments', shipmentId);
      const shipmentDoc = await getDoc(shipmentRef);

      if (shipmentDoc.exists()) {
        return {
          success: true,
          data: {
            id: shipmentDoc.id,
            ...shipmentDoc.data(),
            createdAt: shipmentDoc.data().createdAt?.toDate?.() || new Date(shipmentDoc.data().createdAt),
          }
        };
      } else {
        return { success: false, error: 'Shipment not found' };
      }
    } catch (error) {
      console.error('Error fetching shipment:', error);
      return { success: false, error: error.message };
    }
  },

  // Get driver's active shipments
  getDriverShipments: async (driverId) => {
    try {
      const q = query(
        collection(db, 'shipments'),
        where('driverId', '==', driverId),
        where('status', 'in', ['in_transit', 'picked_up']),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const shipments = [];

      querySnapshot.forEach((doc) => {
        shipments.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        });
      });

      return { success: true, data: shipments };
    } catch (error) {
      console.error('Error fetching driver shipments:', error);
      return { success: false, error: error.message };
    }
  },

  // Listen to shipments in real-time
  subscribeToShipments: (userId, callback, status = null) => {
    let q = collection(db, 'shipments');

    // Filter by user ID
    q = query(q, where('shipperId', '==', userId));

    // Filter by status if specified
    if (status) {
      q = query(q, where('status', '==', status));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const shipments = [];
      querySnapshot.forEach((doc) => {
        shipments.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        });
      });
      callback(shipments);
    });

    return unsubscribe;
  }
};
