import React from 'react';
import {StyleSheet, Text} from 'react-native';

import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import {useTheme} from '../../../core/theme/ThemeContext';

const HistoryScreen = () => {
  const {theme} = useTheme();

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={[styles.title, {color: theme.colors.text}]}>Lịch sử</Text>

      <Card>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
          Nội dung phần History
        </Text>
        <Text style={[styles.body, {color: theme.colors.textSecondary}]}>
          Màn này sẽ lưu và hiển thị các lần đo của người dùng. Hiện tại chưa
          có dữ liệu thật, chỉ giữ bố cục để anh xây tiếp.
        </Text>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
          Gợi ý xây dựng
        </Text>
        <Text style={[styles.body, {color: theme.colors.textSecondary}]}>
          Bước đầu nên lưu lịch sử bằng AsyncStorage trên máy. Khi app ổn định
          hơn, anh có thể thêm đồng bộ cloud sau.
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
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
});

export default HistoryScreen;
