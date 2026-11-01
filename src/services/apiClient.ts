// Hạ tầng HTTP Client trung tâm: Interceptors, chuẩn hóa ApiError và bóc tách ApiResponse<T>
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  ApiErrorCode,
  type ApiError,
  type ApiErrorResponse,
  type ApiResponse,
} from '../types';

export const AUTH_STORAGE_KEY = 'hnag-auth-storage';
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:8080';
const DEFAULT_TIMEOUT_MS = 15000;

// Các endpoint xác thực công khai không kích hoạt xóa phiên/redirect khi gặp HTTP 401
const PUBLIC_AUTH_ENDPOINTS = [
  '/api/v1/auth/token',
  '/api/v1/auth/introspect',
  '/api/v1/auth/send-otp',
  '/api/v1/auth/verify-otp',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
] as const;

const GUEST_OTP_PATHS = ['/verify', '/forgot-password', '/reset-password'] as const;

export interface ApiClientAuthHooks {
  getToken?: () => string | null;
  onUnauthorized?: (error: ApiError) => void;
}

let authHooks: ApiClientAuthHooks = {};

// Đăng ký callback lấy token và xử lý HTTP 401 từ tầng quản lý phiên (userStore/SessionBootstrap)
export function configureApiClient(hooks: ApiClientAuthHooks): void {
  authHooks = { ...authHooks, ...hooks };
}

// Đọc JWT token từ hook hoặc từ localStorage (hnag-auth-storage)
export function getAccessToken(): string | null {
  if (authHooks.getToken) {
    return authHooks.getToken();
  }
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'state' in parsed &&
      typeof (parsed as { state?: { token?: unknown } }).state?.token === 'string'
    ) {
      return (parsed as { state: { token: string } }).state.token;
    }
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

// Xóa token lưu trong localStorage khi phiên đăng nhập hết hạn
export function clearStoredAccessToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Bỏ qua lỗi khi trình duyệt chặn quyền truy cập storage
  }
}

function isPublicAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

function isGuestOtpRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return GUEST_OTP_PATHS.some((path) => window.location.pathname.startsWith(path));
}

// Kiểm tra một đối tượng lỗi có phải là ApiError đã chuẩn hóa hay không
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    'message' in error
  );
}

// Chuẩn hóa lỗi từ Axios/Backend (ApiErrorResponse) hoặc lỗi mạng về ApiError
export function normalizeApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const axiosErr = error as AxiosError<ApiErrorResponse>;
    const status = axiosErr.response?.status ?? 0;
    const data = axiosErr.response?.data;
    const code =
      typeof data?.code === 'number'
        ? data.code
        : status === 401
          ? ApiErrorCode.UNAUTHENTICATED
          : status === 403
            ? ApiErrorCode.UNAUTHORIZED
            : ApiErrorCode.UNCATEGORIZED_EXCEPTION;
    const message =
      typeof data?.message === 'string' && data.message.trim().length > 0
        ? data.message
        : axiosErr.code === 'ECONNABORTED'
          ? 'Yêu cầu tới máy chủ quá thời gian chờ, vui lòng thử lại.'
          : !axiosErr.response
            ? 'Không thể kết nối tới máy chủ, vui lòng kiểm tra mạng.'
            : 'Đã xảy ra lỗi khi xử lý yêu cầu.';
    return { status, code, message, raw: data ?? axiosErr.toJSON() };
  }
  return {
    status: 0,
    code: ApiErrorCode.UNCATEGORIZED_EXCEPTION,
    message: error instanceof Error && error.message ? error.message : 'Đã xảy ra lỗi không xác định.',
    raw: error,
  };
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: tự động đính kèm Authorization: Bearer <token>
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const isTokenOrIntrospect =
    config.url?.includes('/api/v1/auth/token') || config.url?.includes('/api/v1/auth/introspect');
  if (!isTokenOrIntrospect) {
    const token = getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response Interceptor: bóc tách ApiResponse<T> và kích hoạt callback khi gặp HTTP 401 hợp lệ
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'code' in payload && typeof payload.code === 'number') {
      if (payload.code !== ApiErrorCode.SUCCESS) {
        const appError: ApiError = {
          status: response.status,
          code: payload.code,
          message: payload.message || 'Yêu cầu không thành công.',
          raw: payload,
        };
        return Promise.reject(appError);
      }
      if ('result' in payload) {
        response.data = payload.result as ApiResponse<unknown>;
      }
    }
    return response;
  },
  (error: unknown) => {
    const normalized = normalizeApiError(error);
    const requestUrl = axios.isAxiosError(error) ? error.config?.url : undefined;
    // Chỉ kích hoạt khi HTTP status === 401 (loại trừ HTTP 400 USER_EXISTED, LOGIN_FAILED 1006 và 4 API OTP/Quên mật khẩu)
    const shouldTriggerUnauthorized =
      normalized.status === 401 &&
      normalized.code !== ApiErrorCode.LOGIN_FAILED &&
      normalized.code !== ApiErrorCode.USER_EXISTED &&
      !isPublicAuthEndpoint(requestUrl) &&
      !isGuestOtpRoute();

    if (shouldTriggerUnauthorized) {
      clearStoredAccessToken();
      authHooks.onUnauthorized?.(normalized);
    }
    return Promise.reject(normalized);
  },
);

// Trích xuất dữ liệu kết quả T (hỗ trợ cả response đã được Interceptor bóc tách hoặc ApiResponse<T> gốc)
export function unwrapApiResponse<T>(response: AxiosResponse<ApiResponse<T> | T>): T {
  const data = response.data;
  if (data && typeof data === 'object' && 'result' in data && 'code' in data) {
    return (data as ApiResponse<T>).result;
  }
  return data as T;
}

// Các hàm gọi HTTP có kiểu dữ liệu tường minh trả về trực tiếp Promise<T>
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<ApiResponse<T> | T>(url, config);
  return unwrapApiResponse<T>(response);
}

export async function apiPost<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.post<ApiResponse<T> | T>(url, data, config);
  return unwrapApiResponse<T>(response);
}

export async function apiPut<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.put<ApiResponse<T> | T>(url, data, config);
  return unwrapApiResponse<T>(response);
}

export async function apiPatch<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.patch<ApiResponse<T> | T>(url, data, config);
  return unwrapApiResponse<T>(response);
}

export async function apiDelete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.delete<ApiResponse<T> | T>(url, config);
  return unwrapApiResponse<T>(response);
}

export default apiClient;
