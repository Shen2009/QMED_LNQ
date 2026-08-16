/**
 * HealthExamScreen — Khám sức khoẻ tổng quát theo trình tự bệnh viện
 * Bước 1: Khuôn mặt (30s camera) → Bước 2: Khuôn mặt/BP (30s) → Bước 3: Lồng ngực SCG (30s)
 * → Tạo hồ sơ điện tử mock → navigate MedGemmaReport
 */
import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, StatusBar, ActivityIndicator, Platform
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {CameraView, useCameraPermissions} from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useColors} from '../../../core/theme/useColors';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import historyService from '../../../core/api/historyService';
import measurementService, {DEMO_DURATION_SECONDS, getMeasurementErrorMessage} from '../../../core/api/measurementService';
import WebCameraRecorder from '../../../shared/components/WebCameraRecorder';
import NativeCameraPreview from '../../../shared/components/NativeCameraPreview';

const {width} = Dimensions.get('window');

// ─── Step config builder (uses i18n strings) ──────────────────────────────────
function buildSteps(strings: any) {
  return [
    {
      id: 'face',
      icon: 'face-recognition',
      label: strings.healthExamStepFaceLabel,
      sub: strings.healthExamStepFaceSub,
      color: '#EF4444',
      duration: DEMO_DURATION_SECONDS,
      instruction: strings.healthExamStepFaceInstruction,
    },
    {
      id: 'voice',
      icon: 'camera-front-variant',
      label: strings.healthExamStepVoiceLabel,
      sub: strings.healthExamStepVoiceSub,
      color: '#3B82F6',
      duration: DEMO_DURATION_SECONDS,
      instruction: strings.healthExamStepVoiceInstruction,
      scriptLabel: strings.healthExamStepVoiceScript,
    },
  ];
}


// ─── Progress stepper ──────────────────────────────────────────────────────────
function Stepper({current, done, steps}: {current: number; done: number[]; steps: ReturnType<typeof buildSteps>}) {
  return (
    <View style={sp.row}>
      {steps.map((s, i) => {
        const completed = done.includes(i);
        const active = current === i;
        const color = s.color;
        return (
          <React.Fragment key={i}>
            <View style={sp.item}>
              <View style={[sp.circle,
                {borderColor: completed ? color : active ? color : '#333',
                 backgroundColor: completed ? color : active ? color + '20' : 'transparent'}]}>
                {completed
                  ? <MaterialIcons name="check" size={14} color="#fff" />
                  : <Text style={[sp.num, {color: active ? color : '#555'}]}>{i + 1}</Text>}
              </View>
              <Text style={[sp.label, {color: active ? color : completed ? color + 'CC' : '#555'}]}
                numberOfLines={1}>{s.label.split(' ')[0]}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[sp.line, {backgroundColor: done.includes(i) ? s.color : '#2a2a2a'}]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
const sp = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginVertical: 8},
  item: {alignItems: 'center', gap: 5},
  circle: {width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  num: {fontSize: 13, fontWeight: '800'},
  label: {fontSize: 10, fontWeight: '700', maxWidth: 60, textAlign: 'center'},
  line: {flex: 1, height: 2, marginBottom: 18, marginHorizontal: 6},
});

// ─── Measuring animation ───────────────────────────────────────────────────────
function MeasuringVisual({step, color}: {step: {icon: string; label: string; sub: string}; color: string}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const wave  = useRef(Array.from({length: 12}, () => new Animated.Value(0.2))).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, {toValue: 1, duration: 800, useNativeDriver: true}),
      Animated.timing(pulse, {toValue: 0, duration: 800, useNativeDriver: true}),
    ])).start();
    const anims = wave.map((w, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 80),
        Animated.timing(w, {toValue: 0.2 + Math.random() * 0.7, duration: 280 + i * 20, useNativeDriver: true}),
        Animated.timing(w, {toValue: 0.15, duration: 220, useNativeDriver: true}),
      ]))
    );
    Animated.parallel(anims).start();
  }, []);

  return (
    <View style={{alignItems: 'center', gap: 20, marginVertical: 8}}>
      {/* Pulsing icon */}
      <View style={{alignItems: 'center', justifyContent: 'center', width: 100, height: 100}}>
        {[1, 2].map(ring => (
          <Animated.View key={ring} style={{
            position: 'absolute', width: 100, height: 100, borderRadius: 50,
            backgroundColor: color,
            opacity: pulse.interpolate({inputRange: [0, 1], outputRange: [0.05, 0.15 - ring * 0.03]}),
            transform: [{scale: pulse.interpolate({inputRange: [0, 1], outputRange: [0.8, 1.3 + ring * 0.2]})}],
          }} />
        ))}
        <View style={{width: 70, height: 70, borderRadius: 35, backgroundColor: color + '22',
          borderWidth: 2, borderColor: color + '60', alignItems: 'center', justifyContent: 'center'}}>
          <MaterialCommunityIcons name={step.icon as any} size={36} color={color} />
        </View>
      </View>
      {/* Waveform */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, height: 50}}>
        {wave.map((w, i) => (
          <Animated.View key={i} style={{
            width: 5, height: 44, borderRadius: 3, backgroundColor: color,
            transform: [{scaleY: w}],
          }} />
        ))}
      </View>
    </View>
  );
}

// ─── Face Camera View ────────────────────────────────────────────────────────────────
const FaceCameraView = React.forwardRef<any, any>((props, ref) => {
  const scanY = useRef(new Animated.Value(-4)).current;
  const glow  = useRef(new Animated.Value(0.6)).current;
  const COLOR = '#EF4444';
  const FRAME_W = width - 60;
  const FRAME_H = FRAME_W * 1.2;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scanY, {toValue: FRAME_H - 4, duration: 2400, useNativeDriver: true}),
      Animated.timing(scanY, {toValue: -4, duration: 0, useNativeDriver: true}),
      Animated.delay(200),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, {toValue: 1, duration: 900, useNativeDriver: true}),
      Animated.timing(glow, {toValue: 0.5, duration: 900, useNativeDriver: true}),
    ])).start();
  }, []);

  const Corner = ({style}: {style: object}) => (
    <View style={[{position: 'absolute', width: 22, height: 22, borderColor: COLOR}, style]} />
  );

  return (
    <View style={{width: FRAME_W, height: FRAME_H, borderRadius: 20, overflow: 'hidden', position: 'relative'}}>
      {/* Real camera */}
      {Platform.OS === 'web' ? <WebCameraRecorder ref={ref} style={StyleSheet.absoluteFill} /> : <NativeCameraPreview ref={ref} style={StyleSheet.absoluteFill} />}
      {/* Semi-dark overlay outside oval */}
      <View style={[StyleSheet.absoluteFill, {backgroundColor: '#00000055'}]} />
      {/* Oval cutout border */}
      <Animated.View style={[
        StyleSheet.absoluteFill,
        {borderRadius: 20, borderWidth: 2.5, borderColor: COLOR, opacity: glow},
      ]} pointerEvents="none" />
      {/* Scan line */}
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        backgroundColor: COLOR, opacity: 0.7,
        transform: [{translateY: scanY}],
      }} />
      {/* Corner brackets */}
      <Corner style={{top: 10, left: 10, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6}} />
      <Corner style={{top: 10, right: 10, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6}} />
      <Corner style={{bottom: 10, left: 10, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6}} />
      <Corner style={{bottom: 10, right: 10, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6}} />
      {/* Face guide icon */}
      <View style={{position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#00000080', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6}}>
        <MaterialCommunityIcons name="face-recognition" size={14} color={COLOR} />
        <Text style={{color: COLOR, fontSize: 12, fontWeight: '700'}}>Giữ khuôn mặt trong khung</Text>
      </View>
    </View>
  );
});

// ─── Countdown display ───────────────────────────────────────────────────────────────
function CountdownDisplay({countdown, total, color}: {countdown: number; total: number; color: string}) {
  const {strings} = useLanguage();
  return (
    <View style={{alignItems: 'center', gap: 4}}>
      <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 6,
        backgroundColor: color + '15', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10,
        borderWidth: 1, borderColor: color + '40'}}>
        <Text style={{fontSize: 42, fontWeight: '900', color, letterSpacing: -2}}>{countdown}</Text>
        <Text style={{fontSize: 13, fontWeight: '700', color: color + 'BB'}}>{strings.healthExamSecondsLeft}</Text>
      </View>
      <View style={{width: width - 80, height: 4, backgroundColor: color + '20', borderRadius: 2, overflow: 'hidden'}}>
        <View style={{height: 4, borderRadius: 2, backgroundColor: color,
          width: `${((total - countdown) / total) * 100}%`}} />
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
const HealthExamScreen = () => {
  const C = useColors();
  const {strings} = useLanguage();
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const STEPS = buildSteps(strings);

  type Phase = 'intro' | 'measuring' | 'uploading' | 'step_done' | 'all_done';

  const [stepIdx,  setStepIdx]  = useState(0);
  const [phase,    setPhase]    = useState<Phase>('intro');
  const [countdown, setCountdown] = useState(0);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [results,  setResults]  = useState<Record<string, any>>({});
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const step = STEPS[stepIdx];

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const zAxisDataRef = useRef<number[]>([]);
  const scgSubscriptionRef = useRef<any>(null);

  // Camera & SCG Start Recording
  useEffect(() => {
    if (phase === 'measuring') {
      if (STEPS[stepIdx].id === 'face') {
        setTimeout(async () => {
          if (!isRecordingRef.current && cameraRef.current) {
            try {
              await cameraRef.current.waitUntilReady?.();
              isRecordingRef.current = true;
              const video = await cameraRef.current.recordAsync({ maxDuration: 32 });
              isRecordingRef.current = false;
              if (video?.uri) {
                setPhase('uploading');
                // Gọi song song BPM (rPPG) + Stress — endpoint riêng
                const [rppgResult, stressResult] = await Promise.allSettled([
                  measurementService.analyzeVideo(video.uri),
                  measurementService.analyzeStressVideo(video.uri),
                ]);

                const rppg  = rppgResult.status  === 'fulfilled' ? rppgResult.value  : null;
                const stress = stressResult.status === 'fulfilled' ? stressResult.value : null;
                const rppgOk = rppg?.hr_fft != null;
                const stressOk = stress?.stress_score != null;
                const errors = [
                  rppgResult.status === 'rejected'
                    ? getMeasurementErrorMessage(rppgResult.reason, 'Không phân tích được nhịp tim.')
                    : null,
                  stressResult.status === 'rejected'
                    ? getMeasurementErrorMessage(stressResult.reason, 'Không phân tích được stress.')
                    : null,
                ].filter(Boolean);

                setResults(prev => ({...prev, face: {
                  step: 'face',
                  label: 'Khuôn mặt (rPPG + Stress)',
                  hr_bpm:        rppg?.hr_fft          ?? undefined,
                  hrv_ms:        stress?.hrv_ms         ?? rppg?.hrv_ms ?? undefined,
                  stress_level:  stress?.stress_score   ?? rppg?.stress_level ?? undefined,
                  error:         !rppgOk && !stressOk,
                  error_message: errors.join(' '),
                }}));
                setDoneSteps(prev => [...prev, stepIdx]);
                setPhase('step_done');
              } else {
                throw new Error('Camera không trả về video.');
              }
            } catch (e) {
               isRecordingRef.current = false;
               setResults(prev => ({...prev, face: {
                 step: 'face',
                 label: 'Khuôn mặt (rPPG + Stress)',
                 error: true,
                 error_message: getMeasurementErrorMessage(e, 'Không ghi hoặc phân tích được video khuôn mặt.'),
               }}));
               setDoneSteps(prev => [...prev, stepIdx]);
               setPhase('step_done');
            }
          }
        }, 500);
      } else if (STEPS[stepIdx].id === 'voice') {
        setTimeout(async () => {
          if (!isRecordingRef.current && cameraRef.current) {
            try {
              await cameraRef.current.waitUntilReady?.();
              isRecordingRef.current = true;
              const video = await cameraRef.current.recordAsync({ maxDuration: 32 });
              isRecordingRef.current = false;
              if (video?.uri) {
                setPhase('uploading');
                try {
                  const data = await measurementService.analyzeBloodPressureVideo(video.uri);
                  setResults(prev => ({...prev, voice: {
                    step: 'voice', label: 'Huyết áp (Face)',
                    blood_pressure: {
                      systolic: data.systolic_avg ?? undefined,
                      diastolic: data.diastolic_avg ?? undefined,
                    },
                    breathing_rate: undefined,
                    error: data.systolic_avg == null || data.diastolic_avg == null,
                  }}));
                } catch (e) {
                  console.warn('Lỗi phân tích huyết áp:', e);
                  setResults(prev => ({...prev, voice: {
                    step: 'voice',
                    label: 'Huyết áp (Face)',
                    error: true,
                    error_message: getMeasurementErrorMessage(e, 'Không phân tích được huyết áp.'),
                  }}));
                }
                setDoneSteps(prev => [...prev, stepIdx]);
                setPhase('step_done');
              } else {
                throw new Error('Camera không trả về video.');
              }
            } catch (e) {
               isRecordingRef.current = false;
               setResults(prev => ({...prev, voice: {
                 step: 'voice',
                 label: 'Huyết áp (Face)',
                 error: true,
                 error_message: getMeasurementErrorMessage(e, 'Không ghi được video huyết áp.'),
               }}));
               setDoneSteps(prev => [...prev, stepIdx]);
               setPhase('step_done');
            }
          }
        }, 500);
      } else if (STEPS[stepIdx].id === 'scg') {
        Accelerometer.setUpdateInterval(80); // 12.5Hz
        zAxisDataRef.current = [];
        scgSubscriptionRef.current = Accelerometer.addListener(data => {
          zAxisDataRef.current.push(data.z);
        });
      }
    } else {
       if (scgSubscriptionRef.current) {
         scgSubscriptionRef.current.remove();
         scgSubscriptionRef.current = null;
       }
    }
  }, [phase, stepIdx]);

  const clearCountdownInterval = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  // Countdown effect
  useEffect(() => {
    if (phase !== 'measuring') { clearCountdownInterval(); return; }

    setCountdown(step.duration);
    clearCountdownInterval();
    let remaining = step.duration;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
          if (remaining <= 0) {
        clearCountdownInterval();
        
        if (STEPS[stepIdx].id === 'face' || STEPS[stepIdx].id === 'voice') {
          // Keep the camera mounted until stopRecording resolves with a URI.
          cameraRef.current?.stopRecording();
        } else if (STEPS[stepIdx].id === 'scg') {
          setPhase('uploading');
          if (scgSubscriptionRef.current) {
            scgSubscriptionRef.current.remove();
            scgSubscriptionRef.current = null;
          }
          measurementService.analyzeSCG(zAxisDataRef.current, 12.5).then(res => {
            setResults(prev => ({...prev, scg: { step: 'scg', label: 'Âm thanh tim (Beta)', hrv_ms: res.hrv_ms, scg_rhythm: res.scg_rhythm, heart_anomaly: res.heart_anomaly, scg_anomaly_score: res.scg_anomaly_score }}));
            setDoneSteps(prev => [...prev, stepIdx]);
            setPhase('step_done');
          }).catch(e => {
            console.warn('Lỗi phân tích SCG:', e);
            setResults(prev => ({...prev, scg: {
              step: 'scg',
              label: 'Âm thanh tim (Beta)',
              error: true,
              error_message: getMeasurementErrorMessage(e, 'Không phân tích được tín hiệu SCG.'),
            }}));
            setDoneSteps(prev => [...prev, stepIdx]);
            setPhase('step_done');
          });
        }
      }
    }, 1000);

    return () => clearCountdownInterval();
  }, [phase, stepIdx]);

  const startStep = () => {
    setPhase('measuring'); // intervalRef effect will reset countdown
  };

  const nextStep = () => {
    if (stepIdx < STEPS.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, {toValue: 0, duration: 200, useNativeDriver: true}),
        Animated.timing(fadeAnim, {toValue: 1, duration: 300, useNativeDriver: true}),
      ]).start();
      setStepIdx(i => i + 1);
      setPhase('intro');
    } else {
      setPhase('all_done');
    }
  };

  const goToReport = async () => {
    // Combine all results + user profile into mock medical record
    const record = {
      type: 'health-exam',
      face:  results.face  || null,
      voice: results.voice || null,
      scg:   results.scg   || null,
      exam_at: new Date().toISOString(),
    };
    
    // Auto-save the full health exam to history
    try {
      await historyService.save({type: 'health-exam', result: record});
    } catch (err) {
      console.warn('Lỗi lưu lịch sử khám tổng quát:', err);
    }

    navigation.navigate('MedGemmaReport', {record});
  };

  const currentStepFailed = Boolean(results[step?.id]?.error);

  // ── All done ──
  if (phase === 'all_done') {
    return (
      <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.header}>
            <TouchableOpacity style={[s.backBtn, {borderColor: C.border, backgroundColor: C.surface}]} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, {color: C.text}]}>{strings.healthExamTitle}</Text>
          </View>

          <Stepper current={-1} done={[0, 1, 2]} steps={STEPS} />

          <View style={[s.successBanner, {backgroundColor: '#10B98115', borderColor: '#10B981'}]}>
            <MaterialIcons name="check-circle" size={36} color="#10B981" />
            <View>
              <Text style={{color: '#10B981', fontSize: 18, fontWeight: '900'}}>{strings.healthExamDone}</Text>
              <Text style={{color: '#10B981CC', fontSize: 13}}>{strings.healthExamDoneSub}</Text>
            </View>
          </View>

          {/* Summary of results */}
          {STEPS.map((st, i) => {
            const r = results[st.id];
            return (
              <View key={i} style={[s.resultCard, {backgroundColor: C.card, borderColor: st.color + '40'}]}>
                <View style={s.resultHeader}>
                  <View style={{width: 36, height: 36, borderRadius: 11, backgroundColor: st.color + '20', alignItems: 'center', justifyContent: 'center'}}>
                    <MaterialCommunityIcons name={st.icon as any} size={20} color={st.color} />
                  </View>
                  <Text style={[s.resultTitle, {color: C.text}]}>{st.label}</Text>
                  <View style={[s.doneChip, {
                    backgroundColor: r?.error ? '#EF444418' : '#10B98118',
                    borderColor: r?.error ? '#EF444440' : '#10B98140',
                  }]}>
                    <MaterialIcons name={r?.error ? 'error-outline' : 'check'} size={12} color={r?.error ? '#EF4444' : '#10B981'} />
                    <Text style={{color: r?.error ? '#EF4444' : '#10B981', fontSize: 11, fontWeight: '700'}}>
                      {r?.error ? 'Cần đo lại' : strings.healthExamCompleted}
                    </Text>
                  </View>
                </View>
                {r && (
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8}}>
                    {r.hr_bpm && (
                      <View style={[s.chip, {backgroundColor: st.color + '12', borderColor: st.color + '30'}]}>
                        <Text style={{color: st.color, fontSize: 12, fontWeight: '700'}}>❤️ {r.hr_bpm} BPM</Text>
                      </View>
                    )}
                    {r.blood_pressure && st.id === 'voice' && (
                      <View style={[s.chip, {backgroundColor: st.color + '12', borderColor: st.color + '30'}]}>
                        <Text style={{color: st.color, fontSize: 12, fontWeight: '700'}}>
                          🩸 {r.blood_pressure.systolic}/{r.blood_pressure.diastolic} mmHg
                        </Text>
                      </View>
                    )}
                    {r.heart_anomaly !== undefined && (
                      <View style={[s.chip, {backgroundColor: (r.heart_anomaly ? '#EF4444' : '#10B981') + '18', borderColor: (r.heart_anomaly ? '#EF4444' : '#10B981') + '40'}]}>
                        <Text style={{color: r.heart_anomaly ? '#EF4444' : '#10B981', fontSize: 12, fontWeight: '700'}}>
                          {r.heart_anomaly ? strings.healthExamAnomalyFound : strings.healthExamAnomalyNone}
                        </Text>
                      </View>
                    )}
                    {r.stress_level != null && (
                      <View style={[s.chip, {backgroundColor: st.color + '12', borderColor: st.color + '30'}]}>
                        <Text style={{color: st.color, fontSize: 12, fontWeight: '700'}}>🧠 {strings.medGemmaLabelStress} {r.stress_level}%</Text>
                      </View>
                    )}
                    {r.error && (
                      <View style={[s.chip, {backgroundColor: '#EF444418', borderColor: '#EF444440'}]}>
                        <Text style={{color: '#EF4444', fontSize: 12, fontWeight: '700'}}>
                          ❌ {r.error_message || 'Phân tích thất bại'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          <View style={[s.gemmaHint, {backgroundColor: '#8B5CF615', borderColor: '#8B5CF640'}]}>
            <MaterialCommunityIcons name="robot-outline" size={20} color="#8B5CF6" />
            <Text style={{color: '#8B5CF6', fontSize: 13, flex: 1, lineHeight: 20}}>
              <Text style={{fontWeight: '800'}}>{strings.healthExamGemmaHintBold1}</Text>{' '}{strings.healthExamGemmaHint}{' '}
              <Text style={{fontWeight: '800'}}>{strings.healthExamGemmaHintBold2}</Text>{' '}{strings.medGemmaAnalyzingSub.split(',')[0]}.
            </Text>
          </View>

          <TouchableOpacity style={s.gemmaBtn} onPress={goToReport}>
            <MaterialCommunityIcons name="robot" size={22} color="#fff" />
            <Text style={s.gemmaBtnTxt}>{strings.healthExamSendGemma}</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <TouchableOpacity style={[s.backBtn, {borderColor: C.border, backgroundColor: C.surface}]} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, {color: C.text}]}>{strings.healthExamTitle}</Text>
        <View style={[s.stepBadge, {backgroundColor: step.color + '18', borderColor: step.color + '40'}]}>
          <Text style={[s.stepBadgeTxt, {color: step.color}]}>{strings.healthExamStepOf(stepIdx + 1, STEPS.length)}</Text>
        </View>
      </View>

      <Stepper current={stepIdx} done={doneSteps} steps={STEPS} />

      <Animated.ScrollView
        style={{opacity: fadeAnim}}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}>

        {/* Step hero */}
        <View style={[s.heroCard, {borderColor: step.color + '40', backgroundColor: step.color + '08'}]}>
          <View style={[s.heroIconWrap, {backgroundColor: step.color + '20', borderColor: step.color + '50'}]}>
            <MaterialCommunityIcons name={step.icon as any} size={42} color={step.color} />
          </View>
          <Text style={[s.heroTitle, {color: step.color}]}>{step.label}</Text>
          <Text style={[s.heroSub, {color: C.textSub}]}>{step.sub}</Text>
          <View style={[s.durationChip, {backgroundColor: step.color + '18', borderColor: step.color + '35'}]}>
            <MaterialIcons name="timer" size={13} color={step.color} />
            <Text style={[s.durationTxt, {color: step.color}]}>{step.duration} {strings.healthExamSeconds}</Text>
          </View>
        </View>

        {/* Measuring phase */}
        {phase === 'measuring' && (
          <View style={{alignItems: 'center', gap: 16, paddingVertical: 8}}>
            <View style={[s.measuringPill, {backgroundColor: step.color + '15', borderColor: step.color + '40'}]}>
              <Animated.View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: step.color}} />
              <Text style={[s.measuringTxt, {color: step.color}]}>{strings.healthExamRecording}</Text>
            </View>

            {/* Step 0: real camera; others: animation */}
            {stepIdx === 0 || stepIdx === 1
              ? (
                !permission?.granted
                  ? (
                    <TouchableOpacity
                      style={[s.permBtn, {borderColor: step.color, backgroundColor: step.color + '15'}]}
                      onPress={requestPermission}>
                      <MaterialIcons name="camera-alt" size={24} color={step.color} />
                      <Text style={{color: step.color, fontWeight: '700', fontSize: 15}}>{strings.healthExamGrantCamera}</Text>
                    </TouchableOpacity>
                  )
                  : <FaceCameraView ref={cameraRef} />
              )
              : <MeasuringVisual step={step} color={step.color} />}

            <CountdownDisplay countdown={countdown} total={step.duration} color={step.color} />
            {step.scriptLabel && (
              <View style={[s.scriptBox, {backgroundColor: C.card, borderColor: step.color + '30'}]}>
                <Text style={{color: step.color, fontSize: 12, fontWeight: '800', marginBottom: 6}}>{strings.healthExamReadScript}</Text>
                <Text style={{color: C.text, fontSize: 14, lineHeight: 24, fontStyle: 'italic'}}>{step.scriptLabel}</Text>
              </View>
            )}
          </View>
        )}

        {/* Uploading phase */}
        {phase === 'uploading' && (
           <View style={{alignItems: 'center', gap: 16, paddingVertical: 40}}>
             <ActivityIndicator size="large" color={step.color} />
             <Text style={{color: step.color, fontSize: 16, fontWeight: '700'}}>Đang phân tích dữ liệu...</Text>
             <Text style={{color: C.textSub, fontSize: 13, textAlign: 'center'}}>Q-Med AI đang xử lý tín hiệu. Quá trình này có thể mất vài giây.</Text>
           </View>
        )}

        {/* Step done */}
        {phase === 'step_done' && (
          <View style={[s.doneBanner, {
            backgroundColor: currentStepFailed ? '#EF444412' : '#10B98112',
            borderColor: currentStepFailed ? '#EF444440' : '#10B98140',
          }]}>
            <MaterialIcons name={currentStepFailed ? 'error-outline' : 'check-circle'} size={28} color={currentStepFailed ? '#EF4444' : '#10B981'} />
            <Text style={{color: currentStepFailed ? '#EF4444' : '#10B981', fontSize: 16, fontWeight: '900'}}>
              {currentStepFailed ? 'Phân tích chưa thành công' : strings.healthExamStepDoneTitle(stepIdx + 1)}
            </Text>
          </View>
        )}

        {/* Intro / instruction */}
        {(phase === 'intro' || phase === 'step_done') && (
          <View style={[s.instructionCard, {backgroundColor: C.card, borderColor: C.border}]}>
            <Text style={[s.instructionTitle, {color: C.text}]}>
              {phase === 'step_done'
                ? `${strings.healthExamDoneInstructions} ${stepIdx < STEPS.length - 1 ? strings.healthExamNextStep : strings.healthExamFinish}`
                : strings.healthExamInstruction}
            </Text>
            <Text style={[s.instructionBody, {color: C.textSub}]}>{step.instruction}</Text>
            {step.scriptLabel && phase === 'intro' && (
              <View style={[s.scriptBox, {backgroundColor: step.color + '08', borderColor: step.color + '25', marginTop: 8}]}>
                <Text style={{color: step.color, fontSize: 11, fontWeight: '800', marginBottom: 4}}>{strings.healthExamScript}:</Text>
                <Text style={{color: C.text, fontSize: 13, lineHeight: 22, fontStyle: 'italic'}} numberOfLines={3}>{step.scriptLabel}</Text>
              </View>
            )}
          </View>
        )}

        {/* Action button */}
        {phase === 'intro' && (
          <TouchableOpacity style={[s.actionBtn, {backgroundColor: step.color}]} onPress={startStep}>
            <MaterialIcons name="play-arrow" size={24} color="#fff" />
            <Text style={s.actionBtnTxt}>{strings.healthExamStartStep(stepIdx + 1)}</Text>
          </TouchableOpacity>
        )}
        {phase === 'step_done' && (
          <TouchableOpacity
            style={[s.actionBtn, {backgroundColor: currentStepFailed ? step.color : stepIdx < STEPS.length - 1 ? STEPS[stepIdx + 1].color : '#10B981'}]}
            onPress={currentStepFailed ? () => setPhase('intro') : nextStep}>
            <Text style={s.actionBtnTxt}>
              {currentStepFailed
                ? 'Thử đo lại'
                : stepIdx < STEPS.length - 1
                ? strings.healthExamNextLabel(STEPS[stepIdx + 1].label.split(' ')[0])
                : strings.healthExamViewResults}
            </Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: {flex: 1},
  content: {padding: 16, gap: 16, paddingBottom: 100},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 8},
  backBtn: {width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {flex: 1, fontSize: 20, fontWeight: '900'},
  stepBadge: {paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1},
  stepBadgeTxt: {fontSize: 12, fontWeight: '800'},

  heroCard: {borderWidth: 1.5, borderRadius: 24, padding: 24, alignItems: 'center', gap: 10},
  heroIconWrap: {width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2},
  heroTitle: {fontSize: 20, fontWeight: '900'},
  heroSub: {fontSize: 13, textAlign: 'center', lineHeight: 20},
  durationChip: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1},
  durationTxt: {fontSize: 13, fontWeight: '700'},

  measuringPill: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1},
  measuringTxt: {fontSize: 11, fontWeight: '800', letterSpacing: 2},

  instructionCard: {borderWidth: 1, borderRadius: 18, padding: 18, gap: 10},
  instructionTitle: {fontSize: 15, fontWeight: '800'},
  instructionBody: {fontSize: 14, lineHeight: 22},

  scriptBox: {borderWidth: 1, borderRadius: 14, padding: 14, width: '100%'},

  actionBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 17},
  actionBtnTxt: {color: '#fff', fontSize: 17, fontWeight: '900'},

  permBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24},

  doneBanner: {flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 16},

  // All done
  successBanner: {flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderRadius: 20, padding: 20},
  resultCard: {borderWidth: 1, borderRadius: 18, padding: 16, gap: 4},
  resultHeader: {flexDirection: 'row', alignItems: 'center', gap: 10},
  resultTitle: {flex: 1, fontSize: 15, fontWeight: '800'},
  doneChip: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1},
  chip: {paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1},
  gemmaHint: {flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14},
  gemmaBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, backgroundColor: '#8B5CF6'},
  gemmaBtnTxt: {color: '#fff', fontSize: 17, fontWeight: '900', flex: 1, textAlign: 'center'},
});

export default HealthExamScreen;
