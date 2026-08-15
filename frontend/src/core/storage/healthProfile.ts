import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_PROFILE_KEY = 'qmed.local.health_profile';

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'low' | 'medium' | 'high';

export interface HealthProfile {
  fullName: string;
  age: string;
  gender: Gender;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel;
  medicalNotes: string;
  emergencyContact: string;
  updatedAt?: string;
}

export const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  fullName: '',
  age: '',
  gender: 'male',
  heightCm: '',
  weightKg: '',
  activityLevel: 'medium',
  medicalNotes: '',
  emergencyContact: '',
};

export const healthProfileStorage = {
  async get() {
    const raw = await AsyncStorage.getItem(HEALTH_PROFILE_KEY);
    if (!raw) return DEFAULT_HEALTH_PROFILE;

    try {
      return {...DEFAULT_HEALTH_PROFILE, ...JSON.parse(raw)} as HealthProfile;
    } catch {
      return DEFAULT_HEALTH_PROFILE;
    }
  },

  async save(profile: HealthProfile) {
    const nextProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(HEALTH_PROFILE_KEY, JSON.stringify(nextProfile));
    return nextProfile;
  },

  async clear() {
    await AsyncStorage.removeItem(HEALTH_PROFILE_KEY);
  },
};
