import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Truck = {
  id: string;
  name: string;
};

type PlaceSuggestion = {
  id: string;
  label: string;
  mapsUrl: string;
};

export default function CreateLoadScreen() {
  const { token } = useAuth();
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [truckType, setTruckType] = useState('');
  const [description, setDescription] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [fareOffer, setFareOffer] = useState('');
  const [saving, setSaving] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupMapsUrl, setPickupMapsUrl] = useState<string | null>(null);
  const [deliverySuggestions, setDeliverySuggestions] = useState<PlaceSuggestion[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryMapsUrl, setDeliveryMapsUrl] = useState<string | null>(null);
  const pickupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deliveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scrolls so the tapped field sits comfortably above the keyboard
  const scrollToField = (y: number) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
  };

  useEffect(() => {
    let isMounted = true;

    const loadTrucks = async () => {
      try {
        const data = await apiFetch<Truck[]>('/api/trucks', { method: 'GET' });
        if (!isMounted) return;
        setTrucks(data);
      } catch {
        // ignore, fallback to free text
      }
    };

    loadTrucks();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchPlaces = async (
    query: string,
    which: 'pickup' | 'delivery',
  ) => {
    if (!query || query.trim().length < 3) {
      if (which === 'pickup') {
        setPickupSuggestions([]);
        setPickupLoading(false);
      } else {
        setDeliverySuggestions([]);
        setDeliveryLoading(false);
      }
      return;
    }
    which === 'pickup' ? setPickupLoading(true) : setDeliveryLoading(true);
    try {
      const results = await apiFetch<PlaceSuggestion[]>(`/api/places?q=${encodeURIComponent(query)}`, {
        method: 'GET',
      });
      if (which === 'pickup') {
        setPickupSuggestions(results);
      } else {
        setDeliverySuggestions(results);
      }
    } catch {
      if (which === 'pickup') {
        setPickupSuggestions([]);
      } else {
        setDeliverySuggestions([]);
      }
    } finally {
      which === 'pickup' ? setPickupLoading(false) : setDeliveryLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) {
      Alert.alert('Not signed in', 'Please sign in again.');
      router.replace('/(auth)');
      return;
    }

    if (!pickupAddress || !deliveryAddress || !truckType || !description || !fareOffer) {
      Alert.alert('Missing details', 'Please fill all required fields.');
      return;
    }

    const fare = Number(fareOffer);
    if (Number.isNaN(fare) || fare <= 0) {
      Alert.alert('Invalid fare', 'Enter a valid fare offer.');
      return;
    }

    const finalPickupUrl =
      pickupMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        pickupAddress,
      )}`;
    const finalDeliveryUrl =
      deliveryMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        deliveryAddress,
      )}`;

    try {
      setSaving(true);
      await apiFetch('/api/loads', {
        method: 'POST',
        body: JSON.stringify({
          pickupAddress,
          deliveryAddress,
          truckType,
          loadDescription: description,
          recipientName,
          recipientNumber,
          fareOffer: fare,
          pickupMapsUrl: finalPickupUrl,
          deliveryMapsUrl: finalDeliveryUrl,
        }),
        token,
      });

      router.replace('/(shipper)/(tabs)/loads');
    } catch (error: any) {
      Alert.alert('Could not create load', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create load</Text>
        <Text style={styles.subtitle}>Set up pickup, dropoff and basic load details.</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Pickup address</Text>
            <TextInput
              value={pickupAddress}
              onChangeText={(text) => {
                setPickupAddress(text);
                setPickupMapsUrl(null);
                if (pickupTimeoutRef.current) clearTimeout(pickupTimeoutRef.current);
                pickupTimeoutRef.current = setTimeout(
                  () => fetchPlaces(text, 'pickup'),
                  400,
                );
              }}
              style={styles.input}
              placeholder="e.g. Victoria Island, Lagos"
              placeholderTextColor="#9CA3AF"
              onFocus={(e) => scrollToField(e.nativeEvent.target as unknown as number)}
              returnKeyType="next"
            />
            {(pickupLoading || pickupSuggestions.length > 0) && (
              <View style={styles.suggestionsBox}>
                {pickupLoading && (
                  <Text style={styles.suggestionText}>Searching…</Text>
                )}
                {pickupSuggestions.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setPickupAddress(s.label);
                      setPickupMapsUrl(s.mapsUrl);
                      setPickupSuggestions([]);
                    }}>
                    <Text style={styles.suggestionText}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Delivery address</Text>
            <TextInput
              value={deliveryAddress}
              onChangeText={(text) => {
                setDeliveryAddress(text);
                setDeliveryMapsUrl(null);
                if (deliveryTimeoutRef.current) clearTimeout(deliveryTimeoutRef.current);
                deliveryTimeoutRef.current = setTimeout(
                  () => fetchPlaces(text, 'delivery'),
                  400,
                );
              }}
              style={styles.input}
              placeholder="e.g. Abuja city centre"
              placeholderTextColor="#9CA3AF"
              onFocus={(e) => scrollToField(e.nativeEvent.target as unknown as number)}
              returnKeyType="next"
            />
            {(deliveryLoading || deliverySuggestions.length > 0) && (
              <View style={styles.suggestionsBox}>
                {deliveryLoading && (
                  <Text style={styles.suggestionText}>Searching…</Text>
                )}
                {deliverySuggestions.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setDeliveryAddress(s.label);
                      setDeliveryMapsUrl(s.mapsUrl);
                      setDeliverySuggestions([]);
                    }}>
                    <Text style={styles.suggestionText}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Truck type</Text>
            {trucks.length > 0 ? (
              <View style={styles.chipRow}>
                {trucks.map((t) => {
                  const selected = truckType === t.name;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setTruckType(t.name)}
                      style={({ pressed }) => [
                        styles.chip,
                        selected && styles.chipSelected,
                        pressed && styles.chipPressed,
                      ]}>
                      <Text style={selected ? styles.chipTextSelected : styles.chipText}>
                        {t.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <TextInput
                value={truckType}
                onChangeText={setTruckType}
                style={styles.input}
                placeholder="e.g. 10-tyre flatbed"
                placeholderTextColor="#9CA3AF"
                onFocus={(e) => scrollToField(e.nativeEvent.target as unknown as number)}
              />
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Load description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.inputMultiline]}
              multiline
              placeholder="What is being shipped?"
              placeholderTextColor="#9CA3AF"
              onFocus={(e) => scrollToField(e.nativeEvent.target as unknown as number)}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Recipient name</Text>
            <TextInput
              value={recipientName}
              onChangeText={setRecipientName}
              style={styles.input}
              placeholder="Receiver's name"
              placeholderTextColor="#9CA3AF"
              onFocus={(e) => scrollToField(e.nativeEvent.target as unknown as number)}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Recipient phone</Text>
            <TextInput
              value={recipientNumber}
              onChangeText={setRecipientNumber}
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="+234 800 000 0000"
              placeholderTextColor="#9CA3AF"
              onFocus={(e) => scrollToField(e.nativeEvent.target as unknown as number)}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Fare offer (₦)</Text>
            <TextInput
              value={fareOffer}
              onChangeText={setFareOffer}
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 75000"
              placeholderTextColor="#9CA3AF"
              onFocus={(e) => scrollToField(e.nativeEvent.target as unknown as number)}
              returnKeyType="done"
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={styles.buttonText}>{saving ? 'Creating…' : 'Create load'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  form: {
    marginTop: 24,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: '#111827',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  suggestionsBox: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  suggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 13,
    color: '#374151',
  },
  button: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#111827',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  chipSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipText: {
    fontSize: 13,
    color: '#111827',
  },
  chipTextSelected: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
});

