// Notification system types — match BE NotificationResponse DTO
// Theo NOTIFICATION_IMPLEMENTATION_PLAN.md

export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'FOLLOW'
  | 'POST_REACTION'
  | 'POST_COMMENT'
  | 'POST_COMMENT_REPLY'
  | 'COMMENT_REACTION'
  | 'POST_MENTION'
  | 'POST_SHARE'
  | 'MESSAGE_NEW'
  | 'MESSAGE_REACTION'
  | 'MESSAGE_MENTION'
  | 'STORY_VIEW'
  | 'STORY_REACTION'
  | 'SYSTEM'
  // Legacy
  | 'FRIEND_REQ'
  | 'LIKE_POST';

export type NotificationActionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;

export interface NotificationDTO {
  notificationId: string;
  receiverId: string;

  actorId?: string | null;
  actorName?: string | null;
  actorAvatarUrl?: string | null;

  notificationType: NotificationType;
  title?: string | null;
  body?: string | null;
  iconUrl?: string | null;
  deepLink?: string | null;

  objectType?: string | null;
  objectId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  relatedObjectId?: string | null;

  groupKey?: string | null;
  aggregateCount?: number | null;
  actionStatus?: NotificationActionStatus;
  metadata?: Record<string, unknown> | null;

  isRead: boolean;
  createdAt: string; // ISO
  updatedAt?: string | null;
}

export interface NotificationPage {
  content: NotificationDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
}
