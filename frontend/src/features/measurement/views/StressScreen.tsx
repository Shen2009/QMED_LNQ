import React, {useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import {
  measurementService,
  MeasurementResultPayload,
} from '../../../core/api/measurementService';
import {useTheme} from '../../../core/theme/ThemeContext';

const DURATION = 10;

const StressScreen = ({navigation}: any) => {
  const {theme} = useTheme();
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const fallbackResult = (): MeasurementResultPayload => ({
    type: 'Stress',
    status: 'Trung bình',
    measuredAt: new Date().toISOString(),
    duration: DURATION,
    primaryLabel: 'Stress Level',
    primaryValue: 42,
    primaryUnit: '%',
    note: 'Kết quả demo cho frontend Stress screen.',
    metrics: [
      {label: 'Stress', value: 42, unit: '%', icon: 'psychology'},
      {label: 'HRV', value: 52, unit: 'ms', icon: 'monitor-heart'},
      {label: 'Signal Quality', value: 88, unit: '%', icon: 'verified'},
    ],
  });

  const finish = async () => {
    stop();
    setRunning(false);
    const startedAt = new Date(Date.now() - DURATION * 1000).toISOString();

    let result = fallbackResult();
    try {
      result = await measurementService.analyze({
        type: 'stress',
        duration: DURATION,
        startedAt,
        sessionId: `stress-${Date.now()}`,
      });
    } catch {
      result = fallbackResult();
    }

    navigation.replace('MeasurementResult', {
      result,
    });
  };

  const start = () => {
    setRunning(true);
    setSecondsLeft(DURATION);
    stop();
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          finish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <View>
        <Text style={[styles.eyebrow, {color: theme.colors.primary}]}>Stress</Text>
        <Text style={[styles.title, {color: theme.colors.text}]}>Đo Stress</Text>
        <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
          Giao diện frontend mô phỏng quá trình đo stress. Sau này có thể nối
          cảm biến hoặc camera thật vào flow này.
        </Text>
      </View>

      <Card style={styles.heroCard}>
        <View style={[styles.iconCircle, {backgroundColor: theme.colors.warning + '18'}]}>
          <MaterialIcons name="psychology" size={44} color={theme.colors.warning} />
        </View>
        <Text style={[styles.timer, {color: theme.colors.text}]}>{secondsLeft}s</Text>
        <Text style={[styles.status, {color: theme.colors.textSecondary}]}>
          {running ? 'Đang phân tích nhịp thở và trạng thái cơ thể' : 'Sẵn sàng bắt đầu'}
        </Text>
      </Card>

      <Card style={styles.tipsCard}>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>Chuẩn bị</Text>
        <Text style={[styles.tip, {color: theme.colors.textSecondary}]}>1. Ngồi yên và thả lỏng vai.</Text>
        <Text style={[styles.tip, {color: theme.colors.textSecondary}]}>2. Hít thở đều trong lúc đo.</Text>
        <Text style={[styles.tip, {color: theme.colors.textSecondary}]}>3. Tránh nói chuyện hoặc di chuyển mạnh.</Text>
      </Card>

      <Button
        title={running ? 'Đang đo...' : 'Bắt đầu đo Stress'}
        icon={running ? 'hourglass-empty' : 'play-arrow'}
        loading={running}
        disabled={running}
        onPress={start}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {gap: 16, paddingBottom: 100},
  eyebrow: {fontSize: 13, fontWeight: '800'},
  title: {fontSize: 30, fontWeight: '900', marginTop: 4},
  subtitle: {fontSize: 14, lineHeight: 21, marginTop: 8},
  heroCard: {alignItems: 'center', gap: 12, paddingVertical: 28},
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {fontSize: 48, fontWeight: '900'},
  status: {fontSize: 14, textAlign: 'center', lineHeight: 20},
  tipsCard: {gap: 8},
  cardTitle: {fontSize: 17, fontWeight: '900'},
  tip: {fontSize: 14, lineHeight: 20},
});

export default StressScreen;
