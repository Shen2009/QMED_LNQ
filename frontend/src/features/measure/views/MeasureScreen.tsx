import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import Button from '../../../shared/components/Button';
import {useTheme} from '../../../core/theme/ThemeContext';

const MEASURE_SECTIONS = [
  {
    icon: 'videocam',
    title: 'Camera measurement',
    description: 'Khu vực này sẽ dùng cho các luồng đo bằng camera trong tương lai.',
  },
  {
    icon: 'mic',
    title: 'Audio measurement',
    description: 'Khu vực này sẽ dùng cho các luồng ghi âm hoặc đo bằng micro.',
  },
  {
    icon: 'insights',
    title: 'Result preview',
    description: 'Sau khi đo xong, kết quả sẽ được chuyển sang màn kết quả riêng.',
  },
] as const;

const MeasureScreen = () => {
  const {theme} = useTheme();

  return (
    <Screen scroll contentStyle={styles.content}>
      <View>
        <Text style={[styles.eyebrow, {color: theme.colors.primary}]}>
          Main Feature
        </Text>
        <Text style={[styles.title, {color: theme.colors.text}]}>
          Đo sức khỏe
        </Text>
        <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
          Đây là trung tâm chọn loại đo. Hiện tại màn chỉ giữ khung giao diện để
          anh xây lại frontend từ đầu.
        </Text>
      </View>

      {MEASURE_SECTIONS.map(item => (
        <Card key={item.title} style={styles.measureCard}>
          <View style={[styles.iconBox, {backgroundColor: theme.colors.cardLight}]}>
            <MaterialIcons name={item.icon} size={23} color={theme.colors.primary} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
              {item.title}
            </Text>
            <Text style={[styles.body, {color: theme.colors.textSecondary}]}>
              {item.description}
            </Text>
          </View>
        </Card>
      ))}

      <Button
        title="Chưa kết nối chức năng đo"
        disabled
        variant="secondary"
        onPress={() => {}}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 96,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  measureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
});

export default MeasureScreen;
