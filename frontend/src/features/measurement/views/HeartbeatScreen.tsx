/**
 * HeartbeatScreen — Phân loại âm thanh tim (Heart Sound Classification)
 * Sử dụng expo-av để ghi âm → Upload lên /api/heartbeat/analyze
 * Hiển thị kết quả: Normal/Abnormal, BPM, confidence, khuyến nghị
 */
import React, {useState, useRef, useEffect} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, Dimensions, StatusBar, ScrollView, Alert,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {Audio} from 'expo-av';
import {useColors} from '../../../core/theme/useColors';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {useSafeGoBack} from '../../../core/hooks/useSafeGoBack';
import {setMeasurementResult} from '../../../core/store/slices/measurementSlice';
import historyService from '../../../core/api/historyService';
import measurementService from '../../../core/api/measurementService';

const {width} = Dimensions.get('window');
const DURATION = 10; // 10 seconds recording

type Phase = 'ready' | 'recording' | 'uploading' | 'result';
type Classification = 'normal' | 'abnormal' | 'unknown';

interface WebAudioRecording {
  stream: MediaStream;
  context: AudioContext;
  processor: ScriptProcessorNode;
  chunks: Float32Array[];
  cancelled: boolean;
}

const encodeWav = (chunks: Float32Array[], sampleRate: number) => {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + sampleCount * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, sampleCount * 2, true);
  let offset = 44;
  chunks.forEach(chunk => chunk.forEach(sample => {
    const value = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
    offset += 2;
  }));
  return new Blob([buffer], {type: 'audio/wav'});
};

// Backend response format (actual)
interface BackendResponse {
  primary_prediction: string;
  confidence: number;
  probs: Record<string, number>;
  bpm: number | null;
  signal_quality: number;
  recommendation: { level: string; title: string; message: string; icon: string };
  segments: Array<{
    segment_idx: number;
    start_sec: number;
    end_sec: number;
    top_label: string;
    probs: Record<string, number>;
  }>;
  spectrogram_b64?: string;
}

// Normalized format for UI
interface HeartbeatResult {
  overall_label: string;
  overall_confidence: number;
  is_abnormal: boolean;
  bpm_estimate: number | null;
  segments: Array<{
    label: string;
    confidence: number;
    probabilities: Record<string, number>;
  }>;
  recommendation: string;
  signal_quality: number;
  spectrogram_b64: string | null;
}

// Transform backend response to UI format
function normalizeBackendResponse(data: BackendResponse): HeartbeatResult {
  const label = data.primary_prediction || 'unknown';
  const isAbnormal = label.toLowerCase() !== 'normal';
  return {
    overall_label: label.charAt(0).toUpperCase() + label.slice(1),
    overall_confidence: data.confidence ?? 0,
    is_abnormal: isAbnormal,
    bpm_estimate: data.bpm ?? null,
    segments: (data.segments || []).map(seg => ({
      label: (seg.top_label || 'unknown').charAt(0).toUpperCase() + (seg.top_label || 'unknown').slice(1),
      confidence: seg.probs?.[seg.top_label] ?? 0,
      probabilities: seg.probs || {},
    })),
    recommendation: data.recommendation?.message || '',
    signal_quality: data.signal_quality ?? 0,
    spectrogram_b64: data.spectrogram_b64 || null,
  };
}

// ─── Step instruction ────────────────────────────────────────────────────────
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

// ─── Animated waveform bars ──────────────────────────────────────────────────
function RecordingWave({color}: {color: string}) {
  const bars = 12;
  const anims = useRef(Array.from({length: bars}, () => new Animated.Value(0.3))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {toValue: Math.random() * 0.7 + 0.3, duration: 200 + Math.random() * 300, useNativeDriver: true}),
          Animated.timing(anim, {toValue: Math.random() * 0.3 + 0.2, duration: 200 + Math.random() * 300, useNativeDriver: true}),
        ]),
      ),
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60, gap: 4}}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: 4, height: 50, borderRadius: 2,
            backgroundColor: color,
            transform: [{scaleY: anim}],
          }}
        />
      ))}
    </View>
  );
}

// ─── Result classification badge ─────────────────────────────────────────────
function ClassBadge({label, isAbnormal, confidence, C}: {label: string; isAbnormal: boolean; confidence: number; C: any}) {
  const badgeColor = isAbnormal ? '#EF4444' : '#10B981';
  const icon = isAbnormal ? 'heart-broken' : 'heart-pulse';
  return (
    <View style={[rb.badge, {backgroundColor: badgeColor + '15', borderColor: badgeColor + '40'}]}>
      <MaterialCommunityIcons name={icon as any} size={40} color={badgeColor} />
      <Text style={[rb.label, {color: badgeColor}]}>{label}</Text>
      <Text style={[rb.conf, {color: C.textSub}]}>Độ tin cậy: {(confidence * 100).toFixed(1)}%</Text>
    </View>
  );
}
const rb = StyleSheet.create({
  badge: {alignItems: 'center', gap: 8, padding: 24, borderRadius: 20, borderWidth: 1.5},
  label: {fontSize: 24, fontWeight: '900'},
  conf: {fontSize: 13, fontWeight: '600'},
});

// ─── Metric pill ─────────────────────────────────────────────────────────────
function MetricPill({icon, label, value, unit, color, C}: {icon: string; label: string; value: string; unit: string; color: string; C: any}) {
  return (
    <View style={[mp.pill, {backgroundColor: C.card, borderColor: C.border}]}>
      <View style={[mp.iconWrap, {backgroundColor: color + '18'}]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[mp.label, {color: C.textSub}]}>{label}</Text>
      <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 2}}>
        <Text style={[mp.value, {color: C.text}]}>{value}</Text>
        {unit ? <Text style={[mp.unit, {color: C.textSub}]}>{unit}</Text> : null}
      </View>
    </View>
  );
}
const mp = StyleSheet.create({
  pill: {flex: 1, alignItems: 'center', gap: 4, padding: 14, borderRadius: 16, borderWidth: 1},
  iconWrap: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  label: {fontSize: 10, fontWeight: '600'},
  value: {fontSize: 20, fontWeight: '900', letterSpacing: -0.5},
  unit: {fontSize: 11, fontWeight: '600'},
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const HeartbeatScreen = () => {
  const C = useColors();
  const {strings} = useLanguage();
  const navigation = useNavigation<any>();
  const goBack = useSafeGoBack();
  const dispatch = useDispatch();
  const color = '#E11D48'; // rose-600

  const [phase, setPhase] = useState<Phase>('ready');
  const [countdown, setCountdown] = useState(DURATION);
  const [result, setResult] = useState<HeartbeatResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const webRecordingRef = useRef<WebAudioRecording | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(1)).current;

  // Live dot blink
  useEffect(() => {
    if (phase !== 'recording') return;
    Animated.loop(Animated.sequence([
      Animated.timing(dotAnim, {toValue: 0.2, duration: 500, useNativeDriver: true}),
      Animated.timing(dotAnim, {toValue: 1, duration: 500, useNativeDriver: true}),
    ])).start();
    return () => dotAnim.stopAnimation();
  }, [phase]);

  // Countdown
  useEffect(() => {
    if (phase !== 'recording') return;
    if (countdown <= 0) {
      handleStopRecording();
      return;
    }
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [phase, countdown]);

  // Progress animation
  useEffect(() => {
    if (phase === 'recording') {
      const elapsed = DURATION - countdown;
      Animated.timing(progressAnim, {toValue: elapsed / DURATION, duration: 900, useNativeDriver: false}).start();
    }
  }, [countdown]);

  const handleStartRecording = async () => {
    try {
      setError(null);
      if (Platform.OS === 'web') {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Trinh duyet khong ho tro ghi am.');
        const stream = await navigator.mediaDevices.getUserMedia({audio: true});
        const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextConstructor) throw new Error('Trinh duyet khong ho tro xu ly am thanh.');
        const context = new AudioContextConstructor();
        await context.resume();
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(4096, 1, 1);
        const silentGain = context.createGain();
        silentGain.gain.value = 0;
        const state: WebAudioRecording = {stream, context, processor, chunks: [], cancelled: false};
        webRecordingRef.current = state;
        processor.onaudioprocess = event => state.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
        source.connect(processor); processor.connect(silentGain); silentGain.connect(context.destination);
        setCountdown(DURATION); progressAnim.setValue(0); setPhase('recording');
        return;
      }
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền', 'Cần quyền microphone để ghi âm thanh tim');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const {recording} = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setCountdown(DURATION);
      progressAnim.setValue(0);
      setPhase('recording');
    } catch (err: any) {
      console.warn('Recording start error:', err);
      Alert.alert('Lỗi', 'Không thể bắt đầu ghi âm: ' + err.message);
    }
  };

  const handleStopRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        const state = webRecordingRef.current;
        if (!state) return;
        state.processor.disconnect();
        state.stream.getTracks().forEach(track => track.stop());
        await state.context.close();
        webRecordingRef.current = null;
        if (state.cancelled) return;
        const uri = URL.createObjectURL(encodeWav(state.chunks, state.context.sampleRate));
        setPhase('uploading');
        await uploadAndAnalyze(uri, 'audio/wav', 'heartbeat.wav');
        return;
      }
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error('Không có file ghi âm');
      setPhase('uploading');
      await uploadAndAnalyze(uri);
    } catch (err: any) {
      console.warn('Recording stop error:', err);
      setError('Lỗi dừng ghi âm: ' + err.message);
      setPhase('ready');
    }
  };

  const handleCancel = async () => {
    try {
      if (Platform.OS === 'web' && webRecordingRef.current) {
        webRecordingRef.current.cancelled = true;
        webRecordingRef.current.processor.disconnect();
        webRecordingRef.current.stream.getTracks().forEach(track => track.stop());
        await webRecordingRef.current.context.close();
        webRecordingRef.current = null;
      }
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    } catch {}
    setPhase('ready');
    setCountdown(DURATION);
    progressAnim.setValue(0);
  };

  const uploadAndAnalyze = async (uri: string, type?: string, name?: string) => {
    try {
      const data: HeartbeatResult = normalizeBackendResponse(await measurementService.analyzeHeartbeatAudio({
        uri,
        name: name || 'heartbeat.m4a',
        type: type || 'audio/m4a',
      }));
      setResult(data);

      // Save to history
      try {
        await historyService.save({
          type: 'heartbeat',
          result: {
            ...data,
            heart_anomaly: data.is_abnormal,
            bpm: data.bpm_estimate,
          },
        });
      } catch (e) { console.warn('History save:', e); }

      // Save to Redux
      dispatch(setMeasurementResult({
        type: 'heartbeat',
        ...data,
        heart_anomaly: data.is_abnormal,
        bpm: data.bpm_estimate,
      } as any));

      setPhase('result');
    } catch (err: any) {
      console.warn('Upload error:', err);
      const msg = err.response?.data?.detail || err.message || 'Lỗi không xác định';
      setError('Phân tích thất bại: ' + msg);
      setPhase('ready');
    }
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
    setPhase('ready');
    setCountdown(DURATION);
    progressAnim.setValue(0);
  };

  const handleViewReport = () => {
    if (!result) return;
    navigation.navigate('MedGemmaReport', {
      record: {
        type: 'heartbeat',
        result: {
          ...result,
          heart_anomaly: result.is_abnormal,
          bpm: result.bpm_estimate,
          heartbeat_label: result.overall_label,
          heartbeat_confidence: result.overall_confidence,
          heartbeat_recommendation: result.recommendation,
        },
      },
    });
  };

  // ── Uploading ──
  if (phase === 'uploading') {
    return (
      <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20}}>
          <MaterialCommunityIcons name="heart-pulse" size={48} color={color} />
          <Text style={{color, fontSize: 18, fontWeight: '800'}}>Đang phân tích âm thanh tim...</Text>
          <Text style={{color: C.textSub, fontSize: 13}}>Mô hình CNN-LSTM đang xử lý</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Result ──
  if (phase === 'result' && result) {
    const bpm = result.bpm_estimate ?? 0;
    const quality = result.signal_quality ?? 0;
    const qualityLabel = quality >= 0.7 ? 'Tốt' : quality >= 0.4 ? 'TB' : 'Kém';
    const qualityColor = quality >= 0.7 ? C.green : quality >= 0.4 ? C.amber : C.red;

    return (
      <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
        <StatusBar barStyle="light-content" />
        <View style={s.header}>
          <TouchableOpacity style={[s.backBtn, {backgroundColor: C.surface, borderColor: C.border}]} onPress={goBack}>
            <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
          </TouchableOpacity>
          <Text style={[s.title, {color: C.text}]}>Kết quả phân tích</Text>
        </View>

        <ScrollView contentContainerStyle={s.readyContent} showsVerticalScrollIndicator={false}>
          {/* Classification */}
          <ClassBadge
            label={result.overall_label}
            isAbnormal={result.is_abnormal}
            confidence={result.overall_confidence}
            C={C}
          />

          {/* Metrics */}
          <View style={{flexDirection: 'row', gap: 10}}>
            <MetricPill icon="sine-wave" label="Chất lượng" value={qualityLabel} unit="" color={qualityColor} C={C} />
            <MetricPill icon="timer-outline" label="Phân đoạn" value={`${result.segments.length}`} unit="" color={C.blue} C={C} />
          </View>

          {/* Mel Spectrogram */}
          {result.spectrogram_b64 ? (
            <View style={[s.card, {backgroundColor: C.card, borderColor: C.border}]}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={18} color={color} />
                <Text style={[s.cardTitle, {color: C.text}]}>Phổ Mel Spectrogram</Text>
              </View>
              <View style={{borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border}}>
                <Image
                  source={{uri: `data:image/png;base64,${result.spectrogram_b64}`}}
                  style={{width: '100%', height: 160}}
                  resizeMode="contain"
                />
              </View>
              <Text style={{color: C.textSub, fontSize: 11, lineHeight: 16, marginTop: 4}}>
                Log-Mel spectrogram 64 bins, 25–2000 Hz. Trục ngang: thời gian, trục dọc: tần số mel.
              </Text>
            </View>
          ) : null}

          {/* Segments detail */}
          {result.segments.length > 0 && (
            <View style={[s.card, {backgroundColor: C.card, borderColor: C.border}]}>
              <Text style={[s.cardTitle, {color: C.text}]}>Chi tiết phân đoạn ({result.segments.length})</Text>
              {result.segments.map((seg, i) => {
                const segColor = seg.label.toLowerCase().includes('normal') && !seg.label.toLowerCase().includes('abnormal') ? '#10B981' : '#EF4444';
                return (
                  <View key={i} style={{flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: C.border}}>
                    <View style={{width: 28, height: 28, borderRadius: 14, backgroundColor: segColor + '20', alignItems: 'center', justifyContent: 'center'}}>
                      <Text style={{color: segColor, fontSize: 11, fontWeight: '900'}}>{i + 1}</Text>
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={{color: C.text, fontSize: 13, fontWeight: '700'}}>{seg.label}</Text>
                    </View>
                    <Text style={{color: segColor, fontSize: 14, fontWeight: '900'}}>{(seg.confidence * 100).toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Recommendation */}
          {result.recommendation && (
            <View style={[s.card, {backgroundColor: (result.is_abnormal ? '#EF4444' : '#10B981') + '08', borderColor: (result.is_abnormal ? '#EF4444' : '#10B981') + '30'}]}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <MaterialCommunityIcons name="doctor" size={20} color={result.is_abnormal ? '#EF4444' : '#10B981'} />
                <Text style={[s.cardTitle, {color: result.is_abnormal ? '#EF4444' : '#10B981'}]}>Khuyến nghị</Text>
              </View>
              <Text style={{color: C.text, fontSize: 14, lineHeight: 22}}>{result.recommendation}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={{gap: 10}}>
            <TouchableOpacity style={[s.startBtn, {backgroundColor: '#8B5CF6'}]} onPress={handleViewReport}>
              <MaterialCommunityIcons name="robot" size={20} color="#fff" />
              <Text style={s.startBtnTxt}>Báo cáo MedGemma AI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.startBtn, {backgroundColor: color}]} onPress={handleRetry}>
              <MaterialIcons name="replay" size={20} color="#fff" />
              <Text style={s.startBtnTxt}>Đo lại</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Recording ──
  if (phase === 'recording') {
    return (
      <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
        <StatusBar barStyle="light-content" />
        <View style={s.topBar}>
          <View style={[s.livePill, {backgroundColor: color + '15', borderColor: color + '40'}]}>
            <Animated.View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: dotAnim}} />
            <Text style={[s.liveTxt, {color}]}>ĐANG GHI ÂM</Text>
          </View>
          <TouchableOpacity style={[s.cancelSmall, {backgroundColor: C.surface, borderColor: C.border}]} onPress={handleCancel}>
            <MaterialIcons name="close" size={18} color={C.textSub} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.measuringContent} showsVerticalScrollIndicator={false}>
          {/* Mic visual */}
          <View style={[s.hero, {backgroundColor: color + '0C', borderColor: color + '35'}]}>
            <View style={[s.heroIcon, {backgroundColor: color + '20', borderColor: color + '50'}]}>
              <MaterialIcons name="mic" size={48} color={color} />
            </View>
            <Text style={[s.heroTitle, {color}]}>Đặt mic gần ngực</Text>
            <Text style={[s.heroSub, {color: C.textSub}]}>Giữ yên, không nói chuyện</Text>
          </View>

          {/* Waveform */}
          <RecordingWave color={color} />

          {/* Progress */}
          <View style={{gap: 10, alignItems: 'center', width: '100%'}}>
            <View style={{width: '100%', height: 6, backgroundColor: color + '20', borderRadius: 3, overflow: 'hidden'}}>
              <Animated.View style={{
                height: 6, borderRadius: 3, backgroundColor: color,
                width: progressAnim.interpolate({inputRange: [0, 1], outputRange: ['0%', '100%']}),
              }} />
            </View>
            <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
              <Text style={{color: C.textSub, fontSize: 13}}>Còn lại</Text>
              <View style={[s.countBadge, {backgroundColor: color + '15', borderColor: color + '40'}]}>
                <Text style={[s.countNum, {color}]}>{countdown}</Text>
                <Text style={{color: C.textSub, fontSize: 10}}>giây</Text>
              </View>
              <Text style={{color: C.textSub, fontSize: 13}}>/ {DURATION}s</Text>
            </View>
          </View>

          {/* Reminder */}
          <View style={[s.reminderCard, {backgroundColor: C.amber + '10', borderColor: C.amber + '30'}]}>
            <MaterialIcons name="info-outline" size={16} color={C.amber} />
            <Text style={[s.reminderTxt, {color: C.amber}]}>Giữ yên thiết bị. Thở bình thường. Không nói chuyện.</Text>
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
            <MaterialCommunityIcons name="heart-pulse" size={48} color={color} />
          </View>
          <Text style={[s.heroTitle, {color}]}>Heart Sound Classification</Text>
          <Text style={[s.heroSub, {color: C.textSub}]}>Phân loại tình trạng tim qua âm thanh sử dụng AI CNN-LSTM</Text>
        </View>

        {/* Instructions */}
        <View style={[s.card, {backgroundColor: C.card, borderColor: C.border}]}>
          <Text style={[s.cardTitle, {color: C.text}]}>Cách thực hiện</Text>
          <View style={{gap: 14}}>
            <Step num={1} text="Tìm nơi yên tĩnh, ít tiếng ồn xung quanh" C={C} color={color} />
            <Step num={2} text="Đặt micro điện thoại sát ngực trái (vùng tim)" C={C} color={color} />
            <Step num={3} text="Giữ yên, thở bình thường, không nói chuyện" C={C} color={color} />
            <Step num={4} text="Ghi âm trong 10 giây — AI sẽ tự phân tích" C={C} color={color} />
          </View>
        </View>

        {/* AI info */}
        <View style={[s.sensorCard, {backgroundColor: color + '08', borderColor: color + '25'}]}>
          <MaterialCommunityIcons name="brain" size={18} color={color} />
          <View style={{flex: 1}}>
            <Text style={[s.sensorTitle, {color}]}>Mô hình CNN-LSTM</Text>
            <Text style={[s.sensorSub, {color}]}>Phân tích tần số 25–900 Hz, phát hiện tiếng thổi van tim, rung nhĩ, và bất thường khác</Text>
          </View>
        </View>

        {/* Error */}
        {error && (
          <View style={[s.reminderCard, {backgroundColor: C.red + '10', borderColor: C.red + '30'}]}>
            <MaterialIcons name="error-outline" size={16} color={C.red} />
            <Text style={[s.reminderTxt, {color: C.red}]}>{error}</Text>
          </View>
        )}

        {/* Start */}
        <TouchableOpacity style={[s.startBtn, {backgroundColor: color}]} onPress={handleStartRecording}>
          <MaterialIcons name="mic" size={24} color="#fff" />
          <Text style={s.startBtnTxt}>Bắt đầu ghi âm</Text>
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

  // Recording
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12},
  livePill: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1},
  liveTxt: {fontSize: 11, fontWeight: '800', letterSpacing: 2},
  cancelSmall: {width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},

  measuringContent: {paddingHorizontal: 24, gap: 20, paddingBottom: 40, alignItems: 'center'},

  countBadge: {flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1},
  countNum: {fontSize: 28, fontWeight: '900', letterSpacing: -1},

  reminderCard: {flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, width: '100%'},
  reminderTxt: {flex: 1, fontSize: 12, lineHeight: 18},
});

export default HeartbeatScreen;
