import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface MeasurementResult {
  hr_fft: number;
  duration: number;
  fps: number;
  n_frames: number;
  face_detected: boolean;
  timestamp?: string;
  [key: string]: any; // allow extended fields from different measurement types
}

interface MeasurementState {
  currentResult: MeasurementResult | null;
  history: MeasurementResult[];
  loading: boolean;
  error: string | null;
}

const initialState: MeasurementState = {
  currentResult: null,
  history: [],
  loading: false,
  error: null,
};

const measurementSlice = createSlice({
  name: 'measurement',
  initialState,
  reducers: {
    setMeasurementLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setMeasurementResult: (state, action: PayloadAction<MeasurementResult>) => {
      state.currentResult = action.payload;
      state.history.unshift({
        ...action.payload,
        timestamp: new Date().toISOString(),
      });
      state.loading = false;
      state.error = null;
    },
    setMeasurementError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearMeasurementResult: state => {
      state.currentResult = null;
    },
  },
});

export const {
  setMeasurementLoading,
  setMeasurementResult,
  setMeasurementError,
  clearMeasurementResult,
} = measurementSlice.actions;

export default measurementSlice.reducer;
