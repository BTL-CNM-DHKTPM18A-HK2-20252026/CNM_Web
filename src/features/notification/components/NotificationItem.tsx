'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import {
  Heart,
  MessageCircle,
  UserPlus,
  Bell,
  AtSign,
  Share2,
  Image as ImageIcon,
  Check,
  X,
} from 'lucide-react';
import type { NotificationDTO, NotificationType } from '../types';
import { useNotifications } from '../store/NotificationContext';

interface Props {
  notification: NotificationDTO;
  onClick?: (n: NotificationDTO) => void;
  onAccept?: (n: NotificationDTO) => Promise<void> | void;
  onReject?: (n: NotificationDTO) => Promise<void> | void;
}

const ICON_MAP: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; bg: string }> = {
  FRIEND_REQUEST: { icon: UserPlus, bg: 'bg-blue-500' },
  FRIEND_REQUEST_ACCEPTED: { icon: UserPlus, bg: 'bg-green-500' },
  FOLLOW: { icon: UserPlus, bg: 'bg-indigo-500' },
  POST_REACTION: { icon: Heart, bg: 'bg-rose-500' },
  POST_COMMENT: { icon: MessageCircle, bg: 'bg-sky-500' },
  POST_COMMENT_REPLY: { icon: MessageCircle, bg: 'bg-cyan-500' },
  COMMENT_REACTION: { icon: Heart, bg: 'bg-pink-500' },
  POST_MENTION: { icon: AtSign, bg: 'bg-amber-500' },
  POST_SHARE: { icon: Share2, bg: 'bg-purple-500' },
  MESSAGE_NEW: { icon: MessageCircle, bg: 'bg-emerald-500' },
  MESSAGE_REACTION: { icon: Heart, bg: 'bg-rose-400' },
  MESSAGE_MENTION: { icon: AtSign, bg: 'bg-orange-500' },
  STORY_VIEW: { icon: ImageIcon, bg: 'bg-fuchsia-500' },
  STORY_REACTION: { icon: Heart, bg: 'bg-pink-600' },
  SYSTEM: { icon: Bell, bg: 'bg-gray-500' },
  FRIEND_REQ: { icon: UserPlus, bg: 'bg-blue-500' },
  LIKE_POST: { icon: Heart, bg: 'bg-rose-500' },
};

const formatTimeAgo = (iso: string): string => {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk} tuần`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} tháng`;
  return `${Math.floor(day / 365)} năm`;
};

const buildBody = (n: NotificationDTO): string => {
  if (n.body) return n.body;
  const name = n.actorName || 'Một người dùng';
  switch (n.notificationType) {
    case 'FRIEND_REQUEST':
      return `${name} đã gửi lời mời kết bạn`;
    case 'FRIEND_REQUEST_ACCEPTED':
      return `${name} đã chấp nhận lời mời kết bạn`;
    case 'FOLLOW':
      return `${name} đã theo dõi bạn`;
    case 'POST_REACTION':
    case 'LIKE_POST':
      return `${name} đã thả cảm xúc bài viết của bạn`;
    case 'POST_COMMENT':
      return `${name} đã bình luận về bài viết của bạn`;
    case 'POST_COMMENT_REPLY':
      return `${name} đã trả lời bình luận của bạn`;
    case 'COMMENT_REACTION':
      return `${name} đã thả cảm xúc bình luận của bạn`;
    case 'POST_MENTION':
      return `${name} đã nhắc đến bạn trong bài viết`;
    case 'POST_SHARE':
      return `${name} đã chia sẻ bài viết của bạn`;
    case 'MESSAGE_NEW':
      return `${name} đã gửi tin nhắn cho bạn`;
    case 'MESSAGE_REACTION':
      return `${name} đã thả cảm xúc tin nhắn của bạn`;
    case 'MESSAGE_MENTION':
      return `${name} đã nhắc đến bạn trong tin nhắn`;
    case 'STORY_VIEW':
      return `${name} đã xem story của bạn`;
    case 'STORY_REACTION':
      return `${name} đã thả cảm xúc story của bạn`;
    case 'SYSTEM':
      return n.title || 'Thông báo từ hệ thống';
    default:
      return name;
  }
};

export const NotificationItem: React.FC<Props> = ({ notification, onClick, onAccept, onReject }) => {
  const { markAsRead } = useNotifications();
  const cfg = ICON_MAP[notification.notificationType] ?? ICON_MAP.SYSTEM;
  const Icon = cfg.icon;
  const body = useMemo(() => buildBody(notification), [notification]);
  const time = useMemo(() => formatTimeAgo(notification.createdAt), [notification.createdAt]);

  const isFriendRequest =
    notification.notificationType === 'FRIEND_REQUEST' || notification.notificationType === 'FRIEND_REQ';
  const showActions = isFriendRequest && (!notification.actionStatus || notification.actionStatus === 'PENDING');

  const handleClick = () => {
    if (!notification.isRead) {
      void markAsRead(notification.notificationId);
    }
    onClick?.(notification);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick();
      }}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-[#1f1f1f] ${
        !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''
      }`}
    >
      {/* Avatar with type icon overlay */}
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
          {notification.actorAvatarUrl ? (
            <Image
              src={notification.actorAvatarUrl}
              alt={notification.actorName ?? 'avatar'}
              width={44}
              height={44}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-semibold">
              {(notification.actorName || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${cfg.bg} flex items-center justify-center border-2 border-white dark:border-[#121212]`}>
          <Icon size={11} className="text-white" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.isRead ? 'font-medium text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
          {body}
          {notification.aggregateCount && notification.aggregateCount > 1 ? (
            <span className="ml-1 text-xs text-gray-500">(+{notification.aggregateCount - 1})</span>
          ) : null}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">{time}</p>

        {showActions && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                void onAccept?.(notification);
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition"
            >
              <Check size={12} /> Chấp nhận
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                void onReject?.(notification);
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-gray-200 dark:bg-[#262626] text-gray-700 dark:text-gray-200 text-xs font-medium hover:bg-gray-300 dark:hover:bg-[#333] transition"
            >
              <X size={12} /> Từ chối
            </button>
          </div>
        )}

        {isFriendRequest && notification.actionStatus === 'ACCEPTED' && (
          <p className="text-[11px] text-green-600 mt-1">✓ Đã chấp nhận</p>
        )}
        {isFriendRequest && notification.actionStatus === 'REJECTED' && (
          <p className="text-[11px] text-gray-500 mt-1">Đã từ chối</p>
        )}
      </div>

      {!notification.isRead && (
        <span className="self-center w-2 h-2 rounded-full bg-blue-500 shrink-0" />
      )}
    </div>
  );
};
