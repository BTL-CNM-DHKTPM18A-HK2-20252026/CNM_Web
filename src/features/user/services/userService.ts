import { apiClient } from './api';

export interface UserResponse {
  user_id: string;
  phone_number: string;
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
   * Find user by phone number
   */
  async getUserByPhone(phone: string): Promise<UserResponse> {
    const result = await apiClient.get(`/users/phone/${phone}`);
    return result; // Result is NOT wrapped in ApiResponse because I used ResponseEntity.ok(response) in Controller
  },

  /**
   * Get current user (me)
   */
  async getMe() {
    return apiClient.get('/users/me');
  }
};
