import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
  Image
} from 'react-native';
import { useAppContext } from '../context/AppContext';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const flatListRef = useRef(null);

  const { currentOnboardingStep, setCurrentOnboardingStep, onboardingSteps } =
    useAppContext();

  // Sync FlatList with currentOnboardingStep changes
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ 
        index: currentOnboardingStep, 
        animated: true 
      });
    }
  }, [currentOnboardingStep]);

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  const handleNext = () => {
    if (currentOnboardingStep < onboardingSteps.length - 1) {
      // Move to next step - this will trigger the useEffect to scroll
      setCurrentOnboardingStep(currentOnboardingStep + 1);
    } else {
      // Last step - navigate to Role Selection
      navigation.navigate('RoleSelection');
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  // Determine button text based on current step
  const getButtonText = () => {
    return currentOnboardingStep === onboardingSteps.length - 1 ? 'CONTINUE' : 'NEXT';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={onboardingSteps}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={ev => {
          const index = Math.round(ev.nativeEvent.contentOffset.x / width);
          setCurrentOnboardingStep(index);
        }}
        renderItem={({ item }) => (
          <View style={[styles.onboardingContent, { width }]}>
            <View style={styles.imageContainer}>
              <Image source={item.image} style={styles.onboardingImage} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.onboardingTitle}>{item.title}</Text>
              <Text style={styles.onboardingDescription}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.dotsContainer}>
        {onboardingSteps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentOnboardingStep
                ? styles.activeDot
                : styles.inactiveDot,
            ]}
          />
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.outlineButton} onPress={handleLogin}>
          <Text style={styles.outlineButtonText}>LOGIN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skipText: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  onboardingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  imageContainer: {
    flex: 0.6,  // 60% of available space
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    top: 20,
    maxHeight: height * 0.5,  // Maximum 50% of screen height
  },
  onboardingImage: {
    width: width * 0.8,  // 80% of screen width
    height: '100%',      // Fill container height
    maxWidth: 300,       // Maximum width constraint
    maxHeight: 300,      // Maximum height constraint
    resizeMode: 'contain', // Maintain aspect ratio
  },
  textContainer: {
    flex: 0.4,  // 40% of available space
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  onboardingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  onboardingDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 60,
  },
  dotsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    bottom: 60,
    alignSelf: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: '#00BFFF',
  },
  inactiveDot: {
    backgroundColor: '#E0E0E0',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 15,
  },
  outlineButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#00BFFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#00BFFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingScreen;