import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, MoreHorizontalIcon } from '@/components/ui/Icons';
import Image from 'next/image';
import { FruviaChatbotAvatar } from '@/components/ui/FruviaChatbotAvatar';
import { apiClient } from '@/lib/http/apiClient';
import { toast } from 'sonner';
import { usePresence } from '@/features/user';
import PinInputModal from '@/components/ui/PinInputModal';
import { SidebarItem } from '@/features/chat';
import { SearchOverlayDefault } from '../shared/SearchOverlayDefault';
import { ChatSearchHeader } from '../shared/ChatSearchHeader';

const stripHtml = (html: string) => (html || '').replace(/<[^>]*>?/gm, '');

// Converts lastMsg HTML to renderable HTML: keeps <img> with small size, strips other tags
const getLastMsgPreviewHtml = (html: string): string => {
  if (!html) return '';
  const imgs: string[] = [];
  // Extract and replace <img> tags with placeholders
  let result = html.replace(/<img([^>]*?)(?:\s*\/)?>/gi, (_, attrs) => {
    const src = (attrs.match(/src="([^"]*)"/) || [])[1] || '';
    const alt = (attrs.match(/alt="([^"]*)"/) || [])[1] || '';
    if (!src) return '';
    imgs.push(`<img src="${src}" alt="${alt}" style="width:20px;height:20px;display:inline-block;vertical-align:middle;" />`);
    return `\x00IMG${imgs.length - 1}\x00`;
  });
  // Strip all remaining HTML tags
  result = result.replace(/<[^>]+>/g, '');
  // Restore img placeholders
  result = result.replace(/\x00IMG(\d+)\x00/g, (_, i) => imgs[parseInt(i)]);
  return result.trim();
};

interface Conversation {
  id: string | number;
  name: string;
  nickname?: string;
  lastMsg: string;
  time: string;
  active?: boolean;
  pinned?: boolean;
  isCloud?: boolean;
  isAi?: boolean;
  isGroup?: boolean;
  avatar?: string;
  groupAvatarUrls?: string[];
  memberCount?: number;
  unreadCount?: number;
  otherUserId?: string;
  conversationStatus?: string;
  isRequest?: boolean;
  conversationTag?: string;
  mutedUntil?: string | null;
  isMarkedUnread?: boolean;
  autoDeleteDuration?: string | null;
}

interface AddFriendPrefill {
  phoneNumber?: string;
  user?: {
    user_id: string;
    phone_number?: string;
    display_name?: string;
    avatar_url?: string;
    friendship_status?: string;
  };
}

export interface ConversationListProps {
  conversations: Conversation[];
  onAddFriend: (prefill?: AddFriendPrefill) => void;
  onCreateGroup: () => void;
  onSelectConversation: (id: string | number) => void;
  onJumpToMessage?: (convId: string | number, messageId: string) => void;
  onPinConversation?: (id: string | number, pinned: boolean) => void;
  onDeleteConversation?: (id: string | number) => void;
  onTagConversation?: (id: string | number, tag: string | null) => void;
  onMuteConversation?: (id: string | number, mutedUntil: string | null) => void;
  onMarkUnread?: (id: string | number, isMarkedUnread: boolean) => void;
  onMarkAsRead?: (ids: Array<string | number>) => void;
  onAutoDeleteConversation?: (id: string | number, duration: string | null) => void;
  onUnhideConversation?: (id: string | number) => void;
  currentUser?: any;
  nonSearchContent?: React.ReactNode;
}

interface SearchItem {
  id: number;
  name: string;
  avatar?: string;
  isGroup?: boolean;
  avatars?: string[];
  more?: number;
  isInitial?: boolean;
  initial?: string;
  bgColor?: string;
  isCircle?: boolean;
  color?: string;
  isIcon?: boolean;
}

interface EsSearchResult<T> {
  document?: T;
  highlights?: Record<string, string[]>;
}

interface SearchUserDocument {
  userId: string;
  displayName: string;
  phoneNumber?: string;
  gmail?: string;
  avatarUrl?: string;
  friendshipStatus?: string;
}

interface SearchMessageDocument {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: string;
  createdAt: string;
}

export function ConversationListLegacy({ conversations, onAddFriend, onCreateGroup, onSelectConversation, onJumpToMessage, onPinConversation, onDeleteConversation, onTagConversation, onMuteConversation, onMarkUnread, onMarkAsRead, onAutoDeleteConversation, onUnhideConversation, currentUser, nonSearchContent }: ConversationListProps) {
  const { t } = useTranslation();
  const { isOnline, getTimeAgo } = usePresence();

  // Force re-render every 60s so "X minutes ago" text auto-updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const [isSearching, setIsSearching] = useState(false);
  const [showClassifyMenu, setShowClassifyMenu] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showMarkReadConfirm, setShowMarkReadConfirm] = useState(false);
  const [dontShowMarkReadConfirm, setDontShowMarkReadConfirm] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFriends, setSearchFriends] = useState<{ userId: string; displayName: string; phoneNumber?: string; avatarUrl?: string; friendshipStatus?: string }[]>([]);
  const [searchUsers, setSearchUsers] = useState<{ userId: string; displayName: string; phoneNumber?: string; gmail?: string; avatarUrl?: string; friendshipStatus?: string }[]>([]);
  const [searchMessages, setSearchMessages] = useState<{ messageId: string; conversationId: string; senderId: string; senderName: string; content: string; highlightedContent?: string; messageType: string; createdAt: string }[]>([]);
  const [searchConversations, setSearchConversations] = useState<{ conversationId: string; conversationType?: string; conversationName: string; conversationAvatarUrl?: string; lastMessageContent?: string; lastMessageTime?: string }[]>([]);
  const [searchGlobalUsers, setSearchGlobalUsers] = useState<{ userId: string; displayName: string; phoneNumber?: string; avatarUrl?: string; friendshipStatus?: string }[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Private mode — unlock hidden conversations in search
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [privateModePin, setPrivateModePin] = useState<string | null>(null);
  const [showPrivatePinModal, setShowPrivatePinModal] = useState(false);
  const [privatePinError, setPrivatePinError] = useState<string | null>(null);
  const [privatePinLoading, setPrivatePinLoading] = useState(false);
  const [hiddenSearchResults, setHiddenSearchResults] = useState<any[]>([]);
  const privateModeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PRIVATE_MODE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  // Context-menu hide with PIN
  const [showCtxHidePinModal, setShowCtxHidePinModal] = useState(false);
  const [ctxHideConvId, setCtxHideConvId] = useState<string | number | null>(null);
  const [ctxHidePinError, setCtxHidePinError] = useState<string | null>(null);
  const [ctxHidePinLoading, setCtxHidePinLoading] = useState(false);
  const [ctxHideIsSetup, setCtxHideIsSetup] = useState(false);

  const resetPrivateMode = useCallback(() => {
    setIsPrivateMode(false);
    setPrivateModePin(null);
    setHiddenSearchResults([]);
    if (privateModeTimerRef.current) clearTimeout(privateModeTimerRef.current);
  }, []);

  const activatePrivateMode = useCallback((pin: string) => {
    setIsPrivateMode(true);
    setPrivateModePin(pin);
    setShowPrivatePinModal(false);
    setPrivatePinError(null);
    if (privateModeTimerRef.current) clearTimeout(privateModeTimerRef.current);
    privateModeTimerRef.current = setTimeout(resetPrivateMode, PRIVATE_MODE_TIMEOUT);
  }, [resetPrivateMode]);

  const handlePrivatePinConfirm = async (pin: string) => {
    setPrivatePinLoading(true);
    setPrivatePinError(null);
    try {
      // Verify PIN by calling search with it (empty query — will return [] if wrong, list if correct)
      // We verify cheaply by relying on the search endpoint returning [] for wrong PIN
      await apiClient.get(`/conversations/hidden/search?q=&pinCode=${encodeURIComponent(pin)}`);
      activatePrivateMode(pin);
    } catch (e: any) {
      setPrivatePinError(t('pin.wrong') || 'Mã PIN không chính xác');
    } finally {
      setPrivatePinLoading(false);
    }
  };

  const openCtxHidePinModal = (convId: string | number) => {
    setCtxHideConvId(convId);
    setCtxHidePinError(null);
    setCtxHideIsSetup(false);
    setShowCtxHidePinModal(true);
    // Check PIN status in background
    apiClient.get('/users/me/pin/status')
      .then((res: any) => {
        const hasPin = Boolean(res?.hasPin ?? res?.data?.hasPin);
        setCtxHideIsSetup(!hasPin);
      })
      .catch(() => { /* keep default */ });
  };

  const handleCtxHidePinConfirm = async (pin: string) => {
    if (!ctxHideConvId) return;
    setCtxHidePinLoading(true);
    setCtxHidePinError(null);
    try {
      if (ctxHideIsSetup) {
        await apiClient.post('/users/me/pin', { pin });
        setCtxHideIsSetup(false);
      }
      await apiClient.post(`/conversations/${ctxHideConvId}/hide`, { pinCode: pin });
      onDeleteConversation?.(ctxHideConvId);
      toast.success(t('chat.ctx.hide_success'));
      setShowCtxHidePinModal(false);
      setCtxHideConvId(null);
    } catch (e: any) {
      setCtxHidePinError(e?.message || t('pin.wrong'));
    } finally {
      setCtxHidePinLoading(false);
    }
  };

  // Auto-lock on tab close/hide
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') resetPrivateMode();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (privateModeTimerRef.current) clearTimeout(privateModeTimerRef.current);
    };
  }, [resetPrivateMode]);

  const extractEsDocument = <T,>(item: unknown): T | null => {
    if (!item || typeof item !== 'object') return null;
    const wrapped = item as EsSearchResult<T>;
    return wrapped.document ?? (item as T);
  };

  const closeSearchOverlay = useCallback(() => {
    setIsSearching(false);
    setSearchQuery('');
    setSearchFriends([]);
    setSearchUsers([]);
    setSearchMessages([]);
    setSearchConversations([]);
    setSearchGlobalUsers([]);
    setIsSearchLoading(false);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!value.trim()) {
      setSearchFriends([]);
      setSearchUsers([]);
      setSearchMessages([]);
      setSearchConversations([]);
      setSearchGlobalUsers([]);
      setIsSearchLoading(false);
      return;
    }

    setIsSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const safeGet = (url: string) => apiClient.get(url).catch(() => null);
        const trimmedQuery = value.trim();

        // Single global search call
        const globalData: any = await safeGet(`/search/global?q=${encodeURIComponent(trimmedQuery)}&size=10`);

        if (globalData) {
          // Friends
          const friends = Array.isArray(globalData.friends) ? globalData.friends : [];
          setSearchFriends(friends.map((f: any) => ({
            userId: f.userId,
            displayName: f.displayName || 'Unknown',
            phoneNumber: f.phoneNumber,
            avatarUrl: f.avatarUrl,
            friendshipStatus: f.friendshipStatus || 'ACCEPTED',
          })));

          // Conversations
          const convs = Array.isArray(globalData.conversations) ? globalData.conversations : [];
          setSearchConversations(convs.map((c: any) => ({
            conversationId: c.conversationId,
            conversationType: c.conversationType,
            conversationName: c.conversationName || 'Unknown',
            conversationAvatarUrl: c.conversationAvatarUrl,
            lastMessageContent: c.lastMessageContent,
            lastMessageTime: c.lastMessageTime,
          })));

          // Messages (with highlight preservation)
          const messagesPage = globalData.messages;
          const messagesContent = messagesPage?.content || (Array.isArray(messagesPage) ? messagesPage : []);
          const normalizedMessages = Array.isArray(messagesContent)
            ? messagesContent
              .map((item: any) => {
                const doc = item?.document || item;
                if (!doc?.messageId) return null;
                const highlightedContent = item?.highlights?.content?.[0];
                return {
                  messageId: doc.messageId,
                  conversationId: doc.conversationId,
                  senderId: doc.senderId,
                  senderName: doc.senderName,
                  content: typeof highlightedContent === 'string'
                    ? highlightedContent.replace(/<[^>]+>/g, '')
                    : doc.content,
                  highlightedContent: highlightedContent || undefined,
                  messageType: doc.messageType,
                  createdAt: doc.createdAt,
                };
              })
              .filter((x): x is NonNullable<typeof x> => x !== null)
            : [];
          normalizedMessages.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setSearchMessages(normalizedMessages);

          // Global users (strangers)
          const globalUsers = Array.isArray(globalData.globalUsers) ? globalData.globalUsers : [];
          setSearchGlobalUsers(globalUsers.map((u: any) => ({
            userId: u.userId,
            displayName: u.displayName || 'Unknown',
            phoneNumber: u.phoneNumber,
            avatarUrl: u.avatarUrl,
            friendshipStatus: u.friendshipStatus || 'NONE',
          })));

          // Fallback: if no friends and no globalUsers found, try phone lookup
          if (friends.length === 0 && globalUsers.length === 0 && /^\d{9,15}$/.test(trimmedQuery)) {
            let byPhone: any = await safeGet(`/users/phone/${encodeURIComponent(trimmedQuery)}`);
            if (!byPhone && trimmedQuery.startsWith('0')) {
              byPhone = await safeGet(`/users/phone/${encodeURIComponent(`+84${trimmedQuery.substring(1)}`)}`);
            } else if (!byPhone && trimmedQuery.startsWith('+84')) {
              byPhone = await safeGet(`/users/phone/${encodeURIComponent(`0${trimmedQuery.substring(3)}`)}`);
            }
            if (byPhone && (byPhone.user_id || byPhone.userId)) {
              const phoneUser = {
                userId: byPhone.user_id || byPhone.userId,
                displayName: byPhone.display_name || byPhone.displayName || 'Unknown',
                phoneNumber: byPhone.phone_number || byPhone.phoneNumber,
                avatarUrl: byPhone.avatar_url || byPhone.avatarUrl,
                friendshipStatus: byPhone.friendship_status || byPhone.friendshipStatus || 'NONE',
              };
              if (phoneUser.friendshipStatus === 'ACCEPTED') {
                setSearchFriends([phoneUser]);
              } else {
                setSearchGlobalUsers([phoneUser]);
              }
            }
          }
        } else {
          setSearchFriends([]);
          setSearchConversations([]);
          setSearchMessages([]);
          setSearchGlobalUsers([]);
        }

        // Also keep legacy searchUsers populated for backward compat
        setSearchUsers([
          ...(Array.isArray(globalData?.friends) ? globalData.friends : []),
          ...(Array.isArray(globalData?.globalUsers) ? globalData.globalUsers : []),
        ]);

        // If private mode is active, also search hidden conversations
        if (isPrivateMode && privateModePin) {
          try {
            const hiddenData: any = await apiClient.get(
              `/conversations/hidden/search?q=${encodeURIComponent(value.trim())}&pinCode=${encodeURIComponent(privateModePin)}`
            );
            const list = Array.isArray(hiddenData) ? hiddenData : (hiddenData?.data || []);
            setHiddenSearchResults(list);
          } catch {
            setHiddenSearchResults([]);
          }
        } else {
          setHiddenSearchResults([]);
        }
      } catch (e) {
        console.error('Search failed:', e);
      } finally {
        setIsSearchLoading(false);
      }
    }, 400);
  }, [conversations, isPrivateMode, privateModePin]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const filteredConversations = (() => {
    let result = filterTab === 'unread'
      ? conversations.filter(c => (c.unreadCount && c.unreadCount > 0) || c.isRequest || c.isMarkedUnread)
      : conversations;
    if (selectedTags.length > 0) {
      result = result.filter(c => c.conversationTag && selectedTags.includes(c.conversationTag));
    }
    return result;
  })();
  const [contextMenu, setContextMenu] = useState<{ id: string | number; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [reportModal, setReportModal] = useState<{ conversationId: string; conversationName: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const [showHiddenModal, setShowHiddenModal] = useState(false);
  const [hiddenConversations, setHiddenConversations] = useState<any[]>([]);
  const [hiddenLoading, setHiddenLoading] = useState(false);
  const [showAllHidden, setShowAllHidden] = useState(false);
  const HIDDEN_PAGE_SIZE = 5;

  // PIN gate to open hidden list
  const [showOpenHiddenPinModal, setShowOpenHiddenPinModal] = useState(false);
  const [openHiddenPinError, setOpenHiddenPinError] = useState<string | null>(null);
  const [openHiddenPinLoading, setOpenHiddenPinLoading] = useState(false);
  const [hiddenListPin, setHiddenListPin] = useState<string | null>(null);

  const handleOpenHiddenPinConfirm = async (pin: string) => {
    setOpenHiddenPinLoading(true);
    setOpenHiddenPinError(null);
    try {
      // Verify PIN via search endpoint
      await apiClient.get(`/conversations/hidden/search?q=&pinCode=${encodeURIComponent(pin)}`);
      setHiddenListPin(pin);
      setShowOpenHiddenPinModal(false);
      setShowHiddenModal(true);
      fetchHiddenConversations();
    } catch {
      setOpenHiddenPinError(t('pin.wrong'));
    } finally {
      setOpenHiddenPinLoading(false);
    }
  };

  const fetchHiddenConversations = async () => {
    setHiddenLoading(true);
    try {
      const res = await apiClient.get<any>('/conversations/hidden');
      const list = res?.data || res || [];
      setHiddenConversations(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to fetch hidden conversations:', e);
      setHiddenConversations([]);
    } finally {
      setHiddenLoading(false);
    }
  };

  const handleUnhideFromHiddenModal = useCallback(async (target: string | number | 'all') => {
    if (!hiddenListPin) {
      setShowHiddenModal(false);
      setOpenHiddenPinError(t('pin.wrong'));
      setShowOpenHiddenPinModal(true);
      return;
    }

    try {
      if (target === 'all') {
        await Promise.all(
          hiddenConversations.map(conv =>
            apiClient.post(`/conversations/${conv.conversationId || conv.conversation_id}/unhide`, { pinCode: hiddenListPin })
          )
        );
        const ids = hiddenConversations.map(c => c.conversationId || c.conversation_id);
        ids.forEach(id => onUnhideConversation?.(id));
        setHiddenConversations([]);
        toast.success(t('chat.unhide_all_success'));
        return;
      }

      await apiClient.post(`/conversations/${target}/unhide`, { pinCode: hiddenListPin });
      setHiddenConversations(prev => prev.filter(c => (c.conversationId || c.conversation_id) !== target));
      onUnhideConversation?.(target);
      toast.success(t('chat.unhide_success'));
    } catch (e: any) {
      setShowHiddenModal(false);
      setHiddenListPin(null);
      setOpenHiddenPinError(e?.message || t('pin.wrong'));
      setShowOpenHiddenPinModal(true);
    }
  }, [hiddenConversations, hiddenListPin, onUnhideConversation, t]);

  const classifyMenuRef = useRef<HTMLDivElement>(null);

  const getMarkAsReadTargetIds = useCallback((): Array<string | number> => {
    return filteredConversations
      .filter(c => (c.unreadCount && c.unreadCount > 0) || c.isMarkedUnread)
      .map(c => c.id);
  }, [filteredConversations]);

  const runMarkAreaAsRead = useCallback(async () => {
    const targetIds = getMarkAsReadTargetIds();
    if (targetIds.length === 0) {
      toast.info(t('chat.ctx.mark_read_none'));
      return;
    }

    const results = await Promise.allSettled(
      targetIds.map((id) => apiClient.patch(`/conversations/${id}/mark-as-read`, {}))
    );

    const successIds = targetIds.filter((_, idx) => results[idx].status === 'fulfilled');
    if (successIds.length > 0) {
      onMarkAsRead?.(successIds);
      toast.success(t('chat.ctx.mark_read_success', { count: successIds.length }));
    } else {
      toast.error(t('chat.ctx.mark_read_error'));
    }
  }, [getMarkAsReadTargetIds, onMarkAsRead, t]);

  const handleMarkAsReadFromHeader = useCallback(async () => {
    setShowHeaderMenu(false);
    if (getMarkAsReadTargetIds().length === 0) {
      toast.info(t('chat.ctx.mark_read_none'));
      return;
    }
    const shouldSkipConfirm = typeof window !== 'undefined' && window.localStorage.getItem('cnm.chat.skip-mark-read-confirm') === '1';
    if (shouldSkipConfirm) {
      await runMarkAreaAsRead();
      return;
    }
    setShowMarkReadConfirm(true);
  }, [getMarkAsReadTargetIds, runMarkAreaAsRead, t]);

  const confirmMarkAsRead = useCallback(async () => {
    if (dontShowMarkReadConfirm && typeof window !== 'undefined') {
      window.localStorage.setItem('cnm.chat.skip-mark-read-confirm', '1');
    }
    setShowMarkReadConfirm(false);
    await runMarkAreaAsRead();
  }, [dontShowMarkReadConfirm, runMarkAreaAsRead]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('cnm.chat.skip-mark-read-confirm') === '1';
    setDontShowMarkReadConfirm(saved);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (classifyMenuRef.current && !classifyMenuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.classify-button')) {
          setShowClassifyMenu(false);
        }
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
        setShowSubMenu(null);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
      }
    }

    if (showClassifyMenu || contextMenu || showHeaderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClassifyMenu, contextMenu, showHeaderMenu]);

  const classifyItems = [
    { key: 'customer', color: '#EF4444' }, // Red
    { key: 'family', color: '#4ADE80' },   // Green
    { key: 'work', color: '#F97316' },     // Orange
    { key: 'friends', color: '#8B5CF6' },  // Purple
    { key: 'reply_later', color: '#FACC15' }, // Yellow
    { key: 'colleagues', color: '#0068FF' }, // Blue
  ];

  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chat_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load recent searches', e);
    }
  }, []);

  const saveRecentSearch = (item: { id: string | number; name: string; avatar?: string }) => {
    try {
      setRecentSearches(prev => {
        const filtered = prev.filter(p => p.id !== item.id);
        const next = [item, ...filtered].slice(0, 10);
        localStorage.setItem('chat_recent_searches', JSON.stringify(next));
        return next;
      });
    } catch (e) {
      console.error('Failed to save recent search', e);
    }
  };

  const toggleTag = (key: string) => {
    setSelectedTags(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const clearTags = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTags([]);
    setShowClassifyMenu(false);
  };

  const handleContextMenu = (e: React.MouseEvent, convId: string | number) => {
    e.preventDefault();
    e.stopPropagation();
    // Clamp menu position within viewport
    const menuWidth = 220;
    const menuHeight = 380;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight);
    setContextMenu({ id: convId, x, y });
  };

  const openContextMenuFromButton = (e: React.MouseEvent, convId: string | number) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 380;
    const x = Math.min(rect.right, window.innerWidth - menuWidth);
    const y = Math.min(rect.bottom + 4, window.innerHeight - menuHeight);
    setContextMenu({ id: convId, x, y });
  };

  const [showSubMenu, setShowSubMenu] = useState<string | null>(null);

  const contextConv = contextMenu ? conversations.find(c => c.id === contextMenu.id) : null;

  const subMenuItems = [
    { key: 'customer', label: t('chat.classify_menu.customer'), color: '#EF4444' },
    { key: 'family', label: t('chat.classify_menu.family'), color: '#4ADE80' },
    { key: 'work', label: t('chat.classify_menu.work'), color: '#F97316' },
    { key: 'friends', label: t('chat.classify_menu.friends'), color: '#8B5CF6' },
    { key: 'reply_later', label: t('chat.classify_menu.reply_later'), color: '#FACC15' },
    { key: 'colleagues', label: t('chat.classify_menu.colleagues'), color: '#0068FF' },
  ];

  const renderContextMenu = () => {
    if (!contextMenu || !contextConv) return null;
    const isPinned = contextConv.pinned;

    return (
      <div
        ref={contextMenuRef}
        className="fixed z-[9999] w-[220px] bg-white dark:bg-[var(--card-bg)] rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-200 dark:border-[var(--border)] py-1 animate-in fade-in zoom-in-95 duration-100"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        {/* Ghim / Bỏ ghim */}
        <button
          onClick={async () => {
            const convId = contextMenu.id;
            setContextMenu(null);
            try {
              const res = await apiClient.post<any>(`/conversations/${convId}/pin`, {});
              const newPinned = res?.data?.isPinned ?? res?.isPinned ?? !isPinned;
              onPinConversation?.(convId, newPinned);
              toast.success(newPinned ? t('chat.ctx.pin_success') : t('chat.ctx.unpin_success'));
            } catch (e: any) {
              toast.error(e.message || t('chat.ctx.pin_error'));
            }
          }}
          className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center gap-3 text-[var(--text)] transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
          <span>{isPinned ? t('chat.ctx.unpin') : t('chat.ctx.pin')}</span>
        </button>

        {/* Phân loại — with submenu */}
        <div
          className="relative"
          onMouseEnter={() => setShowSubMenu('classify')}
          onMouseLeave={() => setShowSubMenu(null)}
        >
          <button
            className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center justify-between text-[var(--text)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></svg>
              <span>{t('chat.ctx.classify')}</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40"><path d="m9 18 6-6-6-6" /></svg>
          </button>

          {/* Sub-menu */}
          {showSubMenu === 'classify' && (
            <div className="absolute left-full top-0 z-50 pl-1 pointer-events-auto">
              <div className="w-[210px] bg-white dark:bg-[var(--card-bg)] rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-200 dark:border-[var(--border)] py-1 animate-in fade-in duration-100">
                {subMenuItems.map((item) => {
                  const isActive = contextConv?.conversationTag === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={async () => {
                        const convId = contextMenu!.id;
                        const newTag = isActive ? null : item.key;
                        setContextMenu(null);
                        try {
                          await apiClient.patch(`/conversations/${convId}/tag`, { tag: newTag });
                          onTagConversation?.(convId, newTag);
                          toast.success(newTag ? t('chat.ctx.classify_success', { label: item.label }) : t('chat.ctx.classify_removed'));
                        } catch (e: any) {
                          toast.error(e.message || t('chat.ctx.classify_error'));
                        }
                      }}
                      className={`w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center gap-3 text-[var(--text)] transition-colors cursor-pointer ${isActive ? 'bg-[#e5efff] dark:bg-white/10' : ''}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={item.color} stroke={item.color} strokeWidth="1.5" className="shrink-0">
                        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
                      </svg>
                      <span>{item.label}</span>
                      {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto opacity-70"><polyline points="20 6 9 17 4 12" /></svg>}
                    </button>
                  );
                })}
                <div className="h-[1px] bg-gray-100 dark:bg-white/5 mx-2 my-0.5" />
                <button
                  onClick={() => { setContextMenu(null); }}
                  className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center gap-3 text-[var(--text)] transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                  <span>{t('chat.classify_menu.manage')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Đánh dấu chưa đọc */}
        <button
          onClick={async () => {
            const convId = contextMenu.id;
            setContextMenu(null);
            try {
              const res = await apiClient.post<any>(`/conversations/${convId}/mark-unread`, {});
              const newMarked = res?.data?.isMarkedUnread ?? res?.isMarkedUnread ?? true;
              onMarkUnread?.(convId, newMarked);
              toast.success(newMarked ? t('chat.ctx.marked_unread') : t('chat.ctx.unmarked_unread'));
            } catch (e: any) {
              toast.error(e.message || 'Error');
            }
          }}
          className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center gap-3 text-[var(--text)] transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><circle cx="19" cy="19" r="3" /></svg>
          <span>{t('chat.ctx.mark_unread')}</span>
        </button>

        <div className="h-[1px] bg-gray-100 dark:bg-white/5 mx-2" />

        {/* Tắt thông báo */}
        <div
          className="relative"
          onMouseEnter={() => setShowSubMenu('mute')}
          onMouseLeave={() => setShowSubMenu(null)}
        >
          <button
            className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center justify-between text-[var(--text)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              <span>{t('chat.ctx.mute')}</span>
              {contextConv.mutedUntil && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>}
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40"><path d="m9 18 6-6-6-6" /></svg>
          </button>

          {/* Mute sub-menu */}
          {showSubMenu === 'mute' && (
            <div className="absolute left-full top-0 z-50 pl-1 pointer-events-auto">
              <div className="w-[180px] bg-white dark:bg-[var(--card-bg)] rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-200 dark:border-[var(--border)] py-1 animate-in fade-in duration-100">
                {contextConv.mutedUntil && (
                  <>
                    <button
                      onClick={async () => {
                        const convId = contextMenu!.id;
                        setContextMenu(null);
                        try {
                          await apiClient.post(`/conversations/${convId}/mute`, { duration: 'off' });
                          onMuteConversation?.(convId, null);
                          toast.success(t('chat.mute.off_success'));
                        } catch (e: any) { toast.error(e.message || 'Error'); }
                      }}
                      className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 text-[var(--text)] transition-colors cursor-pointer font-medium"
                    >
                      {t('chat.mute.off')}
                    </button>
                    <div className="h-[1px] bg-gray-100 dark:bg-white/5 mx-2 my-0.5" />
                  </>
                )}
                {[
                  { label: t('chat.mute.1h'), value: '1h' },
                  { label: t('chat.mute.4h'), value: '4h' },
                  { label: t('chat.mute.8am'), value: 'until_8am' },
                  { label: t('chat.mute.forever'), value: 'forever' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={async () => {
                      const convId = contextMenu!.id;
                      setContextMenu(null);
                      try {
                        const res = await apiClient.post<any>(`/conversations/${convId}/mute`, { duration: item.value });
                        const newMutedUntil = res?.data?.mutedUntil ?? res?.mutedUntil ?? null;
                        onMuteConversation?.(convId, newMutedUntil);
                        toast.success(t('chat.mute.success'));
                      } catch (e: any) { toast.error(e.message || 'Error'); }
                    }}
                    className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 text-[var(--text)] transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ẩn trò chuyện */}
        <button
          onClick={() => {
            const convId = contextMenu.id;
            setContextMenu(null);
            openCtxHidePinModal(convId);
          }}
          className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center gap-3 text-[var(--text)] transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          <span>{t('chat.ctx.hide')}</span>
        </button>

        {/* Tin nhắn tự xóa */}
        <div
          className="relative"
          onMouseEnter={() => setShowSubMenu('autodelete')}
          onMouseLeave={() => setShowSubMenu(null)}
        >
          <button
            className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center justify-between text-[var(--text)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <span>{t('chat.ctx.auto_delete')}</span>
              {contextConv.autoDeleteDuration && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>}
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40"><path d="m9 18 6-6-6-6" /></svg>
          </button>

          {/* Auto-delete sub-menu */}
          {showSubMenu === 'autodelete' && (
            <div className="absolute left-full top-0 z-50 pl-1 pointer-events-auto">
              <div className="w-[180px] bg-white dark:bg-[var(--card-bg)] rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-200 dark:border-[var(--border)] py-1 animate-in fade-in duration-100">
                {[
                  { label: t('chat.auto_delete.off'), value: 'off' },
                  { label: t('chat.auto_delete.1d'), value: '1d' },
                  { label: t('chat.auto_delete.7d'), value: '7d' },
                  { label: t('chat.auto_delete.30d'), value: '30d' },
                ].map((item) => {
                  const isActive = (item.value === 'off' && !contextConv.autoDeleteDuration) || contextConv.autoDeleteDuration === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={async () => {
                        const convId = contextMenu!.id;
                        setContextMenu(null);
                        try {
                          const res = await apiClient.patch<any>(`/conversations/${convId}/auto-delete`, { duration: item.value });
                          const newDuration = res?.data?.autoDeleteDuration ?? res?.autoDeleteDuration ?? null;
                          onAutoDeleteConversation?.(convId, newDuration);
                          toast.success(t('chat.auto_delete.success'));
                        } catch (e: any) { toast.error(e.message || 'Error'); }
                      }}
                      className={`w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 text-[var(--text)] transition-colors cursor-pointer flex items-center justify-between ${isActive ? 'bg-[#e5efff] dark:bg-white/10' : ''}`}
                    >
                      <span>{item.label}</span>
                      {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-70"><polyline points="20 6 9 17 4 12" /></svg>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="h-[1px] bg-gray-100 dark:bg-white/5 mx-2" />

        {/* Xóa hội thoại */}
        <button
          onClick={() => {
            const convId = contextMenu.id;
            const convName = contextConv.name;
            setContextMenu(null);
            toast(t('chat.ctx.delete_confirm', { name: convName }), {
              description: t('chat.ctx.delete_desc'),
              duration: 10000,
              action: {
                label: t('chat.ctx.confirm_delete'),
                onClick: async () => {
                  try {
                    await apiClient.delete(`/conversations/${convId}`);
                    onDeleteConversation?.(convId);
                    toast.success(t('chat.ctx.delete_success'));
                  } catch (e: any) {
                    toast.error(e.message || t('chat.ctx.delete_error'));
                  }
                },
              },
              cancel: { label: t('common.cancel'), onClick: () => { } },
            });
          }}
          className="w-full px-4 py-2 text-left text-[13px] hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 text-red-500 transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
          <span>{t('chat.ctx.delete')}</span>
        </button>

        {/* Báo xấu */}
        <button
          onClick={() => {
            const convId = String(contextMenu.id);
            const convName = contextConv?.name || '';
            setContextMenu(null);
            setReportReason('');
            setReportDescription('');
            setReportModal({ conversationId: convId, conversationName: convName });
          }}
          className="w-full px-4 py-2 text-left text-[13px] hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 text-red-500 transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          <span>{t('chat.ctx.report')}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="w-[340px] border-r border-[var(--border)] flex flex-col bg-[var(--card-bg)] transition-colors duration-200 relative h-full">

      {/* Header Container (Search + Tabs) */}
      <div className="flex flex-col relative z-20 bg-[var(--card-bg)]">
        {/* Search Header */}
        <ChatSearchHeader
          placeholder={isPrivateMode ? (t('pin.search_placeholder') || '🔓 Tìm kiếm (bao gồm ẩn)') : t('chat.search')}
          value={searchQuery}
          isSearching={isSearching}
          closeLabel={t('chat.search_overlay.close')}
          onChange={(value) => handleSearchChange(value)}
          onFocus={() => setIsSearching(true)}
          onClose={() => { setIsSearching(false); setSearchQuery(''); setSearchUsers([]); setSearchMessages([]); setSearchConversations([]); }}
          onAddFriend={onAddFriend}
          onCreateGroup={onCreateGroup}
        />

        {!isSearching && !nonSearchContent && (
          /* Tabs and Filters */
          <div className="flex items-center justify-between px-4 pb-0.5 border-b border-[var(--border)] relative">
            <div className="flex gap-4 text-[13px] font-medium transition-colors duration-200">
              <button
                onClick={() => setFilterTab('all')}
                className={`py-2.5 cursor-pointer transition-colors relative whitespace-nowrap ${filterTab === 'all' ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}`}
              >
                {t('chat.tabs.all')}
              </button>
              <button
                onClick={() => setFilterTab('unread')}
                className={`py-2.5 cursor-pointer transition-colors relative whitespace-nowrap ${filterTab === 'unread' ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}`}
              >
                {t('chat.tabs.unread')}
              </button>
            </div>
            <div className="flex items-center gap-4 text-[13px] text-[var(--sub-text)]">
              <div className="relative">
                <button
                  onClick={() => setShowClassifyMenu(!showClassifyMenu)}
                  className={`classify-button flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors cursor-pointer ${selectedTags.length > 0 ? 'bg-blue-50 text-[var(--primary)] border border-blue-100' : showClassifyMenu ? 'text-[var(--primary)] font-bold' : 'hover:text-[var(--text)]'}`}
                >
                  {selectedTags.length > 0 ? (
                    <>
                      <span className="font-bold text-[var(--primary)] text-[13px]">
                        {selectedTags.length === 1
                          ? (selectedTags[0] === 'strangers' ? t('chat.classify_menu.strangers') : t(`chat.classify_menu.${selectedTags[0]}`))
                          : `${selectedTags.length} ${t('chat.tags')}`
                        }
                      </span>
                      <div
                        onClick={clearTags}
                        className="w-[18px] h-[18px] rounded-full border border-[var(--primary)] flex items-center justify-center ml-1 hover:bg-blue-100 transition-colors"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0056D2" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </div>
                    </>
                  ) : (
                    <>
                      {showClassifyMenu ? t('chat.tags') : t('chat.classify')} <ChevronDownIcon size={14} />
                    </>
                  )}
                </button>

                {/* Classify Dropdown Menu */}
                {showClassifyMenu && (
                  <div
                    ref={classifyMenuRef}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full right-[-50px] mt-2 w-[260px] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-4 py-2 text-[13px] font-medium text-[var(--sub-text)]">
                      {t('chat.classify_menu.title')}
                    </div>

                    <div className="py-1 px-1">
                      {classifyItems.map((item) => (
                        <div
                          key={item.key}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTag(item.key);
                          }}
                          className={`px-3 py-2 flex items-center gap-3 cursor-pointer group transition-colors rounded-lg mb-0.5
                            ${selectedTags.includes(item.key)
                              ? 'bg-[#E7F2FF] dark:bg-[#0068FF]/10'
                              : 'hover:bg-[var(--hover-bg)]'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(item.key)}
                            readOnly
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded-sm border-gray-300 text-[#0068FF] focus:ring-[#0068FF] cursor-pointer"
                          />
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill={item.color} stroke={item.color} strokeWidth="2">
                              <path d="M21 12l-5 8H8l-5-8 5-8h8l5 8z" />
                            </svg>
                          </div>
                          <span className={`text-[14px] flex-1 ${selectedTags.includes(item.key) ? 'text-[var(--text)] font-medium' : 'text-[var(--text)]'}`}>{t(`chat.classify_menu.${item.key}`)}</span>
                        </div>
                      ))}

                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTag('strangers');
                        }}
                        className={`px-3 py-2 flex items-center gap-3 cursor-pointer transition-colors rounded-lg
                          ${selectedTags.includes('strangers')
                            ? 'bg-[#E7F2FF] dark:bg-[#0068FF]/10'
                            : 'hover:bg-[var(--hover-bg)]'
                          } border-b border-[var(--border)] mb-1 pb-3`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes('strangers')}
                          readOnly
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded-sm border-gray-300 text-[#0068FF] focus:ring-[#0068FF] cursor-pointer"
                        />
                        <div className="w-5 h-5 flex items-center justify-center text-[var(--text)] shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                          </svg>
                        </div>
                        <span className={`text-[14px] flex-1 ${selectedTags.includes('strangers') ? 'text-[var(--text)] font-medium' : 'text-[var(--text)]'}`}>{t('chat.classify_menu.strangers')}</span>
                      </div>
                    </div>

                    <button className="w-full text-center py-2.5 text-[15px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer">
                      {t('chat.classify_menu.manage')}
                    </button>
                  </div>
                )}
              </div>

              <div ref={headerMenuRef} className="relative">
                <button
                  title={t('chat.more')}
                  onClick={() => setShowHeaderMenu(prev => !prev)}
                  className="p-1 cursor-pointer hover:bg-[var(--hover-bg)] rounded-md text-[var(--sub-text)] hover:text-[var(--text)] transition-colors"
                >
                  <MoreHorizontalIcon size={18} />
                </button>
                {showHeaderMenu && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-[164px] rounded-lg border border-[var(--border)] bg-[var(--card-bg)] py-1 shadow-[0_10px_20px_rgba(0,0,0,0.14)]">
                    <button
                      onClick={handleMarkAsReadFromHeader}
                      className="w-full px-3 py-2 text-left text-[14px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                    >
                      {t('chat.ctx.mark_read')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {isSearching ? (
        /* Search Overlay Content */
        <div className="flex-1 bg-[var(--card-bg)] overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
          {searchQuery.trim() ? (
            /* Search Results */
            <div className="px-4 py-3">
              {isSearchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (searchFriends.length === 0 && searchConversations.length === 0 && searchMessages.length === 0 && searchGlobalUsers.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--sub-text)] opacity-60">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-3">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <p className="text-[14px]">{t('chat.search_overlay.no_results') || 'Không tìm thấy kết quả'}</p>
                </div>
              ) : (
                <>
                  {/* 1. Friends Results */}
                  {searchFriends.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-[13px] font-bold text-[var(--sub-text)] mb-2 uppercase tracking-wide">{t('chat.search_overlay.friends') || 'Bạn bè'}</h3>
                      <div className="space-y-0.5">
                        {searchFriends.map(user => (
                          <div
                            key={user.userId}
                            onClick={() => {
                              const conv = conversations.find(c => c.otherUserId === user.userId);
                              if (conv) {
                                onSelectConversation(conv.id);
                                closeSearchOverlay();
                              } else {
                                onAddFriend({
                                  phoneNumber: user.phoneNumber,
                                  user: {
                                    user_id: user.userId,
                                    phone_number: user.phoneNumber,
                                    display_name: user.displayName,
                                    avatar_url: user.avatarUrl,
                                    friendship_status: 'ACCEPTED',
                                  },
                                });
                                closeSearchOverlay();
                              }
                            }}
                            className="flex items-center gap-3 p-2 hover:bg-[var(--hover-bg)] rounded-lg cursor-pointer transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-black/5">
                              {user.avatarUrl ? (
                                <Image src={user.avatarUrl} alt={user.displayName} width={40} height={40} className="object-cover w-full h-full" />
                              ) : (
                                <span className="text-[14px] font-bold text-white bg-[#0068FF] w-full h-full flex items-center justify-center">
                                  {user.displayName?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-medium text-[var(--text)] truncate">{user.displayName}</p>
                              {user.phoneNumber && <p className="text-[12px] text-[var(--sub-text)] truncate">{user.phoneNumber}</p>}
                            </div>
                            <span className="text-[11px] px-2 py-1 rounded-full font-semibold text-green-600 bg-green-50">
                              {t('chat.search_overlay.friend_badge') || 'Bạn bè'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Conversation Results */}
                  {searchConversations.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-[13px] font-bold text-[var(--sub-text)] mb-2 uppercase tracking-wide">{t('chat.search_overlay.conversations') || 'Hội thoại'}</h3>
                      <div className="space-y-0.5">
                        {searchConversations.map(conv => {
                          const localConv = conversations.find(c => String(c.id) === conv.conversationId);
                          return (
                            <div
                              key={conv.conversationId}
                              onClick={() => {
                                if (localConv) {
                                  onSelectConversation(localConv.id);
                                } else {
                                  onSelectConversation(conv.conversationId);
                                }
                                closeSearchOverlay();
                              }}
                              className="flex items-center gap-3 p-2 hover:bg-[var(--hover-bg)] rounded-lg cursor-pointer transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-black/5">
                                {(conv.conversationAvatarUrl || localConv?.avatar) ? (
                                  <Image src={conv.conversationAvatarUrl || localConv?.avatar || ''} alt={conv.conversationName} width={40} height={40} className="object-cover w-full h-full" />
                                ) : (
                                  <span className="text-[14px] font-bold text-white bg-[#0068FF] w-full h-full flex items-center justify-center">
                                    {conv.conversationName?.charAt(0)?.toUpperCase() || '?'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-medium text-[var(--text)] truncate">{conv.conversationName}</p>
                                {conv.lastMessageContent && <p className="text-[12px] text-[var(--sub-text)] truncate">{stripHtml(conv.lastMessageContent)}</p>}
                              </div>
                              {conv.conversationType === 'GROUP' && (
                                <span className="text-[11px] px-2 py-1 rounded-full font-semibold text-blue-600 bg-blue-50">
                                  {t('chat.search_overlay.group_badge') || 'Nhóm'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Message Results (with keyword highlighting) */}
                  {searchMessages.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-[13px] font-bold text-[var(--sub-text)] mb-2 uppercase tracking-wide">{t('chat.search_overlay.messages') || 'Tin nhắn'}</h3>
                      <div className="space-y-0.5">
                        {searchMessages.map(msg => {
                          const conv = conversations.find(c => String(c.id) === msg.conversationId);
                          const isAiSender = msg.senderId === 'FRUVIA_AI_ASSISTANT';
                          const displayConvName = conv?.name || (isAiSender ? 'Fruvia Chatbot' : (msg.senderName && msg.senderName !== 'Unknown' ? msg.senderName : null)) || msg.senderName;
                          const displaySenderName = isAiSender ? 'Fruvia Chatbot' : (msg.senderName && msg.senderName !== 'Unknown' ? msg.senderName : (conv?.name || 'Unknown'));

                          // Highlight keywords in message content
                          const highlightContent = (text: string, query: string) => {
                            if (!query.trim()) return text;
                            try {
                              const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                              const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
                              return parts.map((part, i) =>
                                part.toLowerCase() === query.toLowerCase()
                                  ? `<mark class="bg-yellow-200 dark:bg-yellow-600/40 text-[var(--text)] rounded-sm px-0.5">${part}</mark>`
                                  : part
                              ).join('');
                            } catch {
                              return text;
                            }
                          };

                          const highlighted = highlightContent(msg.content, searchQuery.trim());
                          const targetConvId = conv?.id || msg.conversationId;

                          return (
                            <div
                              key={msg.messageId}
                              onClick={() => {
                                if (onJumpToMessage && targetConvId && msg.messageId) {
                                  onJumpToMessage(targetConvId, msg.messageId);
                                } else {
                                  onSelectConversation(targetConvId);
                                }
                                closeSearchOverlay();
                              }}
                              className="flex items-center gap-3 p-2 hover:bg-[var(--hover-bg)] rounded-lg cursor-pointer transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-black/5">
                                {conv?.avatar ? (
                                  <Image src={conv.avatar} alt={conv.name} width={40} height={40} className="object-cover w-full h-full" />
                                ) : isAiSender ? (
                                  <FruviaChatbotAvatar className="w-full h-full" imageClassName="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[14px] font-bold text-white bg-[#0068FF] w-full h-full flex items-center justify-center">
                                    {displayConvName?.charAt(0)?.toUpperCase() || '?'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-medium text-[var(--text)] truncate">{displayConvName}</p>
                                <p className="text-[12px] text-[var(--sub-text)] truncate">
                                  <span className="font-medium">{displaySenderName}: </span>
                                  <span dangerouslySetInnerHTML={{ __html: highlighted }} />
                                </p>
                              </div>
                              <span className="text-[11px] text-[var(--sub-text)] shrink-0">
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. Global Users (Strangers) */}
                  {searchGlobalUsers.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-[13px] font-bold text-[var(--sub-text)] mb-2 uppercase tracking-wide">{t('chat.search_overlay.global_users') || 'Người lạ'}</h3>
                      <div className="space-y-0.5">
                        {searchGlobalUsers.map(user => (
                          <div
                            key={user.userId}
                            onClick={() => {
                              onAddFriend({
                                phoneNumber: user.phoneNumber,
                                user: {
                                  user_id: user.userId,
                                  phone_number: user.phoneNumber,
                                  display_name: user.displayName,
                                  avatar_url: user.avatarUrl,
                                  friendship_status: user.friendshipStatus,
                                },
                              });
                              closeSearchOverlay();
                            }}
                            className="flex items-center gap-3 p-2 hover:bg-[var(--hover-bg)] rounded-lg cursor-pointer transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-black/5">
                              {user.avatarUrl ? (
                                <Image src={user.avatarUrl} alt={user.displayName} width={40} height={40} className="object-cover w-full h-full" />
                              ) : (
                                <span className="text-[14px] font-bold text-white bg-gray-400 w-full h-full flex items-center justify-center">
                                  {user.displayName?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-medium text-[var(--text)] truncate">{user.displayName}</p>
                              {user.phoneNumber && <p className="text-[12px] text-[var(--sub-text)] truncate">{user.phoneNumber}</p>}
                            </div>
                            <span className="text-[11px] px-2 py-1 rounded-full font-semibold text-[#0068FF] bg-blue-50">
                              {t('chat.search_overlay.stranger_badge') || 'Kết bạn'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hidden Conversation Results (private mode) */}
                  {isPrivateMode && hiddenSearchResults.length > 0 && (
                    <div className={searchMessages.length > 0 ? 'mt-4' : ''}>
                      <h3 className="text-[13px] font-bold text-[#0068FF] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        {t('pin.hidden_results') || 'Hội thoại ẩn'}
                      </h3>
                      <div className="space-y-0.5">
                        {hiddenSearchResults.map((conv: any) => {
                          const convId = conv.conversationId || conv.id;
                          const name = conv.conversationName || conv.name || 'Unknown';
                          const avatar = conv.conversationAvatarUrl || conv.avatarUrl || '';
                          return (
                            <div
                              key={convId}
                              className="flex items-center gap-3 p-2 hover:bg-[var(--hover-bg)] rounded-lg cursor-pointer transition-colors opacity-80"
                            >
                              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-black/5">
                                {avatar ? (
                                  <Image src={avatar} alt={name} width={40} height={40} className="object-cover w-full h-full" />
                                ) : (
                                  <span className="text-[14px] font-bold text-white bg-gray-400 w-full h-full flex items-center justify-center">
                                    {name?.charAt(0)?.toUpperCase() || '?'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-medium text-[var(--text)] truncate flex items-center gap-1">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                  {name}
                                </p>
                                <p className="text-[12px] text-[var(--sub-text)] truncate">{stripHtml(conv.lastMessageContent || '')}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Default: Recent + Filters */
            <SearchOverlayDefault 
              recentSearches={recentSearches} 
              onRecentClick={(item) => {
                onSelectConversation(item.id);
                closeSearchOverlay();
              }}
            />
          )}
        </div>
      ) : nonSearchContent ? (
        <div className="flex-1 overflow-y-auto">{nonSearchContent}</div>
      ) : (
        /* Normal List */
        <div className="flex-1 overflow-y-auto px-0 pt-0 custom-scrollbar chat-list-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--sub-text)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-3">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-[14px]">
                {filterTab === 'unread' ? t('chat.empty.unread') : t('chat.empty.conversations')}
              </span>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const tagColor = conv.conversationTag
                ? subMenuItems.find((tag) => tag.key === conv.conversationTag)?.color
                : undefined;

              const subtitle = conv.otherUserId && conv.lastMsg === t('chat.start_conversation') ? (
                isOnline(conv.otherUserId) ? (
                  <span className="text-green-500 font-medium">{t('presence.online')}</span>
                ) : getTimeAgo(conv.otherUserId) ? (
                  <span className="truncate">{getTimeAgo(conv.otherUserId)}</span>
                ) : (
                  <span className="truncate" dangerouslySetInnerHTML={{ __html: getLastMsgPreviewHtml(conv.lastMsg) }} />
                )
              ) : (
                <span className="truncate" dangerouslySetInnerHTML={{ __html: getLastMsgPreviewHtml(conv.lastMsg) }} />
              );

              return (
                <SidebarItem
                  key={conv.id}
                  id={conv.id}
                  name={conv.name}
                  nickname={conv.nickname}
                  lastMsg={stripHtml(conv.lastMsg)}
                  subtitle={subtitle}
                  time={conv.time}
                  active={conv.active}
                  pinned={conv.pinned}
                  avatar={conv.avatar}
                  isGroup={conv.isGroup}
                  groupAvatarUrls={conv.groupAvatarUrls}
                  memberCount={conv.memberCount}
                  isCloud={conv.isCloud}
                  isAi={conv.isAi}
                  unreadCount={conv.unreadCount}
                  otherUserId={conv.otherUserId}
                  conversationTagColor={tagColor}
                  mutedUntil={conv.mutedUntil}
                  isMarkedUnread={conv.isMarkedUnread}
                  onClick={onSelectConversation}
                  onContextMenu={(event) => handleContextMenu(event, conv.id)}
                  onMoreClick={(event) => openContextMenuFromButton(event, conv.id)}
                />
              );
            })
          )}
        </div>
      )}

      {/* Hidden Conversations Link */}
      {!isSearching && !nonSearchContent && (
        <button
          onClick={() => { setOpenHiddenPinError(null); setHiddenListPin(null); setShowOpenHiddenPinModal(true); }}
          className="w-full px-4 py-2.5 text-[12px] text-[var(--sub-text)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)] flex items-center justify-center gap-2 transition-colors cursor-pointer border-t border-[var(--border)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          <span>{t('chat.hidden_conversations')}</span>
        </button>
      )}

      {/* Conversation Context Menu */}
      {renderContextMenu()}

      {/* Mark As Read Confirm Modal */}
      {showMarkReadConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45" onClick={() => setShowMarkReadConfirm(false)} />
          <div className="relative z-[10000] w-full max-w-[390px] overflow-hidden rounded-lg border border-gray-200 bg-[var(--card-bg)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3.5 py-3">
              <h3 className="text-[14px] font-bold text-[var(--text)]">{t('chat.ctx.mark_read_confirm_title')}</h3>
              <button
                onClick={() => setShowMarkReadConfirm(false)}
                className="rounded-md p-1 text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)] cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="px-3.5 pb-3.5 pt-3">
              <p className="text-[13px] leading-relaxed text-[var(--text)]">
                {t('chat.ctx.mark_read_confirm_desc')}
              </p>

              <label className="mt-2.5 inline-flex items-center gap-2 text-[12px] text-[var(--text)] select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShowMarkReadConfirm}
                  onChange={(e) => setDontShowMarkReadConfirm(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border border-[var(--border)]"
                />
                <span>{t('chat.ctx.mark_read_dont_show')}</span>
              </label>

              <div className="mt-3.5 flex justify-end gap-2">
                <button
                  onClick={() => setShowMarkReadConfirm(false)}
                  className="min-w-[84px] rounded-md bg-black/5 px-3.5 py-2 text-[13px] font-semibold text-[var(--text)] hover:bg-black/10 cursor-pointer"
                >
                  {t('chat.ctx.mark_read_cancel')}
                </button>
                <button
                  onClick={confirmMarkAsRead}
                  className="min-w-[96px] rounded-md bg-[#0068FF] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#0052CC] cursor-pointer"
                >
                  {t('chat.ctx.mark_read_confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-200" onClick={() => setReportModal(null)} />
          <div className="w-full max-w-[420px] bg-[var(--card-bg)] rounded-xl shadow-2xl relative z-[10000] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--text)]">{t('chat.ctx.report')}</h3>
              <button onClick={() => setReportModal(null)} className="p-1 rounded-md hover:bg-[var(--hover-bg)] text-[var(--sub-text)] cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-[13px] text-[var(--sub-text)]">
                {t('report.reporting')}: <span className="font-semibold text-[var(--text)]">{reportModal.conversationName}</span>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[var(--text)] mb-1.5">{t('report.reason')}</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[#0068FF] transition-colors"
                >
                  <option value="">{t('report.select_reason')}</option>
                  <option value="spam">{t('report.reasons.spam')}</option>
                  <option value="harassment">{t('report.reasons.harassment')}</option>
                  <option value="inappropriate">{t('report.reasons.inappropriate')}</option>
                  <option value="scam">{t('report.reasons.scam')}</option>
                  <option value="other">{t('report.reasons.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[var(--text)] mb-1.5">{t('report.description')}</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder={t('report.description_placeholder')}
                  rows={3}
                  className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[#0068FF] transition-colors resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2">
              <button onClick={() => setReportModal(null)} className="px-4 py-1.5 text-[13px] text-[var(--sub-text)] hover:text-[var(--text)] rounded-md hover:bg-[var(--hover-bg)] transition-colors cursor-pointer">
                {t('common.cancel')}
              </button>
              <button
                disabled={!reportReason || reportLoading}
                onClick={async () => {
                  setReportLoading(true);
                  try {
                    await apiClient.post('/reports', {
                      conversationId: reportModal.conversationId,
                      reason: reportReason,
                      description: reportDescription,
                    });
                    toast.success(t('report.success'));
                    setReportModal(null);
                  } catch (e: any) {
                    toast.error(e.message || t('report.error'));
                  } finally {
                    setReportLoading(false);
                  }
                }}
                className="px-4 py-1.5 text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
              >
                {reportLoading ? '...' : t('report.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private mode PIN modal */}
      {showPrivatePinModal && (
        <PinInputModal
          title={t('pin.unlock_title') || 'Nhập mã PIN'}
          subtitle={t('pin.unlock_subtitle') || 'Nhập mã PIN để xem hội thoại ẩn trong kết quả tìm kiếm'}
          error={privatePinError}
          loading={privatePinLoading}
          onConfirm={handlePrivatePinConfirm}
          onClose={() => { setShowPrivatePinModal(false); setPrivatePinError(null); }}
        />
      )}

      {/* Context-menu hide PIN modal */}
      {showCtxHidePinModal && (
        <PinInputModal
          title={ctxHideIsSetup ? t('pin.setup_for_hide_title') : t('info.hide.modal_title')}
          subtitle={ctxHideIsSetup ? t('pin.setup_for_hide_subtitle') : t('info.hide.modal_subtitle')}
          error={ctxHidePinError}
          loading={ctxHidePinLoading}
          onConfirm={handleCtxHidePinConfirm}
          onClose={() => { setShowCtxHidePinModal(false); setCtxHidePinError(null); setCtxHideConvId(null); }}
        />
      )}

      {/* Open hidden list PIN modal */}
      {showOpenHiddenPinModal && (
        <PinInputModal
          title={t('info.hide.modal_title')}
          subtitle={t('chat.open_hidden_pin_subtitle') || 'Nhập mã PIN để xem danh sách hội thoại đã ẩn'}
          error={openHiddenPinError}
          loading={openHiddenPinLoading}
          onConfirm={handleOpenHiddenPinConfirm}
          onClose={() => { setShowOpenHiddenPinModal(false); setOpenHiddenPinError(null); }}
        />
      )}

      {/* Hidden Conversations Modal */}
      {showHiddenModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-200" onClick={() => { setShowHiddenModal(false); setShowAllHidden(false); setHiddenListPin(null); }} />
          <div className="w-full max-w-[420px] max-h-[70vh] bg-[var(--card-bg)] rounded-xl shadow-2xl relative z-[10000] animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
              <h3 className="text-[16px] font-bold text-[var(--text)]">{t('chat.hidden_conversations')}</h3>
              <button onClick={() => { setShowHiddenModal(false); setShowAllHidden(false); setHiddenListPin(null); }} className="p-1 rounded-md hover:bg-[var(--hover-bg)] text-[var(--sub-text)] cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {hiddenLoading ? (
                <div className="flex items-center justify-center py-8 text-[var(--sub-text)]">
                  <span className="text-[13px]">...</span>
                </div>
              ) : hiddenConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-[var(--sub-text)]">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  <span className="text-[13px]">{t('chat.hidden_empty')}</span>
                </div>
              ) : (
                <>
                  {(showAllHidden ? hiddenConversations : hiddenConversations.slice(0, HIDDEN_PAGE_SIZE)).map((conv: any) => {
                    const convId = conv.conversationId || conv.conversation_id;
                    const convType = conv.conversationType || conv.conversation_type;
                    const isPrivate = convType === 'PRIVATE';
                    const isSelf = convType === 'SELF';
                    const isGroup = convType === 'GROUP';
                    const rawName = conv.conversationName || conv.conversation_name || '';
                    const isAiConv = isSelf && rawName === 'Fruvia Chatbot';
                    const isCloudConv = (isSelf && !isAiConv) || (!isGroup && (rawName === 'Cloud của tôi' || rawName === 'My Documents'));
                    let name = rawName;
                    let avatar = conv.conversationAvatarUrl || conv.conversation_avatar_url || '';
                    if (isPrivate && conv.members) {
                      const other = conv.members.find((m: any) =>
                        (m.userId || m.user_id) !== (currentUser?.id)
                      );
                      if (other) {
                        name = other.displayName || other.display_name || other.userName || other.user_name || name;
                        avatar = other.avatarUrl || other.avatar_url || avatar;
                      }
                    }
                    if (!name) name = 'Unknown';
                    const lastMsg = stripHtml(conv.lastMessageContent || conv.last_message_content || '');
                    return (
                      <div key={convId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--hover-bg)] transition-colors">
                        <div className={`w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center ${isAiConv ? '' : isCloudConv ? 'bg-[#0068FF]' : 'bg-gray-200'}`}>
                          {isAiConv ? (
                            <FruviaChatbotAvatar className="w-full h-full" imageClassName="w-full h-full object-cover" />
                          ) : isCloudConv ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                              <path d="M17.5 19c3.037 0 5.5-2.463 5.5-5.5 0-2.97-2.354-5.391-5.291-5.492a7 7 0 0 0-13.709 0C1.109 8.109 1 10.53 1 13.5c0 3.037 2.463 5.5 5.5 5.5h11z" />
                            </svg>
                          ) : avatar ? (
                            <Image src={avatar} alt={name} width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white bg-[#0068FF] text-[14px] font-bold">
                              {name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-medium text-[var(--text)] truncate">{name}</div>
                          <div className="text-[12px] text-[var(--sub-text)] truncate">{lastMsg}</div>
                        </div>
                        <button
                          onClick={() => handleUnhideFromHiddenModal(convId)}
                          className="px-3 py-1.5 text-[12px] font-medium text-[#0068FF] bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          {t('chat.unhide')}
                        </button>
                      </div>
                    );
                  })}
                  {hiddenConversations.length > HIDDEN_PAGE_SIZE && (
                    <button
                      onClick={() => setShowAllHidden(prev => !prev)}
                      className="w-full mt-1 py-2 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[var(--sub-text)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors cursor-pointer"
                    >
                      <span className={`transition-transform duration-200 ${showAllHidden ? 'rotate-180' : ''}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                      {showAllHidden
                        ? t('common.show_less') || 'Thu gọn'
                        : `${t('common.show_more') || 'Xem thêm'} (${hiddenConversations.length - HIDDEN_PAGE_SIZE})`}
                    </button>
                  )}
                </>
              )}
            </div>
            {!hiddenLoading && hiddenConversations.length > 1 && (
              <div className="px-3 pb-3 border-t border-[var(--border)] pt-3 shrink-0">
                <button
                  onClick={() => handleUnhideFromHiddenModal('all')}
                  className="w-full py-2 flex items-center justify-center gap-2 text-[13px] font-semibold text-[#0068FF] bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  {t('chat.unhide_all') || 'Hiện lại tất cả'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
