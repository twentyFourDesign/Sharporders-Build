import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import {useAppContext} from '../../context/AppContext';
import {firebaseLoadsService} from '../../services/firebase/loadsService';

const DriverSearchScreen = ({navigation, route}) => {
  const {
    showDriverSelection,
    setShowDriverSelection,
    showPaymentModal,
    setShowPaymentModal,
    drivers,
  } = useAppContext();

  const [interestedDrivers, setInterestedDrivers] = useState([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [currentLoad, setCurrentLoad] = useState(null);
  const [bids, setBids] = useState([]);
  const [searchProgress, setSearchProgress] = useState(0);
  const [visibleDrivers, setVisibleDrivers] = useState([]);
  const [showNewBidNotification, setShowNewBidNotification] = useState(false);
  const [lastBidCount, setLastBidCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const loadId = route?.params?.loadId;
  const startSearching = route?.params?.startSearching;

  // Handle startSearching parameter from LoadBoard navigation
  useEffect(() => {
    if (startSearching) {
      console.log('🚀 Starting search for drivers immediately!');
      setIsSearching(true);

      // Reset searching state after a short delay
      setTimeout(() => {
        setIsSearching(false);
      }, 2000);
    }
  }, [startSearching]);

  // Subscribe to this load to detect driver applications/bids
  useEffect(() => {
    if (!loadId) return;

    const unsubscribeLoad = firebaseLoadsService.subscribeToLoad(
      loadId,
      load => {
        setCurrentLoad(load);
        console.log('Load updated:', load);

        // If load status changed to accepted, navigate to driver found
        if (load && load.status === 'accepted') {
          navigation.navigate('DriverFound', {loadId, load});
        }
      },
    );

    // Subscribe to bids for this load
    const unsubscribeBids = firebaseLoadsService.subscribeToLoadBids(
      loadId,
      bidsData => {
        setBids(bidsData);
        console.log('Bids updated:', bidsData);

        // Show notification for new bids
        if (bidsData.length > lastBidCount && lastBidCount > 0) {
          setShowNewBidNotification(true);
          setTimeout(() => setShowNewBidNotification(false), 3000);
        }
        setLastBidCount(bidsData.length);
      },
    );

    return () => {
      unsubscribeLoad && unsubscribeLoad();
      unsubscribeBids && unsubscribeBids();
    };
  }, [loadId]);

  // Fetch interested drivers when bids update
  useEffect(() => {
    const fetchInterestedDrivers = async () => {
      if (bids.length === 0) {
        setInterestedDrivers([]);
        setIsLoadingDrivers(false);
        return;
      }

      setIsLoadingDrivers(true);
      try {
        const driverPromises = bids.map(async bid => {
          try {
            const driverResult = await firebaseLoadsService.getDriverById(
              bid.driverId,
            );
            if (driverResult.success) {
              return {
                id: bid.driverId,
                name:
                  driverResult.data.name ||
                  driverResult.data.companyName ||
                  driverResult.data.displayName ||
                  'Driver',
                rating: driverResult.data.rating || '4.5',
                deliveries: driverResult.data.completedDeliveries || 0,
                price: bid.offerAmount,
                time: bid.createdAt
                  ? new Date(bid.createdAt).toLocaleTimeString()
                  : 'Just now',
                bidId: bid.id,
                bidStatus: bid.status,
                avatar: driverResult.data.avatar || null,
              };
            }
          } catch (error) {
            console.error(`Error fetching driver ${bid.driverId}:`, error);
          }
          return null;
        });

        const driversData = (await Promise.all(driverPromises)).filter(
          driver => driver !== null,
        );
        setInterestedDrivers(driversData);
      } catch (error) {
        console.error('Error fetching interested drivers:', error);
        setInterestedDrivers([]);
      } finally {
        setIsLoadingDrivers(false);
      }
    };

    fetchInterestedDrivers();
  }, [bids]);

  const handleCancelRequest = () => {
    navigation.navigate('LoadBoard');
  };

  const handleDriverFound = () => {
    navigation.navigate('DriverFound');
  };

  const getBidStatusColor = status => {
    switch (status) {
      case 'accepted':
        return '#4CAF50';
      case 'rejected':
        return '#FF0000';
      case 'pending':
        return '#FF8C00';
      default:
        return '#666';
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
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Map Area */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          {/* Centered Pickup Location */}
          <View style={styles.pickupCircle}>
            <Image
              source={require('../../assets/pickup.png')}
              style={styles.pickupImage}
            />
          </View>
        </View>
      </View>

      {/* New Bid Notification */}
      {showNewBidNotification && (
        <View style={styles.newBidNotification}>
          <Text style={styles.notificationText}>🎉 New driver interested!</Text>
        </View>
      )}

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <Text style={styles.searchingTitle}>Looking for available drivers</Text>
        <Text style={styles.searchingSubtitle}>
          {isSearching
            ? '🚀 Actively searching for drivers...'
            : interestedDrivers.length > 0
            ? `${interestedDrivers.length} driver${
                interestedDrivers.length > 1 ? 's' : ''
              } interested`
            : isLoadingDrivers
            ? 'Loading driver information...'
            : 'Waiting for drivers to respond...'}
        </Text>

        <View style={styles.driversRow}>
          <Text style={styles.driversCount}>
            {interestedDrivers.length > 0
              ? `${interestedDrivers.length} driver${
                  interestedDrivers.length > 1 ? 's' : ''
                } considering your load`
              : 'Searching for drivers...'}
          </Text>
          <View style={styles.driverAvatars}>
            {interestedDrivers.slice(0, 4).map((driver, index) => (
              <View key={driver.id} style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {driver.name
                    .split(' ')
                    .map(word => word[0])
                    .join('')}
                </Text>
              </View>
            ))}
            {interestedDrivers.length === 0 && (
              <>
                <View style={styles.avatar} />
                <View style={styles.avatar} />
                <View style={styles.avatar} />
                <View style={styles.avatar} />
              </>
            )}
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: isSearching ? '100%' : `${searchProgress}%`,
                backgroundColor: isSearching ? '#4CAF50' : '#00BFFF',
              },
            ]}
          />
        </View>

        <Text style={styles.fareOffer}>
          Your load fare: ₦
          {currentLoad?.fareOffer?.toLocaleString() || '10,000'}
        </Text>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelRequest}>
          <Text style={styles.cancelButtonText}>CANCEL REQUEST</Text>
        </TouchableOpacity>
      </View>

      {/* Interested Drivers Cards */}
      {interestedDrivers.map((driver, index) => (
        <View
          key={driver.id}
          style={[
            styles.driverNotificationCard,
            {
              bottom: 120 + index * 85,
              borderLeftWidth: 4,
              borderLeftColor: getBidStatusColor(driver.bidStatus),
            },
          ]}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>
              {driver.avatar
                ? '👤'
                : driver.name
                    .split(' ')
                    .map(word => word[0])
                    .join('')}
            </Text>
          </View>
          <View style={styles.driverInfo}>
            <View style={styles.driverHeader}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <Text
                style={[
                  styles.bidStatus,
                  {color: getBidStatusColor(driver.bidStatus)},
                ]}>
                {getBidStatusText(driver.bidStatus)}
              </Text>
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.driverRating}>⭐ {driver.rating}</Text>
              <Text style={styles.deliveriesText}>
                {driver.deliveries} deliveries
              </Text>
            </View>
            <Text style={styles.driverTime}>{driver.time}</Text>
            <Text style={styles.driverPrice}>
              ₦{driver.price.toLocaleString()}
            </Text>
          </View>
          <View style={styles.driverActions}>
            {driver.bidStatus === 'pending' && (
              <>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => {
                    // Handle bid rejection
                    Alert.alert(
                      'Decline Bid',
                      `Decline bid from ${driver.name}?`,
                      [
                        {text: 'Cancel', style: 'cancel'},
                        {
                          text: 'Decline',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await firebaseLoadsService.rejectBid(
                                driver.bidId,
                                loadId,
                                driver.id,
                              );
                              Alert.alert(
                                'Success',
                                'Bid declined successfully',
                              );
                            } catch (error) {
                              Alert.alert('Error', 'Failed to decline bid');
                            }
                          },
                        },
                      ],
                    );
                  }}>
                  <Text style={styles.declineButtonText}>DECLINE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={async () => {
                    try {
                      await firebaseLoadsService.acceptBid(
                        driver.bidId,
                        loadId,
                        driver.id,
                      );
                      Alert.alert(
                        'Success',
                        `Accepted bid from ${driver.name}!`,
                        [
                          {
                            text: 'OK',
                            onPress: () =>
                              navigation.navigate('DriverFound', {
                                loadId,
                                load: currentLoad,
                              }),
                          },
                        ],
                      );
                    } catch (error) {
                      Alert.alert('Error', 'Failed to accept bid');
                    }
                  }}>
                  <Text style={styles.acceptButtonText}>ACCEPT</Text>
                </TouchableOpacity>
              </>
            )}
            {driver.bidStatus === 'accepted' && (
              <Text style={[styles.statusText, {color: '#4CAF50'}]}>
                ACCEPTED
              </Text>
            )}
            {driver.bidStatus === 'rejected' && (
              <Text style={[styles.statusText, {color: '#FF0000'}]}>
                REJECTED
              </Text>
            )}
          </View>
        </View>
      ))}

      {/* No Drivers Message */}
      {interestedDrivers.length === 0 && searchProgress === 100 && (
        <View style={styles.noDriversCard}>
          <Text style={styles.noDriversTitle}>No drivers yet</Text>
          <Text style={styles.noDriversMessage}>
            No drivers have shown interest in your load yet. This could take a
            few minutes.
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => setSearchProgress(0)}>
            <Text style={styles.refreshButtonText}>SEARCH AGAIN</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: '#00BFFF',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  mapPlaceholder: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0, 191, 255, 0.2)',
    borderWidth: 4,
    borderColor: '#00BFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00BFFF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pickupImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  newBidNotification: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deliveryLocation: {
    position: 'absolute',
    top: '20%',
    right: '10%',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveryLabel: {
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
  },
  bottomCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  searchingSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  driversRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  driversCount: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  driverAvatars: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    marginLeft: -4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00BFFF',
    borderRadius: 3,
  },
  fareOffer: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#00BFFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backdrop: {
    flex: 1,
  },
  paymentBackdrop: {
    flex: 1,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  driverNotificationCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    height: 75,
  },
  driversList: {
    flex: 1,
  },
  driversScrollContent: {
    paddingBottom: 20,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  driverAvatarText: {
    fontSize: 16,
  },
  driverInfo: {
    flex: 1,
    marginRight: 8,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  bidStatus: {
    fontSize: 10,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  driverRating: {
    fontSize: 11,
    color: '#333333',
    marginRight: 6,
  },
  deliveriesText: {
    fontSize: 10,
    color: '#666666',
  },
  driverTime: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 2,
  },
  driverPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  driverActions: {
    alignItems: 'flex-end',
  },
  declineButton: {
    borderWidth: 1,
    borderColor: '#00BFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#00BFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#00BFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    minWidth: 70,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  noDriversCard: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  noDriversTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  noDriversMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: '#00BFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  paymentModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    height: '45%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 24,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#00BFFF',
    borderRadius: 8,
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 16,
    color: '#333333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 32,
  },
  paystackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paystackLogo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00BFFF',
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00BFFF',
  },
  confirmPayButton: {
    backgroundColor: '#00BFFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmPayButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DriverSearchScreen;
