import { apiClient } from './api';

export const authService = {
  /**
   * Login with username and password
   * @param username - username, email, or phone
   * @param password - user password
   */
  async login(username: string, password: string) {
    try {
      const result = await apiClient.post('/auth/login', { username, password });

      // Temporarily store access token in localStorage
      if (result.data && result.data.access_token) {
        localStorage.setItem('accessToken', result.data.access_token);
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
        await apiClient.post('/auth/logout', { token });
      } catch (error) {
        console.error('Logout API error:', error);
        // Still clear local even if API fails
      }
    }
    localStorage.removeItem('accessToken');
  },

  /**
   * Get the stored access token
   */
  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }
};
