import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import {useTheme} from '../../../core/theme/ThemeContext';

interface ResultData {
  type: string;
  heartRate: number;
  hrv: number;
  signalQuality: number;
  duration: number;
  measuredAt: string;
  status: string;
}

const FALLBACK_RESULT: ResultData = {
  type: 'Face rPPG',
  heartRate: 76,
  hrv: 48,
  signalQuality: 92,
  duration: 15,
  measuredAt: new Date().toISOString(),
  status: 'Bình thường',
};

const MeasurementResultScreen = ({navigation, route}: any) => {
  const {theme} = useTheme();
  const result: ResultData = route.params?.result || FALLBACK_RESULT;
  const measuredTime = new Date(result.measuredAt).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const metrics = [
    {
      icon: 'favorite',
      label: 'Heart Rate',
      value: `${result.heartRate}`,
      unit: 'BPM',
      color: theme.colors.error,
    },
    {
      icon: 'monitor-heart',
      label: 'HRV',
      value: `${result.hrv}`,
      unit: 'ms',
      color: theme.colors.primary,
    },
    {
      icon: 'verified',
      label: 'Signal Quality',
      value: `${result.signalQuality}`,
      unit: '%',
      color: theme.colors.success,
    },
  ] as const;

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.successIcon, {backgroundColor: theme.colors.success + '18'}]}>
          <MaterialIcons name="check-circle" size={34} color={theme.colors.success} />
        </View>
        <Text style={[styles.title, {color: theme.colors.text}]}>
          Kết quả đo
        </Text>
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
        <View style={styles.heroMetric}>
          <Text style={[styles.heroNumber, {color: theme.colors.text}]}>
            {result.heartRate}
          </Text>
          <Text style={[styles.heroUnit, {color: theme.colors.textSecondary}]}>
            BPM
          </Text>
        </View>
        <Text style={[styles.summaryNote, {color: theme.colors.textSecondary}]}>
          Đây là dữ liệu mẫu của frontend để hoàn thiện luồng màn hình. Khi có
          logic thật, màn này chỉ cần nhận result từ service đo.
        </Text>
      </Card>

      <View style={styles.metricsGrid}>
        {metrics.map(item => (
          <Card key={item.label} style={styles.metricCard}>
            <View style={[styles.metricIcon, {backgroundColor: item.color + '14'}]}>
              <MaterialIcons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={[styles.metricLabel, {color: theme.colors.textSecondary}]}>
              {item.label}
            </Text>
            <View style={styles.metricValueRow}>
              <Text style={[styles.metricValue, {color: theme.colors.text}]}>
                {item.value}
              </Text>
              <Text style={[styles.metricUnit, {color: theme.colors.textSecondary}]}>
                {item.unit}
              </Text>
            </View>
          </Card>
        ))}
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
            {result.duration} giây
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, {color: theme.colors.textSecondary}]}>
            Thiết bị
          </Text>
          <Text style={[styles.detailValue, {color: theme.colors.text}]}>
            Camera trước
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, {color: theme.colors.textSecondary}]}>
            Flow
          </Text>
          <Text style={[styles.detailValue, {color: theme.colors.text}]}>
            Frontend demo
          </Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          title="Đo lại"
          icon="replay"
          onPress={() => navigation.replace('FaceRppg')}
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
  heroMetric: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  heroNumber: {
    fontSize: 62,
    lineHeight: 68,
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
