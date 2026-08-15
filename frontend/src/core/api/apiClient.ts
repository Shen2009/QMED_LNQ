import axios from 'axios';
import {Platform} from 'react-native';
import Constants from 'expo-constants';

const getExpoHost = () => {
  const constants = Constants as any;
  const hostUri =
    constants.expoConfig?.hostUri ||
    constants.manifest2?.extra?.expoGo?.debuggerHost ||
    constants.manifest?.debuggerHost;

  if (!hostUri) return null;
  return String(hostUri).replace(/^https?:\/\//, '').split(':')[0];
};

const getBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (Platform.OS === 'web') return 'http://localhost:6789/api';

  // Expo Go exposes the Metro host. Reuse it so a physical phone reaches
  // the backend on the same LAN instead of using the emulator-only 10.0.2.2.
  const expoHost = getExpoHost();
  if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
    return `http://${expoHost}:6789/api`;
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:6789/api';
  return 'http://localhost:6789/api';
};

const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 120000,
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    const detail = error?.response?.data?.detail;
    if (detail) {
      error.message = typeof detail === 'string' ? detail : JSON.stringify(detail);
    } else if (!error?.response) {
      error.message = 'Khong ket noi duoc backend. Hay khoi dong Q-Med API tai cong 6789.';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
