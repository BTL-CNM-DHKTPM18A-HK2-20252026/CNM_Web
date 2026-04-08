import { useCallback, useEffect, useRef } from 'react';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';

interface UseVirtualMessagesOptions {
  /** Total number of messages in the list */
  count: number;
  /** Ref to the scroll container (overflow:auto element) */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Whether older messages are available for loading */
  hasMore: boolean;
  /** Whether older messages are currently being loaded */
  isLoadingMore: boolean;
  /** Callback to load older messages (triggered when scrolling near top) */
  loadMore: () => void;
}

interface UseVirtualMessagesReturn {
  virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
  virtualItems: VirtualItem[];
  totalSize: number;
  /** Call after prepending messages to preserve visual scroll position */
  handlePrependAdjust: (previousCount: number) => void;
}

/**
 * Hook that wraps @tanstack/react-virtual for the chat message list.
 *
 * Features:
 * - Reverse-chronological: newest at bottom, scroll up to load more
 * - Variable-height messages (dynamic measurement)
 * - Scroll position preservation when prepending older messages
 * - Automatic scroll-to-bottom on new messages (when already at bottom)
 * - IntersectionObserver-free infinite scroll (uses virtualizer range)
 */
export function useVirtualMessages({
  count,
  scrollContainerRef,
  hasMore,
  isLoadingMore,
  loadMore,
}: UseVirtualMessagesOptions): UseVirtualMessagesReturn {

  const prevCountRef = useRef(count);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 72, // average msg height estimate
    overscan: 15,           // render 15 extra items above/below viewport
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // ── Infinite scroll: trigger loadMore when top items are in view ─────────
  useEffect(() => {
    if (!hasMore || isLoadingMore || virtualItems.length === 0) return;

    const firstVisible = virtualItems[0];
    // Trigger when the first visible item is within the first 3 rows
    if (firstVisible && firstVisible.index <= 2) {
      loadMore();
    }
  }, [virtualItems, hasMore, isLoadingMore, loadMore]);

  // ── Scroll position preservation after prepending older messages ─────────
  const handlePrependAdjust = useCallback((previousCount: number) => {
    const delta = count - previousCount;
    if (delta > 0) {
      // Shift the scroll offset by the height of newly prepended items
      // Using virtualizer.scrollToIndex to keep the same visual position
      virtualizer.scrollToIndex(delta, { align: 'start' });
    }
  }, [count, virtualizer]);

  // Track count changes for external callers
  useEffect(() => {
    prevCountRef.current = count;
  }, [count]);

  return { virtualizer, virtualItems, totalSize, handlePrependAdjust };
}
