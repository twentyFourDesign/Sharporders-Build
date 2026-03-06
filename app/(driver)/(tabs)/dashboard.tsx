import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Shipment = {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  fareOffer: number;
  status: string;
};

type WalletSummary = {
  balance: number;
  completedTrips: number;
  platformDeduction: number;
  totalPayout: number;
};

export default function DriverDashboardScreen() {
  const { user, token } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("weekly");
  const [statsHidden, setStatsHidden] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission not granted.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch (e: any) {
      setLocationError(e?.message ?? "Could not fetch location.");
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [shipmentsData, walletData] = await Promise.all([
        apiFetch<Shipment[]>("/api/shipments", { method: "GET", token }),
        apiFetch<WalletSummary>("/api/driver/wallet", { method: "GET", token }),
      ]);
      setShipments(shipmentsData);
      setWallet(walletData);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    requestLocation();
  }, [fetchData, requestLocation]);

  const total = shipments.length;
  const active = shipments.filter(
    (s) => s.status !== "delivered" && s.status !== "cancelled",
  ).length;
  const delivered = shipments.filter((s) => s.status === "delivered").length;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const formatCurrency = (amount: number | null | undefined) =>
    `₦${(amount ?? 0).toLocaleString()}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Welcome back</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <View style={styles.avatarWrapper}>
          {user?.profilePhotoUrl ? (
            <Image
              source={{ uri: user.profilePhotoUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {user?.email?.[0]?.toUpperCase() ?? "D"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Driver actions */}
      <Text style={styles.sectionLabel}>As a driver</Text>
      <View style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() =>
            router.push({
              pathname: "/(driver)/(tabs)/load-board",
              params: { live: "1" },
            })
          }
        >
          <Text style={styles.primaryButtonText}>Go live & find loads</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push("/(driver)/(tabs)/shipments")}
        >
          <Text style={styles.secondaryButtonText}>My shipments</Text>
        </Pressable>
      </View>

      {/* Earnings + stats */}
      <View style={styles.statsHeaderRow}>
        <Text style={styles.sectionTitle}>Earnings & trips</Text>
        <Pressable
          style={styles.hideButton}
          onPress={() => setStatsHidden((prev) => !prev)}
        >
          <Text style={styles.hideButtonText}>
            {statsHidden ? "Show" : "Hide"}
          </Text>
        </Pressable>
      </View>

      {/* Stats filter row */}
      <View style={styles.statsFilterRow}>
        <View style={styles.filterPill}>
          {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
            <Pressable
              key={p}
              style={[
                styles.filterChip,
                statsPeriod === p && styles.filterChipActive,
              ]}
              onPress={() => setStatsPeriod(p)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statsPeriod === p && styles.filterChipTextActive,
                ]}
              >
                {p[0].toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Earnings + stats content */}
      <View style={styles.earningsRow}>
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Wallet balance</Text>
          <Text style={styles.earningsValue}>
            {statsHidden ? "••••••" : formatCurrency(wallet?.balance)}
          </Text>
          <Text style={styles.earningsHint}>Total available to withdraw</Text>
        </View>
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Total earned</Text>
          <Text style={styles.earningsValue}>
            {statsHidden ? "••••••" : formatCurrency(wallet?.totalPayout)}
          </Text>
          <Text style={styles.earningsHint}>All-time net earnings</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active</Text>
          <Text style={styles.statValue}>{statsHidden ? "••" : active}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statValue}>{statsHidden ? "••" : delivered}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total trips</Text>
          <Text style={styles.statValue}>{statsHidden ? "••" : total}</Text>
        </View>
      </View>

      {/* Recent shipments */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent shipments</Text>
        <Pressable onPress={() => router.push("/(driver)/(tabs)/shipments")}>
          <Text style={styles.sectionLink}>View all</Text>
        </Pressable>
      </View>

      {loading && total === 0 && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}
      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {!loading && !error && total === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No shipments yet.</Text>
          <Text style={styles.emptySubText}>
            Go live to start picking loads and earning.
          </Text>
        </View>
      )}
      {shipments.length > 0 && (
        <FlatList
          data={shipments.slice(0, 3)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardRoute}>
                {item.pickupAddress} → {item.deliveryAddress}
              </Text>
              <Text style={styles.cardMeta}>
                ₦{item.fareOffer.toLocaleString()}
              </Text>
              <Text style={styles.cardStatus}>{item.status}</Text>
            </View>
          )}
        />
      )}

      {/* Driver current location map */}
      <View style={styles.mapSection}>
        <View style={styles.mapHeaderRow}>
          <Text style={styles.sectionTitle}>My current location</Text>
          <Pressable
            style={styles.mapRefreshBtn}
            onPress={requestLocation}
            disabled={locationLoading}
          >
            <Text style={styles.mapRefreshText}>
              {locationLoading ? "Refreshing…" : "Refresh"}
            </Text>
          </Pressable>
        </View>

        {!process.env.EXPO_PUBLIC_GMAPSAPI ? (
          <Text style={styles.mapHint}>
            Add EXPO_PUBLIC_GMAPSAPI in your app config to show the map.
          </Text>
        ) : locationError ? (
          <Text style={styles.mapError}>{locationError}</Text>
        ) : !locationCoords ? (
          <View style={styles.mapLoadingRow}>
            <ActivityIndicator size="small" color="#6B7280" />
            <Text style={styles.mapHint}>Getting your current location…</Text>
          </View>
        ) : (
          <>
            <View style={styles.mapContainer}>
              <WebView
                source={{
                  html: (() => {
                    const key = process.env.EXPO_PUBLIC_GMAPSAPI!;
                    const { latitude, longitude } = locationCoords;
                    const embedUrl = `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(
                      key,
                    )}&center=${latitude},${longitude}&zoom=14&maptype=roadmap`;
                    return `<!DOCTYPE html><html style="height:220px;width:100%;margin:0;padding:0;overflow:hidden"><head><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/></head><body style="margin:0;padding:0;height:220px;min-height:220px;width:100%;min-width:100%;position:relative;overflow:hidden;box-sizing:border-box"><iframe style="position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;border:0;display:block" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${embedUrl.replace(
                      /"/g,
                      "&quot;",
                    )}"></iframe></body></html>`;
                  })(),
                }}
                style={styles.mapWebView}
                scrollEnabled={false}
                nestedScrollEnabled
                originWhitelist={["*"]}
              />
            </View>
            <Text style={styles.mapCaption}>
              Showing approximate live location from this device.
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  hello: { fontSize: 24, fontWeight: "700", color: "#111827" },
  email: { fontSize: 14, color: "#6B7280" },
  avatarWrapper: { marginLeft: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 16, fontWeight: "700", color: "#4B5563" },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  primaryButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: { color: "#111827", fontSize: 14, fontWeight: "500" },
  buttonPressed: { opacity: 0.9 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  statsHeaderRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsFilterRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  filterPill: {
    flexDirection: "row",
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterChipActive: {
    backgroundColor: "#ffffff",
  },
  filterChipText: { fontSize: 11, color: "#6B7280" },
  filterChipTextActive: { color: "#111827", fontWeight: "600" },
  hideButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ffffff",
  },
  hideButtonText: { fontSize: 11, color: "#6B7280", fontWeight: "500" },
  earningsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  earningsCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#0F172A",
  },
  earningsLabel: { fontSize: 12, color: "#9CA3AF" },
  earningsValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  earningsHint: { marginTop: 2, fontSize: 11, color: "#9CA3AF" },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#F9FAFB",
  },
  statLabel: { fontSize: 12, color: "#6B7280" },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  sectionLink: { fontSize: 13, color: "#007AFF", fontWeight: "500" },
  center: { alignItems: "center", justifyContent: "center", marginTop: 16 },
  errorText: { color: "#b91c1c" },
  emptyBox: { alignItems: "center", gap: 4, marginTop: 12 },
  emptyText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  emptySubText: { fontSize: 13, color: "#6B7280", textAlign: "center" },
  listContent: { gap: 10, marginTop: 8 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    backgroundColor: "#F9FAFB",
    gap: 4,
  },
  cardRoute: { fontSize: 14, fontWeight: "600", color: "#111827" },
  cardMeta: { fontSize: 13, color: "#6B7280" },
  cardStatus: { fontSize: 12, color: "#007AFF", fontWeight: "600" },
  mapSection: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    padding: 12,
    gap: 8,
  },
  mapHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapContainer: {
    height: 220,
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    marginTop: 4,
  },
  mapWebView: {
    width: "100%",
    height: 220,
  },
  mapHint: { fontSize: 12, color: "#6B7280" },
  mapError: { fontSize: 12, color: "#b91c1c" },
  mapLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  mapRefreshBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ffffff",
  },
  mapRefreshText: { fontSize: 11, color: "#6B7280", fontWeight: "500" },
  mapCaption: { fontSize: 11, color: "#6B7280" },
});
