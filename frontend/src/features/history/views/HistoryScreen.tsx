import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
  Modal, Pressable,
} from 'react-native';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useColors} from '../../../core/theme/useColors';
import {useNavigation} from '@react-navigation/native';
import historyService from '../../../core/api/historyService';

// ─── Filter config ────────────────────────────────────────────────────────────
const FILTERS = [
  {id: 'all',        label: 'Tất cả',    icon: 'view-dashboard'},
  {id: 'face-rppg',  label: 'Mặt rPPG',  icon: 'face-recognition'},
  {id: 'heartbeat',  label: 'Âm tim',    icon: 'heart-pulse'},
  {id: 'stress',     label: 'Stress',    icon: 'brain'},
  {id: 'health-exam',label: 'Tổng quát', icon: 'robot'},
] as const;

// ─── Map type → display config ────────────────────────────────────────────────
function typeConfig(type: string, C: any) {
  const map: Record<string, {icon: string; color: string; title: string}> = {
    'face-rppg':   {icon: 'face-recognition', color: C.red,    title: 'Khuôn mặt rPPG'},
    'heartbeat':   {icon: 'heart-pulse',       color: '#E11D48', title: 'Âm thanh tim (Beta)'},
    'stress':      {icon: 'brain',             color: '#A855F7', title: 'Stress'},
    'health-exam': {icon: 'robot',             color: '#8B5CF6', title: 'Khám Tổng Quát'},
  };
  return map[type] ?? {icon: 'pulse', color: C.green, title: type};
}

// ─── Extract main display value ───────────────────────────────────────────────
function extractValue(type: string, result: any): {value: string; unit: string; statusOk: boolean; status: string} {
  switch (type) {
    case 'face-rppg': {
      const bpm = result?.hr_fft ?? result?.hr_bpm ?? '—';
      const ok = bpm !== '—' && bpm >= 60 && bpm <= 100;
      return {value: `${bpm}`, unit: 'BPM', statusOk: ok, status: ok ? 'Bình thường' : bpm < 60 ? 'Thấp' : 'Cao'};
    }
    case 'stress': {
      const s  = result?.stress_level ?? '—';
      const ok = s !== '—' && s < 40;
      return {value: `${s}`, unit: '/100', statusOk: ok, status: ok ? 'Thấp' : s < 70 ? 'Trung bình' : 'Cao'};
    }
    case 'sleep': {
      const sc = result?.sleep_score ?? '—';
      const ok = sc !== '—' && sc >= 70;
      return {value: `${sc}`, unit: '/100', statusOk: ok, status: ok ? 'Tốt' : 'Cần cải thiện'};
    }
    case 'heartbeat': {
      const label = result?.overall_label || '—';
      const ok = !result?.is_abnormal;
      return {value: label, unit: '', statusOk: ok, status: ok ? 'Bình thường' : 'Bất thường'};
    }
    case 'health-exam': {
      const hr = result?.face?.hr_bpm;
      const bp = result?.voice?.blood_pressure;
      if (bp && hr) {
        return {value: `${bp.systolic}/${bp.diastolic}`, unit: ` | ${hr} BPM`, statusOk: true, status: 'Hoàn thành'};
      } else if (hr) {
        return {value: `${hr}`, unit: 'BPM', statusOk: true, status: 'Hoàn thành'};
      }
      return {value: '✓', unit: '', statusOk: true, status: 'Hoàn thành'};
    }
    default:
      return {value: '—', unit: '', statusOk: true, status: '—'};
  }
}

// ─── Build detail rows from result ───────────────────────────────────────────
function buildDetailRows(type: string, result: any): {label: string; value: string; icon: string}[] {
  if (!result) return [];
  const rows: {label: string; value: string; icon: string}[] = [];
  const add = (label: string, val: any, unit = '', icon = 'info-outline') => {
    if (val !== undefined && val !== null && val !== '—') {
      rows.push({label, value: `${val}${unit}`, icon});
    }
  };

  // Common fields across all types
  add('Nhịp tim (FFT)',  result.hr_fft,  ' BPM', 'favorite');
  add('HRV (RMSSD)',     result.hrv_ms !== undefined ? result.hrv_ms?.toFixed?.(1) ?? result.hrv_ms : undefined, ' ms', 'show-chart');
  add('Stress',          result.stress_level, '/100', 'psychology');

  // Blood pressure
  const bp = result.blood_pressure;
  if (bp?.systolic && bp?.diastolic) {
    rows.push({label: 'Huyết áp', value: `${bp.systolic}/${bp.diastolic} mmHg`, icon: 'monitor-heart'});
  }

  // SCG-specific
  if (result.scg_rhythm)  add('Nhịp SCG',       result.scg_rhythm,           '', 'waves');
  if (result.heart_anomaly !== undefined) {
    rows.push({label: 'Bất thường tim', value: result.heart_anomaly ? 'Có' : 'Không', icon: 'warning'});
  }

  // Sleep-specific
  add('Sleep score',    result.sleep_score,    '/100', 'bedtime');
  add('Ngủ sâu',        result.deep_sleep_pct !== undefined ? `${result.deep_sleep_pct}%` : undefined, '', 'dark-mode');
  add('REM',            result.rem_pct        !== undefined ? `${result.rem_pct}%` : undefined,        '', 'nights-stay');
  add('Ngủ nhẹ',        result.light_sleep_pct!== undefined ? `${result.light_sleep_pct}%` : undefined,'', 'wb-twilight');

  // Heartbeat-specific
  if (type === 'heartbeat') {
    add('Phân loại',      result.overall_label,                             '', 'favorite');
    add('Độ tin cậy',      result.overall_confidence !== undefined ? `${(result.overall_confidence * 100).toFixed(1)}%` : undefined, '', 'verified');
    add('BPM',             result.bpm_estimate,                              ' BPM', 'favorite');
    add('Chất lượng',      result.signal_quality,                             '',     'tune');
  }

  // Health-exam nested data
  if (type === 'health-exam') {
    if (result?.face) {
      add('Nhịp tim (rPPG)', result.face.hr_bpm, ' BPM', 'favorite');
      add('Stress (rPPG)', result.face.stress_level, '/100', 'psychology');
    }
    if (result?.scg) {
      if (result.scg.hrv_ms !== undefined) add('HRV (SCG)', result.scg.hrv_ms, ' ms', 'show-chart');
      if (result.scg.scg_rhythm !== undefined) add('Nhịp SCG', result.scg.scg_rhythm, '', 'waves');
      if (result.scg.heart_anomaly !== undefined) add('Bất thường tim', result.scg.heart_anomaly ? 'Có' : 'Không', '', 'warning');
    }
    if (result?.voice) {
      if (result.voice.blood_pressure) add('Huyết áp', `${result.voice.blood_pressure.systolic}/${result.voice.blood_pressure.diastolic}`, ' mmHg', 'monitor-heart');
      if (result.voice.breathing_rate) add('Nhịp thở', result.voice.breathing_rate, ' nhịp/phút', 'air');
    }
  }

  // Generic
  add('Thời gian đo',   result.duration !== undefined ? `${result.duration}s` : undefined, '', 'timer');
  add('FPS',            result.fps !== undefined ? `${result.fps?.toFixed?.(1) ?? result.fps}` : undefined, ' Hz', 'speed');
  add('Số frame',       result.n_frames, '', 'movie');

  return rows;
}

// ─── Detail bottom sheet ──────────────────────────────────────────────────────
function DetailModal({record, C, onClose}: {record: any; C: any; onClose: () => void}) {
  const cfg   = typeConfig(record.type, C);
  const {value, unit, statusOk, status} = extractValue(record.type, record.result);
  const rows  = buildDetailRows(record.type, record.result);
  const dt    = new Date(record.measured_at);
  const date  = dt.toLocaleDateString('vi-VN', {weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'});
  const time  = dt.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={dm.backdrop} onPress={onClose} />
      <View style={[dm.sheet, {backgroundColor: C.surface}]}>
        {/* Handle */}
        <View style={[dm.handle, {backgroundColor: C.border}]} />

        {/* Header */}
        <View style={dm.sheetHeader}>
          <View style={[dm.sheetIconWrap, {backgroundColor: cfg.color + '20'}]}>
            <MaterialCommunityIcons name={cfg.icon as any} size={26} color={cfg.color} />
          </View>
          <View style={{flex: 1}}>
            <Text style={[dm.sheetTitle, {color: C.text}]}>{cfg.title}</Text>
            <Text style={[dm.sheetDate, {color: C.textSub}]}>{date} · {time}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[dm.closeBtn, {backgroundColor: C.card, borderColor: C.border}]}>
            <MaterialIcons name="close" size={18} color={C.textSub} />
          </TouchableOpacity>
        </View>

        {/* Main metric */}
        <View style={[dm.heroCard, {backgroundColor: cfg.color + '12', borderColor: cfg.color + '30'}]}>
          <Text style={[dm.heroLabel, {color: C.textSub}]}>Chỉ số chính</Text>
          <View style={dm.heroRow}>
            <Text style={[dm.heroValue, {color: cfg.color}]}>{value}</Text>
            <Text style={[dm.heroUnit, {color: C.textSub}]}>{unit}</Text>
          </View>
          <View style={[dm.heroBadge, {backgroundColor: statusOk ? C.green + '20' : C.amber + '20'}]}>
            <View style={[dm.heroDot, {backgroundColor: statusOk ? C.green : C.amber}]} />
            <Text style={[dm.heroBadgeTxt, {color: statusOk ? C.green : C.amber}]}>{status}</Text>
          </View>
        </View>

        {/* Detail rows */}
        <ScrollView style={dm.rowsScroll} contentContainerStyle={dm.rowsContent} showsVerticalScrollIndicator={false}>
          {rows.length === 0 ? (
            <Text style={[dm.noDetail, {color: C.textDim}]}>Không có thông số chi tiết.</Text>
          ) : rows.map((row, i) => (
            <View key={i} style={[dm.detailRow, {borderColor: C.border, backgroundColor: C.card}]}>
              <MaterialIcons name={row.icon as any} size={16} color={cfg.color} />
              <Text style={[dm.rowLabel, {color: C.textSub}]}>{row.label}</Text>
              <Text style={[dm.rowValue, {color: C.text}]}>{row.value}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  backdrop:    {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)'},
  sheet:       {borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingBottom: 40, maxHeight: '85%'},
  handle:      {width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16},
  sheetHeader: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, marginBottom: 16},
  sheetIconWrap: {width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  sheetTitle:  {fontSize: 18, fontWeight: '800', letterSpacing: -0.3},
  sheetDate:   {fontSize: 12, marginTop: 2},
  closeBtn:    {width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  heroCard:    {marginHorizontal: 20, borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 16, gap: 8},
  heroLabel:   {fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1},
  heroRow:     {flexDirection: 'row', alignItems: 'baseline', gap: 4},
  heroValue:   {fontSize: 48, fontWeight: '900', letterSpacing: -2, lineHeight: 52},
  heroUnit:    {fontSize: 16, fontWeight: '600', marginBottom: 4},
  heroBadge:   {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start'},
  heroDot:     {width: 6, height: 6, borderRadius: 3},
  heroBadgeTxt:{fontSize: 12, fontWeight: '700'},
  rowsScroll:  {flexGrow: 0},
  rowsContent: {paddingHorizontal: 20, gap: 8},
  detailRow:   {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 14, borderWidth: 1},
  rowLabel:    {flex: 1, fontSize: 13, fontWeight: '500'},
  rowValue:    {fontSize: 14, fontWeight: '700'},
  noDetail:    {textAlign: 'center', fontSize: 13, paddingVertical: 24},
});

// ─── Record card ──────────────────────────────────────────────────────────────
function RecordCard({record, C, onPress}: {record: any; C: any; onPress: () => void}) {
  const cfg = typeConfig(record.type, C);
  const {value, unit, statusOk, status} = extractValue(record.type, record.result);
  const dt   = new Date(record.measured_at);
  const date = dt.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'});
  const time = dt.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});

  return (
    <TouchableOpacity
      style={[s.recordCard, {backgroundColor: C.card, borderColor: C.border, borderLeftColor: cfg.color}]}
      activeOpacity={0.75}
      onPress={onPress}>
      <View style={[s.iconWrap, {backgroundColor: cfg.color + '20'}]}>
        <MaterialCommunityIcons name={cfg.icon as any} size={20} color={cfg.color} />
      </View>
      <View style={s.cardInfo}>
        <Text style={[s.cardTitle, {color: C.text}]}>{cfg.title}</Text>
        <View style={s.cardMeta}>
          <MaterialIcons name="schedule" size={11} color={C.textDim} />
          <Text style={[s.cardTime, {color: C.textDim}]}>  {date} · {time}</Text>
        </View>
      </View>
      <View style={s.cardRight}>
        <View style={s.valueRow}>
          <Text style={[s.cardValue, {color: cfg.color}]}>{value}</Text>
          <Text style={[s.cardUnit, {color: C.textSub}]}>{unit}</Text>
        </View>
        <View style={[s.badge, {backgroundColor: statusOk ? C.green + '20' : C.amber + '20'}]}>
          <View style={[s.badgeDot, {backgroundColor: statusOk ? C.green : C.amber}]} />
          <Text style={[s.badgeText, {color: statusOk ? C.green : C.amber}]}>{status}</Text>
        </View>
      </View>
      {/* Chevron hint */}
      <MaterialIcons name="chevron-right" size={16} color={C.textDim} />
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
const HistoryScreen = () => {
  const {strings} = useLanguage();
  const C = useColors();
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  const fetch = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const type = activeFilter === 'all' ? undefined : activeFilter;
      const data = await historyService.list(type, 1, 50);
      setRecords(data);
    } catch {
      setError('Không tải được dữ liệu. Kiểm tra kết nối.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <SafeAreaView style={[s.root, {backgroundColor: C.bg}]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={[s.headerTitle, {color: C.text}]}>Lịch sử đo</Text>
          <Text style={[s.headerSub, {color: C.textSub}]}>Toàn bộ kết quả đo của bạn</Text>
        </View>
        <TouchableOpacity
          style={[s.headerBtn, {backgroundColor: C.surface, borderColor: C.border}]}
          onPress={() => navigation.navigate('MeasurementList')}>
          <MaterialIcons name="add" size={20} color={C.teal} />
        </TouchableOpacity>
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{flexGrow: 0, flexShrink: 0}}
        contentContainerStyle={s.filterRow}>
        {FILTERS.map(f => {
          const active = activeFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[s.filterChip, {backgroundColor: active ? C.teal : C.surface, borderColor: active ? C.teal : C.border}]}
              onPress={() => setActiveFilter(f.id)}>
              <MaterialCommunityIcons name={f.icon as any} size={13} color={active ? C.bg : C.textSub} />
              <Text style={[s.filterText, {color: active ? C.bg : C.textSub}]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={[s.loadingTxt, {color: C.textSub}]}>Đang tải...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <MaterialIcons name="wifi-off" size={36} color={C.textDim} />
          <Text style={[s.emptyTitle, {color: C.textSub}]}>{error}</Text>
          <TouchableOpacity style={[s.retryBtn, {borderColor: C.teal, backgroundColor: C.teal + '15'}]} onPress={() => fetch()}>
            <MaterialIcons name="refresh" size={16} color={C.teal} />
            <Text style={[s.retryTxt, {color: C.teal}]}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch(true)} tintColor={C.teal} />}>

          {/* Count */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, {color: C.textSub}]}>{records.length} kết quả</Text>
            <Text style={[s.sortText, {color: C.textDim}]}>Mới nhất trước</Text>
          </View>

          <View style={s.listWrap}>
            {records.length === 0 ? (
              <View style={s.emptyState}>
                <View style={[s.emptyIcon, {backgroundColor: C.surface, borderColor: C.border}]}>
                  <MaterialIcons name="history" size={32} color={C.textDim} />
                </View>
                <Text style={[s.emptyTitle, {color: C.textSub}]}>Chưa có lịch sử</Text>
                <Text style={[s.emptyHint, {color: C.textDim}]}>Thực hiện đo lường để xem kết quả tại đây.</Text>
                <TouchableOpacity
                  style={[s.retryBtn, {borderColor: C.teal, backgroundColor: C.teal + '15'}]}
                  onPress={() => navigation.navigate('MeasurementList')}>
                  <MaterialIcons name="add" size={16} color={C.teal} />
                  <Text style={[s.retryTxt, {color: C.teal}]}>Đo ngay</Text>
                </TouchableOpacity>
              </View>
            ) : (
              records.map(record => (
                <RecordCard
                  key={record.id}
                  record={record}
                  C={C}
                  onPress={() => setSelected(record)}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Detail modal ── */}
      {selected && <DetailModal record={selected} C={C} onClose={() => setSelected(null)} />}

    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: {flex: 1},
  scroll: {paddingBottom: 110},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16},
  headerTitle: {fontSize: 26, fontWeight: '800', letterSpacing: -0.5},
  headerSub: {fontSize: 13, marginTop: 2},
  headerBtn: {width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  filterRow: {paddingHorizontal: 20, paddingBottom: 14, gap: 8},
  filterChip: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1},
  filterText: {fontSize: 12, fontWeight: '600'},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10},
  sectionTitle: {fontSize: 13, fontWeight: '700'},
  sortText: {fontSize: 12},
  listWrap: {paddingHorizontal: 20, gap: 10, paddingBottom: 110},
  recordCard: {borderRadius: 16, borderWidth: 1, borderLeftWidth: 3, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12},
  iconWrap: {width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  cardInfo: {flex: 1, gap: 4},
  cardTitle: {fontSize: 14, fontWeight: '700'},
  cardMeta: {flexDirection: 'row', alignItems: 'center'},
  cardTime: {fontSize: 11},
  cardRight: {alignItems: 'flex-end', gap: 6},
  valueRow: {flexDirection: 'row', alignItems: 'baseline', gap: 2},
  cardValue: {fontSize: 20, fontWeight: '800', letterSpacing: -0.5},
  cardUnit: {fontSize: 11, fontWeight: '500'},
  badge: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20},
  badgeDot: {width: 5, height: 5, borderRadius: 3},
  badgeText: {fontSize: 10, fontWeight: '700'},
  emptyState: {alignItems: 'center', paddingVertical: 60, gap: 12},
  emptyIcon: {width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  emptyTitle: {fontSize: 16, fontWeight: '700'},
  emptyHint: {fontSize: 13, textAlign: 'center'},
  loadingTxt: {fontSize: 14},
  retryBtn: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1},
  retryTxt: {fontSize: 14, fontWeight: '700'},
});

export default HistoryScreen;
