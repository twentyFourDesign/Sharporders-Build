import React, { useState, useEffect, useRef } from 'react';

import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar
} from 'react-native';
import back from '../../assets/icons/back.png';
import emptyloadboard2 from '../../assets/empty-load-board-2.png';
import search from '../../assets/icons/search.png';
import filter from '../../assets/icons/filter.png';
import menu from '../../assets/icons/menu.png';
import { realTimeService, firebaseLoadsService } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import auth from '@react-native-firebase/auth';

const { width: screenWidth } = Dimensions.get('window');

const DriverLoadBoardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [selectedFare, setSelectedFare] = useState('');
  const [customFare, setCustomFare] = useState('');
  const [filters, setFilters] = useState({
    vehicleType: '',
    minPrice: '',
    maxPrice: '',
    route: '',
    minRating: ''
  });
  // Realtime available loads (UI model)
  const [availableLoads, setAvailableLoads] = useState([]);
  const emptyClearTimeoutRef = useRef(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Subscribe to available loads in real time
  useEffect(() => {
    let unsubscribe = null;
    // No additional filters for now; can add truckType later
    unsubscribe = realTimeService.subscribeToAvailableLoads((loads) => {
      const count = Array.isArray(loads) ? loads.length : 0;
      if (count > 0) {
        if (emptyClearTimeoutRef.current) {
          clearTimeout(emptyClearTimeoutRef.current);
          emptyClearTimeoutRef.current = null;
        }
        // Map Firestore loads to UI model used by this screen
        const ui = loads.map((l) => ({
          id: l.id,
          _loadId: l.id, // keep original id for actions
          route: `${l.pickupAddress || '-'} → ${l.deliveryAddress || '-'}`,
          pickupAddress: l.pickupAddress || '-',
          deliveryAddress: l.deliveryAddress || '-',
          time: l.createdAt ? (l.createdAt.toLocaleString?.() || new Date(l.createdAt).toLocaleString()) : 'Just now',
          weight: l.weight ? `${l.weight} Kg` : '—',
          dimensions: l.dimensions || '—',
          vehicleType: l.truckType || 'Truck',
          shipper: {
            name: l.shipperName || 'Shipper',
            rating: l.shipperRating || 4.5,
            deliveries: l.shipperDeliveries || 0,
          },
          priceRange: typeof l.fareOffer === 'number' ? `₦${(l.fareOffer.toLocaleString?.() || l.fareOffer)}` : (l.fareOffer || '—'),
          minPrice: typeof l.fareOffer === 'number' ? l.fareOffer : 0,
          maxPrice: typeof l.fareOffer === 'number' ? l.fareOffer : 0,
        }));
        setAvailableLoads(ui);
      } else {
        if (emptyClearTimeoutRef.current) {
          clearTimeout(emptyClearTimeoutRef.current);
        }
        emptyClearTimeoutRef.current = setTimeout(() => {
          setAvailableLoads([]);
          emptyClearTimeoutRef.current = null;
        }, 800);
      }
    }, {});

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (emptyClearTimeoutRef.current) {
        clearTimeout(emptyClearTimeoutRef.current);
        emptyClearTimeoutRef.current = null;
      }
    };
  }, []);

  // Animate modal entrance
  useEffect(() => {
    if (showDetailsModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(300);
    }
  }, [showDetailsModal]);

  const LoadCard = ({ load }) => (
    <TouchableOpacity
      style={styles.loadCard}
      onPress={() => {
        setSelectedLoad(load);
        setShowDetailsModal(true);
      }}
      activeOpacity={0.95}
    >
      <View style={styles.routeContainer}>
        <View style={styles.routeIconWrapper}>
          <Text style={styles.routeIcon}>🚛</Text>
        </View>
        <Text style={styles.routeText}>{load.route}</Text>
      </View>
      
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>⏰</Text>
          <Text style={styles.detailText}>{load.time}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📦</Text>
          <Text style={styles.detailText}>{load.weight}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>🚚</Text>
          <Text style={styles.detailText}>{load.vehicleType}</Text>
        </View>
      </View>
      
      <View style={styles.shipperContainer}>
        <View style={styles.shipperAvatar}>
          <Text style={styles.shipperInitials}>
            {load.shipper.name.split(' ').map(word => word[0]).join('')}
          </Text>
        </View>
        <View style={styles.shipperInfo}>
          <Text style={styles.shipperName}>{load.shipper.name}</Text>
          <View style={styles.shipperStats}>
            <Text style={styles.rating}>⭐ {load.shipper.rating}</Text>
            <Text style={styles.deliveries}>{load.shipper.deliveries} successful deliveries</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.priceText}>{load.priceRange}</Text>
        <View style={styles.viewDetailsButton}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Image source={emptyloadboard2} style={styles.emptyStateImage} />
      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={() => {
          setSearchQuery('');
          clearAllFilters();
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.refreshButtonText}>REFRESH</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={clearAllFilters} activeOpacity={0.8}>
        <Text style={styles.removeFiltersText}>REMOVE FILTERS</Text>
      </TouchableOpacity>
    </View>
  );

  const DetailsModal = () => {
    if (!selectedLoad) return null;

    const fareOptions = ['NGN 15,500', 'NGN 16,000', 'NGN 17,000', 'NGN 18,000'];

    return (
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowDetailsModal(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDetailsModal(false)}
        >
          <TouchableOpacity
            style={styles.detailsModalWrapper}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <Animated.View
              style={[
                styles.detailsModalContent,
                {
                  opacity: fadeAnim,
                  transform: [{translateY: slideAnim}],
                },
              ]}
            >
              <View style={styles.modalPullBar} />
              <View style={styles.detailsHeader}>
                <TouchableOpacity 
                  onPress={() => setShowDetailsModal(false)}
                  style={styles.backButtonModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.detailsTitle}>{selectedLoad.route}</Text>
                <View style={styles.headerSpacer} />
              </View>

              <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
              >
                <ScrollView 
                  style={styles.detailsScrollView} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.detailsScrollContent}
                >
                  <View style={styles.mapContainer}>
                    <View style={styles.mapPlaceholder}>
                      <Image source={require('../../assets/mini-map-2.png')} style={styles.mapImage} />
                    </View>
                  </View>

                  <View style={styles.detailsInfo}>
                    <View style={styles.detailsIconRow}>
                      <View style={styles.detailsIconContainer}>
                        <View style={styles.iconBadge}>
                          <Text style={styles.detailsIcon}>📦</Text>
                        </View>
                        <Text style={styles.detailsLabel}>{selectedLoad.weight}</Text>
                      </View>
                      <View style={styles.detailsIconContainer}>
                        <View style={styles.iconBadge}>
                          <Text style={styles.detailsIcon}>📐</Text>
                        </View>
                        <Text style={styles.detailsLabel}>{selectedLoad.dimensions || '12"x12"'}</Text>
                      </View>
                      <View style={styles.detailsIconContainer}>
                        <View style={styles.iconBadge}>
                          <Text style={styles.detailsIcon}>🚚</Text>
                        </View>
                        <Text style={styles.detailsLabel}>{selectedLoad.vehicleType}</Text>
                      </View>
                      <View style={styles.detailsIconContainer}>
                        <View style={styles.iconBadge}>
                          <Text style={styles.detailsIcon}>⏰</Text>
                        </View>
                        <Text style={styles.detailsLabel}>{selectedLoad.time.split(',')[1]}</Text>
                      </View>
                    </View>

                    <View style={styles.contactButtons}>
                      <TouchableOpacity style={styles.callButton} activeOpacity={0.8}>
                        <Text style={styles.callIcon}>📞</Text>
                        <Text style={styles.callText}>Call driver</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.messageButton} activeOpacity={0.8}>
                        <Text style={styles.messageIcon}>💬</Text>
                        <Text style={styles.messageText}>Message</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.fareSection}>
                      <View style={styles.fareDetailsRow}>
                        <View style={styles.fareDetailItem}>
                          <Text style={styles.fareDetailLabel}>Pickup</Text>
                          <Text style={styles.fareDetailValue}>
                            {selectedLoad.pickupAddress}
                          </Text>
                        </View>
                        <View style={styles.fareDetailItem}>
                          <Text style={styles.fareDetailLabel}>Delivery</Text>
                          <Text style={styles.fareDetailValue}>
                            {selectedLoad.deliveryAddress}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.fareOfferedLabel}>Offered fare</Text>
                      <Text style={styles.fareOfferedValue}>
                        {selectedLoad.priceRange}
                      </Text>

                      <Text style={styles.fareLabel}>Fare</Text>
                      <TextInput
                        style={styles.fareInput}
                        placeholder="Enter your fare"
                        placeholderTextColor="#999"
                        value={customFare}
                        onChangeText={setCustomFare}
                        keyboardType="numeric"
                      />
                      
                      <Text style={styles.preferredFareLabel}>Or select your preferred fare offer</Text>
                      
                      <View style={styles.fareOptions}>
                        {fareOptions.map((fare, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.fareOption,
                              selectedFare === fare && styles.fareOptionSelected
                            ]}
                            onPress={() => setSelectedFare(fare)}
                            activeOpacity={0.8}
                          >
                            <Text style={[
                              styles.fareOptionText,
                              selectedFare === fare && styles.fareOptionTextSelected
                            ]}>
                              {fare}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity style={styles.sendOfferButton} activeOpacity={0.9}
                        onPress={async () => {
                          try {
                            const driverId = user?.uid || auth().currentUser?.uid;
                            if (!driverId) return;

                            // Submit a bid using the new bidding system
                            const res = await firebaseLoadsService.submitBid(
                              selectedLoad._loadId || selectedLoad.id,
                              driverId,
                              customFare || selectedFare || null,
                              '' // message can be added later if needed
                            );
                            if (!res?.success) throw new Error(res?.error || 'Failed to submit bid');

                            // Show success message
                            Alert.alert(
                              'Bid Submitted',
                              'Your bid has been submitted successfully. The shipper will review it and get back to you.',
                              [{ text: 'OK', onPress: () => setShowDetailsModal(false) }]
                            );
                          } catch (e) {
                            console.error('Submit bid error:', e);
                            Alert.alert('Error', 'Failed to submit bid. Please try again.');
                          }
                        }}
                      >
                        <Text style={styles.sendOfferText}>SUBMIT BID</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  const FilterModal = () => {
    const [tempFilters, setTempFilters] = useState(filters);

    const handleFilterChange = (filterType, value) => {
      setTempFilters({...tempFilters, [filterType]: value});
    };

    const applyFilters = () => {
      setFilters(tempFilters);
      setShowFilterModal(false);
    };

    const handleBackdropPress = (e) => {
      // Only close if the press is on the backdrop, not on the modal content
      if (e.target === e.currentTarget) {
        setShowFilterModal(false);
      }
    };

    const clearTempFilters = () => {
      const clearedFilters = {
        vehicleType: '',
        minPrice: '',
        maxPrice: '',
        route: '',
        minRating: ''
      };
      setTempFilters(clearedFilters);
    };

    return (
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity 
          style={styles.filterModalOverlay} 
          activeOpacity={1}
          onPress={handleBackdropPress}
        > 
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Loads</Text>
              <TouchableOpacity 
                onPress={() => {
                  setTempFilters(filters);
                  setShowFilterModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Vehicle Type</Text>
                <View style={styles.filterOptions}>
                  {['All', 'Truck', 'Van', 'Bike'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOption,
                        tempFilters.vehicleType === (type === 'All' ? '' : type) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterChange('vehicleType', type === 'All' ? '' : type)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        tempFilters.vehicleType === (type === 'All' ? '' : type) && styles.filterOptionTextActive
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Price Range</Text>
                <View style={styles.priceInputContainer}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Min Price"
                    placeholderTextColor="#999"
                    value={tempFilters.minPrice}
                    onChangeText={(text) => handleFilterChange('minPrice', text)}
                    keyboardType="numeric"
                  />
                  <Text style={styles.priceInputSeparator}>-</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Max Price"
                    placeholderTextColor="#999"
                    value={tempFilters.maxPrice}
                    onChangeText={(text) => handleFilterChange('maxPrice', text)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Minimum Rating</Text>
                <View style={styles.filterOptions}>
                  {['All', '4.0+', '4.5+', '4.8+'].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[
                        styles.filterOption,
                        tempFilters.minRating === (rating === 'All' ? '' : rating) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterChange('minRating', rating === 'All' ? '' : rating)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        tempFilters.minRating === (rating === 'All' ? '' : rating) && styles.filterOptionTextActive
                      ]}>
                        {rating}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.clearFiltersButton} 
                onPress={clearTempFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyFiltersButton} 
                onPress={applyFilters}
                activeOpacity={0.9}
              >
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  const clearAllFilters = () => {
    setFilters({
      vehicleType: '',
      minPrice: '',
      maxPrice: '',
      route: '',
      minRating: ''
    });
    setSearchQuery('');
  };

  const applyFiltersToLoads = (loads) => {
    return loads.filter(load => {
      const matchesSearch = 
        load.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.shipper.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesVehicleType = !filters.vehicleType || load.vehicleType === filters.vehicleType;

      const matchesPrice = (!filters.minPrice || load.minPrice >= parseInt(filters.minPrice)) &&
                          (!filters.maxPrice || load.maxPrice <= parseInt(filters.maxPrice));

      const matchesRating = !filters.minRating || 
                           load.shipper.rating >= parseFloat(filters.minRating.replace('+', ''));

      return matchesSearch && matchesVehicleType && matchesPrice && matchesRating;
    });
  };

  const filteredLoads = applyFiltersToLoads(availableLoads);
  const hasActiveFilters = Object.values(filters).some(filter => filter !== '') || searchQuery !== '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Image source={back} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Load Board</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Image source={search} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Load Board"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.8}
        >
          <Image source={filter} style={styles.filterIcon} />
          {hasActiveFilters && <View style={styles.filterBadge} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} activeOpacity={0.8}>
          <Image source={menu} style={styles.menuIcon} />
        </TouchableOpacity>
      </View>
      
      {filteredLoads.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.loadsList}
          showsVerticalScrollIndicator={false}
        >
          {filteredLoads.map((load) => (
            <LoadCard key={load.id} load={load} />
          ))}
        </ScrollView>
      )}

      <FilterModal />
      <DetailsModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'start',
  },
  headerSpacer: {
    width: 36,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  searchIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#333',
  },
  filterIconActive: {
    color: '#FFF',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  menuButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#333',
  },
  scrollView: {
    flex: 1,
  },
  loadsList: {
    padding: 16,
    paddingBottom: 100,
  },
  loadCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  routeIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  routeIcon: {
    fontSize: 16,
  },
  routeText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '400',
  },
  shipperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  shipperAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shipperInitials: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shipperInfo: {
    flex: 1,
  },
  shipperName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shipperStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 13,
    color: '#333',
    marginRight: 12,
    fontWeight: '500',
  },
  deliveries: {
    fontSize: 13,
    color: '#666',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  viewDetailsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  viewDetailsText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateImage: {
    width: 300,
    height: 300,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 80,
    borderRadius: 8,
    marginBottom: 16,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  removeFiltersText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Filter Modal Styles
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 4,
  },
  filterContent: {
    padding: 20,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#FFF',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  priceInputSeparator: {
    marginHorizontal: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingVertical: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  clearFiltersText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyFiltersButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
  },
  applyFiltersText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Details Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailsModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailsModalWrapper: {
    height: '80%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  detailsModalContent: {
    flex: 1,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalPullBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D0D0D0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  detailsHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  detailsScrollView: {
    flex: 1,
  },
  detailsScrollContent: {
    paddingBottom: 30,
  },
  mapContainer: {
    height: 150,
    backgroundColor: '#F0F0F0',
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailsInfo: {
    padding: 20,
  },
  detailsIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  detailsIconContainer: {
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsIcon: {
    fontSize: 24,
  },
  detailsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  contactButtons: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginRight: 10,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  callIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  callText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginLeft: 10,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  messageIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  fareSection: {
    marginTop: 10,
  },
  fareDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fareDetailItem: {
    flex: 1,
    marginRight: 8,
  },
  fareDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  fareDetailValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  fareOfferedLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
  },
  fareOfferedValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  fareLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  fareInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    color: '#333',
  },
  preferredFareLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  fareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  fareOption: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginHorizontal: 3,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  fareOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  fareOptionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  fareOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  sendOfferButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  sendOfferText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DriverLoadBoardScreen;