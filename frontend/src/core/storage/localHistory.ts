import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'qmed.local.measurement_history';
const MAX_RECORDS = 100;

export interface MeasurementMetric {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  color?: string;
}

export interface MeasurementHistoryRecord {
  id: string;
  type: string;
  status: string;
  measuredAt: string;
  duration?: number;
  primaryLabel: string;
  primaryValue: string | number;
  primaryUnit?: string;
  metrics: MeasurementMetric[];
  note?: string;
}

const readRaw = async (): Promise<MeasurementHistoryRecord[]> => {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRaw = async (records: MeasurementHistoryRecord[]) => {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
};

export const localHistory = {
  async list() {
    return readRaw();
  },

  async latest(limit = 5) {
    const records = await readRaw();
    return records.slice(0, limit);
  },

  async save(record: Omit<MeasurementHistoryRecord, 'id'> & {id?: string}) {
    const records = await readRaw();
    const nextRecord: MeasurementHistoryRecord = {
      ...record,
      id: record.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    const withoutDuplicate = records.filter(item => item.id !== nextRecord.id);
    await writeRaw([nextRecord, ...withoutDuplicate]);
    return nextRecord;
  },

  async remove(id: string) {
    const records = await readRaw();
    await writeRaw(records.filter(item => item.id !== id));
  },

  async clear() {
    await AsyncStorage.removeItem(HISTORY_KEY);
  },
};
