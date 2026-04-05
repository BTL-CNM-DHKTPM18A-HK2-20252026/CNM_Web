import { apiClient } from '@/lib/http/apiClient';
import { clearAccessToken, getAccessToken, setAccessToken } from './authToken';

export const authService = {
  /**
   * Login with username and password
   * @param username - username, email, or phone
   * @param password - user password
   */
  async login(username: string, password: string) {
    try {
      const result = await apiClient.post('/auth/login', { username, password });

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
  async logout() {
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
  getToken() {
    return getAccessToken();
  },

  /**
   * Check if a phone number exists in the system
   * @param phoneNumber - phone number to check
   */
  async checkPhoneNumber(phoneNumber: string) {
    try {
      const result = await apiClient.post('/auth/check-phone-number', { phoneNumber });
      return result; // result is the boolean data
    } catch (error) {
      console.error('Check Phone Error:', error);
      throw error;
    }
  },

  /**
   * Register a new user
   * @param data - registration data
   */
  async register(data: { phoneNumber: string; email: string; password: string; displayName: string; firstName?: string; lastName?: string; dob?: Date; gender?: string }) {
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
  async verifyOtp(email: string, otp: string) {
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
  async resendOtp(email: string) {
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
  async sendPasswordResetOtp(email: string) {
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
  async resetPassword(email: string, otp: string, newPassword: string) {
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
  async introspect(token: string) {
    try {
      const result = await apiClient.post('/auth/introspect', { accessToken: token });
      return result; // IntrospectResponse { valid: boolean }
    } catch (error) {
      console.error('Introspect Error:', error);
      throw error;
    }
  },

  /**
   * Get a unique QR session UUID from the server
   */
  async getQrSession() {
    try {
      const result = await apiClient.get('/auth/qr-session');
      return result; // UUID string
    } catch (error) {
      console.error('Get QR Session Error:', error);
      throw error;
    }
  }
};
