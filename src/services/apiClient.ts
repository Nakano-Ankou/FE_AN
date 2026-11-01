// Khung cơ bản HTTP Client giao tiếp Backend REST API
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { ApiResponse } from '../types';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:8080';
const DEFAULT_TIMEOUT_MS = 15000;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Bóc tách dữ liệu result từ chuẩn wrapper ApiResponse<T>
export function unwrapApiResponse<T>(response: AxiosResponse<ApiResponse<T> | T>): T {
  const data = response.data;
  if (data && typeof data === 'object' && 'result' in data && 'code' in data) {
    return (data as ApiResponse<T>).result;
  }
  return data as T;
}

export default apiClient;
