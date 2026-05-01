import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Sidebar } from './Sidebar';
import { ConversationList } from '@/features/chat/components/ConversationList';
import { ChatWindow } from '@/features/chat/components/ChatWindow';
import { ChatInfoSidebar } from './ChatInfoSidebar';
import { SettingsModal, ProfileModal, MemberProfileModal } from '@/features/user';
import { ContactList, AddFriendModal } from '@/features/friends';
import { ContactsContent } from './ContactsContent';
import { CreateGroupModal } from './CreateGroupModal';
import { UserDataModal } from './UserDataModal';
import { apiClient } from '@/lib/http/apiClient';
import { websocketService } from '@/lib/realtime/websocketService';
import { friendService } from '@/features/friends';
import { PresenceProvider } from '@/features/user';
import { messageService } from '@/features/chat';
import { SocialFeed } from '@/features/social';

export interface ChatDashboardProps {
  onLogout: () => void;
  userName?: string;
  initialChatId?: string;
}

export function ChatDashboardLegacy({ onLogout, userName, initialChatId }: ChatDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('fruvia_active_tab') || 'chat';
  });

  useEffect(() => {
    localStorage.setItem('fruvia_active_tab', activeTab);
  }, [activeTab]);
  const [contactCategory, setContactCategory] = useState('friends');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTargetUserId, setProfileTargetUserId] = useState<string | null>(null);
  const [profileOnBack, setProfileOnBack] = useState<(() => void) | null>(null);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [addFriendPrefill, setAddFriendPrefill] = useState<{
    phoneNumber?: string;
    user?: {
      user_id: string;
      phone_number?: string;
      display_name?: string;
      avatar_url?: string;
      friendship_status?: string;
    };
  } | null>(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isUserDataModalOpen, setIsUserDataModalOpen] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<'info' | 'search' | null>('info');

  // Sidebar search state (search within current conversation)
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [sidebarSearchResults, setSidebarSearchResults] = useState<{ messageId: string; senderId: string; senderName: string; senderAvatar?: string; content: string; messageType: string; createdAt: string }[]>([]);
  const [isSidebarSearchLoading, setIsSidebarSearchLoading] = useState(false);
  const sidebarSearchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [sidebarFilterSender, setSidebarFilterSender] = useState<string>('');
  const [sidebarFilterTime, setSidebarFilterTime] = useState<string>('');
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [senderSearch, setSenderSearch] = useState('');
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
  const [calendarStartDate, setCalendarStartDate] = useState<Date | null>(null);
  const [calendarEndDate, setCalendarEndDate] = useState<Date | null>(null);
  const [calendarHoverDate, setCalendarHoverDate] = useState<Date | null>(null);
  const [dateSuggestionOpen, setDateSuggestionOpen] = useState(false);
  const dateSuggestionLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const hasToasted = React.useRef(false);
  const [chatRefreshTrigger, setChatRefreshTrigger] = useState(0);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get('/users/me');
      const data = (response && response.success && response.data) ? response.data : response;

      if (data && (data.user_id || data.id || data.display_name || data.full_name || data.phone_number)) {
        // Normalize to ensure ID and Name are always available under standard keys
        const normalizedUser = {
          ...data,
          id: data.user_id || data.id,
          displayName: data.display_name || data.full_name || data.displayName,
          avatarUrl: data.avatar_url || data.avatarUrl || data.avatar,
          full_name: data.full_name || data.display_name, // Fallback for components expecting full_name
        };
        setCurrentUser(normalizedUser);
      }
    } catch (error: any) {
      if (error.message?.includes("Không tìm thấy người dùng") || error.message?.includes("User not found")) {
        onLogout();
      }
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (!hasToasted.current && currentUser?.full_name) {
      toast(t('dashboard.welcome', { name: currentUser.full_name }), {
        description: t('dashboard.welcome_desc'),
        icon: <span className="text-xl">✨</span>,
        duration: 5000,
      });
      hasToasted.current = true;
    }
  }, [currentUser]);

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | number>(initialChatId ?? '');
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);
  const [externalForwardingMsg, setExternalForwardingMsg] = useState<any>(null);
  // Refs for stale-closure-safe access inside WebSocket callbacks
  const selectedChatIdRef = useRef<string | number>(initialChatId ?? '');
  const currentUserRef = useRef<any>(null);
  const dashboardConvSubsRef = useRef<Map<string, any>>(new Map());
  const [isConversationsLoaded, setIsConversationsLoaded] = useState(false);
  const selectedChat = conversations.find(c => String(c.id) === String(selectedChatId));
  const [invitationCount, setInvitationCount] = useState(0);

  useEffect(() => {
    if (!initialChatId) return;
    setSelectedChatId(prev => (String(prev) === String(initialChatId) ? prev : initialChatId));
  }, [initialChatId]);

  useEffect(() => {
    if (!isConversationsLoaded) return;

    setSelectedChatId((prev) => {
      if (!prev) return prev;

      const hasValidSelection = conversations.some(c => String(c.id) === String(prev));
      if (hasValidSelection) return prev;

      return '';
    });
  }, [conversations, isConversationsLoaded]);

  const parseEsMessageResults = (payload: any) => {
    const list = payload?.content || (Array.isArray(payload) ? payload : []);
    if (!Array.isArray(list)) return [];

    return list
      .map((item: any) => {
        const doc = item?.document || item;
        if (!doc?.messageId) return null;

        const highlightedContent = item?.highlights?.content?.[0];
        const normalizedContent = typeof highlightedContent === 'string'
          ? highlightedContent.replace(/<[^>]+>/g, '')
          : doc.content;

        return {
          messageId: doc.messageId,
          senderId: doc.senderId,
          senderName: doc.senderName,
          senderAvatar: doc.senderAvatar || null,
          content: normalizedContent,
          messageType: doc.messageType,
          createdAt: doc.createdAt,
        };
      })
      .filter(Boolean);
  };

  const ensureSelfConversation = useCallback(async () => {
    try {
      const res = await messageService.ensureSelfConversation();
      const data = (res && res.success && res.data) ? res.data : res;
      return data?.conversationId || data?.conversation_id || null;
    } catch (error) {
      console.error("Failed to get/create self chat:", error);
      return null;
    }
  }, []);

  const ensureAiConversation = useCallback(async () => {
    try {
      const res = await messageService.ensureAiConversation();
      const data = (res && res.success && res.data) ? res.data : res;
      return data?.conversationId || data?.conversation_id || null;
    } catch (error) {
      console.error("Failed to get/create AI chat:", error);
      return null;
    }
  }, []);

  const handleSidebarSearch = useCallback((value: string, filterSenderId?: string, filterTime?: string) => {
    setSidebarSearchQuery(value);
    if (sidebarSearchTimerRef.current) clearTimeout(sidebarSearchTimerRef.current);

    const hasFilter = !!(filterSenderId || filterTime);
    if (!value.trim() && !hasFilter || !selectedChat?.id) {
      setSidebarSearchResults([]);
      setIsSidebarSearchLoading(false);
      return;
    }

    setIsSidebarSearchLoading(true);
    sidebarSearchTimerRef.current = setTimeout(async () => {
      try {
        let fromDate: string | undefined;
        let toDate: string | undefined;
        const now = new Date();
        if (filterTime === 'week') {
          const d = new Date(now); d.setDate(d.getDate() - 7);
          fromDate = d.toISOString();
        } else if (filterTime === 'month') {
          const d = new Date(now); d.setMonth(d.getMonth() - 1);
          fromDate = d.toISOString();
        } else if (filterTime === '3months') {
          const d = new Date(now); d.setMonth(d.getMonth() - 3);
          fromDate = d.toISOString();
        } else if (filterTime?.startsWith('custom|')) {
          const parts = filterTime.split('|');
          if (parts[1]) fromDate = parts[1];
          if (parts[2]) toDate = parts[2];
        }
        const res = await messageService.searchMessages({
          query: value.trim(),
          conversationId: selectedChat.id,
          size: 50,
          senderId: filterSenderId || undefined,
          fromDate,
          toDate,
        });
        setSidebarSearchResults(parseEsMessageResults(res) as any);
      } catch {
        setSidebarSearchResults([]);
      } finally {
        setIsSidebarSearchLoading(false);
      }
    }, 400);
  }, [selectedChat?.id]);

  useEffect(() => {
    return () => {
      if (sidebarSearchTimerRef.current) {
        clearTimeout(sidebarSearchTimerRef.current);
      }
    };
  }, []);

  // Clear sidebar search when switching conversations or closing
  useEffect(() => {
    setSidebarSearchQuery('');
    setSidebarSearchResults([]);
    setSidebarFilterSender('');
    setSidebarFilterTime('');
    setSenderDropdownOpen(false);
    setTimeDropdownOpen(false);
    setSenderSearch('');
    setCalendarStartDate(null);
    setCalendarEndDate(null);
    setCalendarHoverDate(null);
  }, [selectedChat?.id, activeSidebar]);

  const parseDateToMillis = (value?: string | null) => {
    if (!value) return 0;
    const millis = new Date(value).getTime();
    return Number.isNaN(millis) ? 0 : millis;
  };

  const sortConversations = (list: any[]) => {
    return [...list].sort((a, b) => {
      const aPinned = !!a.pinned;
      const bPinned = !!b.pinned;
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      if (aPinned && bPinned) {
        const pinnedDiff = parseDateToMillis(b.pinnedAt) - parseDateToMillis(a.pinnedAt);
        if (pinnedDiff !== 0) return pinnedDiff;
      }

      const aTime = a.lastMessageAt || a.createdAt;
      const bTime = b.lastMessageAt || b.createdAt;
      return parseDateToMillis(bTime) - parseDateToMillis(aTime);
    });
  };

  const fetchInvitationCount = async () => {
    try {
      const requests = await friendService.getReceivedRequests();
      setInvitationCount(requests.length);
    } catch (error) {
      console.error("Failed to fetch invitation count:", error);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await messageService.getConversations();
      const data = (res && res.success && res.data) ? res.data : res;
      if (Array.isArray(data)) {
        const mapped = data.map((c: any) => {
          const rawName = c.conversationName || c.conversation_name || '';
          const isSelf = c.conversationType === 'SELF' || c.conversation_type === 'SELF';
          const isGroup = c.conversationType === 'GROUP' || c.conversation_type === 'GROUP';
          const isAi = isSelf && rawName.trim().toLowerCase() === 'fruvia chatbot';
          // Robust detection for "Cloud của tôi" (Self Chat)
          const isCloud = (isSelf && !isAi) || (!isGroup && (rawName === 'Cloud của tôi' || rawName === 'My Documents'));
          const name = isAi
            ? t('chat.ai_name')
            : (rawName || (isCloud ? t('chat.self_cloud') : 'Conversation'));
          const id = c.conversationId || c.conversation_id;
          const avatar = c.conversationAvatarUrl || c.conversation_avatar_url || '';
          const groupMemberAvatars = Array.isArray(c.members)
            ? c.members
              .map((m: any) => m.avatarUrl || m.avatar_url || '')
              .filter((url: string) => Boolean(url))
              .slice(0, 3)
            : [];
          const groupMemberCount = Array.isArray(c.members)
            ? c.members.length
            : Number(c.memberCount || c.member_count || 0);

          let displayName = name;
          let displayAvatar = avatar;

          if ((c.conversationType === 'PRIVATE' || c.conversation_type === 'PRIVATE') && c.members) {
            const otherUser = c.members.find((m: any) => m.userId !== currentUser?.id && m.user_id !== currentUser?.id);
            if (otherUser) {
              displayName = otherUser.displayName || otherUser.display_name || displayName;
              displayAvatar = otherUser.avatarUrl || otherUser.avatar_url || displayAvatar;
            }
          }

          // Lấy userId của người chat cùng (dùng cho presence indicator), nickname và role của bản thân
          let otherUserId = '';
          let myNickname = '';
          let myRole = 'MEMBER';
          if (c.members) {
            const isPrivate = c.conversationType === 'PRIVATE' || c.conversation_type === 'PRIVATE';
            const me = c.members.find((m: any) => (m.userId || m.user_id) === currentUser?.id);
            if (me) {
              myNickname = me.nickname || '';
              myRole = me.role || 'MEMBER';
            }
            if (isPrivate) {
              const other = c.members.find((m: any) => (m.userId || m.user_id) !== currentUser?.id);
              if (other) otherUserId = other.userId || other.user_id || '';
            }
          }

          const lastSenderId = c.lastMessageSenderId || c.last_message_sender_id || '';
          let lastSenderName = c.lastMessageSenderName || c.last_message_sender_name || '';
          
          // Fallback: If backend hasn't denormalized sender name yet, find it in members
          if (!lastSenderName && lastSenderId && isGroup && c.members) {
            const senderMember = c.members.find((m: any) => (m.userId || m.user_id) === lastSenderId);
            if (senderMember) {
              lastSenderName = senderMember.displayName || senderMember.display_name || senderMember.nickname || '';
            }
          }

          const isFromMe = (lastSenderId === currentUser?.id || lastSenderId === currentUser?.user_id) && lastSenderId !== '';

          let displayLastMsg = c.lastMessageContent
            || c.last_message_content
            || (isAi ? t('chat.ai_subheading') : t('chat.start_conversation'));

          if (displayLastMsg && displayLastMsg !== t('chat.start_conversation') && displayLastMsg !== t('chat.ai_subheading')) {
            if (isFromMe) {
              displayLastMsg = `${t('social.messenger.you')}: ${displayLastMsg}`;
            } else if (isGroup && lastSenderName) {
              displayLastMsg = `${lastSenderName}: ${displayLastMsg}`;
            }
          }

          return {
            id,
            name: displayName,
            lastMsg: displayLastMsg,
            lastSenderId,
            lastSenderName,
            time: (c.lastMessageTime || c.last_message_time || c.createdAt || c.created_at) ? new Date(c.lastMessageTime || c.last_message_time || c.createdAt || c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            lastMessageAt: c.lastMessageTime || c.last_message_time || null,
            createdAt: c.createdAt || c.created_at || null,
            isCloud,
            isAi,
            isGroup,
            avatar: displayAvatar,
            groupAvatarUrls: isGroup && !displayAvatar ? groupMemberAvatars : [],
            memberCount: isGroup ? groupMemberCount : undefined,
            pinned: c.isPinned || c.is_pinned || false,
            pinnedAt: c.pinnedAt || c.pinned_at || null,
            unreadCount: c.unreadCount || c.unread_count || 0,
            otherUserId,
            nickname: myNickname || undefined,
            role: myRole,
            members: c.members || [],
            conversationTag: c.conversationTag || c.conversation_tag || undefined,
            conversationStatus: c.conversationStatus || c.conversation_status || 'NORMAL',
            isRequest: (c.conversationStatus || c.conversation_status) === 'PENDING',
            mutedUntil: c.mutedUntil || c.muted_until || null,
            isMarkedUnread: c.isMarkedUnread || c.is_marked_unread || false,
            autoDeleteDuration: c.autoDeleteDuration || c.auto_delete_duration || null,
            invitationLink: c.invitationLink || c.invitation_link || undefined,
            permissions: c.permissions || undefined,
          };
        });
        const sorted = sortConversations(mapped);
        setConversations(sorted);

        if (initialChatId && sorted.length > 0) {
          const targetConversation = sorted.find(c => String(c.id) === String(initialChatId));
          if (targetConversation) {
            setSelectedChatId(targetConversation.id);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
    } finally {
      setIsConversationsLoaded(true);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      const initializeData = async () => {
        await fetchInvitationCount();
        // Ensure My Documents (SELF) exists as a default conversation on first open.
        await ensureSelfConversation();
        // Ensure AI conversation exists so user always sees "Chat with AI" in list.
        await ensureAiConversation();
        await fetchConversations();
      };

      initializeData();

      const subEvents = websocketService.subscribeToFriendEvents(currentUser.id, (msg) => {
        fetchInvitationCount();
        if (msg.body === "RECEIVED") {
          toast.info(t('dashboard.new_friend_invite'), {
            duration: 3000,
          });
        }
        if (msg.body === "ACCEPTED") {
          fetchConversations();
        }
      });

      // Subscribe to group creation events for this user
      const subGroup = websocketService.subscribe(`/topic/group-events/${currentUser.id}`, (msg) => {
        try {
          const group = JSON.parse(msg.body);
          if (group.type === 'DISSOLVED') {
            toast.info(t('group.disband.success') + `: ${group.conversationName || ''}`, { duration: 5000 });
            setConversations(prev => prev.filter(c => c.id !== group.conversationId));
            if (selectedChatId === group.conversationId) {
              setSelectedChatId('');
            }
          } else if (group.type === 'REMOVED') {
            toast.info(t('group.removed') || 'Bạn đã bị xóa khỏi nhóm', { duration: 4000 });
            setConversations(prev => prev.filter(c => c.id !== group.conversationId));
            if (selectedChatId === group.conversationId) {
              setSelectedChatId('');
            }
          } else if (group.type === 'UPDATED') {
            // Lặng lẽ cập nhật lại danh sách nếu chỉ là đổi thông tin nhóm
            fetchConversations();
          } else {
            // Mặc định là CREATED hoặc không có type (fallback): Hiển thị thông báo "Bạn được thêm vào nhóm"
            toast.info(t('dashboard.added_to_group', { name: group.conversationName || group.conversation_name || 'Nhóm mới' }), {
              duration: 4000,
            });
            fetchConversations();
          }
        } catch (e) {
          console.error('Failed to parse group event:', e);
        }
      });

      // Subscribe to conversation events (pin/delete) for real-time sidebar updates
      const subConvEvents = websocketService.subscribe(`/topic/conversation-events/${currentUser.id}`, (msg) => {
        try {
          const event = JSON.parse(msg.body);
          if (event.type === 'PIN_UPDATED') {
            setConversations(prev =>
              sortConversations(
                prev.map(c =>
                  c.id === event.conversationId
                    ? {
                      ...c,
                      pinned: event.isPinned,
                      pinnedAt: event.isPinned ? (event.pinnedAt || new Date().toISOString()) : null,
                    }
                    : c
                )
              )
            );
          } else if (event.type === 'CONVERSATION_DELETED') {
            setConversations(prev => prev.filter(c => c.id !== event.conversationId));
          } else if (event.type === 'MUTED') {
            setConversations(prev =>
              prev.map(c =>
                c.id === event.conversationId
                  ? { ...c, mutedUntil: event.mutedUntil || null }
                  : c
              )
            );
          } else if (event.type === 'MARK_UNREAD') {
            setConversations(prev =>
              prev.map(c =>
                c.id === event.conversationId
                  ? { ...c, isMarkedUnread: event.isMarkedUnread }
                  : c
              )
            );
          } else if (event.type === 'AUTO_DELETE_UPDATED') {
            setConversations(prev =>
              prev.map(c =>
                c.id === event.conversationId
                  ? { ...c, autoDeleteDuration: event.autoDeleteDuration || null }
                  : c
              )
            );
          } else if (event.type === 'CONVERSATION_UNHIDDEN') {
            // Re-fetch conversations to include the unhidden one
            fetchConversations();
          }
        } catch (e) {
          console.error('Failed to parse conversation event:', e);
        }
      });

      return () => {
        subEvents?.unsubscribe();
        subGroup?.unsubscribe();
        subConvEvents?.unsubscribe();
      };
    }
  }, [currentUser?.id, ensureSelfConversation, ensureAiConversation]);

  // Keep refs in sync so subscription callbacks always see the latest values
  useEffect(() => { selectedChatIdRef.current = selectedChatId; }, [selectedChatId]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // Global real-time subscriptions for EVERY conversation —
  // keeps Sidebar lastMsg, time, and unreadCount up to date without page reload.
  const convIdsKey = conversations.map(c => c.id).join(',');
  useEffect(() => {
    if (!currentUser?.id || conversations.length === 0) return;

    // Subscribe to conversations not yet tracked
    conversations.forEach(conv => {
      const id = String(conv.id);
      if (dashboardConvSubsRef.current.has(id)) return;

      const sub = websocketService.subscribe(`/topic/chat/${conv.id}`, (msg) => {
        try {
          const raw = JSON.parse(msg.body);
          const newMsg = raw.message || raw;

          // Skip non-new-message events
          if (
            newMsg.type &&
            ['REACTION_UPDATE', 'MESSAGE_EDIT', 'MESSAGE_RECALL', 'MESSAGE_PIN', 'MESSAGE_UNPIN'].includes(
              newMsg.type
            )
          ) {
            return;
          }

          // Trigger refresh for media sidebars
          setChatRefreshTrigger(prev => prev + 1);

          const user = currentUserRef.current;
          const isCurrentConversation = String(selectedChatIdRef.current) === String(conv.id);
          const isFromMe = newMsg.senderId === user?.id || newMsg.senderId === user?.user_id;

          const getSnippet = (content: string, type?: string) => {
            switch (type) {
              case 'IMAGE': return t('chat.snippet.image');
              case 'VIDEO': return t('chat.snippet.video');
              case 'MEDIA': return t('chat.snippet.file');
              case 'VOICE': return t('chat.snippet.voice');
              case 'STICKER': return t('chat.snippet.sticker');
              case 'SHARE_CONTACT': return `📇 ${t('share_contact.snippet')}`;
              default: return content;
            }
          };

          let snippet = getSnippet(newMsg.content || '', newMsg.messageType);
          let senderName = newMsg.senderName;
          
          // Fallback for senderName if missing in group message
          if (!senderName && !isFromMe && conv.isGroup && conv.members) {
            const member = conv.members.find((m: any) => (m.userId || m.user_id) === newMsg.senderId);
            if (member) senderName = member.displayName || member.display_name || member.nickname;
          }

          if (snippet) {
            if (isFromMe) {
              snippet = `${t('social.messenger.you')}: ${snippet}`;
            } else if (conv.isGroup && senderName) {
              snippet = `${senderName}: ${snippet}`;
            }
          }

          const msgAt = newMsg.createdAt || new Date().toISOString();
          const formattedTime = new Date(msgAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          setConversations(prev => {
            const updated = prev.map(c => {
              if (String(c.id) !== String(conv.id)) return c;
              return {
                ...c,
                lastMsg: snippet || c.lastMsg,
                lastSenderId: newMsg.senderId,
                lastSenderName: senderName || c.lastSenderName,
                time: formattedTime,
                lastMessageAt: msgAt,
                // Only increment unreadCount when message is from someone else AND not in this conversation
                unreadCount:
                  !isCurrentConversation && !isFromMe ? (c.unreadCount || 0) + 1 : c.unreadCount,
              };
            });
            return sortConversations(updated);
          });
        } catch (e) {
          console.error('[Dashboard] Failed to parse WS message for sidebar update:', e);
        }
      });

      dashboardConvSubsRef.current.set(id, sub);
    });

    // Unsubscribe from conversations removed from the list
    const currentIds = new Set(conversations.map(c => String(c.id)));
    dashboardConvSubsRef.current.forEach((sub, id) => {
      if (!currentIds.has(id)) {
        sub?.unsubscribe();
        dashboardConvSubsRef.current.delete(id);
      }
    });

    // Capture the map reference so the cleanup function uses the same object
    const convSubs = dashboardConvSubsRef.current;
    return () => {
      convSubs.forEach(sub => sub?.unsubscribe());
      convSubs.clear();
    };
  }, [convIdsKey, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartP2PChat = async (user: any) => {
    const friendId = user.user_id || user.id;
    try {
      // Use getOrCreate endpoint to ensure conversation exists
      const res = await apiClient.get<any>(`/conversations/private/${friendId}`);
      if (res && (res.conversationId || res.conversation_id)) {
        const convId = res.conversationId || res.conversation_id;
        await fetchConversations();
        setSelectedChatId(convId);
      } else {
        // Fallback: Virtual Chat (Lazy Creation)
        const virtualId = `new:${friendId}`;
        const existingVirtual = conversations.find(c => c.id === virtualId);
        if (!existingVirtual) {
          const virtualChat = {
            id: virtualId,
            name: user.display_name || user.full_name || user.name,
            avatar: user.avatar_url || user.avatar,
            lastMsg: t('chat.start_conversation'),
            time: '',
            isNew: true,
            recipientId: friendId
          };
          setConversations(prev => [virtualChat, ...prev]);
        }
        setSelectedChatId(virtualId);
      }
      setActiveTab('chat');
    } catch (error) {
      console.error("Failed to start P2P chat:", error);
    }
  };

  useEffect(() => {
    if (activeTab === 'cloud') {
      const openSelfChat = async () => {
        const newId = await ensureSelfConversation();
        if (newId) {
          setSelectedChatId(newId);
          await fetchConversations();
        } else {
          toast.error(t('dashboard.cloud_open_error'));
        }
        setActiveTab('chat');
      };
      openSelfChat();
    }
  }, [activeTab, ensureSelfConversation]);

  const openAddFriendModal = useCallback(
    (prefill?: {
      phoneNumber?: string;
      user?: {
        user_id: string;
        phone_number?: string;
        display_name?: string;
        avatar_url?: string;
        friendship_status?: string;
      };
    }) => {
      setAddFriendPrefill(prefill || null);
      setIsAddFriendModalOpen(true);
    },
    []
  );

  const handleOpenProfile = useCallback((userId?: string, onBack?: () => void) => {
    setProfileTargetUserId(userId || null);
    setProfileOnBack(onBack ? () => onBack : null);
    setIsProfileModalOpen(true);
  }, []);

  const handleTogglePin = useCallback(async (id: string | number) => {
    const target = conversations.find(c => String(c.id) === String(id));
    if (!target) return;

    const isPinned = !!target.pinned;
    try {
      // Use POST for toggle as seen in ConversationListLegacy
      const res: any = await apiClient.post(`/conversations/${id}/pin`, {});
      const newPinned = res?.data?.isPinned ?? res?.isPinned ?? !isPinned;

      if (newPinned) {
        toast.success(t('chat.pin.pin_success') || 'Đã ghim hội thoại');
      } else {
        toast.success(t('chat.pin.unpin_success') || 'Đã bỏ ghim hội thoại');
      }

      setConversations(prev => prev.map(c => {
        if (String(c.id) !== String(id)) return c;
        return { ...c, pinned: newPinned, pinnedAt: newPinned ? new Date().toISOString() : null };
      }));
    } catch (error: any) {
      toast.error(error.message || 'Không thể thay đổi trạng thái ghim');
    }
  }, [conversations, t]);

  const handleUpdateConversationMeta = useCallback((id: string | number, updates: { name?: string; avatar?: string }) => {
    setConversations(prev => prev.map(c => {
      if (String(c.id) !== String(id)) return c;
      const nextConversation = { ...c };
      if (typeof updates.name === 'string' && updates.name.trim()) {
        nextConversation.name = updates.name.trim();
      }
      if (typeof updates.avatar === 'string') {
        nextConversation.avatar = updates.avatar;
        if (updates.avatar) {
          nextConversation.groupAvatarUrls = [];
        }
      }
      return nextConversation;
    }));
  }, []);

  return (
    <PresenceProvider currentUserId={currentUser?.id || null}>
      <div className="flex h-screen w-full bg-[var(--card-bg)] overflow-hidden text-[var(--text)] transition-colors duration-200">
        {/* Modals */}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />

        {profileTargetUserId && profileTargetUserId !== currentUser?.id ? (
          <MemberProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => {
              setIsProfileModalOpen(false);
              setProfileTargetUserId(null);
            }}
            targetUserId={profileTargetUserId}
            onStartChat={handleStartP2PChat}
            onAddFriend={openAddFriendModal}
            onBack={profileOnBack || undefined}
          />
        ) : (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => {
              setIsProfileModalOpen(false);
              setProfileTargetUserId(null);
            }}
            onUpdate={fetchUserProfile}
            targetUserId={profileTargetUserId}
            onStartChat={handleStartP2PChat}
            onAddFriend={openAddFriendModal}
          />
        )}

        <AddFriendModal
          isOpen={isAddFriendModalOpen}
          onClose={() => {
            setIsAddFriendModalOpen(false);
            setAddFriendPrefill(null);
          }}
          currentUserName={currentUser?.full_name || userName}
          currentUserId={currentUser?.id}
          initialPhoneNumber={addFriendPrefill?.phoneNumber}
          initialUser={addFriendPrefill?.user || null}
        />

        <CreateGroupModal
          isOpen={isCreateGroupModalOpen}
          onClose={() => setIsCreateGroupModalOpen(false)}
          onGroupCreated={(group) => {
            // Refresh conversations to include the new group
            fetchConversations().then(() => {
              const groupId = group?.conversationId || group?.conversation_id;
              if (groupId) setSelectedChatId(groupId);
            });
          }}
        />

        <UserDataModal
          isOpen={isUserDataModalOpen}
          onClose={() => setIsUserDataModalOpen(false)}
        />

        {/* 1. LEFT SIDEBAR (Hidden in Social mode) */}
        {activeTab !== 'social' && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            showSettingsMenu={showSettingsMenu}
            setShowSettingsMenu={setShowSettingsMenu}
            setIsSettingsModalOpen={setIsSettingsModalOpen}
            setIsProfileModalOpen={setIsProfileModalOpen}
            onLogout={onLogout}
            user={currentUser}
            invitationCount={invitationCount}
          />
        )}

        {/* 2. MIDDLE LIST */}
        {activeTab !== 'social' && (
          activeTab === 'chat' || activeTab === 'contacts' ? (
            <ConversationList
              conversations={conversations.map(c => ({ ...c, active: c.id === selectedChatId }))}
              onAddFriend={(prefill) => openAddFriendModal(prefill)}
              onCreateGroup={() => setIsCreateGroupModalOpen(true)}
              onSelectConversation={(id) => {
                setSelectedChatId(id);
                setActiveTab('chat');
                // Optimistically clear unreadCount when opening a conversation
                setConversations(prev =>
                  prev.map(c => c.id === id ? { ...c, unreadCount: 0, isMarkedUnread: false } : c)
                );
                // Auto-clear "marked unread" when opening conversation
                const conv = conversations.find(c => c.id === id);
                if (conv?.isMarkedUnread) {
                  apiClient.post(`/conversations/${id}/mark-unread`, {}).catch(() => { });
                }
              }}
              onJumpToMessage={(convId, messageId) => {
                setSelectedChatId(convId);
                setActiveTab('chat');
                setTargetMessageId(messageId);
                setConversations(prev =>
                  prev.map(c => c.id === convId ? { ...c, unreadCount: 0, isMarkedUnread: false } : c)
                );
              }}
              onPinConversation={(id, pinned) => {
                setConversations(prev =>
                  sortConversations(
                    prev.map(c =>
                      c.id === id
                        ? {
                          ...c,
                          pinned,
                          pinnedAt: pinned ? new Date().toISOString() : null,
                        }
                        : c
                    )
                  )
                );
              }}
              onDeleteConversation={(id) => {
                setConversations(prev => prev.filter(c => c.id !== id));
                if (selectedChatId === id) setSelectedChatId('');
              }}
              onTagConversation={(id, tag) => {
                setConversations(prev =>
                  prev.map(c => c.id === id ? { ...c, conversationTag: tag || undefined } : c)
                );
              }}
              onMuteConversation={(id, mutedUntil) => {
                setConversations(prev =>
                  prev.map(c => c.id === id ? { ...c, mutedUntil } : c)
                );
              }}
              onMarkUnread={(id, isMarkedUnread) => {
                setConversations(prev =>
                  prev.map(c => c.id === id ? { ...c, isMarkedUnread } : c)
                );
              }}
              onMarkAsRead={(ids) => {
                const idSet = new Set(ids.map(String));
                setConversations(prev =>
                  prev.map(c => idSet.has(String(c.id)) ? { ...c, unreadCount: 0, isMarkedUnread: false } : c)
                );
              }}
              onAutoDeleteConversation={(id, duration) => {
                setConversations(prev =>
                  prev.map(c => c.id === id ? { ...c, autoDeleteDuration: duration } : c)
                );
              }}
              onUnhideConversation={() => {
                fetchConversations();
              }}
              currentUser={currentUser}
              nonSearchContent={activeTab === 'contacts' ? (
                <ContactList
                  selectedCategory={contactCategory}
                  onSelectCategory={setContactCategory}
                />
              ) : undefined}
            />
          ) : (
            <div className="w-[340px] border-r border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-center text-gray-400">
              {t('common.coming_soon')}
            </div>
          )
        )}

        {/* 3. MAIN CONTENT AREA */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'chat' ? (
            selectedChat ? (
              <>
                <ChatWindow
                  onToggleSidebar={(type) => setActiveSidebar(activeSidebar === type ? null : type)}
                  activeSidebar={activeSidebar}
                  selectedChat={selectedChat}
                  currentUser={currentUser}
                  onSelectConversation={(newId) => {
                    setConversations(prev => {
                      return prev.map(c => {
                        if (c.id === selectedChatId && (c as any).isNew) {
                          return { ...c, id: newId, isNew: false };
                        }
                        return c;
                      });
                    });
                    setSelectedChatId(newId);
                  }}
                  onUpdateConversation={(id, lastMsg, msgTime) => {
                    setChatRefreshTrigger(prev => prev + 1);
                    setConversations(prev => {
                      const cloned = [...prev];

                      // 1. Nếu là tin nhắn từ cuộc hội thoại MỚI (đổi từ virtual sang real)
                      // Hoặc đơn giản là tìm và cập nhật
                      const idx = cloned.findIndex(c => c.id === id);
                      if (idx !== -1) {
                        const updated = {
                          ...cloned[idx],
                          lastMsg,
                          time: msgTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          lastMessageAt: new Date().toISOString(),
                          isNew: false,
                        };
                        cloned.splice(idx, 1);
                        cloned.push(updated);
                      } else {
                        // Nếu chưa có trong list (ví dụ message mới từ server), fetch lại list hoặc thêm thủ công
                        fetchConversations();
                      }

                      // 2. Xóa các virtual chat cũ nếu cuộc hội thoại cho user đó đã thành real
                      // (Tự động được xử lý nếu ta thay đổi id của selectedChat)

                      return sortConversations(cloned);
                    });
                  }}
                  onUpdateConversationMeta={handleUpdateConversationMeta}
                  onNicknameChange={(id, nickname) => {
                    setConversations(prev =>
                      prev.map(c => c.id === id ? { ...c, nickname: nickname || undefined } : c)
                    );
                  }}
                  refreshTrigger={chatRefreshTrigger}
                  targetMessageId={targetMessageId}
                  onClearTargetMessage={() => setTargetMessageId(null)}
                  onOpenProfile={handleOpenProfile}
                  externalForwardingMsg={externalForwardingMsg}
                  onClearForwardingMsg={() => setExternalForwardingMsg(null)}
                />
                {activeSidebar === 'info' && (
                  <ChatInfoSidebar
                    onClose={() => setActiveSidebar(null)}
                    onOpenDataModal={() => setIsUserDataModalOpen(true)}
                    conversationId={selectedChat.id}
                    isGroup={!!(selectedChat as any).isGroup}
                    isCloud={!!(selectedChat as any).isCloud}
                    isAi={!!(selectedChat as any).isAi}
                    conversationName={(selectedChat as any).name}
                    conversationAvatar={(selectedChat as any).avatar}
                    currentUser={currentUser}
                    onClearChat={() => setChatRefreshTrigger(prev => prev + 1)}
                    refreshTrigger={chatRefreshTrigger}
                    initialIsPinned={!!(selectedChat as any).pinned}
                    groupAvatarUrls={(selectedChat as any).groupAvatarUrls || []}
                    onUpdateMeta={handleUpdateConversationMeta}
                    onTogglePin={handleTogglePin}
                    permissions={(selectedChat as any).permissions}
                    onForward={(item) => setExternalForwardingMsg({
                      id: item.messageId,
                      text: item.content,
                      type: item.messageType,
                      sender: item.senderName || 'Người dùng',
                      caption: item.caption,
                    })}
                    onUpdateMeta={handleUpdateConversationMeta}
                    onTogglePin={handleTogglePin}
                  />
                )}
                {activeSidebar === 'search' && (
                  <div className="w-[340px] border-l border-[var(--border)] bg-[var(--card-bg)] flex flex-col transition-colors duration-200">
                    {/* Header */}
                    <div className="h-[76px] border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0">
                      <h3 className="text-[17px] font-bold">{t('chat.search_panel_title') || 'Tìm kiếm trong trò chuyện'}</h3>
                      <button onClick={() => setActiveSidebar(null)} className="p-1 hover:bg-[var(--hover-bg)] rounded-md cursor-pointer opacity-70">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>

                    {/* Search Content */}
                    <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {/* Search input */}
                      <div className="px-4 pt-4">
                        <div className="flex items-center gap-2 border border-[var(--border)] rounded-md px-3 py-2 bg-[var(--card-bg)] focus-within:border-[#0068FF] transition-all">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          <input
                            type="text"
                            value={sidebarSearchQuery}
                            onChange={(e) => { setSidebarSearchQuery(e.target.value); handleSidebarSearch(e.target.value, sidebarFilterSender, sidebarFilterTime); }}
                            placeholder={t('chat.search_panel_placeholder') || 'Tìm kiếm'}
                            className="flex-1 bg-transparent text-sm outline-none text-[var(--text)] placeholder:text-gray-400"
                          />
                          {sidebarSearchQuery && (
                            <button
                              onClick={() => { setSidebarSearchQuery(''); setSidebarSearchResults([]); setSidebarFilterSender(''); setSidebarFilterTime(''); }}
                              className="text-[13px] text-[#0068FF] font-medium shrink-0 hover:underline"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                        {/* Sender custom dropdown */}
                        {(() => {
                          const senderOptions = [
                            ...(currentUser?.id ? [{ id: currentUser.id, name: 'Bạn', avatar: currentUser.avatarUrl }] : []),
                            ...(selectedChat?.members
                              ?.filter((m: any) => (m.userId || m.user_id) !== currentUser?.id)
                              .map((m: any) => ({
                                id: m.userId || m.user_id,
                                name: m.displayName || m.display_name || m.nickname || m.userId || m.user_id,
                                avatar: m.avatarUrl || m.avatar_url || null,
                              })) ?? []),
                          ];
                          const filteredSenders = senderOptions.filter(o => o.name.toLowerCase().includes(senderSearch.toLowerCase()));
                          const selectedSenderName = senderOptions.find(o => o.id === sidebarFilterSender)?.name;
                          return (
                            <div className="relative flex-1 min-w-0" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setSenderDropdownOpen(false); setSenderSearch(''); } }} tabIndex={-1}>
                              <button
                                type="button"
                                onClick={() => { setSenderDropdownOpen(v => !v); setTimeDropdownOpen(false); }}
                                className={`w-full flex items-center gap-1.5 px-3 py-[6px] rounded-lg text-[12px] font-medium border transition-colors cursor-pointer ${
                                  sidebarFilterSender
                                    ? 'bg-[#e8f0fe] border-[#0068FF] text-[#0068FF]'
                                    : 'bg-[var(--input-bg,#f3f4f6)] border-transparent text-[var(--sub-text)] hover:border-[var(--border)]'
                                }`}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <span className="truncate flex-1 text-left">{selectedSenderName || 'Sender'}</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`shrink-0 transition-transform ${senderDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                              </button>
                              {senderDropdownOpen && (
                                <div className="absolute left-0 top-full mt-1 w-[200px] bg-white dark:bg-[#242526] rounded-xl shadow-xl border border-[var(--border)] z-50 overflow-hidden">
                                  <div className="p-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--input-bg,#f3f4f6)] rounded-lg">
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                      <input
                                        autoFocus
                                        value={senderSearch}
                                        onChange={e => setSenderSearch(e.target.value)}
                                        placeholder="Search"
                                        className="flex-1 text-[12px] bg-transparent outline-none text-[var(--text)] placeholder:text-gray-400"
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-[180px] overflow-y-auto pb-2">
                                    {filteredSenders.map(opt => (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onMouseDown={() => { setSidebarFilterSender(opt.id); setSenderDropdownOpen(false); setSenderSearch(''); handleSidebarSearch(sidebarSearchQuery, opt.id, sidebarFilterTime); }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer hover:bg-[var(--hover-bg,#f3f4f6)] transition-colors ${
                                          sidebarFilterSender === opt.id ? 'text-[#0068FF] font-medium' : 'text-[var(--text)]'
                                        }`}
                                      >
                                        {opt.avatar
                                          ? <img src={opt.avatar} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                                          : <div className="w-7 h-7 rounded-full bg-[#0068FF] flex items-center justify-center text-white text-[11px] font-bold shrink-0">{opt.name.charAt(0).toUpperCase()}</div>
                                        }
                                        <span className="truncate">{opt.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Time custom dropdown */}
                        {(() => {
                          const quickOptions = [
                            { value: 'week', label: 'Last 7 days' },
                            { value: 'month', label: 'Last 30 days' },
                            { value: '3months', label: 'Last 3 months' },
                          ];
                          let timeLabel = 'Time';
                          if (sidebarFilterTime === 'week') timeLabel = 'Last 7 days';
                          else if (sidebarFilterTime === 'month') timeLabel = 'Last 30 days';
                          else if (sidebarFilterTime === '3months') timeLabel = 'Last 3 months';
                          else if (sidebarFilterTime?.startsWith('custom|')) {
                            const parts = sidebarFilterTime.split('|');
                            const fmt = (iso: string) => { const d = new Date(iso); return `${d.getDate()}/${d.getMonth()+1}`; };
                            if (parts[1] && parts[2]) timeLabel = `${fmt(parts[1])} - ${fmt(parts[2])}`;
                          }

                          const cvYear = calendarViewDate.getFullYear();
                          const cvMonth = calendarViewDate.getMonth();
                          const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                          const firstDow = new Date(cvYear, cvMonth, 1).getDay();
                          const daysInMonth = new Date(cvYear, cvMonth + 1, 0).getDate();
                          const prevMonthDays = new Date(cvYear, cvMonth, 0).getDate();
                          const cells: { date: Date; currentMonth: boolean }[] = [];
                          for (let i = firstDow - 1; i >= 0; i--) cells.push({ date: new Date(cvYear, cvMonth - 1, prevMonthDays - i), currentMonth: false });
                          for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(cvYear, cvMonth, d), currentMonth: true });
                          let nd = 1; while (cells.length % 7 !== 0) cells.push({ date: new Date(cvYear, cvMonth + 1, nd++), currentMonth: false });

                          const todayNorm = new Date(); todayNorm.setHours(0,0,0,0);
                          const isSameDay = (a: Date, b: Date | null) => !!b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
                          const effEnd = calendarEndDate || calendarHoverDate;
                          const rStart = calendarStartDate && effEnd ? (calendarStartDate <= effEnd ? calendarStartDate : effEnd) : calendarStartDate;
                          const rEnd   = calendarStartDate && effEnd ? (calendarStartDate <= effEnd ? effEnd : calendarStartDate) : null;

                          const handleDayClick = (date: Date) => {
                            if (!calendarStartDate || (calendarStartDate && calendarEndDate)) {
                              setCalendarStartDate(date); setCalendarEndDate(null);
                            } else {
                              if (date < calendarStartDate) { setCalendarEndDate(calendarStartDate); setCalendarStartDate(date); }
                              else setCalendarEndDate(date);
                            }
                          };
                          const handleConfirm = () => {
                            if (calendarStartDate) {
                              const s = new Date(calendarStartDate); s.setHours(0,0,0,0);
                              const e = calendarEndDate ? new Date(calendarEndDate) : new Date(calendarStartDate); e.setHours(23,59,59,999);
                              const nft = `custom|${s.toISOString()}|${e.toISOString()}`;
                              setSidebarFilterTime(nft); setTimeDropdownOpen(false);
                              handleSidebarSearch(sidebarSearchQuery, sidebarFilterSender, nft);
                            }
                          };
                          const fmtInput = (d: Date | null) => d ? `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}` : '';

                          return (
                            <div className="relative flex-1 min-w-0" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTimeDropdownOpen(false); }} tabIndex={-1}>
                              <button
                                type="button"
                                onClick={() => { setTimeDropdownOpen(v => !v); setSenderDropdownOpen(false); }}
                                className={`w-full flex items-center gap-1.5 px-3 py-[6px] rounded-lg text-[12px] font-medium border transition-colors cursor-pointer ${
                                  sidebarFilterTime ? 'bg-[#e8f0fe] border-[#0068FF] text-[#0068FF]' : 'bg-[var(--input-bg,#f3f4f6)] border-transparent text-[var(--sub-text)] hover:border-[var(--border)]'
                                }`}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                <span className="truncate flex-1 text-left">{timeLabel}</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`shrink-0 transition-transform ${timeDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                              </button>
                              {timeDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1 flex bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-[var(--border)] z-50 overflow-hidden">
                                  {/* Left: quick options */}
                                  <div className="w-[140px] border-r border-[var(--border)] py-2 shrink-0">
                                    {quickOptions.map(opt => (
                                      <button key={opt.value} type="button"
                                        onMouseDown={() => { setSidebarFilterTime(opt.value); setTimeDropdownOpen(false); handleSidebarSearch(sidebarSearchQuery, sidebarFilterSender, opt.value); }}
                                        className={`w-full text-left px-4 py-2.5 text-[13px] cursor-pointer hover:bg-[var(--hover-bg,#f5f5f5)] transition-colors ${
                                          sidebarFilterTime === opt.value ? 'text-[#0068FF] font-semibold' : 'text-[var(--text)]'
                                        }`}
                                      >{t(opt.value === 'week' ? 'chat.search_panel_last_7_days' : opt.value === 'month' ? 'chat.search_panel_last_30_days' : 'chat.search_panel_last_3_months')}</button>
                                    ))}
                                  </div>
                                  {/* Right: calendar */}
                                  <div className="w-[300px] p-4">
                                    {/* Date suggestion */}
                                    {(() => {
                                      const now = new Date();
                                      const startOfWeek = (d: Date) => { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r; };
                                      const endOfWeek   = (d: Date) => { const r = new Date(d); r.setDate(r.getDate() + (6 - r.getDay())); r.setHours(23,59,59,999); return r; };
                                      const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 0,0,0,0);
                                      const endOfMonth   = (d: Date) => new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999);
                                      const dateSuggestions = [
                                        { label: t('chat.search_panel_this_week'),  from: startOfWeek(now), to: endOfWeek(now) },
                                        { label: t('chat.search_panel_last_week'),  from: startOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate()-7)), to: endOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate()-7)) },
                                        { label: t('chat.search_panel_this_month'), from: startOfMonth(now), to: endOfMonth(now) },
                                        { label: t('chat.search_panel_last_month'), from: startOfMonth(new Date(now.getFullYear(), now.getMonth()-1, 1)), to: endOfMonth(new Date(now.getFullYear(), now.getMonth()-1, 1)) },
                                        { label: t('chat.search_panel_this_year'),  from: new Date(now.getFullYear(), 0, 1, 0,0,0,0), to: new Date(now.getFullYear(), 11, 31, 23,59,59,999) },
                                        { label: t('chat.search_panel_last_year'),  from: new Date(now.getFullYear()-1, 0, 1, 0,0,0,0), to: new Date(now.getFullYear()-1, 11, 31, 23,59,59,999) },
                                      ];
                                      const handleSuggEnter = () => { if (dateSuggestionLeaveTimer.current) clearTimeout(dateSuggestionLeaveTimer.current); setDateSuggestionOpen(true); };
                                      const handleSuggLeave = () => { dateSuggestionLeaveTimer.current = setTimeout(() => setDateSuggestionOpen(false), 120); };
                                      return (
                                        <div onMouseEnter={handleSuggEnter} onMouseLeave={handleSuggLeave}>
                                          <button type="button" className="w-full flex items-center justify-between py-1.5 mb-1 text-[13px] cursor-pointer text-[var(--text)] hover:text-[#0068FF] transition-colors">
                                            <span>{t('chat.search_panel_date_suggestion')}</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${dateSuggestionOpen ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"/></svg>
                                          </button>
                                          {dateSuggestionOpen && (
                                            <div className="mb-2 rounded-lg border border-[var(--border)] overflow-hidden">
                                              {dateSuggestions.map(s => (
                                                <button key={s.label} type="button"
                                                  onMouseDown={() => {
                                                    const nft = `custom|${s.from.toISOString()}|${s.to.toISOString()}`;
                                                    setCalendarStartDate(s.from); setCalendarEndDate(s.to);
                                                    setSidebarFilterTime(nft); setTimeDropdownOpen(false); setDateSuggestionOpen(false);
                                                    handleSidebarSearch(sidebarSearchQuery, sidebarFilterSender, nft);
                                                  }}
                                                  className="w-full text-left px-3 py-1.5 text-[13px] cursor-pointer hover:bg-[#f0f4ff] hover:text-[#0068FF] transition-colors text-[var(--text)]"
                                                >{s.label}</button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    <div className="h-px bg-[var(--border)] mb-3" />
                                    <p className="text-[11px] text-[var(--sub-text)] font-semibold uppercase tracking-wide mb-2">{t('chat.search_panel_custom_range')}</p>
                                    {/* Start/End inputs */}
                                    <div className="flex gap-2 mb-4">
                                      <div className={`flex-1 flex items-center gap-1 border rounded-lg px-2 py-1.5 text-[12px] cursor-default ${
                                        calendarStartDate ? 'border-[#0068FF]' : 'border-[var(--border)] text-gray-400'
                                      }`}>
                                        <span className="flex-1 truncate text-[var(--text)]">{fmtInput(calendarStartDate) || t('chat.search_panel_start_date')}</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                      </div>
                                      <div className={`flex-1 flex items-center gap-1 border rounded-lg px-2 py-1.5 text-[12px] cursor-default ${
                                        calendarEndDate ? 'border-[#0068FF]' : 'border-[var(--border)] text-gray-400'
                                      }`}>
                                        <span className="flex-1 truncate text-[var(--text)]">{fmtInput(calendarEndDate) || t('chat.search_panel_end_date')}</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                      </div>
                                    </div>
                                    {/* Month nav */}
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[13px] font-semibold text-[var(--text)]">{monthNames[cvMonth]}, {cvYear}</span>
                                      <div className="flex gap-0.5">
                                        <button type="button" onMouseDown={() => setCalendarViewDate(new Date(cvYear, cvMonth - 1, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--hover-bg,#f5f5f5)] text-[var(--sub-text)] transition-colors">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                                        </button>
                                        <button type="button" onMouseDown={() => setCalendarViewDate(new Date(cvYear, cvMonth + 1, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--hover-bg,#f5f5f5)] text-[var(--sub-text)] transition-colors">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                                        </button>
                                      </div>
                                    </div>
                                    {/* Day headers */}
                                    <div className="grid grid-cols-7 mb-1">
                                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                                        <div key={d} className="text-center text-[11px] text-[var(--sub-text)] font-medium py-1">{d}</div>
                                      ))}
                                    </div>
                                    {/* Day cells */}
                                    <div className="grid grid-cols-7">
                                      {cells.map((cell, idx) => {
                                        const isToday = isSameDay(cell.date, todayNorm);
                                        const isStart = isSameDay(cell.date, rStart ?? null);
                                        const isEnd = isSameDay(cell.date, rEnd);
                                        const inRange = !!rStart && !!rEnd && cell.date > rStart && cell.date < rEnd;
                                        return (
                                          <div key={idx} className="relative flex items-center justify-center h-8">
                                            {inRange && <div className="absolute inset-0 bg-[#deeaff]" />}
                                            {isStart && rEnd && <div className="absolute inset-y-0 left-1/2 right-0 bg-[#deeaff]" />}
                                            {isEnd && <div className="absolute inset-y-0 left-0 right-1/2 bg-[#deeaff]" />}
                                            <button
                                              type="button"
                                              onMouseDown={() => handleDayClick(cell.date)}
                                              onMouseEnter={() => calendarStartDate && !calendarEndDate && setCalendarHoverDate(cell.date)}
                                              onMouseLeave={() => setCalendarHoverDate(null)}
                                              className={[
                                                'relative z-10 w-7 h-7 text-[12px] rounded-full flex items-center justify-center transition-colors select-none cursor-pointer',
                                                !cell.currentMonth ? 'text-gray-300 dark:text-gray-600' : '',
                                                (isStart || isEnd) ? 'bg-[#0068FF] !text-white font-semibold' : '',
                                                isToday && !isStart && !isEnd ? 'border border-[#0068FF] text-[#0068FF] font-medium' : '',
                                                !isStart && !isEnd && cell.currentMonth ? 'hover:bg-[#f0f4ff] text-[var(--text)]' : '',
                                              ].join(' ')}
                                            >{cell.date.getDate()}</button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {/* Actions */}
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                                      <button type="button"
                                        onMouseDown={() => { setTimeDropdownOpen(false); setCalendarStartDate(null); setCalendarEndDate(null); setCalendarHoverDate(null); }}
                                        className="flex-1 py-1.5 rounded-lg text-[13px] cursor-pointer text-[var(--text)] border border-[var(--border)] hover:bg-[var(--hover-bg,#f5f5f5)] transition-colors"
                                      >{t('chat.search_panel_cancel')}</button>
                                      <button type="button"
                                        onMouseDown={handleConfirm}
                                        className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                                          calendarStartDate ? 'bg-[#0068FF] text-white hover:bg-[#005ce0] cursor-pointer' : 'bg-[#c8d8f0] text-white cursor-not-allowed'
                                        }`}
                                      >{t('chat.search_panel_confirm')}</button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {(sidebarSearchQuery.trim() || sidebarFilterSender || sidebarFilterTime) ? (
                        isSidebarSearchLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : sidebarSearchResults.length === 0 ? (
                          <div className="flex flex-col items-center justify-center pt-8 text-center opacity-60 px-4">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-3">
                              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <p className="text-[14px] text-[var(--sub-text)]">{t('chat.search_overlay.no_results') || 'Không tìm thấy kết quả'}</p>
                          </div>
                        ) : (
                          <div className="px-4 pb-4">
                            <p className="text-[13px] font-semibold text-[var(--text)] mt-3 mb-2">
                              Tin nhắn
                            </p>
                            <div>
                              {sidebarSearchResults.map((msg, idx) => {
                                const stripHtml = (html: string) => {
                                  const tmp = document.createElement('div');
                                  tmp.innerHTML = html;
                                  return tmp.textContent || tmp.innerText || '';
                                };
                                let displayContent = msg.content ? stripHtml(msg.content) : '';
                                if (msg.messageType === 'SHARE_CONTACT') {
                                  try { displayContent = `📇 ${JSON.parse(msg.content || '{}').fullName || 'Danh thiếp'}`; } catch { displayContent = '📇 Danh thiếp'; }
                                } else if (msg.messageType === 'IMAGE') { displayContent = '📷 Hình ảnh'; }
                                else if (msg.messageType === 'VIDEO') { displayContent = '🎬 Video'; }
                                else if (msg.messageType === 'VOICE') { displayContent = '🎤 Tin nhắn thoại'; }
                                else if (msg.messageType === 'MEDIA') { displayContent = '📎 Tệp đính kèm'; }
                                else if (msg.messageType === 'STICKER') { displayContent = '😀 Sticker'; }

                                const highlightText = (text: string, query: string) => {
                                  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                  const regex = new RegExp(`(${escaped})`, 'gi');
                                  const parts = text.split(regex);
                                  return parts.map((part, i) =>
                                    regex.test(part)
                                      ? <span key={i} className="text-[#0068FF] font-medium">{part}</span>
                                      : part
                                  );
                                };

                                const initials = msg.senderName?.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase() || '?';

                                return (
                                  <div key={msg.messageId}>
                                    {idx > 0 && <div className="border-t border-[var(--border)]" />}
                                    <div className="py-3 flex items-start gap-3 cursor-pointer hover:bg-[var(--hover-bg)] rounded-lg px-1 transition-colors">
                                      {/* Avatar */}
                                      <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-[#0068FF] flex items-center justify-center text-white text-[13px] font-semibold">
                                        {msg.senderAvatar
                                          ? <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
                                          : initials}
                                      </div>
                                      {/* Content */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-[13px] font-semibold text-[var(--text)] truncate">{msg.senderName}</span>
                                          <span className="text-[11px] text-[var(--sub-text)] shrink-0">
                                            {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                                          </span>
                                        </div>
                                        <p className="text-[13px] text-[var(--sub-text)] line-clamp-2 mt-0.5">
                                          {highlightText(displayContent, sidebarSearchQuery)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )
                      ) : (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center pt-12 text-center opacity-60 px-4">
                          <div className="w-[160px] h-[160px] mb-6 relative">
                            <div className="absolute inset-0 bg-blue-50 dark:bg-blue-500/10 rounded-full blur-2xl"></div>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="1" className="relative z-10 w-full h-full opacity-30">
                              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                          </div>
                          <p className="text-[14px] leading-relaxed text-[var(--sub-text)]">
                            {t('chat.search_panel_hint') || 'Nhập từ khóa để tìm kiếm tin nhắn trong trò chuyện'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[var(--background)] px-10 text-center select-none">
                <div className="max-w-[500px] flex flex-col items-center gap-6">
                  <div className="w-[380px] h-[160px] relative mb-4 opacity-80">
                    <div className="absolute inset-0 bg-blue-50 rounded-full blur-3xl opacity-20 dark:bg-blue-900/10"></div>
                    <img src="/welcome_chat.png" alt="Welcome" className="w-full h-full object-contain relative z-10" />
                  </div>
                  <h2 className="text-[22px] font-bold text-[var(--text)]">
                    Chào mừng đến với <span className="text-[#0068FF]">Fruvia Chat</span>!
                  </h2>
                  <p className="text-[16px] text-[var(--sub-text)] leading-relaxed">
                    Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hóa cho trải nghiệm của bạn.
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-4 w-full">
                    <div className="p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl flex flex-col items-center gap-2 group hover:shadow-md transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-[#0068FF]">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      </div>
                      <span className="text-[14px] font-bold">Kết nối bạn bè</span>
                    </div>
                    <div className="p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl flex flex-col items-center gap-2 group hover:shadow-md transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                      </div>
                      <span className="text-[14px] font-bold">Trò chuyện nhóm</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : activeTab === 'contacts' ? (
            <ContactsContent
              category={contactCategory}
              currentUser={currentUser}
              onSelectUser={handleStartP2PChat}
            />
          ) : activeTab === 'social' ? (
            <SocialFeed user={currentUser} onBack={() => setActiveTab('chat')} />
          ) : (
            <div className="flex-1 bg-[var(--background)] flex items-center justify-center text-[var(--sub-text)]">
              {t('common.coming_soon')}
            </div>
          )}
        </div>
      </div>
    </PresenceProvider>
  );
}

