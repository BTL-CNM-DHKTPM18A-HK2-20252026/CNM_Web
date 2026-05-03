import { apiClient } from '@/lib/http/apiClient';
import type { UserResponse } from '@/features/user';

export interface FriendSuggestion {
  userId: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  mutualFriendCount: number;
  mutualFriendNames?: string[];
  reason?: string; // e.g. '3 bạn chung'
}

export interface FriendRequestResponse {
  requestId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatarUrl?: string;
  status: string;
  message?: string;
  createdAt: string;
}

export const friendService = {
  /**
   * Get friends list
   */
  async getFriends(): Promise<UserResponse[]> {
    return apiClient.get('/friends');
  },

  /**
   * Send a friend request
   */
  async sendRequest(userId: string, message?: string) {
    return apiClient.post('/friends/request', { userId, message });
  },

  /**
   * Unfriend or cancel a pending request
   */
  async unfriend(userId: string) {
    return apiClient.request('/friends/unfriend', {
      method: 'DELETE',
      body: JSON.stringify({ userId })
    });
  },

  /**
   * Get received requests
   */
  async getReceivedRequests(): Promise<FriendRequestResponse[]> {
    return apiClient.get('/friends/requests/received');
  },

  /**
   * Get sent requests
   */
  async getSentRequests(): Promise<FriendRequestResponse[]> {
    return apiClient.get('/friends/requests/sent');
  },

  /**
   * Accept friend request
   */
  async acceptRequest(requestId: string) {
    return apiClient.put(`/friends/request/${requestId}/accept`, {});
  },

  /**
   * Reject friend request
   */
  async rejectRequest(requestId: string) {
    return apiClient.put(`/friends/request/${requestId}/reject`, {});
  },

  /**
   * Block a user
   */
  async blockUser(userId: string) {
    return apiClient.post('/friends/block', { userId });
  },

  /**
   * Get friend suggestions (BFS level-2 mutual friends + scoring)
   */
  async getSuggestions(limit = 10): Promise<FriendSuggestion[]> {
    return await apiClient.get(`/friends/suggestions?limit=${limit}`);
  },

  /**
   * Follow a user (one-way)
   */
  async followUser(userId: string) {
    return apiClient.post('/friends/follow', { userId });
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string) {
    return apiClient.post('/friends/unfollow', { userId });
  },

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(userId: string) {
    return apiClient.post('/friends/suggestions/dismiss', { userId });
  },

  /**
   * Get followers of a user (uses friends list as proxy — same social graph)
   */
  async getFollowers(userId?: string): Promise<UserResponse[]> {
    if (userId) {
      // For other users, get their friends via posts/user (no dedicated endpoint)
      return [];
    }
    return apiClient.get('/friends');
  },

  /**
   * Get following list (friends sent requests from)
   */
  async getFollowing(): Promise<UserResponse[]> {
    return apiClient.get('/friends');
  },

  /**
   * Check friendship status with a user
   */
  async getFriendshipStatus(targetUserId: string): Promise<{ status: 'NONE' | 'PENDING' | 'ACCEPTED' | 'FOLLOWING' | 'BLOCKED'; isRequester?: boolean }> {
    try {
      const result = await apiClient.get<any>(`/users/${encodeURIComponent(targetUserId)}`);
      const status = result?.friendship_status || result?.friendshipStatus || 'NONE';
      return { status, isRequester: result?.is_requester ?? false };
    } catch {
      return { status: 'NONE' };
    }
  },
};
