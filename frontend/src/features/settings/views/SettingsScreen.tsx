import React from 'react';
import {StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {useTheme} from '../../../core/theme/ThemeContext';

const SettingsScreen = () => {
  const {theme, isDark, toggleTheme} = useTheme();
  const {language, setLanguage} = useLanguage();

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={[styles.title, {color: theme.colors.text}]}>Cài đặt</Text>

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
          <Text style={[styles.rowLabel, {color: theme.colors.text}]}>
            {isDark ? 'Dark mode' : 'Light mode'}
          </Text>
          <Switch value={isDark} onValueChange={toggleTheme} />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
          Ngôn ngữ
        </Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => setLanguage('vi')}>
          <Text style={styles.flag}>VN</Text>
          <Text style={[styles.rowLabel, {color: theme.colors.text}]}>
            Tiếng Việt
          </Text>
          {language === 'vi' ? (
            <MaterialIcons name="check" size={20} color={theme.colors.primary} />
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          onPress={() => setLanguage('en')}>
          <Text style={styles.flag}>EN</Text>
          <Text style={[styles.rowLabel, {color: theme.colors.text}]}>
            English
          </Text>
          {language === 'en' ? (
            <MaterialIcons name="check" size={20} color={theme.colors.primary} />
          ) : null}
        </TouchableOpacity>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, {color: theme.colors.text}]}>
          Ghi chú
        </Text>
        <Text style={[styles.body, {color: theme.colors.textSecondary}]}>
          Màn Settings hiện chỉ giữ các cài đặt frontend. Các phần tài khoản,
          đăng nhập và bảo mật đã được bỏ khỏi skeleton mới.
        </Text>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 96,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  flag: {
    width: 36,
    fontSize: 13,
    fontWeight: '900',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
});

export default SettingsScreen;
