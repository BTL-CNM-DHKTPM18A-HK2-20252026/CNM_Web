import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
import { useTranslation } from 'react-i18next';
import { usePresence } from '@/features/user';
import { apiClient } from '@/lib/http/apiClient';
import emojiPack from '@/data/emoji-pack.json';

// Initialize emoji lookup map for useChatWindow
const emojiMap: Record<string, string> = {};
const _emojiS3Base = process.env.NEXT_PUBLIC_S3_BASE_URL ?? '';
emojiPack.categories.forEach((cat: any) => {
  cat.icons.forEach((icon: any) => {
    emojiMap[icon.shortcode] = `${_emojiS3Base}${icon.src.replace('/fruvia_emoji', '')}`;
  });
});
import { useInView } from 'react-intersection-observer';
import { websocketService } from '@/lib/realtime/websocketService';
import { webrtcService } from '@/lib/realtime/webrtcService';
import { friendService } from '@/features/friends';
import { getLocalMessages, getLocalMessagesBefore, upsertLocalMessages } from '@/lib/db/chatDB';
import type {
  AiAccessSettings,
  AiThemeType,
  ChatContextMenu,
  ChatMessage,
  ChatWindowProps,
  ConfirmDialog,
  ForwardingMessage,
  FriendRequestStatus,
  ImageQueueItem,
  LinkPreviewData,
  MentionMember,
  PinnedMessage,
  ReadReceipt,
  ReplyingTo,
  TypingUser,
} from '@/features/chat/components/ChatWindow/types';

const AI_ACCESS_SETTINGS_STORAGE_KEY = 'fruvia.ai.access-settings.v1';
const AI_THEME_STORAGE_KEY = 'fruvia.ai.theme.v1';
const LOCAL_DELETED_MESSAGES_STORAGE_KEY = 'fruvia.chat.deleted-local.v1';
export const AI_TYPING_USER_ID = 'FRUVIA_AI_ASSISTANT';

const getDeletedMessagesStorageKey = (conversationId: string | number, userId?: string): string => (
  `${LOCAL_DELETED_MESSAGES_STORAGE_KEY}:${userId || 'anonymous'}:${String(conversationId)}`
);

const readDeletedMessageIds = (conversationId: string | number, userId?: string): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(getDeletedMessagesStorageKey(conversationId, userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id: unknown) => String(id)).filter(Boolean));
  } catch {
    return new Set();
  }
};

const writeDeletedMessageIds = (conversationId: string | number, userId: string | undefined, ids: Set<string>): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getDeletedMessagesStorageKey(conversationId, userId), JSON.stringify([...ids]));
  } catch {
    // Ignore localStorage failures.
  }
};

const addDeletedMessageId = (conversationId: string | number, userId: string | undefined, messageId: string): Set<string> => {
  const next = readDeletedMessageIds(conversationId, userId);
  next.add(String(messageId));
  writeDeletedMessageIds(conversationId, userId, next);
  return next;
};

const getAiFullAccessGranted = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const raw = window.localStorage.getItem(AI_ACCESS_SETTINGS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<AiAccessSettings>;
    return Boolean(parsed.allowFullDataAccess);
  } catch {
    return false;
  }
};

const getAiThemeType = (): AiThemeType => {
  if (typeof window === 'undefined') return 'GENERAL';

  try {
    const raw = (window.localStorage.getItem(AI_THEME_STORAGE_KEY) || '').trim().toUpperCase();
    if (raw === 'WORK') return 'OFFICE';
    if (raw === 'CHILL') return 'CREATIVE';
    if (raw === 'JAPANESE') return 'GLOBAL';

    if (
      raw === 'DEV' ||
      raw === 'CODE_REVIEW' ||
      raw === 'SALES' ||
      raw === 'OFFICE' ||
      raw === 'GLOBAL' ||
      raw === 'CREATIVE' ||
      raw === 'STUDY'
    ) {
      return raw as AiThemeType;
    }

    return 'GENERAL';
  } catch {
    return 'GENERAL';
  }
};

const mapReactionToEmoji = (reactionType?: string) => {
  switch (reactionType) {
    case 'LOVE':
      return '❤️';
    case 'HAHA':
      return '😂';
    case 'WOW':
      return '😲';
    case 'SAD':
      return '😭';
    case 'ANGRY':
      return '😡';
    default:
      return '👍';
  }
};
const AI_TEXT_TYPES = new Set(['TEXT', 'LINK']);

const isAiSender = (senderId?: string, senderName?: string): boolean => {
  if (senderId === AI_TYPING_USER_ID) return true;
  const normalizedName = (senderName || '').trim().toLowerCase();
  return normalizedName === 'fruvia chatbot';
};

const stripAiMarkdownMarkers = (content: string | null | undefined): string => {
  if (!content) return '';
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*\*/g, '');
};

const normalizeIncomingContent = (
  content: string | null | undefined,
  senderId?: string,
  messageType?: string,
  senderName?: string
): string => {
  const normalizedContent = content || '';
  const normalizedType = (messageType || 'TEXT').toUpperCase();
  if (isAiSender(senderId, senderName) && AI_TEXT_TYPES.has(normalizedType)) {
    return stripAiMarkdownMarkers(normalizedContent);
  }
  return normalizedContent;
};

const LINK_REGEX = /(https?:\/\/[^\s]+)/i;

const extractFirstUrl = (value?: string | null): string => {
  if (!value) return '';
  const match = value.match(LINK_REGEX);
  return match?.[0] || '';
};

const isLinkPlaceholderText = (value?: string | null): boolean => {
  if (!value) return false;
  const normalized = value.trim().toUpperCase();
  return normalized === '[LINK]' || normalized === 'LINK';
};

const getSnippet = (content: string, messageType: string | undefined, t: (key: string) => string) => {
  switch (messageType) {
    case 'IMAGE':
      if (content && content.includes('/stickers/')) return 'Đã gửi 1 nhãn dán';
      return t('chat.snippet.image');
    case 'IMAGE_GROUP':
      return t('chat.snippet.image_group');
    case 'VIDEO':
      return t('chat.snippet.video');
    case 'MEDIA':
      return t('chat.snippet.file');
    case 'VOICE':
      return t('chat.snippet.voice');
    case 'STICKER':
      return t('chat.snippet.sticker');
    case 'SHARE_CONTACT':
      return `📇 ${t('share_contact.snippet')}`;
    case 'SYSTEM':
      return content;
    case 'CALL_MISSED':
      return t('chat.snippet.call_missed');
    case 'CALL_REJECTED':
      return t('chat.snippet.call_rejected');
    case 'CALL_ENDED':
      return t('chat.snippet.call_ended');
    default:
      return content;
  }
};

const mapIncomingMessage = (m: any, currentUserId?: string): ChatMessage => ({
  id: String(m.messageId || m.id),
  text: normalizeIncomingContent(m.content, m.senderId, m.messageType, m.senderName),
  type: m.messageType || 'TEXT',
  width: m.width,
  height: m.height,
  linkTitle: m.linkTitle,
  linkThumbnail: m.linkThumbnail,
  linkDescription: m.linkDescription,
  voiceDuration: m.voiceDuration,
  videoDuration: m.videoDuration,
  fileName: m.fileName,
  fileSize: m.fileSize,
  replyToMessageId: m.replyToMessageId || null,
  sender:
    m.senderId === 'SYSTEM'
      ? 'SYSTEM'
      : m.senderId === currentUserId
        ? 'Me'
        : m.senderName,
  senderId: m.senderId,
  time: m.createdAt
    ? new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '',
  avatar: m.senderAvatarUrl,
  reactions: (m.reactions || []).map((r: any) => ({
    emoji: mapReactionToEmoji(r.icon || r.reactionType),
    userId: r.userId,
    id: r.id || r.reactionId,
    userName: r.userName,
    userAvatar: r.userAvatar,
  })),
  rawDate: m.createdAt ? new Date(m.createdAt) : undefined,
  isEdited: m.isEdited || false,
  isRecalled: m.isRecalled || false,
  forwardedFromSenderName: m.forwardedFromSenderName || null,
  caption: m.caption || undefined,
  mentions: m.mentions || [],
  attachments: m.attachments || undefined,
});

export function useChatWindow({
  onToggleSidebar,
  activeSidebar,
  selectedChat,
  currentUser,
  onUpdateConversation,
  onUpdateConversationMeta,
  onSelectConversation,
  onNicknameChange,
  refreshTrigger,
  targetMessageId,
  onClearTargetMessage,
  onOpenProfile,
  externalForwardingMsg,
  onClearForwardingMsg,
}: ChatWindowProps) {
  const { t, i18n } = useTranslation();

  // Sync external forwarding message
  useEffect(() => {
    if (externalForwardingMsg) {
      setForwardingMsg(externalForwardingMsg);
      onClearForwardingMsg?.();
    }
  }, [externalForwardingMsg, onClearForwardingMsg]);

  const websocketRef = useRef(websocketService);
  const onUpdateConversationRef = useRef(onUpdateConversation);
  const onSelectConversationRef = useRef(onSelectConversation);
  const onNicknameChangeRef = useRef(onNicknameChange);

  useEffect(() => {
    onUpdateConversationRef.current = onUpdateConversation;
  }, [onUpdateConversation]);

  useEffect(() => {
    onSelectConversationRef.current = onSelectConversation;
  }, [onSelectConversation]);

  useEffect(() => {
    onNicknameChangeRef.current = onNicknameChange;
  }, [onNicknameChange]);

  const [message, setMessage] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'sticker' | 'emoji' | 'gif'>('sticker');

  const [nickname, setNickname] = useState<string | null>(null);
  const [isSendingAi, setIsSendingAi] = useState(false);
  const [editor, setEditor] = useState<any>(null);

  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const [forwardingMsg, setForwardingMsg] = useState<ForwardingMessage | null>(null);
  const [isShareContactOpen, setIsShareContactOpen] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState<ChatContextMenu | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  const [imageQueue, setImageQueue] = useState<ImageQueueItem[]>([]);
  const [captionModalIdx, setCaptionModalIdx] = useState<number | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [openedImageSrc, setOpenedImageSrc] = useState<string | null>(null);

  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const pinnedMessagesRef = useRef<PinnedMessage[]>([]);
  useEffect(() => { pinnedMessagesRef.current = pinnedMessages; }, [pinnedMessages]);
  const [showPinnedList, setShowPinnedList] = useState(false);

  const [friendRequestStatus, setFriendRequestStatus] = useState<FriendRequestStatus>('loading');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isFilePopoverOpen, setIsFilePopoverOpen] = useState(false);
  const [isChatImageUploadOpen, setIsChatImageUploadOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; previewUrl: string | null } | null>(null);
  const pendingAttachmentRef = useRef<{ file: File; previewUrl: string | null } | null>(null);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [isFormattingActive, setIsFormattingActive] = useState(false);

  useEffect(() => {
    if (selectedChat.isGroup) {
      setIsNicknameModalOpen(false);
    }
  }, [selectedChat.isGroup]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isInitializingMic, setIsInitializingMic] = useState(false);
  const discardRef = useRef(false);

  const [reactionModalMessageId, setReactionModalMessageId] = useState<string | number | null>(null);
  const [reactionModalEmojiTab, setReactionModalEmojiTab] = useState<string>('all');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const locallyDeletedMessageIdsRef = useRef<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const filterLocallyDeletedMessages = useCallback(
    (items: ChatMessage[]): ChatMessage[] => items.filter(m => !locallyDeletedMessageIdsRef.current.has(String(m.id))),
    []
  );

  useEffect(() => {
    if (!selectedChat?.id) {
      locallyDeletedMessageIdsRef.current = new Set();
      return;
    }
    locallyDeletedMessageIdsRef.current = readDeletedMessageIds(selectedChat.id, currentUser?.id);
  }, [selectedChat?.id, currentUser?.id]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentConversationIdRef = useRef<typeof selectedChat.id | null>(selectedChat?.id ?? null);
  currentConversationIdRef.current = selectedChat?.id ?? null;
  const prevFetchedConvIdRef = useRef<string | null>(null);

  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastTypingSentRef = useRef<number>(0);

  const [readReceipts, setReadReceipts] = useState<Record<string, ReadReceipt>>({});
  const lastSentReadRef = useRef<string | null>(null);
  const [deliveredReceipts, setDeliveredReceipts] = useState<Record<string, { messageId: string; lastDeliveredAt?: string }>>({});

  // Link preview state
  const [pendingLinkPreview, setPendingLinkPreview] = useState<LinkPreviewData | null>(null);
  const [linkPreviewDismissed, setLinkPreviewDismissed] = useState(false);
  const linkPreviewDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // @Mention state
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [mentionDropdownOpen, setMentionDropdownOpen] = useState(false);
  const [conversationMembers, setConversationMembers] = useState<MentionMember[]>([]);
  const [pendingMentions, setPendingMentions] = useState<MentionMember[]>([]);

  // Smart Reply state
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [smartRepliesLoading, setSmartRepliesLoading] = useState(false);
  const smartReplyDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Message Summary state
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryMessageCount, setSummaryMessageCount] = useState(0);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const isInitialLoadRef = useRef(true);
  const totalMessagesRef = useRef<number>(0);

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0 });

  const openImageQueue = useCallback((files: File[]) => {
    if (!files.length) return;
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length) {
      toast.error(`File vượt quá giới hạn 50MB: ${oversized.map(f => f.name).join(', ')}`);
    }
    const valid = files.filter(f => f.size <= MAX_FILE_SIZE);
    if (!valid.length) return;
    const entries = valid.map(file => ({ file, previewUrl: URL.createObjectURL(file), caption: '' }));
    setImageQueue(prev => [...prev, ...entries]);
  }, []);

  const closeImageQueue = useCallback(() => {
    setImageQueue(prev => {
      prev.forEach(entry => {
        if (entry.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(entry.previewUrl);
        }
      });
      return [];
    });
    setCaptionModalIdx(null);
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const arr = Array.from(items);
    const imageItems = arr.filter(it => it.type.startsWith('image/'));
    if (!imageItems.length) return;

    const files = imageItems.map(it => it.getAsFile()).filter((f): f is File => f !== null);
    if (!files.length) return;

    e.preventDefault();

    // Read all image files as data URLs and add to queue
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;
        setImageQueue(prev => [...prev, { file, previewUrl: dataUrl, caption: '' }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  useEffect(() => {
    const checkFriendStatus = async () => {
      const peerId = selectedChat.otherUserId || selectedChat.recipientId;
      if (!peerId || !currentUser?.id || selectedChat.isCloud || selectedChat.isAi || selectedChat.isGroup) {
        setFriendRequestStatus('none');
        return;
      }

      try {
        const [friendsResult, receivedResult, sentResult] = await Promise.allSettled([
          friendService.getFriends(),
          friendService.getReceivedRequests(),
          friendService.getSentRequests(),
        ]);

        const unwrap = (result: PromiseSettledResult<any>): any[] => {
          if (result.status !== 'fulfilled') return [];
          const value = result.value;
          if (Array.isArray(value)) return value;
          if (value && Array.isArray(value.data)) return value.data;
          return [];
        };

        const friends = unwrap(friendsResult);
        const received = unwrap(receivedResult);
        const sent = unwrap(sentResult);

        const isFriend = friends.some((f: any) => (f.user_id || f.userId || f.id) === peerId);
        if (isFriend) {
          setFriendRequestStatus('friend');
          return;
        }

        const receivedReq = received.find((r: any) => (r.senderId || r.sender_id) === peerId);
        if (receivedReq) {
          setFriendRequestStatus('received');
          setPendingRequestId(receivedReq.requestId);
          return;
        }

        const sentReq = sent.find((r: any) => (r.receiverId || r.receiver_id) === peerId);
        if (sentReq) {
          setFriendRequestStatus('sent');
          return;
        }

        setFriendRequestStatus('none');
      } catch {
        setFriendRequestStatus('none');
      }
    };

    setFriendRequestStatus('loading');
    checkFriendStatus();
  }, [selectedChat.otherUserId, selectedChat.recipientId, selectedChat.isCloud, selectedChat.isAi, selectedChat.isGroup, currentUser?.id]);

  useEffect(() => {
    setNickname(selectedChat?.nickname || null);
    setReplyingTo(null);
    setPendingMentions([]);
    setMentionDropdownOpen(false);
    setPendingLinkPreview(null);
    setLinkPreviewDismissed(false);
  }, [selectedChat?.id, selectedChat?.nickname]);

  // Fetch conversation members for @mention (group chats only)
  useEffect(() => {
    if (!selectedChat?.isGroup || !selectedChat?.id) {
      setConversationMembers([]);
      return;
    }
    const convId = selectedChat.id.toString();
    apiClient.get<any>(`/conversations/${convId}/members`)
      .then(res => {
        const list: any[] = Array.isArray(res) ? res : (res?.data || res?.members || []);
        setConversationMembers(list.map((m: any) => ({
          userId: m.userId || m.user_id,
          displayName: m.displayName || m.display_name || m.name || m.userId,
          avatarUrl: m.avatarUrl || m.avatar_url,
        })).filter(m => m.userId && m.userId !== currentUser?.id));
      })
      .catch(() => setConversationMembers([]));
  }, [selectedChat?.id, selectedChat?.isGroup, currentUser?.id]);

  // URL detection for link preview (debounced 600ms)
  useEffect(() => {
    if (linkPreviewDebounceRef.current) clearTimeout(linkPreviewDebounceRef.current);

    // Skip URL detection if message is HTML content (e.g. emoji inserted via TipTap <img> tag)
    const isHtmlMessage = /<[a-z][\s\S]*>/i.test(message);
    const urlMatch = !isHtmlMessage ? message.match(/(https?:\/\/[^\s]{6,})/) : null;
    if (!urlMatch) {
      setPendingLinkPreview(null);
      setLinkPreviewDismissed(false);
      return;
    }

    if (linkPreviewDismissed) return;

    linkPreviewDebounceRef.current = setTimeout(async () => {
      try {
        const url = urlMatch[1];
        const res = await apiClient.get<any>(`/utils/link-preview?url=${encodeURIComponent(url)}`);
        const data = res?.data || res;
        if (data?.url && !linkPreviewDismissed) {
          setPendingLinkPreview({
            url: data.url,
            title: data.title,
            description: data.description,
            thumbnail: data.thumbnail,
          });
        }
      } catch {
        // Silent — no preview shown on error
      }
    }, 600);

    return () => {
      if (linkPreviewDebounceRef.current) clearTimeout(linkPreviewDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  // ── Smart Reply: auto-fetch when messages change (new message from others) ──
  const fetchSmartReplies = useCallback(async () => {
    if (!selectedChat?.id || selectedChat.isAi || selectedChat.isCloud) return;
    setSmartRepliesLoading(true);
    try {
      const res = await apiClient.post<{ suggestions: string[] }>('/ai/smart-reply', {
        conversationId: selectedChat.id.toString(),
      });
      const data = (res as any)?.suggestions ?? (res as any)?.data?.suggestions ?? [];
      setSmartReplies(Array.isArray(data) ? data.slice(0, 3) : []);
    } catch {
      setSmartReplies([]);
    } finally {
      setSmartRepliesLoading(false);
    }
  }, [selectedChat?.id, selectedChat?.isAi, selectedChat?.isCloud]);

  const dismissSmartReplies = useCallback(() => setSmartReplies([]), []);

  // Auto-fetch smart replies when messages change (any new message)
  useEffect(() => {
    if (!messages.length || selectedChat.isAi || selectedChat.isCloud) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.sender === 'SYSTEM') return;

    // Debounce to avoid rapid calls
    if (smartReplyDebounceRef.current) clearTimeout(smartReplyDebounceRef.current);
    smartReplyDebounceRef.current = setTimeout(() => {
      fetchSmartReplies();
    }, 800);

    return () => {
      if (smartReplyDebounceRef.current) clearTimeout(smartReplyDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, selectedChat?.id]);

  // Clear smart replies when switching conversations, then auto-fetch
  useEffect(() => {
    setSmartReplies([]);
    setSummaryText(null);
    setIsSummaryOpen(false);
    if (!selectedChat?.id || selectedChat.isAi || selectedChat.isCloud) return;
    const t = setTimeout(() => fetchSmartReplies(), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat?.id]);

  // ── Message Summary ──
  const fetchSummary = useCallback(async () => {
    if (!selectedChat?.id) return;
    setSummaryLoading(true);
    setSummaryText(null);
    setIsSummaryOpen(true);
    try {
      const res = await apiClient.post<{ summary: string; messageCount: number }>('/ai/summarize', {
        conversationId: selectedChat.id.toString(),
      });
      const data = res as any;
      setSummaryText(data?.summary ?? data?.data?.summary ?? 'Không có nội dung tóm tắt.');
      setSummaryMessageCount(data?.messageCount ?? data?.data?.messageCount ?? 0);
    } catch {
      setSummaryText('Không thể tóm tắt tin nhắn. Vui lòng thử lại sau.');
      setSummaryMessageCount(0);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedChat?.id]);

  const stopRecording = useCallback((discard = false) => {
    discardRef.current = discard;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, []);

  const handleSendMessage = useCallback(async (
    customContent?: string,
    msgType: string = 'TEXT',
    fileName?: string,
    fileSize?: number,
    voiceDuration?: number,
    videoDuration?: number,
    optimisticId?: string,
    imageWidth?: number,
    imageHeight?: number,
    caption?: string,
    mentionsOverride?: MentionMember[]
  ) => {
    const contentToUse = customContent || message?.trim();
    if (!(contentToUse && selectedChat?.id)) return;

    const tempOptimisticId = optimisticId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      if (!customContent) setMessage('');

      if (selectedChat.isAi) {
        if (msgType !== 'TEXT') {
          const payload: any = {
            content: contentToUse,
            messageType: msgType,
            fileName,
            fileSize,
            voiceDuration,
            videoDuration,
            replyToMessageId: replyingTo?.id || undefined,
            conversationId: selectedChat.id.toString(),
            caption: caption || undefined,
          };

          const res = await apiClient.post<any>('/messages', payload);
          const data = res.success ? res.data : res;
          const newMsg = data.message || data;

          if (newMsg?.messageId || newMsg?.id) {
            const realId = String(newMsg.messageId || newMsg.id);

            onUpdateConversationRef.current?.(
              selectedChat.id,
              getSnippet(newMsg.content, newMsg.messageType || msgType, t),
              new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
            );

            setMessages(prev => {
              const realMsg: ChatMessage = {
                id: realId,
                text: newMsg.content,
                type: newMsg.messageType || msgType,
                width: newMsg.width || imageWidth,
                height: newMsg.height || imageHeight,
                replyToMessageId: newMsg.replyToMessageId || replyingTo?.id || null,
                sender: 'Me',
                senderId: currentUser?.id,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                reactions: [],
                rawDate: new Date(),
                isEdited: false,
                isRecalled: false,
                forwardedFromSenderName: null,
                caption: newMsg.caption || caption || undefined,
                fileName: newMsg.fileName || fileName,
                fileSize: newMsg.fileSize || fileSize,
                isUploading: false,
              };

              if (optimisticId) {
                const idx = prev.findIndex(m => m.id === optimisticId);
                if (idx !== -1) {
                  setShouldScrollToBottom(true);
                  if (prev.some(m => m.id === realId)) {
                    return prev.filter(m => m.id !== optimisticId);
                  }
                  const next = [...prev];
                  const optimisticMsg = next[idx];
                  next[idx] = {
                    ...realMsg,
                    width: realMsg.width || optimisticMsg.width,
                    height: realMsg.height || optimisticMsg.height,
                  };
                  return next;
                }
              }

              if (prev.some(m => m.id === realId)) return prev;
              setShouldScrollToBottom(true);
              return [...prev, realMsg];
            });

            setReplyingTo(null);
          }

          // After saving IMAGE in AI chat, call AI with vision analysis
          if (msgType === 'IMAGE' && newMsg?.content && !isSendingAi) {
            const locale = (i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
            const aiQuestion = caption?.trim() || (locale.startsWith('en') ? 'Describe the content of this image.' : 'Hãy mô tả nội dung trong ảnh này.');
            const convIdAtSend = selectedChat.id;

            setIsSendingAi(true);
            setTypingUsers(prev => {
              if (prev.some(u => u.userId === AI_TYPING_USER_ID)) return prev;
              return [...prev, { userId: AI_TYPING_USER_ID, displayName: selectedChat.name || t('chat.ai_name'), avatarUrl: undefined }];
            });

            const imageAiPayload: any = {
              content: aiQuestion,
              useRag: false,
              language: locale.startsWith('en') ? 'en' : 'vi',
              fullAccessGranted: getAiFullAccessGranted(),
              themeType: getAiThemeType(),
              userImageUrl: newMsg.content,
            };
            if (!selectedChat.isNew) imageAiPayload.conversationId = selectedChat.id.toString();

            try {
              const aiRes = await apiClient.post<any>('/messages/ai', imageAiPayload);
              const aiData = aiRes?.success ? aiRes.data : aiRes;
              const assistantMessage = aiData?.assistantMessage;
              const assistantContent = normalizeIncomingContent(
                assistantMessage?.content,
                assistantMessage?.senderId,
                assistantMessage?.messageType,
                assistantMessage?.senderName
              );
              const aiConversation = aiData?.conversation;
              const finalConvId = String(aiConversation?.conversationId || aiConversation?.id || selectedChat.id);

              if (onSelectConversationRef.current && finalConvId !== String(selectedChat.id)) {
                onSelectConversationRef.current(finalConvId);
              }

              if (String(currentConversationIdRef.current) !== finalConvId && String(currentConversationIdRef.current) !== String(convIdAtSend)) {
                return;
              }

              if (assistantContent) {
                onUpdateConversationRef.current?.(
                  finalConvId,
                  getSnippet(assistantContent, assistantMessage?.messageType || 'TEXT', t),
                  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
                );
              }

              if (assistantMessage) {
                setMessages(prev => {
                  const assistantId = String(assistantMessage.messageId || assistantMessage.id);
                  if (prev.some(m => m.id === assistantId)) return prev;
                  return [...prev, {
                    id: assistantId,
                    text: assistantContent,
                    type: assistantMessage.messageType || 'TEXT',
                    replyToMessageId: assistantMessage.replyToMessageId || null,
                    sender: assistantMessage.senderName || 'Fruvia Chatbot',
                    senderId: assistantMessage.senderId,
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                    avatar: assistantMessage.senderAvatarUrl,
                    reactions: [],
                    rawDate: assistantMessage.createdAt ? new Date(assistantMessage.createdAt) : new Date(),
                    isEdited: false,
                    isRecalled: false,
                    forwardedFromSenderName: null,
                  }];
                });
                setShouldScrollToBottom(true);
              }
            } catch (aiError: any) {
              const errorLocale = (i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
              const errorText = aiError?.response?.data?.message || (errorLocale.startsWith('en')
                ? 'Sorry, AI is temporarily unavailable. Please try again in a moment.'
                : 'Xin lỗi, AI tạm thời không phản hồi được. Bạn thử lại sau vài giây nhé.');
              setMessages(prev => [...prev, {
                id: `ai-error-${Date.now()}`,
                text: errorText,
                type: 'TEXT',
                replyToMessageId: null,
                sender: 'Fruvia Chatbot',
                senderId: AI_TYPING_USER_ID,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                reactions: [],
                rawDate: new Date(),
                isEdited: false,
                isRecalled: false,
                forwardedFromSenderName: null,
              }]);
              setShouldScrollToBottom(true);
            } finally {
              setIsSendingAi(false);
              setTypingUsers(prev => prev.filter(u => u.userId !== AI_TYPING_USER_ID));
              const existing = typingTimeoutRef.current.get(AI_TYPING_USER_ID);
              if (existing) {
                clearTimeout(existing);
                typingTimeoutRef.current.delete(AI_TYPING_USER_ID);
              }
            }
          }

          // After saving a PDF/DOCX in AI chat, ask the AI to read and summarize it
          if (msgType === 'MEDIA' && newMsg?.content && !isSendingAi) {
            const docFileName = fileName || newMsg.fileName || '';
            const isPdfOrDocx = /\.(pdf|docx|xlsx|xls)$/i.test(docFileName);
            if (isPdfOrDocx) {
              const locale = (i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
              const isEn = locale.startsWith('en');
              const userCaption = (caption?.trim() || newMsg.caption?.replace(/<[^>]*>/g, '').trim() || '');
              const docQuestion = userCaption
                ? userCaption
                : (isEn
                  ? `I've uploaded the document "${docFileName}". Please read its content and provide a summary.`
                  : `Tôi vừa tải lên tài liệu "${docFileName}". Hãy đọc nội dung và tóm tắt tài liệu này cho tôi.`);
              const convIdAtSend = selectedChat.id;

              setIsSendingAi(true);
              setTypingUsers(prev => {
                if (prev.some(u => u.userId === AI_TYPING_USER_ID)) return prev;
                return [...prev, { userId: AI_TYPING_USER_ID, displayName: selectedChat.name || t('chat.ai_name'), avatarUrl: undefined }];
              });

              const docAiPayload: any = {
                content: docQuestion,
                useRag: false,
                language: isEn ? 'en' : 'vi',
                fullAccessGranted: getAiFullAccessGranted(),
                themeType: getAiThemeType(),
                userDocumentUrl: newMsg.content,
                userDocumentName: docFileName,
              };
              if (!selectedChat.isNew) docAiPayload.conversationId = selectedChat.id.toString();

              try {
                const aiRes = await apiClient.post<any>('/messages/ai', docAiPayload);
                const aiData = aiRes?.success ? aiRes.data : aiRes;
                const assistantMessage = aiData?.assistantMessage;
                const assistantContent = normalizeIncomingContent(
                  assistantMessage?.content,
                  assistantMessage?.senderId,
                  assistantMessage?.messageType,
                  assistantMessage?.senderName
                );
                const aiConversation = aiData?.conversation;
                const finalConvId = String(aiConversation?.conversationId || aiConversation?.id || selectedChat.id);

                if (onSelectConversationRef.current && finalConvId !== String(selectedChat.id)) {
                  onSelectConversationRef.current(finalConvId);
                }

                if (String(currentConversationIdRef.current) !== finalConvId && String(currentConversationIdRef.current) !== String(convIdAtSend)) {
                  return;
                }

                if (assistantContent) {
                  onUpdateConversationRef.current?.(
                    finalConvId,
                    getSnippet(assistantContent, assistantMessage?.messageType || 'TEXT', t),
                    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
                  );
                }

                if (assistantMessage) {
                  setMessages(prev => {
                    const assistantId = String(assistantMessage.messageId || assistantMessage.id);
                    if (prev.some(m => m.id === assistantId)) return prev;
                    return [...prev, {
                      id: assistantId,
                      text: assistantContent,
                      type: assistantMessage.messageType || 'TEXT',
                      replyToMessageId: assistantMessage.replyToMessageId || null,
                      sender: assistantMessage.senderName || 'Fruvia Chatbot',
                      senderId: assistantMessage.senderId,
                      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                      avatar: assistantMessage.senderAvatarUrl,
                      reactions: [],
                      rawDate: assistantMessage.createdAt ? new Date(assistantMessage.createdAt) : new Date(),
                      isEdited: false,
                      isRecalled: false,
                      forwardedFromSenderName: null,
                    }];
                  });
                  setShouldScrollToBottom(true);
                }
              } catch (docAiError: any) {
                const errorText = docAiError?.response?.data?.message || (isEn
                  ? 'Sorry, I could not read the document. Please try again.'
                  : 'Xin lỗi, AI không thể đọc tài liệu. Bạn thử lại sau nhé.');
                setMessages(prev => [...prev, {
                  id: `ai-error-${Date.now()}`,
                  text: errorText,
                  type: 'TEXT',
                  replyToMessageId: null,
                  sender: 'Fruvia Chatbot',
                  senderId: AI_TYPING_USER_ID,
                  time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                  reactions: [],
                  rawDate: new Date(),
                  isEdited: false,
                  isRecalled: false,
                  forwardedFromSenderName: null,
                }]);
                setShouldScrollToBottom(true);
              } finally {
                setIsSendingAi(false);
                setTypingUsers(prev => prev.filter(u => u.userId !== AI_TYPING_USER_ID));
                const existing = typingTimeoutRef.current.get(AI_TYPING_USER_ID);
                if (existing) {
                  clearTimeout(existing);
                  typingTimeoutRef.current.delete(AI_TYPING_USER_ID);
                }
              }
            }
          }

          return;
        }

        if (isSendingAi) return;

        setIsSendingAi(true);
        const locale = (i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
        const tempUserMessageId = `temp-ai-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        setMessages(prev => ([
          ...prev,
          {
            id: tempUserMessageId,
            text: contentToUse,
            type: msgType,
            replyToMessageId: replyingTo?.id || null,
            sender: 'Me',
            senderId: currentUser?.id,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            reactions: [],
            rawDate: new Date(),
            isEdited: false,
            isRecalled: false,
            forwardedFromSenderName: null,
          },
        ]));

        setShouldScrollToBottom(true);
        setReplyingTo(null);

        setTypingUsers(prev => {
          if (prev.some(user => user.userId === AI_TYPING_USER_ID)) return prev;
          return [...prev, { userId: AI_TYPING_USER_ID, displayName: selectedChat.name || t('chat.ai_name'), avatarUrl: undefined }];
        });

        const aiPayload: any = {
          content: contentToUse,
          useRag: true,
          language: locale.startsWith('en') ? 'en' : 'vi',
          fullAccessGranted: getAiFullAccessGranted(),
          themeType: getAiThemeType(),
        };

        // Vision: if user recently sent an image (within last 5 messages), include it for AI analysis
        const recentUserImage = [...messages]
          .reverse()
          .slice(0, 5)
          .find(m => m.sender === 'Me' && m.type === 'IMAGE' && !m.text?.includes('/stickers/'));
        if (recentUserImage?.text && !recentUserImage.text.startsWith('blob:')) {
          aiPayload.userImageUrl = recentUserImage.text;
        }

        if (!selectedChat.isNew) {
          aiPayload.conversationId = selectedChat.id.toString();
        }

        const convIdAtSend = selectedChat.id;

        try {
          const aiRes = await apiClient.post<any>('/messages/ai', aiPayload);
          const aiData = aiRes?.success ? aiRes.data : aiRes;
          const userMessage = aiData?.userMessage;
          const imageMessage = aiData?.imageMessage;
          const assistantMessage = aiData?.assistantMessage;
          const assistantContent = normalizeIncomingContent(
            assistantMessage?.content,
            assistantMessage?.senderId,
            assistantMessage?.messageType,
            assistantMessage?.senderName
          );
          const aiConversation = aiData?.conversation;
          const finalConvId = String(aiConversation?.conversationId || aiConversation?.id || selectedChat.id);

          if (onSelectConversationRef.current && finalConvId !== String(selectedChat.id)) {
            onSelectConversationRef.current(finalConvId);
          }

          if (
            String(currentConversationIdRef.current) !== finalConvId
            && String(currentConversationIdRef.current) !== String(convIdAtSend)
          ) {
            return;
          }

          if (assistantContent) {
            onUpdateConversationRef.current?.(
              finalConvId,
              getSnippet(assistantContent, assistantMessage.messageType || 'TEXT', t),
              new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
            );
          }

          setMessages(prev => {
            let next = [...prev];

            if (userMessage) {
              const userMessageId = String(userMessage.messageId || userMessage.id);
              next = next.map(m => {
                if (m.id !== tempUserMessageId) return m;
                return {
                  ...m,
                  id: userMessageId || m.id,
                  text: userMessage.content ?? m.text,
                  type: userMessage.messageType || m.type,
                  senderId: userMessage.senderId || m.senderId,
                  avatar: userMessage.senderAvatarUrl,
                  isEdited: userMessage.isEdited || false,
                  isRecalled: userMessage.isRecalled || false,
                  forwardedFromSenderName: userMessage.forwardedFromSenderName || null,
                  rawDate: userMessage.createdAt ? new Date(userMessage.createdAt) : m.rawDate,
                };
              });
            }

            if (imageMessage) {
              const imageMessageId = String(imageMessage.messageId || imageMessage.id);
              if (!next.some(m => m.id === imageMessageId)) {
                next.push({
                  id: imageMessageId,
                  text: imageMessage.content,
                  type: imageMessage.messageType || 'IMAGE',
                  width: imageMessage.width,
                  height: imageMessage.height,
                  replyToMessageId: imageMessage.replyToMessageId || null,
                  sender: imageMessage.senderName || 'Fruvia Chatbot',
                  senderId: imageMessage.senderId,
                  time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                  avatar: imageMessage.senderAvatarUrl,
                  reactions: [],
                  rawDate: imageMessage.createdAt ? new Date(imageMessage.createdAt) : new Date(),
                  isEdited: imageMessage.isEdited || false,
                  isRecalled: imageMessage.isRecalled || false,
                  forwardedFromSenderName: imageMessage.forwardedFromSenderName || null,
                });
              }
            }

            if (assistantMessage) {
              const assistantMessageId = String(assistantMessage.messageId || assistantMessage.id);
              if (!next.some(m => m.id === assistantMessageId)) {
                next.push({
                  id: assistantMessageId,
                  text: assistantContent,
                  type: assistantMessage.messageType || 'TEXT',
                  replyToMessageId: assistantMessage.replyToMessageId || null,
                  sender: assistantMessage.senderName || 'Fruvia Chatbot',
                  senderId: assistantMessage.senderId,
                  time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                  avatar: assistantMessage.senderAvatarUrl,
                  reactions: [],
                  rawDate: assistantMessage.createdAt ? new Date(assistantMessage.createdAt) : new Date(),
                  isEdited: assistantMessage.isEdited || false,
                  isRecalled: assistantMessage.isRecalled || false,
                  forwardedFromSenderName: assistantMessage.forwardedFromSenderName || null,
                });
              }
            }

            return next;
          });

          setShouldScrollToBottom(true);
        } catch (aiError: any) {
          const errorText = aiError?.response?.data?.message
            || (locale.startsWith('en')
              ? 'Sorry, AI is temporarily unavailable. Please try again in a moment.'
              : 'Xin lỗi, AI tạm thời không phản hồi được. Bạn thử lại sau vài giây nhé.');

          setMessages(prev => [
            ...prev,
            {
              id: `ai-error-${Date.now()}`,
              text: errorText,
              type: 'TEXT',
              replyToMessageId: null,
              sender: 'Fruvia Chatbot',
              senderId: AI_TYPING_USER_ID,
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
              reactions: [],
              rawDate: new Date(),
              isEdited: false,
              isRecalled: false,
              forwardedFromSenderName: null,
            },
          ]);

          setShouldScrollToBottom(true);
        } finally {
          setIsSendingAi(false);
          setTypingUsers(prev => prev.filter(u => u.userId !== AI_TYPING_USER_ID));
          const existing = typingTimeoutRef.current.get(AI_TYPING_USER_ID);
          if (existing) {
            clearTimeout(existing);
            typingTimeoutRef.current.delete(AI_TYPING_USER_ID);
          }
        }

        return;
      }

      sendStopTypingIndicator();

      const isNewConv = !!selectedChat.isNew;
      const mentionsToSend = mentionsOverride
        ? mentionsOverride.map(m => m.userId)
        : pendingMentions.map(m => m.userId);

      const payload: any = {
        content: contentToUse,
        messageType: msgType,
        fileName,
        fileSize,
        voiceDuration,
        videoDuration,
        replyToMessageId: replyingTo?.id || undefined,
        caption: caption || undefined,
        mentions: mentionsToSend.length > 0 ? mentionsToSend : undefined,
      };

      // Reset mention + link preview state after preparing payload
      if (!customContent) {
        setPendingMentions([]);
        setMentionDropdownOpen(false);
        if (!linkPreviewDismissed) {
          setPendingLinkPreview(null);
        }
        setLinkPreviewDismissed(false);
      }

      if (isNewConv) {
        const resolvedRecipientId =
          selectedChat.recipientId
          || selectedChat.otherUserId
          || (typeof selectedChat.id === 'string' && selectedChat.id.startsWith('new:')
            ? selectedChat.id.slice(4)
            : undefined);

        if (!resolvedRecipientId) {
          throw new Error('Không thể xác định người nhận. Vui lòng mở lại cuộc trò chuyện.');
        }

        payload.recipientId = resolvedRecipientId;
      } else {
        payload.conversationId = selectedChat.id.toString();
      }

      // Optimistic update: show the message locally before the server responds
      if (!optimisticId && msgType === 'TEXT') {
        setMessages(prev => [
          ...prev,
          {
            id: tempOptimisticId,
            text: contentToUse,
            type: msgType,
            replyToMessageId: replyingTo?.id || null,
            sender: 'Me',
            senderId: currentUser?.id,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            reactions: [],
            rawDate: new Date(),
            isEdited: false,
            isRecalled: false,
            forwardedFromSenderName: null,
            caption: caption || undefined,
            isUploading: false,
          },
        ]);
        setShouldScrollToBottom(true);
        setReplyingTo(null);
      }

      const res = await apiClient.post<any>('/messages', payload);
      const data = res.success ? res.data : res;
      const newMsg = data.message || data;
      const newConv = data.conversation;

      console.log('[ChatWindow] Message sent response:', { res, data, newMsg });

      if (newMsg?.messageId || newMsg?.id) {
        const currentId = selectedChat.id;
        const finalConvId = newConv ? (newConv.conversationId || newConv.id) : currentId;

        if (isNewConv && newConv && onSelectConversationRef.current) {
          onSelectConversationRef.current(finalConvId);
        }

        onUpdateConversationRef.current?.(
          finalConvId,
          getSnippet(newMsg.content, newMsg.messageType || msgType, t),
          new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
        );

        const effectiveOptimisticId = optimisticId || (msgType === 'TEXT' ? tempOptimisticId : undefined);

        setMessages(prev => {
          const realId = String(newMsg.messageId || newMsg.id);
          const realMsg: ChatMessage = {
            id: realId,
            text: newMsg.content,
            type: newMsg.messageType || msgType,
            width: newMsg.width || imageWidth,
            height: newMsg.height || imageHeight,
            replyToMessageId: newMsg.replyToMessageId || replyingTo?.id || null,
            sender: 'Me',
            senderId: currentUser?.id,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            reactions: [],
            rawDate: new Date(),
            isEdited: false,
            isRecalled: false,
            forwardedFromSenderName: null,
            caption: newMsg.caption || caption || undefined,
            fileName: newMsg.fileName || fileName,
            fileSize: newMsg.fileSize || fileSize,
            isUploading: false,
          };

          if (effectiveOptimisticId) {
            const idx = prev.findIndex(m => m.id === effectiveOptimisticId);
            if (idx !== -1) {
              setShouldScrollToBottom(true);
              if (prev.some(m => m.id === realId)) {
                return prev.filter(m => m.id !== effectiveOptimisticId);
              }
              const next = [...prev];
              const optimisticMsg = next[idx];
              next[idx] = {
                ...realMsg,
                width: realMsg.width || optimisticMsg.width,
                height: realMsg.height || optimisticMsg.height,
              };
              return next;
            }
          }

          if (prev.some(m => m.id === realId)) return prev;
          setShouldScrollToBottom(true);
          return [...prev, realMsg];
        });

        if (!effectiveOptimisticId || optimisticId) {
          setReplyingTo(null);
        }
      }
    } catch (error) {
      console.error('Send failed', error);

      const rawMsg = error instanceof Error ? error.message : '';
      const normalizedMsg = rawMsg.toLowerCase();
      const isConnectionIssue =
        normalizedMsg.includes('network')
        || normalizedMsg.includes('failed to fetch')
        || normalizedMsg.includes('unable to connect')
        || normalizedMsg.includes('connection refused');

      toast.error(
        isConnectionIssue
          ? 'Không thể kết nối máy chủ. Vui lòng kiểm tra backend và thử lại.'
          : (rawMsg || t('chat.message.send_error'))
      );

      // Remove optimistic text message and restore input on failure
      if (!optimisticId && msgType === 'TEXT') {
        setMessages(prev => prev.filter(m => m.id !== tempOptimisticId));
        setMessage(contentToUse);
      }
      // Remove stuck MEDIA/IMAGE/VIDEO optimistic message on failure
      if (optimisticId) {
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
      }
    }
  }, [message, selectedChat, currentUser?.id, replyingTo?.id, isSendingAi, i18n.resolvedLanguage, i18n.language, t]);

  const startRecording = useCallback(async () => {
    if (isRecording || isInitializingMic) return;

    setIsInitializingMic(true);
    discardRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      mediaRecorder.onstop = async () => {
        if (discardRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const duration = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);

        if (duration < 1) {
          toast.error(t('chat.voice.too_short'));
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

        try {
          const uploadToast = toast.loading(t('chat.voice.sending'));

          const res = await apiClient.get<any>(`/messages/presigned-url?fileName=${encodeURIComponent(audioFile.name)}&fileType=${encodeURIComponent(audioFile.type)}`);
          const presignedUrl = typeof res === 'string' ? res : (res?.data || res?.url || res);

          await fetch(presignedUrl, {
            method: 'PUT',
            body: audioFile,
            headers: { 'Content-Type': audioFile.type },
          });

          const s3Url = presignedUrl.split('?')[0];
          await handleSendMessage(s3Url, 'VOICE', audioFile.name, audioFile.size, duration);

          toast.dismiss(uploadToast);
          toast.success(t('chat.voice.send_success'));
        } catch (err) {
          console.error('Voice upload error:', err);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.info(t('chat.voice.recording_hint'));
    } catch (err) {
      console.error('Microphone error:', err);
      toast.error(t('chat.voice.mic_error'));
    } finally {
      setIsInitializingMic(false);
    }
  }, [handleSendMessage, isInitializingMic, isRecording, t]);

  const handleImageClick = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleFileIconClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFilePopoverOpen(prev => !prev);
  }, []);

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
    setIsFilePopoverOpen(false);
  }, []);

  const readImageDimensionsFromUrl = useCallback((url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const width = image.naturalWidth || image.width || 0;
        const height = image.naturalHeight || image.height || 0;
        if (width > 0 && height > 0) {
          resolve({ width, height });
          return;
        }
        reject(new Error('Cannot resolve image dimensions'));
      };
      image.onerror = () => reject(new Error('Cannot load image dimensions'));
      image.src = url;
    });
  }, []);

  // Resize + compress an image File to max 1568px on the longest side at JPEG 0.85.
  // GPT-4o high-detail tiles are 512px each; 1568px = 3×512 + 32 — the sweet spot
  // that maximises recognised detail while minimising token cost and transfer size.
  const compressImageForAiVision = useCallback((file: File): Promise<File> => {
    const MAX_DIM = 1568;
    const QUALITY = 0.85;
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(1, MAX_DIM / Math.max(w, h));
        const tw = Math.round(w * scale);
        const th = Math.round(h * scale);

        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, tw, th);

        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
          resolve(compressed);
        }, 'image/jpeg', QUALITY);
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });
  }, []);

  const handleFileUpload = useCallback(async (file: File, caption?: string) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File "${file.name}" vượt quá giới hạn 50MB`);
      return;
    }
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    // For AI vision: compress/resize to ≤1568px before S3 upload so GPT-4o
    // receives a high-detail-friendly image without oversized base64 payload.
    let uploadFile = file;
    if (isImage && selectedChat?.isAi) {
      uploadFile = await compressImageForAiVision(file);
    }
    const localPreviewUrl = (isImage || isVideo) ? URL.createObjectURL(file) : undefined;

    let imageDimensions: { width: number; height: number } | undefined;
    if (isImage && localPreviewUrl) {
      try {
        imageDimensions = await readImageDimensionsFromUrl(localPreviewUrl);
      } catch {
        imageDimensions = { width: 4, height: 3 };
      }
    }

    const tempId = `temp-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const capturedReplyTo = replyingTo;

    if (localPreviewUrl) {
      const optimisticType = isImage ? 'IMAGE' : 'VIDEO';
      setMessages(prev => [...prev, {
        id: tempId,
        text: localPreviewUrl,
        type: optimisticType,
        replyToMessageId: capturedReplyTo?.id || null,
        sender: 'Me',
        senderId: currentUser?.id,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        reactions: [],
        rawDate: new Date(),
        isEdited: false,
        isRecalled: false,
        forwardedFromSenderName: null,
        width: imageDimensions?.width,
        height: imageDimensions?.height,
        caption: caption?.trim() || undefined,
        isUploading: true,
        uploadProgress: 0,
      }]);
      setShouldScrollToBottom(true);
      setReplyingTo(null);
    } else {
      // Optimistic message for non-media file attachments (MEDIA type)
      setMessages(prev => [...prev, {
        id: tempId,
        text: '',
        type: 'MEDIA',
        fileName: file.name,
        fileSize: file.size,
        replyToMessageId: capturedReplyTo?.id || null,
        sender: 'Me',
        senderId: currentUser?.id,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        reactions: [],
        rawDate: new Date(),
        isEdited: false,
        isRecalled: false,
        forwardedFromSenderName: null,
        caption: caption?.trim() || undefined,
        isUploading: true,
        uploadProgress: 0,
      }]);
      setShouldScrollToBottom(true);
      setReplyingTo(null);
    }

    try {
      const res = await apiClient.get<any>(`/messages/presigned-url?fileName=${encodeURIComponent(uploadFile.name)}&fileType=${encodeURIComponent(uploadFile.type)}`);  
      const presignedUrl = typeof res === 'string' ? res : (res?.data || res?.url || res);

      if (!presignedUrl || typeof presignedUrl !== 'string') {
        throw new Error('Invalid presigned URL');
      }

      // Use XMLHttpRequest for upload progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', uploadFile.type);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, uploadProgress: percent } : m));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('S3 upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('S3 upload failed'));
        xhr.send(uploadFile);
      });

      const s3Url = presignedUrl.split('?')[0];
      let msgType = 'MEDIA';
      if (isImage) msgType = 'IMAGE';
      else if (isVideo) msgType = 'VIDEO';

      let videoDur: number | undefined;
      if (msgType === 'VIDEO') {
        videoDur = await new Promise<number>(resolve => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            URL.revokeObjectURL(video.src);
            resolve(Math.round(video.duration));
          };
          video.onerror = () => resolve(0);
          video.src = URL.createObjectURL(file);
        });
      }

      await handleSendMessage(
        s3Url,
        msgType,
        file.name,
        file.size,
        undefined,
        videoDur,
        tempId,
        imageDimensions?.width,
        imageDimensions?.height,
        caption?.trim() || undefined
      );

      if (localPreviewUrl) {
        setTimeout(() => URL.revokeObjectURL(localPreviewUrl), 2000);
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      console.error('Upload error:', error);
      toast.error(t('chat.upload.error'));
    }
  }, [compressImageForAiVision, currentUser?.id, handleSendMessage, readImageDimensionsFromUrl, replyingTo, selectedChat, t]);

  const handleSendImageQueue = useCallback(async () => {
    const items = [...imageQueue];
    const rawMsg = message?.trim() || '';
    const globalCaption = rawMsg.replace(/<[^>]*>/g, '').trim() ? rawMsg : undefined;
    if (globalCaption) setMessage('');

    // Single image: send as individual IMAGE message (existing behavior)
    if (items.length === 1) {
      closeImageQueue();
      const { file, caption } = items[0];
      await handleFileUpload(file, caption?.trim() || globalCaption);
      return;
    }

    // Multiple images: close queue WITHOUT revoking blob URLs (we need them for preview)
    setImageQueue([]);
    setCaptionModalIdx(null);

    // Multiple images: upload all to S3, then send ONE IMAGE_GROUP message
    const tempId = `temp-album-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const previewUrls = items.map(item => item.previewUrl);

    // Show optimistic album message
    setMessages(prev => [...prev, {
      id: tempId,
      text: '',
      type: 'IMAGE_GROUP',
      replyToMessageId: replyingTo?.id || null,
      sender: 'Me',
      senderId: currentUser?.id,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      reactions: [],
      rawDate: new Date(),
      isEdited: false,
      isRecalled: false,
      forwardedFromSenderName: null,
      caption: globalCaption,
      isUploading: true,
      uploadProgress: 0,
      attachments: previewUrls.map(url => ({ url })),
    }]);
    setShouldScrollToBottom(true);
    setReplyingTo(null);

    try {
      const s3Urls: string[] = [];
      for (let i = 0; i < items.length; i++) {
        const file = items[i].file;
        // Get presigned URL
        const res = await apiClient.get<any>(
          `/messages/presigned-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`
        );
        const presignedUrl = typeof res === 'string' ? res : (res?.data || res?.url || res);

        // Upload to S3
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', presignedUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const fileProgress = Math.round((event.loaded / event.total) * 100);
              const overallProgress = Math.round(((i * 100 + fileProgress) / items.length));
              setMessages(prev => prev.map(m => m.id === tempId ? { ...m, uploadProgress: overallProgress } : m));
            }
          };
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('S3 upload failed'));
          xhr.onerror = () => reject(new Error('S3 upload failed'));
          xhr.send(file);
        });

        s3Urls.push(presignedUrl.split('?')[0]);
      }

      // Send single IMAGE_GROUP message with all URLs
      const payload: any = {
        content: s3Urls[0], // First URL as content (for backward compatibility)
        messageType: 'IMAGE_GROUP',
        caption: globalCaption || undefined,
        replyToMessageId: replyingTo?.id || undefined,
        mediaUrls: s3Urls,
        conversationId: selectedChat?.id?.toString(),
      };

      const res = await apiClient.post<any>('/messages', payload);
      console.log('[IMAGE_GROUP] POST /messages response:', JSON.stringify(res, null, 2));
      const data = res?.message ? res : (res?.success ? res.data : res);
      const newMsg = data?.message || data;
      console.log('[IMAGE_GROUP] Parsed newMsg:', newMsg?.messageId, newMsg?.messageType, 'attachments:', newMsg?.attachments?.length);

      const resolvedAttachments = newMsg?.attachments?.length
        ? newMsg.attachments
        : s3Urls.map((url: string) => ({ url }));

      if (newMsg?.messageId || newMsg?.id) {
        const realId = String(newMsg.messageId || newMsg.id);
        onUpdateConversationRef.current?.(
          selectedChat!.id,
          '[Album ảnh]',
          new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
        );

        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === tempId);
          if (idx !== -1) {
            if (prev.some(m => m.id === realId)) {
              return prev.filter(m => m.id !== tempId);
            }
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              id: realId,
              text: newMsg.content || '',
              type: 'IMAGE_GROUP',
              isUploading: false,
              uploadProgress: undefined,
              caption: newMsg.caption || globalCaption,
              attachments: resolvedAttachments,
            };
            return next;
          }
          if (prev.some(m => m.id === realId)) return prev;
          return [...prev, {
            id: realId,
            text: newMsg.content || '',
            type: 'IMAGE_GROUP',
            replyToMessageId: newMsg.replyToMessageId || null,
            sender: 'Me',
            senderId: currentUser?.id,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            reactions: [],
            rawDate: new Date(),
            isEdited: false,
            isRecalled: false,
            forwardedFromSenderName: null,
            caption: newMsg.caption || globalCaption,
            attachments: resolvedAttachments,
          }];
        });
        setShouldScrollToBottom(true);
      }

      // Cleanup preview URLs
      previewUrls.forEach(url => {
        try { URL.revokeObjectURL(url); } catch { }
      });
    } catch (error) {
      console.error('[IMAGE_GROUP] Upload/send error:', error);
      // On error, keep images visible but clear upload overlay
      setMessages(prev => prev.map(m => m.id === tempId ? {
        ...m,
        isUploading: false,
        uploadProgress: undefined,
        attachments: m.attachments,
      } : m));
      previewUrls.forEach(url => {
        try { URL.revokeObjectURL(url); } catch { }
      });
      toast.error(t('chat.upload.error'));
    } finally {
      // Safety net: always clear upload overlay after a short delay
      setTimeout(() => {
        setMessages(prev => prev.map(m =>
          (m.id === tempId || (m.type === 'IMAGE_GROUP' && m.sender === 'Me' && m.isUploading))
            ? { ...m, isUploading: false, uploadProgress: undefined }
            : m
        ));
      }, 2000);
    }
  }, [closeImageQueue, handleFileUpload, imageQueue, message, currentUser?.id, replyingTo, selectedChat, t]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) openImageQueue(files);
    e.target.value = '';
  }, [openImageQueue]);

  const handleVideoClick = useCallback(() => {
    videoInputRef.current?.click();
    setIsFilePopoverOpen(false);
  }, []);

  const handleVideoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      const attachment = { file, previewUrl };
      pendingAttachmentRef.current = attachment;
      setPendingAttachment(attachment);
    }
    e.target.value = '';
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const attachment = { file, previewUrl: null };
      pendingAttachmentRef.current = attachment;
      setPendingAttachment(attachment);
    }
    e.target.value = '';
  }, []);

  const clearPendingAttachment = useCallback(() => {
    if (pendingAttachmentRef.current?.previewUrl) {
      URL.revokeObjectURL(pendingAttachmentRef.current.previewUrl);
    }
    pendingAttachmentRef.current = null;
    setPendingAttachment(null);
  }, []);

  const handleSendWithAttachment = useCallback(async () => {
    const attachment = pendingAttachmentRef.current;
    if (attachment) {
      const captionText = message?.trim() || undefined;
      clearPendingAttachment();
      if (captionText) setMessage('');
      await handleFileUpload(attachment.file, captionText);
      return;
    }
    await handleSendMessage();
  }, [clearPendingAttachment, handleFileUpload, handleSendMessage, message]);

  const sendTypingIndicator = useCallback(() => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi || !currentUser?.id) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;

    websocketRef.current.send(`/app/chat/${selectedChat.id}/typing`, {
      userId: currentUser.id,
      displayName: currentUser.full_name || currentUser.display_name || 'User',
      typing: true,
    });
  }, [selectedChat?.id, selectedChat?.isAi, selectedChat?.isNew, currentUser?.display_name, currentUser?.full_name, currentUser?.id]);

  const sendStopTypingIndicator = useCallback(() => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi || !currentUser?.id) return;

    websocketRef.current.send(`/app/chat/${selectedChat.id}/typing`, {
      userId: currentUser.id,
      displayName: currentUser.full_name || currentUser.display_name || 'User',
      typing: false,
    });
  }, [selectedChat?.id, selectedChat?.isAi, selectedChat?.isNew, currentUser?.display_name, currentUser?.full_name, currentUser?.id]);

  // Handle @mention input change — detect @ trigger and update message
  const handleMentionInput = useCallback((newValue: string) => {
    setMessage(newValue);

    // Find the @ position relative to cursor (detect @query at end of current word)
    const atIdx = newValue.lastIndexOf('@');
    if (atIdx !== -1) {
      const afterAt = newValue.slice(atIdx + 1);
      // Only open dropdown if no spaces in the query (i.e., still typing the name)
      if (!afterAt.includes(' ')) {
        setMentionQuery(afterAt);
        setMentionDropdownOpen(true);
        return;
      }
    }
    setMentionDropdownOpen(false);
  }, []);

  const handleSelectMention = useCallback((member: MentionMember) => {
    // Replace the @query in the message text with @DisplayName + space
    const atIdx = message.lastIndexOf('@');
    if (atIdx !== -1) {
      const before = message.slice(0, atIdx);
      const newMessage = `${before}@${member.displayName} `;
      setMessage(newMessage);
    }
    setMentionDropdownOpen(false);
    setPendingMentions(prev => {
      if (prev.some(m => m.userId === member.userId)) return prev;
      return [...prev, member];
    });
    messageInputRef.current?.focus();
  }, [message, messageInputRef]);

  const sendReadReceipt = useCallback((messageId: string) => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi || !currentUser?.id) return;
    if (lastSentReadRef.current === messageId) return;

    lastSentReadRef.current = messageId;
    websocketRef.current.send(`/app/chat/${selectedChat.id}/read`, {
      userId: currentUser.id,
      displayName: currentUser.full_name || currentUser.display_name || 'User',
      avatarUrl: currentUser.avatar_url || '',
      messageId,
    });
  }, [selectedChat?.id, selectedChat?.isAi, selectedChat?.isNew, currentUser?.avatar_url, currentUser?.display_name, currentUser?.full_name, currentUser?.id]);

  useEffect(() => {
    if (!selectedChat?.id || selectedChat.isNew) return;

    const typingSub = websocketRef.current.subscribe(`/topic/chat/${selectedChat.id}/typing`, msg => {
      try {
        const data = JSON.parse(msg.body);
        if (data.userId === currentUser?.id) return;

        const resolvedDisplayName = data.displayName
          || (data.userId === AI_TYPING_USER_ID ? (selectedChat.name || 'Fruvia Chatbot') : t('common.unknown_user'));

        if (data.typing) {
          setTypingUsers(prev => {
            if (prev.some(user => user.userId === data.userId)) return prev;
            return [...prev, { userId: data.userId, displayName: resolvedDisplayName, avatarUrl: data.avatarUrl }];
          });

          const existing = typingTimeoutRef.current.get(data.userId);
          if (existing) clearTimeout(existing);

          if (data.userId === AI_TYPING_USER_ID) {
            typingTimeoutRef.current.delete(data.userId);
            return;
          }

          typingTimeoutRef.current.set(data.userId, setTimeout(() => {
            setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
            typingTimeoutRef.current.delete(data.userId);
          }, 3000));
        } else {
          setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
          const existing = typingTimeoutRef.current.get(data.userId);
          if (existing) {
            clearTimeout(existing);
            typingTimeoutRef.current.delete(data.userId);
          }
        }
      } catch {
        // Ignore malformed payload.
      }
    });

    return () => {
      typingSub?.unsubscribe();
      setTypingUsers([]);
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, [selectedChat?.id, selectedChat?.isNew, selectedChat?.name, currentUser?.id, t]);

  useEffect(() => {
    if (typingUsers.length > 0) {
      const container = scrollContainerRef.current;
      if (!container) return;
      container.dataset.programmaticScroll = '1';
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container.scrollTop < container.scrollHeight - container.clientHeight) {
            container.scrollTop = container.scrollHeight;
          }
          delete container.dataset.programmaticScroll;
        });
      });
    }
  }, [typingUsers.length, scrollContainerRef]);

  // Handle jump-to-message when conversation is already open (targetMessageId changes
  // but selectedChat.id doesn't — so fetchMessages won't re-run)
  useEffect(() => {
    if (!targetMessageId || messages.length === 0) return;

    const scrollToTarget = (attempts = 0) => {
      const el = document.getElementById(`msg-${targetMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-msg');
        setTimeout(() => el.classList.remove('highlight-msg'), 2500);
        onClearTargetMessage?.();
      } else if (attempts < 8) {
        setTimeout(() => scrollToTarget(attempts + 1), 150);
      } else {
        onClearTargetMessage?.();
      }
    };

    scrollToTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMessageId]);

  useEffect(() => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi) return;

    const fetchReadStatus = async () => {
      try {
        const res = await apiClient.get(`/conversations/${selectedChat.id}/read-status`);
        const data = res?.success ? res.data : (Array.isArray(res) ? res : []);
        if (!Array.isArray(data)) return;

        const initial: Record<string, ReadReceipt> = {};
        data.forEach((entry: any) => {
          if (entry.userId && entry.messageId) {
            initial[entry.userId] = {
              displayName: entry.displayName || 'User',
              avatarUrl: entry.avatarUrl || undefined,
              messageId: entry.messageId,
            };
          }
        });
        setReadReceipts(initial);
      } catch (error) {
        console.error('Failed to fetch read status:', error);
      }
    };

    fetchReadStatus();
  }, [selectedChat?.id, selectedChat?.isAi]);

  useEffect(() => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi) return;

    const readSub = websocketRef.current.subscribe(`/topic/chat/${selectedChat.id}/read`, msg => {
      try {
        const data = JSON.parse(msg.body);
        if (data.userId === currentUser?.id) return;

        setReadReceipts(prev => ({
          ...prev,
          [data.userId]: {
            displayName: data.displayName,
            avatarUrl: data.avatarUrl,
            messageId: data.messageId,
          },
        }));
      } catch {
        // Ignore malformed payload.
      }
    });

    return () => {
      readSub?.unsubscribe();
      lastSentReadRef.current = null;
    };
  }, [selectedChat?.id, selectedChat?.isAi, selectedChat?.isNew, currentUser?.id]);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender !== 'Me') {
      sendReadReceipt(lastMsg.id);
    }
  }, [messages, sendReadReceipt]);

  useEffect(() => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi) return;

    const fetchDeliveredStatus = async () => {
      try {
        const res = await apiClient.get(`/conversations/${selectedChat.id}/delivered-status`);
        const data = res?.success ? res.data : (Array.isArray(res) ? res : []);
        if (!Array.isArray(data)) return;

        const initial: Record<string, { messageId: string; lastDeliveredAt?: string }> = {};
        data.forEach((entry: any) => {
          if (entry.userId && entry.messageId) {
            initial[entry.userId] = {
              messageId: entry.messageId,
              lastDeliveredAt: entry.lastDeliveredAt || undefined,
            };
          }
        });
        setDeliveredReceipts(initial);
      } catch (error) {
        console.error('Failed to fetch delivered status:', error);
      }
    };

    fetchDeliveredStatus();
  }, [selectedChat?.id, selectedChat?.isAi]);

  useEffect(() => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi) return;

    const deliveredSub = websocketRef.current.subscribe(`/topic/chat/${selectedChat.id}/delivered`, msg => {
      try {
        const data = JSON.parse(msg.body);
        if (data.userId === currentUser?.id) return;

        setDeliveredReceipts(prev => ({
          ...prev,
          [data.userId]: {
            messageId: data.messageId,
            lastDeliveredAt: data.lastDeliveredAt || new Date().toISOString(),
          },
        }));
      } catch {
        // Ignore malformed payload.
      }
    });

    return () => {
      deliveredSub?.unsubscribe();
    };
  }, [selectedChat?.id, selectedChat?.isAi, selectedChat?.isNew, currentUser?.id]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat?.id) return;

      if (selectedChat.isNew) {
        setMessages([]);
        setHasMore(false);
        setIsLoadingMore(false);
        setIsInitialLoading(false);
        return;
      }

      const convIdStr = String(selectedChat.id);
      const isConversationChange = prevFetchedConvIdRef.current !== convIdStr;
      prevFetchedConvIdRef.current = convIdStr;

      try {
        setIsInitialLoading(true);
        setIsLoadingMore(true);

        // ── IndexedDB Read-First: render local messages instantly ──
        if (!targetMessageId) {
          const localItems = await getLocalMessages(String(selectedChat.id), 20);
          if (localItems.length > 0) {
            const localSorted = [...localItems].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const localMapped = filterLocallyDeletedMessages(localSorted.map(item => mapIncomingMessage(item, currentUser?.id)));
            if (isConversationChange) {
              // Full reset when switching conversations
              setMessages(localMapped);
            } else {
              // On refresh trigger: merge to preserve realtime messages not yet in IndexedDB
              setMessages(prev => {
                const localIds = new Set(localMapped.map(m => m.id));
                const realtimeOnly = prev.filter(m => !localIds.has(m.id) && !m.id.startsWith('temp-') && !locallyDeletedMessageIdsRef.current.has(String(m.id)));
                if (realtimeOnly.length === 0) return localMapped;
                return [...localMapped, ...realtimeOnly].sort((a, b) => (a.rawDate?.getTime() ?? 0) - (b.rawDate?.getTime() ?? 0));
              });
            }
            setIsInitialLoading(false);
            setShouldScrollToBottom(true);
          } else if (isConversationChange) {
            // Only clear messages when switching to a different conversation
            setMessages([]);
          }
        } else {
          setMessages([]);
        }

        // ── API Fetch & Sync ──
        let items: any[] = [];
        let hasMoreData = false;
        let totalFromServer = 0;

        if (targetMessageId) {
          const res = await apiClient.get(
            `/messages/conversation/${selectedChat.id}/around/${targetMessageId}?size=40`
          );
          if (res.success && res.data) {
            items = Array.isArray(res.data) ? res.data : (res.data.content || []);
            totalFromServer = res.data.totalElements ?? items.length;
          } else if (Array.isArray(res)) {
            items = res;
            totalFromServer = items.length;
          }
          hasMoreData = true; // always allow scroll up/down after jump-to-message
        } else {
          const res = await apiClient.get(`/messages/conversation/${selectedChat.id}?size=30&page=0`);
          if (res.success && res.data) {
            items = Array.isArray(res.data) ? res.data : (res.data.content || []);
            totalFromServer = res.data.totalElements ?? 0;
            hasMoreData = items.length < totalFromServer;
          } else if (res.content) {
            items = res.content;
            totalFromServer = res.totalElements ?? 0;
            hasMoreData = items.length < totalFromServer;
          }
        }

        totalMessagesRef.current = totalFromServer;

        console.log('[ChatWindow] API Messages fetched:', { count: items.length, totalFromServer, firstItem: items[0] });

        const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        let mapped = filterLocallyDeletedMessages(sorted.map(item => mapIncomingMessage(item, currentUser?.id)));

        // Fallback: nếu AI conversation chưa có tin nhắn nào (conversation cũ chưa có welcome),
        // inject virtual greeting phía frontend
        if (selectedChat.isAi && mapped.length === 0) {
          const userName = currentUser?.full_name || currentUser?.display_name || '';
          const greetingText = userName
            ? `Chào mừng bạn trở lại **${userName}**! 👋\n\nTôi là **Fruvia Chatbot** — trợ lý thông minh của bạn. Hãy hỏi tôi bất cứ điều gì nhé! 😊`
            : `Xin chào! 👋\n\nTôi là **Fruvia Chatbot** — trợ lý thông minh của bạn. Hãy hỏi tôi bất cứ điều gì nhé! 😊`;
          mapped = [{
            id: 'ai-greeting-virtual',
            text: greetingText,
            type: 'TEXT',
            sender: 'Other',
            senderId: AI_TYPING_USER_ID,
            senderName: 'Fruvia Chatbot',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            reactions: [],
            rawDate: new Date(),
            isEdited: false,
            isPinned: false,
            isDeleted: false,
            replyToMessageId: null,
          } as any];
        }

        // Upsert API results to IndexedDB for future instant loads
        upsertLocalMessages(items).catch(() => { });

        // Merge: keep any real-time WebSocket messages that arrived during fetch
        setMessages(prev => {
          const apiIds = new Set(mapped.map(m => m.id));
          const realtimeOnly = prev.filter(m => !apiIds.has(m.id) && !m.id.startsWith('temp-') && !locallyDeletedMessageIdsRef.current.has(String(m.id)));
          if (realtimeOnly.length === 0) return mapped;
          const merged = [...mapped, ...realtimeOnly].sort(
            (a, b) => (a.rawDate?.getTime() ?? 0) - (b.rawDate?.getTime() ?? 0)
          );
          return merged;
        });
        apiClient.patch(`/conversations/${selectedChat.id}/mark-as-read`, {}).catch(() => { });
        setHasMore(hasMoreData);
        setIsLoadingMore(false);
        setIsInitialLoading(false);

        // If a targetMessageId was requested, scroll to it after render; otherwise scroll to bottom
        if (targetMessageId) {
          const scrollToTarget = (attempts = 0) => {
            const el = document.getElementById(`msg-${targetMessageId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('highlight-msg');
              setTimeout(() => el.classList.remove('highlight-msg'), 2500);
              onClearTargetMessage?.();
            } else if (attempts < 8) {
              setTimeout(() => scrollToTarget(attempts + 1), 150);
            } else {
              setShouldScrollToBottom(true);
              onClearTargetMessage?.();
            }
          };
          setTimeout(() => scrollToTarget(), 100);
        } else {
          setShouldScrollToBottom(true);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        setIsLoadingMore(false);
        setIsInitialLoading(false);
      }
    };

    fetchMessages();

    let subscription: { unsubscribe?: () => void } | null = null;

    if (selectedChat?.id && !selectedChat.isNew) {
      const topic = `/topic/chat/${selectedChat.id}`;
      subscription = websocketRef.current.subscribe(topic, msg => {
        try {
          const raw = JSON.parse(msg.body);
          const newMsg = raw.message || raw;

          if (newMsg.type === 'REACTION_UPDATE') {
            setMessages(prev => prev.map(messageItem => {
              if (messageItem.id === String(newMsg.messageId)) {
                const emoji = mapReactionToEmoji(newMsg.reactionType);
                const newReactions = messageItem.reactions ? [...messageItem.reactions] : [];
                if (emoji && newMsg.action !== 'REMOVE') {
                  newReactions.push({
                    emoji,
                    userId: newMsg.userId,
                    id: newMsg.reactionId,
                    userName: newMsg.userName,
                    userAvatar: newMsg.userAvatar,
                  });
                }
                return { ...messageItem, reactions: newReactions };
              }
              return messageItem;
            }));
            return;
          }

          if (newMsg.type === 'MESSAGE_EDIT') {
            setMessages(prev => prev.map(messageItem => {
              if (messageItem.id === String(newMsg.messageId)) {
                return {
                  ...messageItem,
                  text: normalizeIncomingContent(newMsg.content, messageItem.senderId, messageItem.type, messageItem.sender),
                  isEdited: true,
                };
              }
              return messageItem;
            }));
            return;
          }

          if (newMsg.type === 'MESSAGE_RECALL') {
            setMessages(prev => prev.map(messageItem => {
              if (messageItem.id === String(newMsg.messageId)) {
                return { ...messageItem, isRecalled: true, text: '' };
              }
              return messageItem;
            }));

            onUpdateConversationRef.current?.(selectedChat.id, t('chat.message.recalled'));
            return;
          }

          if (newMsg.type === 'MESSAGE_PIN' || newMsg.type === 'MESSAGE_UNPIN') {
            fetchPinnedMessages(String(selectedChat.id));

            const isPin = newMsg.type === 'MESSAGE_PIN';
            const actorId: string = isPin ? (newMsg.pinnedBy || '') : (newMsg.unpinnedBy || '');
            const actorName: string = isPin
              ? (newMsg.pinnedByName || (actorId === currentUser?.id ? 'Bạn' : 'Ai đó'))
              : (newMsg.unpinnedByName || (actorId === currentUser?.id ? 'Bạn' : 'Ai đó'));
            const targetMessageId = String(newMsg.replyToMessageId || newMsg.messageId || '');
            const pinnedContent: string = newMsg.content
              || pinnedMessagesRef.current.find(p => p.messageId === targetMessageId)?.content
              || '';
            const now = new Date();
            const notifMsg: ChatMessage = {
              id: `notify-${isPin ? 'pin' : 'unpin'}-${newMsg.messageId}-${now.getTime()}`,
              text: pinnedContent,
              type: isPin ? 'MESSAGE_PIN' : 'MESSAGE_UNPIN',
              sender: actorName,
              senderId: actorId,
              time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
              rawDate: now,
              reactions: [],
              replyToMessageId: targetMessageId || null,
            };
            setMessages(prev => {
              if (prev.some(m => m.id === notifMsg.id)) return prev;
              return [...prev, notifMsg];
            });
            onUpdateConversationRef.current?.(
              selectedChat.id,
              isPin ? `📌 ${actorName} đã ghim một tin nhắn` : `📌 ${actorName} đã bỏ ghim một tin nhắn`
            );
            return;
          }

          onUpdateConversationRef.current?.(
            selectedChat.id,
            getSnippet(
              normalizeIncomingContent(newMsg.content, newMsg.senderId, newMsg.messageType, newMsg.senderName),
              newMsg.messageType,
              t
            ),
            newMsg.createdAt
              ? new Date(newMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
              : undefined
          );

          // Auto-send delivered ACK for messages from other users
          if (newMsg.senderId && newMsg.senderId !== currentUser?.id && newMsg.senderId !== 'SYSTEM' && currentUser?.id) {
            const msgIdForDelivery = String(newMsg.messageId || newMsg.id);
            websocketRef.current.send(`/app/chat/${selectedChat.id}/delivered`, {
              userId: currentUser.id,
              messageId: msgIdForDelivery,
            });
          }

          setMessages(prev => {
            const exists = prev.some(m => m.id === String(newMsg.messageId || newMsg.id));
            if (exists) return prev;

            if (locallyDeletedMessageIdsRef.current.has(String(newMsg.messageId || newMsg.id))) {
              return prev;
            }

            const mappedMsg: ChatMessage = {
              id: String(newMsg.messageId || newMsg.id),
              text: normalizeIncomingContent(newMsg.content, newMsg.senderId, newMsg.messageType, newMsg.senderName),
              type: newMsg.messageType || 'TEXT',
              width: newMsg.width,
              height: newMsg.height,
              replyToMessageId: newMsg.replyToMessageId || null,
              sender: newMsg.senderId === 'SYSTEM'
                ? 'SYSTEM'
                : newMsg.senderId === currentUser?.id
                  ? 'Me'
                  : (newMsg.senderId === AI_TYPING_USER_ID ? (newMsg.senderName || 'Fruvia Chatbot') : newMsg.senderName),
              senderId: newMsg.senderId,
              time: newMsg.createdAt
                ? new Date(newMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
                : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
              avatar: newMsg.senderAvatarUrl,
              reactions: [],
              rawDate: newMsg.createdAt ? new Date(newMsg.createdAt) : new Date(),
              isEdited: newMsg.isEdited || false,
              isRecalled: newMsg.isRecalled || false,
              forwardedFromSenderName: newMsg.forwardedFromSenderName || null,
              caption: newMsg.caption || undefined,
              fileName: newMsg.fileName || undefined,
              fileSize: newMsg.fileSize || undefined,
              isUploading: false,
              attachments: newMsg.attachments || undefined,
            };

            if (newMsg.senderId === currentUser?.id && ['IMAGE', 'VIDEO', 'MEDIA', 'IMAGE_GROUP'].includes(mappedMsg.type)) {
              const optimisticIdx = prev.findIndex(
                messageItem => messageItem.sender === 'Me' && messageItem.isUploading && ['IMAGE', 'VIDEO', 'MEDIA', 'IMAGE_GROUP'].includes(messageItem.type)
              );
              if (optimisticIdx !== -1) {
                const next = [...prev];
                const optimisticMsg = next[optimisticIdx];
                next[optimisticIdx] = {
                  ...mappedMsg,
                  width: mappedMsg.width || optimisticMsg.width,
                  height: mappedMsg.height || optimisticMsg.height,
                  caption: mappedMsg.caption || optimisticMsg.caption,
                  fileName: mappedMsg.fileName || optimisticMsg.fileName,
                  fileSize: mappedMsg.fileSize || optimisticMsg.fileSize,
                };
                setShouldScrollToBottom(true);
                return next;
              }
            }

            // Replace optimistic text message (temp-*) from current user
            if (newMsg.senderId === currentUser?.id && mappedMsg.type === 'TEXT') {
              const optimisticIdx = prev.findIndex(
                messageItem => messageItem.id.startsWith('temp-') && messageItem.sender === 'Me' && messageItem.type === 'TEXT' && messageItem.text === mappedMsg.text
              );
              if (optimisticIdx !== -1) {
                const next = [...prev];
                next[optimisticIdx] = mappedMsg;
                setShouldScrollToBottom(true);
                return next;
              }
            }

            setShouldScrollToBottom(true);
            return [...prev, mappedMsg];
          });
        } catch (error) {
          console.error('Failed to parse incoming WS message:', error);
        }
      });
    }

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [selectedChat?.id, selectedChat?.isNew, currentUser?.id, refreshTrigger, t]);

  // Listen for MESSAGE_LOCAL_DELETE events from other devices of the same user
  useEffect(() => {
    if (!currentUser?.id) return;
    const topic = `/topic/conversation-events/${currentUser.id}`;
    const sub = websocketRef.current.subscribe(topic, msg => {
      try {
        const event = JSON.parse(msg.body);
        if (event.type !== 'MESSAGE_LOCAL_DELETE') return;
        const msgId = String(event.messageId);
        const convId = String(event.conversationId);
        // Persist so it stays hidden after reload
        if (convId) {
          locallyDeletedMessageIdsRef.current = addDeletedMessageId(convId, currentUser?.id, msgId);
        }
        // Hide from current message list if the event is for the open conversation
        if (String(selectedChat?.id) === convId) {
          setMessages(prev => prev.filter(m => m.id !== msgId));
        }
      } catch {
        // ignore parse errors
      }
    });
    return () => { sub?.unsubscribe?.(); };
  }, [currentUser?.id, selectedChat?.id]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    setIsInitialLoading(true);
    closeImageQueue();
  }, [selectedChat?.id, closeImageQueue]);

  useLayoutEffect(() => {
    if (!shouldScrollToBottom) return;

    const container = scrollContainerRef.current;
    if (container) {
      if (isInitialLoadRef.current) {
        container.dataset.programmaticScroll = '1';
        container.scrollTop = container.scrollHeight;

        // Single rAF as a fallback for slow-rendering elements (like images)
        requestAnimationFrame(() => {
          if (container.scrollTop < container.scrollHeight - container.clientHeight) {
            container.scrollTop = container.scrollHeight;
          }
          delete container.dataset.programmaticScroll;
        });

        isInitialLoadRef.current = false;
      } else {
        container.dataset.programmaticScroll = '1';
        container.scrollTop = container.scrollHeight;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (container.scrollTop < container.scrollHeight - container.clientHeight) {
              container.scrollTop = container.scrollHeight;
            }
            delete container.dataset.programmaticScroll;
          });
        });
      }
    }

    setShouldScrollToBottom(false);
  }, [messages, shouldScrollToBottom]);

  const loadMoreMessages = useCallback(async () => {
    if (!selectedChat?.id || isLoadingMore || !hasMore || messages.length === 0) return;

    try {
      setIsLoadingMore(true);
      const oldestMessage = messages[0];
      const oldestMessageId = oldestMessage.id;
      const oldestCreatedAt = oldestMessage.rawDate?.toISOString() || '';
      const scrollContainer = scrollContainerRef.current;
      const previousScrollHeight = scrollContainer?.scrollHeight || 0;

      // ── IndexedDB first: try to get older messages locally ──
      let items: any[] = [];
      let hasMoreData = false;

      if (oldestCreatedAt) {
        const localItems = await getLocalMessagesBefore(String(selectedChat.id), oldestCreatedAt, 30);
        if (localItems.length > 0) {
          items = localItems;
        }
      }

      // If IndexedDB didn't have enough, fetch from API
      if (items.length < 30) {
        const res = await apiClient.get(`/messages/conversation/${selectedChat.id}?beforeId=${oldestMessageId}&size=30`);

        if (res.success && res.data) {
          const apiItems: any[] = Array.isArray(res.data) ? res.data : (res.data.content || []);
          const totalElements = res.data.totalElements ?? totalMessagesRef.current;
          if (totalElements > 0) totalMessagesRef.current = totalElements;

          // Merge local + API items, dedupe by id
          const mergedMap = new Map<string, any>();
          for (const m of items) mergedMap.set(String(m.messageId || m.id), m);
          for (const m of apiItems) mergedMap.set(String(m.messageId || m.id), m);
          items = Array.from(mergedMap.values());

          // Upsert API results to IndexedDB
          upsertLocalMessages(apiItems).catch(() => { });
        } else if (res.content) {
          const apiItems: any[] = res.content;
          const totalElements = res.totalElements ?? totalMessagesRef.current;
          if (totalElements > 0) totalMessagesRef.current = totalElements;

          const mergedMap = new Map<string, any>();
          for (const m of items) mergedMap.set(String(m.messageId || m.id), m);
          for (const m of apiItems) mergedMap.set(String(m.messageId || m.id), m);
          items = Array.from(mergedMap.values());

          upsertLocalMessages(apiItems).catch(() => { });
        }
      }

      if (items.length > 0) {
        const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const mappedOldItems = filterLocallyDeletedMessages(sorted.map(item => mapIncomingMessage(item, currentUser?.id)));

        setMessages(prev => {
          const prevIds = new Set(prev.map(m => m.id));
          const uniqueOldItems = mappedOldItems.filter(m => !prevIds.has(m.id));
          const newTotal = [...uniqueOldItems, ...prev];
          // hasMore based on total loaded vs server total
          hasMoreData = totalMessagesRef.current > 0
            ? newTotal.length < totalMessagesRef.current
            : items.length >= 30;
          return newTotal;
        });

        setHasMore(hasMoreData);

        setTimeout(() => {
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight - previousScrollHeight;
          }
        }, 0);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentUser?.id, hasMore, isLoadingMore, messages, selectedChat?.id]);

  useEffect(() => {
    if (inView && hasMore && !isLoadingMore && messages.length > 0) {
      loadMoreMessages();
    }
  }, [hasMore, inView, isLoadingMore, loadMoreMessages, messages.length]);

  const togglePicker = useCallback((tab: 'sticker' | 'emoji' | 'gif') => {
    if (isPickerOpen && pickerTab === tab) {
      setIsPickerOpen(false);
      return;
    }
    setPickerTab(tab);
    setIsPickerOpen(true);
  }, [isPickerOpen, pickerTab]);

  const onSelectSticker = useCallback((sticker: any) => {
    const shortcode = typeof sticker === 'string' ? sticker : sticker.shortcode;

    // Sticker từ sticker tab — value là S3 URL trực tiếp, gửi ngay như IMAGE
    if (shortcode.startsWith('http')) {
      handleSendMessage(shortcode, 'IMAGE');
      return;
    }

    const src = emojiMap[shortcode];
    
    if (editor) {
      if (src) {
        // Insert as an image node for visual feedback in the editor
        editor.chain().focus().setImage({ 
          src: src, 
          alt: shortcode, 
          title: shortcode 
        }).run();
      } else {
        editor.chain().focus().insertContent(shortcode).run();
      }
    } else {
      setMessage(prev => prev + shortcode);
    }
  }, [editor, handleSendMessage]);

  const handleReactMessage = useCallback(async (messageId: string, emoji: string) => {
    try {
      if (selectedChat.isAi) return;
      let reactionType = 'LIKE';
      switch (emoji) {
        case '❤️':
          reactionType = 'LOVE';
          break;
        case '😂':
          reactionType = 'HAHA';
          break;
        case '😲':
          reactionType = 'WOW';
          break;
        case '😭':
          reactionType = 'SAD';
          break;
        case '😡':
          reactionType = 'ANGRY';
          break;
        default:
          reactionType = 'LIKE';
      }
      await apiClient.post(`/messages/${messageId}/react`, { reactionType });
    } catch (error: unknown) {
      const rawMsg = error instanceof Error ? error.message : '';
      const normalizedMsg = rawMsg.toLowerCase();
      const isConnectionIssue =
        normalizedMsg.includes('network') ||
        normalizedMsg.includes('failed to fetch') ||
        normalizedMsg.includes('unable to connect') ||
        normalizedMsg.includes('connection refused');

      toast.error(
        isConnectionIssue
          ? 'Không thể kết nối máy chủ. Vui lòng kiểm tra backend và thử lại.'
          : (rawMsg || t('chat.message.send_error'))
      );
      console.error('React failed', error);
    }
  }, [selectedChat.isAi, t]);

  const handleEditMessage = useCallback(async (messageId: string) => {
    if (!editContent.trim()) return;
    try {
      await apiClient.put(`/messages/${messageId}?content=${encodeURIComponent(editContent.trim())}`, {});
      setEditingMessageId(null);
      setEditContent('');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || t('chat.message.edit_error');
      toast.error(msg);
    }
  }, [editContent, t]);

  const handleRecallMessage = useCallback(async (messageId: string) => {
    try {
      await apiClient.post(`/messages/${messageId}/recall`, {});
      setConfirmDialog(null);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || t('chat.message.recall_error');
      toast.error(msg);
      setConfirmDialog(null);
    }
  }, [t]);

  const handleDeleteLocal = useCallback(async (messageId: string) => {
    try {
      await apiClient.delete(`/messages/${messageId}/local`);
      if (selectedChat?.id) {
        locallyDeletedMessageIdsRef.current = addDeletedMessageId(selectedChat.id, currentUser?.id, messageId);

        const currentMessages = messagesRef.current;
        const deletingId = String(messageId);
        const lastVisibleMessage = currentMessages[currentMessages.length - 1];
        const isDeletingLastVisible = lastVisibleMessage?.id === deletingId;

        if (isDeletingLastVisible) {
          const remainingMessages = currentMessages.filter(
            (m) => m.id !== deletingId && !locallyDeletedMessageIdsRef.current.has(String(m.id))
          );
          const nextLastMessage = remainingMessages[remainingMessages.length - 1];
          const nextSnippet = nextLastMessage
            ? (nextLastMessage.isRecalled
              ? t('chat.message.recalled')
              : getSnippet(nextLastMessage.text, nextLastMessage.type, t))
            : t('chat.start_conversation');

          onUpdateConversationRef.current?.(
            selectedChat.id,
            nextSnippet,
            nextLastMessage?.time
          );
        }
      }
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setConfirmDialog(null);
      toast.success(t('chat.message.delete_local_success'));
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || t('chat.message.delete_error');
      toast.error(msg);
      setConfirmDialog(null);
    }
  }, [currentUser?.id, selectedChat?.id, t]);

  const startEditMessage = useCallback((msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.text);
    setContextMenu(null);
  }, []);

  const openContextMenu = useCallback((e: React.MouseEvent, msg: ChatMessage) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      msgId: msg.id,
      x: e.clientX,
      y: e.clientY,
      isMe: msg.sender === 'Me',
      type: msg.type,
      isSticker: msg.type === 'STICKER' || (msg.type === 'IMAGE' && Boolean(msg.text?.includes('/stickers/'))),
    });
  }, []);

  const fetchPinnedMessages = useCallback(async (convId: string) => {
    try {
      const res: any = await apiClient.get(`/messages/conversations/${convId}/pinned`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setPinnedMessages(list.map((pin: any) => ({
        ...(() => {
          const messageId = String(pin.messageId || '');
          const relatedMessage = messagesRef.current.find((m) => String(m.id) === messageId);
          const rawContent = String(pin.content || '');
          const messageType = String(pin.messageType || '').toUpperCase();

          const inferredLinkUrl =
            pin.linkUrl
            || pin.link_url
            || pin.url
            || extractFirstUrl(rawContent)
            || extractFirstUrl(relatedMessage?.text)
            || '';

          const relatedText = relatedMessage?.text || '';
          const resolvedContent = messageType === 'LINK'
            ? (
              inferredLinkUrl
              || (!isLinkPlaceholderText(rawContent) ? rawContent : '')
              || (!isLinkPlaceholderText(relatedText) ? relatedText : '')
              || rawContent
            )
            : rawContent;

          return {
            id: pin.id,
            messageId,
            content: resolvedContent,
            linkUrl: inferredLinkUrl || undefined,
            senderName: pin.senderName,
            messageType: pin.messageType,
            pinnedAt: pin.pinnedAt,
          };
        })(),
      })));
    } catch {
      setPinnedMessages([]);
    }
  }, []);

  const handlePinMessage = useCallback(async (messageId: string) => {
    try {
      await apiClient.post(`/messages/${messageId}/pin`, {});
      toast.success(t('chat.pin.pin_success'));
      if (selectedChat?.id) {
        fetchPinnedMessages(String(selectedChat.id));
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || t('chat.pin.pin_error');
      toast.error(msg);
    }
    setContextMenu(null);
  }, [fetchPinnedMessages, selectedChat?.id, t]);

  const handleUnpinMessage = useCallback(async (messageId: string) => {
    try {
      await apiClient.delete(`/messages/${messageId}/pin`);
      toast.success(t('chat.pin.unpin_success'));
      if (selectedChat?.id) {
        fetchPinnedMessages(String(selectedChat.id));
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || t('chat.pin.unpin_error');
      toast.error(msg);
    }
    setContextMenu(null);
  }, [fetchPinnedMessages, selectedChat?.id, t]);

  useEffect(() => {
    if (selectedChat?.id && !selectedChat.isNew) {
      fetchPinnedMessages(String(selectedChat.id));
    } else {
      setPinnedMessages([]);
    }
    setShowPinnedList(false);
  }, [fetchPinnedMessages, selectedChat?.id, selectedChat?.isNew]);

  const handleAcceptFriendRequest = useCallback(async () => {
    if (!pendingRequestId) return;
    setFriendActionLoading(true);
    try {
      await friendService.acceptRequest(pendingRequestId);
      toast.success(t('chat.friend.accept_success'));
      setFriendRequestStatus('friend');
    } catch {
      toast.error(t('chat.friend.accept_error'));
    }
    setFriendActionLoading(false);
  }, [pendingRequestId, t]);

  const handleSendFriendRequest = useCallback(async () => {
    const peerId = selectedChat.otherUserId || selectedChat.recipientId;
    if (!peerId) return;
    setFriendActionLoading(true);
    try {
      await friendService.sendRequest(peerId);
      toast.success(t('chat.friend.send_success'));
      setFriendRequestStatus('sent');
    } catch {
      toast.error(t('chat.friend.send_error'));
    }
    setFriendActionLoading(false);
  }, [selectedChat.otherUserId, selectedChat.recipientId, t]);

  const handleNicknameConfirm = useCallback(async (newName: string) => {
    try {
      await apiClient.patch(`/conversations/${selectedChat.id}/nickname`, { nickname: newName });
      const newNickname = newName && newName !== selectedChat.name ? newName : null;
      setNickname(newNickname);
      onNicknameChangeRef.current?.(selectedChat.id, newNickname);
      toast.success(t('chat.nickname.update_success'));
    } catch {
      toast.error(t('chat.nickname.update_error'));
    }
  }, [selectedChat.id, selectedChat.name, t]);

  const handleDownloadFile = useCallback((e: React.MouseEvent, url: string, fileName: string) => {
    e.stopPropagation();

    // Check if the URL is external (S3, Cloudinary, etc.)
    const isExternal = url.startsWith('http') && !url.includes(window.location.hostname);

    if (isExternal) {
      // Use direct link to the backend proxy. 
      // Since /files/download is public, we don't need the Authorization header.
      // This triggers the browser's native download behavior via Content-Disposition header from the server.
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
      const proxyUrl = `${apiBaseUrl}/files/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(fileName)}`;

      const link = document.createElement('a');
      link.href = proxyUrl;
      // No need for link.download as the server provides the filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For local/same-origin URLs, use the blob approach
    const triggerBlobDownload = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Download failed:', error);
        window.open(url, '_blank');
      }
    };

    triggerBlobDownload();
  }, []);

  useEffect(() => {
    return () => {
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }

      closeImageQueue();
    };
  }, [closeImageQueue]);

  const handleVideoCall = useCallback(() => {
    const peerId = selectedChat.otherUserId || selectedChat.recipientId;
    if (!peerId || !currentUser?.id) return;
    const currentCallState = webrtcService.getCallState();
    if (currentCallState !== 'idle') {
      console.log('[ChatWindow] Ignoring video call click because call is already active:', currentCallState);
      return;
    }
    webrtcService.startCall(
      peerId,
      selectedChat.nickname || selectedChat.name,
      selectedChat.avatar,
      selectedChat.id.toString(),
      currentUser.full_name || currentUser.display_name || 'User',
      currentUser.avatar_url || currentUser.avatarUrl || currentUser.avatar,
    );
  }, [selectedChat, currentUser]);

  return {
    t,
    onToggleSidebar,
    activeSidebar,
    selectedChat,
    currentUser,

    message,
    setMessage,
    isPickerOpen,
    pickerTab,
    nickname,
    isSendingAi,
    replyingTo,
    messageInputRef,
    forwardingMsg,
    isShareContactOpen,
    editingMessageId,
    editContent,
    setEditContent,
    contextMenu,
    confirmDialog,
    imageQueue,
    captionModalIdx,
    captionDraft,
    setCaptionDraft,
    openedImageSrc,
    pinnedMessages,
    showPinnedList,
    setShowPinnedList,
    friendRequestStatus,
    pendingRequestId,
    friendActionLoading,
    isNicknameModalOpen,
    isFilePopoverOpen,
    isChatImageUploadOpen,
    pendingAttachment,
    isMoreActionsOpen,
    setIsMoreActionsOpen,
    isPollModalOpen,
    setIsPollModalOpen,
    isReminderModalOpen,
    setIsReminderModalOpen,
    isNoteModalOpen,
    setIsNoteModalOpen,
    priority,
    setPriority,
    isFormattingActive,
    setIsFormattingActive,
    isRecording,
    recordingTime,
    isInitializingMic,
    reactionModalMessageId,
    reactionModalEmojiTab,
    setReactionModalEmojiTab,
    imageInputRef,
    videoInputRef,
    fileInputRef,
    messages,
    hasMore,
    isLoadingMore,
    isInitialLoading,
    messagesEndRef,
    scrollContainerRef,
    typingUsers,
    readReceipts,
    deliveredReceipts,
    loadMoreRef,
    refreshTrigger,

    setReplyingTo,
    setForwardingMsg,
    setIsShareContactOpen,
    setEditingMessageId,
    setContextMenu,
    setConfirmDialog,
    setImageQueue,
    setCaptionModalIdx,
    setOpenedImageSrc,
    setIsPickerOpen,
    setIsNicknameModalOpen,
    setIsFilePopoverOpen,
    setIsChatImageUploadOpen,
    setReactionModalMessageId,

    handlePaste,
    handleSendMessage,
    startRecording,
    stopRecording,
    handleImageClick,
    handleFileIconClick,
    handleFileClick,
    handleImageChange,
    handleVideoClick,
    handleVideoChange,
    handleFileChange,
    clearPendingAttachment,
    handleSendWithAttachment,
    handleSendImageQueue,
    sendTypingIndicator,
    togglePicker,
    onSelectSticker,
    handleReactMessage,
    handleEditMessage,
    handleRecallMessage,
    handleDeleteLocal,
    startEditMessage,
    openContextMenu,
    handlePinMessage,
    handleUnpinMessage,
    handleAcceptFriendRequest,
    handleSendFriendRequest,
    handleNicknameConfirm,
    handleDownloadFile,
    closeImageQueue,
    handleVideoCall,

    onUpdateConversation,
    onUpdateConversationMeta,
    onSelectConversation,
    onNicknameChange,

    // Link Preview
    pendingLinkPreview,
    linkPreviewDismissed,
    setLinkPreviewDismissed,
    setPendingLinkPreview,

    // @Mention
    mentionQuery,
    mentionDropdownOpen,
    setMentionDropdownOpen,
    conversationMembers,
    pendingMentions,
    handleMentionInput,
    handleSelectMention,

    // Smart Reply
    smartReplies,
    smartRepliesLoading,
    fetchSmartReplies,
    dismissSmartReplies,

    // Message Summary
    summaryText,
    summaryLoading,
    summaryMessageCount,
    isSummaryOpen,
    setIsSummaryOpen,
    fetchSummary,
    onOpenProfile,
    editor,
    setEditor,
  };
}
