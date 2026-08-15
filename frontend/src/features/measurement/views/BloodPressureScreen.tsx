/**
 * BloodPressureScreen — Đo huyết áp qua camera (rPPG)
 * Record camera 30s → upload /api/blood-pressure/analyse → kết quả SBP/DBP
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
import {setMeasurementResult} from '../../../core/store/slices/measurementSlice';
import measurementService from '../../../core/api/measurementService';
import * as ImagePicker from 'expo-image-picker';
import {useSafeGoBack} from '../../../core/hooks/useSafeGoBack';
import WebCameraRecorder from '../../../shared/components/WebCameraRecorder';
import NativeCameraPreview from '../../../shared/components/NativeCameraPreview';

const {width} = Dimensions.get('window');
const DURATION = 30;
const COLOR = '#EF4444'; // blood-red accent

// ─── BP status helper ──────────────────────────────────────────────────────────
function getBpCategory(sys: number) {
  if (sys < 90)  return {label: 'Huyết áp thấp',    color: '#3B82F6'};
  if (sys > 140) return {label: 'Huyết áp cao',      color: '#EF4444'};
  if (sys > 120) return {label: 'Bình thường cao',   color: '#F59E0B'};
  return             {label: 'Bình thường',          color: '#10B981'};
}

// ─── Camera bracket (face oval) ───────────────────────────────────────────────
function FaceBracket({faceDetected}: {faceDetected: boolean}) {
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
          {faceDetected ? 'Đã phát hiện khuôn mặt' : 'Đang tìm khuôn mặt...'}
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
          <MaterialCommunityIcons name="heart-pulse" size={36} color={COLOR} />
        </Animated.View>
        <ActivityIndicator color={COLOR} size="large" />
        <Text style={ul.title}>Đang phân tích...</Text>
        <Text style={ul.sub}>AI đang tính toán huyết áp từ tín hiệu rPPG khuôn mặt</Text>
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

const BloodPressureScreen = () => {
  const C = useColors();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const insets   = useSafeAreaInsets();
  const goBack   = useSafeGoBack();

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase]               = useState<Phase>('permission');
  const [countdown, setCountdown]       = useState(DURATION);
  const [elapsed, setElapsed]           = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  const cameraRef    = useRef<any>(null);
  const recordingRef = useRef(false);
  const cancelledRef = useRef(false);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Permission → ready
  useEffect(() => {
    if (permission?.granted) setPhase('ready');
  }, [permission]);

  // Simulate face detection when measuring
  useEffect(() => {
    if (phase === 'measuring') {
      const t = setTimeout(() => setFaceDetected(true), 2200);
      return () => clearTimeout(t);
    }
    setFaceDetected(false);
  }, [phase]);

  const clearCountdownInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const goToResult = useCallback(
    async (videoUri: string | null) => {
      if (!videoUri) return;
      setPhase('uploading');
      try {
        const data = await measurementService.analyzeBloodPressureVideo(videoUri);
        const result = {
          ...data,
          type: 'blood-pressure',
          systolic:  data.systolic_avg  ?? null,
          diastolic: data.diastolic_avg ?? null,
        };
        dispatch(setMeasurementResult(result as any));
        navigation.replace('MeasurementResult', {result, type: 'blood-pressure'});
      } catch (err) {
        console.warn('BP Upload failed:', err);
        Alert.alert('Lỗi phân tích', 'Không thể phân tích huyết áp. Vui lòng thử lại.');
        setPhase('ready');
      }
    },
    [dispatch, navigation],
  );

  // Start recording + countdown
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
        clearCountdownInterval();
        cameraRef.current?.stopRecording();
      }
    }, 1000);

    cancelledRef.current = false;
    const startRecording = async () => {
      if (cameraRef.current?.waitUntilReady) {
        await cameraRef.current.waitUntilReady();
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
      if (!recordingRef.current) {
        try {
          recordingRef.current = true;
          const video = await cameraRef.current?.recordAsync({maxDuration: DURATION + 2});
          recordingRef.current = false;
          if (video?.uri && !cancelledRef.current) {
            clearCountdownInterval();
            goToResult(video.uri);
          }
        } catch {
          recordingRef.current = false;
        }
      }
    };
    startRecording();
    return () => clearCountdownInterval();
  }, [phase]);

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
    cancelledRef.current = true;
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
            <MaterialCommunityIcons name="heart-pulse" size={50} color={COLOR} />
          </View>
          <Text style={[s.permTitle, {color: C.text}]}>Quyền truy cập Camera</Text>
          <Text style={[s.permSub, {color: C.textSub}]}>
            Q-Med cần quyền camera để ghi lại khuôn mặt và phân tích huyết áp qua tín hiệu rPPG.
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
        {Platform.OS === 'web' ? <WebCameraRecorder ref={cameraRef} style={StyleSheet.absoluteFill} /> : <NativeCameraPreview ref={cameraRef} style={StyleSheet.absoluteFill} />}
        <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.42)'}]} />

        <SafeAreaView style={[StyleSheet.absoluteFill, {alignItems: 'center'}]}>
          {/* Live pill */}
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveTxt}>ĐANG GHI & PHÂN TÍCH</Text>
          </View>

          {/* Face bracket */}
          <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 30}}>
            <FaceBracket faceDetected={faceDetected} />
          </View>

          {/* Bottom panel */}
          <View style={s.bottomPanel}>
            <View style={[s.bpCard, {backgroundColor: 'rgba(0,0,0,0.7)', borderColor: COLOR + '50'}]}>
              <MaterialCommunityIcons name="heart-pulse" size={16} color={COLOR} />
              <Text style={{color: COLOR + 'CC', fontSize: 13, fontWeight: '600', marginLeft: 8}}>
                Đang ghi video — kết quả sau khi tải lên
              </Text>
            </View>
            <ProgressBar elapsed={elapsed} />
            <View style={s.timeRow}>
              <Text style={{color: 'rgba(255,255,255,0.5)', fontSize: 12}}>0:00</Text>
              <View style={s.countdownBadge}>
                <Text style={[s.countdownNum, {color: COLOR}]}>{Math.max(0, countdown)}</Text>
                <Text style={{color: 'rgba(255,255,255,0.5)', fontSize: 11}}>giây còn lại</Text>
              </View>
              <Text style={{color: 'rgba(255,255,255,0.5)', fontSize: 12}}>0:30</Text>
            </View>
            <View style={s.uploadNote}>
              <MaterialCommunityIcons name="upload" size={13} color={COLOR + 'CC'} />
              <Text style={[s.uploadNoteTxt, {color: COLOR + 'AA'}]}>Video sẽ được tải lên để phân tích huyết áp</Text>
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

  // ── Ready ──
  return (
    <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[s.readyHeader, {backgroundColor: C.bg}]}>
        <TouchableOpacity style={[s.backBtn, {backgroundColor: C.surface, borderColor: C.border}]} onPress={goBack}>
          <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
        </TouchableOpacity>
        <Text style={[s.readyTitle, {color: C.text}]}>Đo Huyết Áp</Text>
      </View>

      {/* Hero */}
      <View style={s.heroWrap}>
        <View style={[s.heroIcon, {backgroundColor: COLOR + '18', borderColor: COLOR + '40'}]}>
          <MaterialCommunityIcons name="heart-pulse" size={52} color={COLOR} />
        </View>
        <Text style={[s.heroTitle, {color: C.text}]}>Đo huyết áp qua khuôn mặt</Text>
        <Text style={[s.heroSub, {color: C.textSub}]}>Camera sẽ bật khi bạn bắt đầu đo</Text>

        {/* BP range indicator */}
        <View style={[s.bpRange, {backgroundColor: C.card, borderColor: C.border}]}>
          <View style={s.bpRangeItem}>
            <View style={[s.bpDot, {backgroundColor: '#3B82F6'}]} />
            <Text style={[s.bpRangeLbl, {color: C.textSub}]}>{'<'}90</Text>
            <Text style={[s.bpRangeVal, {color: '#3B82F6'}]}>Thấp</Text>
          </View>
          <View style={[s.bpRangeDivider, {backgroundColor: C.border}]} />
          <View style={s.bpRangeItem}>
            <View style={[s.bpDot, {backgroundColor: '#10B981'}]} />
            <Text style={[s.bpRangeLbl, {color: C.textSub}]}>90–120</Text>
            <Text style={[s.bpRangeVal, {color: '#10B981'}]}>Bình thường</Text>
          </View>
          <View style={[s.bpRangeDivider, {backgroundColor: C.border}]} />
          <View style={s.bpRangeItem}>
            <View style={[s.bpDot, {backgroundColor: '#F59E0B'}]} />
            <Text style={[s.bpRangeLbl, {color: C.textSub}]}>120–140</Text>
            <Text style={[s.bpRangeVal, {color: '#F59E0B'}]}>Cao vừa</Text>
          </View>
          <View style={[s.bpRangeDivider, {backgroundColor: C.border}]} />
          <View style={s.bpRangeItem}>
            <View style={[s.bpDot, {backgroundColor: '#EF4444'}]} />
            <Text style={[s.bpRangeLbl, {color: C.textSub}]}>{'>'}140</Text>
            <Text style={[s.bpRangeVal, {color: '#EF4444'}]}>Cao</Text>
          </View>
        </View>
      </View>

      {/* Instructions */}
      <View style={s.instructions}>
        <Text style={[s.instrTitle, {color: C.text}]}>Trước khi bắt đầu</Text>
        {[
          '❤️  Ngồi thoải mái, nghỉ ngơi ít nhất 5 phút trước khi đo',
          '💡  Đảm bảo ánh sáng đủ sáng, chiếu đều khuôn mặt',
          '📱  Giữ điện thoại ngang tầm mắt, ổn định trong 30 giây',
          '☁️  Video 30s sẽ được phân tích bởi AI để ước tính huyết áp',
        ].map((tip, i) => (
          <View key={i} style={[s.instrRow, {backgroundColor: C.card, borderColor: C.border}]}>
            <Text style={{color: C.text, fontSize: 14, lineHeight: 20}}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={[s.readyActions, {paddingBottom: Math.max(insets.bottom, 16)}]}>
        <TouchableOpacity style={[s.startBtn, {backgroundColor: COLOR}]} onPress={handleStart}>
          <MaterialIcons name="play-arrow" size={24} color="#fff" />
          <Text style={s.startBtnTxt}>Bắt đầu đo huyết áp</Text>
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

  heroWrap:  {alignItems: 'center', paddingVertical: 16, gap: 10, paddingHorizontal: 20},
  heroIcon:  {width: 110, height: 110, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  heroTitle: {fontSize: 17, fontWeight: '800', textAlign: 'center'},
  heroSub:   {fontSize: 13, textAlign: 'center'},

  bpRange: {flexDirection: 'row', borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, marginTop: 8, gap: 4, alignItems: 'center', width: '100%'},
  bpRangeItem: {flex: 1, alignItems: 'center', gap: 4},
  bpDot: {width: 8, height: 8, borderRadius: 4},
  bpRangeLbl: {fontSize: 9, fontWeight: '600'},
  bpRangeVal: {fontSize: 10, fontWeight: '800', textAlign: 'center'},
  bpRangeDivider: {width: 1, height: 30},

  readyHeader:    {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 14},
  backBtn:        {width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  readyTitle:     {fontSize: 20, fontWeight: '900'},
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
    backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)',
  },
  liveDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: COLOR},
  liveTxt: {color: COLOR, fontSize: 11, fontWeight: '800', letterSpacing: 2},

  bottomPanel: {
    width: '100%', paddingHorizontal: 24, paddingBottom: 20, gap: 12,
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)',
    paddingTop: 18, borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  bpCard:         {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 18, borderWidth: 1, width: '100%'},
  timeRow:        {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%'},
  countdownBadge: {alignItems: 'center'},
  countdownNum:   {fontSize: 28, fontWeight: '900', letterSpacing: -1},
  uploadNote:     {flexDirection: 'row', alignItems: 'center', gap: 5},
  uploadNoteTxt:  {fontSize: 11, fontWeight: '600'},
  cancelBtn:      {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8},
  cancelTxt:      {color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600'},
});

export default BloodPressureScreen;
