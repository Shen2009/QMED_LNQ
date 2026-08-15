import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {MaterialIcons} from '@expo/vector-icons';
import {useColors} from '../../../core/theme/useColors';
import {useLanguage} from '../../../core/i18n/LanguageContext';

type ItemKey = 'reminder' | 'result' | 'update';

const ITEMS_STATIC: Array<{key: ItemKey; icon: string; colorKey: string; defaultVal: boolean}> = [
  {key: 'reminder', icon: 'alarm',         colorKey: 'teal',  defaultVal: true},
  {key: 'result',   icon: 'assessment',    colorKey: 'teal',  defaultVal: true},
  {key: 'update',   icon: 'system-update', colorKey: 'amber', defaultVal: false},
];

export default function NotificationsScreen() {
  const nav = useNavigation();
  const C = useColors();
  const {strings} = useLanguage();

  const [values, setValues] = useState<Record<string, boolean>>(
    Object.fromEntries(ITEMS_STATIC.map(i => [i.key, i.defaultVal])),
  );
  const toggle = (key: string) => setValues(prev => ({...prev, [key]: !prev[key]}));

  // Labels resolved at render time from i18n strings
  const labelMap: Record<ItemKey, {label: string; sub: string}> = {
    reminder: {label: strings.notifReminder,  sub: strings.notifReminderSub},
    result:   {label: strings.notifResult,    sub: strings.notifResultSub},
    update:   {label: strings.notifUpdate,    sub: strings.notifUpdateSub},
  };

  const items = ITEMS_STATIC.map(i => ({
    ...i,
    ...labelMap[i.key],
    color: C[i.colorKey as keyof typeof C] as string,
  }));

  return (
    <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
      {/* Header */}
      <View style={[s.header, {borderBottomColor: C.border}]}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={[s.back, {backgroundColor: C.surface, borderColor: C.border}]}>
          <MaterialIcons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[s.title, {color: C.text}]}>{strings.notificationsTitle}</Text>
        <View style={{width: 38}} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.sectionLabel, {color: C.textSub}]}>{strings.notifSectionLabel}</Text>

        <View style={[s.card, {backgroundColor: C.surface, borderColor: C.border}]}>
          {items.map((item, idx) => (
            <React.Fragment key={item.key}>
              <View style={s.row}>
                <View style={[s.iconWrap, {backgroundColor: item.color + '20'}]}>
                  <MaterialIcons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={s.texts}>
                  <Text style={[s.label, {color: C.text}]}>{item.label}</Text>
                  <Text style={[s.sub, {color: C.textSub}]}>{item.sub}</Text>
                </View>
                <Switch
                  value={values[item.key]}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{false: C.border, true: C.teal + '88'}}
                  thumbColor={values[item.key] ? C.teal : C.textSub}
                />
              </View>
              {idx < items.length - 1 && (
                <View style={[s.divider, {backgroundColor: C.border}]} />
              )}
            </React.Fragment>
          ))}
        </View>

        <Text style={[s.hint, {color: C.textSub}]}>{strings.notifHint}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {fontSize: 17, fontWeight: '700'},
  content: {padding: 20, paddingBottom: 60},
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {borderRadius: 16, borderWidth: 1, overflow: 'hidden'},
  row: {flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12},
  iconWrap: {width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  texts: {flex: 1},
  label: {fontSize: 15, fontWeight: '600'},
  sub: {fontSize: 12, marginTop: 2},
  divider: {height: 1, marginHorizontal: 16},
  hint: {fontSize: 12, marginTop: 16, textAlign: 'center', lineHeight: 18},
});
