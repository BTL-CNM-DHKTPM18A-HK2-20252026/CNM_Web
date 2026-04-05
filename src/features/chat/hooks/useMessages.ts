import { useCallback, useState } from 'react';

export type ChatMessage = {
  id: string;
  text: string;
  type?: string;
  [key: string]: unknown;
};

export function useMessages(initialMessages: ChatMessage[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const replaceMessages = useCallback((nextMessages: ChatMessage[]) => {
    setMessages(nextMessages);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    setMessages,
    appendMessage,
    replaceMessages,
    clearMessages,
  };
}
