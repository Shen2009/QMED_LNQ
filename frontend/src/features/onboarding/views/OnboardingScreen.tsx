import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  Platform,
  SafeAreaView,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useDispatch} from 'react-redux';
import {setOnboardingDone} from '../../../core/store/slices/appSlice';
import {useColors} from '../../../core/theme/useColors';
import {useLanguage} from '../../../core/i18n/LanguageContext';

const {width, height} = Dimensions.get('window');

/* ── Slide data ── */
interface Slide {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBg: string;
  title: string;
  subtitle: string;
  accentColor: string;
}

const SLIDE_CONFIGS = [
  {
    id: '1',
    icon: 'favorite' as keyof typeof MaterialIcons.glyphMap,
    iconBg: '#FF5C6A22',
    accentColor: '#FF5C6A',
  },
  {
    id: '2',
    icon: 'smart-toy' as keyof typeof MaterialIcons.glyphMap,
    iconBg: '#00D4B822',
    accentColor: '#00D4B8',
  },
  {
    id: '3',
    icon: 'bar-chart' as keyof typeof MaterialIcons.glyphMap,
    iconBg: '#A78BFA22',
    accentColor: '#A78BFA',
  },
];


/* ── Dot indicator ── */
const Dots = ({
  count,
  active,
  accentColor,
}: {
  count: number;
  active: number;
  accentColor: string;
}) => (
  <View style={styles.dotsRow}>
    {Array.from({length: count}).map((_, i) => (
      <View
        key={i}
        style={[
          styles.dot,
          {
            width: i === active ? 24 : 8,
            backgroundColor: i === active ? accentColor : '#ffffff33',
          },
        ]}
      />
    ))}
  </View>
);

/* ── Main component ── */
const OnboardingScreen = () => {
  const C = useColors();
  const dispatch = useDispatch();
  const {strings} = useLanguage();
  const flatRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Build slides from i18n strings at render time
  const SLIDES: Slide[] = [
    {...SLIDE_CONFIGS[0], title: strings.onboardSlide1Title, subtitle: strings.onboardSlide1Sub},
    {...SLIDE_CONFIGS[1], title: strings.onboardSlide2Title, subtitle: strings.onboardSlide2Sub},
    {...SLIDE_CONFIGS[2], title: strings.onboardSlide3Title, subtitle: strings.onboardSlide3Sub},
  ];

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({index: currentIndex + 1, animated: true});
    } else {
      dispatch(setOnboardingDone());
    }
  };

  const handleSkip = () => {
    dispatch(setOnboardingDone());
  };

  const slide = SLIDES[currentIndex];

  return (
    <View style={[styles.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Skip button */}
      {currentIndex < SLIDES.length - 1 && (
        <SafeAreaView style={styles.skipWrapper}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={[styles.skipText, {color: C.textSub}]}>{strings.onboardSkip}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: true},
        )}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        renderItem={({item, index}) => {
          // Parallax + fade for each slide
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];
          const translateY = scrollX.interpolate({
            inputRange,
            outputRange: [40, 0, 40],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          });

          return (
            <View style={styles.slide}>
              <Animated.View style={{opacity, transform: [{translateY}]}}>
                {/* Icon card */}
                <View style={[styles.iconCard, {backgroundColor: item.iconBg}]}>
                  <MaterialIcons name={item.icon} size={72} color={item.accentColor} />
                </View>

                {/* Text */}
                <Text style={[styles.title, {color: C.text}]}>{item.title}</Text>
                <Text style={[styles.subtitle, {color: C.textSub}]}>{item.subtitle}</Text>
              </Animated.View>
            </View>
          );
        }}
      />

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomWrapper}>
        <Dots count={SLIDES.length} active={currentIndex} accentColor={slide.accentColor} />

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.nextBtn, {backgroundColor: slide.accentColor}]}
          activeOpacity={0.85}>
          {currentIndex < SLIDES.length - 1 ? (
            <MaterialIcons name="arrow-forward" size={24} color="#fff" />
          ) : (
            <Text style={styles.startText}>{strings.onboardStart}</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  skipWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 10,
  },
  skipBtn: {paddingVertical: 6, paddingHorizontal: 12},
  skipText: {fontSize: 14, fontWeight: '500'},
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  iconCard: {
    width: 160,
    height: 160,
    borderRadius: 48,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    // subtle border glow
    borderWidth: 1,
    borderColor: '#ffffff11',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
  },
  bottomWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  dot: {
    height: 8,
    borderRadius: 4,
    // smooth width transition via CSS transition isn't available,
    // but state change rerenders fast enough
  },
  nextBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default OnboardingScreen;
