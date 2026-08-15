import axios from 'axios';
import {Platform} from 'react-native';

const getBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'android') return 'http://10.0.2.2:6789/api';
  return 'http://localhost:6789/api';
};

const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 120000,
  headers: {'Content-Type': 'application/json'},
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
