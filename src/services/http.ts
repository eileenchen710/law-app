import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import Taro from '@tarojs/taro';

type MaybeRecord = Record<string, unknown> | undefined;

type ApiErrorPayload = {
  error?: string;
  message?: string;
  code?: string | number;
  [key: string]: unknown;
};

export interface ApiError {
  status?: number;
  message: string;
  data?: ApiErrorPayload;
  config: AxiosRequestConfig;
  originalError: AxiosError<ApiErrorPayload>;
}

const runtimeEnv = (typeof globalThis !== 'undefined' && (globalThis as any).process && (globalThis as any).process.env)
  ? ((globalThis as any).process.env as Record<string, string | undefined>)
  : ({} as Record<string, string | undefined>);
const baseURL = runtimeEnv.TARO_APP_API_BASE_URL || '';
const timeout = Number(runtimeEnv.TARO_APP_API_TIMEOUT) || 15000;

const http: AxiosInstance = axios.create({
  baseURL,
  timeout,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  const headers = (nextConfig.headers || {}) as MaybeRecord;

  // 业务 token，从本地存储读取。若后续命名调整，只需改这里。
  const token = Taro.getStorageSync('auth_token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  nextConfig.headers = headers;
  return nextConfig;
}, (error) => Promise.reject(normalizeError(error)));

http.interceptors.response.use((response: AxiosResponse) => response, (error: AxiosError<ApiErrorPayload>) => {
  const normalized = normalizeError(error);

  if (normalized.status === 401) {
    Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 }).catch(() => undefined);
  } else if (normalized.status && normalized.status >= 500) {
    Taro.showToast({ title: '服务器开了个小差', icon: 'none', duration: 2000 }).catch(() => undefined);
  }

  return Promise.reject(normalized);
});

function normalizeError(error: AxiosError<ApiErrorPayload>): ApiError {
  const status = error.response?.status;
  const data = error.response?.data;
  const message = data?.error || data?.message || error.message || '请求失败';

  return {
    status,
    message,
    data,
    config: error.config || {},
    originalError: error,
  };
}

export function request<T>(config: AxiosRequestConfig): Promise<T> {
  return http.request<ApiErrorPayload, AxiosResponse<T>>(config).then((res) => res.data);
}

export default http;
