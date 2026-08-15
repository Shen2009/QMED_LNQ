import React, {useCallback, useMemo, useState} from 'react';
import {Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {MaterialIcons} from '@expo/vector-icons';

import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import {measurementService} from '../../../core/api/measurementService';
import {useTheme} from '../../../core/theme/ThemeContext';
import {
  localHistory,
  MeasurementHistoryRecord,
} from '../../../core/storage/localHistory';

const HistoryScreen = () => {
  const {theme} = useTheme();
  const [records, setRecords] = useState<MeasurementHistoryRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState('All');

  const typeFilters = useMemo(() => {
    const types = Array.from(new Set(records.map(record => record.type)));
    return ['All', ...types];
  }, [records]);

  const filteredRecords = useMemo(
    () =>
      selectedType === 'All'
        ? records
        : records.filter(record => record.type === selectedType),
    [records, selectedType],
  );

  const latestRecord = records[0];
  const measurementTypes = useMemo(
    () => Array.from(new Set(records.map(record => record.type))).length,
    [records],
  );

  const loadHistory = useCallback(async () => {
    const data = await localHistory.list();
    setRecords(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const removeRecord = async (id: string) => {
    await localHistory.remove(id);
    const nextRecords = await localHistory.list();
    setRecords(nextRecords);
    if (
      selectedType !== 'All' &&
      !nextRecords.some(record => record.type === selectedType)
    ) {
      setSelectedType('All');
    }
  };

  const executeClearAll = async () => {
    await localHistory.clear();
    try {
      await measurementService.clearRemoteHistory();
    } catch {
      // Backend may be offline; local history is still cleared for the user.
    }
    setSelectedType('All');
    setRecords([]);
  };

  const clearAll = () => {
    Alert.alert('Xoá lịch sử', 'Anh có chắc muốn xoá toàn bộ lịch sử đo trên máy?', [
      {text: 'Huỷ', style: 'cancel'},
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: executeClearAll,
      },
    ]);
  };

  return (
    <Screen
      scroll
      contentStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={theme.colors.primary}
        />
      }>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, {color: theme.colors.primary}]}>
            Local Storage
          </Text>
          <Text style={[styles.title, {color: theme.colors.text}]}>Lịch sử</Text>
        </View>
        {records.length ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={clearAll}
            style={[styles.clearButton, {backgroundColor: theme.colors.error + '14'}]}>
            <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Card style={styles.summaryCard}>
        <Text style={[styles.summaryNumber, {color: theme.colors.text}]}>
          {records.length}
        </Text>
        <Text style={[styles.summaryText, {color: theme.colors.textSecondary}]}>
          kết quả đang được lưu cục bộ bằng AsyncStorage trên thiết bị này.
        </Text>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, {backgroundColor: theme.colors.cardLight}]}>
            <Text style={[styles.statNumber, {color: theme.colors.text}]}>
              {measurementTypes}
            </Text>
            <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>
              loại đo
            </Text>
          </View>
          <View style={[styles.statBox, {backgroundColor: theme.colors.cardLight}]}>
            <Text style={[styles.statNumber, {color: theme.colors.text}]}>
              {latestRecord ? latestRecord.type : '--'}
            </Text>
            <Text style={[styles.statLabel, {color: theme.colors.textSecondary}]}>
              gần nhất
            </Text>
          </View>
        </View>
      </Card>

      {!records.length ? (
        <Card style={styles.emptyCard}>
          <MaterialIcons name="history" size={36} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, {color: theme.colors.text}]}>
            Chưa có lịch sử đo
          </Text>
          <Text style={[styles.emptyText, {color: theme.colors.textSecondary}]}>
            Sau khi hoàn thành một phép đo demo, kết quả sẽ tự lưu tại đây.
          </Text>
        </Card>
      ) : (
        <>
          <View style={styles.filterRow}>
            {typeFilters.map(type => {
              const active = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  accessibilityRole="button"
                  onPress={() => setSelectedType(type)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.card,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.filterText,
                      {color: active ? '#FFFFFF' : theme.colors.textSecondary},
                    ]}>
                    {type === 'All' ? 'Tất cả' : type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.list}>
          {filteredRecords.map(record => {
            const time = new Date(record.measuredAt).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
            });

            return (
              <Card key={record.id} style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <View style={[styles.recordIcon, {backgroundColor: theme.colors.primary + '14'}]}>
                    <MaterialIcons name="monitor-heart" size={22} color={theme.colors.primary} />
                  </View>
                  <View style={styles.recordCopy}>
                    <Text style={[styles.recordType, {color: theme.colors.text}]}>
                      {record.type}
                    </Text>
                    <Text style={[styles.recordTime, {color: theme.colors.textSecondary}]}>
                      {time} • {record.status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => removeRecord(record.id)}
                    style={styles.deleteButton}>
                    <MaterialIcons name="close" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.primaryRow}>
                  <Text style={[styles.primaryLabel, {color: theme.colors.textSecondary}]}>
                    {record.primaryLabel}
                  </Text>
                  <Text style={[styles.primaryValue, {color: theme.colors.text}]}>
                    {record.primaryValue} {record.primaryUnit || ''}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  {record.metrics.slice(0, 3).map(metric => (
                    <View
                      key={metric.label}
                      style={[styles.metricPill, {backgroundColor: theme.colors.cardLight}]}>
                      <Text style={[styles.metricText, {color: theme.colors.textSecondary}]}>
                        {metric.label}: {metric.value}{metric.unit || ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            );
          })}
          </View>
        </>
      )}

      <Button title="Làm mới lịch sử" icon="refresh" variant="outline" onPress={refresh} />
      {records.length ? (
        <Button
          title="Xoá toàn bộ lịch sử"
          icon="delete-outline"
          variant="danger"
          onPress={clearAll}
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {gap: 16, paddingBottom: 100},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {fontSize: 13, fontWeight: '800'},
  title: {fontSize: 30, fontWeight: '900', marginTop: 4},
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {gap: 6},
  summaryNumber: {fontSize: 42, fontWeight: '900'},
  summaryText: {fontSize: 14, lineHeight: 20},
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statNumber: {fontSize: 16, fontWeight: '900'},
  statLabel: {fontSize: 12, fontWeight: '700', marginTop: 3},
  emptyCard: {alignItems: 'center', gap: 10, paddingVertical: 28},
  emptyTitle: {fontSize: 18, fontWeight: '900'},
  emptyText: {fontSize: 14, lineHeight: 20, textAlign: 'center'},
  filterRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {fontSize: 12, fontWeight: '800'},
  list: {gap: 12},
  recordCard: {gap: 12},
  recordTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCopy: {flex: 1, minWidth: 0},
  recordType: {fontSize: 16, fontWeight: '900'},
  recordTime: {fontSize: 12, marginTop: 3},
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryLabel: {fontSize: 13, fontWeight: '700'},
  primaryValue: {fontSize: 18, fontWeight: '900'},
  metricRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  metricPill: {borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6},
  metricText: {fontSize: 11, fontWeight: '700'},
});

export default HistoryScreen;
