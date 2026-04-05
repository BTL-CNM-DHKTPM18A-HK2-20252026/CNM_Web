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

  searchMessages(params: { query: string; conversationId: string | number; size?: number }) {
    const size = params.size ?? 20;
    return apiClient.get(
      `/search/messages?q=${encodeURIComponent(params.query)}&conversationId=${params.conversationId}&size=${size}`
    );
  },
};
