import apiClient from './apiClient';
import {MeasurementHistoryRecord} from '../storage/localHistory';

export type MeasurementAnalyzeType =
  | 'face_rppg'
  | 'stress'
  | 'blood_pressure'
  | 'heartbeat';

export type MeasurementResultPayload = Omit<MeasurementHistoryRecord, 'id'> & {
  id?: string;
};

interface AnalyzePayload {
  type: MeasurementAnalyzeType;
  duration: number;
  sessionId?: string;
  startedAt?: string;
}

export const measurementService = {
  async analyze(payload: AnalyzePayload) {
    const response = await apiClient.post<{data: MeasurementResultPayload}>(
      '/ai/analyze',
      payload,
    );
    return response.data.data;
  },
};
