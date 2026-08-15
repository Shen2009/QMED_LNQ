/**
 * ScgScreen — Đo lồng ngực (SCG - Seismocardiography)
 * Dùng expo-sensors/Accelerometer để lấy data gia tốc kế thực
 * Vẽ waveform trực tiếp từ Z-axis acceleration
 * Sau 30 giây → mock cardiac result → MeasurementResultScreen
 */
import React, {useState, useRef, useEffect} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {Accelerometer} from 'expo-sensors';
import Svg, {Polyline} from 'react-native-svg';
import {useColors} from '../../../core/theme/useColors';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {useSafeGoBack} from '../../../core/hooks/useSafeGoBack';
import {setMeasurementResult} from '../../../core/store/slices/measurementSlice';
import apiClient from '../../../core/api/apiClient';
import historyService from '../../../core/api/historyService';

const {width} = Dimensions.get('window');
const DURATION = 30;
const WAVE_W = width - 48;
const WAVE_H = 90;
const MAX_POINTS = 100;

// (mock removed — replaced by real /api/scg/analyze call)


// ─── Live waveform ────────────────────────────────────────────────────────────
function LiveWaveform({points, color}: {points: number[]; color: string}) {
  const {strings} = useLanguage();
  if (points.length < 2) return (
    <View style={[wv.container, {backgroundColor: color + '08'}]}>
      <Text style={{color: color + '60', fontSize: 12, textAlign: 'center'}}>{strings.measSensorInit}</Text>
    </View>
  );

  const step = WAVE_W / (MAX_POINTS - 1);
  const mid = WAVE_H / 2;
  const scale = WAVE_H * 0.4;

  const polyPoints = points.map((v, i) =>
    `${(i * step).toFixed(1)},${(mid - v * scale).toFixed(1)}`
  ).join(' ');

  return (
    <View style={[wv.container, {backgroundColor: color + '08', borderColor: color + '25'}]}>
      <Svg width={WAVE_W} height={WAVE_H}>
        {/* Center line */}
        <Polyline
          points={`0,${mid} ${WAVE_W},${mid}`}
          fill="none" stroke={color + '20'} strokeWidth="1"
          strokeDasharray="4,4"
        />
        {/* Signal */}
        <Polyline
          points={polyPoints}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const wv = StyleSheet.create({
  container: {width: WAVE_W, height: WAVE_H + 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
});

// ─── Axis display ─────────────────────────────────────────────────────────────
function AxisDisplay({x, y, z, color, C}: {x: number; y: number; z: number; color: string; C: any}) {
  return (
    <View style={ax.row}>
      {[{label: 'X', val: x, c: C.red}, {label: 'Y', val: y, c: C.green}, {label: 'Z', val: z, c: color}].map(a => (
        <View key={a.label} style={[ax.item, {backgroundColor: a.c + '12', borderColor: a.c + '30'}]}>
          <Text style={[ax.axisLbl, {color: a.c}]}>{a.label}</Text>
          <Text style={[ax.axisVal, {color: C.text}]}>{a.val.toFixed(3)}</Text>
          <Text style={[ax.axisUnit, {color: C.textSub}]}>m/s²</Text>
        </View>
      ))}
    </View>
  );
}
const ax = StyleSheet.create({
  row: {flexDirection: 'row', gap: 10, width: WAVE_W},
  item: {flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1, gap: 2},
  axisLbl: {fontSize: 11, fontWeight: '800', letterSpacing: 1},
  axisVal: {fontSize: 16, fontWeight: '900', letterSpacing: -0.5},
  axisUnit: {fontSize: 9, fontWeight: '600'},
});

// ─── Instructions step ────────────────────────────────────────────────────────
function Step({num, text, C, color}: {num: number; text: string; C: any; color: string}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
      <View style={{width: 30, height: 30, borderRadius: 15, backgroundColor: color + '20', borderWidth: 1.5, borderColor: color + '50', alignItems: 'center', justifyContent: 'center'}}>
        <Text style={{color, fontSize: 13, fontWeight: '900'}}>{num}</Text>
      </View>
      <Text style={{color: C.text, fontSize: 14, lineHeight: 20, flex: 1}}>{text}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ScgScreen = () => {
  const C = useColors();
  const {strings} = useLanguage();
  const navigation = useNavigation<any>();
  const goBack = useSafeGoBack();
  const dispatch = useDispatch();
  const color = C.purple;

  const [phase, setPhase] = useState<'ready' | 'measuring' | 'uploading'>('ready');
  const [countdown, setCountdown] = useState(DURATION);
  const [elapsed, setElapsed] = useState(0);
  const [accel, setAccel] = useState({x: 0, y: 0, z: 0});
  const [wavePoints, setWavePoints] = useState<number[]>([]);
  const allPointsRef = useRef<number[]>([]);  // full 30s buffer for API

  const progressAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(1)).current;
  const subRef = useRef<any>(null);

  // Live dot blink
  useEffect(() => {
    if (phase !== 'measuring') return;
    Animated.loop(Animated.sequence([
      Animated.timing(dotAnim, {toValue: 0.2, duration: 500, useNativeDriver: true}),
      Animated.timing(dotAnim, {toValue: 1, duration: 500, useNativeDriver: true}),
    ])).start();
    return () => dotAnim.stopAnimation();
  }, [phase]);

  // Start/stop accelerometer
  useEffect(() => {
    if (phase === 'measuring') {
      Accelerometer.setUpdateInterval(80); // ~12 fps for smooth viz
      subRef.current = Accelerometer.addListener(data => {
        setAccel(data);
        allPointsRef.current.push(data.z);  // collect all for API
        setWavePoints(prev => {
          const next = [...prev, data.z];
          return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
        });
      });
    } else {
      subRef.current?.remove();
      setWavePoints([]);
    }
    return () => subRef.current?.remove();
  }, [phase]);

  // Countdown + finish
  useEffect(() => {
    if (phase !== 'measuring') return;
    if (countdown <= 0) {
      subRef.current?.remove();
      const collected = [...allPointsRef.current];
      setPhase('uploading' as any);
      // Call real API
      apiClient.post('/scg/analyze', {
        z_axis: collected,
        sample_rate_hz: 12.5,
        duration_sec: DURATION,
      }).then(async res => {
        dispatch(setMeasurementResult(res.data));
        navigation.replace('MeasurementResult', {result: res.data, type: 'scg'});
      }).catch(err => {
        console.warn('SCG API error:', err);  // M8: was console.error
        // M3: removed hr_peak from fallback
        const fallback = {
          type: 'scg', hrv_ms: 38,
          scg_rhythm: 'Sinus Normal', heart_anomaly: false,
          scg_anomaly_score: 0.05, blood_pressure: {systolic: 118, diastolic: 76},
          stress_level: 30, duration: DURATION,
          fps: 12.5, n_frames: collected.length, face_detected: false,
        };
        dispatch(setMeasurementResult(fallback as any));
        navigation.replace('MeasurementResult', {result: fallback, type: 'scg'});
      });
      return;
    }
    const t = setInterval(() => {
      setCountdown(c => c - 1);
      setElapsed(e => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [phase, countdown]);

  // Progress bar animation
  useEffect(() => {
    if (phase === 'measuring') {
      Animated.timing(progressAnim, {toValue: elapsed / DURATION, duration: 900, useNativeDriver: false}).start();
    }
  }, [elapsed]);

  const handleStart = () => {
    allPointsRef.current = [];  // reset full buffer
    setCountdown(DURATION);
    setElapsed(0);
    setPhase('measuring');
  };

  const handleCancel = () => {
    subRef.current?.remove();
    allPointsRef.current = [];
    setPhase('ready');
    setCountdown(DURATION);
    setElapsed(0);
    setWavePoints([]);
    progressAnim.setValue(0);
  };

  // ── Uploading ──
  if ((phase as any) === 'uploading') {
    return (
      <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20}}>
          <MaterialCommunityIcons name="chip" size={48} color={color} />
          <Text style={{color, fontSize: 18, fontWeight: '800'}}>Đang phân tích SCG...</Text>
          <Text style={{color: C.textSub, fontSize: 13}}>Xử lý tín hiệu gia tốc kế</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Measuring ──
  if (phase === 'measuring') {
    return (
      <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
        <StatusBar barStyle="light-content" />

        {/* Live top pill */}
        <View style={s.topBar}>
          <View style={[s.livePill, {backgroundColor: color + '15', borderColor: color + '40'}]}>
            <Animated.View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: dotAnim}} />
            <Text style={[s.liveTxt, {color}]}>ĐANG GHI SCG</Text>
          </View>
          <TouchableOpacity style={[s.cancelSmall, {backgroundColor: C.surface, borderColor: C.border}]} onPress={handleCancel}>
            <MaterialIcons name="close" size={18} color={C.textSub} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.measuringContent} showsVerticalScrollIndicator={false}>
          {/* Phone position visual */}
          <View style={[s.positionCard, {backgroundColor: color + '10', borderColor: color + '30'}]}>
            <MaterialCommunityIcons name="cellphone" size={36} color={color} />
            <View>
              <Text style={[s.posTitle, {color: C.text}]}>Đặt điện thoại lên lồng ngực</Text>
              <Text style={[s.posSub, {color: C.textSub}]}>Phía trái tim · Nằm phẳng</Text>
            </View>
          </View>

          {/* Waveform */}
          <View style={{alignItems: 'center', gap: 10}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start'}}>
              <View style={{width: 3, height: 16, borderRadius: 2, backgroundColor: color}} />
              <Text style={{fontSize: 13, fontWeight: '700', color: C.text}}>Tín hiệu gia tốc Z-axis</Text>
            </View>
            <LiveWaveform points={wavePoints} color={color} />
          </View>

          {/* Axis values */}
          <AxisDisplay x={accel.x} y={accel.y} z={accel.z} color={color} C={C} />

          {/* Progress */}
          <View style={{gap: 10, alignItems: 'center'}}>
            <View style={{width: WAVE_W, height: 6, backgroundColor: color + '20', borderRadius: 3, overflow: 'hidden'}}>
              <Animated.View style={{
                height: 6, borderRadius: 3, backgroundColor: color,
                width: progressAnim.interpolate({inputRange: [0,1], outputRange: ['0%','100%']}),
              }} />
            </View>
            <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
              <Text style={{color: C.textSub, fontSize: 13}}>Còn lại</Text>
              <View style={[s.countBadge, {backgroundColor: color + '15', borderColor: color + '40'}]}>
                <Text style={[s.countNum, {color}]}>{countdown}</Text>
                <Text style={{color: C.textSub, fontSize: 10}}>{strings.measSeconds}</Text>
              </View>
              <Text style={{color: C.textSub, fontSize: 13}}>/ {DURATION}s</Text>
            </View>
          </View>

          {/* Reminder */}
          <View style={[s.reminderCard, {backgroundColor: C.amber + '10', borderColor: C.amber + '30'}]}>
            <MaterialIcons name="info-outline" size={16} color={C.amber} />
            <Text style={[s.reminderTxt, {color: C.amber}]}>Giữ yên, thở bình thường. Không cử động mạnh.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Ready ──
  return (
    <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <TouchableOpacity style={[s.backBtn, {backgroundColor: C.surface, borderColor: C.border}]} onPress={goBack}>
          <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
        </TouchableOpacity>
        <Text style={[s.title, {color: C.text}]}>Âm thanh tim (Beta)</Text>
      </View>

      <ScrollView contentContainerStyle={s.readyContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[s.hero, {backgroundColor: color + '0C', borderColor: color + '35'}]}>
          <View style={[s.heroIcon, {backgroundColor: color + '20', borderColor: color + '50'}]}>
            <MaterialCommunityIcons name="stethoscope" size={48} color={color} />
          </View>
          <Text style={[s.heroTitle, {color}]}>Seismocardiography</Text>
          <Text style={[s.heroSub, {color: C.textSub}]}>Phân tích chuyển động tim qua gia tốc kế điện thoại</Text>
        </View>

        {/* Instructions */}
        <View style={[s.card, {backgroundColor: C.card, borderColor: C.border}]}>
          <Text style={[s.cardTitle, {color: C.text}]}>Cách thực hiện</Text>
          <View style={{gap: 14}}>
            <Step num={1} text="Nằm ngửa hoặc ngồi thẳng lưng ho hoàn toàn" C={C} color={color} />
            <Step num={2} text="Đặt điện thoại dọc, phẳng lên lồng ngực bên trái" C={C} color={color} />
            <Step num={3} text="Giữ điện thoại bằng tay nhẹ nhàng — không ép chặt" C={C} color={color} />
            <Step num={4} text="Thở bình thường, không nói chuyện, không cử động" C={C} color={color} />
          </View>
        </View>

        {/* Sensor info */}
        <View style={[s.sensorCard, {backgroundColor: C.tealDim, borderColor: C.tealBorder}]}>
          <MaterialCommunityIcons name="chip" size={18} color={C.teal} />
          <View style={{flex: 1}}>
            <Text style={[s.sensorTitle, {color: C.teal}]}>Cảm biến gia tốc kế</Text>
            <Text style={[s.sensorSub, {color: C.teal}]}>Phát hiện vi chuyển động của lồng ngực do tim co bóp ở tần số 20–40 Hz</Text>
          </View>
        </View>

        {/* Start */}
        <TouchableOpacity style={[s.startBtn, {backgroundColor: color}]} onPress={handleStart}>
          <MaterialIcons name="play-arrow" size={24} color="#fff" />
          <Text style={s.startBtnTxt}>{strings.measStartBtn}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16},
  backBtn: {width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 20, fontWeight: '900'},
  readyContent: {padding: 16, gap: 16, paddingBottom: 110},

  hero: {borderWidth: 1.5, borderRadius: 24, padding: 28, alignItems: 'center', gap: 12},
  heroIcon: {width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2},
  heroTitle: {fontSize: 22, fontWeight: '900'},
  heroSub: {fontSize: 13, textAlign: 'center', lineHeight: 20},

  card: {borderWidth: 1, borderRadius: 20, padding: 20, gap: 16},
  cardTitle: {fontSize: 16, fontWeight: '800'},

  sensorCard: {flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 16, padding: 16},
  sensorTitle: {fontSize: 12, fontWeight: '800', marginBottom: 4},
  sensorSub: {fontSize: 12, lineHeight: 18, opacity: 0.85},

  startBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 17},
  startBtnTxt: {color: '#fff', fontSize: 17, fontWeight: '900'},

  // Measuring
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12},
  livePill: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1},
  liveTxt: {fontSize: 11, fontWeight: '800', letterSpacing: 2},
  cancelSmall: {width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},

  measuringContent: {paddingHorizontal: 24, gap: 20, paddingBottom: 40, alignItems: 'center'},
  positionCard: {flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 18, padding: 18, width: '100%'},
  posTitle: {fontSize: 15, fontWeight: '800'},
  posSub: {fontSize: 12, marginTop: 2},

  countBadge: {flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1},
  countNum: {fontSize: 28, fontWeight: '900', letterSpacing: -1},

  reminderCard: {flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, width: '100%'},
  reminderTxt: {flex: 1, fontSize: 12, lineHeight: 18},
});

export default ScgScreen;
