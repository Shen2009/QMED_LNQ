import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {MaterialIcons} from '@expo/vector-icons';
import {useColors} from '../../../core/theme/useColors';
import {useLanguage} from '../../../core/i18n/LanguageContext';

export default function HelpScreen() {
  const nav = useNavigation();
  const C = useColors();
  const {strings} = useLanguage();

  return (
    <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>
      <View style={[s.header, {borderBottomColor: C.border}]}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={[s.back, {backgroundColor: C.surface, borderColor: C.border}]}>
          <MaterialIcons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[s.title, {color: C.text}]}>{strings.profileHelp}</Text>
        <View style={{width: 38}} />
      </View>
      <View style={s.center}>
        <MaterialIcons name="help-outline" size={64} color={C.blue} />
        <Text style={[s.comingSoon, {color: C.text}]}>{strings.comingSoon}</Text>
        <Text style={[s.sub, {color: C.textSub}]}>{strings.profileHelpSub}</Text>
      </View>
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
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32},
  comingSoon: {fontSize: 18, fontWeight: '700'},
  sub: {fontSize: 14, textAlign: 'center', lineHeight: 22},
});
