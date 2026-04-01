import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Sidebar } from './Sidebar';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { ChatInfoSidebar } from './ChatInfoSidebar';
import { SettingsModal } from './SettingsModal';
import { ProfileModal } from './ProfileModal';
import { ContactList } from './ContactList';
import { ContactsContent } from './ContactsContent';
import { AddFriendModal } from './AddFriendModal';
import { CreateGroupModal } from './CreateGroupModal';
import { UserDataModal } from './UserDataModal';
import { apiClient } from '@/services/api';
import { websocketService } from '@/services/websocketService';
import { friendService } from '@/services/friendService';
import { PresenceProvider } from '@/components/providers/PresenceProvider';

interface ChatDashboardProps {
  onLogout: () => void;
  userName?: string;
}

export function ChatDashboard({ onLogout, userName }: ChatDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('chat');
  const [contactCategory, setContactCategory] = useState('friends');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isUserDataModalOpen, setIsUserDataModalOpen] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<'info' | 'search' | null>('info');

  // Sidebar search state (search within current conversation)
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [sidebarSearchResults, setSidebarSearchResults] = useState<{ messageId: string; senderId: string; senderName: string; content: string; messageType: string; createdAt: string }[]>([]);
  const [isSidebarSearchLoading, setIsSidebarSearchLoading] = useState(false);
  const sidebarSearchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const hasToasted = React.useRef(false);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get('/users/me');
      const data = (response && response.success && response.data) ? response.data : response;

      if (data && (data.id || data.full_name || data.phone_number)) {
        setCurrentUser(data);

        const token = localStorage.getItem('accessToken');
        if (token) {
          websocketService.connect(token);
        }
      }
    } catch (error: any) {
      if (error.message?.includes("Không tìm thấy người dùng") || error.message?.includes("User not found")) {
        onLogout();
      }
    }
  };

  useEffect(() => {
    fetchUserProfile();
    return () => {
      websocketService.disconnect();
    };
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
  const [selectedChatId, setSelectedChatId] = useState<string | number>('');
  const [isConversationsLoaded, setIsConversationsLoaded] = useState(false);
  const selectedChat = conversations.find(c => c.id === selectedChatId) || conversations[0];
  const [invitationCount, setInvitationCount] = useState(0);

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
          content: normalizedContent,
          messageType: doc.messageType,
          createdAt: doc.createdAt,
        };
      })
      .filter(Boolean);
  };

  const ensureSelfConversation = useCallback(async () => {
    try {
      const res = await apiClient.get('/conversations/self');
      const data = (res && res.success && res.data) ? res.data : res;
      return data?.conversationId || data?.conversation_id || null;
    } catch (error) {
      console.error("Failed to get/create self chat:", error);
      return null;
    }
  }, []);

  const ensureAiConversation = useCallback(async () => {
    try {
      const res = await apiClient.get('/messages/ai/conversation');
      const data = (res && res.success && res.data) ? res.data : res;
      return data?.conversationId || data?.conversation_id || null;
    } catch (error) {
      console.error("Failed to get/create AI chat:", error);
      return null;
    }
  }, []);

  const handleSidebarSearch = useCallback((value: string) => {
    setSidebarSearchQuery(value);
    if (sidebarSearchTimerRef.current) clearTimeout(sidebarSearchTimerRef.current);

    if (!value.trim() || !selectedChat?.id) {
      setSidebarSearchResults([]);
      setIsSidebarSearchLoading(false);
      return;
    }

    setIsSidebarSearchLoading(true);
    sidebarSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/search/messages?q=${encodeURIComponent(value.trim())}&conversationId=${selectedChat.id}&size=20`);
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

      return parseDateToMillis(b.lastMessageAt) - parseDateToMillis(a.lastMessageAt);
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
      const res = await apiClient.get('/conversations');
      const data = (res && res.success && res.data) ? res.data : res;
      if (Array.isArray(data)) {
        const mapped = data.map((c: any) => {
          const isSelf = c.conversationType === 'SELF' || c.conversation_type === 'SELF';
          const rawName = c.conversationName || c.conversation_name || '';
          const isAi = isSelf && rawName.trim().toLowerCase() === 'fruvia ai';
          const isCloud = isSelf && !isAi;
          const name = isAi
            ? t('chat.ai_name')
            : (rawName || (isCloud ? t('chat.self_cloud') : 'Conversation'));
          const id = c.conversationId || c.conversation_id;
          const avatar = c.conversationAvatarUrl || c.conversation_avatar_url || '';

          let displayName = name;
          let displayAvatar = avatar;

          if ((c.conversationType === 'PRIVATE' || c.conversation_type === 'PRIVATE') && c.members) {
            const otherUser = c.members.find((m: any) => m.userId !== currentUser?.id && m.user_id !== currentUser?.id);
            if (otherUser) {
              displayName = otherUser.displayName || otherUser.display_name || displayName;
              displayAvatar = otherUser.avatarUrl || otherUser.avatar_url || displayAvatar;
            }
          }

          // Lấy userId của người chat cùng (dùng cho presence indicator)
          let otherUserId = '';
          let myNickname = '';
          if ((c.conversationType === 'PRIVATE' || c.conversation_type === 'PRIVATE') && c.members) {
            const other = c.members.find((m: any) => (m.userId || m.user_id) !== currentUser?.id);
            if (other) otherUserId = other.userId || other.user_id || '';
            const me = c.members.find((m: any) => (m.userId || m.user_id) === currentUser?.id);
            if (me) myNickname = me.nickname || '';
          }

          return {
            id,
            name: displayName,
            lastMsg: c.lastMessageContent
              || c.last_message_content
              || (isAi ? t('chat.ai_subheading') : t('chat.start_conversation')),
            time: (c.lastMessageTime || c.last_message_time) ? new Date(c.lastMessageTime || c.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            lastMessageAt: c.lastMessageTime || c.last_message_time || null,
            isCloud,
            isAi,
            isGroup: (c.conversationType === 'GROUP' || c.conversation_type === 'GROUP'),
            avatar: displayAvatar,
            pinned: c.isPinned || c.is_pinned || false,
            pinnedAt: c.pinnedAt || c.pinned_at || null,
            unreadCount: c.unreadCount || c.unread_count || 0,
            otherUserId,
            nickname: myNickname || undefined,
            conversationTag: c.conversationTag || c.conversation_tag || undefined,
            conversationStatus: c.conversationStatus || c.conversation_status || 'NORMAL',
            isRequest: (c.conversationStatus || c.conversation_status) === 'PENDING',
            mutedUntil: c.mutedUntil || c.muted_until || null,
            isMarkedUnread: c.isMarkedUnread || c.is_marked_unread || false,
            autoDeleteDuration: c.autoDeleteDuration || c.auto_delete_duration || null,
          };
        });
        const sorted = sortConversations(mapped);
        setConversations(sorted);

        if (sorted.length > 0 && !selectedChatId) {
          setSelectedChatId(sorted[0].id);
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
          } else {
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

  return (
    <PresenceProvider currentUserId={currentUser?.id || null}>
      <div className="flex h-screen w-full bg-[var(--card-bg)] overflow-hidden text-[var(--text)] transition-colors duration-200">
        {/* Modals */}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />

        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdate={fetchUserProfile}
        />

        <AddFriendModal
          isOpen={isAddFriendModalOpen}
          onClose={() => setIsAddFriendModalOpen(false)}
          currentUserName={currentUser?.full_name || userName}
          currentUserId={currentUser?.id}
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

        {/* 1. LEFT SIDEBAR */}
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

        {/* 2. MIDDLE LIST */}
        {activeTab === 'chat' ? (
          <ConversationList
            conversations={conversations.map(c => ({ ...c, active: c.id === selectedChatId }))}
            onAddFriend={() => setIsAddFriendModalOpen(true)}
            onCreateGroup={() => setIsCreateGroupModalOpen(true)}
            onSelectConversation={(id) => {
              setSelectedChatId(id);
              // Auto-clear "marked unread" when opening conversation
              const conv = conversations.find(c => c.id === id);
              if (conv?.isMarkedUnread) {
                apiClient.post(`/conversations/${id}/mark-unread`, {}).catch(() => {});
                setConversations(prev =>
                  prev.map(c => c.id === id ? { ...c, isMarkedUnread: false } : c)
                );
              }
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
            onAutoDeleteConversation={(id, duration) => {
              setConversations(prev =>
                prev.map(c => c.id === id ? { ...c, autoDeleteDuration: duration } : c)
              );
            }}
            onUnhideConversation={() => {
              fetchConversations();
            }}
          />
        ) : activeTab === 'contacts' ? (
          <ContactList
            selectedCategory={contactCategory}
            onSelectCategory={setContactCategory}
            onAddFriend={() => setIsAddFriendModalOpen(true)}
            onCreateGroup={() => setIsCreateGroupModalOpen(true)}
          />
        ) : (
          <div className="w-[340px] border-r border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-center text-gray-400">
            {t('common.coming_soon')}
          </div>
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
                  onNicknameChange={(id, nickname) => {
                    setConversations(prev =>
                      prev.map(c => c.id === id ? { ...c, nickname: nickname || undefined } : c)
                    );
                  }}
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
                  />
                )}
                {activeSidebar === 'search' && (
                  <div className="w-[340px] border-l border-[var(--border)] bg-[var(--card-bg)] flex flex-col transition-colors duration-200">
                    {/* Search Sidebar UI Header */}
                    <div className="h-[64px] border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0">
                      <h3 className="text-[17px] font-bold">{t('chat.search_panel_title') || 'Tìm kiếm trong trò chuyện'}</h3>
                      <button onClick={() => setActiveSidebar(null)} className="p-1 hover:bg-[var(--hover-bg)] rounded-md cursor-pointer opacity-70">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>

                    {/* Search Content */}
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                      <div className="relative mb-4">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        <input
                          type="text"
                          value={sidebarSearchQuery}
                          onChange={(e) => handleSidebarSearch(e.target.value)}
                          placeholder={t('chat.search_panel_placeholder') || 'Nhập từ khóa để tìm kiếm'}
                          className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#0068FF] transition-all"
                        />
                      </div>

                      {sidebarSearchQuery.trim() ? (
                        /* Search Results */
                        isSidebarSearchLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : sidebarSearchResults.length === 0 ? (
                          <div className="flex flex-col items-center justify-center pt-8 text-center opacity-60">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-3">
                              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <p className="text-[14px] text-[var(--sub-text)]">{t('chat.search_overlay.no_results') || 'Không tìm thấy kết quả'}</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-[13px] text-[var(--sub-text)] mb-3">
                              {t('chat.search_panel_found', { count: sidebarSearchResults.length }) || `Tìm thấy ${sidebarSearchResults.length} kết quả`}
                            </p>
                            {sidebarSearchResults.map(msg => (
                              <div
                                key={msg.messageId}
                                className="p-3 hover:bg-[var(--hover-bg)] rounded-lg cursor-pointer transition-colors border border-transparent hover:border-[var(--border)]"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[13px] font-medium text-[var(--text)]">{msg.senderName}</span>
                                  <span className="text-[11px] text-[var(--sub-text)]">
                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                                  </span>
                                </div>
                                <p className="text-[13px] text-[var(--sub-text)] line-clamp-2">{msg.content}</p>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center pt-12 text-center opacity-60">
                          <div className="w-[180px] h-[180px] mb-6 relative">
                            <div className="absolute inset-0 bg-blue-50 dark:bg-blue-500/10 rounded-full blur-2xl"></div>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="1" className="relative z-10 w-full h-full opacity-30">
                              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              <path d="M9 10h4M9 14h6" opacity="0.5" />
                            </svg>
                          </div>
                          <p className="text-[14px] leading-relaxed text-[var(--sub-text)]">
                            {t('chat.search_panel_hint') || 'Hãy nhập từ khóa để bắt đầu tìm kiếm tin nhắn và file trong trò chuyện'}
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
