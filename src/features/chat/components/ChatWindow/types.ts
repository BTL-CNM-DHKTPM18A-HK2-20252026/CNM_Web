import type React from 'react';

export interface SelectedChat {
  id: string | number;
  name: string;
  isCloud?: boolean;
  isAi?: boolean;
  isGroup?: boolean;
  avatar?: string;
  groupAvatarUrls?: string[];
  memberCount?: number;
  isNew?: boolean;
  recipientId?: string;
  otherUserId?: string;
  isRequest?: boolean;
  conversationStatus?: string;
  nickname?: string;
}

export interface ChatWindowProps {
  onToggleSidebar: (type: 'info' | 'search') => void;
  activeSidebar: 'info' | 'search' | null;
  selectedChat: SelectedChat;
  currentUser?: any;
  onUpdateConversation?: (id: string | number, lastMsg: string, time?: string) => void;
  onUpdateConversationMeta?: (
    id: string | number,
    updates: { name?: string; avatar?: string }
  ) => void;
  onSelectConversation?: (id: string | number) => void;
  onNicknameChange?: (id: string | number, nickname: string | null) => void;
  refreshTrigger?: number;
  targetMessageId?: string | null;
  onClearTargetMessage?: () => void;
}

export type AiAccessSettings = {
  allowFullDataAccess: boolean;
};

export type AiThemeType = 'GENERAL' | 'SALES' | 'OFFICE' | 'GLOBAL' | 'CREATIVE' | 'STUDY' | 'DEV' | 'CODE_REVIEW';

export type PickerTab = 'sticker' | 'emoji' | 'gif';

export type FriendRequestStatus = 'loading' | 'none' | 'received' | 'sent' | 'friend';

export interface ReplyingTo {
  id: string;
  text: string;
  sender: string;
  type: string;
}

export interface ForwardingMessage {
  id: string;
  text: string;
  type: string;
  sender: string;
}

export interface ChatContextMenu {
  msgId: string;
  x: number;
  y: number;
  isMe: boolean;
  type: string;
}

export interface ConfirmDialog {
  type: 'recall' | 'delete';
  msgId: string;
}

export interface ImageQueueItem {
  file: File;
  previewUrl: string;
  caption: string;
}

export interface PinnedMessage {
  id: string;
  messageId: string;
  content: string;
  linkUrl?: string;
  senderName: string;
  messageType: string;
  pinnedAt: string;
}

export interface TypingUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export interface ChatReaction {
  emoji: string;
  userId: string;
  id: string | number;
  userName?: string;
  userAvatar?: string;
}

export interface AttachmentItem {
  url: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  type: string;
  width?: number;
  height?: number;
  linkTitle?: string;
  linkThumbnail?: string;
  linkDescription?: string;
  voiceDuration?: number;
  videoDuration?: number;
  fileName?: string;
  fileSize?: number;
  replyToMessageId?: string | null;
  sender: string;
  senderId?: string;
  time: string;
  avatar?: string;
  reactions: ChatReaction[];
  rawDate?: Date;
  isEdited?: boolean;
  isRecalled?: boolean;
  forwardedFromSenderName?: string | null;
  caption?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  mentions?: string[];
  attachments?: AttachmentItem[];
}

export interface ReadReceipt {
  displayName: string;
  avatarUrl?: string;
  messageId: string;
}

export interface MentionMember {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
}

export interface ChatHeaderProps {
  vm: ChatWindowViewModel;
}

export interface ChatMessageListProps {
  vm: ChatWindowViewModel;
}

export interface ChatComposerProps {
  vm: ChatWindowViewModel;
}

export interface ChatModalHostProps {
  vm: ChatWindowViewModel;
}

export type ChatWindowViewModel = ReturnType<typeof import('@/features/chat/components/ChatWindow/useChatWindow').useChatWindow>;

export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
