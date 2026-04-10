import { apiClient } from '@/lib/http/apiClient';
import { clearAccessToken, getAccessToken, setAccessToken } from './authToken';

type LoginResponse = {
  access_token: string;
  expires_in?: number;
  token_type?: string;
};

type IntrospectResponse = {
  valid: boolean;
};

export const authService = {
  /**
   * Login with phone number and password
   * @param username - phone number
   * @param password - user password
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const result = await apiClient.post<LoginResponse>('/auth/login', { username, password });

      // Cleaned up: result is already the data field from ApiResponse
      if (result && result.access_token) {
        setAccessToken(result.access_token);
      }

      return result;
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },

  /**
   * Logout and clear local session
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await apiClient.post('/auth/logout', { accessToken: token });
      } catch (error) {
        console.error('Logout API error:', error);
        // Still clear local even if API fails
      }
    }
    clearAccessToken();
  },

  setToken(token: string) {
    setAccessToken(token);
  },

  clearToken() {
    clearAccessToken();
  },

  /**
   * Get the stored access token
   */
  getToken(): string | null {
    return getAccessToken();
  },

  /**
   * Check if a phone number exists in the system
   * @param phoneNumber - phone number to check
   */
  async checkPhone(phoneNumber: string): Promise<boolean> {
    try {
      const result = await apiClient.post<boolean>('/auth/check-phone', { phoneNumber });
      return result;
    } catch (error) {
      console.error('Check Phone Error:', error);
      throw error;
    }
  },

  /**
   * Check if an email exists in the system
   * @param email - email to check
   */
  async checkEmail(email: string): Promise<boolean> {
    try {
      const result = await apiClient.post<boolean>('/auth/check-email', { email });
      return result;
    } catch (error) {
      console.error('Check Email Error:', error);
      throw error;
    }
  },

  /**
   * Register a new user
   * @param data - registration data
   */
  async register(data: { phoneNumber: string; email?: string; password: string; displayName: string; firstName?: string; lastName?: string; dob?: Date; gender?: string }): Promise<unknown> {
    try {
      const result = await apiClient.post('/users', data);
      return result; 
    } catch (error) {
      console.error('Registration Error:', error);
      throw error;
    }
  },

  /**
   * Verify email OTP.
   */
  async verifyOtp(email: string, otp: string): Promise<unknown> {
    try {
      return await apiClient.post('/auth/verify-otp', { email, otp });
    } catch (error) {
      console.error('Verify OTP Error:', error);
      throw error;
    }
  },

  /**
   * Resend verification OTP.
   */
  async resendOtp(email: string): Promise<unknown> {
    try {
      return await apiClient.post('/auth/resend-otp', { email });
    } catch (error) {
      console.error('Resend OTP Error:', error);
      throw error;
    }
  },

  /**
   * Send OTP for forgot-password flow.
   */
  async sendPasswordResetOtp(email: string): Promise<unknown> {
    try {
      return await apiClient.post('/auth/forgot-password/send-otp', { email });
    } catch (error) {
      console.error('Send Password Reset OTP Error:', error);
      throw error;
    }
  },

  /**
   * Reset password using email + OTP.
   */
  async resetPassword(email: string, otp: string, newPassword: string): Promise<unknown> {
    try {
      return await apiClient.post('/auth/forgot-password/reset', { email, otp, newPassword });
    } catch (error) {
      console.error('Reset Password Error:', error);
      throw error;
    }
  },

  /**
   * introspect token
   */
  async introspect(token: string): Promise<IntrospectResponse> {
    try {
      const result = await apiClient.post<IntrospectResponse>('/auth/introspect', { accessToken: token });
      return result; // IntrospectResponse { valid: boolean }
    } catch (error) {
      console.error('Introspect Error:', error);
      throw error;
    }
  },

  /**
   * Get a unique QR session UUID from the server
   */
  async getQrSession(): Promise<string> {
    try {
      const result = await apiClient.get<string>('/auth/qr-session');
      return result; // UUID string
    } catch (error) {
      console.error('Get QR Session Error:', error);
      throw error;
    }
  }
};
