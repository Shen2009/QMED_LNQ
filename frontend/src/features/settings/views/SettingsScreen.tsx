import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
} from 'react-native';
import {useTheme} from '../../../core/theme/ThemeContext';
import {useColors} from '../../../core/theme/useColors';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {MaterialIcons} from '@expo/vector-icons';

const SettingsScreen = () => {
  const {isDark, toggleTheme} = useTheme();
  const C = useColors();
  const {language, setLanguage, strings} = useLanguage();

  return (
    <SafeAreaView style={[styles.root, {backgroundColor: C.bg}]}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: C.text}]}>
            {strings.settingsTitle || 'Cài đặt'}
          </Text>
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionLabel, {color: C.textSub}]}>{strings.settingsSectionAppearance}</Text>
        <View style={[styles.section, {backgroundColor: C.surface, borderColor: C.border}]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, {backgroundColor: C.textSub + '22'}]}>
              <MaterialIcons name={isDark ? 'dark-mode' : 'light-mode'} size={18} color={C.textSub} />
            </View>
            <Text style={[styles.settingLabel, {color: C.text}]}>
              {isDark ? (strings.lightMode || 'Chế độ sáng') : (strings.darkMode || 'Chế độ tối')}
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{false: C.border, true: C.teal + '88'}}
              thumbColor={isDark ? C.teal : C.textSub}
            />
          </View>
        </View>

        {/* Language */}
        <Text style={[styles.sectionLabel, {color: C.textSub}]}>
          {strings.language || 'Ngôn ngữ'}
        </Text>
        <View style={[styles.section, {backgroundColor: C.surface, borderColor: C.border}]}>
          <TouchableOpacity
            style={[
              styles.langRow,
              {borderBottomColor: C.border, borderBottomWidth: 1},
              language === 'vi' && {borderLeftWidth: 3, borderLeftColor: C.teal, paddingLeft: 11},
            ]}
            onPress={() => setLanguage('vi')}>
            <View style={styles.langLeft}>
              <Text style={styles.flag}>🇻🇳</Text>
              <Text style={[styles.settingLabel, {color: language === 'vi' ? C.text : C.textSub}]}>
                {strings.vietnamese || 'Tiếng Việt'}
              </Text>
              {language === 'vi' && (
                <MaterialIcons name="check" size={18} color={C.teal} />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.langRow,
              language === 'en' && {borderLeftWidth: 3, borderLeftColor: C.teal, paddingLeft: 11},
            ]}
            onPress={() => setLanguage('en')}>
            <View style={styles.langLeft}>
              <Text style={styles.flag}>🇬🇧</Text>
              <Text style={[styles.settingLabel, {color: language === 'en' ? C.text : C.textSub}]}>
                {strings.english || 'English'}
              </Text>
              {language === 'en' && (
                <MaterialIcons name="check" size={18} color={C.teal} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <Text style={[styles.sectionLabel, {color: C.textSub}]}>{strings.settingsSectionApp}</Text>
        <View style={[styles.section, {backgroundColor: C.surface, borderColor: C.border}]}>
          {[
            {label: strings.settingsVersion, right: '1.0.0', icon: 'info-outline'},
            {label: strings.settingsTerms, icon: 'description'},
            {label: strings.settingsPrivacy, icon: 'privacy-tip'},
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.settingRow,
                i < arr.length - 1 && {borderBottomColor: C.border, borderBottomWidth: 1},
              ]}>
              <View style={[styles.settingIcon, {backgroundColor: C.textSub + '22'}]}>
                <MaterialIcons name={item.icon as any} size={18} color={C.textSub} />
              </View>
              <Text style={[styles.settingLabel, {color: C.text}]}>{item.label}</Text>
              {item.right ? (
                <Text style={[styles.rightText, {color: C.textSub}]}>{item.right}</Text>
              ) : (
                <MaterialIcons name="chevron-right" size={20} color={C.textSub} />
              )}
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  container: {flex: 1},
  content: {paddingBottom: 100},
  header: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8},
  title: {fontSize: 26, fontWeight: '800'},
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  section: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {flex: 1, fontSize: 15},
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  langLeft: {flexDirection: 'row', alignItems: 'center', gap: 10},
  flag: {fontSize: 22},
  rightText: {fontSize: 14},
});

export default SettingsScreen;
