import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from '@react-native-firebase/firestore';

const db = getFirestore();

// Sample data for Firebase
export const sampleData = {
  // Sample loads
  loads: [
    {
      shipperId: 'sample-shipper-1',
      pickupLocation: 'Lagos, Nigeria',
      deliveryLocation: 'Abuja, Nigeria',
      pickupAddress: '35 Hakeem Dickson Street, Lekki Phase 1, Lagos',
      deliveryAddress: 'Plot 1234, Wuse II, Abuja',
      truckType: 'Flatbed Trailer',
      loadDescription: 'General cargo transport',
      weight: 5000,
      distance: 750,
      fareOffer: 150000, // Changed from price to fareOffer
      price: 150000, // Keep both for compatibility
      pickupDate: new Date(Date.now() + 86400000).toISOString(),
      deliveryDate: new Date(Date.now() + 259200000).toISOString(),
      status: 'available',
    },
    {
      shipperId: 'sample-shipper-2',
      pickupLocation: 'Port Harcourt, Nigeria',
      deliveryLocation: 'Kano, Nigeria',
      pickupAddress: 'Rivers Port Complex, Port Harcourt',
      deliveryAddress: 'Kano Industrial Estate, Kano',
      truckType: 'Container Truck',
      loadDescription: 'Industrial equipment',
      weight: 8000,
      distance: 1200,
      fareOffer: 250000, // Changed from price to fareOffer
      price: 250000, // Keep both for compatibility
      pickupDate: new Date(Date.now() + 172800000).toISOString(),
      deliveryDate: new Date(Date.now() + 432000000).toISOString(),
      status: 'available',
    }
  ],

  // Sample shipments
  shipments: [
    {
      shipperId: 'sample-shipper-1',
      driverId: 'sample-driver-1',
      pickupLocation: 'Lagos, Nigeria',
      deliveryLocation: 'Ibadan, Nigeria',
      pickupAddress: 'Victoria Island, Lagos',
      deliveryAddress: 'Dugbe Market, Ibadan',
      recipientName: 'John Doe',
      recipientPhone: '+2348012345678',
      loadDescription: 'Electronics',
      weight: 500,
      price: 25000,
      status: 'delivered',
      trackingNumber: 'SHARP001234',
    },
    {
      shipperId: 'sample-shipper-2',
      driverId: 'sample-driver-2',
      pickupLocation: 'Abuja, Nigeria',
      deliveryLocation: 'Kaduna, Nigeria',
      pickupAddress: 'Wuse II, Abuja',
      deliveryAddress: 'Kaduna Central Market',
      recipientName: 'Jane Smith',
      recipientPhone: '+2348098765432',
      loadDescription: 'Documents',
      weight: 50,
      price: 15000,
      status: 'in_transit',
      trackingNumber: 'SHARP005678',
    }
  ],

  // Sample drivers
  drivers: [
    {
      userId: 'sample-driver-1',
      name: 'Kunle Alamu',
      phone: '+2347012345678',
      email: 'kunle.alamu@email.com',
      truckType: 'Flatbed Trailer',
      licenseNumber: 'LAG123456789',
      rating: 4.5,
      totalDeliveries: 50,
      status: 'available',
      currentLocation: {
        latitude: 6.5244,
        longitude: 3.3792,
        address: 'Lagos, Nigeria'
      },
      pricePerKm: 200,
    },
    {
      userId: 'sample-driver-2',
      name: 'Mohammed Babaginda',
      phone: '+2348023456789',
      email: 'mohammed.b@email.com',
      truckType: 'Container Truck',
      licenseNumber: 'ABU987654321',
      rating: 4.8,
      totalDeliveries: 120,
      status: 'available',
      currentLocation: {
        latitude: 9.0765,
        longitude: 8.6753,
        address: 'Abuja, Nigeria'
      },
      pricePerKm: 180,
    },
    {
      userId: 'sample-driver-3',
      name: 'Chukwuebube Osinachi',
      phone: '+2348034567890',
      email: 'chukwu.osinachi@email.com',
      truckType: 'Box Truck',
      licenseNumber: 'PHC555666777',
      rating: 4.8,
      totalDeliveries: 85,
      status: 'busy',
      currentLocation: {
        latitude: 4.8156,
        longitude: 7.0498,
        address: 'Port Harcourt, Nigeria'
      },
      pricePerKm: 190,
    }
  ]
};

// Seed sample data to Firebase
export const seedSampleData = async () => {
  try {
    console.log('🌱 Seeding sample data to Firebase...');

    // Add sample loads
    for (const load of sampleData.loads) {
      await addDoc(collection(db, 'loads'), {
        ...load,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Add sample shipments
    for (const shipment of sampleData.shipments) {
      await addDoc(collection(db, 'shipments'), {
        ...shipment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Add sample drivers
    for (const driver of sampleData.drivers) {
      await addDoc(collection(db, 'drivers'), {
        ...driver,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('✅ Sample data seeded successfully!');
    return { success: true };
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    return { success: false, error: error.message };
  }
};

// Create a test load for bidding system
export const createTestLoad = async () => {
  try {
    console.log('🧪 Creating test load for bidding system...');

    const testLoad = {
      shipperId: 'test-shipper-1',
      pickupLocation: 'Lagos, Nigeria',
      deliveryLocation: 'Abuja, Nigeria',
      pickupAddress: '15 Bode Thomas Street, Surulere, Lagos',
      deliveryAddress: '35 Hakeem Dickson Street, Lekki Phase 1, Lagos',
      truckType: 'Flatbed Trailer',
      loadDescription: 'Test cargo for bidding system',
      weight: 5000,
      distance: 750,
      fareOffer: 150000,
      price: 150000,
      pickupDate: new Date(Date.now() + 86400000).toISOString(),
      deliveryDate: new Date(Date.now() + 259200000).toISOString(),
      status: 'available',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'loads'), testLoad);
    console.log('✅ Test load created with ID:', docRef.id);
    return { success: true, loadId: docRef.id };
  } catch (error) {
    console.error('❌ Error creating test load:', error);
    return { success: false, error: error.message };
  }
};

// Clear all sample data from Firebase
export const clearSampleData = async () => {
  try {
    console.log('🗑️ Clearing sample data from Firebase...');

    // This would require querying and deleting all documents
    // For now, just log that this function needs to be implemented
    console.log('⚠️  Clear function needs to be implemented with proper queries');

    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing sample data:', error);
    return { success: false, error: error.message };
  }
};
