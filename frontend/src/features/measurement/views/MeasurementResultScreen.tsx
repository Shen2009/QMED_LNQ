import React, {useRef, useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, StatusBar, ActivityIndicator, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation} from '@react-navigation/native';
import {MaterialCommunityIcons, MaterialIcons} from '@expo/vector-icons';
import {useColors} from '../../../core/theme/useColors';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {useSafeGoBack} from '../../../core/hooks/useSafeGoBack';
import historyService from '../../../core/api/historyService';

const {width} = Dimensions.get('window');

// ─── Label helpers ────────────────────────────────────────────────────────────
function bpmStatus(bpm: number, C: any) {
  if (bpm < 60) return {color: C.amber,  label: 'Thấp', icon: 'trending-down'};
  if (bpm > 100) return {color: C.red,   label: 'Cao',  icon: 'trending-up'};
  return               {color: C.green,  label: 'Bình thường', icon: 'check-circle'};
}
function bpStatus(sys: number, C: any) {
  if (sys < 90)  return {color: C.blue,  label: 'Huyết áp thấp'};
  if (sys > 140) return {color: C.red,   label: 'Huyết áp cao'};
  if (sys > 120) return {color: C.amber, label: 'Bình thường cao'};
  return               {color: C.green,  label: 'Bình thường'};
}
function stressStatus(s: number, C: any) {
  if (s < 30) return {color: C.green,  label: 'Thấp',     icon: 'emoticon-happy-outline',   desc: 'Tinh thần thoải mái, ít căng thẳng'};
  if (s < 60) return {color: C.amber,  label: 'Trung bình', icon: 'emoticon-neutral-outline', desc: 'Mức stress có thể kiểm soát được'};
  return             {color: C.red,    label: 'Cao',       icon: 'emoticon-sad-outline',      desc: 'Cần nghỉ ngơi và giảm áp lực'};
}


// ─── Animated entry ───────────────────────────────────────────────────────────
function FadeSlide({children, delay = 0}: {children: React.ReactNode; delay?: number}) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(22)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  {toValue: 1, duration: 500, delay, useNativeDriver: true}),
      Animated.timing(slide, {toValue: 0, duration: 500, delay, useNativeDriver: true}),
    ]).start();
  }, []);
  return <Animated.View style={{opacity: fade, transform: [{translateY: slide}]}}>{children}</Animated.View>;
}

// ─── Hero BPM ring ────────────────────────────────────────────────────────────
function BPMRing({bpm, color}: {bpm: number; color: string}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, {toValue: 1.07, duration: 500, useNativeDriver: true}),
      Animated.timing(pulse, {toValue: 1,    duration: 500, useNativeDriver: true}),
      Animated.delay(200),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ring1, {toValue: 1.3, duration: 1000, useNativeDriver: true}),
      Animated.timing(ring1, {toValue: 1,   duration: 0,    useNativeDriver: true}),
      Animated.delay(500),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(250),
      Animated.timing(ring2, {toValue: 1.5, duration: 1200, useNativeDriver: true}),
      Animated.timing(ring2, {toValue: 1,   duration: 0,    useNativeDriver: true}),
      Animated.delay(300),
    ])).start();
  }, []);

  return (
    <View style={{width: 170, height: 170, alignItems: 'center', justifyContent: 'center'}}>
      <Animated.View style={{position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: color, opacity: ring1.interpolate({inputRange:[1,1.3],outputRange:[0.08,0]}), transform: [{scale: ring1}]}} />
      <Animated.View style={{position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: color, opacity: ring2.interpolate({inputRange:[1,1.5],outputRange:[0.06,0]}), transform: [{scale: ring2}]}} />
      <View style={{position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 14, borderColor: color + '25'}} />
      <View style={{position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderColor: color + '18'}} />
      <View style={{alignItems: 'center', gap: 2}}>
        <Animated.View style={{transform: [{scale: pulse}]}}>
          <MaterialIcons name="favorite" size={26} color={color} />
        </Animated.View>
        <Text style={{fontSize: 52, fontWeight: '900', color, letterSpacing: -3, lineHeight: 56}}>{bpm}</Text>
        <Text style={{fontSize: 11, fontWeight: '800', color: color + 'AA', letterSpacing: 2}}>BPM</Text>
      </View>
    </View>
  );
}

// ─── Gauge bar ────────────────────────────────────────────────────────────────
function GaugeBar({value, max, color, label, unit, C}: {
  value: number; max: number; color: string; label: string; unit: string; C: any;
}) {
  const pct = Math.min(1, value / max);
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, {toValue: pct, duration: 1000, delay: 200, useNativeDriver: false}).start();
  }, []);

  return (
    <View style={{gap: 6}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <Text style={{fontSize: 12, fontWeight: '600', color: C.textSub}}>{label}</Text>
        <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 2}}>
          <Text style={{fontSize: 18, fontWeight: '900', color: C.text}}>{value}</Text>
          <Text style={{fontSize: 10, fontWeight: '600', color: C.textSub}}>{unit}</Text>
        </View>
      </View>
      <View style={{height: 7, backgroundColor: color + '20', borderRadius: 4, overflow: 'hidden'}}>
        <Animated.View style={{
          height: 7, borderRadius: 4, backgroundColor: color,
          width: barAnim.interpolate({inputRange: [0, 1], outputRange: ['0%', '100%']}),
        }} />
      </View>
    </View>
  );
}

// ─── Metric pill ──────────────────────────────────────────────────────────────
function MetricPill({icon, label, value, unit, color, C}: {
  icon: string; label: string; value: string; unit: string; color: string; C: any;
}) {
  return (
    <View style={[mp.pill, {backgroundColor: C.card, borderColor: C.border}]}>
      <View style={[mp.iconBox, {backgroundColor: color + '18'}]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[mp.label, {color: C.textSub}]}>{label}</Text>
      <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 2}}>
        <Text style={[mp.value, {color: C.text}]}>{value}</Text>
        <Text style={[mp.unit, {color: C.textSub}]}>{unit}</Text>
      </View>
    </View>
  );
}
const mp = StyleSheet.create({
  pill: {flex: 1, borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 6},
  iconBox: {width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  label: {fontSize: 10, fontWeight: '600', textAlign: 'center'},
  value: {fontSize: 20, fontWeight: '900', letterSpacing: -0.5},
  unit: {fontSize: 10, fontWeight: '600'},
});

// ─── Score circle (for stress) ─────────────────────────────────────────
function ScoreCircle({score, color, label}: {score: number; color: string; label: string}) {
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    Animated.timing(countAnim, {toValue: score, duration: 1200, useNativeDriver: false}).start();
    countAnim.addListener(({value}) => setDisplayed(Math.round(value)));
    return () => countAnim.removeAllListeners();
  }, []);
  return (
    <View style={{alignItems: 'center', gap: 6}}>
      <View style={{width: 100, height: 100, alignItems: 'center', justifyContent: 'center'}}>
        <View style={{position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 10, borderColor: color + '20'}} />
        <View style={{position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: color + '15'}} />
        <Text style={{fontSize: 34, fontWeight: '900', color, letterSpacing: -1}}>{displayed}</Text>
        <Text style={{fontSize: 9, fontWeight: '800', color: color + 'BB', letterSpacing: 1}}>/ 100</Text>
      </View>
      <Text style={{fontSize: 11, fontWeight: '700', color}}>{label}</Text>
    </View>
  );
}

// ─── Recommendation item ──────────────────────────────────────────────────────
function RecItem({text, C}: {text: string; C: any}) {
  const icon = text.startsWith('⚠️') ? 'alert' : text.startsWith('✅') ? 'check-circle' : 'information';
  const color = text.startsWith('⚠️') ? C.red : text.startsWith('✅') ? C.green : C.teal;
  return (
    <View style={[ri.row, {backgroundColor: color + '0C', borderColor: color + '25'}]}>
      <MaterialCommunityIcons name={icon as any} size={16} color={color} />
      <Text style={[ri.text, {color: C.text}]}>{text.replace('⚠️ ', '').replace('✅ ', '').replace('💧 ', '').replace('🏃 ', '').replace('🧂 ', '').replace('🧘 ', '')}</Text>
    </View>
  );
}
const ri = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1},
  text: {flex: 1, fontSize: 13, lineHeight: 20},
});

// ─── BP visual ────────────────────────────────────────────────────────────────
function BPDisplay({sys, dia, color, C}: {sys: number; dia: number; color: string; C: any}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 16}}>
      <View style={{alignItems: 'center', gap: 4}}>
        <Text style={{fontSize: 50, fontWeight: '900', color: C.red, letterSpacing: -3, lineHeight: 52}}>{sys}</Text>
        <Text style={{fontSize: 10, fontWeight: '600', color: C.textSub}}>mmHg</Text>
        <Text style={{fontSize: 12, fontWeight: '700', color: C.textSub}}>Tâm thu</Text>
      </View>
      <View style={{alignItems: 'center', gap: 6}}>
        <Text style={{fontSize: 28, fontWeight: '300', color: C.border}}>/</Text>
        <View style={[{paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8}, {backgroundColor: color + '18'}]}>
          <Text style={{fontSize: 10, fontWeight: '800', color}}>{bpStatus(sys, C).label}</Text>
        </View>
      </View>
      <View style={{alignItems: 'center', gap: 4}}>
        <Text style={{fontSize: 50, fontWeight: '900', color: C.blue, letterSpacing: -3, lineHeight: 52}}>{dia}</Text>
        <Text style={{fontSize: 10, fontWeight: '600', color: C.textSub}}>mmHg</Text>
        <Text style={{fontSize: 12, fontWeight: '700', color: C.textSub}}>Tâm trương</Text>
      </View>
    </View>
  );
}

// ─── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({title, accentColor, children, C}: {title: string; accentColor: string; children: React.ReactNode; C: any}) {
  return (
    <View style={[sec.card, {backgroundColor: C.card, borderColor: C.border}]}>
      <View style={sec.header}>
        <View style={[sec.accent, {backgroundColor: accentColor}]} />
        <Text style={[sec.title, {color: C.text}]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sec = StyleSheet.create({
  card: {margin: 16, marginTop: 0, borderWidth: 1, borderRadius: 20, padding: 20, gap: 14},
  header: {flexDirection: 'row', alignItems: 'center', gap: 8},
  accent: {width: 3.5, height: 18, borderRadius: 2},
  title: {fontSize: 16, fontWeight: '800'},
});

// ─── Per-type content ─────────────────────────────────────────────────────────
function FaceRppgContent({result, C}: {result: any; C: any}) {
  const bpm = result?.hr_fft ?? 72;
  const hr = bpmStatus(bpm, C);
  
  // Conditionally extract fields if they exist from the backend
  const hasBp = result?.blood_pressure !== undefined;
  const sys = result?.blood_pressure?.systolic;
  const dia = result?.blood_pressure?.diastolic;
  
  const hasStress = result?.stress_level !== undefined;
  const stress = result?.stress_level;

  return (
    <>
      {/* BPM hero */}
      <FadeSlide delay={50}>
        <View style={[r.heroCard, {backgroundColor: C.surface, borderColor: hr.color + '30'}]}>
          <View style={{alignItems: 'center', gap: 6}}>
            <View style={[r.badge, {backgroundColor: hr.color + '18', borderColor: hr.color + '40'}]}>
              <MaterialIcons name="favorite" size={12} color={hr.color} />
              <Text style={[r.badgeTxt, {color: hr.color}]}>Nhịp tim · {hr.label}</Text>
            </View>
            <BPMRing bpm={bpm} color={hr.color} />
            <View style={r.hrMeta}>
              <View style={r.hrMetaItem}>
                <Text style={[r.metaLbl, {color: C.textSub}]}>FFT</Text>
                <Text style={[r.metaVal, {color: C.blue}]}>{result?.hr_fft ?? '—'}</Text>
              </View>
            </View>
          </View>
        </View>
      </FadeSlide>

      {/* Blood pressure */}
      {hasBp && (
        <FadeSlide delay={150}>
          <SectionCard title="Huyết áp" accentColor={bpStatus(sys, C).color} C={C}>
            <BPDisplay sys={sys} dia={dia} color={bpStatus(sys, C).color} C={C} />
          </SectionCard>
        </FadeSlide>
      )}

      {/* Vitals grid */}
      {hasStress && (
        <FadeSlide delay={250}>
          <View style={[r.pillRow, {marginHorizontal: 16, marginBottom: 16}]}>
            <MetricPill icon={stressStatus(stress, C).icon} label="Stress" value={`${stress}`} unit="/100" color={stressStatus(stress, C).color} C={C} />
          </View>
        </FadeSlide>
      )}

      {/* Anomaly */}
      <FadeSlide delay={350}>
        <AnomalyCard anomaly={result?.heart_anomaly ?? false} C={C} />
      </FadeSlide>
    </>
  );
}

function ContactPpgContent({result, C}: {result: any; C: any}) {
  const bpm = result?.hr_fft ?? 72;
  const hr = bpmStatus(bpm, C);
  const sys = result?.blood_pressure?.systolic ?? 118;
  const dia = result?.blood_pressure?.diastolic ?? 76;
  const pi = result?.perfusion_index ?? '1.8';
  const quality = result?.signal_quality ?? 85;
  const bp = bpStatus(sys, C);

  return (
    <>
      <FadeSlide delay={50}>
        <View style={[r.heroCard, {backgroundColor: C.surface, borderColor: hr.color + '30'}]}>
          <View style={{alignItems: 'center', gap: 6}}>
            <View style={[r.badge, {backgroundColor: hr.color + '18', borderColor: hr.color + '40'}]}>
              <MaterialIcons name="fingerprint" size={12} color={hr.color} />
              <Text style={[r.badgeTxt, {color: hr.color}]}>PPG · {hr.label}</Text>
            </View>
            <BPMRing bpm={bpm} color={hr.color} />
            <View style={r.hrMeta}>
              <View style={r.hrMetaItem}>
                <Text style={[r.metaLbl, {color: C.textSub}]}>FFT</Text>
                <Text style={[r.metaVal, {color: C.blue}]}>{result?.hr_fft ?? '—'}</Text>
              </View>
            </View>
          </View>
        </View>
      </FadeSlide>

      <FadeSlide delay={150}>
        <SectionCard title="Huyết áp" accentColor={bp.color} C={C}>
          <BPDisplay sys={sys} dia={dia} color={bp.color} C={C} />
        </SectionCard>
      </FadeSlide>

      <FadeSlide delay={250}>
        <SectionCard title="Chất lượng tín hiệu" accentColor={C.green} C={C}>
          <GaugeBar value={quality} max={100} color={C.green} label="Chất lượng PPG" unit="%" C={C} />
          <View style={r.pillRow}>
            <MetricPill icon="water-percent" label="Chỉ số PI" value={`${pi}`} unit="%" color={C.blue} C={C} />
          </View>
        </SectionCard>
      </FadeSlide>

      <FadeSlide delay={350}>
        <AnomalyCard anomaly={result?.heart_anomaly ?? false} C={C} />
      </FadeSlide>
    </>
  );
}

function ScgContent({result, C}: {result: any; C: any}) {
  const anomaly = result?.heart_anomaly ?? false;
  const anomalyScore = result?.scg_anomaly_score ?? 0.08;
  const hrv = result?.hrv_ms ?? 42;
  const rhythm = result?.scg_rhythm ?? 'Sinus Normal';
  const anomalyColor = anomaly ? C.red : C.green;
  const hrvColor = hrv > 50 ? C.green : hrv > 30 ? C.amber : C.red;

  return (
    <>
      <FadeSlide delay={50}>
        <View style={[r.heroCard, {backgroundColor: C.surface, borderColor: anomalyColor + '30'}]}>
          <View style={{alignItems: 'center', gap: 10}}>
            <View style={[r.badge, {backgroundColor: anomalyColor + '18', borderColor: anomalyColor + '40'}]}>
              <MaterialCommunityIcons name={anomaly ? 'heart-off' : 'check-circle-outline'} size={12} color={anomalyColor} />
              <Text style={[r.badgeTxt, {color: anomalyColor}]}>SCG · {anomaly ? 'Cần chú ý' : 'Bình thường'}</Text>
            </View>
            {/* HRV hero — thay BPM ring vì SCG đo nhịp tim cơ học, không dùng rPPG */}
            <View style={{alignItems: 'center', gap: 4, paddingVertical: 12}}>
              <Text style={{fontSize: 72, fontWeight: '900', color: hrvColor, letterSpacing: -4, lineHeight: 76}}>{hrv}</Text>
              <Text style={{fontSize: 11, fontWeight: '800', color: hrvColor + 'AA', letterSpacing: 2}}>ms · HRV</Text>
            </View>
            <Text style={{fontSize: 12, color: C.textSub, textAlign: 'center'}}>
              {hrv > 50 ? 'HRV tốt — hệ thần kinh tự chủ cân bằng' : hrv > 30 ? 'HRV trung bình' : 'HRV thấp — có thể do stress hoặc mệt mỏi'}
            </Text>
          </View>
        </View>
      </FadeSlide>

      <FadeSlide delay={150}>
        <SectionCard title="Phân tích nhịp tim SCG" accentColor={anomalyColor} C={C}>
          <View style={[r.rhythmCard, {backgroundColor: anomalyColor + '10', borderColor: anomalyColor + '30'}]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <View style={{width: 48, height: 48, borderRadius: 14, backgroundColor: anomalyColor + '20', alignItems: 'center', justifyContent: 'center'}}>
                <MaterialCommunityIcons name={anomaly ? 'heart-off' : 'check-circle'} size={26} color={anomalyColor} />
              </View>
              <View style={{flex: 1}}>
                <Text style={{fontSize: 14, fontWeight: '800', color: C.text}}>{rhythm}</Text>
                <Text style={{fontSize: 12, color: anomalyColor, marginTop: 2}}>
                  {anomaly ? 'Phát hiện bất thường — nên tham khảo bác sĩ' : 'Nhịp tim đều và ổn định'}
                </Text>
              </View>
            </View>
          </View>
          <GaugeBar value={Math.round(anomalyScore * 100)} max={100} color={anomaly ? C.red : C.green} label="Điểm bất thường" unit="%" C={C} />
        </SectionCard>
      </FadeSlide>

      <FadeSlide delay={250}>
        <SectionCard title="Biến thiên nhịp tim (HRV)" accentColor={C.purple} C={C}>
          <View style={r.pillRow}>
            <MetricPill icon="heart-pulse" label="HRV" value={`${hrv}`} unit="ms" color={hrvColor} C={C} />
            <MetricPill icon="lightning-bolt" label="Stress SCG" value={`${result?.stress_level ?? '—'}`} unit="/100" color={result?.stress_level > 60 ? C.red : result?.stress_level > 40 ? C.amber : C.green} C={C} />
          </View>
          <GaugeBar value={hrv} max={80} color={C.purple} label="Chỉ số HRV" unit="ms" C={C} />
        </SectionCard>
      </FadeSlide>
    </>
  );
}

function StressContent({result, C}: {result: any; C: any}) {
  const stress   = result?.stress_level ?? null;
  const stInfo   = stressStatus(stress ?? 0, C);
  const hrv      = result?.hrv_ms ?? null;
  const recovery = result?.recovery_score ?? null;
  const noData   = stress === null;

  return (
    <>
      <FadeSlide delay={50}>
        <View style={[r.heroCard, {backgroundColor: C.surface, borderColor: stInfo.color + '30'}]}>
          <View style={{alignItems: 'center', gap: 14}}>
            <View style={[r.badge, {backgroundColor: stInfo.color + '18', borderColor: stInfo.color + '40'}]}>
              <MaterialCommunityIcons name={stInfo.icon as any} size={12} color={stInfo.color} />
              <Text style={[r.badgeTxt, {color: stInfo.color}]}>Stress · {noData ? 'Chưa có dữ liệu' : stInfo.label}</Text>
            </View>
            {noData ? (
              <Text style={{fontSize: 14, color: C.textSub, textAlign: 'center', paddingVertical: 16}}>
                Không thể phân tích — video quá ngắn hoặc không nhận diện được khuôn mặt.
              </Text>
            ) : (
              <>
                <View style={{flexDirection: 'row', gap: 24, alignItems: 'center'}}>
                  <ScoreCircle score={stress!} color={stInfo.color} label="Stress" />
                  {recovery !== null && (
                    <>
                      <View style={{width: 1, height: 80, backgroundColor: C.border}} />
                      <ScoreCircle score={recovery} color={C.green} label="Phục hồi" />
                    </>
                  )}
                </View>
                <Text style={{fontSize: 13, color: C.textSub, textAlign: 'center'}}>{stInfo.desc}</Text>
              </>
            )}
          </View>
        </View>
      </FadeSlide>

      {!noData && (
        <>
          <FadeSlide delay={150}>
            <SectionCard title="Phân tích chi tiết" accentColor={stInfo.color} C={C}>
              <GaugeBar value={stress!} max={100} color={stInfo.color} label="Mức stress" unit="/100" C={C} />
              {recovery !== null && <GaugeBar value={recovery} max={100} color={C.green} label="Khả năng phục hồi" unit="/100" C={C} />}
            </SectionCard>
          </FadeSlide>

          <FadeSlide delay={250}>
            <SectionCard title="Biến thiên nhịp tim" accentColor={C.purple} C={C}>
              <MetricPill icon="heart-pulse" label="HRV" value={hrv !== null ? `${hrv}` : '—'} unit="ms" color={hrv !== null ? (hrv > 50 ? C.green : hrv > 30 ? C.amber : C.red) : C.textSub} C={C} />
            </SectionCard>
          </FadeSlide>
        </>
      )}
    </>
  );
}

// ─── Blood Pressure content ────────────────────────────────────────────────────
function BloodPressureContent({result, C}: {result: any; C: any}) {
  const sys = result?.systolic_avg ?? result?.systolic ?? null;
  const dia = result?.diastolic_avg ?? result?.diastolic ?? null;
  const noData = sys === null || dia === null;
  const bp = noData ? {color: C.textSub, label: 'Không có dữ liệu'} : bpStatus(sys, C);
  const predictions: any[] = result?.predictions ?? [];

  return (
    <>
      <FadeSlide delay={50}>
        <View style={[r.heroCard, {backgroundColor: C.surface, borderColor: bp.color + '30'}]}>
          <View style={{alignItems: 'center', gap: 12}}>
            <View style={[r.badge, {backgroundColor: bp.color + '18', borderColor: bp.color + '40'}]}>
              <MaterialCommunityIcons name="heart-pulse" size={12} color={bp.color} />
              <Text style={[r.badgeTxt, {color: bp.color}]}>Huyết áp · {bp.label}</Text>
            </View>
            {noData ? (
              <Text style={{fontSize: 14, color: C.textSub, textAlign: 'center', paddingVertical: 16}}>
                Không thể tính huyết áp — chất lượng video không đủ hoặc khuôn mặt không được nhận diện.
              </Text>
            ) : (
              <BPDisplay sys={Math.round(sys)} dia={Math.round(dia)} color={bp.color} C={C} />
            )}
          </View>
        </View>
      </FadeSlide>

      {!noData && (
        <>
          <FadeSlide delay={150}>
            <SectionCard title="Phân tích chi tiết" accentColor={bp.color} C={C}>
              <GaugeBar value={Math.round(sys)} max={180} color={C.red} label="Tâm thu (Systolic)" unit="mmHg" C={C} />
              <GaugeBar value={Math.round(dia)} max={120} color={C.blue} label="Tâm trương (Diastolic)" unit="mmHg" C={C} />
            </SectionCard>
          </FadeSlide>

          {predictions.length > 0 && (
            <FadeSlide delay={250}>
              <SectionCard title={`Dự đoán theo cửa sổ (${predictions.length} mẫu)`} accentColor={C.purple} C={C}>
                <View style={{flexDirection: 'row', gap: 10}}>
                  <MetricPill
                    icon="trending-up"
                    label="SBP trung bình"
                    value={`${Math.round(sys)}`}
                    unit="mmHg"
                    color={C.red}
                    C={C}
                  />
                  <MetricPill
                    icon="trending-down"
                    label="DBP trung bình"
                    value={`${Math.round(dia)}`}
                    unit="mmHg"
                    color={C.blue}
                    C={C}
                  />
                </View>
              </SectionCard>
            </FadeSlide>
          )}
        </>
      )}
    </>
  );
}

// ─── Anomaly card ─────────────────────────────────────────────────────────────
function AnomalyCard({anomaly, C}: {anomaly: boolean; C: any}) {
  const {strings} = useLanguage();
  const color = anomaly ? C.red : C.green;
  return (
    <View style={[an.card, {backgroundColor: color + '0D', borderColor: color + '30'}]}>
      <View style={[an.iconBox, {backgroundColor: color + '20'}]}>
        <MaterialCommunityIcons name={anomaly ? 'heart-off' : 'check-circle-outline'} size={26} color={color} />
      </View>
      <View style={{flex: 1}}>
        <Text style={[an.title, {color: C.text}]}>Phân tích nhịp tim</Text>
        <Text style={[an.sub, {color}]}>
          {anomaly ? strings.measRhythmAnomaly : strings.measRhythmNormal}
        </Text>
      </View>
    </View>
  );
}
const an = StyleSheet.create({
  card: {flexDirection: 'row', alignItems: 'flex-start', gap: 14, margin: 16, marginTop: 0, borderWidth: 1, borderRadius: 18, padding: 18},
  iconBox: {width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 14, fontWeight: '800'},
  sub: {fontSize: 13, lineHeight: 20, marginTop: 4},
});

// ─── Recommendations per type ─────────────────────────────────────────────────
function getRecommendations(type: string, result: any, C: any): string[] {
  const recs: string[] = [];
  const bpm = result?.hr_fft ?? 72;
  const sys = result?.blood_pressure?.systolic ?? 118;
  const stress = result?.stress_level ?? 32;
  const anomaly = result?.heart_anomaly ?? false;
  if (anomaly) recs.push('⚠️ Phát hiện bất thường nhịp tim — nên gặp bác sĩ tim mạch để kiểm tra thêm.');
  if (bpm > 100) recs.push('💧 Nhịp tim cao hơn bình thường — nghỉ ngơi, bổ sung nước và tránh caffeine.');
  if (bpm < 60) recs.push('🏃 Nhịp tim thấp — thử vận động nhẹ 30 phút mỗi ngày để tăng cường tim mạch.');
  if (sys > 130) recs.push('🧂 Huyết áp cao — giảm muối, tránh rượu bia và theo dõi thường xuyên.');

  if (type === 'stress') {
    if (stress > 60) recs.push('🧘 Stress cao — thử thiền 10 phút/ngày, tập yoga hoặc đi bộ trong thiên nhiên.');
  }
  if (type === 'scg') {
    recs.push('🏃‍♂️ Tập thể dục aerobic 150 phút/tuần giúp cải thiện chức năng tim mạch đáng kể.');
  }

  if (recs.length === 0) recs.push('✅ Chỉ số sức khoẻ tốt! Duy trì lối sống lành mạnh và đo định kỳ mỗi ngày.');
  return recs;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MeasurementResultScreen = () => {
  const C = useColors();
  const {language} = useLanguage();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const goBack = useSafeGoBack('Main');
  const {result, type} = route.params || {};
  const isVi = language === 'vi';
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);  // FIX H2: prevents double-save race condition

  const typeColors: Record<string, string> = {
    'face-rppg': C.red, 'contact-ppg': C.green,
    scg: C.purple, stress: '#A855F7', 'blood-pressure': '#EF4444',
  };
  const typeIcons: Record<string, string> = {
    'face-rppg': 'face-recognition', 'contact-ppg': 'heart-pulse',
    scg: 'stethoscope', stress: 'brain', 'blood-pressure': 'heart-pulse',
  };
  const typeLabels: Record<string, string> = {
    'face-rppg': 'Khuôn mặt rPPG', 'contact-ppg': 'Ngón tay PPG',
    scg: 'Âm thanh tim (Beta)', stress: 'Stress', 'blood-pressure': 'Huyết áp',
  };

  const accentColor = typeColors[type] || C.green;
  const recs = getRecommendations(type, result, C);
  const now = new Date().toLocaleString('vi-VN', {hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'});

  // Auto-save once on mount
  useEffect(() => {
    let isMounted = true;
    const autoSave = async () => {
      if (!type || !result || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      try {
        await historyService.save({type, result});
        if (isMounted) setSaved(true);
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.message || String(err);
        const status = err?.response?.status;
        console.warn(`[HistorySave] FAILED type=${type} status=${status} detail=${detail}`);
        // Hiển thị lỗi để debug — sẽ bỏ sau khi fix
        if (isMounted) {
          Alert.alert(
            'Lỗi lưu lịch sử',
            `type: ${type}\nstatus: ${status}\n${detail}`,
            [{text: 'OK'}],
          );
        }
      } finally {
        if (isMounted) setSaving(false);
      }
    };
    autoSave();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount only

  const renderTypeContent = () => {
    switch (type) {
      case 'face-rppg':       return <FaceRppgContent result={result} C={C} />;
      case 'contact-ppg':     return <ContactPpgContent result={result} C={C} />;
      case 'scg':             return <ScgContent result={result} C={C} />;
      case 'stress':          return <StressContent result={result} C={C} />;
      case 'blood-pressure':  return <BloodPressureContent result={result} C={C} />;
      default:                return <FaceRppgContent result={result} C={C} />;
    }
  };

  return (
    <SafeAreaView style={[r.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={r.content}>

        {/* Header */}
        <FadeSlide>
          <View style={r.header}>
            <TouchableOpacity style={[r.backBtn, {backgroundColor: C.surface, borderColor: C.border}]} onPress={goBack}>
              <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
            </TouchableOpacity>
            <View style={{flex: 1}}>
              <Text style={[r.headerTitle, {color: C.text}]}>Kết quả đo</Text>
              <Text style={[r.headerSub, {color: C.textSub}]}>{now}</Text>
            </View>
            <View style={[r.typePill, {backgroundColor: accentColor + '18', borderColor: accentColor + '40'}]}>
              <MaterialCommunityIcons name={typeIcons[type] as any} size={13} color={accentColor} />
              <Text style={[r.typePillTxt, {color: accentColor}]}>{typeLabels[type] || type}</Text>
            </View>
          </View>
        </FadeSlide>

        {/* Type-specific content */}
        {renderTypeContent()}

        {/* Recommendations */}
        <FadeSlide delay={400}>
          <SectionCard title="Lời khuyên sức khoẻ" accentColor={accentColor} C={C}>
            <View style={{gap: 8}}>
              {recs.map((rec, i) => <RecItem key={i} text={rec} C={C} />)}
            </View>
          </SectionCard>
        </FadeSlide>

        {/* Disclaimer */}
        <FadeSlide delay={480}>
          <View style={[r.disclaimer, {backgroundColor: C.surface, borderColor: C.border}]}>
            <MaterialIcons name="medical-services" size={14} color={C.textDim} />
            <Text style={[r.disclaimerTxt, {color: C.textDim}]}>
              Kết quả mang tính tham khảo, không thay thế chẩn đoán y tế chuyên nghiệp.
            </Text>
          </View>
        </FadeSlide>

        {/* Actions */}
        <FadeSlide delay={540}>
          <View style={r.actions}>
            {/* Lưu kết quả */}
            <TouchableOpacity
              style={[r.btnSave, {
                backgroundColor: saved ? C.green + '20' : accentColor + '15',
                borderColor: saved ? C.green + '60' : accentColor + '50',
              }]}
              onPress={async () => {
                if (saved || savingRef.current) return; // FIX H2: block if auto-save is in flight
                savingRef.current = true;
                setSaving(true);
                try {
                  await historyService.save({type, result});
                  setSaved(true);
                } catch {
                  Alert.alert('Lỗi', 'Không thể lưu kết quả. Vui lòng đăng nhập lại.');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={accentColor} />
                : <MaterialIcons name={saved ? 'check-circle' : 'save-alt'} size={18} color={saved ? C.green : accentColor} />
              }
              <Text style={[r.btnSaveTxt, {color: saved ? C.green : accentColor}]}>
                {saved ? 'Đã lưu vào lịch sử' : 'Lưu kết quả'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[r.btnPrimary, {backgroundColor: accentColor}]}
              onPress={() => navigation.navigate('MedGemmaReport', {record: {type, result}})}>
              <MaterialCommunityIcons name="robot" size={20} color="#fff" />
              <Text style={r.btnPrimaryTxt}>Xem báo cáo AI</Text>
            </TouchableOpacity>

            <View style={r.btnRow}>
              <TouchableOpacity
                style={[r.btnOutline, {borderColor: C.border, backgroundColor: C.surface, flex: 1}]}
                onPress={goBack}>
                <MaterialIcons name="refresh" size={16} color={C.textSub} />
                <Text style={[r.btnOutlineTxt, {color: C.textSub}]}>Đo lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[r.btnOutline, {borderColor: accentColor + '50', backgroundColor: accentColor + '10', flex: 1}]}
                onPress={() => navigation.navigate('Main', {screen: 'Home'})}>
                <MaterialIcons name="home" size={16} color={accentColor} />
                <Text style={[r.btnOutlineTxt, {color: accentColor}]}>Trang chủ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeSlide>
      </ScrollView>
    </SafeAreaView>
  );
};

const r = StyleSheet.create({
  root: {flex: 1},
  content: {paddingBottom: 110},
  header: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12},
  backBtn: {width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {fontSize: 18, fontWeight: '900'},
  headerSub: {fontSize: 11, marginTop: 1},
  typePill: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1},
  typePillTxt: {fontSize: 10, fontWeight: '800'},
  heroCard: {margin: 16, marginBottom: 16, borderWidth: 1.5, borderRadius: 24, padding: 24},
  badge: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1},
  badgeTxt: {fontSize: 11, fontWeight: '800'},
  hrMeta: {flexDirection: 'row', alignItems: 'center', gap: 20},
  hrMetaItem: {alignItems: 'center', gap: 2},
  vDivider: {width: 1, height: 30},
  metaLbl: {fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase'},
  metaVal: {fontSize: 20, fontWeight: '900'},
  rhythmCard: {borderWidth: 1, borderRadius: 14, padding: 14},
  disclaimer: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, margin: 16, marginTop: 0, padding: 14, borderRadius: 14, borderWidth: 1},
  disclaimerTxt: {fontSize: 11, lineHeight: 16, flex: 1},
  actions: {paddingHorizontal: 16, gap: 10},
  btnPrimary: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 17},
  btnPrimaryTxt: {color: '#fff', fontSize: 17, fontWeight: '900'},
  btnSave: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15, borderWidth: 1.5},
  btnSaveTxt: {fontSize: 15, fontWeight: '800'},
  btnRow: {flexDirection: 'row', gap: 10},
  btnOutline: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14, borderWidth: 1},
  btnOutlineTxt: {fontSize: 14, fontWeight: '700'},
  pillRow: {flexDirection: 'row', gap: 10},
});

export default MeasurementResultScreen;
