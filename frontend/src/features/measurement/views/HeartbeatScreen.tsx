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

const DURATION = 8;
type MeasurePhase = 'idle' | 'measuring' | 'analyzing';

const HeartbeatScreen = ({navigation}: any) => {
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
    type: 'Heartbeat',
    status: 'Nhịp đều',
    measuredAt: new Date().toISOString(),
    duration: DURATION,
    primaryLabel: 'Rhythm',
    primaryValue: 'Normal',
    note: 'Kết quả demo cho frontend Heartbeat screen.',
    metrics: [
      {label: 'Heart Rate', value: 72, unit: 'BPM', icon: 'favorite'},
      {label: 'Confidence', value: 91, unit: '%', icon: 'verified-user'},
      {label: 'Signal Quality', value: 86, unit: '%', icon: 'graphic-eq'},
    ],
  });

  const finish = async () => {
    stop();
    setPhase('analyzing');
    const startedAt = new Date(Date.now() - DURATION * 1000).toISOString();

    let result = fallbackResult();
    try {
      result = await measurementService.analyze({
        type: 'heartbeat',
        duration: DURATION,
        startedAt,
        sessionId: `heartbeat-${Date.now()}`,
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
        <Text style={[styles.eyebrow, {color: theme.colors.primary}]}>Heartbeat</Text>
        <Text style={[styles.title, {color: theme.colors.text}]}>Âm thanh tim</Text>
        <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
          Màn frontend mô phỏng ghi âm âm thanh tim. Phần microphone thật có thể
          được thêm sau khi hoàn thiện UI.
        </Text>
      </View>

      <Card style={styles.waveCard}>
        <View style={[styles.micCircle, {backgroundColor: theme.colors.error + '16'}]}>
          <MaterialIcons name="mic" size={42} color={theme.colors.error} />
        </View>
        <View style={styles.waveRow}>
          {Array.from({length: 18}).map((_, index) => (
            <View
              key={index}
              style={[
                styles.waveBar,
                {
                  height: running ? 18 + ((index * 11) % 48) : 20,
                  backgroundColor: running
                    ? theme.colors.error
                    : theme.colors.textMuted,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.timer, {color: theme.colors.text}]}>
          {secondsLeft}s
        </Text>
        <Text style={[styles.status, {color: theme.colors.textSecondary}]}>
          {analyzing ? 'Đang phân tích tín hiệu...' : running ? 'Đang ghi âm mô phỏng...' : 'Đặt điện thoại gần ngực trái'}
        </Text>
      </Card>

      <Card style={styles.tipsCard}>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>Hướng dẫn</Text>
        <Text style={[styles.tip, {color: theme.colors.textSecondary}]}>1. Chọn nơi yên tĩnh.</Text>
        <Text style={[styles.tip, {color: theme.colors.textSecondary}]}>2. Giữ điện thoại ổn định.</Text>
        <Text style={[styles.tip, {color: theme.colors.textSecondary}]}>3. Không chạm mạnh vào micro khi đo.</Text>
      </Card>

      <Button
        title={analyzing ? 'Đang phân tích...' : running ? 'Đang ghi...' : 'Bắt đầu ghi âm'}
        icon={analyzing ? 'cloud-sync' : running ? 'hourglass-empty' : 'fiber-manual-record'}
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
  waveCard: {alignItems: 'center', gap: 16, paddingVertical: 28},
  micCircle: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRow: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  waveBar: {
    width: 5,
    borderRadius: 999,
  },
  timer: {fontSize: 38, fontWeight: '900'},
  status: {fontSize: 14, textAlign: 'center'},
  tipsCard: {gap: 8},
  cardTitle: {fontSize: 17, fontWeight: '900'},
  tip: {fontSize: 14, lineHeight: 20},
});

export default HeartbeatScreen;
