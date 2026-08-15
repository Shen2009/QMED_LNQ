import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'qmed.local.health-profile';

export interface HealthProfileData {
  birth_year?: number | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  cardiovascular?: string[];
  diabetes?: string;
  respiratory?: string[];
  kidney_liver?: boolean;
  anxiety_depression?: boolean;
  current_medications?: string | null;
  family_history?: string[];
  smoking?: string;
  alcohol?: string;
  exercise?: string;
  diet?: string;
}

const read = async (): Promise<HealthProfileData | null> => {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HealthProfileData;
  } catch {
    return null;
  }
};

const healthProfileService = {
  async upsert(data: HealthProfileData) {
    const next = {...(await read()), ...data, updated_at: new Date().toISOString()};
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    return next;
  },

  async get() {
    return read();
  },

  async checkExists(): Promise<boolean> {
    const profile = await read();
    return Boolean(profile?.birth_year);
  },

  async clear() {
    await AsyncStorage.removeItem(PROFILE_KEY);
  },
};

export default healthProfileService;
