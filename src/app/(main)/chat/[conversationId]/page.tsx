import ChatConversationClient from './ChatConversationClient';

// Required for Next.js static export (output: 'export').
// Returns empty array — routing handled client-side via CloudFront 404 → index.html.
export function generateStaticParams() {
  return [];
}

export const dynamicParams = false;

export default function ChatConversationPage() {
  return <ChatConversationClient />;
}

