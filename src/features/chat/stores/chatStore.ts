export interface ChatStoreState {
  selectedConversationId: string | number | null;
  sidebarMode: 'info' | 'search' | null;
}

export const initialChatStoreState: ChatStoreState = {
  selectedConversationId: null,
  sidebarMode: 'info',
};

export function updateSelectedConversation(
  state: ChatStoreState,
  conversationId: string | number | null
): ChatStoreState {
  return {
    ...state,
    selectedConversationId: conversationId,
  };
}

export function updateSidebarMode(
  state: ChatStoreState,
  mode: ChatStoreState['sidebarMode']
): ChatStoreState {
  return {
    ...state,
    sidebarMode: mode,
  };
}
