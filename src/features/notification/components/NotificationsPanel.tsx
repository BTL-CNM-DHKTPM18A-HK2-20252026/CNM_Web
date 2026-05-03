'use client';

import React, { useEffect, useRef } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../store/NotificationContext';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import { NotificationItem } from './NotificationItem';
import { friendService } from '@/features/friends/services/friendService';
import { toast } from 'sonner';
import type { NotificationDTO } from '../types';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  variant?: 'sidebar' | 'dropdown';
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  currentUserId,
  variant = 'sidebar',
}) => {
  const {
    items,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    initialized,
    refresh,
    loadMore,
    markAllAsRead,
    updateAction,
  } = useNotifications();

  // WS subscribe (idempotent — hook handles)
  useNotificationSocket(currentUserId);

  const listRef = useRef<HTMLDivElement | null>(null);

  // Refresh on open lần đầu
  useEffect(() => {
    if (isOpen && !initialized) {
      void refresh();
    }
  }, [isOpen, initialized, refresh]);

  // Infinite scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        if (hasMore && !loadingMore) void loadMore();
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMore, loadingMore, loadMore]);

  const handleAccept = async (n: NotificationDTO) => {
    try {
      // friendshipId is stored in objectId (or relatedObjectId) for FRIEND_REQUEST
      const friendshipId = n.objectId || n.relatedObjectId;
      if (!friendshipId) {
        toast.error('Không tìm thấy thông tin lời mời');
        return;
      }
      await friendService.acceptRequest(friendshipId);
      await updateAction(n.notificationId, 'ACCEPTED');
      toast.success('Đã chấp nhận lời mời kết bạn');
    } catch (e) {
      console.error(e);
      toast.error('Không thể chấp nhận lời mời');
    }
  };

  const handleReject = async (n: NotificationDTO) => {
    try {
      const friendshipId = n.objectId || n.relatedObjectId;
      if (!friendshipId) {
        toast.error('Không tìm thấy thông tin lời mời');
        return;
      }
      await friendService.rejectRequest(friendshipId);
      await updateAction(n.notificationId, 'REJECTED');
      toast.success('Đã từ chối lời mời');
    } catch (e) {
      console.error(e);
      toast.error('Không thể từ chối lời mời');
    }
  };

  if (!isOpen) return null;

  const baseWrapper =
    variant === 'dropdown'
      ? 'fixed top-20 right-6 w-[400px] max-w-[92vw] max-h-[80vh] z-[100] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#121212] flex flex-col overflow-hidden'
      : 'fixed top-0 left-0 lg:left-[280px] h-full w-full lg:w-[420px] z-[80] border-r border-gray-200 dark:border-[#262626] bg-white dark:bg-[#121212] flex flex-col shadow-2xl';

  return (
    <>
      {/* Backdrop only for sidebar variant on mobile */}
      {variant === 'sidebar' && (
        <button
          aria-label="Đóng"
          onClick={onClose}
          className="lg:hidden fixed inset-0 z-[70] bg-black/30"
        />
      )}

      <div className={baseWrapper}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#262626]">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-black dark:text-white" />
            <h3 className="font-semibold text-base text-black dark:text-white">Thông báo</h3>
            {unreadCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500 text-white font-medium">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={() => void markAllAsRead()}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10 transition cursor-pointer"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck size={14} />
                <span className="hidden sm:inline">Đọc tất cả</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black dark:hover:text-white px-2 py-1 text-sm cursor-pointer"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {loading && items.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-gray-500">Đang tải...</div>
          )}
          {!loading && items.length === 0 && (
            <div className="px-4 py-16 text-center">
              <Bell size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500">Chưa có thông báo nào</p>
            </div>
          )}
          {items.map((n) => (
            <NotificationItem
              key={n.notificationId}
              notification={n}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
          {loadingMore && (
            <div className="py-3 text-center text-xs text-gray-500">Đang tải thêm...</div>
          )}
          {!hasMore && items.length > 0 && (
            <div className="py-3 text-center text-xs text-gray-400">Đã hiển thị tất cả thông báo</div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsPanel;
