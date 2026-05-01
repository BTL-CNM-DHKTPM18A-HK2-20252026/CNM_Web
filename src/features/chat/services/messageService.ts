import { apiClient } from '@/lib/http/apiClient';

export const messageService = {
  getConversations() {
    return apiClient.get('/conversations');
  },

  ensureSelfConversation() {
    return apiClient.get('/conversations/self');
  },

  ensureAiConversation() {
    return apiClient.get('/messages/ai/conversation');
  },

  searchMessages(params: { query: string; conversationId: string | number; size?: number; senderId?: string; fromDate?: string; toDate?: string }) {
    const size = params.size ?? 50;
    let url = `/search/messages?q=${encodeURIComponent(params.query)}&conversationId=${params.conversationId}&size=${size}`;
    if (params.senderId) url += `&senderId=${encodeURIComponent(params.senderId)}`;
    if (params.fromDate) url += `&fromDate=${encodeURIComponent(params.fromDate)}`;
    if (params.toDate) url += `&toDate=${encodeURIComponent(params.toDate)}`;
    return apiClient.get(url);
  },
};
