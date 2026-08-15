import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'qmed.local.measurement-history';

export interface PreExamContext {
  slept_well?: boolean | null;
  caffeine_recently?: boolean | null;
  exercised_recently?: boolean | null;
}

export interface SaveRecordData {
  type: string;
  result: Record<string, any>;
  pre_exam_context?: PreExamContext;
}

const read = async (): Promise<any[]> => {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const records = JSON.parse(raw);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
};

const write = (records: any[]) =>
  AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 200)));

const historyService = {
  async save(data: SaveRecordData) {
    const records = await read();
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...data,
      measured_at: new Date().toISOString(),
    };
    await write([record, ...records]);
    return record;
  },

  async list(type?: string, page = 1, pageSize = 20) {
    const records = await read();
    const filtered = type ? records.filter(record => record.type === type) : records;
    const start = Math.max(0, page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  },

  async getLatest() {
    const records = await read();
    const latest = new Map<string, any>();
    records.forEach(record => {
      if (!latest.has(record.type)) latest.set(record.type, record);
    });
    return Array.from(latest.values());
  },

  async getStats(): Promise<{total: number; days: number; streak: number}> {
    const records = await read();
    const daySet = new Set(records.map(record => new Date(record.measured_at).toISOString().slice(0, 10)));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let cursor = new Date(today);
    if (!daySet.has(today.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return {total: records.length, days: daySet.size, streak};
  },

  async clear() {
    await AsyncStorage.removeItem(HISTORY_KEY);
  },
};

export default historyService;
