import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Image, Modal, Alert } from 'react-native';
import MapView from 'react-native-maps';
import pickup from '../../assets/pickup.png';
import { firebaseLoadsService, firebaseShipmentsService } from '../../services/firebase';

const DriverOnTheWayScreen = ({ route, navigation }) => {
  const { price = 'NGN 15,000', load, shipmentId } = route.params || {};
  const [showDropOffModal, setShowDropOffModal] = useState(false);
  const [showOnTheWayModal, setShowOnTheWayModal] = useState(true);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowBanner(false), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />

      {/* Map background */}
      <View style={{ flex: 1 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: 6.5244,
            longitude: 3.3792,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
        />

        {/* Temporary notifier banner similar to dashboard */}
        {showBanner && (
          <View style={styles.bannerContainer}>
            <View style={[styles.banner, { backgroundColor: '#00C896' }]}>
              <Text style={styles.bannerText}>You are on the way to pickup</Text>
            </View>
          </View>
        )}

        {/* Circular preview overlay (mock) */}
        <View style={styles.circlePreview}>
          <View style={styles.previewBadge}>
            <Image source={pickup} style={styles.previewBadgeIcon} />
          </View>
        </View>

        {/* Bottom card */}
        <View style={styles.bottomCard}>
              <View style={styles.handle} />

              <Text style={styles.heading}>You are on the way</Text>

              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.subHeading}>Estimated Arrival</Text>
                  <Text style={styles.address}>15 Bode Thomas Street, Surulere, Lagos</Text>
                </View>
                <Text style={styles.eta}>01:58</Text>
              </View>

              <View style={styles.shipperRow}>
                <Image
                  source={{ uri: 'https://i.pravatar.cc/100?img=68' }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shipperName}>{load?.customer || 'Kunle Alamu'}</Text>
                  <Text style={styles.shipperMeta}>Sharp Sand for Construction</Text>
                </View>
                <View style={styles.actionIcon}>
                  <Text style={styles.actionIconText}>📞</Text>
                </View>
                <View style={[styles.actionIcon, { marginLeft: 10 }]}>
                  <Text style={styles.actionIconText}>💬</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowDropOffModal(true)}>
                <Text style={styles.primaryBtnText}>I AM READY FOR DROP OFF</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setShowOnTheWayModal(false); navigation.goBack(); }}>
                <Text style={styles.cancelLink}>CANCEL REQUEST</Text>
              </TouchableOpacity>
            </View>
      </View>
      {/* Drop-off modal */}
      <Modal transparent animationType="slide" visible={showDropOffModal} onRequestClose={() => setShowDropOffModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Ready for drop-off?</Text>
            <Text style={styles.modalSubtitle}>Inform the shipper that you are ready to unload at the destination.</Text>
            <TouchableOpacity 
              style={styles.modalPrimaryBtn}
              onPress={async () => {
                try {
                  // Mark shipment completed
                  if (shipmentId) {
                    await firebaseShipmentsService.updateShipmentStatus(shipmentId, 'completed');
                  }
                  // Mark load completed
                  if (load?.id) {
                    await firebaseLoadsService.updateLoad(load.id, { status: 'completed' });
                  }
                } catch (e) {
                  console.error('Complete delivery error:', e);
                  Alert.alert('Error', e.message || 'Could not complete delivery, but proceeding to summary.');
                } finally {
                  setShowDropOffModal(false);
                  navigation.navigate('DriverDeliveryComplete', { price, load });
                }
              }}
            >
              <Text style={styles.modalPrimaryBtnText}>DROP OFF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDropOffModal(false)}>
              <Text style={styles.modalCloseLink}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  circlePreview: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadgeIcon: {
    width: 200,
    height: 200,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bannerContainer: { position: 'absolute', top: 100, left: 16, right: 16, zIndex: 10 },
  banner: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  bannerText: { color: '#fff', fontWeight: '700' },
  handle: {
    width: 62,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center',
    marginBottom: 12,
  },
  heading: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  subHeading: { fontSize: 14, color: '#6B7280' },
  address: { fontSize: 12, color: '#6B7280' },
  eta: { fontSize: 18, fontWeight: '700', color: '#111827' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  shipperRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  shipperName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  shipperMeta: { fontSize: 12, color: '#6B7280' },
  actionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E6F2FF', alignItems: 'center', justifyContent: 'center' },
  actionIconText: { fontSize: 16 },
  primaryBtn: { backgroundColor: '#007AFF', alignItems: 'center', paddingVertical: 14, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  cancelLink: { color: '#FF3B30', fontWeight: '700', textAlign: 'center', marginTop: 14 },
  // Modal styles
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  modalPrimaryBtn: { backgroundColor: '#007AFF', alignItems: 'center', paddingVertical: 14, borderRadius: 8, marginBottom: 10 },
  modalPrimaryBtnText: { color: '#fff', fontWeight: '700' },
  modalCloseLink: { color: '#007AFF', fontWeight: '700', textAlign: 'center', marginBottom: 8 },
});

export default DriverOnTheWayScreen;
