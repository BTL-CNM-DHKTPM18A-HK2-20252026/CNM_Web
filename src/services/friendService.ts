import { apiClient } from './api';
import { UserResponse } from './userService';

export interface FriendRequestResponse {
  requestId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatarUrl?: string;
  status: string;
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
  async sendRequest(userId: string) {
    return apiClient.post('/friends/request', { userId });
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
  }
};
