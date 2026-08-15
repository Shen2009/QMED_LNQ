import React, {useRef, useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Animated,
} from 'react-native';
import MiniEcgWave from '../components/MiniEcgWave';
import {useNavigation} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {useColors} from '../../../core/theme/useColors';
import historyService from '../../../core/api/historyService';
import healthProfileService from '../../../core/api/healthProfileService';

const {width} = Dimensions.get('window');

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900, delay = 300) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const progress = Math.min((Date.now() - start) / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return value;
}

// ─── Vitals ring constants ─────────────────────────────────────────────────────
const RING = 160;
const STROKE = 10;

// ─── Heart Ring ───────────────────────────────────────────────────────────────
function HeartRing({bpm = 0, hasData = false}: {bpm?: number, hasData?: boolean}) {
  const C = useColors();
  const {strings} = useLanguage();
  const pulse = useRef(new Animated.Value(1)).current;
  const displayBpm = useCountUp(hasData ? bpm : 0, 900, 400);

  useEffect(() => {
    if (!hasData) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 1.06, duration: 700, useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 1, duration: 700, useNativeDriver: true}),
      ]),
    ).start();
  }, [pulse, hasData]);

  return (
    <View style={ringStyles.wrap}>
      {/* Outer glow ring */}
      <View
        style={[
          ringStyles.glowRing,
          {borderColor: hasData ? C.tealBorder : C.border, shadowColor: hasData ? C.teal : 'transparent'},
        ]}
      />
      {/* Middle ring */}
      <View style={[ringStyles.midRing, {borderColor: C.border}]} />
      {/* Inner card */}
      <View style={ringStyles.innerCard}>
        <Animated.View style={{transform: [{scale: pulse}]}}>
          <MaterialIcons name="favorite" size={22} color={hasData ? C.red : C.textSub} />
        </Animated.View>
        <Text style={[ringStyles.bpmNum, {color: hasData ? C.text : C.textDim}]}>
          {hasData ? displayBpm : '--'}
        </Text>
        <Text style={[ringStyles.bpmUnit, {color: C.textSub}]}>BPM</Text>
        <View style={ringStyles.statusPill}>
          <View style={[ringStyles.greenDot, {backgroundColor: hasData ? C.green : 'transparent'}]} />
          <Text style={[ringStyles.statusTxt, {color: hasData ? C.green : C.textSub}]}>
             {hasData ? 'Normal' : 'No Data'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: STROKE,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 0},
  },
  midRing: {
    position: 'absolute',
    width: RING - STROKE * 2.4,
    height: RING - STROKE * 2.4,
    borderRadius: (RING - STROKE * 2.4) / 2,
    borderWidth: 1,
  },
  innerCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bpmNum: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 36,
  },
  bpmUnit: {fontSize: 12, fontWeight: '600', letterSpacing: 1},
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  greenDot: {width: 5, height: 5, borderRadius: 3},
  statusTxt: {fontSize: 10, fontWeight: '700'},
});

// ─── Metric pill ──────────────────────────────────────────────────────────────
function MetricPill({icon, label, value, color}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  const C = useColors();
  return (
    <View style={[pillStyles.pill, {borderColor: color + '33', backgroundColor: color + '12'}]}>
      <MaterialIcons name={icon as any} size={14} color={color} />
      <View style={pillStyles.info}>
        <Text style={[pillStyles.val, {color}]}>{value}</Text>
        <Text style={[pillStyles.lbl, {color: C.textSub}]}>{label}</Text>
      </View>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  info: {gap: 1},
  val: {fontSize: 15, fontWeight: '800'},
  lbl: {fontSize: 10, fontWeight: '500'},
});

// ─── Grid tile constants ───────────────────────────────────────────────────────
const CARD_GAP = 10;
const CARD_W = (width - 32 - CARD_GAP) / 2;

// ─── Action card ──────────────────────────────────────────────────────────────
function ActionCard({icon, label, sub, color, onPress}: {
  icon: string;
  label: string;
  sub: string;
  color: string;
  onPress: () => void;
}) {
  const C = useColors();
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, {toValue: 0.96, useNativeDriver: true, friction: 8}).start();
  const onPressOut = () =>
    Animated.spring(scale, {toValue: 1, useNativeDriver: true, friction: 8}).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      style={{width: CARD_W}}>
      <Animated.View
        style={[
          cardStyles.card,
          {
            backgroundColor: C.card,
            borderColor: color + '30',
            transform: [{scale}],
          },
        ]}>
        <View style={[cardStyles.iconWrap, {backgroundColor: color + '18'}]}>
          <MaterialCommunityIcons name={icon as any} size={28} color={color} />
        </View>
        <Text style={[cardStyles.label, {color: C.text}]} numberOfLines={2}>{label}</Text>
        <Text style={[cardStyles.sub, {color: C.textSub}]} numberOfLines={2}>{sub}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    alignItems: 'flex-start',
    minHeight: 148,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {fontSize: 13, fontWeight: '700', lineHeight: 17},
  sub: {fontSize: 11, lineHeight: 15},
});

// ─── Main HomeScreen ───────────────────────────────────────────────────────────
const HomeScreen = () => {
  const C = useColors();
  const {strings, language} = useLanguage();
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<any>(null);

  // ── Latest vitals state (default = no data yet) ──
  const [vitals, setVitals] = useState({
    bpm:    0,
    stress: 0,
    bp:     '—',
    score:  0,
    hasData: false,
  });
  const [loading,   setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Parse latest records → vitals
  const buildVitals = useCallback((records: any[]) => {
    const byType = Object.fromEntries(records.map((r: any) => [r.type, r.result]));
    const face   = byType['face-rppg'] || {};
    const voice  = byType['voice']     || {};
    const scg    = byType['scg']       || {};
    const stress = byType['stress']    || {};

    const bpm  = face.hr_fft  || face.hr_bpm  || scg.hr_fft || 0;
    const stressVal = face.stress_level || stress.stress_level || scg.stress_level || 0;

    // FIX: read BP from face-rppg or scg or dedicated blood-pressure measurement
    const bp_src_data = byType['blood-pressure'] || {};
    const bpSrc = bp_src_data.blood_pressure || voice.blood_pressure || face.blood_pressure || scg.blood_pressure || {};
    // Also support direct systolic_avg/diastolic_avg from BP endpoint
    const sys   = bp_src_data.systolic_avg ?? bpSrc.systolic;
    const dia   = bp_src_data.diastolic_avg ?? bpSrc.diastolic;
    const bp    = sys && dia ? `${sys}/${dia}` : '—';

    // Simple health score from available data
    let score = 0;
    if (bpm > 0) {
      score = 85;
      if (sys && sys >= 140) score -= 20;
      else if (sys && sys >= 130) score -= 10;
      if (stressVal > 60) score -= 8;
      if (bpm > 100 || bpm < 50) score -= 8;
      if (scg?.heart_anomaly) score -= 15;
      score = Math.max(40, Math.min(99, score));
    }

    setVitals({bpm, stress: stressVal, bp, score, hasData: bpm > 0});
  }, []);

  const fetchLatest = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await historyService.getLatest();
      if (data?.length) buildVitals(data);
    } catch { /* silent — offline or not logged in */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildVitals]);

  const score  = useCountUp(vitals.score,  1100, 500);
  const stress = useCountUp(vitals.stress, 950,  650);

  const headerOpacity  = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity,  {toValue: 1, duration: 500, useNativeDriver: true}),
      Animated.timing(headerTranslate,{toValue: 0, duration: 500, useNativeDriver: true}),
    ]).start();
  }, []);

  // FIX: refetch every time HomeScreen gains focus (e.g. after a measurement)
  useFocusEffect(
    useCallback(() => {
      fetchLatest();
      healthProfileService.get().then(setProfile).catch(() => setProfile(null));
    }, [fetchLatest]),
  );

  const actions = [
    {icon: 'face-recognition', label: strings.faceRppg, sub: strings.faceRppgDesc, color: C.red, route: 'FaceRppg'},
    {icon: 'heart-pulse',      label: strings.bloodPressure || 'Huyết áp', sub: strings.bloodPressureDesc || 'Đo qua camera rPPG', color: '#EF4444', route: 'BloodPressure'},
    {icon: 'heart-pulse', label: 'Âm thanh tim (Beta)', sub: 'Phân loại CNN-LSTM', color: '#E11D48', route: 'Heartbeat'},
    {icon: 'brain', label: strings.stress, sub: strings.stressDesc, color: C.amber, route: 'Stress'},
    {icon: 'robot', label: strings.measureListExamTitle || 'Khám AI', sub: strings.measureListExamDesc || 'Tự động phân tích', color: '#8B5CF6', route: 'HealthExam'},
  ];

  return (
    <SafeAreaView style={[styles.root, {backgroundColor: C.bg}]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchLatest(true)}
            tintColor={C.teal}
            colors={[C.teal]}
          />
        }>

        {/* ── Header ── */}
        <Animated.View
          style={[
            styles.header,
            {opacity: headerOpacity, transform: [{translateY: headerTranslate}]},
          ]}>
          <View>
            <Text style={[styles.greeting, {color: C.textSub}]}>
              {strings.homeGreeting('')}
            </Text>
            <Text style={[styles.headerTitle, {color: C.text}]}>
              {strings.homeQuestion}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, {backgroundColor: C.surface, borderColor: C.border}]}>
            <MaterialIcons name="notifications-none" size={22} color={C.textSub} />
            {/* Red dot */}
            <View style={[styles.notifDot, {backgroundColor: C.red, borderColor: C.bg}]} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Hero Vitals Card ── */}
        <View style={[styles.heroCard, {backgroundColor: C.surface, borderColor: C.border}]}>
          {/* Glow accent top-right */}
          <View style={[styles.heroGlow, {borderColor: C.teal}]} />

          <View style={styles.heroRow}>
            {/* Heart rate ring */}
            <HeartRing bpm={vitals.bpm} hasData={vitals.hasData} />

            {/* Right meta */}
            <View style={styles.heroRight}>
              <Text style={[styles.heroOverline, {color: C.textSub}]}>{strings.homeOverview}</Text>
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreNum, {color: vitals.hasData ? C.text : C.textDim}]}>
                  {vitals.hasData ? score : '—'}
                </Text>
                {vitals.hasData && <Text style={[styles.scoreUnit, {color: C.textSub}]}>/100</Text>}
              </View>
              <View
                style={[
                  styles.scoreBadge,
                  {backgroundColor: C.tealDim, borderColor: C.tealBorder},
                ]}>
                <MaterialIcons name="trending-up" size={12} color={C.teal} />
                <Text style={[styles.scoreBadgeTxt, {color: C.teal}]}>{strings.homeScoreGood}</Text>
              </View>
              <Text style={[styles.heroHint, {color: C.textDim}]}>{strings.homeComparedLastWeek}</Text>
            </View>
          </View>

          {/* Metric pills */}
          <View style={styles.pillRow}>
            <MetricPill
              icon="psychology"
              label="Stress"
              value={vitals.hasData ? `${stress}%` : '—'}
              color={C.purple}
            />
            <MetricPill
              icon="favorite-outline"
              label={strings.homeBloodPressureLabel}
              value={vitals.bp}
              color={C.red}
            />
          </View>

          {/* Loading overlay on first fetch */}
          {loading && !vitals.hasData && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={C.teal} />
              <Text style={[styles.noDataTxt, {color: C.textDim}]}>Đang tải dữ liệu...</Text>
            </View>
          )}

          {/* Chưa có dữ liệu hint */}
          {!loading && !vitals.hasData && (
            <TouchableOpacity
              style={[styles.noDataHint, {backgroundColor: C.tealDim, borderColor: C.tealBorder}]}
              onPress={() => navigation.navigate('MeasurementList')}>
              <MaterialIcons name="add-circle-outline" size={14} color={C.teal} />
              <Text style={[styles.noDataTxt, {color: C.teal}]}>Chưa có dữ liệu — Đo ngay để xem chỉ số</Text>
              <MaterialIcons name="arrow-forward-ios" size={11} color={C.teal} />
            </TouchableOpacity>
          )}

          {/* Animated ECG waveform */}
          <MiniEcgWave color={C.teal} height={40} />
        </View>

        {/* ── Date chip ── */}
        <View style={styles.dateRow}>
          <MaterialIcons name="event" size={13} color={C.textSub} />
          <Text style={[styles.dateText, {color: C.textSub}]}>
            {new Date().toLocaleDateString(
              language === 'vi' ? 'vi-VN' : 'en-US',
              {weekday: 'long', day: 'numeric', month: 'long'},
            )}
          </Text>
          <View style={[styles.dateDivider, {backgroundColor: C.border}]} />
          <View style={[styles.liveDot, {backgroundColor: C.green}]} />
          <Text style={[styles.liveText, {color: C.textSub}]}>{strings.homeLiveUpdate}</Text>
        </View>

        {/* ── Quick Measure section ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <View style={[styles.sectionAccent, {backgroundColor: C.teal}]} />
            <Text style={[styles.sectionTitle, {color: C.text}]}>{strings.homeStartMeasure}</Text>
          </View>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => navigation.navigate('MeasurementList')}>
            <Text style={[styles.seeAllTxt, {color: C.teal}]}>{strings.homeSeeAll}</Text>
            <MaterialIcons name="arrow-forward-ios" size={11} color={C.teal} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionGrid}>
          {actions.map(a => (
            <ActionCard
              key={a.label}
              icon={a.icon}
              label={a.label}
              sub={a.sub}
              color={a.color}
              onPress={() => navigation.navigate(a.route as any)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles (layout/geometry only — no colours) ───────────────────────────────
const styles = StyleSheet.create({
  root: {flex: 1},
  content: {paddingBottom: 110},

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  greeting: {fontSize: 13, marginBottom: 3, fontWeight: '500'},
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
  },

  // Hero card
  heroCard: {
    margin: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'transparent',
    top: -70,
    right: -50,
    opacity: 0.07,
    borderWidth: 60,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  heroRight: {flex: 1, gap: 4},
  heroOverline: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 3},
  scoreNum: {fontSize: 48, fontWeight: '900', lineHeight: 52, letterSpacing: -2},
  scoreUnit: {fontSize: 16, fontWeight: '600', marginBottom: 6},
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  scoreBadgeTxt: {fontSize: 11, fontWeight: '700'},
  heroHint: {fontSize: 11, marginTop: 2},

  // Pill row
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },

  // Date row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dateText: {fontSize: 12, flex: 1},
  dateDivider: {width: 1, height: 12},
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {fontSize: 12},

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionLeft: {flexDirection: 'row', alignItems: 'center', gap: 8},
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionTitle: {fontSize: 17, fontWeight: '800'},
  seeAllBtn: {flexDirection: 'row', alignItems: 'center', gap: 3},
  seeAllTxt: {fontSize: 13, fontWeight: '600'},

  // Action grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },

  // No-data hint
  noDataHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 4,
  },
  loadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, marginTop: 4,
  },
  noDataTxt: {flex: 1, fontSize: 12, fontWeight: '600'},
});

export default HomeScreen;
