import React, {useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useSafeGoBack} from '../../../core/hooks/useSafeGoBack';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {useColors} from '../../../core/theme/useColors';

const {width} = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W = (width - 32 - CARD_GAP) / 2;

// ─── Animated pulse dot ───────────────────────────────────────────────────────
function PulseDot({color}: {color: string}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {toValue: 1.8, duration: 900, useNativeDriver: true}),
          Animated.timing(scale, {toValue: 1, duration: 900, useNativeDriver: true}),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {toValue: 0, duration: 900, useNativeDriver: true}),
          Animated.timing(opacity, {toValue: 0.6, duration: 900, useNativeDriver: true}),
        ]),
      ]),
    ).start();
  }, []);
  return (
    <View style={{width: 10, height: 10, alignItems: 'center', justifyContent: 'center'}}>
      <Animated.View
        style={{position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity, transform: [{scale}]}}
      />
      <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: color}} />
    </View>
  );
}

// ─── Featured large card ──────────────────────────────────────────────────────
function FeaturedCard({icon, label, sub, color, tag, btnLabel, onPress, C}: {
  icon: string; label: string; sub: string; color: string; tag: string; btnLabel: string;
  onPress: () => void; C: ReturnType<typeof useColors>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.15)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {toValue: 0.28, duration: 1800, useNativeDriver: true}),
        Animated.timing(glow, {toValue: 0.15, duration: 1800, useNativeDriver: true}),
      ]),
    ).start();
  }, []);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, {toValue: 0.97, useNativeDriver: true, friction: 8}).start()}
      onPressOut={() => Animated.spring(scale, {toValue: 1, useNativeDriver: true, friction: 8}).start()}
      activeOpacity={1}>
      <Animated.View style={[fc.card, {backgroundColor: C.card, borderColor: color + '40', transform: [{scale}]}]}>
        {/* Glow bg */}
        <Animated.View style={[fc.glow, {backgroundColor: color, opacity: glow}]} />

        <View style={fc.top}>
          <View style={[fc.iconWrap, {backgroundColor: color + '25', borderColor: color + '50'}]}>
            <MaterialCommunityIcons name={icon as any} size={32} color={color} />
          </View>
          <View style={[fc.tagPill, {backgroundColor: color + '20', borderColor: color + '40'}]}>
            <PulseDot color={color} />
            <Text style={[fc.tagTxt, {color}]}>{tag}</Text>
          </View>
        </View>

        <View style={fc.bottom}>
          <Text style={[fc.label, {color: C.text}]}>{label}</Text>
          <Text style={[fc.sub, {color: C.textSub}]}>{sub}</Text>
          <View style={[fc.btn, {backgroundColor: color}]}>
            <Text style={fc.btnTxt}>{btnLabel}</Text>
            <MaterialIcons name="arrow-forward" size={14} color="#fff" />
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const fc = StyleSheet.create({
  card: {borderWidth: 1.5, borderRadius: 24, padding: 20, gap: 16, overflow: 'hidden'},
  glow: {position: 'absolute', width: width * 0.7, height: width * 0.7, borderRadius: width * 0.35, top: -width * 0.25, right: -width * 0.15},
  top: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'},
  iconWrap: {width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5},
  tagPill: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1},
  tagTxt: {fontSize: 11, fontWeight: '700', letterSpacing: 0.5},
  bottom: {gap: 6},
  label: {fontSize: 20, fontWeight: '900', letterSpacing: -0.5},
  sub: {fontSize: 13, lineHeight: 19},
  btn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, paddingVertical: 12, marginTop: 4},
  btnTxt: {color: '#fff', fontSize: 14, fontWeight: '800'},
});

// ─── Small metric card ────────────────────────────────────────────────────────
function SmallCard({icon, label, sub, color, badge, onPress, C}: {
  icon: string; label: string; sub: string; color: string; badge?: string;
  onPress: () => void; C: ReturnType<typeof useColors>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      style={{width: CARD_W}}
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, {toValue: 0.96, useNativeDriver: true, friction: 8}).start()}
      onPressOut={() => Animated.spring(scale, {toValue: 1, useNativeDriver: true, friction: 8}).start()}
      activeOpacity={1}>
      <Animated.View style={[sc.card, {backgroundColor: C.card, borderColor: color + '30', transform: [{scale}]}]}>
        <View style={sc.top}>
          <View style={[sc.iconWrap, {backgroundColor: color + '18'}]}>
            <MaterialCommunityIcons name={icon as any} size={24} color={color} />
          </View>
          {badge && (
            <View style={[sc.badge, {backgroundColor: color + '18'}]}>
              <Text style={[sc.badgeTxt, {color}]}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={[sc.label, {color: C.text}]} numberOfLines={2}>{label}</Text>
        <Text style={[sc.sub, {color: C.textSub}]} numberOfLines={2}>{sub}</Text>
        <View style={[sc.arrow, {backgroundColor: color + '15', borderColor: color + '35'}]}>
          <MaterialIcons name="arrow-forward-ios" size={11} color={color} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  card: {borderWidth: 1, borderRadius: 20, padding: 16, gap: 8},
  top: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  iconWrap: {width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  badge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8},
  badgeTxt: {fontSize: 9, fontWeight: '800', letterSpacing: 0.5},
  label: {fontSize: 13, fontWeight: '800', lineHeight: 17},
  sub: {fontSize: 11, lineHeight: 15},
  arrow: {alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 5, marginTop: 2},
});

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({icon, value, label, color, C}: {
  icon: string; value: string; label: string; color: string; C: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[stc.chip, {backgroundColor: C.card, borderColor: C.border}]}>
      <View style={[stc.iconWrap, {backgroundColor: color + '18'}]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={color} />
      </View>
      <Text style={[stc.value, {color: C.text}]}>{value}</Text>
      <Text style={[stc.label, {color: C.textSub}]}>{label}</Text>
    </View>
  );
}

const stc = StyleSheet.create({
  chip: {flex: 1, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4},
  iconWrap: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  value: {fontSize: 20, fontWeight: '900', letterSpacing: -0.5},
  label: {fontSize: 10, fontWeight: '600', textAlign: 'center'},
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const MeasurementListScreen = () => {
  const navigation = useNavigation<any>();
  const goBack = useSafeGoBack();
  const {strings} = useLanguage();
  const C = useColors();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  // Map loại đo → tên screen đã đăng ký trong Navigator
  const routeForType = (id: string) => {
    const map: Record<string, string> = {
      'face-rppg':      'FaceRppg',
      'stress':         'Stress',
      'sleep':          'Sleep',
      'heartbeat':      'Heartbeat',
      'blood-pressure': 'BloodPressure',
    };
    return map[id] ?? 'MeasurementDetail';
  };

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerAnim, {toValue: 1, duration: 500, useNativeDriver: true}),
      Animated.timing(cardsAnim, {toValue: 1, duration: 600, useNativeDriver: true}),
    ]).start();
  }, []);

  const featured = {
    id: 'face-rppg',
    icon: 'face-recognition',
    label: strings.measureListFeaturedLabel,
    sub: strings.measureListFeaturedSub,
    color: C.red,
    tag: strings.measureListFeaturedTag,
  };

  const secondary = [
    {id: 'blood-pressure', icon: 'heart-pulse',   label: 'Huyết áp',                    sub: 'Đo qua camera rPPG 30s',       color: '#EF4444', badge: 'NEW'},
    {id: 'heartbeat',      icon: 'heart-pulse',   label: 'Âm thanh tim (Beta)',                  sub: 'Phân loại CNN-LSTM',          color: '#E11D48', badge: 'AI'},
    {id: 'stress',         icon: 'brain',         label: strings.measureListStressLabel, sub: strings.measureListStressSub, color: '#A855F7', badge: undefined},
    {id: 'sleep',          icon: 'sleep',         label: strings.measureListSleepLabel,  sub: strings.measureListSleepSub,  color: C.teal,    badge: undefined},
  ];

  return (
    <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* ── Header ── */}
        <Animated.View style={[s.header, {opacity: headerAnim, transform: [{translateY: headerAnim.interpolate({inputRange: [0,1], outputRange: [-12, 0]})}]}]}>
          <TouchableOpacity
            style={[s.backBtn, {backgroundColor: C.surface, borderColor: C.border}]}
            onPress={goBack}>
            <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
          </TouchableOpacity>
          <View style={{flex: 1}}>
            <Text style={[s.title, {color: C.text}]}>{strings.measureListHeader}</Text>
            <Text style={[s.subtitle, {color: C.textSub}]}>{strings.measureListHeaderSub}</Text>
          </View>
          <View style={[s.badge, {backgroundColor: C.tealDim, borderColor: C.tealBorder}]}>
            <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal}} />
            <Text style={[s.badgeTxt, {color: C.teal}]}>AI</Text>
          </View>
        </Animated.View>

        {/* ── Stats strip ── */}
        <Animated.View style={[s.statsRow, {opacity: headerAnim}]}>
          <StatChip icon="speedometer" value="30s" label={strings.measureListStatDuration} color={C.teal} C={C} />
          <StatChip icon="shield-check" value="98%" label={strings.measureListStatAccuracy} color={C.green} C={C} />
          <StatChip icon="wifi-off" value="0" label={strings.measureListStatDevice} color={C.blue} C={C} />
        </Animated.View>

        {/* ── Info banner ── */}
        <View style={[s.banner, {backgroundColor: C.tealDim, borderColor: C.tealBorder}]}>
          <MaterialCommunityIcons name="information-outline" size={15} color={C.teal} />
          <Text style={[s.bannerTxt, {color: C.teal}]}>
          {strings.measureListBanner}
          </Text>
        </View>

        {/* ── Khám Tổng Quát Banner ── */}
        <Animated.View style={{opacity: headerAnim, paddingHorizontal: 16, marginBottom: 14}}>
          <TouchableOpacity
            style={[
              {borderWidth: 1.5, borderRadius: 22, padding: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 16},
              {backgroundColor: '#8B5CF612', borderColor: '#8B5CF650'},
            ]}
            onPress={() => navigation.navigate('HealthExam' as any)}
            activeOpacity={0.85}>
            <View style={{width: 58, height: 58, borderRadius: 18, backgroundColor: '#8B5CF620', borderWidth: 1.5, borderColor: '#8B5CF650', alignItems: 'center', justifyContent: 'center'}}>
              <MaterialCommunityIcons name="robot" size={30} color="#8B5CF6" />
            </View>
            <View style={{flex: 1}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4}}>
                <Text style={{fontSize: 17, fontWeight: '900', color: '#8B5CF6'}}>{strings.measureListExamTitle}</Text>
                <View style={{backgroundColor: '#8B5CF620', borderRadius: 8, borderWidth: 1, borderColor: '#8B5CF640', paddingHorizontal: 7, paddingVertical: 2}}>
                  <Text style={{color: '#8B5CF6', fontSize: 9, fontWeight: '800', letterSpacing: 0.5}}>MED-GEMMA AI</Text>
                </View>
              </View>
              <Text style={{color: '#8B5CF6CC', fontSize: 12, lineHeight: 18}}>
                {strings.measureListExamDesc}
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#8B5CF6" />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Featured ── */}
        <Animated.View style={{opacity: cardsAnim, paddingHorizontal: 16, marginBottom: 16}}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionAccent, {backgroundColor: C.red}]} />
            <Text style={[s.sectionTitle, {color: C.text}]}>{strings.measureListSectionFeatured}</Text>
          </View>
          <FeaturedCard
            icon={featured.icon}
            label={featured.label}
            sub={featured.sub}
            color={featured.color}
            tag={featured.tag}
            btnLabel={strings.measureListMeasureNow}
            C={C}
            onPress={() => navigation.navigate(routeForType(featured.id) as any)}
          />
        </Animated.View>

        {/* ── Secondary grid ── */}
        <Animated.View style={{opacity: cardsAnim, paddingHorizontal: 16}}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionAccent, {backgroundColor: C.teal}]} />
            <Text style={[s.sectionTitle, {color: C.text}]}>{strings.measureListSectionOther}</Text>
          </View>
          <View style={s.grid}>
            {secondary.map(item => (
              <SmallCard
                key={item.id}
                icon={item.icon}
                label={item.label}
                sub={item.sub}
                color={item.color}
                badge={item.badge}
                C={C}
                onPress={() => navigation.navigate(routeForType(item.id) as any)}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── Disclaimer ── */}
        <View style={[s.disclaimer, {backgroundColor: C.surface, borderColor: C.border}]}>
          <MaterialIcons name="medical-services" size={14} color={C.textDim} />
          <Text style={[s.disclaimerTxt, {color: C.textDim}]}>
            {strings.measureListDisclaimer}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: {flex: 1},
  content: {paddingBottom: 110},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12},
  backBtn: {width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 22, fontWeight: '900', letterSpacing: -0.5},
  subtitle: {fontSize: 12, marginTop: 2},
  badge: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1},
  badgeTxt: {fontSize: 11, fontWeight: '800', letterSpacing: 1},
  statsRow: {flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 14},
  banner: {flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 18, padding: 12, borderRadius: 12, borderWidth: 1},
  bannerTxt: {fontSize: 12, fontWeight: '500', flex: 1},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12},
  sectionAccent: {width: 3, height: 18, borderRadius: 2},
  sectionTitle: {fontSize: 16, fontWeight: '800'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP},
  disclaimer: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, margin: 16, padding: 14, borderRadius: 14, borderWidth: 1},
  disclaimerTxt: {fontSize: 11, lineHeight: 16, flex: 1},
});

export default MeasurementListScreen;
