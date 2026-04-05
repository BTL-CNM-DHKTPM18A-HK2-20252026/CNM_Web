import { clearAccessToken, getAccessToken } from '@/features/auth/services/authToken';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

/**
 * Common API client for handling all network requests
 */
export const apiClient = {
  /**
   * Get common headers (e.g., Auth token)
   */
  getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  },

  /**
   * Generic request handler
   */
  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Handle 204 No Content
      if (response.status === 204) {
        return { success: true } as T;
      }

      // Read text first to check if empty
      const text = await response.text();
      const result = text ? JSON.parse(text) : { success: true };

      if (!response.ok) {
        // Auto logout on 401 (Unauthorized) or 404 on profile endpoint (User no longer exists in DB)
        if (typeof window !== 'undefined' && (response.status === 401 || (response.status === 404 && endpoint.includes('/users/me')))) {
          console.warn("Session expired or user not found. Logging out...");
          clearAccessToken();
          // Optional: trigger a full page reload or a custom event to update app state
          if (endpoint.includes('/users/me')) {
            window.location.href = '/'; // Simple hard redirect to login
          }
        }
        throw new Error(result.message || `Request failed with status ${response.status}`);
      }

      // If backend uses ApiResponse wrapper, return the data field
      if (result && typeof result === 'object' && 'success' in result) {
        if (!result.success) {
          throw new Error(result.message || "Request failed");
        }
        return (result.data !== undefined ? result.data : result) as T;
      }

      return result as T;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },

  /**
   * HTTP Methods
   */
  get<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T = any>(endpoint: string, body: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put<T = any>(endpoint: string, body: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  patch<T = any>(endpoint: string, body: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
};
