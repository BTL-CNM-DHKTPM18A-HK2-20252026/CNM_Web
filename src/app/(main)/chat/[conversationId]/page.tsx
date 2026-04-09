import ChatConversationClient from './ChatConversationClient';

export async function generateStaticParams() {
  return [{ conversationId: '_' }];
}

export default function ChatConversationPage() {
  return <ChatConversationClient />;
}

