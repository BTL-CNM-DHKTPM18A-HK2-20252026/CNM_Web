/* eslint-disable @typescript-eslint/no-explicit-any */

import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/features/auth/services/authToken';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type ApiClientRequestConfig<D = unknown> = AxiosRequestConfig<D> & {
  body?: BodyInit | null;
};

interface ApiClient {
  request(endpoint: string, options?: ApiClientRequestConfig): Promise<any>;
  request<T>(endpoint: string, options?: ApiClientRequestConfig): Promise<T>;

  get(endpoint: string, options?: ApiClientRequestConfig): Promise<any>;
  get<T>(endpoint: string, options?: ApiClientRequestConfig): Promise<T>;

  post(endpoint: string, body: any, options?: ApiClientRequestConfig): Promise<any>;
  post<T>(endpoint: string, body: any, options?: ApiClientRequestConfig): Promise<T>;

  put(endpoint: string, body: any, options?: ApiClientRequestConfig): Promise<any>;
  put<T>(endpoint: string, body: any, options?: ApiClientRequestConfig): Promise<T>;

  delete(endpoint: string, options?: ApiClientRequestConfig): Promise<any>;
  delete<T>(endpoint: string, options?: ApiClientRequestConfig): Promise<T>;

  patch(endpoint: string, body: any, options?: ApiClientRequestConfig): Promise<any>;
  patch<T>(endpoint: string, body: any, options?: ApiClientRequestConfig): Promise<T>;
}

const buildUrl = (endpoint: string) =>
  endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

const parseErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as (ApiEnvelope<unknown> & { details?: Record<string, string> }) | undefined;
    if (payload) {
      // Extract field-level validation errors from backend ErrorResponse.details
      if (payload.details && typeof payload.details === 'object') {
        const fieldErrors = Object.values(payload.details).filter(Boolean);
        if (fieldErrors.length > 0) {
          return fieldErrors.join('; ');
        }
      }
      if (payload.message) {
        return payload.message;
      }
    }
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Request failed';
};

const toError = (error: unknown) => new Error(parseErrorMessage(error));

const normalizeBody = (body: BodyInit | null | undefined) => {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  return body;
};

const normalizeConfig = <D = unknown>(options: ApiClientRequestConfig<D> = {}) => {
  const { body, data, headers, ...rest } = options;
  const normalizedData = data !== undefined ? data : normalizeBody(body);

  return {
    ...rest,
    data: normalizedData,
    headers,
    withCredentials: options.withCredentials ?? true,
  } as AxiosRequestConfig;
};

const unwrapResponse = <T>(response: AxiosResponse<ApiEnvelope<T> | T>) => {
  if (response.status === 204) {
    return ({ success: true } as unknown) as T;
  }

  const result = response.data;
  if (result && typeof result === 'object' && 'success' in (result as ApiEnvelope<T>)) {
    const envelope = result as ApiEnvelope<T>;
    if (!envelope.success) {
      throw new Error(envelope.message || 'Request failed');
    }
    return (envelope.data !== undefined ? envelope.data : (result as unknown as T)) as T;
  }

  return result as T;
};

const shouldTryRefresh = (error: AxiosError, config?: RetriableRequestConfig) => {
  if (!config || error.response?.status !== 401 || config._retry) {
    return false;
  }

  const url = config.url || '';
  return !url.includes('/auth/login') && !url.includes('/auth/refresh') && !url.includes('/auth/logout');
};

let refreshPromise: Promise<string> | null = null;

const requestAccessTokenRefresh = async () => {
  const response = await axios.post<ApiEnvelope<{ access_token?: string }> | { access_token?: string }>(
    `${BASE_URL}/auth/refresh`,
    null,
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const payload = unwrapResponse<{ access_token?: string }>(response);
  const newAccessToken = payload?.access_token;

  if (!newAccessToken) {
    throw new Error('Không nhận được access token mới từ /auth/refresh');
  }

  setAccessToken(newAccessToken);
  return newAccessToken;
};

export const httpClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (!token) {
    return config;
  }

  const headers = config.headers instanceof AxiosHeaders
    ? config.headers
    : new AxiosHeaders(config.headers as Record<string, string> | undefined);

  headers.set('Authorization', `Bearer ${token}`);
  config.headers = headers;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableRequestConfig | undefined;

    if (!config) {
      return Promise.reject(toError(error));
    }

    if (!shouldTryRefresh(error, config)) {
      if (config.url?.includes('/users/me') && error.response?.status === 404 && typeof window !== 'undefined') {
        clearAccessToken();
        window.location.href = '/';
      }
      return Promise.reject(toError(error));
    }

    config._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = requestAccessTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      const headers = config.headers instanceof AxiosHeaders
        ? config.headers
        : new AxiosHeaders(config.headers as Record<string, string> | undefined);

      headers.set('Authorization', `Bearer ${newAccessToken}`);
      config.headers = headers;

      return httpClient(config);
    } catch (refreshError) {
      clearAccessToken();
      return Promise.reject(toError(refreshError));
    }
  }
);

export const apiClient: ApiClient = {
  async request<T = any>(endpoint: string, options: ApiClientRequestConfig = {}): Promise<T> {
    try {
      const response = await httpClient.request<ApiEnvelope<T> | T>({
        url: buildUrl(endpoint),
        ...normalizeConfig(options),
      });
      return unwrapResponse<T>(response);
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw toError(error);
    }
  },

  get<T = unknown>(endpoint: string, options?: ApiClientRequestConfig) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T = any>(endpoint: string, body: any, options?: ApiClientRequestConfig) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      data: body,
    });
  },

  put<T = any>(endpoint: string, body: any, options?: ApiClientRequestConfig) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      data: body,
    });
  },

  delete<T = any>(endpoint: string, options?: ApiClientRequestConfig) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  patch<T = any>(endpoint: string, body: any, options?: ApiClientRequestConfig) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      data: body,
    });
  },
};
