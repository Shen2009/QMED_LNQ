/**
 * MedGemmaReportScreen — Hồ sơ điện tử + Phân tích AI (Mock Med-Gemma)
 * Nhận record từ HealthExamScreen → hiển thị hồ sơ → "gọi" Med-Gemma mock → báo cáo AI
 */
import React, {useState, useRef, useEffect} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useColors} from '../../../core/theme/useColors';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import healthProfileService from '../../../core/api/healthProfileService';
import apiClient from '../../../core/api/apiClient';
import Markdown from 'react-native-markdown-display';

const {width} = Dimensions.get('window');

// ─── Build AI prompt from record ──────────────────────────────────────────────
function buildHealthPrompt(record: any, profile: any): string {
  const type   = record.type || '';
  const result = record.result || {};
  const face   = record.face  || (type === 'face-rppg' ? result : {});
  const voice  = record.voice || (type === 'voice'     ? result : {});
  const scg    = record.scg   || (type === 'scg'       ? result : {});
  const stress = type === 'stress' ? result : record.face || {};

  const hr     = face.hr_fft || face.hr_bpm || null;
  const hrv    = (type === 'stress' ? result.hrv_ms : null) || face.hrv_ms || scg.hrv_ms || null;
  const stressLv = (type === 'stress' ? result.stress_level : null) || face.stress_level || null;
  const sys    = voice.blood_pressure?.systolic  || scg.blood_pressure?.systolic  || null;
  const dia    = voice.blood_pressure?.diastolic || scg.blood_pressure?.diastolic || null;
  const rhythm = scg.scg_rhythm || null;

  let ctx = `Kết quả đo sức khoẻ từ Q-Med (loại: ${type}):\n`;
  if (hr)       ctx += `- Nhịp tim (rPPG): ${hr} BPM\n`;
  if (stressLv !== null) ctx += `- Mức Stress: ${stressLv}/100\n`;
  if (hrv)      ctx += `- HRV: ${hrv} ms\n`;
  if (sys && dia) ctx += `- Huyết áp: ${sys}/${dia} mmHg\n`;
  if (rhythm)   ctx += `- SCG: ${rhythm}${scg.heart_anomaly ? ' ⚠️' : ''}\n`;

  if (profile) {
    const age = profile.birth_year ? new Date().getFullYear() - profile.birth_year : null;
    let userInfo = `- Người dùng:`;
    if (age) userInfo += ` ${age} tuổi,`;
    if (profile.gender) userInfo += ` giới tính: ${profile.gender === 'male' ? 'Nam' : profile.gender === 'female' ? 'Nữ' : 'Khác'},`;
    if (profile.height_cm && profile.weight_kg) {
      const bmi = (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1);
      userInfo += ` chiều cao: ${profile.height_cm}cm, cân nặng: ${profile.weight_kg}kg (BMI: ${bmi}).`;
    }
    ctx += `${userInfo}\n`;

    const ms: string[] = [];
    if (profile.cardiovascular?.length) ms.push(`Tim mạch: ${profile.cardiovascular.join(', ')}`);
    if (profile.diabetes && profile.diabetes !== 'none') ms.push(`Tiểu đường: ${profile.diabetes}`);
    if (profile.respiratory?.length) ms.push(`Hô hấp: ${profile.respiratory.join(', ')}`);
    if (profile.kidney_liver) ms.push('Có bệnh gan/thận');
    if (profile.anxiety_depression) ms.push('Rối loạn âu lo/trầm cảm');
    if (profile.family_history?.length) ms.push(`Tiền sử gia đình: ${profile.family_history.join(', ')}`);
    if (ms.length > 0) ctx += `- Bệnh lý/Tiền sử: ${ms.join('; ')}\n`;

    const ls: string[] = [];
    if (profile.smoking && profile.smoking !== 'never') ls.push(`Hút thuốc: ${profile.smoking}`);
    if (profile.alcohol && profile.alcohol !== 'never') ls.push(`Rượu bia: ${profile.alcohol}`);
    if (profile.exercise && profile.exercise !== 'passive') ls.push(`Thể dục: ${profile.exercise}`);
    if (profile.diet) ls.push(`Chế độ ăn: ${profile.diet}`);
    if (ls.length > 0) ctx += `- Lối sống: ${ls.join('; ')}\n`;

    if (profile.current_medications) ctx += `- Thuốc đang dùng: ${profile.current_medications}\n`;
  }

  return `${ctx}\nQUAN TRỌNG: Hãy coi các chỉ số đo được ở trên là dữ liệu y tế chính xác 100% của bệnh nhân. Tuyệt đối KHÔNG sử dụng các từ ngữ như "ước tính", "chỉ mang tính tham khảo", "chưa được kiểm chứng" hoặc "đo bằng điện thoại". Hãy phân tích thật tự tin và dứt khoát dựa trên các con số này.\n\nDựa trên kết quả trên, hãy phân tích và trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng sau (không kèm markdown \`\`\`json hay text thừa):\n` +
         `{\n` +
         `  "analysis": "Đoạn văn nhận xét chung về sức khoẻ",\n` +
         `  "risks": [{ "text": "Mô tả rủi ro", "level": "high" | "mid" | "low" }],\n` +
         `  "recommendations": ["Lời khuyên 1", "Lời khuyên 2"]\n` +
         `}`;
}

// ─── Mock Med-Gemma analysis generator ────────────────────────────────────────
function generateGemmaAnalysis(record: any, strings: any, profile?: any) {
  const type   = record.type || '';
  const isExam = type === 'health-exam';
  const res    = record.result || {};
  const face   = record.face  || (type === 'face-rppg' ? res : (type === 'stress' ? {} : {}));
  const voice  = record.voice || {};
  const scg    = record.scg   || (type === 'scg' ? res : {});

  // For stress type: use result directly
  const stressLv = type === 'stress' ? (res.stress_level ?? null) : (face.stress_level ?? null);
  const hrv      = type === 'stress' ? (res.hrv_ms ?? null) : (face.hrv_ms ?? scg.hrv_ms ?? null);

  const sys = voice.blood_pressure?.systolic  || scg.blood_pressure?.systolic  || null;
  const dia = voice.blood_pressure?.diastolic || scg.blood_pressure?.diastolic || null;
  const hr      = face.hr_fft   || face.hr_bpm   || (type === 'face-rppg' ? res.hr_fft : null);
  const fatigue = face.fatigue_level || 25;
  const anomaly = scg.heart_anomaly || false;

  const birthYear = profile?.birth_year;
  const age = birthYear ? (new Date().getFullYear() - birthYear) : null;
  const hasHypertension = (profile?.cardiovascular || []).includes('hypertension');
  const hasDiabetes = profile?.diabetes && profile.diabetes !== 'none';
  const familyHeart = (profile?.family_history || []).includes('heart_disease');

  // Score — only adjust for fields we actually have
  let score = 85;
  if (sys && sys >= 140) score -= 20;
  else if (sys && sys >= 130) score -= 12;
  else if (sys && sys >= 120) score -= 5;
  if (anomaly) score -= 18;
  if (stressLv !== null && stressLv > 60) score -= 10;
  else if (stressLv !== null && stressLv > 40) score -= 5;
  if (hr && (hr > 100 || hr < 50)) score -= 8;
  if (hasHypertension && sys && sys >= 120) score -= 5;
  if (hasDiabetes) score -= 4;
  if (age && age > 60) score -= 4;
  if (familyHeart && anomaly) score -= 6;
  score = Math.max(30, Math.min(98, score + Math.floor(Math.random() * 6) - 3));

  const bpCat   = !sys ? '' : sys >= 140 ? strings.medGemmaBpStage2 : sys >= 130 ? strings.medGemmaBpStage1 : sys >= 120 ? strings.medGemmaBpPrehyper : sys < 90 ? strings.medGemmaBpLow : strings.medGemmaBpNormal;
  const bpColor = !sys ? '#10B981' : sys >= 140 ? '#EF4444' : sys >= 130 ? '#F97316' : sys >= 120 ? '#EAB308' : '#10B981';
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#EAB308' : '#EF4444';
  const scoreLabel = score >= 80 ? strings.medGemmaScoreGood : score >= 60 ? strings.medGemmaScoreMid : strings.medGemmaScoreLow;

  const fallbackRisks: {icon: string; text: string; level: 'low' | 'mid' | 'high'}[] = [];
  if (sys && sys >= 130) fallbackRisks.push({icon: 'water', text: strings.medGemmaRiskHighBp(bpCat, sys, dia), level: sys >= 140 ? 'high' : 'mid'});
  if (anomaly) fallbackRisks.push({icon: 'heart-cog', text: strings.medGemmaRiskAnomaly(scg.scg_rhythm || ''), level: 'high'});
  if (stressLv !== null && stressLv > 60) fallbackRisks.push({icon: 'brain', text: strings.medGemmaRiskStressHigh(stressLv), level: 'high'});
  else if (stressLv !== null && stressLv > 40) fallbackRisks.push({icon: 'brain', text: strings.medGemmaRiskStressMid(stressLv), level: 'mid'});
  if (hrv !== null && hrv < 30) fallbackRisks.push({icon: 'chart-line-variant', text: strings.medGemmaRiskHrvLow(hrv), level: 'mid'});
  if (hasHypertension && sys && sys >= 130) fallbackRisks.push({icon: 'medical-bag', text: 'Bạn có tiền sử tăng huyết áp — mức hiện tại cần theo dõi chặt.', level: 'high'});
  if (familyHeart) fallbackRisks.push({icon: 'dna', text: 'Gia đình có tiền sử bệnh tim — nên kiểm tra định kỳ 6 tháng/lần.', level: 'mid'});
  if (age && age > 55 && sys && sys >= 125) fallbackRisks.push({icon: 'account-clock', text: `Độ tuổi ${age} — nguy cơ tim mạch cao hơn bình thường, cần chú ý huyết áp.`, level: 'mid'});
  if (fallbackRisks.length === 0) fallbackRisks.push({icon: 'shield-check', text: strings.medGemmaRiskNone, level: 'low'});

  const fallbackRecs: string[] = [];
  if (sys && sys >= 130) { fallbackRecs.push(strings.medGemmaRecLowSalt); fallbackRecs.push(strings.medGemmaRecAerobic); }
  if (anomaly) fallbackRecs.push(strings.medGemmaRecEcg);
  if (stressLv !== null && stressLv > 40) fallbackRecs.push(strings.medGemmaRecMeditate);
  fallbackRecs.push(strings.medGemmaRecWater);

  return {score, scoreColor, scoreLabel, bpCat, bpColor, sys, dia, hr, stressLv, fatigue, hrv, anomaly, risks: fallbackRisks, recs: fallbackRecs, age, profile};
}

// ─── Risk level config ─────────────────────────────────────────────────────────
const RISK_COLORS = {
  low:  {bg: '#10B98115', border: '#10B98140', text: '#10B981'},
  mid:  {bg: '#EAB30815', border: '#EAB30840', text: '#EAB308'},
  high: {bg: '#EF444415', border: '#EF444440', text: '#EF4444'},
};

// ─── Animated progress ring ────────────────────────────────────────────────────
function ScoreRing({score, color}: {score: number; color: string}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {toValue: 1, duration: 1400, useNativeDriver: false}).start();
  }, []);

  return (
    <View style={{alignItems: 'center', justifyContent: 'center', width: 130, height: 130}}>
      <View style={{position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 10, borderColor: color + '20'}} />
      <View style={{position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 10,
        borderColor: color, borderRightColor: 'transparent', borderBottomColor: score > 50 ? color : 'transparent',
        borderLeftColor: score > 75 ? color : 'transparent'}} />
      <Text style={{fontSize: 38, fontWeight: '900', color, letterSpacing: -1}}>{score}</Text>
      <Text style={{fontSize: 11, fontWeight: '800', color: color + 'BB', letterSpacing: 1}}>/ 100</Text>
    </View>
  );
}

// ─── Gemma loading animation ───────────────────────────────────────────────────
function GemmaLoading() {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse1, {toValue: 1, duration: 2500, useNativeDriver: true}),
          Animated.timing(pulse1, {toValue: 0, duration: 0, useNativeDriver: true}),
        ]),
        Animated.sequence([
          Animated.delay(1250),
          Animated.timing(pulse2, {toValue: 1, duration: 2500, useNativeDriver: true}),
          Animated.timing(pulse2, {toValue: 0, duration: 0, useNativeDriver: true}),
        ]),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {toValue: -12, duration: 1500, useNativeDriver: true}),
        Animated.timing(floatY, {toValue: 0, duration: 1500, useNativeDriver: true}),
      ])
    ).start();
  }, []);

  const scale1 = pulse1.interpolate({inputRange: [0, 1], outputRange: [1, 2.5]});
  const opacity1 = pulse1.interpolate({inputRange: [0, 1], outputRange: [0.6, 0]});
  const scale2 = pulse2.interpolate({inputRange: [0, 1], outputRange: [1, 2.5]});
  const opacity2 = pulse2.interpolate({inputRange: [0, 1], outputRange: [0.6, 0]});

  const scanX = pulse1.interpolate({inputRange: [0, 1], outputRange: [-200, 200]});

  return (
    <View style={ls.container}>
      <View style={ls.heroWrapper}>
        <Animated.View style={[ls.pulseRing, {transform: [{scale: scale1}], opacity: opacity1}]} />
        <Animated.View style={[ls.pulseRing, {transform: [{scale: scale2}], opacity: opacity2}]} />
        <Animated.View style={[ls.robotBox, {transform: [{translateY: floatY}]}]}>
          <MaterialCommunityIcons name="robot-outline" size={48} color="#fff" />
        </Animated.View>
      </View>
      
      <Text style={ls.title}>AI Đang Phân Tích...</Text>
      <Text style={ls.sub}>Med-Gemma đang đọc các chỉ số sinh tồn của bạn để đưa ra cảnh báo & lời khuyên cá nhân hoá.</Text>
      
      <View style={ls.loadingBar}>
        <Animated.View style={[ls.loadingFill, {transform: [{translateX: scanX}]}]} />
      </View>
    </View>
  );
}

const ls = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 60},
  heroWrapper: {alignItems: 'center', justifyContent: 'center', width: 160, height: 160, marginBottom: 10},
  pulseRing: {position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#8B5CF6'},
  robotBox: {width: 86, height: 86, borderRadius: 28, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', shadowColor: '#8B5CF6', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10},
  title: {fontSize: 24, fontWeight: '900', color: '#8B5CF6', marginBottom: 10},
  sub: {fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 40},
  loadingBar: {width: 200, height: 4, borderRadius: 2, backgroundColor: '#8B5CF620', overflow: 'hidden'},
  loadingFill: {width: 100, height: '100%', backgroundColor: '#8B5CF6', borderRadius: 2},
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
const MedGemmaReportScreen = () => {
  const C = useColors();
  const {strings} = useLanguage();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {record} = route.params || {record: {}};

  const [analysisPhase, setAnalysisPhase] = useState<'record' | 'loading' | 'report'>('record');
  const [profile, setProfile] = useState<any>(null);
  
  const [aiText, setAiText] = useState<string>('');
  const [aiRisks, setAiRisks] = useState<{icon: string; text: string; level: 'high'|'mid'|'low'}[]>([]);
  const [aiRecs, setAiRecs] = useState<string[]>([]);

  // Lấy health profile để cá nhân hoá phân tích
  useEffect(() => {
    healthProfileService.get().then(setProfile).catch(() => {});
  }, []);

  const analysis = generateGemmaAnalysis(record, strings, profile);

  const startAnalysis = async () => {
    setAnalysisPhase('loading');
    try {
      const prompt = buildHealthPrompt(record, profile);
      const res = await apiClient.post('/chat/message', {
        message: prompt,
        language: 'vi',
      });
      const responseText = res.data.reply || '';

      // Extract JSON robustly: find outermost { ... } without greedy-regex issues
      const jsonStart = responseText.indexOf('{');
      const jsonEnd   = responseText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        try {
          const parsed = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
          setAiText(parsed.analysis || '');
          if (parsed.risks && Array.isArray(parsed.risks)) {
            setAiRisks(parsed.risks.map((r: any) => ({
              icon:  r.level === 'high' ? 'alert' : r.level === 'mid' ? 'alert-circle-outline' : 'shield-check',
              text:  r.text  || '',
              level: r.level || 'mid',
            })));
          }
          if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
            setAiRecs(parsed.recommendations);
          }
        } catch {
          // JSON invalid — show raw text
          setAiText(responseText);
        }
      } else {
        // No JSON found — show raw text
        setAiText(responseText);
      }
    } catch (err) {
      console.warn('MedGemma API error — using generated analysis:', err);
      setAiText('Đã có lỗi xảy ra khi gọi AI Server. Vui lòng tham khảo các chỉ số ở trên.');
    }
    setAnalysisPhase('report');
  };

  const type  = record.type || '';
  const isExam = type === 'health-exam';
  const res   = record.result || {};
  const face  = record.face  || (type === 'face-rppg' ? res : {});
  const voice = record.voice || {};
  const scg   = record.scg   || (type === 'scg' ? res : {});

  const locale = strings.medGemmaExamDateLocale;
  const examDate = record.exam_at
    ? new Date(record.exam_at).toLocaleString(locale, {dateStyle: 'long', timeStyle: 'short'})
    : new Date().toLocaleString(locale, {dateStyle: 'long', timeStyle: 'short'});

  // ── Loading ──
  if (analysisPhase === 'loading') {
    return (
      <SafeAreaView style={[r.root, {backgroundColor: C.bg}]}>
        <StatusBar barStyle="light-content" />
        <View style={r.header}>
          <View style={[r.gemmaChip, {backgroundColor: '#8B5CF618', borderColor: '#8B5CF640'}]}>
            <MaterialCommunityIcons name="robot" size={16} color="#8B5CF6" />
            <Text style={[r.gemmaChipTxt, {color: '#8B5CF6'}]}>{strings.medGemmaTitle}</Text>
          </View>
        </View>
        <GemmaLoading />
      </SafeAreaView>
    );
  }

  // ── AI Report ──
  if (analysisPhase === 'report') {
    return (
      <SafeAreaView style={[r.root, {backgroundColor: C.bg}]}>
        <StatusBar barStyle="light-content" />
        <View style={r.header}>
          <TouchableOpacity style={[r.backBtn, {borderColor: C.border, backgroundColor: C.surface}]} onPress={() => navigation.navigate('Main')}>
            <MaterialIcons name="home" size={18} color={C.textSub} />
          </TouchableOpacity>
          <View style={[r.gemmaChip, {backgroundColor: '#8B5CF618', borderColor: '#8B5CF640'}]}>
            <MaterialCommunityIcons name="robot" size={14} color="#8B5CF6" />
            <Text style={[r.gemmaChipTxt, {color: '#8B5CF6'}]}>MED-GEMMA AI</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={r.scroll} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <Text style={[r.reportTitle, {color: C.text}]}>{strings.medGemmaReportTitle}</Text>
          <Text style={[r.reportSub, {color: C.textSub}]}>{examDate}</Text>

          {/* Overall score + BP */}
          <View style={[r.scoreCard, {backgroundColor: C.card, borderColor: analysis.scoreColor + '40'}]}>
            <View style={{flex: 1, gap: 10}}>
              <Text style={[r.scoreLabel, {color: C.textSub}]}>{strings.medGemmaScoreLabel}</Text>
              <View style={[r.scoreBadge, {backgroundColor: analysis.scoreColor + '18', borderColor: analysis.scoreColor + '40'}]}>
                <Text style={[r.scoreBadgeTxt, {color: analysis.scoreColor}]}>{analysis.scoreLabel}</Text>
              </View>
              <View style={{gap: 4}}>
                <Text style={{color: C.text, fontSize: 13}}>
                  🩸 {strings.medGemmaBpLabel}: <Text style={{fontWeight: '800', color: analysis.bpColor}}>{analysis.sys}/{analysis.dia} mmHg</Text>
                </Text>
                <Text style={{color: C.text, fontSize: 13}}>
                  ❤️ {strings.medGemmaHrLabel}: <Text style={{fontWeight: '800', color: C.text}}>{analysis.hr} BPM</Text>
                </Text>
                <Text style={{color: C.text, fontSize: 13}}>
                  🧠 {strings.medGemmaStressLabel}: <Text style={{fontWeight: '800', color: analysis.stressLv !== null && analysis.stressLv > 60 ? '#EF4444' : analysis.stressLv !== null && analysis.stressLv > 40 ? '#EAB308' : '#10B981'}}>{analysis.stressLv !== null ? `${analysis.stressLv}%` : '—'}</Text>
                </Text>
              </View>
            </View>
            <ScoreRing score={analysis.score} color={analysis.scoreColor} />
          </View>

          {/* BP classification */}
          <View style={[r.bpCard, {backgroundColor: analysis.bpColor + '12', borderColor: analysis.bpColor + '40'}]}>
            <MaterialCommunityIcons name="water" size={18} color={analysis.bpColor} />
            <View>
              <Text style={{color: analysis.bpColor, fontSize: 11, fontWeight: '700', letterSpacing: 0.5}}>{strings.medGemmaBpClassLabel}</Text>
              <Text style={{color: analysis.bpColor, fontSize: 18, fontWeight: '900'}}>{analysis.bpCat}</Text>
            </View>
          </View>

          {/* Risk factors */}
          <View style={[r.section, {backgroundColor: C.card, borderColor: C.border}]}>
            <Text style={[r.sectionTitle, {color: C.text}]}>{strings.medGemmaRiskTitle}</Text>
            {(aiRisks.length > 0 ? aiRisks : analysis.risks).map((risk, i) => {
              const rc = RISK_COLORS[risk.level] || RISK_COLORS.mid;
              return (
                <View key={i} style={[r.riskItem, {backgroundColor: rc.bg, borderColor: rc.border}]}>
                  <MaterialCommunityIcons name={risk.icon as any} size={18} color={rc.text} />
                  <Text style={[r.riskTxt, {color: rc.text}]}>{risk.text}</Text>
                </View>
              );
            })}
          </View>

          {/* Recommendations */}
          <View style={[r.section, {backgroundColor: C.card, borderColor: C.border}]}>
            <Text style={[r.sectionTitle, {color: C.text}]}>{strings.medGemmaRecTitle}</Text>
            {(aiRecs.length > 0 ? aiRecs : analysis.recs).map((rec, i) => (
              <View key={i} style={r.recItem}>
                <View style={[r.recBullet, {backgroundColor: '#8B5CF6'}]} />
                <Text style={[r.recTxt, {color: C.text}]}>{rec}</Text>
              </View>
            ))}
          </View>

          {/* AI Text (real Gemma response) */}
          {!!aiText && (
            <View style={[r.section, {backgroundColor: '#8B5CF608', borderColor: '#8B5CF640'}]}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6}}>
                <MaterialCommunityIcons name="robot" size={16} color="#8B5CF6" />
                <Text style={[r.sectionTitle, {color: '#8B5CF6'}]}>Med-Gemma AI Phân Tích</Text>
              </View>
              <Markdown style={{body: {color: C.text, fontSize: 13, lineHeight: 22}}}>
                {aiText}
              </Markdown>
            </View>
          )}

          {/* AI Disclaimer */}
          <View style={[r.disclaimer, {backgroundColor: '#8B5CF608', borderColor: '#8B5CF630'}]}>
            <MaterialCommunityIcons name="robot-outline" size={14} color="#8B5CF6" />
            <Text style={r.disclaimerTxt}>
              {strings.medGemmaDisclaimer}
            </Text>
          </View>

          {/* Actions */}
          <View style={{gap: 10}}>
            <TouchableOpacity style={r.primaryBtn} onPress={() => navigation.navigate('Main')}>
              <MaterialIcons name="home" size={20} color="#fff" />
              <Text style={r.primaryBtnTxt}>{strings.medGemmaGoHome}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[r.outlineBtn, {borderColor: C.border, backgroundColor: C.surface}]}
              onPress={() => navigation.navigate('HealthExam')}>
              <MaterialIcons name="refresh" size={18} color={C.textSub} />
              <Text style={[r.outlineBtnTxt, {color: C.textSub}]}>{strings.medGemmaRedo}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Medical Record (before analysis) ──
  return (
    <SafeAreaView style={[r.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle="light-content" />
      <View style={r.header}>
        <TouchableOpacity style={[r.backBtn, {borderColor: C.border, backgroundColor: C.surface}]} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
        </TouchableOpacity>
        <Text style={[r.headerTitle, {color: C.text}]}>Hồ sơ Điện tử</Text>
        <View style={[r.gemmaChip, {backgroundColor: '#8B5CF618', borderColor: '#8B5CF640'}]}>
          <MaterialCommunityIcons name="file-document-outline" size={14} color="#8B5CF6" />
          <Text style={[r.gemmaChipTxt, {color: '#8B5CF6'}]}>EMR</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={r.scroll} showsVerticalScrollIndicator={false}>
        {/* Record header */}
        <View style={[r.recordHeader, {backgroundColor: C.card, borderColor: C.border}]}>
          <View style={[r.recordIcon, {backgroundColor: '#8B5CF620', borderColor: '#8B5CF650'}]}>
            <MaterialCommunityIcons name="file-document-outline" size={28} color="#8B5CF6" />
          </View>
          <View style={{flex: 1}}>
            <Text style={[{fontSize: 18, fontWeight: '900', color: C.text}]}>{strings.medGemmaEMRTitle}</Text>
            <Text style={{color: C.textSub, fontSize: 12, marginTop: 2}}>{examDate}</Text>
            <View style={[r.statusChip, {backgroundColor: '#10B98115', borderColor: '#10B98140'}]}>
              <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981'}} />
              <Text style={{color: '#10B981', fontSize: 11, fontWeight: '700'}}>{strings.medGemmaEMRStatus}</Text>
            </View>
          </View>
        </View>

        {/* Face rPPG results — show for health-exam or face-rppg */}
        {(isExam || type === 'face-rppg') && (
          <View style={[r.measureCard, {backgroundColor: C.card, borderColor: '#EF444432'}]}>
            <View style={r.measureHeader}>
              <View style={{width: 34, height: 34, borderRadius: 10, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center'}}>
                <MaterialCommunityIcons name="face-recognition" size={18} color="#EF4444" />
              </View>
              <Text style={[r.measureTitle, {color: C.text}]}>{strings.medGemmaFaceCard}</Text>
            </View>
            <View style={r.dataGrid}>
              <DataItem label={strings.medGemmaLabelHr} value={`${face.hr_fft || face.hr_bpm || '—'} BPM`} color="#EF4444" />
              <DataItem label={strings.medGemmaLabelStress} value={face.stress_level != null ? `${face.stress_level}%` : '—'} color="#EF4444" />
              <DataItem label={strings.medGemmaLabelHrv} value={face.hrv_ms != null ? `${face.hrv_ms} ms` : '—'} color="#EF4444" />
            </View>
          </View>
        )}

        {/* Stress results */}
        {type === 'stress' && (
          <View style={[r.measureCard, {backgroundColor: C.card, borderColor: '#A855F732'}]}>
            <View style={r.measureHeader}>
              <View style={{width: 34, height: 34, borderRadius: 10, backgroundColor: '#A855F720', alignItems: 'center', justifyContent: 'center'}}>
                <MaterialCommunityIcons name="brain" size={18} color="#A855F7" />
              </View>
              <Text style={[r.measureTitle, {color: C.text}]}>Phân tích Stress</Text>
            </View>
            <View style={r.dataGrid}>
              <DataItem label="Mức stress" value={res.stress_level != null ? `${res.stress_level}/100` : '—'} color="#A855F7" />
              <DataItem label="HRV" value={res.hrv_ms != null ? `${res.hrv_ms} ms` : '—'} color="#A855F7" />
            </View>
          </View>
        )}

        {/* Voice BP results — show for health-exam or voice */}
        {(isExam || type === 'voice') && (
          <View style={[r.measureCard, {backgroundColor: C.card, borderColor: '#3B82F632'}]}>
            <View style={r.measureHeader}>
              <View style={{width: 34, height: 34, borderRadius: 10, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center'}}>
                <MaterialCommunityIcons name="microphone" size={18} color="#3B82F6" />
              </View>
              <Text style={[r.measureTitle, {color: C.text}]}>{strings.medGemmaVoiceCard}</Text>
            </View>
            <View style={r.dataGrid}>
              <DataItem label={strings.medGemmaLabelSysBp} value={voice.blood_pressure?.systolic != null ? `${voice.blood_pressure.systolic} mmHg` : '—'} color="#3B82F6" />
              <DataItem label={strings.medGemmaLabelDiaBp} value={voice.blood_pressure?.diastolic != null ? `${voice.blood_pressure.diastolic} mmHg` : '—'} color="#3B82F6" />
              <DataItem label={strings.medGemmaLabelBreathing} value={voice.breathing_rate ? `${voice.breathing_rate} l/ph` : '—'} color="#3B82F6" />
            </View>
          </View>
        )}

        {/* SCG results — show for health-exam or scg */}
        {(isExam || type === 'scg') && (
          <View style={[r.measureCard, {backgroundColor: C.card, borderColor: '#A855F732'}]}>
            <View style={r.measureHeader}>
              <View style={{width: 34, height: 34, borderRadius: 10, backgroundColor: '#A855F720', alignItems: 'center', justifyContent: 'center'}}>
                <MaterialCommunityIcons name="stethoscope" size={18} color="#A855F7" />
              </View>
              <Text style={[r.measureTitle, {color: C.text}]}>{strings.medGemmaScgCard}</Text>
            </View>
            <View style={r.dataGrid}>
              <DataItem label={strings.medGemmaLabelRhythm} value={scg.scg_rhythm || '—'} color={scg.heart_anomaly ? '#EF4444' : '#10B981'} />
              <DataItem label={strings.medGemmaLabelAnomaly} value={scg.heart_anomaly ? strings.medGemmaAnomalyFound : strings.medGemmaAnomalyNone} color={scg.heart_anomaly ? '#EF4444' : '#10B981'} />
              <DataItem label={strings.medGemmaLabelHrv} value={scg.hrv_ms != null ? `${scg.hrv_ms} ms` : '—'} color="#A855F7" />
              <DataItem label={strings.medGemmaLabelAnomalyScore} value={(scg.scg_anomaly_score || 0).toFixed(2)} color="#A855F7" />
            </View>
          </View>
        )}

        {/* Send to Gemma */}
        <View style={[r.gemmaHint, {backgroundColor: '#8B5CF610', borderColor: '#8B5CF640'}]}>
          <MaterialCommunityIcons name="robot" size={22} color="#8B5CF6" />
          <View style={{flex: 1, gap: 4}}>
            <Text style={{color: '#8B5CF6', fontSize: 13, lineHeight: 21}}>
              Hồ sơ điện tử đã tổng hợp. Nhấn bên dưới để <Text style={{fontWeight: '800'}}>Med-Gemma AI</Text> phân tích cá nhân hoá.
            </Text>
            {profile && (
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4}}>
                {profile.birth_year && (
                  <View style={{backgroundColor: '#8B5CF620', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3}}>
                    <Text style={{color: '#8B5CF6', fontSize: 11, fontWeight: '700'}}>
                      🎂 {new Date().getFullYear() - profile.birth_year} tuổi
                    </Text>
                  </View>
                )}
                {profile.gender && (
                  <View style={{backgroundColor: '#8B5CF620', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3}}>
                    <Text style={{color: '#8B5CF6', fontSize: 11, fontWeight: '700'}}>
                      {profile.gender === 'male' ? '👨 Nam' : profile.gender === 'female' ? '👩 Nữ' : '🧑 Khác'}
                    </Text>
                  </View>
                )}
                {(profile.cardiovascular?.length > 0) && (
                  <View style={{backgroundColor: '#EF444420', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3}}>
                    <Text style={{color: '#EF4444', fontSize: 11, fontWeight: '700'}}>⚠️ Tim mạch</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={r.gemmaBtn} onPress={startAnalysis}>
          <MaterialCommunityIcons name="robot" size={22} color="#fff" />
          <Text style={r.gemmaBtnTxt}>{strings.medGemmaSend}</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Mini data item component ──────────────────────────────────────────────────
function DataItem({label, value, color}: {label: string; value: string; color: string}) {
  return (
    <View style={di.item}>
      <Text style={[di.label, {color: '#666'}]}>{label}</Text>
      <Text style={[di.value, {color}]}>{value}</Text>
    </View>
  );
}
const di = StyleSheet.create({
  item: {flexBasis: '48%', gap: 2, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#ffffff08'},
  label: {fontSize: 11, fontWeight: '600'},
  value: {fontSize: 15, fontWeight: '800'},
});

const r = StyleSheet.create({
  root: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 8},
  backBtn: {width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {flex: 1, fontSize: 20, fontWeight: '900'},
  gemmaChip: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1},
  gemmaChipTxt: {fontSize: 11, fontWeight: '800', letterSpacing: 1},
  scroll: {padding: 16, gap: 14, paddingBottom: 100},

  recordHeader: {flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderWidth: 1, borderRadius: 20, padding: 18},
  recordIcon: {width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5},
  statusChip: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start', marginTop: 6},

  measureCard: {borderWidth: 1, borderRadius: 18, padding: 16, gap: 12},
  measureHeader: {flexDirection: 'row', alignItems: 'center', gap: 10},
  measureTitle: {fontSize: 15, fontWeight: '800'},
  dataGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},

  gemmaHint: {flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14},
  gemmaBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18, backgroundColor: '#8B5CF6'},
  gemmaBtnTxt: {color: '#fff', fontSize: 16, fontWeight: '900'},

  // Report
  reportTitle: {fontSize: 26, fontWeight: '900', letterSpacing: -1},
  reportSub: {fontSize: 13, marginTop: -8},
  scoreCard: {flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1.5, borderRadius: 22, padding: 20},
  scoreLabel: {fontSize: 12, fontWeight: '600'},
  scoreBadge: {paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start'},
  scoreBadgeTxt: {fontSize: 14, fontWeight: '900'},
  bpCard: {flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 16},
  section: {borderWidth: 1, borderRadius: 18, padding: 16, gap: 10},
  sectionTitle: {fontSize: 16, fontWeight: '800', marginBottom: 2},
  riskItem: {flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12},
  riskTxt: {flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '600'},
  recItem: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  recBullet: {width: 6, height: 6, borderRadius: 3, marginTop: 8},
  recTxt: {flex: 1, fontSize: 13, lineHeight: 22},
  disclaimer: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 14, padding: 12},
  disclaimerTxt: {flex: 1, fontSize: 11, color: '#8B5CF6', lineHeight: 18},
  primaryBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 17, backgroundColor: '#8B5CF6'},
  primaryBtnTxt: {color: '#fff', fontSize: 17, fontWeight: '900'},
  outlineBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14, borderWidth: 1},
  outlineBtnTxt: {fontSize: 15, fontWeight: '600'},
});

export default MedGemmaReportScreen;
