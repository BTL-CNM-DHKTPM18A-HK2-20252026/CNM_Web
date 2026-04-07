import { apiClient } from '@/lib/http/apiClient';

export interface UserResponse {
  user_id: string;
  email: string;
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
   * Get current user (me)
   */
  async getMe() {
    return apiClient.get('/users/me');
  }
};
