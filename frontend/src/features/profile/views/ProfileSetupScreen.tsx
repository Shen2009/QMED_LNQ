/**
 * ProfileSetupScreen — Thu thập Health Profile lần đầu đăng nhập
 * 4 bước: Cơ bản → Tiền sử bản thân → Tiền sử gia đình → Lối sống
 * Hỗ trợ dark / light mode qua useColors()
 */
import React, {useState, useRef} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Animated, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useColors} from '../../../core/theme/useColors';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import healthProfileService from '../../../core/api/healthProfileService';

const TOTAL_STEPS = 4;

// ─── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({current, C}: {current: number; C: ReturnType<typeof useColors>}) {
  return (
    <View style={si.row}>
      {Array.from({length: TOTAL_STEPS}, (_, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <View style={[si.circle, {
              borderColor: done || active ? C.teal : C.border,
              backgroundColor: done ? C.teal : active ? C.tealDim : 'transparent',
            }]}>
              {done
                ? <MaterialIcons name="check" size={13} color={C.bg} />
                : <Text style={[si.num, {color: active ? C.teal : C.textDim}]}>{i + 1}</Text>
              }
            </View>
            {i < TOTAL_STEPS - 1 && (
              <View style={[si.line, {backgroundColor: done ? C.teal : C.border}]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
const si = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginVertical: 16},
  circle: {width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  num: {fontSize: 12, fontWeight: '800'},
  line: {flex: 1, height: 2, marginHorizontal: 4},
});

// ─── Checkbox row ──────────────────────────────────────────────────────────────
function CheckRow({label, checked, onToggle, color, C}: {
  label: string; checked: boolean; onToggle: () => void; color: string;
  C: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity onPress={onToggle} style={cr.row} activeOpacity={0.7}>
      <View style={[cr.box, {
        borderColor: checked ? color : C.border,
        backgroundColor: checked ? color + '20' : 'transparent',
      }]}>
        {checked && <MaterialIcons name="check" size={14} color={color} />}
      </View>
      <Text style={[cr.label, {color: C.text}]}>{label}</Text>
    </TouchableOpacity>
  );
}
const cr = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6},
  box: {width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  label: {fontSize: 14, flex: 1},
});

// ─── Radio row ─────────────────────────────────────────────────────────────────
function RadioRow({label, selected, onSelect, color, C}: {
  label: string; selected: boolean; onSelect: () => void; color: string;
  C: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity onPress={onSelect} style={rr.row} activeOpacity={0.7}>
      <View style={[rr.circle, {borderColor: selected ? color : C.border}]}>
        {selected && <View style={[rr.dot, {backgroundColor: color}]} />}
      </View>
      <Text style={[rr.label, {color: C.text}]}>{label}</Text>
    </TouchableOpacity>
  );
}
const rr = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6},
  circle: {width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  dot: {width: 10, height: 10, borderRadius: 5},
  label: {fontSize: 14, flex: 1},
});

// ─── Section card ──────────────────────────────────────────────────────────────
function Card({children, color, C}: {children: React.ReactNode; color: string; C: ReturnType<typeof useColors>}) {
  return (
    <View style={[cd.card, {borderColor: color + '30', backgroundColor: C.card}]}>
      {children}
    </View>
  );
}
const cd = StyleSheet.create({
  card: {borderWidth: 1, borderRadius: 18, padding: 18, gap: 4},
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
const ProfileSetupScreen = () => {
  const C = useColors();
  const {strings} = useLanguage();
  const navigation = useNavigation<any>();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ── Step 1: Cơ bản ──
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // ── Step 2: Tiền sử bản thân ──
  const [cardiovascular, setCardiovascular] = useState<string[]>([]);
  const [diabetes, setDiabetes] = useState<'none' | 'type1' | 'type2'>('none');
  const [respiratory, setRespiratory] = useState<string[]>([]);
  const [kidneyLiver, setKidneyLiver] = useState(false);
  const [anxietyDepression, setAnxietyDepression] = useState(false);
  const [medications, setMedications] = useState('');

  // ── Step 3: Tiền sử gia đình ──
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);

  // ── Step 4: Lối sống ──
  const [smoking, setSmoking] = useState<'never' | 'former' | 'current'>('never');
  const [alcohol, setAlcohol] = useState<'none' | 'occasional' | 'frequent'>('none');
  const [exercise, setExercise] = useState<'none' | '1-2x' | '3-5x'>('none');
  const [diet, setDiet] = useState<'normal' | 'low-salt' | 'diet'>('normal');

  const route = useRoute<any>();
  const isEdit = !!route.params?.editMode;
  const [fetching, setFetching] = useState(isEdit);

  React.useEffect(() => {
    if (isEdit) {
      healthProfileService.get().then(data => {
        if (data) {
          setBirthYear(data.birth_year ? String(data.birth_year) : '');
          setGender((data.gender as any) || '');
          setHeight(data.height_cm ? String(data.height_cm) : '');
          setWeight(data.weight_kg ? String(data.weight_kg) : '');
          setCardiovascular(data.cardiovascular || []);
          setDiabetes((data.diabetes as any) || 'none');
          setRespiratory(data.respiratory || []);
          setKidneyLiver(!!data.kidney_liver);
          setAnxietyDepression(!!data.anxiety_depression);
          setMedications(data.current_medications || '');
          setFamilyHistory(data.family_history || []);
          setSmoking((data.smoking as any) || 'never');
          setAlcohol((data.alcohol as any) || 'none');
          setExercise((data.exercise as any) || 'none');
          setDiet((data.diet as any) || 'normal');
        }
      }).catch(err => {
        // failed to load, probably first time
        console.error('Lỗi lấy profile:', err);
      }).finally(() => {
        setFetching(false);
      });
    }
  }, [isEdit]);

  const toggleList = (list: string[], setList: (v: string[]) => void, val: string) => {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);
  };

  const animateStep = (next: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {toValue: 0, duration: 150, useNativeDriver: true}),
      Animated.timing(fadeAnim, {toValue: 1, duration: 200, useNativeDriver: true}),
    ]).start();
    setStep(next);
  };

  const handleNext = () => {
    if (step === 0 && !birthYear) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập năm sinh.');
      return;
    }
    if (step < TOTAL_STEPS - 1) animateStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => { if (step > 0) animateStep(step - 1); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await healthProfileService.upsert({
        birth_year: birthYear ? parseInt(birthYear) : null,
        gender: gender || null,
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        cardiovascular,
        diabetes,
        respiratory,
        kidney_liver: kidneyLiver,
        anxiety_depression: anxietyDepression,
        current_medications: medications || null,
        family_history: familyHistory,
        smoking,
        alcohol,
        exercise,
        diet,
      });
      if (isEdit) navigation.goBack();
      else navigation.replace('Main');
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const stepTitles  = ['Thông tin cơ bản', 'Tiền sử bản thân', 'Tiền sử gia đình', 'Lối sống'];
  const stepIcons   = ['person-outline', 'medical-services', 'people-outline', 'self-improvement'];
  const stepColors  = [C.teal, C.red, C.blue, C.purple];
  const color = stepColors[step];

  const inputStyle = [s.input, {
    borderColor: color + '50',
    color: C.text,
    backgroundColor: C.surface,
  }];

  return (
    <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle={C.bg === '#F0F4F8' ? 'dark-content' : 'light-content'} />
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={s.header}>
          {step > 0 
            ? <TouchableOpacity style={[s.backBtn, {borderColor: C.border, backgroundColor: C.surface}]} onPress={handleBack}>
                <MaterialIcons name="arrow-back-ios" size={18} color={C.textSub} />
              </TouchableOpacity>
            : <View style={{width: 40}} />
          }
          <View style={{flex: 1}}>
            <Text style={[s.headerTitle, {color: C.text}]}>{isEdit ? 'Chỉnh sửa hồ sơ' : 'Hồ sơ sức khoẻ'}</Text>
            <Text style={[s.headerSub, {color: C.textSub}]}>Bước {step + 1} / {TOTAL_STEPS}</Text>
          </View>
          {isEdit ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.skipBtn}>
              <Text style={[s.skipTxt, {color: C.textSub}]}>Hủy</Text>
            </TouchableOpacity>
          ) : <View style={{width: 40}} />}
        </View>

        {fetching ? (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <ActivityIndicator size="large" color={C.teal} />
          </View>
        ) : (
          <>
            <StepIndicator current={step} C={C} />

        {/* Step hero */}
        <Animated.View style={[s.stepHero, {opacity: fadeAnim, borderColor: color + '30', backgroundColor: color + '12'}]}>
          <MaterialIcons name={stepIcons[step] as any} size={28} color={color} />
          <Text style={[s.stepTitle, {color}]}>{stepTitles[step]}</Text>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled">

          <Animated.View style={{opacity: fadeAnim, gap: 16}}>

            {/* ── STEP 1: Cơ bản ── */}
            {step === 0 && (
              <>
                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Năm sinh *</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="VD: 1990"
                    placeholderTextColor={C.textDim}
                    keyboardType="numeric"
                    maxLength={4}
                    value={birthYear}
                    onChangeText={setBirthYear}
                  />
                </Card>

                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Giới tính</Text>
                  {([['male', 'Nam'], ['female', 'Nữ'], ['other', 'Khác']] as [string, string][]).map(([val, lbl]) => (
                    <RadioRow key={val} label={lbl} selected={gender === val} onSelect={() => setGender(val as any)} color={color} C={C} />
                  ))}
                </Card>

                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Chiều cao (cm)</Text>
                  <TextInput style={inputStyle} placeholder="VD: 170" placeholderTextColor={C.textDim} keyboardType="decimal-pad" value={height} onChangeText={setHeight} />
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Cân nặng (kg)</Text>
                  <TextInput style={inputStyle} placeholder="VD: 65" placeholderTextColor={C.textDim} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
                  {height && weight && (
                    <Text style={[s.bmiHint, {color}]}>
                      BMI ≈ {(parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)}
                    </Text>
                  )}
                </Card>
              </>
            )}

            {/* ── STEP 2: Tiền sử bản thân ── */}
            {step === 1 && (
              <>
                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Bệnh tim mạch</Text>
                  {[['hypertension','Tăng huyết áp'],['arrhythmia','Rối loạn nhịp tim'],['congenital','Tim bẩm sinh']].map(([val, lbl]) => (
                    <CheckRow key={val} label={lbl} checked={cardiovascular.includes(val)} onToggle={() => toggleList(cardiovascular, setCardiovascular, val)} color={color} C={C} />
                  ))}
                </Card>

                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Tiểu đường</Text>
                  {([['none','Không có'],['type1','Type 1'],['type2','Type 2']] as [string,string][]).map(([val, lbl]) => (
                    <RadioRow key={val} label={lbl} selected={diabetes === val} onSelect={() => setDiabetes(val as any)} color={color} C={C} />
                  ))}
                </Card>

                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Bệnh hô hấp</Text>
                  {[['asthma','Hen suyễn'],['copd','COPD / Phổi tắc nghẽn']].map(([val, lbl]) => (
                    <CheckRow key={val} label={lbl} checked={respiratory.includes(val)} onToggle={() => toggleList(respiratory, setRespiratory, val)} color={color} C={C} />
                  ))}
                </Card>

                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Khác</Text>
                  <CheckRow label="Bệnh thận / gan" checked={kidneyLiver} onToggle={() => setKidneyLiver(!kidneyLiver)} color={color} C={C} />
                  <CheckRow label="Rối loạn lo âu / trầm cảm" checked={anxietyDepression} onToggle={() => setAnxietyDepression(!anxietyDepression)} color={color} C={C} />
                </Card>

                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Thuốc đang dùng (nếu có)</Text>
                  <TextInput
                    style={[s.inputMulti, {borderColor: color + '40', color: C.text, backgroundColor: C.surface}]}
                    placeholder="VD: Amlodipine 5mg, Metformin 500mg..."
                    placeholderTextColor={C.textDim}
                    multiline
                    numberOfLines={3}
                    value={medications}
                    onChangeText={setMedications}
                  />
                </Card>
              </>
            )}

            {/* ── STEP 3: Tiền sử gia đình ── */}
            {step === 2 && (
              <Card color={color} C={C}>
                <Text style={[s.fieldLabel, {color: C.textSub}]}>Cha/mẹ/anh chị em có tiền sử</Text>
                {[
                  ['heart_disease','Bệnh tim / Nhồi máu cơ tim'],
                  ['stroke','Đột quỵ'],
                  ['diabetes','Tiểu đường'],
                  ['hypertension','Tăng huyết áp'],
                  ['cancer','Ung thư'],
                ].map(([val, lbl]) => (
                  <CheckRow key={val} label={lbl} checked={familyHistory.includes(val)} onToggle={() => toggleList(familyHistory, setFamilyHistory, val)} color={color} C={C} />
                ))}
                <Text style={[s.noHistoryHint, {color: C.textDim}]}>
                  Không tick = không có hoặc không biết
                </Text>
              </Card>
            )}

            {/* ── STEP 4: Lối sống ── */}
            {step === 3 && (
              <>
                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Hút thuốc lá</Text>
                  {([['never','Chưa bao giờ'],['former','Đã bỏ'],['current','Đang hút']] as [string,string][]).map(([val, lbl]) => (
                    <RadioRow key={val} label={lbl} selected={smoking === val} onSelect={() => setSmoking(val as any)} color={color} C={C} />
                  ))}
                </Card>

                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Rượu bia</Text>
                  {([['none','Không uống'],['occasional','Thỉnh thoảng'],['frequent','Thường xuyên']] as [string,string][]).map(([val, lbl]) => (
                    <RadioRow key={val} label={lbl} selected={alcohol === val} onSelect={() => setAlcohol(val as any)} color={color} C={C} />
                  ))}
                </Card>

                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Tập thể dục</Text>
                  {([['none','Ít vận động'],['1-2x','1–2 lần/tuần'],['3-5x','3–5 lần/tuần']] as [string,string][]).map(([val, lbl]) => (
                    <RadioRow key={val} label={lbl} selected={exercise === val} onSelect={() => setExercise(val as any)} color={color} C={C} />
                  ))}
                </Card>

                <Card color={color} C={C}>
                  <Text style={[s.fieldLabel, {color: C.textSub}]}>Chế độ ăn</Text>
                  {([['normal','Bình thường'],['low-salt','Ít muối / kiêng mặn'],['diet','Ăn kiêng đặc biệt']] as [string,string][]).map(([val, lbl]) => (
                    <RadioRow key={val} label={lbl} selected={diet === val} onSelect={() => setDiet(val as any)} color={color} C={C} />
                  ))}
                </Card>

                {/* Privacy note */}
                <View style={[s.privacyNote, {backgroundColor: C.tealDim, borderColor: C.tealBorder}]}>
                  <MaterialIcons name="lock-outline" size={14} color={C.teal} />
                  <Text style={[s.privacyTxt, {color: C.teal}]}>
                    Thông tin được mã hoá và chỉ dùng để cá nhân hoá phân tích AI. Không chia sẻ bên thứ ba.
                  </Text>
                </View>
              </>
            )}

          </Animated.View>
        </ScrollView>

        {/* Bottom action */}
        <View style={[s.footer, {backgroundColor: C.bg, borderTopColor: C.border}]}>
          <TouchableOpacity
            style={[s.nextBtn, {backgroundColor: color}]}
            onPress={handleNext}
            disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={s.nextBtnTxt}>{step < TOTAL_STEPS - 1 ? 'Tiếp theo' : 'Lưu hồ sơ'}</Text>
                  <MaterialIcons name={step < TOTAL_STEPS - 1 ? 'arrow-forward' : 'check'} size={20} color="#fff" />
                </>
            }
          </TouchableOpacity>
        </View>
        </>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4},
  backBtn: {width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  headerTitle: {fontSize: 18, fontWeight: '900'},
  headerSub: {fontSize: 12, marginTop: 1},
  skipBtn: {paddingHorizontal: 8, paddingVertical: 6},
  skipTxt: {fontSize: 13, fontWeight: '500'},
  stepHero: {flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12},
  stepTitle: {fontSize: 16, fontWeight: '800'},
  scroll: {paddingHorizontal: 16, paddingBottom: 24, gap: 0},
  fieldLabel: {fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 4},
  input: {borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 4},
  inputMulti: {borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top'},
  bmiHint: {fontSize: 12, fontWeight: '700', marginTop: 4},
  noHistoryHint: {fontSize: 11, marginTop: 10, fontStyle: 'italic'},
  privacyNote: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8},
  privacyTxt: {flex: 1, fontSize: 11, lineHeight: 17},
  footer: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1},
  nextBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 17},
  nextBtnTxt: {color: '#fff', fontSize: 17, fontWeight: '900'},
});

export default ProfileSetupScreen;
