import React, {useEffect, useRef, useState} from 'react';
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

const DURATION = 12;
type MeasurePhase = 'idle' | 'measuring' | 'analyzing';

const BloodPressureScreen = ({navigation}: any) => {
  const {theme} = useTheme();
  const [phase, setPhase] = useState<MeasurePhase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = phase === 'measuring';
  const analyzing = phase === 'analyzing';

  useEffect(() => () => stop(), []);

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const fallbackResult = (): MeasurementResultPayload => ({
    type: 'Blood Pressure',
    status: 'Bình thường',
    measuredAt: new Date().toISOString(),
    duration: DURATION,
    primaryLabel: 'Blood Pressure',
    primaryValue: '118/76',
    primaryUnit: 'mmHg',
    note: 'Kết quả demo cho frontend Blood Pressure screen.',
    metrics: [
      {label: 'Systolic', value: 118, unit: 'mmHg', icon: 'arrow-upward'},
      {label: 'Diastolic', value: 76, unit: 'mmHg', icon: 'arrow-downward'},
      {label: 'Pulse', value: 74, unit: 'BPM', icon: 'favorite-border'},
    ],
  });

  const finish = async () => {
    stop();
    setPhase('analyzing');
    const startedAt = new Date(Date.now() - DURATION * 1000).toISOString();

    let result = fallbackResult();
    try {
      result = await measurementService.analyze({
        type: 'blood_pressure',
        duration: DURATION,
        startedAt,
        sessionId: `bp-${Date.now()}`,
      });
    } catch {
      result = fallbackResult();
    }

    navigation.replace('MeasurementResult', {
      result,
    });
  };

  const start = () => {
    setPhase('measuring');
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
        <Text style={[styles.eyebrow, {color: theme.colors.primary}]}>
          Blood Pressure
        </Text>
        <Text style={[styles.title, {color: theme.colors.text}]}>Đo huyết áp</Text>
        <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
          Màn frontend mô phỏng quá trình đo huyết áp, tập trung vào bố cục,
          hướng dẫn và trạng thái đo.
        </Text>
      </View>

      <Card style={styles.monitorCard}>
        <View style={styles.bpRow}>
          <View style={styles.bpColumn}>
            <Text style={[styles.bpLabel, {color: theme.colors.textSecondary}]}>SYS</Text>
            <Text style={[styles.bpValue, {color: theme.colors.text}]}>
              {running || analyzing ? '...' : '118'}
            </Text>
          </View>
          <Text style={[styles.slash, {color: theme.colors.textMuted}]}>/</Text>
          <View style={styles.bpColumn}>
            <Text style={[styles.bpLabel, {color: theme.colors.textSecondary}]}>DIA</Text>
            <Text style={[styles.bpValue, {color: theme.colors.text}]}>
              {running || analyzing ? '...' : '76'}
            </Text>
          </View>
        </View>
        <View style={[styles.timerPill, {backgroundColor: theme.colors.primary + '14'}]}>
          <MaterialIcons name="timer" size={18} color={theme.colors.primary} />
          <Text style={[styles.timerText, {color: theme.colors.primary}]}>
            {secondsLeft}s
          </Text>
        </View>
      </Card>

      <Card style={styles.tipsCard}>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>Hướng dẫn</Text>
        <Text style={[styles.tip, {color: theme.colors.textSecondary}]}>1. Giữ tay và vai thư giãn.</Text>
        <Text style={[styles.tip, {color: theme.colors.textSecondary}]}>2. Không nói chuyện trong lúc đo.</Text>
        <Text style={[styles.tip, {color: theme.colors.textSecondary}]}>3. Chờ tới khi hệ thống chuyển sang màn kết quả.</Text>
      </Card>

      <Button
        title={analyzing ? 'Đang phân tích...' : running ? 'Đang đo...' : 'Bắt đầu đo huyết áp'}
        icon={analyzing ? 'cloud-sync' : running ? 'hourglass-empty' : 'play-arrow'}
        loading={running || analyzing}
        disabled={running || analyzing}
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
  monitorCard: {alignItems: 'center', gap: 18, paddingVertical: 28},
  bpRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 14},
  bpColumn: {alignItems: 'center'},
  bpLabel: {fontSize: 12, fontWeight: '900'},
  bpValue: {fontSize: 52, lineHeight: 58, fontWeight: '900'},
  slash: {fontSize: 42, lineHeight: 52, fontWeight: '300'},
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timerText: {fontSize: 14, fontWeight: '900'},
  tipsCard: {gap: 8},
  cardTitle: {fontSize: 17, fontWeight: '900'},
  tip: {fontSize: 14, lineHeight: 20},
});

export default BloodPressureScreen;
