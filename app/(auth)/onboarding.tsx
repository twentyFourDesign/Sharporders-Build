import { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'ship-ease',
    title: 'Ship with ease',
    body: 'Send packages anywhere with just a few taps. Our platform connects you with trusted drivers in your area.',
    image: require('../../assets/1.png'),
  },
  {
    key: 'choose-driver',
    title: 'Choose your driver',
    body: 'Browse verified drivers, check their ratings, and select the perfect match for your delivery needs.',
    image: require('../../assets/2.png'),
  },
  {
    key: 'realtime-tracking',
    title: 'Real-time tracking',
    body: 'Track your package every step of the way with live updates and GPS monitoring for peace of mind.',
    image: require('../../assets/3.png'),
  },
  {
    key: 'secure-reliable',
    title: 'Secure and reliable',
    body: 'Your packages are protected with insurance coverage and verified driver background checks.',
    image: require('../../assets/4.png'),
  },
];

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / width);
    if (newIndex !== index) setIndex(newIndex);
  };

  const goToSlide = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  const handleSkip = () => {
    // Skip onboarding and go straight to login
    router.push('/(auth)/login');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handleSignup = () => {
    router.push('/(auth)/role-select');
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>SKIP</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}>
        {SLIDES.map((slide) => (
          <View key={slide.key} style={styles.slide}>
            <View style={styles.illustrationWrapper}>
              <Image
                source={slide.image}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {SLIDES.map((slide, i) => {
          const active = i === index;
          return (
            <Pressable
              key={slide.key}
              style={[
                styles.dot,
                active && styles.dotActive,
              ]}
              onPress={() => goToSlide(i)}
            />
          );
        })}
      </View>

      <View style={styles.footerButtons}>
        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            styles.footerButtonOutline,
            pressed && styles.footerButtonPressed,
          ]}
          onPress={handleLogin}>
          <Text style={[styles.footerButtonText, styles.footerButtonTextOutline]}>
            LOGIN
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            styles.footerButtonPrimary,
            pressed && styles.footerButtonPressed,
          ]}
          onPress={handleSignup}>
          <Text style={[styles.footerButtonText, styles.footerButtonTextPrimary]}>
            SIGN UP
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 40,
  },
  skipButton: {
    position: 'absolute',
    top: 40,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3498db',
  },
  scrollContent: {
    alignItems: 'center',
  },
  slide: {
    width,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  illustrationWrapper: {
    width: '100%',
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    marginTop: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    backgroundColor: '#3498db',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerButtonOutline: {
    borderWidth: 1,
    borderColor: '#3498db',
    marginRight: 8,
  },
  footerButtonPrimary: {
    backgroundColor: '#3498db',
    marginLeft: 8,
  },
  footerButtonPressed: {
    opacity: 0.9,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerButtonTextOutline: {
    color: '#3498db',
  },
  footerButtonTextPrimary: {
    color: '#ffffff',
  },
});

