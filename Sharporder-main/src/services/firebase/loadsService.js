import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  arrayUnion,
} from '@react-native-firebase/firestore';

// Initialize Firestore
const db = getFirestore();

// Firebase Loads Service
export const firebaseLoadsService = {
  // Get all available loads (for drivers)
  getAvailableLoads: async (filters = {}) => {
    try {
      let q = collection(db, 'loads');

      // Apply filters
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      if (filters.truckType) {
        q = query(q, where('truckType', '==', filters.truckType));
      }

      // Order by created date (newest first)
      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const loads = [];

      querySnapshot.forEach(doc => {
        loads.push({
          id: doc.id,
          ...doc.data(),
          createdAt:
            doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        });
      });

      return {success: true, data: loads};
    } catch (error) {
      console.error('Error fetching loads:', error);
      return {success: false, error: error.message};
    }
  },

  // Get loads for a specific user (shipper's loads)
  getMyLoads: async userId => {
    try {
      const q = query(
        collection(db, 'loads'),
        where('shipperId', '==', userId),
        orderBy('createdAt', 'desc'),
      );

      const querySnapshot = await getDocs(q);
      const loads = [];

      querySnapshot.forEach(doc => {
        loads.push({
          id: doc.id,
          ...doc.data(),
          createdAt:
            doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        });
      });

      return {success: true, data: loads};
    } catch (error) {
      console.error('Error fetching my loads:', error);
      return {success: false, error: error.message};
    }
  },

  // Create new load
  createLoad: async loadData => {
    try {
      const docRef = await addDoc(collection(db, 'loads'), {
        ...loadData,
        status: 'available',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        data: {id: docRef.id, ...loadData},
      };
    } catch (error) {
      console.error('Error creating load:', error);
      return {success: false, error: error.message};
    }
  },

  // Update load
  updateLoad: async (loadId, updates) => {
    try {
      const loadRef = doc(db, 'loads', loadId);
      await updateDoc(loadRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      return {success: true};
    } catch (error) {
      console.error('Error updating load:', error);
      return {success: false, error: error.message};
    }
  },

  // Delete load
  deleteLoad: async loadId => {
    try {
      await deleteDoc(doc(db, 'loads', loadId));
      return {success: true};
    } catch (error) {
      console.error('Error deleting load:', error);
      return {success: false, error: error.message};
    }
  },

  // Accept load (for drivers)
  acceptLoad: async (loadId, driverId) => {
    try {
      const loadRef = doc(db, 'loads', loadId);
      await updateDoc(loadRef, {
        status: 'accepted',
        driverId: driverId,
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {success: true};
    } catch (error) {
      console.error('Error accepting load:', error);
      return {success: false, error: error.message};
    }
  },

  denyLoad: async (loadId, driverId) => {
    try {
      const loadRef = doc(db, 'loads', loadId);

      await updateDoc(loadRef, {
        updatedAt: serverTimestamp(),
        nonInterestedDrivers: arrayUnion(driverId),
      });

      return {
        success: true,
        message: 'Driver marked as not interested or denied.',
      };
    } catch (error) {
      console.error('Error denying load:', error);
      return {success: false, error: error.message};
    }
  },
  // Driver applies for a load (awaiting shipper approval)
  applyForLoad: async (loadId, driverId, offer = null) => {
    try {
      const loadRef = doc(db, 'loads', loadId);
      await updateDoc(loadRef, {
        status: 'applied',
        driverId: driverId,
        driverOffer: offer ?? null,
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {success: true};
    } catch (error) {
      console.error('Error applying for load:', error);
      return {success: false, error: error.message};
    }
  },

  // Listen to loads in real-time
  subscribeToLoads: (callback, filters = {}) => {
    let q = collection(db, 'loads');

    // Apply filters
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters.truckType) {
      q = query(q, where('truckType', '==', filters.truckType));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, querySnapshot => {
      const loads = [];
      querySnapshot.forEach(doc => {
        loads.push({
          id: doc.id,
          ...doc.data(),
          createdAt:
            doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        });
      });
      callback(loads);
    });

    return unsubscribe;
  },

  // Accept driver application for a load
  acceptDriverApplication: async (loadId, driverId) => {
    try {
      const loadRef = doc(db, 'loads', loadId);
      await updateDoc(loadRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {success: true};
    } catch (error) {
      console.error('Error accepting driver application:', error);
      return {success: false, error: error.message};
    }
  },

  // Reject driver application for a load
  rejectDriverApplication: async (loadId, driverId) => {
    try {
      const loadRef = doc(db, 'loads', loadId);
      await updateDoc(loadRef, {
        status: 'available',
        driverId: null,
        driverOffer: null,
        appliedAt: null,
        updatedAt: serverTimestamp(),
      });

      return {success: true};
    } catch (error) {
      console.error('Error rejecting driver application:', error);
      return {success: false, error: error.message};
    }
  },

  // Submit a bid for a load
  submitBid: async (loadId, driverId, offerAmount, message = '') => {
    try {
      const bidData = {
        loadId,
        driverId,
        offerAmount: parseFloat(offerAmount),
        message,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const bidRef = await addDoc(collection(db, 'bids'), bidData);

      // Update the load to show it has bids
      const loadRef = doc(db, 'loads', loadId);
      await updateDoc(loadRef, {
        status: 'applied',
        updatedAt: serverTimestamp(),
        bidders: arrayUnion(driverId),
      });

      return {
        success: true,
        data: {id: bidRef.id, ...bidData},
      };
    } catch (error) {
      console.error('Error submitting bid:', error);
      return {success: false, error: error.message};
    }
  },

  // Get all bids for a specific load
  getBidsForLoad: async loadId => {
    try {
      const q = query(
        collection(db, 'bids'),
        where('loadId', '==', loadId),
        orderBy('createdAt', 'desc'),
      );

      const querySnapshot = await getDocs(q);
      const bids = [];

      querySnapshot.forEach(doc => {
        bids.push({
          id: doc.id,
          ...doc.data(),
          createdAt:
            doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        });
      });

      return {success: true, data: bids};
    } catch (error) {
      console.error('Error fetching bids for load:', error);
      return {success: false, error: error.message};
    }
  },

  // Accept a specific bid
  acceptBid: async (bidId, loadId, driverId) => {
    try {
      const bidRef = doc(db, 'bids', bidId);
      await updateDoc(bidRef, {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });

      // Update the load with the accepted bid information
      const loadRef = doc(db, 'loads', loadId);
      await updateDoc(loadRef, {
        status: 'accepted',
        driverId: driverId,
        acceptedBidId: bidId,
        updatedAt: serverTimestamp(),
      });

      // Reject all other bids for this load
      const bidsQuery = query(
        collection(db, 'bids'),
        where('loadId', '==', loadId),
        where('status', '==', 'pending'),
      );

      const querySnapshot = await getDocs(bidsQuery);
      const batch = writeBatch(db);

      querySnapshot.forEach(doc => {
        if (doc.id !== bidId) {
          batch.update(doc.ref, {
            status: 'rejected',
            updatedAt: serverTimestamp(),
          });
        }
      });

      await batch.commit();

      return {success: true};
    } catch (error) {
      console.error('Error accepting bid:', error);
      return {success: false, error: error.message};
    }
  },

  // Reject a specific bid
  // TODO: bid ko delete karo or load main sy bidder ko remove karo ta k wo dobara apply kr sky
  rejectBid: async (bidId, loadId, driverId) => {
    try {
      const bidRef = doc(db, 'bids', bidId);
      // Delete the bid document from the 'bids' collection
      await deleteDoc(bidRef);

      // Get the load document to remove the driver from the bidders list
      const loadRef = doc(db, 'loads', loadId);
      const loadDoc = await getDoc(loadRef);

      if (loadDoc.exists) {
        const loadData = loadDoc.data();
        const bidders = loadData.bidders || [];

        // Remove the driver's ID from the bidders array
        const updatedBidders = bidders.filter(
          bidderId => bidderId !== driverId,
        );

        // Update the load document with the new bidders list
        await updateDoc(loadRef, {
          bidders: updatedBidders,
          updatedAt: serverTimestamp(),
        });
      }

      // Check if there are any other pending bids for this load
      const pendingBidsQuery = query(
        collection(db, 'bids'),
        where('loadId', '==', loadId),
        where('status', '==', 'pending'),
      );

      const querySnapshot = await getDocs(pendingBidsQuery);

      // If no pending bids remain, update load status back to available
      if (querySnapshot.empty) {
        await updateDoc(loadRef, {
          status: 'available',
          driverId: null,
          updatedAt: serverTimestamp(),
        });
      }

      return {success: true};
    } catch (error) {
      console.error('Error rejecting bid:', error);
      return {success: false, error: error.message};
    }
  },

  cancelBid: async (loadId, driverId) => {
    try {
      // Find the bid where loadId and driverId match
      const bidQuery = query(
        collection(db, 'bids'),
        where('loadId', '==', loadId),
        where('driverId', '==', driverId),
      );

      const querySnapshot = await getDocs(bidQuery);

      if (!querySnapshot.empty) {
        const bidDoc = querySnapshot.docs[0];
        const bidId = bidDoc.id;

        return bidId;
      } else {
        return {
          success: false,
          error: 'Bid not found for this driver and load.',
        };
      }
    } catch (error) {
      console.error('Error canceling bid:', error);
      return {success: false, error: error.message};
    }
  },

  // Subscribe to a specific load (real-time)
  subscribeToLoad: (loadId, callback) => {
    const loadRef = doc(db, 'loads', loadId);

    const unsubscribe = onSnapshot(
      loadRef,
      docSnapshot => {
        // Handle both function and boolean cases for exists
        const docExists =
          typeof docSnapshot.exists === 'function'
            ? docSnapshot.exists()
            : docSnapshot.exists;

        if (docExists) {
          const loadData = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
            createdAt:
              docSnapshot.data().createdAt?.toDate?.() ||
              new Date(docSnapshot.data().createdAt),
            updatedAt:
              docSnapshot.data().updatedAt?.toDate?.() ||
              new Date(docSnapshot.data().updatedAt),
          };
          callback(loadData);
        } else {
          callback(null);
        }
      },
      error => {
        console.error('Error subscribing to load:', error);
        callback(null);
      },
    );

    return unsubscribe;
  },

  // Subscribe to bids for a specific load (real-time)
  subscribeToLoadBids: (loadId, callback) => {
    const q = query(
      collection(db, 'bids'),
      where('loadId', '==', loadId),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      querySnapshot => {
        const bids = [];
        querySnapshot.forEach(doc => {
          bids.push({
            id: doc.id,
            ...doc.data(),
            createdAt:
              doc.data().createdAt?.toDate?.() ||
              new Date(doc.data().createdAt),
            updatedAt:
              doc.data().updatedAt?.toDate?.() ||
              new Date(doc.data().updatedAt),
          });
        });
        callback(bids);
      },
      error => {
        console.error('Error subscribing to load bids:', error);
        callback([]);
      },
    );

    return unsubscribe;
  },

  // Get driver information by ID
  getDriverById: async driverId => {
    try {
      const driverRef = doc(db, 'users', driverId);
      const driverDoc = await getDoc(driverRef);

      // Check if document exists (handle both function and boolean cases)
      const docExists =
        typeof driverDoc.exists === 'function'
          ? driverDoc.exists()
          : driverDoc.exists;

      if (docExists) {
        return {
          success: true,
          data: {
            id: driverDoc.id,
            ...driverDoc.data(),
            createdAt:
              driverDoc.data().createdAt?.toDate?.() ||
              new Date(driverDoc.data().createdAt),
          },
        };
      } else {
        return {success: false, error: 'Driver not found'};
      }
    } catch (error) {
      console.error('Error fetching driver:', error);
      return {success: false, error: error.message};
    }
  },
};
