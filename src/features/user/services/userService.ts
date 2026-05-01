import { apiClient } from '@/lib/http/apiClient';

export interface UserResponse {
  user_id: string;
  phone_number: string;
  gmail: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  account_status: string;
  friendship_status?: string; // PENDING, ACCEPTED, DECLINED, BLOCKED
  is_requester?: boolean;
}

export const userService = {
  /**
   * Find user by email
   */
  async getUserByEmail(email: string): Promise<UserResponse> {
    const result = await apiClient.get(`/users/email/${encodeURIComponent(email)}`);
    return result;
  },

  /**
   * Find user by phone number
   */
  async getUserByPhone(phoneNumber: string): Promise<UserResponse> {
    const result = await apiClient.get(`/users/phone/${encodeURIComponent(phoneNumber)}`);
    return result;
  },

  /**
   * Get current user (me)
   */
  async getMe() {
    return apiClient.get('/users/me');
  },

  /**
   * Update current user profile
   */
  async updateProfile(data: any) {
    return apiClient.patch('/users/me', data);
  }
};
