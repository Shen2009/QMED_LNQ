/**
 * StressScreen — Đánh giá Stress qua khuôn mặt
 * Record camera 30s → upload /api/rppg/analyse → real result (fallback mock)
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
import measurementService, {DEMO_DURATION_SECONDS, getMeasurementErrorMessage} from '../../../core/api/measurementService';
import * as ImagePicker from 'expo-image-picker';
import {useSafeGoBack} from '../../../core/hooks/useSafeGoBack';
import historyService from '../../../core/api/historyService';
import WebCameraRecorder from '../../../shared/components/WebCameraRecorder';
import NativeCameraPreview from '../../../shared/components/NativeCameraPreview';

const {width} = Dimensions.get('window');
const DURATION = DEMO_DURATION_SECONDS;
const COLOR = '#A855F7';

// ─── Mock fallback ─────────────────────────────────────────────────────────────
// No more mock fallback


// ─── Face bracket ──────────────────────────────────────────────────────────────
function FaceBracket({faceDetected}: {faceDetected: boolean}) {
  const {strings} = useLanguage();
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

  const cv = faceDetected ? COLOR : '#FFB347';
  const corners = [
    {top: 6, left: 8,  borderTopWidth: 4,    borderLeftWidth: 4,  borderTopLeftRadius: 8},
    {top: 6, right: 8, borderTopWidth: 4,    borderRightWidth: 4, borderTopRightRadius: 8},
    {bottom: 6, left: 8,  borderBottomWidth: 4, borderLeftWidth: 4,  borderBottomLeftRadius: 8},
    {bottom: 6, right: 8, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8},
  ] as const;

  return (
    <View style={{width: 220, height: 290, alignItems: 'center', justifyContent: 'center'}}>
      <Animated.View style={{
        width: 220, height: 290, borderRadius: 110,
        borderWidth: 2.5, borderColor: cv, opacity: glow, overflow: 'hidden', alignItems: 'center',
      }}>
        <Animated.View style={{width: '115%', height: 2.5, backgroundColor: cv, opacity: 0.7, transform: [{translateY: scanY}]}} />
      </Animated.View>
      {corners.map((style, i) => (
        <View key={i} style={[{position: 'absolute', width: 28, height: 28, borderColor: cv}, style]} />
      ))}
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
  statusPill: {position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1},
  statusTxt: {fontSize: 12, fontWeight: '700'},
});



// ─── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({elapsed}: {elapsed: number}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {toValue: elapsed / DURATION, duration: 900, useNativeDriver: false}).start();
  }, [elapsed]);
  return (
    <View style={{width: width - 48, height: 5, backgroundColor: COLOR + '25', borderRadius: 3, overflow: 'hidden'}}>
      <Animated.View style={{
        height: 5, borderRadius: 3, backgroundColor: COLOR,
        width: anim.interpolate({inputRange: [0, 1], outputRange: ['0%', '100%']}),
      }} />
    </View>
  );
}

// ─── Uploading overlay ─────────────────────────────────────────────────────────
function UploadingOverlay() {
  const {strings} = useLanguage();
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
    <View style={ul.overlay}>
      <View style={ul.card}>
        <Animated.View style={[ul.iconRing, {transform: [{scale: pulse}]}]}>
          <MaterialCommunityIcons name="brain" size={36} color={COLOR} />
        </Animated.View>
        <ActivityIndicator color={COLOR} size="large" />
        <Text style={ul.title}>{strings.measUploading}</Text>
        <Text style={ul.sub}>Phân tích stress qua khuôn mặt</Text>
      </View>
    </View>
  );
}
const ul = StyleSheet.create({
  overlay:  {flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center'},
  card:     {backgroundColor: '#111827', borderRadius: 28, padding: 36, alignItems: 'center', gap: 16, width: 280, borderWidth: 1, borderColor: COLOR + '40'},
  iconRing: {width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: COLOR + '50', alignItems: 'center', justifyContent: 'center'},
  title:    {color: '#fff', fontSize: 18, fontWeight: '800'},
  sub:      {color: 'rgba(255,255,255,0.50)', fontSize: 13, textAlign: 'center'},
});


// ─── Main Screen ───────────────────────────────────────────────────────────────
type Phase = 'permission' | 'ready' | 'measuring' | 'uploading';

const StressScreen = () => {
  const C = useColors();
  const {strings} = useLanguage();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const insets   = useSafeAreaInsets();  // FIX: safe area for Android nav bar
  const goBack   = useSafeGoBack();

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase]               = useState<Phase>('permission');
  const [countdown, setCountdown]       = useState(DURATION);
  const [elapsed, setElapsed]           = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  const cameraRef    = useRef<any>(null);
  const recordingRef = useRef(false);
  const cancelledRef = useRef(false);   // true khi user bấm Hủy
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Permission → ready
  useEffect(() => {
    if (permission?.granted) setPhase('ready');
  }, [permission]);

  // Simulate face detection
  useEffect(() => {
    if (phase === 'measuring') {
      const t = setTimeout(() => setFaceDetected(true), 2200);
      return () => clearTimeout(t);
    }
    setFaceDetected(false);
  }, [phase]);

  // ── Cleanup helper ──
  const clearCountdownInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Navigate to result (shared by recording + gallery) ──
  const goToResult = useCallback(
    async (videoUri: string | null) => {
      if (!videoUri) {
        Alert.alert('Không có video', 'Camera không trả về video. Hãy kiểm tra quyền camera và thử lại.');
        setPhase('ready');
        return;
      }
      setPhase('uploading');
      try {
        const data = await measurementService.analyzeStressVideo(videoUri);
        if (data.stress_score == null) {
          throw new Error('Tín hiệu khuôn mặt chưa đủ rõ để tính mức stress. Hãy giữ mặt trong khung, đủ sáng và đo lại.');
        }
        const stressLevel = data.stress_score ?? null;
        const result = {
          ...data,
          type: 'stress',
          stress_level: stressLevel,
          hrv_ms: data.hrv_ms ?? null,
          // recovery_score derived from stress: thư giãn cao khi stress thấp
          recovery_score: stressLevel !== null ? Math.round(100 - stressLevel) : null,
        };
        dispatch(setMeasurementResult(result as any));
        navigation.replace('MeasurementResult', {result, type: 'stress'});
      } catch (err) {
        console.warn('Upload failed:', err);
        Alert.alert(
          'Lỗi phân tích stress',
          getMeasurementErrorMessage(err, 'Không thể phân tích video. Hãy giữ mặt trong khung, đủ sáng và thử lại.'),
        );
        setPhase('ready');
      }
    },
    [dispatch, navigation],
  );

  // ── Start recording + countdown on phase change ──
  useEffect(() => {
    if (phase !== 'measuring') return;

    setCountdown(DURATION);
    setElapsed(0);

    clearCountdownInterval();
    let remaining = DURATION;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      setElapsed(prev => prev + 1);
      if (remaining <= 0) {
        // FIX: clear interval immediately at 0
        clearCountdownInterval();
        cameraRef.current?.stopRecording();
      }
    }, 1000);

    cancelledRef.current = false; // reset mỗi lần bắt đầu đo
    const startRecording = async () => {
      try {
        if (cameraRef.current?.waitUntilReady) {
          await cameraRef.current.waitUntilReady();
        } else {
          await new Promise(r => setTimeout(r, 500));
        }
        if (!recordingRef.current) {
          recordingRef.current = true;
          const video = await cameraRef.current?.recordAsync({maxDuration: DURATION + 2});
          recordingRef.current = false;
          // Chỉ upload nếu user KHÔNG bấm Hủy
          if (video?.uri && !cancelledRef.current) {
            clearCountdownInterval();
            goToResult(video.uri);
          } else if (!cancelledRef.current) {
            Alert.alert('Không ghi được video', 'Camera không tạo được video. Hãy kiểm tra quyền camera và thử lại.');
            setPhase('ready');
          }
        }
      } catch (err) {
        recordingRef.current = false;
        if (!cancelledRef.current) {
          console.warn('Stress recording failed:', err);
          Alert.alert('Camera chưa sẵn sàng', getMeasurementErrorMessage(err, 'Không thể khởi động camera.'));
          setPhase('ready');
        }
      }
    };
    startRecording();

    return () => clearCountdownInterval();
  }, [phase]); // only on phase change

  const handleStart = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Cần quyền Camera', 'Vui lòng cấp quyền camera trong Cài đặt.');
        return;
      }
    }
    setFaceDetected(false);
    setPhase('measuring');
  };

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

  const handleCancel = () => {
    cancelledRef.current = true; // đánh dấu đã huỷ trước khi stopRecording
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

  // ── Uploading ──
  if (phase === 'uploading') {
    return (
      <View style={{flex: 1, backgroundColor: '#000'}}>
        <StatusBar barStyle="light-content" />
        <UploadingOverlay />
      </View>
    );
  }

  // ── Permission ──
  if (!permission?.granted && phase === 'permission') {
    return (
      <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
        <StatusBar barStyle="light-content" />
        <View style={s.permContainer}>
          <View style={[s.permIcon, {backgroundColor: COLOR + '18', borderColor: COLOR + '40'}]}>
            <MaterialIcons name="camera-alt" size={50} color={COLOR} />
          </View>
          <Text style={[s.permTitle, {color: C.text}]}>Quyền truy cập Camera</Text>
          <Text style={[s.permSub, {color: C.textSub}]}>
            Q-Med cần quyền camera để ghi lại khuôn mặt và phân tích mức độ stress qua HRV.
          </Text>
          <TouchableOpacity style={[s.startBtn, {backgroundColor: COLOR}]} onPress={requestPermission}>
            <MaterialIcons name="camera" size={18} color="#fff" />
            <Text style={s.startBtnTxt}>Cấp quyền Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goBack}>
            <Text style={[s.backLinkTxt, {color: C.textSub}]}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Measuring ──
  if (phase === 'measuring') {
    return (
      <View style={{flex: 1, backgroundColor: '#000'}}>
        <StatusBar barStyle="light-content" />
        {/* SINGLE persistent CameraView — no remount = no black screen on Android */}
        <View style={[StyleSheet.absoluteFill, {overflow: 'hidden'}]}>
          {Platform.OS === 'web' ? <WebCameraRecorder ref={cameraRef} style={StyleSheet.absoluteFill} /> : <NativeCameraPreview ref={cameraRef} style={StyleSheet.absoluteFill} />}
        </View>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.42)'}]} />

        <SafeAreaView style={[StyleSheet.absoluteFill, {alignItems: 'center'}]}>
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveTxt}>ĐANG GHI & PHÂN TÍCH</Text>
          </View>

          <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 30}}>
            <FaceBracket faceDetected={faceDetected} />
          </View>

          <View style={s.bottomPanel}>
            <View style={[s.stressCard, {backgroundColor: 'rgba(0,0,0,0.7)', borderColor: COLOR + '50'}]}>
              <MaterialCommunityIcons name="brain" size={16} color={COLOR} />
              <Text style={{color: COLOR + 'CC', fontSize: 13, fontWeight: '600', marginLeft: 8}}>Đang ghi video — kết quả sau khi tải lên</Text>
            </View>
            <ProgressBar elapsed={elapsed} />
            <View style={s.timeRow}>
              <Text style={{color: 'rgba(255,255,255,0.5)', fontSize: 12}}>0:00</Text>
              <View style={s.countdownBadge}>
                <Text style={[s.countdownNum, {color: COLOR}]}>{Math.max(0, countdown)}</Text>
                <Text style={{color: 'rgba(255,255,255,0.5)', fontSize: 11}}>{strings.measSecondsLeft}</Text>
              </View>
              <Text style={{color: 'rgba(255,255,255,0.5)', fontSize: 12}}>0:30</Text>
            </View>
            <View style={s.uploadNote}>
              <MaterialCommunityIcons name="upload" size={13} color={COLOR + 'CC'} />
              <Text style={[s.uploadNoteTxt, {color: COLOR + 'AA'}]}>Video sẽ được tải lên để phân tích</Text>
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

  // ── Ready — keep CameraView alive as background to prevent Android black screen ──
  // ── Ready ── (no preview — CameraView stays warm hidden)
  return (
    <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle="light-content" />

      <View style={[s.readyHeader, {backgroundColor: C.bg}]}>
        <TouchableOpacity style={[s.backBtn, {backgroundColor: C.surface, borderColor: C.border}]} onPress={goBack}>
          <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
        </TouchableOpacity>
        <Text style={[s.readyTitle, {color: C.text}]}>Đánh giá Stress</Text>
      </View>

      {/* Hero icon */}
      <View style={s.heroWrap}>
        <View style={[s.heroIcon, {backgroundColor: COLOR + '18', borderColor: COLOR + '40'}]}>
          <MaterialCommunityIcons name="brain" size={52} color={COLOR} />
        </View>
        <Text style={[s.heroTitle, {color: C.text}]}>Đo mức độ Stress qua khuôn mặt</Text>
        <Text style={[s.heroSub, {color: C.textSub}]}>Camera sẽ bật khi bạn bắt đầu đo</Text>
      </View>

      <View style={s.instructions}>
        <Text style={[s.instrTitle, {color: C.text}]}>Trước khi bắt đầu</Text>
        {[
          '🧠  Ngồi thoải mái, thư giãn toàn thân',
          '💡  Đảm bảo ánh sáng đủ sáng, không ngược sáng',
          '📱  Giữ điện thoại ngang tầm mặt, ổn định',
          '☁️  Video 30s sẽ được tải lên để phân tích AI',
        ].map((tip, i) => (
          <View key={i} style={[s.instrRow, {backgroundColor: C.card, borderColor: C.border}]}>
            <Text style={{color: C.text, fontSize: 14, lineHeight: 20}}>{tip}</Text>
          </View>
        ))}
      </View>

      <View style={[s.readyActions, {paddingBottom: Math.max(insets.bottom, 16)}]}>
        <TouchableOpacity style={[s.startBtn, {backgroundColor: COLOR}]} onPress={handleStart}>
          <MaterialIcons name="play-arrow" size={24} color="#fff" />
          <Text style={s.startBtnTxt}>{strings.measStartStress}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.uploadBtn, {borderColor: COLOR, backgroundColor: COLOR + '12'}]} onPress={handlePickVideo}>
          <MaterialCommunityIcons name="file-video-outline" size={20} color={COLOR} />
          <Text style={[s.uploadBtnTxt, {color: COLOR}]}>Tải video lên để phân tích</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};


const s = StyleSheet.create({
  root: {flex: 1},

  permContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20},
  permIcon:      {width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 2},
  permTitle:     {fontSize: 22, fontWeight: '900', textAlign: 'center'},
  permSub:       {fontSize: 14, lineHeight: 22, textAlign: 'center'},
  backLinkTxt:   {fontSize: 14, fontWeight: '500', paddingVertical: 10},

  heroWrap:  {alignItems: 'center', paddingVertical: 20, gap: 10},
  heroIcon:  {width: 110, height: 110, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  heroTitle: {fontSize: 17, fontWeight: '800', textAlign: 'center'},
  heroSub:   {fontSize: 13, textAlign: 'center'},
  readyHeader:    {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 14},
  backBtn:        {width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  readyTitle:     {fontSize: 20, fontWeight: '900'},
  previewWrapper: {marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', borderWidth: 2, height: 220, position: 'relative'},
  previewCamera:  {flex: 1},
  previewOverlay: {position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14, borderWidth: 2, borderRadius: 22},
  instructions:   {padding: 20, gap: 8},
  instrTitle:     {fontSize: 16, fontWeight: '800', marginBottom: 4},
  instrRow:       {borderWidth: 1, borderRadius: 14, padding: 13},
  readyActions:   {paddingHorizontal: 20, paddingTop: 4},
  startBtn:       {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 17},
  startBtnTxt:    {color: '#fff', fontSize: 17, fontWeight: '900'},
  uploadBtn:      {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 15, borderWidth: 1.5, marginTop: 10},
  uploadBtnTxt:   {fontSize: 15, fontWeight: '700'},

  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    backgroundColor: 'rgba(168,85,247,0.2)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.5)',
  },
  liveDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: COLOR},
  liveTxt: {color: COLOR, fontSize: 11, fontWeight: '800', letterSpacing: 2},

  bottomPanel: {
    width: '100%', paddingHorizontal: 24, paddingBottom: 20, gap: 12,
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)',
    paddingTop: 18, borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  stressCard:     {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 18, borderWidth: 1, width: '100%'},
  timeRow:        {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%'},
  countdownBadge: {alignItems: 'center'},
  countdownNum:   {fontSize: 28, fontWeight: '900', letterSpacing: -1},
  uploadNote:     {flexDirection: 'row', alignItems: 'center', gap: 5},
  uploadNoteTxt:  {fontSize: 11, fontWeight: '600'},
  cancelBtn:      {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8},
  cancelTxt:      {color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600'},
});

export default StressScreen;
