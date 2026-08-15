import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useDispatch} from 'react-redux';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {AppLanguage} from '../../../core/i18n/strings';
import {setLanguageSelectDone} from '../../../core/store/slices/appSlice';
import {useColors} from '../../../core/theme/useColors';

const {width} = Dimensions.get('window');

// ─── Language option ─────────────────────────────────────────────────────────
interface LangOption {
  code: AppLanguage;
  nativeName: string;
  englishName: string;
  flag: string;
  accentColor: string;
}

const LANGUAGES: LangOption[] = [
  {
    code: 'vi',
    nativeName: 'Tiếng Việt',
    englishName: 'Vietnamese',
    flag: '🇻🇳',
    accentColor: '#EA384C',
  },
  {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    flag: '🇬🇧',
    accentColor: '#00D4B8',
  },
];

// ─── Single language card ─────────────────────────────────────────────────────
function LangCard({
  option,
  selected,
  onSelect,
}: {
  option: LangOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const C = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {toValue: 0.97, useNativeDriver: true, friction: 8}).start();
  const onPressOut = () =>
    Animated.spring(scale, {toValue: 1, useNativeDriver: true, friction: 8}).start();

  return (
    <TouchableOpacity
      onPress={onSelect}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}>
      <Animated.View
        style={[
          styles.langCard,
          {
            backgroundColor: selected ? option.accentColor + '18' : C.card,
            borderColor: selected ? option.accentColor : C.border,
            transform: [{scale}],
          },
        ]}>
        {/* Flag */}
        <Text style={styles.flag}>{option.flag}</Text>

        {/* Text block */}
        <View style={styles.langTextBlock}>
          <Text style={[styles.nativeName, {color: selected ? option.accentColor : C.text}]}>
            {option.nativeName}
          </Text>
          <Text style={[styles.englishName, {color: C.textSub}]}>{option.englishName}</Text>
        </View>

        {/* Check indicator */}
        {selected && (
          <View style={[styles.checkCircle, {backgroundColor: option.accentColor}]}>
            <MaterialCommunityIcons name="check" size={14} color="#fff" />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
const LanguageSelectScreen = () => {
  const C = useColors();
  const dispatch = useDispatch();
  const {setLanguage, strings} = useLanguage();
  const [selected, setSelected] = useState<AppLanguage>('vi');

  // Button animation
  const btnAnim = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(btnAnim, {toValue: 0.96, useNativeDriver: true}).start();
  const onPressOut = () =>
    Animated.spring(btnAnim, {toValue: 1, useNativeDriver: true}).start();

  const handleContinue = async () => {
    await setLanguage(selected);
    dispatch(setLanguageSelectDone());
  };

  const selectedOption = LANGUAGES.find(l => l.code === selected)!;

  return (
    <View style={[styles.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safeArea}>
        {/* Logo / branding area */}
        <View style={styles.topSection}>
          <View style={[styles.logoWrap, {backgroundColor: '#00D4B8' + '18'}]}>
            <MaterialCommunityIcons name="heart-pulse" size={48} color="#00D4B8" />
          </View>
          <Text style={[styles.appName, {color: C.text}]}>Q-Med</Text>
        </View>

        {/* Title section */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, {color: C.text}]}>
            {/* Display both so non-Vietnamese users understand immediately */}
            {'Choose Language\nChọn ngôn ngữ'}
          </Text>
          <Text style={[styles.subtitle, {color: C.textSub}]}>
            {'Which language would you like?\nBạn muốn dùng ngôn ngữ nào?'}
          </Text>
        </View>

        {/* Language options */}
        <View style={styles.langList}>
          {LANGUAGES.map(lang => (
            <LangCard
              key={lang.code}
              option={lang}
              selected={selected === lang.code}
              onSelect={() => setSelected(lang.code)}
            />
          ))}
        </View>

        {/* Continue button */}
        <TouchableOpacity
          onPress={handleContinue}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}>
          <Animated.View
            style={[
              styles.continueBtn,
              {backgroundColor: selectedOption.accentColor, transform: [{scale: btnAnim}]},
            ]}>
            <Text style={styles.continueTxt}>{strings.langSelectContinue}</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  safeArea: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    justifyContent: 'center',
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffffff11',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  langList: {
    gap: 14,
    marginBottom: 40,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  flag: {fontSize: 36},
  langTextBlock: {flex: 1, gap: 2},
  nativeName: {fontSize: 18, fontWeight: '700'},
  englishName: {fontSize: 13, fontWeight: '500'},
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  continueTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LanguageSelectScreen;
