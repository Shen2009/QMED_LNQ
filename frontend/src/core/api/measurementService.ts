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

// Enabled by default for product evaluation. Set the Expo public variable to
// false when the real Python video-analysis pipeline is required.
export const DEMO_MEASUREMENTS = process.env.EXPO_PUBLIC_DEMO_MEASUREMENTS !== 'false';
export const DEMO_DURATION_SECONDS = 3;

const demoDelay = () => new Promise(resolve => setTimeout(resolve, 700));

const demoRppg = (): RPPGAnalysisResult => ({
  hr_fft: 72,
  hr_peak: 73,
  stress_level: 29,
  hrv_ms: 54,
  duration: DEMO_DURATION_SECONDS,
  fps: 30,
  n_frames: DEMO_DURATION_SECONDS * 30,
  face_detected: true,
  signal_quality: 0.94,
  source: 'demo',
});

const demoStress = (): StressAnalysisResult => ({
  stress_score: 31,
  hrv_ms: 52,
  features: {mean_hr_bpm: 72, rmssd_ms: 52, sdnn_ms: 48},
  signal_quality: {valid: true, score: 0.93},
  metadata: {source: 'demo', duration_seconds: DEMO_DURATION_SECONDS},
});

const demoBloodPressure = (): BloodPressureAnalysisResult => ({
  systolic_avg: 118,
  diastolic_avg: 76,
  predictions: [
    {window_index: 0, systolic: 117, diastolic: 75},
    {window_index: 1, systolic: 119, diastolic: 77},
    {window_index: 2, systolic: 118, diastolic: 76},
  ],
  metadata: {source: 'demo', confidence: 0.92},
  debug_info: {demo_mode: true},
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
      await demoDelay();
      return demoRppg();
    }
    return upload<RPPGAnalysisResult>('/rppg/analyse', 'video', asMedia(video, 'measurement.mp4', Platform.OS === 'web' ? 'video/webm' : 'video/mp4'));
  },

  async analyzeStressVideo(video: string | MediaAsset) {
    if (DEMO_MEASUREMENTS) {
      await demoDelay();
      return demoStress();
    }
    return upload<StressAnalysisResult>('/stress/analyse', 'video', asMedia(video, 'measurement.mp4', Platform.OS === 'web' ? 'video/webm' : 'video/mp4'));
  },

  async analyzeSCG(zAxis: number[], sampleRateHz = 12.5) {
    if (DEMO_MEASUREMENTS) {
      await demoDelay();
      return {
        hr_fft: 72,
        hrv_ms: 55,
        scg_rhythm: 'Sinus Normal',
        heart_anomaly: false,
        scg_anomaly_score: 0.08,
        stress_level: 27,
        source: 'demo',
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
      await demoDelay();
      return demoBloodPressure();
    }
    return upload<BloodPressureAnalysisResult>('/blood-pressure/analyse', 'video', asMedia(video, 'bp_measurement.mp4', Platform.OS === 'web' ? 'video/webm' : 'video/mp4'));
  },

  async analyzeHeartbeatAudio(media: string | MediaAsset) {
    return upload<any>('/heartbeat/analyze', 'file', asMedia(media, Platform.OS === 'web' ? 'heartbeat.wav' : 'heartbeat.m4a', Platform.OS === 'web' ? 'audio/wav' : 'audio/x-m4a'));
  },
};

export default measurementService;
