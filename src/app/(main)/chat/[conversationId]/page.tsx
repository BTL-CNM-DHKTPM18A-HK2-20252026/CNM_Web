'use client';

import { useParams } from 'next/navigation';
import { MainHome } from '../../page';

// Required for Next.js static export (output: 'export').
// Returns empty array — actual routing is handled client-side via
// CloudFront 404 → index.html redirect.
export function generateStaticParams() {
  return [];
}

export const dynamicParams = false;

export default function ChatConversationPage() {
  const params = useParams<{ conversationId: string | string[] }>();
  const rawConversationId = params?.conversationId;
  const conversationId = Array.isArray(rawConversationId) ? rawConversationId[0] : rawConversationId;

  return <MainHome initialChatId={conversationId} />;
}
