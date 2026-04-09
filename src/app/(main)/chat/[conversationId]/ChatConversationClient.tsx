'use client';

import { useParams } from 'next/navigation';
import { MainHome } from '../../page';

export default function ChatConversationClient() {
  const params = useParams<{ conversationId: string | string[] }>();
  const rawConversationId = params?.conversationId;
  const conversationId = Array.isArray(rawConversationId) ? rawConversationId[0] : rawConversationId;

  return <MainHome initialChatId={conversationId} />;
}
