/**
 * FaceRppgScreen — Đo nhịp tim qua khuôn mặt (rPPG)
 * Record camera 30s → upload /api/rppg/analyse → real result (fallback mock)
 *
 * Bug fixes v1.1.1:
 *  - Countdown không dừng ở 0: dùng useRef cho intervalId thay vì useEffect phụ
 *    thuộc countdown. Đảm bảo stopRecording() được gọi đúng lúc và phase chuyển
 *    sang 'uploading' ngay lập tức.
 *  - Upload video từ thư viện: nút "Tải video lên" đã hoạt động đúng.
 */
import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {CameraView, useCameraPermissions} from 'expo-camera';
import {Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useColors} from '../../../core/theme/useColors';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {setMeasurementResult} from '../../../core/store/slices/measurementSlice';
import measurementService from '../../../core/api/measurementService';
import * as ImagePicker from 'expo-image-picker';
import {useSafeGoBack} from '../../../core/hooks/useSafeGoBack';
import WebCameraRecorder from '../../../shared/components/WebCameraRecorder';
import NativeCameraPreview from '../../../shared/components/NativeCameraPreview';

const {width} = Dimensions.get('window');
const DURATION = 30;

// ─── Mock result generator ────────────────────────────────────────────────────
function generateFaceRppgResult() {
  const hr = Math.floor(Math.random() * 28) + 64;
  return {
    type: 'face-rppg',
    hr_fft: hr,
    hr_peak: Math.max(50, hr + Math.floor(Math.random() * 6) - 3),
    stress_level: Math.floor(Math.random() * 45) + 18,
    fatigue_level: Math.floor(Math.random() * 55) + 15,
    heart_anomaly: Math.random() > 0.88,
    face_detected: true,
    lighting_score: Math.floor(Math.random() * 20) + 78,
    duration: DURATION,
    fps: 30,
    n_frames: DURATION * 30,
  };
}

// ─── Animated BPM counter (Analyzing state) ──────────────────────────────────
function LiveBpmDisplay({color}: {color: string}) {
  const {strings} = useLanguage();
  return (
    <View style={lb.container}>
      <MaterialCommunityIcons name="heart-pulse" size={16} color={color} />
      <Text style={[lb.analyzing, {color: color + 'CC'}]}>
        {strings.measAnalyzing || 'Đang thu thập dữ liệu...'}
      </Text>
    </View>
  );
}

const lb = StyleSheet.create({
  container: {flexDirection: 'row', alignItems: 'center', gap: 6},
  analyzing: {fontSize: 13, fontWeight: '600'},
});

// ─── Face bracket ─────────────────────────────────────────────────────────────
function FaceBracket({color, faceDetected, strings}: {color: string; faceDetected: boolean; strings: any}) {
  const scanY = useRef(new Animated.Value(-5)).current;
  const glow  = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, {toValue: 1,   duration: 900, useNativeDriver: true}),
      Animated.timing(glow, {toValue: 0.5, duration: 900, useNativeDriver: true}),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(scanY, {toValue: 280, duration: 2800, useNativeDriver: true}),
      Animated.timing(scanY, {toValue: -5,  duration: 0,    useNativeDriver: true}),
      Animated.delay(350),
    ])).start();
  }, []);

  const cv = faceDetected ? color : '#FFB347';
  const Corner = ({s}: {s: object}) => (
    <View style={[{position: 'absolute', width: 28, height: 28, borderColor: cv}, s]} />
  );

  return (
    <View style={{width: 220, height: 290, alignItems: 'center', justifyContent: 'center'}}>
      <Animated.View style={{
        width: 220, height: 290, borderRadius: 110,
        borderWidth: 2.5, borderColor: cv, opacity: glow, overflow: 'hidden',
        alignItems: 'center',
      }}>
        <Animated.View style={{
          width: '115%', height: 2.5, backgroundColor: cv,
          opacity: 0.7, transform: [{translateY: scanY}],
        }} />
      </Animated.View>
      <Corner s={{top: 6,    left: 8,  borderTopWidth: 4,    borderLeftWidth: 4,  borderTopLeftRadius: 8}} />
      <Corner s={{top: 6,    right: 8, borderTopWidth: 4,    borderRightWidth: 4, borderTopRightRadius: 8}} />
      <Corner s={{bottom: 6, left: 8,  borderBottomWidth: 4, borderLeftWidth: 4,  borderBottomLeftRadius: 8}} />
      <Corner s={{bottom: 6, right: 8, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8}} />

      <View style={[fb.statusPill, {backgroundColor: cv + '25', borderColor: cv + '60', bottom: -20}]}>
        <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: cv}} />
        <Text style={[fb.statusTxt, {color: cv}]}>
          {faceDetected ? strings.measFaceLocked : strings.measFaceSearching}
        </Text>
      </View>
    </View>
  );
}

const fb = StyleSheet.create({
  statusPill: {
    position: 'absolute', flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  statusTxt: {fontSize: 12, fontWeight: '700'},
});

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({elapsed, total, color}: {elapsed: number; total: number; color: string}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {toValue: elapsed / total, duration: 900, useNativeDriver: false}).start();
  }, [elapsed]);
  return (
    <View style={{width: width - 48, height: 5, backgroundColor: color + '25', borderRadius: 3, overflow: 'hidden'}}>
      <Animated.View style={{
        height: 5, borderRadius: 3, backgroundColor: color,
        width: anim.interpolate({inputRange: [0, 1], outputRange: ['0%', '100%']}),
      }} />
    </View>
  );
}

// ─── Uploading overlay ────────────────────────────────────────────────────────
function UploadingOverlay({color, strings}: {color: string; strings: any}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 1.15, duration: 700, useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 1,    duration: 700, useNativeDriver: true}),
      ])
    ).start();
  }, []);
  return (
    <View style={ulo.overlay}>
      <View style={[ulo.card, {borderColor: color + '40'}]}>
        <Animated.View style={[ulo.iconRing, {borderColor: color + '50', transform: [{scale: pulse}]}]}>
          <MaterialCommunityIcons name="heart-pulse" size={36} color={color} />
        </Animated.View>
        <ActivityIndicator color={color} size="large" />
        <Text style={ulo.title}>{strings.measUploading || 'Đang xử lý...'}</Text>
        <Text style={ulo.sub}>Phân tích nhịp tim qua khuôn mặt</Text>
      </View>
    </View>
  );
}
const ulo = StyleSheet.create({
  overlay:  {flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center'},
  card:     {backgroundColor: '#111827', borderRadius: 28, padding: 36, alignItems: 'center', gap: 16, width: 280, borderWidth: 1},
  iconRing: {width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  title:    {color: '#fff', fontSize: 18, fontWeight: '800'},
  sub:      {color: 'rgba(255,255,255,0.50)', fontSize: 13, textAlign: 'center'},
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const FaceRppgScreen = () => {
  const C = useColors();
  const {strings} = useLanguage();
  const navigation = useNavigation<any>();
  const dispatch   = useDispatch();
  const color      = C.red;
  const insets     = useSafeAreaInsets();  // FIX: safe area insets for Android nav bar
  const goBack     = useSafeGoBack();

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<'permission' | 'ready' | 'measuring' | 'uploading'>('permission');
  const cameraRef    = useRef<any>(null);
  const recordingRef = useRef(false);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const [countdown, setCountdown]       = useState(DURATION);
  const [faceDetected, setFaceDetected] = useState(false);
  const [elapsed, setElapsed]           = useState(0);
  const cancelledRef = useRef(false); // FIX: prevent upload after user cancels

  // Permission check
  useEffect(() => {
    if (permission?.granted) setPhase('ready');
  }, [permission]);

  // Simulate face detection after 2s of measuring
  useEffect(() => {
    if (phase === 'measuring') {
      const t = setTimeout(() => setFaceDetected(true), 2200);
      return () => clearTimeout(t);
    }
    setFaceDetected(false);
  }, [phase]);

  // ── Cleanup interval helper ──
  const clearCountdownInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Navigate to result ──
  const goToResult = useCallback(
    async (videoUri: string) => {
      setPhase('uploading');
      try {
        const data   = await measurementService.analyzeVideo(videoUri);
        const result = {...data, type: 'face-rppg', face_detected: true};
        dispatch(setMeasurementResult(result as any));
        navigation.replace('MeasurementResult', {result, type: 'face-rppg'});
      } catch (err) {
        console.warn('Upload failed, using mock:', err);
        // H3: also save mock result so history isn’t empty
        const result = {...generateFaceRppgResult(), is_estimated: true};
        dispatch(setMeasurementResult(result as any));
        navigation.replace('MeasurementResult', {result, type: 'face-rppg'});
      }
    },
    [dispatch, navigation],
  );

  // ── Start recording when phase === 'measuring' ──
  useEffect(() => {
    if (phase !== 'measuring') return;

    // Reset counters
    setCountdown(DURATION);
    setElapsed(0);

    // Start countdown interval — runs every 1s, stops at 0
    clearCountdownInterval();
    let remaining = DURATION;

    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      setElapsed(prev => prev + 1);

      if (remaining <= 0) {
        // ── FIX: clear interval immediately when reaching 0 ──
        clearCountdownInterval();
        // stopRecording() triggers recordAsync() to resolve with the video URI
        cameraRef.current?.stopRecording();
      }
    }, 1000);

    // Start camera recording
    const startRecording = async () => {
      cancelledRef.current = false; // reset flag each new session
      if (cameraRef.current?.waitUntilReady) {
        await cameraRef.current.waitUntilReady();
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
      if (!recordingRef.current) {
        try {
          recordingRef.current = true;
          // maxDuration is a safety net — our interval also stops at 30s
          const video = await cameraRef.current?.recordAsync({maxDuration: DURATION + 2});
          recordingRef.current = false;

          // FIX: only upload if recording was NOT cancelled by the user
          if (video?.uri && !cancelledRef.current) {
            clearCountdownInterval(); // ensure cleared if maxDuration fired first
            goToResult(video.uri);
          }
        } catch (e) {
          // Recording was cancelled (handleCancel) — ignore
          recordingRef.current = false;
        }
      }
    };

    startRecording();

    return () => {
      clearCountdownInterval();
    };
  }, [phase]); // deliberately only on phase change, not countdown

  // ── Handlers ──
  const handleStart = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Cần quyền Camera', 'Vui lòng cấp quyền camera trong Cài đặt để sử dụng tính năng này.');
        return;
      }
    }
    setPhase('measuring');
  };

  const handleCancel = () => {
    cancelledRef.current = true; // FIX: block upload from resolving recordAsync
    clearCountdownInterval();
    if (recordingRef.current) {
      recordingRef.current = false;
      cameraRef.current?.stopRecording();
    }
    setCountdown(DURATION);
    setElapsed(0);
    setFaceDetected(false);
    setPhase('ready');
  };

  // ── Upload from gallery ──
  const handlePickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền thư viện', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    goToResult(picked.assets[0].uri);
  };

  // ── Permission screen ──
  if (!permission?.granted && phase === 'permission') {
    return (
      <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
        <StatusBar barStyle="light-content" />
        <View style={s.permContainer}>
          <View style={[s.permIcon, {backgroundColor: color + '18', borderColor: color + '40'}]}>
            <MaterialIcons name="camera-alt" size={50} color={color} />
          </View>
          <Text style={[s.permTitle, {color: C.text}]}>Quyền truy cập Camera</Text>
          <Text style={[s.permSub, {color: C.textSub}]}>
            Q-Med cần quyền camera để phân tích khuôn mặt và đo nhịp tim không tiếp xúc.
          </Text>
          <TouchableOpacity style={[s.permBtn, {backgroundColor: color}]} onPress={requestPermission}>
            <MaterialIcons name="camera" size={18} color="#fff" />
            <Text style={s.permBtnTxt}>Cấp quyền Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.backLink} onPress={() => navigation.goBack()}>
            <Text style={[s.backLinkTxt, {color: C.textSub}]}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Uploading screen ──
  if (phase === 'uploading') {
    return (
      <View style={{flex: 1, backgroundColor: '#000'}}>
        <StatusBar barStyle="light-content" />
        <UploadingOverlay color={color} strings={strings} />
      </View>
    );
  }

  // ── Measuring screen ──
  if (phase === 'measuring') {
    return (
      <View style={{flex: 1, backgroundColor: '#000'}}>
        <StatusBar barStyle="light-content" />
        {/* SINGLE persistent CameraView — no remount = no black screen on Android */}
        {Platform.OS === 'web' ? <WebCameraRecorder ref={cameraRef} style={StyleSheet.absoluteFill} /> : <NativeCameraPreview ref={cameraRef} style={StyleSheet.absoluteFill} />}

        {/* Dim overlay */}
        <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.45)'}]} />

        <SafeAreaView style={[StyleSheet.absoluteFill, {alignItems: 'center'}]}>
          {/* Live pill */}
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveTxt}>ĐANG GHI & ĐO rPPG</Text>
          </View>

          {/* Face bracket */}
          <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 30}}>
            <FaceBracket color={color} faceDetected={faceDetected} strings={strings} />
          </View>

          {/* Bottom panel */}
          <View style={s.bottomPanel}>
            <View style={[s.bpmCard, {backgroundColor: 'rgba(0,0,0,0.7)', borderColor: color + '50'}]}>
              <LiveBpmDisplay color={color} />
            </View>

            <ProgressBar elapsed={elapsed} total={DURATION} color={color} />
            <View style={s.timeRow}>
              <Text style={{color: 'rgba(255,255,255,0.5)', fontSize: 12}}>0:00</Text>
              <View style={s.countdownBadge}>
                <Text style={[s.countdownNum, {color}]}>{Math.max(0, countdown)}</Text>
                <Text style={{color: 'rgba(255,255,255,0.5)', fontSize: 11}}>{strings.measSecondsLeft}</Text>
              </View>
              <Text style={{color: 'rgba(255,255,255,0.5)', fontSize: 12}}>0:30</Text>
            </View>

            <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
              <MaterialCommunityIcons name="upload" size={13} color={color + 'CC'} />
              <Text style={{fontSize: 11, fontWeight: '600', color: color + 'AA'}}>Video sẽ được tải lên để phân tích</Text>
            </View>
            <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
              <MaterialIcons name="close" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={s.cancelTxt}>Huỷ đo</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Ready screen ── (no preview — CameraView stays warm hidden)
  return (
    <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle="light-content" />

      <View style={[s.readyHeader, {backgroundColor: C.bg}]}>
        <TouchableOpacity
          style={[s.backBtn, {backgroundColor: C.surface, borderColor: C.border}]}
          onPress={goBack}>
          <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
        </TouchableOpacity>
        <Text style={[s.readyTitle, {color: C.text}]}>Khuôn mặt rPPG</Text>
      </View>

      {/* Hero icon */}
      <View style={s.heroWrap}>
        <View style={[s.heroIcon, {backgroundColor: color + '18', borderColor: color + '40'}]}>
          <MaterialCommunityIcons name="face-recognition" size={52} color={color} />
        </View>
        <Text style={[s.heroTitle, {color: C.text}]}>Đo nhịp tim qua khuôn mặt</Text>
        <Text style={[s.heroSub, {color: C.textSub}]}>Camera sẽ bật khi bạn bắt đầu đo</Text>
      </View>

      <View style={s.instructions}>
        <Text style={[s.instrTitle, {color: C.text}]}>Trước khi bắt đầu</Text>
        {[
          '🌤  Đảm bảo điều kiện ánh sáng tốt',
          '📱  Giữ điện thoại ngang tầm mặt',
          '😐  Giữ khuôn mặt trong khung, không cử động',
          '⏱  Phép đo kéo dài 30 giây',
        ].map((tip, i) => (
          <View key={i} style={[s.instrRow, {backgroundColor: C.card, borderColor: C.border}]}>
            <Text style={{color: C.text, fontSize: 14, lineHeight: 20}}>{tip}</Text>
          </View>
        ))}
      </View>

      <View style={[s.readyActions, {paddingBottom: Math.max(insets.bottom, 16)}]}>
        <TouchableOpacity style={[s.startBtn, {backgroundColor: color}]} onPress={handleStart}>
          <MaterialIcons name="play-arrow" size={24} color="#fff" />
          <Text style={s.startBtnTxt}>{strings.measStartBtn}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.uploadBtn, {borderColor: color, backgroundColor: color + '12'}]}
          onPress={handlePickVideo}>
          <MaterialCommunityIcons name="file-video-outline" size={20} color={color} />
          <Text style={[s.uploadBtnTxt, {color}]}>Tải video có sẵn lên phân tích</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};


const s = StyleSheet.create({
  root: {flex: 1},

  // Permission
  permContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20},
  permIcon: {width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 2},
  permTitle: {fontSize: 22, fontWeight: '900', textAlign: 'center'},
  permSub: {fontSize: 14, lineHeight: 22, textAlign: 'center'},
  permBtn: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, marginTop: 8},
  permBtnTxt: {color: '#fff', fontSize: 16, fontWeight: '800'},
  backLink: {paddingVertical: 10},
  backLinkTxt: {fontSize: 14, fontWeight: '500'},

  // Ready
  readyHeader: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 14},
  backBtn: {width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  readyTitle: {fontSize: 20, fontWeight: '900'},
  heroWrap:  {alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, gap: 10},
  heroIcon:  {width: 110, height: 110, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  heroTitle: {fontSize: 17, fontWeight: '800', textAlign: 'center'},
  heroSub:   {fontSize: 13, textAlign: 'center'},
  instructions: {padding: 20, paddingTop: 8, gap: 8},
  instrTitle: {fontSize: 15, fontWeight: '800', marginBottom: 2},
  instrRow: {flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12},
  readyActions: {paddingHorizontal: 20, paddingTop: 4, gap: 10},
  startBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 17},
  startBtnTxt: {color: '#fff', fontSize: 17, fontWeight: '900'},
  uploadBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 15, borderWidth: 1.5},
  uploadBtnTxt: {fontSize: 15, fontWeight: '700'},

  // Measuring
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    backgroundColor: 'rgba(255,92,106,0.2)', borderWidth: 1, borderColor: 'rgba(255,92,106,0.5)',
  },
  liveDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5C6A'},
  liveTxt: {color: '#FF5C6A', fontSize: 11, fontWeight: '800', letterSpacing: 2},

  bottomPanel: {
    width: '100%', paddingHorizontal: 24, paddingBottom: 20, gap: 14,
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)',
    paddingTop: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  bpmCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 18, borderWidth: 1, width: '100%',
  },
  timeRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%'},
  countdownBadge: {alignItems: 'center'},
  countdownNum: {fontSize: 28, fontWeight: '900', letterSpacing: -1},
  cancelBtn: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10},
  cancelTxt: {color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600'},
});

export default FaceRppgScreen;
