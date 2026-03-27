import { apiClient } from './api';

export interface UserStatusResponse {
    userId: string;
    online: boolean;
    lastSeen: string | null;
}

/**
 * Service gọi REST API trạng thái hoạt động (Presence).
 * Dùng cho các trường hợp cần fetch thủ công (không qua WebSocket).
 */
export const presenceService = {
    /** Lấy trạng thái online/offline của tất cả bạn bè */
    getFriendsStatus: (): Promise<UserStatusResponse[]> =>
        apiClient.get('/presence/friends'),

    /** Kiểm tra trạng thái 1 user */
    getUserStatus: (userId: string): Promise<UserStatusResponse> =>
        apiClient.get(`/presence/${userId}`),

    /** Batch query trạng thái nhiều user (members group chat) */
    getBulkStatus: (ids: string[]): Promise<Record<string, boolean>> =>
        apiClient.get(`/presence/bulk?ids=${ids.join(',')}`),
};
