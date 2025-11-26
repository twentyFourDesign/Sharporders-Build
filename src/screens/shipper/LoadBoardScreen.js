import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import {useAppContext} from '../../context/AppContext';
import {useAuth} from '../../context/AuthContext';
import {
  realTimeService,
  firebaseLoadsService,
  firebaseShipmentsService,
} from '../../services/firebase';
import back from '../../assets/icons/back.png';
import emptyStateImage from '../../assets/empty-load-board.png';
import search from '../../assets/icons/search.png';

const LoadBoardScreen = ({navigation}) => {
  const {
    formData,
    loads,
    addLoad,
    showLoadDrawer,
    setShowLoadDrawer,
    selectedLoad,
    setSelectedLoad,
  } = useAppContext();
  const {user} = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [bids, setBids] = useState([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [myLoads, setMyLoads] = useState([]);
  const emptyClearTimeoutRef = useRef(null);

  // Subscribe to load changes in real-time to detect new applications
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = realTimeService.subscribeToUserLoads(
      user.uid,
      loads => {
        const list = Array.isArray(loads) ? loads : [];
        if (list.length > 0) {
          if (emptyClearTimeoutRef.current) {
            clearTimeout(emptyClearTimeoutRef.current);
            emptyClearTimeoutRef.current = null;
          }
          setMyLoads(list);
        } else {
          if (emptyClearTimeoutRef.current) {
            clearTimeout(emptyClearTimeoutRef.current);
          }
          emptyClearTimeoutRef.current = setTimeout(() => {
            setMyLoads([]);
            emptyClearTimeoutRef.current = null;
          }, 800);
        }
      },
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (emptyClearTimeoutRef.current) {
        clearTimeout(emptyClearTimeoutRef.current);
        emptyClearTimeoutRef.current = null;
      }
    };
  }, [user?.uid]);

  const closeDrawer = () => {
    setShowLoadDrawer(false);
    setSelectedLoad(null);
    setBids([]);
  };

  const handleViewBids = async load => {
    // Prevent multiple calls
    if (showLoadDrawer || loadingBids) {
      console.log('Modal already open or loading, ignoring...');
      return;
    }

    console.log('Opening bids modal for load:', load.id);

    setSelectedLoad(load);
    setShowLoadDrawer(true);
    setLoadingBids(true);

    try {
      // Get all bids for this load
      console.log('Fetching bids for load:', load.id);
      const bidsResult = await firebaseLoadsService.getBidsForLoad(load.id);

      console.log('Bids fetch result:', bidsResult);

      if (bidsResult.success && bidsResult.data && bidsResult.data.length > 0) {
        const bidsData = await Promise.all(
          bidsResult.data.map(async bid => {
            try {
              // Get driver information for each bid
              const driverResult = await firebaseLoadsService.getDriverById(
                bid.driverId,
              );
              const driver = driverResult.success ? driverResult.data : null;

              return {
                id: bid.id,
                loadId: bid.loadId,
                driverId: bid.driverId,
                company: driver
                  ? driver.name ||
                    driver.companyName ||
                    driver.displayName ||
                    'Driver'
                  : 'Driver',
                amount: `₦${bid.offerAmount.toLocaleString()}`,
                rating: driver ? driver.rating || '4.5' : '4.5',
                deliveryTime: 'Applied for load',
                status: bid.status,
                message: bid.message || '',
                createdAt: bid.createdAt,
                driverData: driver,
              };
            } catch (error) {
              console.error('Error fetching driver for bid:', bid.id, error);
              return {
                id: bid.id,
                loadId: bid.loadId,
                driverId: bid.driverId,
                company: 'Error loading driver',
                amount: `₦${bid.offerAmount.toLocaleString()}`,
                rating: '—',
                deliveryTime: 'Error loading data',
                status: bid.status,
                message: bid.message || '',
                createdAt: bid.createdAt,
                isError: true,
              };
            }
          }),
        );

        setBids(bidsData);
        console.log('Bids data set:', bidsData);
      } else {
        console.log('No bids found, setting empty state');
        setBids([]);
      }
    } catch (error) {
      console.error('Error loading bids:', error);
      setBids([
        {
          id: 'error',
          company: 'Error loading bids',
          amount: '—',
          rating: '—',
          deliveryTime: 'Please try again',
          isError: true,
        },
      ]);
    } finally {
      setLoadingBids(false);
    }
  };

  const handleAcceptBid = async bid => {
    try {
      if (!selectedLoad) return;

      console.log('Accepting bid:', bid.id, 'for load:', selectedLoad.id);

      // Accept the bid using the new system
      const acceptResult = await firebaseLoadsService.acceptBid(
        bid.id,
        selectedLoad.id,
        bid.driverId,
      );
      if (!acceptResult.success) {
        throw new Error(acceptResult.error || 'Failed to accept bid');
      }

      // Create a shipment to start the flow
      const shipmentData = {
        loadId: selectedLoad.id,
        shipperId: user.uid,
        driverId: bid.driverId,
        pickupAddress:
          selectedLoad.pickupAddress ||
          selectedLoad.pickupLocation ||
          'Not specified',
        deliveryAddress:
          selectedLoad.deliveryAddress ||
          selectedLoad.deliveryLocation ||
          'Not specified',
        truckType: selectedLoad.truckType || 'Standard',
        weight: selectedLoad.weight || 'Not specified',
        dimensions: selectedLoad.dimensions || 'Not specified',
        fareOffer: bid.offerAmount, // Use the bid amount
        status: 'pending',
        driverAccepted: true,
        shipperAccepted: true,
        acceptedAt: new Date(),
        acceptedBidId: bid.id,
      };

      const shipmentResult = await firebaseShipmentsService.createShipment(
        shipmentData,
      );
      if (!shipmentResult.success) {
        throw new Error(shipmentResult.error || 'Failed to create shipment');
      }

      Alert.alert(
        'Success',
        `Bid accepted! Driver will be notified and shipment created.`,
        [
          {
            text: 'OK',
            onPress: () => {
              closeDrawer();
              // Navigate to DriverFound screen with the load and shipment info
              navigation.navigate('DriverFound', {
                loadId: selectedLoad.id,
                load: selectedLoad,
                shipmentId: shipmentResult.data.id,
                acceptedBidId: bid.id,
              });
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error accepting bid:', error);
      Alert.alert('Error', 'Failed to accept bid. Please try again.');
    }
  };

  const handleDeclineBid = async bid => {
    try {
      if (!selectedLoad) return;

      console.log('Declining bid:', bid.id, 'for load:', selectedLoad.id);

      // Reject the bid using the new system
      const rejectResult = await firebaseLoadsService.rejectBid(
        bid.id,
        selectedLoad.id,
        bid.driverId,
      );
      if (!rejectResult.success) {
        throw new Error(rejectResult.error || 'Failed to decline bid');
      }

      Alert.alert('Success', 'Bid declined successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Refresh the bids list
            if (selectedLoad) {
              handleViewBids(selectedLoad);
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Error declining bid:', error);
      Alert.alert('Error', 'Failed to decline bid. Please try again.');
    }
  };

  const handlePostLoad = async () => {
    if (!user) {
      return;
    }

    try {
      const loadData = {
        ...formData,
        shipperId: user.uid,
      };

      const result = await firebaseLoadsService.createLoad(loadData);

      if (!result?.success) {
        console.error('Error posting load:', result?.error);
        Alert.alert(
          'Error',
          result?.error || 'Failed to post load. Please try again.',
        );
        return;
      }

      console.log('Load posted successfully to Firestore:', result.data?.id);
      Alert.alert('Success', 'Your load has been posted to the loadboard.');
    } catch (error) {
      console.error('Error posting load:', error);
      Alert.alert('Error', 'Failed to post load. Please try again.');
    }
  };

  const getStatusColor = status => {
    switch ((status || '').toLowerCase()) {
      case 'available':
        return '#1E90FF';
      case 'applied':
        return '#FF8C00';
      case 'in_transit':
        return '#FFA500';
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#FF0000';
      default:
        return '#A0AEC0';
    }
  };

  const getStatusLabel = status => {
    switch ((status || '').toLowerCase()) {
      case 'in_transit':
        return 'In Transit';
      case 'completed':
        return 'Delivered';
      default:
        return status || 'Unknown';
    }
  };

  const onLoadPress = load => {
    const status = (load?.status || '').toLowerCase();
    if (status === 'applied') {
      navigation.navigate('DriverFound', {loadId: load.id, load});
    } else if (status === 'available') {
      // Navigate to DriverSearch and start searching for bids
      navigation.navigate('DriverSearch', {
        loadId: load.id,
        load: load,
        startSearching: true, // Flag to indicate search should start immediately
      });
    } else if (status === 'in_transit') {
      // Optionally navigate to a tracking/ongoing screen in future
    }
  };

  const LoadCard = ({load}) => {
    const pickup = load?.pickupAddress || load?.pickupLocation || '-';
    const delivery = load?.deliveryAddress || load?.deliveryLocation || '-';
    const fare =
      typeof load?.fareOffer === 'number'
        ? `₦${load.fareOffer.toLocaleString?.() || load.fareOffer}`
        : load?.fareOffer || '—';
    const statusLabel = getStatusLabel(load?.status);

    // Determine bid count from bidders array or bidCount field
    const bidCount =
      typeof load?.bidCount === 'number'
        ? load.bidCount
        : Array.isArray(load?.bidders)
        ? load.bidders.length
        : 0;

    // Check if load has bids using actual count
    const hasBids = bidCount > 0;

    return (
      <TouchableOpacity onPress={() => onLoadPress(load)} activeOpacity={0.9}>
        <View style={styles.loadCard}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: getStatusColor(load.status)},
              ]}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>

          <Text style={styles.loadTitle}>
            {pickup} → {delivery}
          </Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🚚</Text>
              <Text style={styles.detailText}>
                {load?.truckType || 'Truck'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>💰</Text>
              <Text style={styles.detailText}>{fare}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>👨‍✈️</Text>
              <Text style={styles.detailText}>
                {hasBids
                  ? `${bidCount} bid${bidCount > 1 ? 's' : ''}`
                  : 'No bids yet'}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.priceInfo}>
              <Text style={styles.bidsText}>
                Created:{' '}
                {load?.createdAt
                  ? load.createdAt.toLocaleString?.() ||
                    new Date(load.createdAt).toLocaleString()
                  : '—'}
              </Text>
            </View>
            {hasBids && (
              <TouchableOpacity
                style={styles.viewBidsButton}
                onPress={() => handleViewBids(load)}>
                <Text style={styles.viewBidsText}>View Bids</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Empty State Component
  const EmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Image source={emptyStateImage} style={styles.emptyStateImage} />
    </View>
  );

  const BidsDrawer = () => {
    // Don't render if no load is selected or modal shouldn't be shown
    if (!selectedLoad || !showLoadDrawer) {
      return null;
    }

    const pendingBids = bids.filter(bid => bid.status === 'pending');
    const acceptedBids = bids.filter(bid => bid.status === 'accepted');
    const rejectedBids = bids.filter(bid => bid.status === 'rejected');
    const hasValidBids = bids.length > 0 && !bids[0]?.isError;

    const getBidStatusColor = status => {
      switch (status) {
        case 'accepted':
          return '#4CAF50';
        case 'rejected':
          return '#FF0000';
        case 'pending':
          return '#FF8C00';
        default:
          return '#A0AEC0';
      }
    };

    const getBidStatusText = status => {
      switch (status) {
        case 'accepted':
          return 'ACCEPTED';
        case 'rejected':
          return 'REJECTED';
        case 'pending':
          return 'PENDING';
        default:
          return 'UNKNOWN';
      }
    };

    return (
      <Modal
        visible={showLoadDrawer}
        animationType="slide"
        transparent={true}
        onRequestClose={closeDrawer}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeDrawer}>
          <TouchableOpacity
            style={styles.drawerContainer}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}>
            <View style={styles.drawerHandle} />

            <ScrollView style={styles.drawerContent}>
              {selectedLoad && (
                <View style={styles.bidsSection}>
                  {loadingBids ? (
                    <Text style={styles.loadingText}>Loading bids...</Text>
                  ) : hasValidBids ? (
                    <>
                      {/* Accepted Bids */}
                      {acceptedBids.length > 0 && (
                        <View style={styles.bidsGroup}>
                          <Text style={styles.bidsGroupTitle}>
                            ✅ Accepted Bids
                          </Text>
                          {acceptedBids.map(bid => (
                            <View
                              key={bid.id}
                              style={[styles.bidCard, styles.acceptedBidCard]}>
                              <View style={styles.bidHeader}>
                                <Text
                                  style={[
                                    styles.bidStatus,
                                    {color: getBidStatusColor(bid.status)},
                                  ]}>
                                  {getBidStatusText(bid.status)}
                                </Text>
                              </View>
                              <View style={styles.bidContent}>
                                <View style={styles.bidLeft}>
                                  <View style={styles.driverAvatar}>
                                    <Text style={styles.driverInitials}>
                                      {bid.company
                                        .split(' ')
                                        .map(word => word[0])
                                        .join('')}
                                    </Text>
                                  </View>
                                  <View style={styles.driverInfo}>
                                    <Text style={styles.driverName}>
                                      {bid.company}
                                    </Text>
                                    <View style={styles.driverStats}>
                                      <Text style={styles.rating}>
                                        ⭐ {bid.rating}
                                      </Text>
                                      <Text style={styles.deliveries}>
                                        50 successful deliveries
                                      </Text>
                                    </View>
                                    <Text style={styles.deliveryTime}>
                                      {bid.deliveryTime}
                                    </Text>
                                    <Text style={styles.bidPrice}>
                                      {bid.amount}
                                    </Text>
                                    {bid.message && (
                                      <Text style={styles.bidMessage}>
                                        Message: {bid.message}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                                <View style={styles.bidActions}>
                                  <Text style={styles.acceptedText}>
                                    ACCEPTED
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Pending Bids */}
                      {pendingBids.length > 0 && (
                        <View style={styles.bidsGroup}>
                          <Text style={styles.bidsGroupTitle}>
                            ⏳ Pending Bids
                          </Text>
                          {pendingBids.map(bid => (
                            <View key={bid.id} style={styles.bidCard}>
                              <View style={styles.bidHeader}>
                                <Text
                                  style={[
                                    styles.bidStatus,
                                    {color: getBidStatusColor(bid.status)},
                                  ]}>
                                  {getBidStatusText(bid.status)}
                                </Text>
                              </View>
                              <View style={styles.bidContent}>
                                <View style={styles.bidLeft}>
                                  <View style={styles.driverAvatar}>
                                    <Text style={styles.driverInitials}>
                                      {bid.company
                                        .split(' ')
                                        .map(word => word[0])
                                        .join('')}
                                    </Text>
                                  </View>
                                  <View style={styles.driverInfo}>
                                    <Text style={styles.driverName}>
                                      {bid.company}
                                    </Text>
                                    <View style={styles.driverStats}>
                                      <Text style={styles.rating}>
                                        ⭐ {bid.rating}
                                      </Text>
                                      <Text style={styles.deliveries}>
                                        50 successful deliveries
                                      </Text>
                                    </View>
                                    <Text style={styles.deliveryTime}>
                                      {bid.deliveryTime}
                                    </Text>
                                    <Text style={styles.bidPrice}>
                                      {bid.amount}
                                    </Text>
                                    {bid.message && (
                                      <Text style={styles.bidMessage}>
                                        Message: {bid.message}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                                <View style={styles.bidActions}>
                                  <TouchableOpacity
                                    style={styles.declineButton}
                                    onPress={() => handleDeclineBid(bid)}>
                                    <Text style={styles.declineButtonText}>
                                      DECLINE
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.acceptButton}
                                    onPress={() => handleAcceptBid(bid)}>
                                    <Text style={styles.acceptButtonText}>
                                      ACCEPT
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Rejected Bids */}
                      {rejectedBids.length > 0 && (
                        <View style={styles.bidsGroup}>
                          <Text style={styles.bidsGroupTitle}>
                            ❌ Rejected Bids
                          </Text>
                          {rejectedBids.map(bid => (
                            <View
                              key={bid.id}
                              style={[styles.bidCard, styles.rejectedBidCard]}>
                              <View style={styles.bidHeader}>
                                <Text
                                  style={[
                                    styles.bidStatus,
                                    {color: getBidStatusColor(bid.status)},
                                  ]}>
                                  {getBidStatusText(bid.status)}
                                </Text>
                              </View>
                              <View style={styles.bidContent}>
                                <View style={styles.bidLeft}>
                                  <View style={styles.driverAvatar}>
                                    <Text style={styles.driverInitials}>
                                      {bid.company
                                        .split(' ')
                                        .map(word => word[0])
                                        .join('')}
                                    </Text>
                                  </View>
                                  <View style={styles.driverInfo}>
                                    <Text style={styles.driverName}>
                                      {bid.company}
                                    </Text>
                                    <View style={styles.driverStats}>
                                      <Text style={styles.rating}>
                                        ⭐ {bid.rating}
                                      </Text>
                                      <Text style={styles.deliveries}>
                                        50 successful deliveries
                                      </Text>
                                    </View>
                                    <Text style={styles.deliveryTime}>
                                      {bid.deliveryTime}
                                    </Text>
                                    <Text style={styles.bidPrice}>
                                      {bid.amount}
                                    </Text>
                                    {bid.message && (
                                      <Text style={styles.bidMessage}>
                                        Message: {bid.message}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                                <View style={styles.bidActions}>
                                  <Text style={styles.rejectedText}>
                                    REJECTED
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptyBidsContainer}>
                      <Text style={styles.emptyBidsTitle}>
                        {bids[0]?.isError
                          ? 'Error Loading Bids'
                          : 'No Bids Yet'}
                      </Text>
                      <Text style={styles.emptyBidsMessage}>
                        {bids[0]?.isError
                          ? 'There was an error loading the bid information. Please try again.'
                          : 'No drivers have submitted bids for this load yet.'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Dashboard')}>
          <Image style={styles.backIcon} source={back} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Load board</Text>
      </View>

      <View style={styles.searchContainer}>
        <Image source={search} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search loads..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.loadsList,
          myLoads.length === 0 && styles.emptyScrollView,
        ]}
        showsVerticalScrollIndicator={false}>
        {myLoads.length > 0 ? (
          myLoads
            .filter(l =>
              (l.pickupAddress || l.deliveryAddress || '')
                .toString()
                .toLowerCase()
                .includes(searchQuery.toLowerCase()),
            )
            .map(load => <LoadCard key={load.id} load={load} />)
        ) : (
          <EmptyState />
        )}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handlePostLoad}>
          <Text style={styles.buttonText}>POST NEW LOAD</Text>
        </TouchableOpacity>
      </View>

      <BidsDrawer />
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginRight: 10,
    color: '#666',
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIcon: {
    fontSize: 20,
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  loadsList: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyScrollView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateImage: {
    width: 300,
    height: 300,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  loadCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardHeader: {
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  loadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceInfo: {
    flex: 1,
  },
  bidsText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  viewBidsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  viewBidsText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // Bottom Sheet Drawer Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingBottom: 20,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  drawerHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  drawerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    paddingVertical: 20,
  },
  bidsGroup: {
    marginBottom: 24,
  },
  bidsGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bidStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  acceptedBidCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#F8FFF8',
  },
  rejectedBidCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF0000',
    backgroundColor: '#FFF8F8',
  },
  acceptedText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
  rejectedText: {
    color: '#FF0000',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
  bidMessage: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyBidsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyBidsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyBidsMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  closeEmptyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },
  closeEmptyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  bidsSection: {
    marginBottom: 24,
  },
  bidCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bidContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  driverAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverInitials: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  driverStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  rating: {
    fontSize: 13,
    color: '#333',
    marginRight: 8,
  },
  deliveries: {
    fontSize: 9,
    color: '#666',
  },
  deliveryTime: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  bidPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  bidActions: {
    flexDirection: 'column',
    gap: 8,
    minWidth: 90,
  },
  declineButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
    alignItems: 'center',
    minWidth: 85,
  },
  declineButtonText: {
    color: '#007AFF',
    fontSize: 11,
    fontWeight: '600',
  },
  acceptButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    minWidth: 85,
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default LoadBoardScreen;
