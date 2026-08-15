import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import {useTheme} from '../../../core/theme/ThemeContext';
import {
  localHistory,
  MeasurementHistoryRecord,
  MeasurementMetric,
} from '../../../core/storage/localHistory';

type ResultData = Omit<MeasurementHistoryRecord, 'id'> & {id?: string};

const FALLBACK_RESULT: ResultData = {
  type: 'Face rPPG',
  status: 'Bình thường',
  measuredAt: new Date().toISOString(),
  duration: 15,
  primaryLabel: 'Heart Rate',
  primaryValue: 76,
  primaryUnit: 'BPM',
  note: 'Dữ liệu mẫu của frontend để hoàn thiện luồng màn hình.',
  metrics: [
    {label: 'Heart Rate', value: 76, unit: 'BPM', icon: 'favorite'},
    {label: 'HRV', value: 48, unit: 'ms', icon: 'monitor-heart'},
    {label: 'Signal Quality', value: 92, unit: '%', icon: 'verified'},
  ],
};

const ICON_BY_LABEL: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  'Heart Rate': 'favorite',
  HRV: 'monitor-heart',
  'Signal Quality': 'verified',
  Stress: 'psychology',
  Systolic: 'arrow-upward',
  Diastolic: 'arrow-downward',
  Pulse: 'favorite-border',
  Confidence: 'verified-user',
  Rhythm: 'graphic-eq',
};

const MeasurementResultScreen = ({navigation, route}: any) => {
  const {theme} = useTheme();
  const [saved, setSaved] = useState(false);
  const savedRef = useRef(false);
  const result: ResultData = route.params?.result || FALLBACK_RESULT;

  const measuredTime = useMemo(
    () =>
      new Date(result.measuredAt).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    [result.measuredAt],
  );

  const metrics: MeasurementMetric[] = result.metrics?.length
    ? result.metrics
    : FALLBACK_RESULT.metrics;

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    localHistory.save(result).then(() => setSaved(true)).catch(() => {
      savedRef.current = false;
    });
  }, [result]);

  const redoRoute =
    result.type === 'Stress'
      ? 'Stress'
      : result.type === 'Blood Pressure'
        ? 'BloodPressure'
        : result.type === 'Heartbeat'
          ? 'Heartbeat'
          : 'FaceRppg';

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.successIcon, {backgroundColor: theme.colors.success + '18'}]}>
          <MaterialIcons name="check-circle" size={34} color={theme.colors.success} />
        </View>
        <Text style={[styles.title, {color: theme.colors.text}]}>Kết quả đo</Text>
        <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
          {result.type} • {measuredTime}
        </Text>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <Text style={[styles.summaryLabel, {color: theme.colors.textSecondary}]}>
            Trạng thái tổng quan
          </Text>
          <View style={[styles.statusBadge, {backgroundColor: theme.colors.success + '18'}]}>
            <Text style={[styles.statusText, {color: theme.colors.success}]}>
              {result.status}
            </Text>
          </View>
        </View>

        <Text style={[styles.primaryLabel, {color: theme.colors.textSecondary}]}>
          {result.primaryLabel}
        </Text>
        <View style={styles.heroMetric}>
          <Text style={[styles.heroNumber, {color: theme.colors.text}]}>
            {result.primaryValue}
          </Text>
          {result.primaryUnit ? (
            <Text style={[styles.heroUnit, {color: theme.colors.textSecondary}]}>
              {result.primaryUnit}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.summaryNote, {color: theme.colors.textSecondary}]}>
          {result.note || 'Kết quả đã được lưu cục bộ bằng AsyncStorage.'}
        </Text>
        <Text style={[styles.savedText, {color: saved ? theme.colors.success : theme.colors.textMuted}]}>
          {saved ? 'Đã lưu vào lịch sử trên máy' : 'Đang lưu lịch sử...'}
        </Text>
      </Card>

      <View style={styles.metricsGrid}>
        {metrics.map(item => {
          const color = item.color || theme.colors.primary;
          const icon = (item.icon || ICON_BY_LABEL[item.label] || 'insights') as keyof typeof MaterialIcons.glyphMap;
          return (
            <Card key={item.label} style={styles.metricCard}>
              <View style={[styles.metricIcon, {backgroundColor: color + '14'}]}>
                <MaterialIcons name={icon} size={22} color={color} />
              </View>
              <Text style={[styles.metricLabel, {color: theme.colors.textSecondary}]}>
                {item.label}
              </Text>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, {color: theme.colors.text}]}>
                  {item.value}
                </Text>
                {item.unit ? (
                  <Text style={[styles.metricUnit, {color: theme.colors.textSecondary}]}>
                    {item.unit}
                  </Text>
                ) : null}
              </View>
            </Card>
          );
        })}
      </View>

      <Card style={styles.detailCard}>
        <Text style={[styles.detailTitle, {color: theme.colors.text}]}>
          Chi tiết phiên đo
        </Text>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, {color: theme.colors.textSecondary}]}>
            Thời lượng
          </Text>
          <Text style={[styles.detailValue, {color: theme.colors.text}]}>
            {result.duration || 0} giây
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, {color: theme.colors.textSecondary}]}>
            Nguồn dữ liệu
          </Text>
          <Text style={[styles.detailValue, {color: theme.colors.text}]}>
            Frontend demo
          </Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button title="Đo lại" icon="replay" onPress={() => navigation.replace(redoRoute)} />
        <Button
          title="Xem lịch sử"
          icon="history"
          variant="secondary"
          onPress={() => navigation.navigate('Main', {screen: 'History'})}
        />
        <Button
          title="Về danh sách đo"
          icon="list"
          variant="outline"
          onPress={() => navigation.navigate('Main', {screen: 'Measure'})}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  summaryCard: {
    gap: 12,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  primaryLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
  },
  heroMetric: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  heroNumber: {
    fontSize: 58,
    lineHeight: 64,
    fontWeight: '900',
  },
  heroUnit: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  summaryNote: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  savedText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    gap: 8,
  },
  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  metricValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  detailCard: {
    gap: 12,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  actions: {
    gap: 10,
  },
});

export default MeasurementResultScreen;
