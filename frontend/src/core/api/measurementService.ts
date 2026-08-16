import {Platform} from 'react-native';
import apiClient, {API_BASE_URL} from './apiClient';

export interface RPPGAnalysisResult {
  hr_fft?: number | null;
  hr_peak?: number | null;
  stress_level?: number | null;
  hrv_ms?: number | null;
  duration?: number | null;
  fps?: number | null;
  n_frames?: number | null;
  face_detected?: boolean | null;
  [key: string]: any;
}

export interface StressAnalysisResult {
  stress_score: number;
  hrv_ms: number;
  features?: any;
  signal_quality?: Record<string, any>;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface ScgAnalysisResult {
  [key: string]: any;
}

export interface BloodPressureAnalysisResult {
  systolic_avg: number | null;
  diastolic_avg: number | null;
  predictions: Array<{window_index: number; systolic: number; diastolic: number}>;
  metadata: Record<string, any>;
  debug_info: Record<string, any>;
  [key: string]: any;
}

export interface MediaAsset {
  uri: string;
  name?: string;
  type?: string;
}

// Locked on for product evaluation: measurement flows must never contact the
// Python analysis API. Change this literal to false for real model testing.
export const DEMO_MEASUREMENTS = true;
export const DEMO_DURATION_SECONDS = 30;

const demoDelay = () => new Promise(resolve => setTimeout(resolve, 700));

interface DemoProfile {
  id: 'good' | 'moderate' | 'attention';
  heartRate: number;
  stress: number;
  hrv: number;
  systolic: number;
  diastolic: number;
  signalQuality: number;
  rhythm: string;
  anomaly: boolean;
  anomalyScore: number;
}

const DEMO_PROFILES: DemoProfile[] = [
  {id: 'good', heartRate: 68, stress: 22, hrv: 64, systolic: 116, diastolic: 75, signalQuality: 0.96, rhythm: 'Sinus Normal', anomaly: false, anomalyScore: 0.05},
  {id: 'moderate', heartRate: 75, stress: 44, hrv: 47, systolic: 125, diastolic: 81, signalQuality: 0.93, rhythm: 'Sinus Normal', anomaly: false, anomalyScore: 0.11},
  {id: 'attention', heartRate: 84, stress: 67, hrv: 29, systolic: 136, diastolic: 88, signalQuality: 0.89, rhythm: 'Possible irregular rhythm', anomaly: true, anomalyScore: 0.68},
];

let activeDemoProfile = DEMO_PROFILES[0];

const demoProfileForMedia = (media: string | MediaAsset) => {
  const key = typeof media === 'string' ? media : media.uri;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  activeDemoProfile = DEMO_PROFILES[(hash >>> 0) % DEMO_PROFILES.length];
  return activeDemoProfile;
};

const demoRppg = (profile: DemoProfile): RPPGAnalysisResult => ({
  hr_fft: profile.heartRate,
  hr_peak: profile.heartRate + 1,
  stress_level: profile.stress,
  hrv_ms: profile.hrv,
  duration: DEMO_DURATION_SECONDS,
  fps: 30,
  n_frames: DEMO_DURATION_SECONDS * 30,
  face_detected: true,
  signal_quality: profile.signalQuality,
  source: 'demo',
  demo_profile: profile.id,
});

const demoStress = (profile: DemoProfile): StressAnalysisResult => ({
  stress_score: profile.stress,
  hrv_ms: profile.hrv,
  features: {mean_hr_bpm: profile.heartRate, rmssd_ms: profile.hrv, sdnn_ms: Math.max(24, profile.hrv - 5)},
  signal_quality: {valid: true, score: profile.signalQuality},
  metadata: {source: 'demo', demo_profile: profile.id, duration_seconds: DEMO_DURATION_SECONDS},
});

const demoBloodPressure = (profile: DemoProfile): BloodPressureAnalysisResult => ({
  systolic_avg: profile.systolic,
  diastolic_avg: profile.diastolic,
  predictions: [
    {window_index: 0, systolic: profile.systolic - 1, diastolic: profile.diastolic - 1},
    {window_index: 1, systolic: profile.systolic + 1, diastolic: profile.diastolic + 1},
    {window_index: 2, systolic: profile.systolic, diastolic: profile.diastolic},
  ],
  metadata: {source: 'demo', demo_profile: profile.id, confidence: profile.signalQuality},
  debug_info: {demo_mode: true, profile: profile.id},
});

const asMedia = (media: string | MediaAsset, fallbackName: string, fallbackType: string): MediaAsset =>
  typeof media === 'string'
    ? {uri: media, name: fallbackName, type: fallbackType}
    : {name: fallbackName, type: fallbackType, ...media};

const normalizeNativeUri = (uri: string) => {
  if (/^(file|content|http|https|blob):\/\//i.test(uri)) return uri;
  return Platform.OS === 'web' ? uri : `file://${uri}`;
};

const createFileForm = async (field: string, media: MediaAsset) => {
  if (!media.uri) throw new Error('Khong tim thay file video vua ghi.');

  const form = new FormData();
  if (Platform.OS === 'web') {
    const response = await fetch(media.uri);
    if (!response.ok) throw new Error('Khong doc duoc file media vua ghi.');
    const blob = await response.blob();
    form.append(field, blob, media.name || `qmed-${Date.now()}`);
  } else {
    form.append(field, {
      uri: normalizeNativeUri(media.uri),
      name: media.name || `qmed-${Date.now()}`,
      type: media.type || 'application/octet-stream',
    } as any);
  }
  return form;
};

export const getMeasurementErrorMessage = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail || error?.message;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return fallback;
  }
};

const upload = async <T>(path: string, field: string, media: MediaAsset) => {
  const form = await createFileForm(field, media);

  // Axios' React Native adapter intermittently reports "Network Error" for
  // file-backed multipart bodies in Expo Go. Native fetch uses React Native's
  // supported FormData upload path and preserves the multipart boundary.
  if (Platform.OS !== 'web') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000);
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      const text = await response.text();
      let payload: any = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = text;
      }
      if (!response.ok) {
        const detail = payload?.detail || payload || `HTTP ${response.status}`;
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }
      return payload as T;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('Backend xu ly video qua 10 phut. Hay dong cac tac vu AI khac va thu lai.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const response = await apiClient.post<T>(path, form, {timeout: 600000});
  return response.data;
};

const measurementService = {
  async analyzeVideo(video: string | MediaAsset) {
    if (DEMO_MEASUREMENTS) {
      const profile = demoProfileForMedia(video);
      await demoDelay();
      return demoRppg(profile);
    }
    return upload<RPPGAnalysisResult>('/rppg/analyse', 'video', asMedia(video, 'measurement.mp4', Platform.OS === 'web' ? 'video/webm' : 'video/mp4'));
  },

  async analyzeStressVideo(video: string | MediaAsset) {
    if (DEMO_MEASUREMENTS) {
      const profile = demoProfileForMedia(video);
      await demoDelay();
      return demoStress(profile);
    }
    return upload<StressAnalysisResult>('/stress/analyse', 'video', asMedia(video, 'measurement.mp4', Platform.OS === 'web' ? 'video/webm' : 'video/mp4'));
  },

  async analyzeSCG(zAxis: number[], sampleRateHz = 12.5) {
    if (DEMO_MEASUREMENTS) {
      await demoDelay();
      return {
        hr_fft: activeDemoProfile.heartRate,
        hrv_ms: activeDemoProfile.hrv,
        scg_rhythm: activeDemoProfile.rhythm,
        heart_anomaly: activeDemoProfile.anomaly,
        scg_anomaly_score: activeDemoProfile.anomalyScore,
        stress_level: activeDemoProfile.stress,
        source: 'demo',
        demo_profile: activeDemoProfile.id,
      };
    }
    const response = await apiClient.post<ScgAnalysisResult>('/scg/analyze', {
      z_axis: zAxis,
      sample_rate_hz: sampleRateHz,
      duration_sec: 30,
    });
    return response.data;
  },

  async analyzeBloodPressureVideo(video: string | MediaAsset) {
    if (DEMO_MEASUREMENTS) {
      const profile = demoProfileForMedia(video);
      await demoDelay();
      return demoBloodPressure(profile);
    }
    return upload<BloodPressureAnalysisResult>('/blood-pressure/analyse', 'video', asMedia(video, 'bp_measurement.mp4', Platform.OS === 'web' ? 'video/webm' : 'video/mp4'));
  },

  async analyzeHeartbeatAudio(media: string | MediaAsset) {
    return upload<any>('/heartbeat/analyze', 'file', asMedia(media, Platform.OS === 'web' ? 'heartbeat.wav' : 'heartbeat.m4a', Platform.OS === 'web' ? 'audio/wav' : 'audio/x-m4a'));
  },
};

export default measurementService;
