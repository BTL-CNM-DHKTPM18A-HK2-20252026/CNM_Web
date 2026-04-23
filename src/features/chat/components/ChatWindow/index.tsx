import React from 'react';
import { ChatComposer } from '@/features/chat/components/ChatWindow/ChatComposer';
import { ChatHeader } from '@/features/chat/components/ChatWindow/ChatHeader';
import { ChatMessageList } from '@/features/chat/components/ChatWindow/ChatMessageList';
import { ChatModalHost } from '@/features/chat/components/ChatWindow/ChatModalHost';
import type { ChatWindowProps } from '@/features/chat/components/ChatWindow/types';
import { useChatWindow } from '@/features/chat/components/ChatWindow/useChatWindow';

export function ChatWindow(props: ChatWindowProps) {
  const vm = useChatWindow(props);

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] transition-colors duration-200 overflow-x-hidden">
      <ChatHeader vm={vm} />
      <ChatMessageList vm={vm} />
      <ChatComposer vm={vm} />
      <ChatModalHost vm={vm} />
    </div>
  );
}

export default ChatWindow;
