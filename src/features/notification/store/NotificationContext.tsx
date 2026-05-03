'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { notificationService } from '../services/notificationService';
import type { NotificationDTO } from '../types';

// ──────────────────────────────────────────────────────────────────────────
//  Reducer state
// ──────────────────────────────────────────────────────────────────────────

interface State {
  items: NotificationDTO[];
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  page: number;
  initialized: boolean;
}

type Action =
  | { type: 'LOADING_INITIAL' }
  | { type: 'LOADED_INITIAL'; items: NotificationDTO[]; hasMore: boolean; unreadCount: number }
  | { type: 'LOADING_MORE' }
  | { type: 'LOADED_MORE'; items: NotificationDTO[]; hasMore: boolean }
  | { type: 'PUSH_REALTIME'; item: NotificationDTO }
  | { type: 'MARK_READ'; id: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'REMOVE'; id: string }
  | { type: 'UPDATE_ACTION'; id: string; status: 'ACCEPTED' | 'REJECTED' | 'PENDING' }
  | { type: 'SET_UNREAD_COUNT'; count: number }
  | { type: 'RESET' };

const initial: State = {
  items: [],
  unreadCount: 0,
  loading: false,
  loadingMore: false,
  hasMore: true,
  page: 0,
  initialized: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING_INITIAL':
      return { ...state, loading: true };
    case 'LOADED_INITIAL':
      return {
        ...state,
        items: action.items,
        hasMore: action.hasMore,
        unreadCount: action.unreadCount,
        loading: false,
        page: 0,
        initialized: true,
      };
    case 'LOADING_MORE':
      return { ...state, loadingMore: true };
    case 'LOADED_MORE':
      return {
        ...state,
        items: [...state.items, ...action.items],
        hasMore: action.hasMore,
        loadingMore: false,
        page: state.page + 1,
      };
    case 'PUSH_REALTIME': {
      // Upsert: if same notificationId exists, replace (e.g. aggregation)
      const existingIdx = state.items.findIndex(i => i.notificationId === action.item.notificationId);
      if (existingIdx >= 0) {
        const next = [...state.items];
        const wasRead = next[existingIdx].isRead;
        next.splice(existingIdx, 1);
        next.unshift(action.item);
        // unread delta: nếu trước đã read và giờ unread → +1
        const delta = wasRead && !action.item.isRead ? 1 : 0;
        return { ...state, items: next, unreadCount: state.unreadCount + delta };
      }
      return {
        ...state,
        items: [action.item, ...state.items],
        unreadCount: state.unreadCount + (action.item.isRead ? 0 : 1),
      };
    }
    case 'MARK_READ': {
      let delta = 0;
      const items = state.items.map(i => {
        if (i.notificationId === action.id && !i.isRead) {
          delta = -1;
          return { ...i, isRead: true };
        }
        return i;
      });
      return { ...state, items, unreadCount: Math.max(0, state.unreadCount + delta) };
    }
    case 'MARK_ALL_READ':
      return {
        ...state,
        items: state.items.map(i => ({ ...i, isRead: true })),
        unreadCount: 0,
      };
    case 'REMOVE': {
      const removed = state.items.find(i => i.notificationId === action.id);
      const delta = removed && !removed.isRead ? -1 : 0;
      return {
        ...state,
        items: state.items.filter(i => i.notificationId !== action.id),
        unreadCount: Math.max(0, state.unreadCount + delta),
      };
    }
    case 'UPDATE_ACTION':
      return {
        ...state,
        items: state.items.map(i =>
          i.notificationId === action.id ? { ...i, actionStatus: action.status, isRead: true } : i
        ),
      };
    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.count };
    case 'RESET':
      return initial;
    default:
      return state;
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  Context
// ──────────────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  items: NotificationDTO[];
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  initialized: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  pushRealtime: (item: NotificationDTO) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  updateAction: (id: string, status: 'ACCEPTED' | 'REJECTED' | 'PENDING') => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const PAGE_SIZE = 20;

export const NotificationProvider: React.FC<{ children: React.ReactNode; enabled?: boolean }> = ({
  children,
  enabled = true,
}) => {
  const [state, dispatch] = useReducer(reducer, initial);
  const loadingRef = useRef(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const c = await notificationService.unreadCount();
      dispatch({ type: 'SET_UNREAD_COUNT', count: c });
    } catch (e) {
      console.warn('[Notif] unreadCount failed', e);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    dispatch({ type: 'LOADING_INITIAL' });
    try {
      const [pageRes, count] = await Promise.all([
        notificationService.list(0, PAGE_SIZE),
        notificationService.unreadCount().catch(() => 0),
      ]);
      dispatch({
        type: 'LOADED_INITIAL',
        items: pageRes?.content ?? [],
        hasMore: pageRes ? !pageRes.last : false,
        unreadCount: count,
      });
    } catch (e) {
      console.warn('[Notif] refresh failed', e);
      dispatch({ type: 'LOADED_INITIAL', items: [], hasMore: false, unreadCount: 0 });
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (state.loadingMore || !state.hasMore) return;
    dispatch({ type: 'LOADING_MORE' });
    try {
      const nextPage = state.page + 1;
      const res = await notificationService.list(nextPage, PAGE_SIZE);
      dispatch({
        type: 'LOADED_MORE',
        items: res?.content ?? [],
        hasMore: res ? !res.last : false,
      });
    } catch (e) {
      console.warn('[Notif] loadMore failed', e);
      dispatch({ type: 'LOADED_MORE', items: [], hasMore: false });
    }
  }, [state.loadingMore, state.hasMore, state.page]);

  const pushRealtime = useCallback((item: NotificationDTO) => {
    dispatch({ type: 'PUSH_REALTIME', item });
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    dispatch({ type: 'MARK_READ', id }); // optimistic
    try {
      await notificationService.markAsRead(id);
    } catch (e) {
      console.warn('[Notif] markAsRead failed', e);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    dispatch({ type: 'MARK_ALL_READ' });
    try {
      await notificationService.markAllAsRead();
    } catch (e) {
      console.warn('[Notif] markAllAsRead failed', e);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    dispatch({ type: 'REMOVE', id });
    try {
      await notificationService.remove(id);
    } catch (e) {
      console.warn('[Notif] remove failed', e);
    }
  }, []);

  const updateAction = useCallback(
    async (id: string, status: 'ACCEPTED' | 'REJECTED' | 'PENDING') => {
      dispatch({ type: 'UPDATE_ACTION', id, status }); // optimistic
      try {
        await notificationService.updateAction(id, status);
      } catch (e) {
        console.warn('[Notif] updateAction failed', e);
      }
    },
    []
  );

  // Auto-init khi mount (chỉ khi enabled)
  useEffect(() => {
    if (enabled && !state.initialized && !loadingRef.current) {
      void refresh();
    }
  }, [enabled, state.initialized, refresh]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      items: state.items,
      unreadCount: state.unreadCount,
      loading: state.loading,
      loadingMore: state.loadingMore,
      hasMore: state.hasMore,
      initialized: state.initialized,
      refresh,
      loadMore,
      pushRealtime,
      markAsRead,
      markAllAsRead,
      remove,
      updateAction,
      fetchUnreadCount,
    }),
    [
      state,
      refresh,
      loadMore,
      pushRealtime,
      markAsRead,
      markAllAsRead,
      remove,
      updateAction,
      fetchUnreadCount,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    // Return safe noop default if provider absent (avoid crashes during SSR/early mount)
    return {
      items: [],
      unreadCount: 0,
      loading: false,
      loadingMore: false,
      hasMore: false,
      initialized: false,
      refresh: async () => {},
      loadMore: async () => {},
      pushRealtime: () => {},
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      remove: async () => {},
      updateAction: async () => {},
      fetchUnreadCount: async () => {},
    };
  }
  return ctx;
};
