import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import {useTheme} from '../../../core/theme/ThemeContext';

const MEASUREMENTS = [
  {
    key: 'face-rppg',
    title: 'Face rPPG',
    subtitle: 'Đo nhịp tim bằng camera trước',
    detail: 'Frontend flow: camera, timer, quality state, result screen.',
    icon: 'face-retouching-natural',
    enabled: true,
    route: 'FaceRppg',
  },
  {
    key: 'blood-pressure',
    title: 'Blood Pressure',
    subtitle: 'Giao diện đo huyết áp',
    detail: 'Frontend flow: hướng dẫn, timer, result screen.',
    icon: 'favorite-border',
    enabled: true,
    route: 'BloodPressure',
  },
  {
    key: 'heartbeat',
    title: 'Heart Sound',
    subtitle: 'Giao diện ghi âm âm thanh tim',
    detail: 'Frontend flow: microphone UI, waveform, result screen.',
    icon: 'graphic-eq',
    enabled: true,
    route: 'Heartbeat',
  },
  {
    key: 'stress',
    title: 'Stress',
    subtitle: 'Giao diện đo mức căng thẳng',
    detail: 'Frontend flow: hướng dẫn hít thở, timer, result screen.',
    icon: 'psychology',
    enabled: true,
    route: 'Stress',
  },
] as const;

const MeasurementListScreen = ({navigation}: any) => {
  const {theme} = useTheme();

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, {color: theme.colors.primary}]}>
          Measurement
        </Text>
        <Text style={[styles.title, {color: theme.colors.text}]}>
          Chọn loại đo
        </Text>
        <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
          Đây là danh sách các luồng đo của frontend. Hiện tại Face rPPG đã có
          flow giao diện hoàn chỉnh để anh phát triển tiếp.
        </Text>
      </View>

      <View style={styles.list}>
        {MEASUREMENTS.map(item => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={item.enabled ? 0.78 : 1}
            disabled={!item.enabled}
            onPress={() => item.enabled && navigation.navigate(item.route)}>
            <Card
              style={[
                styles.card,
                !item.enabled && {
                  opacity: 0.58,
                },
              ]}>
              <View
                style={[
                  styles.iconBox,
                  {backgroundColor: theme.colors.primary + '14'},
                ]}>
                <MaterialIcons
                  name={item.icon}
                  size={25}
                  color={theme.colors.primary}
                />
              </View>

              <View style={styles.cardCopy}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
                    {item.title}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: item.enabled
                          ? theme.colors.success + '18'
                          : theme.colors.cardLight,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color: item.enabled
                            ? theme.colors.success
                            : theme.colors.textMuted,
                        },
                      ]}>
                      {item.enabled ? 'Ready' : 'Soon'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardSubtitle, {color: theme.colors.text}]}>
                  {item.subtitle}
                </Text>
                <Text style={[styles.cardDetail, {color: theme.colors.textSecondary}]}>
                  {item.detail}
                </Text>
              </View>

              <MaterialIcons
                name={item.enabled ? 'chevron-right' : 'lock-outline'}
                size={22}
                color={theme.colors.textMuted}
              />
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={styles.noteCard}>
        <Text style={[styles.noteTitle, {color: theme.colors.text}]}>
          Ghi chú xây dựng
        </Text>
        <Text style={[styles.noteText, {color: theme.colors.textSecondary}]}>
          Màn này chỉ chịu trách nhiệm chọn luồng đo. Logic camera, timer và
          kết quả được tách sang màn riêng để code dễ bảo trì.
        </Text>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingBottom: 100,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardDetail: {
    fontSize: 12,
    lineHeight: 17,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  noteCard: {
    gap: 6,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

export default MeasurementListScreen;
