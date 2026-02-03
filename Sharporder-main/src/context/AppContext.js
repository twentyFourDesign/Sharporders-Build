import React, { createContext, useContext, useState, useEffect } from 'react';
import onboarding1 from '../assets/on-boarding-1.png';
import onboarding2 from '../assets/on-boarding-2.png';
import onboarding3 from '../assets/on-boarding-3.png';
import onboarding4 from '../assets/on-boarding-4.png';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showTruckSelector, setShowTruckSelector] = useState(false);
  const [showDriverSelection, setShowDriverSelection] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeliveryAlert, setShowDeliveryAlert] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [alertResolved, setAlertResolved] = useState(false);
  const [showLoadDrawer, setShowLoadDrawer] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [showBidsModal, setShowBidsModal] = useState(false);
  const [currentBids, setCurrentBids] = useState([]);

  const [loads, setLoads] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    dateOfBirth: '',
    email: '',
    phone: '+234 08012345678',
    password: '',
    confirmPassword: '',
    pickupAddress: '',
    deliveryAddress: '',
    truckType: '',
    loadDescription: '',
    recipientName: '',
    recipientNumber: '+234 08012345678',
    fareOffer: '10000',
  });

  const addLoad = (loadData) => {
    const newLoad = {
      id: Date.now(),
      loadNumber: `#${Math.floor(Math.random() * 1000) + 100}`,
      route: `${loadData.pickupAddress || formData.pickupAddress || 'Lagos'} → ${loadData.deliveryAddress || formData.deliveryAddress || 'Abuja'}`,
      destination: loadData.deliveryAddress || formData.deliveryAddress || 'Abuja',
      truckType: loadData.truckType || formData.truckType || 'Flatbed Trailer',
      status: 'Available',
      numberOfBids: Math.floor(Math.random() * 10),
      weight: `${Math.floor(Math.random() * 10000) + 1000} kg`,
      price: `₦${(Math.floor(Math.random() * 200000) + 50000).toLocaleString()}`,
      pickupDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 259200000).toISOString().split('T')[0],
      distance: `${Math.floor(Math.random() * 1000) + 100} km`,
      cargoType: loadData.loadDescription || 'General Cargo',
      time: new Date().toLocaleString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }),
      truckType: loadData.truckType || formData.truckType || 'Truck',
      numberOfBids: Math.floor(Math.random() * 20) + 1,
      priceRange: `₦${parseInt(loadData.fareOffer || formData.fareOffer || '120000').toLocaleString()} - ₦${(parseInt(loadData.fareOffer || formData.fareOffer || '120000') + 30000).toLocaleString()}`,
      status: 'In Transit',
      description: loadData.loadDescription || formData.loadDescription || 'General cargo transport',
      createdAt: new Date().toISOString(),
      ...loadData
    };
    
    setLoads(prevLoads => [newLoad, ...prevLoads]);
    return newLoad;
  };

  const updateLoad = (loadId, updates) => {
    setLoads(prevLoads => 
      prevLoads.map(load => 
        load.id === loadId ? { ...load, ...updates } : load
      )
    );
  };

  const deleteLoad = (loadId) => {
    setLoads(prevLoads => prevLoads.filter(load => load.id !== loadId));
  };

  const addShipment = (shipmentData) => {
    const newShipment = {
      id: Date.now(),
      address: shipmentData.deliveryAddress || formData.deliveryAddress || '35 Hakeem Dickson Street, Lekki Phase 1...',
      date: new Date().toLocaleDateString('en-GB', { 
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      }) + ' ' + new Date().toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      price: `NGN ${parseInt(shipmentData.fareOffer || formData.fareOffer || '12500').toLocaleString()}`,
      status: 'Delivered',
      createdAt: new Date().toISOString(),
      ...shipmentData
    };
    
    setShipments(prevShipments => [newShipment, ...prevShipments]);
    return newShipment;
  };

  const updateShipment = (shipmentId, updates) => {
    setShipments(prevShipments => 
      prevShipments.map(shipment => 
        shipment.id === shipmentId ? { ...shipment, ...updates } : shipment
      )
    );
  };

  const deleteShipment = (shipmentId) => {
    setShipments(prevShipments => prevShipments.filter(shipment => shipment.id !== shipmentId));
  };

  useEffect(() => {
    if (shipments.length === 0) {
      const sampleShipments = [
        {
          id: 1,
          address: '35 Hakeem Dickson Street, Lekki Phase 1...',
          date: '10/07/2025 12:58 PM',
          price: 'NGN 12,500',
          status: 'Delivered'
        },
        {
          id: 2,
          address: '35 Hakeem Dickson Street, Lekki Phase 1...',
          date: '10/07/2025 12:58 PM',
          price: 'NGN 12,500',
          status: 'Delivered'
        },
        {
          id: 3,
          address: '35 Hakeem Dickson Street, Lekki Phase 1...',
          date: '10/07/2025 12:58 PM',
          price: 'NGN 12,500',
          status: 'Delivered'
        },
        {
          id: 4,
          address: '35 Hakeem Dickson Street, Lekki Phase 1...',
          date: '10/07/2025 12:58 PM',
          price: 'NGN 12,500',
          status: 'Delivered'
        },
        {
          id: 5,
          address: '35 Hakeem Dickson Street, Lekki Phase 1...',
          date: '10/07/2025 12:58 PM',
          price: 'NGN 12,500',
          status: 'Delivered'
        },
        {
          id: 6,
          address: '35 Hakeem Dickson Street, Lekki Phase 1...',
          date: '10/07/2025 12:58 PM',
          price: 'NGN 12,500',
          status: 'Delivered'
        },
        {
          id: 7,
          address: '35 Hakeem Dickson Street, Lekki Phase 1...',
          date: '10/07/2025 12:58 PM',
          price: 'NGN 12,500',
          status: 'Delivered'
        }
      ];
      setShipments(sampleShipments);
    }
  }, []);

  const onboardingSteps = [
    {
      title: 'Ship with ease',
      description: 'Send packages anywhere with just a few taps. Our platform connects you with trusted drivers in your area.',
      image: onboarding1,
    },
    {
      title: 'Choose your driver',
      description: 'Browse verified drivers, check their ratings, and select the perfect match for your delivery needs.',
      image: onboarding2,
    },
    {
      title: 'Real-time tracking',
      description: 'Track your package every step of the way with live updates and GPS monitoring for peace of mind.',
      image: onboarding3,
    },
    {
      title: 'Secure and reliable',
      description: 'Your packages are protected with insurance coverage and verified driver background checks.',
      image: onboarding4,
    },
  ];

  const truckTypes = [
    {
      id: 1,
      name: 'Standard Rigid Dump Truck',
      capacity: '10-30 cubic yards',
      weight: '15-25 tons',
      tyres: '6',
      selected: true,
    },
    {
      id: 2,
      name: 'Articulated Dump Truck',
      capacity: '25-45 cubic yards',
      weight: '35-45 tons',
      tyres: '10',
      selected: false,
    },
    {
      id: 3,
      name: 'Transfer Dump Truck',
      capacity: '15-25 cubic yards',
      weight: '20-30 tons combined',
      tyres: '8',
      selected: false,
    },
    {
      id: 4,
      name: 'Super Dump Truck',
      capacity: '20-30 cubic yards',
      weight: '26-33 tons',
      tyres: '12',
      selected: false,
    },
    {
      id: 5,
      name: 'Semi-trailer End Dump Truck',
      capacity: '20-30 cubic yards',
      weight: '20-25 tons',
      tyres: '8',
      selected: false,
    },
  ];

  const drivers = [
    { id: 1, name: 'Kunle Alamu', rating: 4.5, deliveries: 50, price: 15000, time: '10 mins away' },
    { id: 2, name: 'Mohammed Babaginda', rating: 4.8, deliveries: 120, price: 12000, time: '10 mins away' },
    { id: 3, name: 'Chukwuebube Osinachi', rating: 4.8, deliveries: 120, price: 12000, time: '10 mins away' },
    { id: 4, name: 'Oghenetega Atufe', rating: 4.8, deliveries: 120, price: 12000, time: '10 mins away' },
    { id: 5, name: 'Oluwatomisin Alamu', rating: 4.5, deliveries: 50, price: 15000, time: '10 mins away' },
  ];

  const value = {
    currentOnboardingStep,
    setCurrentOnboardingStep,
    showOTPModal,
    setShowOTPModal,
    showTruckSelector,
    setShowTruckSelector,
    showDriverSelection,
    setShowDriverSelection,
    showPaymentModal,
    setShowPaymentModal,
    showDeliveryAlert,
    setShowDeliveryAlert,
    showSuccessModal,
    setShowSuccessModal,
    alertResolved,
    setAlertResolved,
    showLoadDrawer,
    setShowLoadDrawer,
    selectedLoad,
    setSelectedLoad,
    formData,
    setFormData,
    loads,
    setLoads,
    addLoad,
    updateLoad,
    deleteLoad,
    shipments,
    setShipments,
    addShipment,
    updateShipment,
    deleteShipment,
    onboardingSteps,
    truckTypes,
    drivers,
    showBidsModal,
    setShowBidsModal,
    currentBids,
    setCurrentBids,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
