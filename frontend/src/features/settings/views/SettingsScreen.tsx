import React, {useCallback, useState} from 'react';
import {Alert, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {MaterialIcons} from '@expo/vector-icons';

import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {measurementService} from '../../../core/api/measurementService';
import {localHistory} from '../../../core/storage/localHistory';
import {healthProfileStorage, HealthProfile} from '../../../core/storage/healthProfile';
import {useTheme} from '../../../core/theme/ThemeContext';

const SettingsScreen = ({navigation}: any) => {
  const {theme, isDark, toggleTheme} = useTheme();
  const {language, setLanguage} = useLanguage();
  const [historyCount, setHistoryCount] = useState(0);
  const [profile, setProfile] = useState<HealthProfile | null>(null);

  const loadLocalData = useCallback(async () => {
    const [history, nextProfile] = await Promise.all([
      localHistory.list(),
      healthProfileStorage.get(),
    ]);
    setHistoryCount(history.length);
    setProfile(nextProfile);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLocalData();
    }, [loadLocalData]),
  );

  const clearHistory = () => {
    Alert.alert('Xoá lịch sử đo', 'Toàn bộ kết quả đo trong AsyncStorage sẽ bị xoá.', [
      {text: 'Huỷ', style: 'cancel'},
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          await localHistory.clear();
          try {
            await measurementService.clearRemoteHistory();
          } catch {
            // Keep settings usable even when the backend is not running.
          }
          await loadLocalData();
        },
      },
    ]);
  };

  const clearProfile = () => {
    Alert.alert('Xoá hồ sơ sức khỏe', 'Hồ sơ sức khỏe local sẽ được đưa về trạng thái trống.', [
      {text: 'Huỷ', style: 'cancel'},
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          await healthProfileStorage.clear();
          await loadLocalData();
        },
      },
    ]);
  };

  const profileReady = Boolean(
    profile?.fullName || profile?.age || profile?.heightCm || profile?.weightKg,
  );

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, {color: theme.colors.primary}]}>
            App Settings
          </Text>
          <Text style={[styles.title, {color: theme.colors.text}]}>Cài đặt</Text>
        </View>
        <View style={[styles.headerIcon, {backgroundColor: theme.colors.cardLight}]}>
          <MaterialIcons name="settings" size={26} color={theme.colors.primary} />
        </View>
      </View>

      <Card style={styles.profileCard}>
        <View style={[styles.profileIcon, {backgroundColor: theme.colors.primary + '14'}]}>
          <MaterialIcons name="health-and-safety" size={30} color={theme.colors.primary} />
        </View>
        <View style={styles.profileCopy}>
          <Text style={[styles.profileTitle, {color: theme.colors.text}]}>
            {profile?.fullName || 'Hồ sơ sức khỏe'}
          </Text>
          <Text style={[styles.profileText, {color: theme.colors.textSecondary}]}>
            {profileReady
              ? `Tuổi ${profile?.age || '--'} • ${profile?.heightCm || '--'}cm • ${profile?.weightKg || '--'}kg`
              : 'Lưu thông tin cơ bản để app cá nhân hoá kết quả demo.'}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate('HealthProfile')}
          style={[styles.openButton, {backgroundColor: theme.colors.primary}]}>
          <MaterialIcons name="chevron-right" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
          Giao diện
        </Text>
        <View style={styles.row}>
          <View style={[styles.iconBox, {backgroundColor: theme.colors.cardLight}]}>
            <MaterialIcons
              name={isDark ? 'dark-mode' : 'light-mode'}
              size={20}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowLabel, {color: theme.colors.text}]}>
              {isDark ? 'Dark mode' : 'Light mode'}
            </Text>
            <Text style={[styles.rowDescription, {color: theme.colors.textSecondary}]}>
              Đổi giao diện sáng/tối cho toàn bộ app.
            </Text>
          </View>
          <Switch value={isDark} onValueChange={toggleTheme} />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
          Ngôn ngữ
        </Text>
        <View style={styles.languageRow}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.languageChip,
              {
                backgroundColor: language === 'vi' ? theme.colors.primary : theme.colors.cardLight,
                borderColor: language === 'vi' ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setLanguage('vi')}>
            <Text style={[styles.languageText, {color: language === 'vi' ? '#FFFFFF' : theme.colors.text}]}>
              Tiếng Việt
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.languageChip,
              {
                backgroundColor: language === 'en' ? theme.colors.primary : theme.colors.cardLight,
                borderColor: language === 'en' ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setLanguage('en')}>
            <Text style={[styles.languageText, {color: language === 'en' ? '#FFFFFF' : theme.colors.text}]}>
              English
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
          Dữ liệu local
        </Text>
        <View style={styles.dataGrid}>
          <View style={[styles.dataBox, {backgroundColor: theme.colors.cardLight}]}>
            <Text style={[styles.dataNumber, {color: theme.colors.text}]}>
              {historyCount}
            </Text>
            <Text style={[styles.dataLabel, {color: theme.colors.textSecondary}]}>
              kết quả đo
            </Text>
          </View>
          <View style={[styles.dataBox, {backgroundColor: theme.colors.cardLight}]}>
            <Text style={[styles.dataNumber, {color: theme.colors.text}]}>
              {profileReady ? 'Có' : 'Chưa'}
            </Text>
            <Text style={[styles.dataLabel, {color: theme.colors.textSecondary}]}>
              hồ sơ
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Button
            title="Xoá lịch sử đo"
            icon="history"
            variant="outline"
            onPress={clearHistory}
            disabled={!historyCount}
          />
          <Button
            title="Xoá hồ sơ"
            icon="delete-outline"
            variant="outline"
            onPress={clearProfile}
            disabled={!profileReady}
          />
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
          Ghi chú
        </Text>
        <Text style={[styles.body, {color: theme.colors.textSecondary}]}>
          Settings hiện chỉ quản lý dữ liệu frontend local. Phần đăng nhập tài khoản
          đã được bỏ khỏi skeleton mới theo yêu cầu.
        </Text>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {gap: 16, paddingBottom: 100},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  eyebrow: {fontSize: 13, fontWeight: '800', marginBottom: 4},
  title: {fontSize: 30, fontWeight: '900'},
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {flexDirection: 'row', alignItems: 'center', gap: 13},
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: {flex: 1, minWidth: 0},
  profileTitle: {fontSize: 18, fontWeight: '900'},
  profileText: {fontSize: 13, lineHeight: 19, marginTop: 3},
  openButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {gap: 12},
  sectionTitle: {fontSize: 17, fontWeight: '900'},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48},
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {flex: 1, minWidth: 0},
  rowLabel: {fontSize: 15, fontWeight: '800'},
  rowDescription: {fontSize: 12, lineHeight: 17, marginTop: 2},
  languageRow: {flexDirection: 'row', gap: 10},
  languageChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageText: {fontSize: 14, fontWeight: '900'},
  dataGrid: {flexDirection: 'row', gap: 10},
  dataBox: {flex: 1, borderRadius: 12, padding: 12},
  dataNumber: {fontSize: 22, fontWeight: '900'},
  dataLabel: {fontSize: 12, fontWeight: '700', marginTop: 4},
  actions: {gap: 10},
  body: {fontSize: 14, lineHeight: 21},
});

export default SettingsScreen;
