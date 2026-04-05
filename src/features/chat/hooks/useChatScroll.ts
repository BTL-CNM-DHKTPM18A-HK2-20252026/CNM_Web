import { useCallback, useRef } from 'react';

export function useChatScroll<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, []);

  return {
    containerRef,
    scrollToBottom,
  };
}
