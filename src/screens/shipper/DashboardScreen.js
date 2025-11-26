import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import MapView from 'react-native-maps';
import hamburger from '../../assets/icons/hamburger.png';
import headset from '../../assets/icons/headset.png';
import help from '../../assets/icons/help.png';
import loadboard from '../../assets/icons/loadboard.png';
import logout from '../../assets/icons/logout.png';
import payments from '../../assets/icons/payments.png';
import search from '../../assets/icons/search.png';
import shipments from '../../assets/icons/shipments.png';
import DeliveryDetailsScreen from './DeliveryDetailsScreen';
import TripDetailsScreen from './TripDetailsScreen';

import {useAuth} from '../../context/AuthContext';

const BookingSearch = ({
  query,
  setQuery,
  searchLocation,
  onFocusSearch,
  onSuggestionPress,
}) => {
  const suggestions = [
    'Home',
    'Office',
    'Warehouse',
    'Airport',
    'Mall',
    'Harbor',
    'Central Park',
  ];
  const filtered = query
    ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : suggestions.slice(0, 4);
  return (
    <View>
      <Text style={styles.bookingTitle}>Book your delivery</Text>
      <TouchableOpacity
        style={styles.searchContainer}
        onPress={onFocusSearch}
        activeOpacity={0.7}>
        <Image source={search} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Who are we delivering to?"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchLocation}
          returnKeyType="search"
          onFocus={onFocusSearch}
          blurOnSubmit={false}
        />
      </TouchableOpacity>
      <ScrollView
        style={styles.suggestionsContainer}
        contentContainerStyle={styles.suggestionsContent}>
        {filtered.map(item => (
          <TouchableOpacity
            key={item}
            style={styles.suggestionItem}
            activeOpacity={0.7}
            onPress={() => onSuggestionPress?.(item)}>
            <Text style={styles.suggestionText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const {height, width: screenWidth} = Dimensions.get('window');

const DashboardScreen = ({navigation}) => {
  const {signOut, user} = useAuth();

  const handleLogout = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        // Navigation is handled by AuthContext
        console.log('Logout successful');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
      console.error('Logout error:', error);
    }
  };
  const bottomSheetHeight = Math.round(height * 0.8);
  const PEEK_HEIGHT = 400;
  const bottomSheetTranslateY = useRef(
    new Animated.Value(bottomSheetHeight - PEEK_HEIGHT),
  ).current;
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [address, setAddress] = useState(false);
  const DRAWER_WIDTH = Math.round(screenWidth * 0.75);
  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    bottomSheetTranslateY.setValue(bottomSheetHeight - PEEK_HEIGHT);
    setIsSheetOpen(false);
  }, [bottomSheetHeight]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', e => {
      const kh = e?.endCoordinates?.height || 0;
      setKeyboardHeight(kh);

      if (!isSheetOpen) {
        openBookingSheet();
      }
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isSheetOpen]);

  const openBookingSheet = () => {
    if (isSheetOpen) return;

    Animated.timing(bottomSheetTranslateY, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setIsSheetOpen(true));
  };

  const handleSuggestionPress = item => {
    setQuery(item);
    searchLocation();
    // Open delivery details step instead of navigating to a route
    setStep(1);
  };

  const closeBookingSheet = () => {
    Animated.timing(bottomSheetTranslateY, {
      toValue: bottomSheetHeight - PEEK_HEIGHT,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setIsSheetOpen(false));
  };

  const [region, setRegion] = useState({
    latitude: 6.5244,
    longitude: 3.3792,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [step, setStep] = useState(0);

  const [marker, setMarker] = useState({
    latitude: 6.5244,
    longitude: 3.3792,
  });

  const [query, setQuery] = useState('');
  const mapRef = useRef(null);

  const searchLocation = async () => {
    if (!query.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query,
        )}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'Sharporder/1.0 umerjaved3333@gmail.com', // required by Nominatim
            Accept: 'application/json',
          },
        },
      );

      const text = await response.text();
      console.log('Raw response:', text);
      const results = JSON.parse(text); // parse manually

      if (results.length > 0) {
        const {lat, lon, display_name} = results[0];
        const newRegion = {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

        setRegion(newRegion);
        setMarker({latitude: parseFloat(lat), longitude: parseFloat(lon)});
        mapRef.current?.animateToRegion(newRegion, 1000);
        Keyboard.dismiss();
        setTimeout(() => {
          setStep(1);
        }, 3000);
      } else {
        alert('No results found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Error fetching location');
    }
  };

  const onRegionChange = async value => {
    setAddress('Please wait...');
    fetch(
      'https://nominatim.openstreetmap.org/reverse?lat=' +
        value.latitude +
        '&lon=' +
        value.longitude +
        '&format=json',
    )
      .then(response => response.json())
      .then(async responseJson => {
        if (responseJson?.display_name != undefined) {
          let address = responseJson?.address;
          let pin_code = address?.postcode;
        } else {
          setAddress('Google can not fetch your location.');
        }
      });
  };

  const openSidePanel = () => {
    setShowSidePanel(true);

    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSidePanel = () => {
    overlayOpacity.setValue(0);

    Animated.timing(drawerTranslateX, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setShowSidePanel(false));
  };

  const [formData, setFormData] = useState({});

  const businessName =
    user?.businessName || user?.displayName || user?.email || 'Your business';

  const businessInitials = businessName
    .split(' ')
    .filter(Boolean)
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={{width: '100%', flex: 1}}
          initialRegion={region}
          onRegionChangeComplete={region => onRegionChange(region)}
          showsUserLocation={true}
          showsMyLocationButton={true}></MapView>
        {isSheetOpen && (
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeBookingSheet}
            style={[
              styles.sheetOverlay,
              {bottom: bottomSheetHeight - keyboardHeight},
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              height: bottomSheetHeight,
              bottom: -keyboardHeight,
              transform: [{translateY: bottomSheetTranslateY}],
            },
          ]}>
          <View style={styles.sheetHandle} />
          <ScrollView
            contentContainerStyle={{flexGrow: 1, padding: 16}}
            style={styles.bookingCard}
            keyboardShouldPersistTaps="always">
            {step === 0 ? (
              <BookingSearch
                query={query}
                setQuery={setQuery}
                searchLocation={searchLocation}
                onFocusSearch={openBookingSheet}
                onSuggestionPress={handleSuggestionPress}
              />
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>

      {showSidePanel && (
        <Animated.View
          style={[
            styles.overlay,
            {
              left: DRAWER_WIDTH,
              opacity: overlayOpacity,
            },
          ]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeSidePanel}
            style={{flex: 1}}
          />
        </Animated.View>
      )}
      <Animated.View
        pointerEvents={showSidePanel ? 'auto' : 'none'}
        style={[
          styles.drawerContainer,
          {
            width: DRAWER_WIDTH,
            transform: [{translateX: drawerTranslateX}],
          },
        ]}>
        <ScrollView contentContainerStyle={{paddingTop: 60}}>
          <View style={styles.drawerProfile}>
            <View style={styles.drawerAvatar}>
              <Text style={styles.drawerAvatarText}>{businessInitials}</Text>
            </View>
            <View style={styles.drawerInfo}>
              <Text style={styles.drawerBusinessName}>{businessName}</Text>
              <View style={styles.drawerRating}>
                <Text style={styles.drawerStar}>⭐</Text>
                <Text style={styles.drawerRatingText}>
                  {(user?.rating || 4.89).toString()}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.drawerMenu}>
            {[
              {
                id: 'payments',
                title: 'Payments',
                icon: payments,
                onPress: closeSidePanel,
              },
              {
                id: 'shipments',
                title: 'My shipments',
                icon: shipments,
                onPress: () => {
                  closeSidePanel();
                  navigation.navigate('MyShipments');
                },
              },
              {
                id: 'loadboard',
                title: 'Load board',
                icon: loadboard,
                onPress: () => {
                  closeSidePanel();
                  navigation.navigate('LoadBoard');
                },
              },
              {
                id: 'support',
                title: 'Support',
                icon: headset,
                onPress: closeSidePanel,
              },
              {
                id: 'about',
                title: 'About',
                icon: help,
                onPress: closeSidePanel,
              },
              {
                id: 'logout',
                title: 'Logout',
                icon: logout,
                onPress: handleLogout,
                isLogout: true,
              },
            ].map((item, idx, arr) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.drawerItem}
                  activeOpacity={0.7}
                  onPress={item.onPress}>
                  <Image source={item.icon} style={styles.menuIcon} />
                  <Text
                    style={[
                      styles.menuText,
                      item.isLogout && styles.logoutText,
                    ]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
                {idx < arr.length - 1 && (
                  <View style={styles.drawerSeparator} />
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      {!showSidePanel && (
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={openSidePanel}
          activeOpacity={0.7}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <View style={styles.hamburgerButtonContainer}>
            <Image source={hamburger} style={styles.hamburgerIcon} />
          </View>
        </TouchableOpacity>
      )}

      {/* Step Modals */}
      {step === 1 && (
        <DeliveryDetailsScreen
          visible={true}
          onClose={() => setStep(0)}
          onContinue={values => {
            setFormData(values);
            setStep(2);
          }}
        />
      )}
      {step === 2 && (
        <TripDetailsScreen
          formData={formData}
          visible={true}
          onClose={() => setStep(1)}
          setFormData={setFormData}
          navigation={navigation}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#ffffff'},
  mapContainer: {flex: 1},
  map: {flex: 1},
  bookingCard: {},
  bookingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
  },
  searchIcon: {width: 20, height: 20, marginRight: 10, color: '#999999'},
  searchInput: {flex: 1, fontSize: 16, color: '#333333'},
  hamburgerButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 20,
    zIndex: 30000,
    elevation: 20,
  },
  hamburgerButtonContainer: {
    width: 24,
    height: 24,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 20,
  },
  hamburgerIcon: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  hamburgerModalWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 60,
    left: 20,
    width: 64,
    height: 64,
    zIndex: 30000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20000,
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 300,
    backgroundColor: '#FFFFFF',
    zIndex: 25000,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
  },
  drawerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  drawerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B5A9F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  drawerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  drawerBusinessName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  drawerMenu: {
    paddingTop: 20,
  },
  drawerItem: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutText: {
    color: '#FF4444',
  },
  drawerSeparator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 60,
    marginRight: 20,
  },
  suggestionsContainer: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },
  drawerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerStar: {
    fontSize: 16,
    marginRight: 6,
  },
  drawerRatingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 5000,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: -2},
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 4000,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCC',
    alignSelf: 'center',
    marginVertical: 8,
  },
});

export default DashboardScreen;
