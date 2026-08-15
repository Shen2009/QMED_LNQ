import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import Input from '../../../shared/components/Input';
import Screen from '../../../shared/components/Screen';
import {useTheme} from '../../../core/theme/ThemeContext';
import {
  ActivityLevel,
  Gender,
  healthProfileStorage,
  HealthProfile,
  isHealthProfileComplete,
} from '../../../core/storage/healthProfile';

const genderOptions: Array<{label: string; value: Gender; icon: keyof typeof MaterialIcons.glyphMap}> = [
  {label: 'Nam', value: 'male', icon: 'male'},
  {label: 'Nữ', value: 'female', icon: 'female'},
  {label: 'Khác', value: 'other', icon: 'person'},
];

const activityOptions: Array<{label: string; value: ActivityLevel; description: string}> = [
  {label: 'Ít', value: 'low', description: 'Ít vận động'},
  {label: 'Vừa', value: 'medium', description: 'Đi lại, học tập bình thường'},
  {label: 'Cao', value: 'high', description: 'Tập luyện thường xuyên'},
];

const SETUP_TRANSITION_MS = 450;

interface HealthProfileScreenProps {
  navigation: any;
  requiredSetup?: boolean;
  onCompleted?: () => void;
}

const HealthProfileScreen = ({
  navigation,
  requiredSetup = false,
  onCompleted,
}: HealthProfileScreenProps) => {
  const {theme} = useTheme();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [completingSetup, setCompletingSetup] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const {width} = useWindowDimensions();
  const isWide = width >= 820;

  useEffect(() => {
    healthProfileStorage.get().then(setProfile);
  }, []);

  useEffect(() => {
    if (!completingSetup) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 680,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 680,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [completingSetup, pulse]);

  const bmi = useMemo(() => {
    if (!profile) return null;
    const height = Number(profile.heightCm) / 100;
    const weight = Number(profile.weightKg);
    if (!height || !weight) return null;
    return weight / (height * height);
  }, [profile]);

  const bmiLabel = useMemo(() => {
    if (!bmi) return 'Chưa đủ dữ liệu';
    if (bmi < 18.5) return 'Hơi thấp';
    if (bmi < 23) return 'Bình thường';
    if (bmi < 25) return 'Cần theo dõi';
    return 'Cao';
  }, [bmi]);

  const profileComplete = useMemo(
    () => Boolean(profile && isHealthProfileComplete(profile)),
    [profile],
  );

  const updateProfile = <Key extends keyof HealthProfile>(
    key: Key,
    value: HealthProfile[Key],
  ) => {
    setProfile(current => (current ? {...current, [key]: value} : current));
  };

  const saveProfile = async () => {
    if (!profile) return;
    if (!isHealthProfileComplete(profile)) {
      Alert.alert(
        'Thiếu thông tin',
        'Anh cần nhập họ tên, tuổi, chiều cao và cân nặng trước khi vào app.',
      );
      return;
    }

    setSaving(true);
    await healthProfileStorage.save(profile);
    setSaving(false);
    if (requiredSetup) {
      setCompletingSetup(true);
      await new Promise(resolve => setTimeout(resolve, SETUP_TRANSITION_MS));
      onCompleted?.();
      return;
    }

    Alert.alert('Đã lưu', 'Hồ sơ sức khỏe đã được lưu cục bộ trên thiết bị.');
  };

  const resetProfile = () => {
    Alert.alert('Xoá hồ sơ', 'Anh có chắc muốn xoá hồ sơ sức khỏe local không?', [
      {text: 'Huỷ', style: 'cancel'},
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          await healthProfileStorage.clear();
          const empty = await healthProfileStorage.get();
          setProfile(empty);
        },
      },
    ]);
  };

  if (!profile) {
    return (
      <Screen contentStyle={styles.loadingContent}>
        <Text style={[styles.loadingText, {color: theme.colors.textSecondary}]}>
          Đang tải hồ sơ...
        </Text>
      </Screen>
    );
  }

  if (completingSetup) {
    return (
      <Screen contentStyle={styles.setupLoadingContent}>
        <Animated.View
          style={[
            styles.loadingLogo,
            {
              backgroundColor: theme.colors.primary + '16',
              transform: [{scale: pulse}],
            },
          ]}>
          <MaterialIcons name="monitor-heart" size={42} color={theme.colors.primary} />
        </Animated.View>
        <Text style={[styles.setupLoadingTitle, {color: theme.colors.text}]}>
          Đang chuẩn bị trang chủ
        </Text>
        <Text style={[styles.setupLoadingText, {color: theme.colors.textSecondary}]}>
          Q-Med đang cá nhân hoá trải nghiệm dựa trên hồ sơ sức khỏe của bạn.
        </Text>
        <ActivityIndicator color={theme.colors.primary} style={styles.loadingSpinner} />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      contentStyle={[styles.content, isWide && styles.desktopContent]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={isWide && styles.desktopKeyboard}>
        <View style={styles.header}>
          {!requiredSetup ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={[styles.backButton, {backgroundColor: theme.colors.cardLight}]}>
              <MaterialIcons name="arrow-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          ) : null}
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, {color: theme.colors.primary}]}>
              {requiredSetup ? 'Before You Start' : 'Health Profile'}
            </Text>
            <Text style={[styles.title, {color: theme.colors.text}]}>
              {requiredSetup ? 'Điền thông tin của bạn' : 'Hồ sơ sức khỏe'}
            </Text>
            {requiredSetup ? (
              <Text style={[styles.requiredHint, {color: theme.colors.textSecondary}]}>
                Q-Med cần thông tin cơ bản để cá nhân hoá giao diện và kết quả demo.
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.profileLayout, isWide && styles.profileLayoutWide]}>
          <View style={[styles.leftColumn, isWide && styles.leftColumnWide]}>
        <Card style={styles.summaryCard}>
          <View style={[styles.summaryIcon, {backgroundColor: theme.colors.primary + '14'}]}>
            <MaterialIcons name="badge" size={28} color={theme.colors.primary} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={[styles.summaryTitle, {color: theme.colors.text}]}>
              {profile.fullName || 'Người dùng Q-Med'}
            </Text>
            <Text style={[styles.summaryText, {color: theme.colors.textSecondary}]}>
              BMI: {bmi ? bmi.toFixed(1) : '--'} • {bmiLabel}
            </Text>
          </View>
        </Card>

        <Card style={styles.insightCard}>
          <View style={[styles.insightIcon, {backgroundColor: theme.colors.success + '14'}]}>
            <MaterialIcons name="verified" size={24} color={theme.colors.success} />
          </View>
          <Text style={[styles.insightTitle, {color: theme.colors.text}]}>
            Vì sao cần thông tin này?
          </Text>
          <Text style={[styles.insightText, {color: theme.colors.textSecondary}]}>
            Hồ sơ giúp Q-Med hiển thị BMI, cá nhân hoá nội dung demo và chuẩn bị
            cho các phân tích sức khỏe chính xác hơn khi có model thật.
          </Text>
        </Card>

        {requiredSetup && profileComplete ? (
          <Card style={[styles.readyCard, {borderColor: theme.colors.success}]}>
            <View style={styles.readyHeader}>
              <View style={[styles.readyIcon, {backgroundColor: theme.colors.success + '16'}]}>
                <MaterialIcons name="task-alt" size={22} color={theme.colors.success} />
              </View>
              <View style={styles.readyCopy}>
                <Text style={[styles.readyTitle, {color: theme.colors.text}]}>
                  Thông tin đã đủ
                </Text>
                <Text style={[styles.readyText, {color: theme.colors.textSecondary}]}>
                  Bạn có thể hoàn thành để vào trang chủ.
                </Text>
              </View>
            </View>
            <Button
              title="Hoàn thành"
              icon="check-circle"
              loading={saving}
              onPress={saveProfile}
            />
          </Card>
        ) : null}
          </View>

          <View style={[styles.formColumn, isWide && styles.formColumnWide]}>
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
            Thông tin cơ bản
          </Text>
          <Input
            label="Họ và tên"
            leftIcon="person"
            value={profile.fullName}
            onChangeText={value => updateProfile('fullName', value)}
            placeholder="Nhập tên hiển thị"
          />
          <View style={styles.inputGrid}>
            <Input
              label="Tuổi"
              leftIcon="cake"
              value={profile.age}
              onChangeText={value => updateProfile('age', value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="16"
              containerStyle={styles.gridInput}
            />
            <Input
              label="Chiều cao"
              leftIcon="height"
              value={profile.heightCm}
              onChangeText={value => updateProfile('heightCm', value.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="170"
              helperText="cm"
              containerStyle={styles.gridInput}
            />
          </View>
          <Input
            label="Cân nặng"
            leftIcon="monitor-weight"
            value={profile.weightKg}
            onChangeText={value => updateProfile('weightKg', value.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="60"
            helperText="kg"
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
            Giới tính
          </Text>
          <View style={styles.optionRow}>
            {genderOptions.map(option => {
              const active = profile.gender === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => updateProfile('gender', option.value)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.cardLight,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}>
                  <MaterialIcons
                    name={option.icon}
                    size={18}
                    color={active ? '#FFFFFF' : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      {color: active ? '#FFFFFF' : theme.colors.textSecondary},
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
            Mức vận động
          </Text>
          {activityOptions.map(option => {
            const active = profile.activityLevel === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="button"
                onPress={() => updateProfile('activityLevel', option.value)}
                style={[
                  styles.activityRow,
                  {
                    backgroundColor: active ? theme.colors.primary + '12' : theme.colors.cardLight,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}>
                <View style={styles.activityCopy}>
                  <Text style={[styles.activityTitle, {color: theme.colors.text}]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.activityText, {color: theme.colors.textSecondary}]}>
                    {option.description}
                  </Text>
                </View>
                {active ? (
                  <MaterialIcons name="check-circle" size={21} color={theme.colors.primary} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
            Ghi chú y tế
          </Text>
          <Input
            label="Tình trạng cần lưu ý"
            leftIcon="medical-information"
            value={profile.medicalNotes}
            onChangeText={value => updateProfile('medicalNotes', value)}
            placeholder="Ví dụ: dị ứng, tiền sử bệnh, thuốc đang dùng..."
            multiline
            style={styles.multilineInput}
          />
          <Input
            label="Liên hệ khẩn cấp"
            leftIcon="call"
            value={profile.emergencyContact}
            onChangeText={value => updateProfile('emergencyContact', value)}
            placeholder="Tên hoặc số điện thoại người thân"
          />
        </Card>

        <View style={styles.actions}>
          <Button
            title={requiredSetup ? 'Hoàn thành' : 'Lưu hồ sơ'}
            icon={requiredSetup ? 'check-circle' : 'save'}
            loading={saving}
            onPress={saveProfile}
          />
          {requiredSetup && !profileComplete ? (
            <Text style={[styles.completeHint, {color: theme.colors.textMuted}]}>
              Nhập đủ họ tên, tuổi, chiều cao và cân nặng để hoàn thiện.
            </Text>
          ) : null}
          {!requiredSetup ? (
            <Button
              title="Xoá hồ sơ local"
              icon="delete-outline"
              variant="outline"
              onPress={resetProfile}
            />
          ) : null}
        </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {gap: 16, paddingBottom: 100},
  desktopContent: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingTop: 26,
  },
  desktopKeyboard: {
    width: '100%',
  },
  loadingContent: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingText: {fontSize: 14, fontWeight: '700'},
  setupLoadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingLogo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  setupLoadingTitle: {fontSize: 26, fontWeight: '900', textAlign: 'center'},
  setupLoadingText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },
  loadingSpinner: {marginTop: 24},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16},
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {flex: 1, minWidth: 0},
  eyebrow: {fontSize: 13, fontWeight: '800'},
  title: {fontSize: 30, fontWeight: '900', marginTop: 3},
  requiredHint: {fontSize: 13, lineHeight: 19, marginTop: 6},
  profileLayout: {gap: 16},
  profileLayoutWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  leftColumn: {gap: 16},
  leftColumnWide: {
    width: 340,
  },
  formColumn: {gap: 0},
  formColumnWide: {flex: 1, minWidth: 0},
  summaryCard: {flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 16},
  insightCard: {gap: 8, marginBottom: 16},
  insightIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {fontSize: 16, fontWeight: '900'},
  insightText: {fontSize: 13, lineHeight: 20},
  readyCard: {gap: 12, marginBottom: 16},
  readyHeader: {flexDirection: 'row', alignItems: 'center', gap: 11},
  readyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyCopy: {flex: 1, minWidth: 0},
  readyTitle: {fontSize: 15, fontWeight: '900'},
  readyText: {fontSize: 12, lineHeight: 17, marginTop: 2},
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {flex: 1, minWidth: 0},
  summaryTitle: {fontSize: 18, fontWeight: '900'},
  summaryText: {fontSize: 13, marginTop: 4, fontWeight: '700'},
  section: {gap: 12, marginBottom: 16},
  sectionTitle: {fontSize: 17, fontWeight: '900'},
  inputGrid: {flexDirection: 'row', gap: 12},
  gridInput: {flex: 1},
  optionRow: {flexDirection: 'row', gap: 9},
  optionChip: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  optionText: {fontSize: 13, fontWeight: '800'},
  activityRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityCopy: {flex: 1, minWidth: 0},
  activityTitle: {fontSize: 15, fontWeight: '900'},
  activityText: {fontSize: 12, marginTop: 3},
  multilineInput: {minHeight: 76, textAlignVertical: 'top'},
  actions: {gap: 10},
  completeHint: {fontSize: 12, lineHeight: 17, textAlign: 'center'},
});

export default HealthProfileScreen;
