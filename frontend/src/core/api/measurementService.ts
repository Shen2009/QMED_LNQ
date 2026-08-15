import {Platform} from 'react-native';
import apiClient from './apiClient';

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

const asMedia = (media: string | MediaAsset, fallbackName: string, fallbackType: string): MediaAsset =>
  typeof media === 'string'
    ? {uri: media, name: fallbackName, type: fallbackType}
    : {name: fallbackName, type: fallbackType, ...media};

const createFileForm = async (field: string, media: MediaAsset) => {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const response = await fetch(media.uri);
    if (!response.ok) throw new Error('Khong doc duoc file media vua ghi.');
    const blob = await response.blob();
    form.append(field, blob, media.name || `qmed-${Date.now()}`);
  } else {
    form.append(field, {
      uri: media.uri,
      name: media.name || `qmed-${Date.now()}`,
      type: media.type || 'application/octet-stream',
    } as any);
  }
  return form;
};

const upload = async <T>(path: string, field: string, media: MediaAsset) => {
  const response = await apiClient.post<T>(path, await createFileForm(field, media), {
    headers: Platform.OS === 'web' ? undefined : {'Content-Type': 'multipart/form-data'},
    timeout: 300000,
  });
  return response.data;
};

const measurementService = {
  async analyzeVideo(video: string | MediaAsset) {
    return upload<RPPGAnalysisResult>('/rppg/analyse', 'video', asMedia(video, 'measurement.mp4', Platform.OS === 'web' ? 'video/webm' : 'video/mp4'));
  },

  async analyzeStressVideo(video: string | MediaAsset) {
    return upload<StressAnalysisResult>('/stress/analyse', 'video', asMedia(video, 'measurement.mp4', Platform.OS === 'web' ? 'video/webm' : 'video/mp4'));
  },

  async analyzeSCG(zAxis: number[], sampleRateHz = 12.5) {
    const response = await apiClient.post<ScgAnalysisResult>('/scg/analyze', {
      z_axis: zAxis,
      sample_rate_hz: sampleRateHz,
      duration_sec: 30,
    });
    return response.data;
  },

  async analyzeBloodPressureVideo(video: string | MediaAsset) {
    return upload<BloodPressureAnalysisResult>('/blood-pressure/analyse', 'video', asMedia(video, 'bp_measurement.mp4', Platform.OS === 'web' ? 'video/webm' : 'video/mp4'));
  },

  async analyzeHeartbeatAudio(media: string | MediaAsset) {
    return upload<any>('/heartbeat/analyze', 'file', asMedia(media, Platform.OS === 'web' ? 'heartbeat.wav' : 'heartbeat.m4a', Platform.OS === 'web' ? 'audio/wav' : 'audio/x-m4a'));
  },
};

export default measurementService;
