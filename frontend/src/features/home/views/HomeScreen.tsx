import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import Button from '../../../shared/components/Button';
import {useTheme} from '../../../core/theme/ThemeContext';

const HomeScreen = ({navigation}: any) => {
  const {theme} = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [fade, pulse, slide]);

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, {color: theme.colors.primary}]}>
            Q-Med Frontend
          </Text>
          <Text style={[styles.title, {color: theme.colors.text}]}>
            Trang chủ
          </Text>
        </View>
        <Animated.View
          style={[
            styles.iconBox,
            {
              backgroundColor: theme.colors.cardLight,
              transform: [{scale: pulse}],
            },
          ]}>
          <MaterialIcons name="monitor-heart" size={26} color={theme.colors.primary} />
        </Animated.View>
      </View>

      <Animated.View style={{opacity: fade, transform: [{translateY: slide}]}}>
      <Card>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
          Nội dung phần Home
        </Text>
        <Text style={[styles.body, {color: theme.colors.textSecondary}]}>
          Đây là màn tổng quan đầu tiên của app. Sau này anh có thể đặt các thẻ
          chỉ số sức khỏe, nút bắt đầu đo, trạng thái hôm nay và các hành động
          nhanh ở đây.
        </Text>
      </Card>
      </Animated.View>

      <Animated.View style={{opacity: fade, transform: [{translateY: slide}]}}>
      <Card>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
          Chức năng chính
        </Text>
        <View style={styles.list}>
          <Text style={[styles.body, {color: theme.colors.textSecondary}]}>
            1. Hiển thị lời chào và tổng quan sức khỏe.
          </Text>
          <Text style={[styles.body, {color: theme.colors.textSecondary}]}>
            2. Điều hướng nhanh sang phần đo sức khỏe.
          </Text>
          <Text style={[styles.body, {color: theme.colors.textSecondary}]}>
            3. Hiển thị kết quả gần nhất khi có dữ liệu thật.
          </Text>
        </View>
      </Card>
      </Animated.View>

      <Animated.View style={{opacity: fade}}>
      <Button
        title="Bắt đầu xây phần đo"
        icon="arrow-forward"
        iconPosition="right"
        onPress={() => navigation.navigate('Measure')}
      />
      </Animated.View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 96,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  list: {
    gap: 8,
  },
});

export default HomeScreen;
