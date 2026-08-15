import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {MaterialCommunityIcons, MaterialIcons} from '@expo/vector-icons';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {useColors} from '../../../core/theme/useColors';
import {useSafeGoBack} from '../../../core/hooks/useSafeGoBack';
import {
  setMeasurementLoading,
  setMeasurementResult,
} from '../../../core/store/slices/measurementSlice';

import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../../core/api/apiClient';

// ─── Pulsing animated dot while measuring ───────────────────────────────────
function PulseDot({color}: {color: string}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {toValue: 1.5, duration: 700, useNativeDriver: true}),
          Animated.timing(scale, {toValue: 1, duration: 700, useNativeDriver: true}),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {toValue: 0.15, duration: 700, useNativeDriver: true}),
          Animated.timing(opacity, {toValue: 0.6, duration: 700, useNativeDriver: true}),
        ]),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: color,
        transform: [{scale}],
        opacity,
      }}
    />
  );
}

// ─── Indeterminate Progress Bar while measuring ───────────────────────────────────
function ProgressBar({color}: {color: string}) {
  const translateX = useRef(new Animated.Value(-200)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 300,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -200,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.progressContainer}>
      <Animated.View
        style={[
          styles.progressBar,
          {backgroundColor: color, transform: [{translateX}]},
        ]}
      />
    </View>
  );
}

const MeasurementDetailScreen = () => {
  const C = useColors();
  const {strings, language} = useLanguage();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const goBack = useSafeGoBack();
  const [measuring, setMeasuring] = useState(false);

  const {type} = route.params || {type: 'contact-ppg'};
  const isVi = language === 'vi';

  // Voice type → redirect to HealthExam (voice is step 2 of the 3-step exam)
  useEffect(() => {
    if (type === 'voice') {
      navigation.replace('HealthExam');
    }
  }, [type]);

  // ─── Per-type config (depends on C) ────────────────────────────────────────
  const typeConfig: Record<
    string,
    {color: string; icon: string; iconLib: 'community' | 'material'; tag: string}
  > = {
    'face-rppg':   {color: C.red,    icon: 'face-recognition', iconLib: 'community', tag: '30s'},
    'contact-ppg': {color: C.green,  icon: 'heart-pulse',      iconLib: 'community', tag: '30s'},
    voice:         {color: C.blue,   icon: 'microphone',       iconLib: 'community', tag: '30s'},
    stress:        {color: C.purple, icon: 'brain',            iconLib: 'community', tag: '2-3 phút'},
    sleep:         {color: C.teal,   icon: 'sleep',            iconLib: 'community', tag: '1-2 phút'},
  };

  const cfg = typeConfig[type] || typeConfig['contact-ppg'];

  const measurementInfo: Record<string, any> = {
    'contact-ppg': {
      title: strings.contactPpg,
      instructions: isVi
        ? ['Áp nhẹ ngón tay lên camera sau', 'Che kín camera và đèn flash', 'Giữ yên trong 30 giây', 'Duy trì lực ổn định']
        : ['Place finger gently on rear camera', 'Cover camera and flash', 'Keep still for 30 seconds', 'Maintain steady pressure'],
      duration: isVi ? '30 giây' : '30 seconds',
      durationSec: 30,
    },
    'face-rppg': {
      title: strings.faceRppg,
      instructions: isVi
        ? ['Đặt khuôn mặt vào khung hình', 'Đảm bảo đủ ánh sáng', 'Giữ yên và thư giãn', 'Nhìn vào camera trong 30 giây']
        : ['Keep face inside the frame', 'Ensure sufficient lighting', 'Stay still and relaxed', 'Look at camera for 30 seconds'],
      duration: isVi ? '30 giây' : '30 seconds',
      durationSec: 30,
    },

    stress: {
      title: strings.stress,
      instructions: isVi
        ? ['Ngồi ở tư thế thoải mái', 'Hít thở sâu vài lần', 'Trả lời trung thực', 'Hoàn tất đánh giá']
        : ['Sit in a comfortable position', 'Take a few deep breaths', 'Answer honestly', 'Complete the assessment'],
      duration: isVi ? '2-3 phút' : '2-3 minutes',
      durationSec: 3,
    },
    sleep: {
      title: strings.sleep,
      instructions: isVi
        ? ['Trả lời về giấc ngủ đêm qua', 'Cung cấp thời lượng ngủ', 'Đánh giá chất lượng ngủ', 'Ghi chú các gián đoạn']
        : ['Answer about last night sleep', 'Provide your sleep duration', 'Rate your sleep quality', 'Note any interruptions'],
      duration: isVi ? '1-2 phút' : '1-2 minutes',
      durationSec: 3,
    },
  };

  const info = measurementInfo[type] || measurementInfo['contact-ppg'];

  const handleStart = async () => {
    // ── Camera-based (face-rPPG + contact-PPG) ─────────────────────────────
    if (type === 'face-rppg' || type === 'contact-ppg') {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          alert('Vui lòng cấp quyền truy cập camera.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['videos'],
          allowsEditing: true,
          videoMaxDuration: info.durationSec,
          quality: 0.5,
        });

        if (result.canceled || !result.assets[0]) return;

        setMeasuring(true);
        dispatch(setMeasurementLoading(true));

        try {
          const videoAsset = result.assets[0];
          const localUri = videoAsset.uri;
          const filename = localUri.split('/').pop() || 'video.mp4';
          const match = /\.(\w+)$/.exec(filename);
          const typeFile = match ? `video/${match[1]}` : 'video/mp4';

          const formData = new FormData();
          formData.append('video', {uri: localUri, name: filename, type: typeFile} as any);

          const response = await apiClient.post('/rppg/analyse', formData, {
            headers: {'Content-Type': 'multipart/form-data'},
          });

          dispatch(setMeasurementResult(response.data));
          setMeasuring(false);
          navigation.navigate('MeasurementResult', {result: response.data, type});
        } catch (error: any) {
          setMeasuring(false);
          dispatch(setMeasurementLoading(false));
          alert('Có lỗi khi phân tích video: ' + (error.response?.data?.detail || error.message));
        }
      } catch (cameraError) {
        alert('Lỗi khởi động camera.');
      }
      return;
    }

    // ── Dedicated screens for other measurement types ───────────────────────
    const screenMap: Record<string, string> = {
      stress: 'Stress',
      sleep:  'Sleep',
      scg:    'Scg',
    };
    const targetScreen = screenMap[type];
    if (targetScreen) {
      navigation.navigate(targetScreen);
    }
  };

  return (
    <SafeAreaView style={[styles.root, {backgroundColor: C.bg}]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, {backgroundColor: C.surface, borderColor: C.border}]}
            onPress={goBack}>
            <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: C.text}]}>Chi tiết đo</Text>
        </View>

        {/* Hero banner */}
        <View style={[styles.heroBanner, {borderColor: cfg.color + '35', backgroundColor: cfg.color + '0D'}]}>
          <View style={styles.heroGlow} />
          <View style={[styles.heroIconWrap, {backgroundColor: cfg.color + '20'}]}>
            {cfg.iconLib === 'community' ? (
              <MaterialCommunityIcons name={cfg.icon as any} size={40} color={cfg.color} />
            ) : (
              <MaterialIcons name={cfg.icon as any} size={40} color={cfg.color} />
            )}
          </View>
          <Text style={[styles.heroTitle, {color: cfg.color}]}>{info.title}</Text>
          <View style={[styles.durationChip, {backgroundColor: cfg.color + '20', borderColor: cfg.color + '40'}]}>
            <MaterialIcons name="timer" size={13} color={cfg.color} />
            <Text style={[styles.durationTxt, {color: cfg.color}]}>{info.duration}</Text>
          </View>
        </View>

        {/* Instructions card */}
        <View style={[styles.card, {backgroundColor: C.card, borderColor: C.border}]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardAccent, {backgroundColor: cfg.color}]} />
            <Text style={[styles.cardTitle, {color: C.text}]}>{strings.measurementInstructions || 'Hướng dẫn'}</Text>
          </View>
          {info.instructions.map((step: string, i: number) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, {backgroundColor: cfg.color + '20', borderColor: cfg.color + '40'}]}>
                <Text style={[styles.stepNumTxt, {color: cfg.color}]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepTxt, {color: C.text}]}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Measuring state */}
        {measuring && (
          <View style={[styles.measuringCard, {backgroundColor: C.surface, borderColor: cfg.color + '50'}]}>
            <View style={styles.measuringRow}>
              <PulseDot color={cfg.color} />
              <Text style={[styles.measuringLabel, {color: cfg.color}]}>
                {strings.measurementAnalyzing || 'Đang phân tích...'}
              </Text>
            </View>
            <ProgressBar color={cfg.color} />
            <Text style={[styles.measuringSub, {color: C.textSub}]}>
              {strings.measurementStayStill || 'Vui lòng đợi trong giây lát...'}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {!measuring ? (
            <>
              <TouchableOpacity
                style={[styles.btnPrimary, {backgroundColor: cfg.color}]}
                onPress={handleStart}>
                <MaterialIcons name="play-arrow" size={20} color="#fff" />
                <Text style={styles.btnPrimaryTxt}>
                  {strings.measurementStart || 'Bắt đầu đo'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnOutline, {borderColor: C.border, backgroundColor: C.surface}]}
                onPress={() => navigation.goBack()}>
                <Text style={[styles.btnOutlineTxt, {color: C.textSub}]}>
                  {strings.measurementCancel || 'Huỷ'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.btnOutline, {borderColor: C.border, backgroundColor: C.surface}]}
              onPress={() => {setMeasuring(false); navigation.goBack();}}>
              <Text style={[styles.btnOutlineTxt, {color: C.textSub}]}>Hủy đo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {paddingBottom: 110},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {fontSize: 18, fontWeight: '700'},

  heroBanner: {
    margin: 16,
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -100,
    right: -60,
    borderWidth: 60,
    borderColor: 'transparent',
    opacity: 0.04,
  },
  heroIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {fontSize: 22, fontWeight: '800', letterSpacing: -0.5},
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  durationTxt: {fontSize: 12, fontWeight: '700'},

  card: {
    margin: 16,
    marginTop: 0,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4},
  cardAccent: {width: 3, height: 16, borderRadius: 2},
  cardTitle: {fontSize: 15, fontWeight: '700'},
  stepRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumTxt: {fontSize: 12, fontWeight: '800'},
  stepTxt: {fontSize: 14, lineHeight: 20, flex: 1},

  measuringCard: {
    margin: 16,
    marginTop: 0,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  measuringRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12},
  measuringLabel: {fontSize: 15, fontWeight: '700'},
  
  progressContainer: {
    height: 6,
    width: '100%',
    backgroundColor: '#00000015',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    width: '50%',
    borderRadius: 3,
    position: 'absolute',
    left: 0,
  },

  measuringSub: {fontSize: 12},

  actions: {padding: 16, gap: 10},
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  btnPrimaryTxt: {color: '#fff', fontSize: 16, fontWeight: '800'},
  btnOutline: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnOutlineTxt: {fontSize: 15, fontWeight: '600'},
});

export default MeasurementDetailScreen;
