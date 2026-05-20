import React, { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import Image from 'next/image';
import { SocialSidebarLeft } from './layout/SocialSidebarLeft';
import { OtherUserProfile } from './OtherUserProfile';
import { SocialSidebarRight } from './layout/SocialSidebarRight';
import { SocialFeedMain } from './layout/SocialFeedMain';
import { SocialProfile } from './SocialProfile';
import { SocialEditProfile } from './SocialEditProfile';
import { SocialExplore } from './SocialExplore';
import { SocialArchive } from './SocialArchive';
import { SocialMusicLibrary } from './SocialMusicLibrary';
import { SocialMusicMiniPlayer } from './SocialMusicMiniPlayer';
import { MessengerPopup } from './layout/MessengerPopup';
import { FloatingMessengerSidebar } from './layout/FloatingMessengerSidebar';
import { CreatePostModal } from './layout/CreatePostModal';
import { CreateStoryModal } from './layout/CreateStoryModal';
import { EditPostModal } from './layout/EditPostModal';
import { StoryViewer } from './layout/StoryViewer';
import { SearchPanel } from './layout/SearchPanel';
import { NotificationsPanel } from '@/features/notification/components/NotificationsPanel';
import { useNotificationSocket } from '@/features/notification/hooks/useNotificationSocket';
import { useNotifications } from '@/features/notification/store/NotificationContext';
import { socialApi } from '../api';
import { friendService } from '@/features/friends/services/friendService';
import { messageService } from '@/features/chat/services/messageService';
import { websocketService } from '@/lib/realtime/websocketService';
import { PostResponse, SocialUser, StoryResponse } from '../types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/themes';
import { authService } from '@/features/auth/services/authService';
import { userService } from '@/features/user/services/userService';

interface SocialFeedProps {
  user: SocialUser | null;
  onBack?: () => void;
}

interface ConversationMember {
  userId?: string;
  user_id?: string;
  displayName?: string;
  display_name?: string;
  avatarUrl?: string;
  avatar_url?: string;
}

interface RawConversation {
  conversationType?: string;
  conversation_type?: string;
  conversationName?: string;
  conversation_name?: string;
  conversationAvatarUrl?: string;
  conversation_avatar_url?: string;
  conversationId?: string;
  conversation_id?: string;
  members?: ConversationMember[];
  lastMessage?: string;
  last_message?: string;
  lastMessageContent?: string;
  last_message_content?: string;
  lastMessageTime?: string;
  last_message_time?: string;
  lastSenderId?: string;
  last_sender_id?: string;
  lastMessageSenderId?: string;
  last_message_sender_id?: string;
  lastMessageSenderName?: string;
  last_message_sender_name?: string;
}

interface ConversationEnvelope {
  success?: boolean;
  data?: RawConversation[];
}

interface SocialConversation {
  id: string;
  name: string;
  avatar: string;
  isGroup: boolean;
  isSelf: boolean;
  isAi: boolean;
  members: ConversationMember[];
  lastMessage: string;
  lastSenderId: string;
  lastMessageTime: string;
}

const FRUVIA_CHATBOT_AVATAR = `${process.env.NEXT_PUBLIC_S3_BASE_URL ?? ''}/system/fruvia_chatbot.png`;

export const SocialFeed: React.FC<SocialFeedProps> = ({ user, onBack }) => {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [stories, setStories] = useState<StoryResponse[]>([]);
  const [conversations, setConversations] = useState<SocialConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'feed' | 'profile' | 'explore' | 'edit-profile' | 'archive' | 'music'>('feed');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activePopup, setActivePopup] = useState<SocialConversation | null>(null);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [viewingStoryAuthorId, setViewingStoryAuthorId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<PostResponse | null>(null);
  const [sharingPost, setSharingPost] = useState<PostResponse | null>(null);
  const [currentMusic, setCurrentMusic] = useState<any>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { t } = useTranslation();
  const { currentTheme } = useTheme();

  const currentUserId = user?.id || user?.user_id || '';
  const currentUserName = user?.full_name || user?.display_name || 'Fruvia user';
  const currentUserAvatar = user?.avatar_url || user?.avatarUrl || '/avatar.jpg';

  // Realtime notifications
  useNotificationSocket(currentUserId);
  const { unreadCount: notifUnread } = useNotifications();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const enrichPost = useCallback((post: PostResponse): PostResponse => ({
    ...post,
    authorId: post.authorId || currentUserId,
    authorName: post.authorName || currentUserName,
    authorAvatar: post.authorAvatar || currentUserAvatar,
  }), [currentUserAvatar, currentUserId, currentUserName]);

  const mapConversations = useCallback((data: RawConversation[]): SocialConversation[] => {
    if (!Array.isArray(data)) return [];

    return data.map((conversation) => {
      const members = Array.isArray(conversation.members) ? conversation.members : [];
      const isSelf = conversation.conversationType === 'SELF' || conversation.conversation_type === 'SELF';
      const isGroup = conversation.conversationType === 'GROUP' || conversation.conversation_type === 'GROUP';
      const isPrivate = conversation.conversationType === 'PRIVATE' || conversation.conversation_type === 'PRIVATE';

      const rawName = conversation.conversationName || conversation.conversation_name || '';
      const avatar = conversation.conversationAvatarUrl || conversation.conversation_avatar_url || '';
      const id = conversation.conversationId || conversation.conversation_id || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Robust Cloud detection
      const isActuallyCloud = isSelf || (!isGroup && (rawName === 'Cloud của tôi' || rawName === 'My Documents'));

      let displayName = rawName || (isActuallyCloud ? t('chat.self_cloud') : 'Cuoc tro chuyen');
      let displayAvatar = avatar;

      if (isPrivate && members.length > 0 && !isActuallyCloud) {
        const otherUser = members.find((member) => (
          (member.userId || member.user_id) !== user?.id
          && (member.userId || member.user_id) !== user?.user_id
        ));

        if (otherUser) {
          displayName = otherUser.displayName || otherUser.display_name || displayName;
          displayAvatar = otherUser.avatarUrl || otherUser.avatar_url || displayAvatar;
        }
      }

      if (isActuallyCloud && (displayName === 'Fruvia Chatbot' || rawName === 'Fruvia Chatbot')) {
        displayAvatar = FRUVIA_CHATBOT_AVATAR;
      }

      return {
        id,
        name: displayName,
        avatar: displayAvatar,
        isGroup,
        isSelf: isActuallyCloud,
        isAi: isActuallyCloud && (displayName === 'Fruvia Chatbot' || rawName === 'Fruvia Chatbot'),
        members,
        lastMessage: conversation.lastMessageContent || conversation.last_message_content || conversation.lastMessage || conversation.last_message || (isSelf ? 'Chào chính mình!' : 'Xin chào!'),
        lastSenderId: conversation.lastMessageSenderId || conversation.last_message_sender_id || conversation.lastSenderId || conversation.last_sender_id || '',
        lastMessageTime: conversation.lastMessageTime || conversation.last_message_time || '',
      };
    });
  }, [user?.id, user?.user_id]);

  const fetchData = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);

      // Fetch friends first to get their stories
      const friends = await friendService.getFriends().catch((err) => {
        console.warn('Failed to fetch friends for stories:', err);
        return [];
      });
      const friendIds = Array.isArray(friends) ? friends.map(f => f.userId || f.user_id).filter(Boolean) as string[] : [];

      const [postRes, convRes, storyRes] = await Promise.allSettled([
        socialApi.getRankedFeed(),
        messageService.getConversations(),
        socialApi.getStoryFeed(currentUserId, friendIds),
      ]);

      // Handle Story Results
      if (storyRes.status === 'fulfilled') {
        setStories(storyRes.value);
      }

      // Handle Post Results
      if (postRes.status === 'fulfilled') {
        const data = postRes.value;
        if (data?.content && Array.isArray(data.content)) {
          setPosts(data.content.map(enrichPost));
        } else if (Array.isArray(data)) {
          setPosts((data as any).map(enrichPost));
        }
      }

      // Handle Conversation Results
      if (convRes.status === 'fulfilled') {
        const envelope = convRes.value as ConversationEnvelope | RawConversation[];
        const rawConversations = Array.isArray(envelope)
          ? envelope
          : envelope.success
            ? envelope.data || []
            : (envelope as RawConversation[]);

        setConversations(mapConversations(rawConversations));
      }
    } catch (error) {
      console.error('Critical failure in fetchData:', error);
      // Don't clear posts here to avoid flickering empty states on minor errors
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, enrichPost, mapConversations]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Real-time story updates
  useEffect(() => {
    if (!currentUserId) return;

    const sub = websocketService.subscribeToStoryEvents(currentUserId, (message) => {
      if (message.body === 'NEW_STORY') {
        void fetchData();
      }
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [currentUserId, fetchData]);

  // Real-time conversation updates
  useEffect(() => {
    if (!currentUserId || conversations.length === 0) return;

    const subscriptions: any[] = [];

    conversations.forEach(conv => {
      const sub = websocketService.subscribe(`/topic/chat/${conv.id}`, (msg) => {
        try {
          const raw = JSON.parse(msg.body);
          const newMsg = raw.message || raw;

          // Skip non-message events
          if (newMsg.type && ['REACTION_UPDATE', 'MESSAGE_EDIT', 'MESSAGE_RECALL', 'MESSAGE_PIN', 'MESSAGE_UNPIN'].includes(newMsg.type)) {
            return;
          }

          setConversations(prev => {
            const idx = prev.findIndex(c => String(c.id) === String(conv.id));
            if (idx === -1) return prev;

            const updatedConv = {
              ...prev[idx],
              lastMessage: newMsg.content || prev[idx].lastMessage,
              lastSenderId: newMsg.senderId || prev[idx].lastSenderId,
              lastMessageTime: newMsg.createdAt || new Date().toISOString(),
            };

            const filtered = prev.filter(c => String(c.id) !== String(conv.id));
            return [updatedConv, ...filtered];
          });
        } catch (err) {
          console.error('Failed to parse WS message for conversation update:', err);
        }
      });
      subscriptions.push(sub);
    });

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [conversations.length, currentUserId]); // Only re-subscribe if the number of conversations changes

  const handleOpenPopup = (conversation: SocialConversation | null) => {
    setActivePopup(conversation);
    setIsMessengerOpen(true);
  };

  const handleClosePopup = () => {
    setIsMessengerOpen(false);
    setActivePopup(null);
  };

  const handleCreatePost = async (content: string) => {
    if (!currentUserId) {
      toast.error('Khong xac dinh duoc nguoi dung de dang bai');
      throw new Error('Missing current user id');
    }

    try {
      const newPost = await socialApi.createPost(
        {
          content,
          privacy: 'PUBLIC',
        },
        currentUserId
      );

      setPosts((prev) => [enrichPost(newPost), ...prev]);
      toast.success('Da dang bai viet moi');
    } catch (error) {
      toast.error('Khong the dang bai viet');
      throw error;
    }
  };

  const handleSharePost = async (data: {
    content: string;
    files: File[];
    location?: string;
    altText?: string;
    hideLikes?: boolean;
    turnOffComments?: boolean;
  }) => {
    if (!currentUserId) return;
    try {
      const newPost = await socialApi.createPost(
        {
          content: data.content,
          privacy: 'PUBLIC',
          files: data.files,
          location: data.location,
          altText: data.altText,
          hideLikes: data.hideLikes,
          turnOffComments: data.turnOffComments
        },
        currentUserId
      );
      setPosts((prev) => [enrichPost(newPost), ...prev]);
      setIsCreateModalOpen(false);
      toast.success('Da dang bai viet moi');
    } catch (error) {
      console.error('Error in handleSharePost:', error);
      toast.error('Khong the dang bai viet');
      throw error;
    }
  };

  const handleShareStory = async (data: any) => {
    try {
      await socialApi.createStory({
        file: data.type !== 'TEXT' ? data.content : undefined,
        mediaType: data.type,
        caption: data.type === 'TEXT' ? data.content : undefined,
        background: data.background
      }, currentUserId);

      toast.success(t('social.stories.success_create', 'Đã chia sẻ tin của bạn!'));
      setIsCreateStoryOpen(false);
      fetchData(); // Re-fetch all data including the new story
    } catch (error) {
      console.error('Error sharing story:', error);
      toast.error('Không thể chia sẻ tin. Vui lòng thử lại.');
    }
  };

  const handleStoryViewed = useCallback((storyId: string) => {
    setStories((prev) =>
      prev.map((story) =>
        story.storyId === storyId
          ? { ...story, isViewedByMe: true }
          : story
      )
    );
  }, []);

  const handleStoryDeleted = useCallback((storyId: string) => {
    setStories((prev) => prev.filter((story) => story.storyId !== storyId));
    void fetchData();
  }, [fetchData]);

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.postId === postId);
    if (!post) return;

    try {
      if (post.isLiked) {
        const updatedPost = await socialApi.unlikePost(postId);
        setPosts(prev => prev.map(p => p.postId === postId ? { ...p, ...updatedPost } : p));
      } else {
        const updatedPost = await socialApi.likePost(postId);
        setPosts(prev => prev.map(p => p.postId === postId ? { ...p, ...updatedPost } : p));
      }
    } catch (error) {
      console.error('Failed to like/unlike post:', error);
      toast.error('Khong the thuc hien thao tac');
    }
  };

  const handleReact = async (postId: string, reaction: string) => {
    try {
      const updatedPost = await socialApi.reactToPost(postId, reaction);
      setPosts(prev => prev.map(p => p.postId === postId ? { ...p, ...updatedPost } : p));
    } catch (error) {
      console.error('Failed to react to post:', error);
      toast.error('Khong the thuc hien thao tac');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback redirect if API fails
      window.location.href = '/login';
    }
  };
  const handleAuthorClick = (userId: string) => {
    if (userId && userId !== currentUserId) {
      setViewingUserId(userId);
    } else {
      setView('profile');
    }
  };

  const handleHashtagClick = (tag: string) => {
    setHashtagFilter(tag);
    setView('explore');
  };

  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.postId !== postId));
  };

  const handleEditPost = (post: PostResponse) => {
    setEditingPost(post);
  };

  const handlePostUpdated = (updatedPost: PostResponse) => {
    setPosts(prev => prev.map(p => p.postId === updatedPost.postId ? { ...p, ...updatedPost } : p));
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-black overflow-hidden text-black dark:text-white font-sans relative">
      {/* Other User Profile overlay */}
      {viewingUserId && (
        <div className="absolute inset-0 z-[200] bg-white dark:bg-black overflow-y-auto">
          <OtherUserProfile
            userId={viewingUserId}
            currentUserId={currentUserId}
            onBack={() => setViewingUserId(null)}
            onOpenPost={() => { }}
          />
        </div>
      )}
      {/* Top Right Notifications */}
      <div className="absolute top-6 right-8 z-[60] hidden lg:block">
        <button
          onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer relative group border shadow-sm active:scale-95 ${isNotificationsOpen
              ? 'bg-[#0095F6] text-white border-[#0095F6]'
              : 'bg-gray-50/50 dark:bg-[#1A1A1A]/50 backdrop-blur-md text-black dark:text-white border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-[#262626]'
            }`}
        >
          <Bell size={20} fill={isNotificationsOpen ? "currentColor" : "none"} />
          {!isNotificationsOpen && notifUnread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white dark:border-black">
              {notifUnread > 99 ? '99+' : notifUnread}
            </span>
          )}
          <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
            Thông báo
          </div>
        </button>
      </div>

      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        currentUserId={user?.id}
        variant="dropdown"
      />

      {/* Left Sidebar (Fixed container, Expandable content) */}
      <div className="hidden md:block w-[64px] lg:hover:w-[280px] transition-all duration-300 ease-in-out h-full shrink-0 relative z-50 group/sidebar">
        <SocialSidebarLeft
          user={user}
          onMessagesClick={onBack}
          onProfileClick={() => setView('profile')}
          onHomeClick={() => setView('feed')}
          onExploreClick={() => setView('explore')}
          onCreatePostClick={() => setIsCreateModalOpen(true)}
          onArchiveClick={() => setView('archive')}
          onMyMusicClick={() => setView('music')}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className={`flex-1 h-full overflow-y-auto scrollbar-hide flex ${view === 'explore' ? 'justify-start' : 'justify-center'} lg:pl-[64px]`}>
        <div className={`w-full ${['profile', 'edit-profile', 'archive'].includes(view) ? 'max-w-[1280px]' : (view === 'explore' || view === 'music') ? '' : 'max-w-[1220px]'} flex flex-col lg:flex-row px-4 md:px-8 lg:px-0 justify-between`}>

          {/* Middle Column (Feed or Profile) */}
          <div className={`${view === 'profile' ? 'flex-1 max-w-[935px] pt-4' : (view === 'explore' || view === 'music') ? 'flex-1 w-full pt-0' : ['edit-profile', 'archive'].includes(view) ? 'flex-1 w-full max-w-[1280px] mx-auto lg:px-8 pt-4' : 'w-full lg:max-w-[630px] pt-4'}`}>
            {view === 'feed' ? (
              <div className="max-w-[680px]">
                <SocialFeedMain
                  user={user}
                  posts={posts}
                  stories={stories}
                  isLoading={isLoading}
                  onCreatePost={handleCreatePost}
                  onLike={handleLike}
                  onReact={handleReact}
                  onDelete={handleDeletePost}
                  onEdit={handleEditPost}
                  onShare={(post) => {
                    setSharingPost(post);
                    setIsCreateModalOpen(true);
                  }}
                  onCreateStory={() => setIsCreateStoryOpen(true)}
                  onViewStory={(authorId) => setViewingStoryAuthorId(authorId)}
                  isRanked={true}
                  onAuthorClick={handleAuthorClick}
                  onHashtagClick={handleHashtagClick}
                  onSearchClick={() => setIsSearchOpen(true)}
                />
              </div>
            ) : view === 'profile' ? (
              <SocialProfile
                user={user}
                onEditClick={() => setView('edit-profile')}
                onArchiveClick={() => setView('archive')}
              />
            ) : view === 'edit-profile' ? (
              <SocialEditProfile
                user={user}
                onBack={() => setView('profile')}
                onUpdate={async (data) => {
                  try {
                    console.log('Update profile data:', data);
                    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
                    const payload = {
                      full_name: fullName || undefined,
                      gender: data.gender,
                      bio: data.bio,
                      address: data.address,
                      city: data.city,
                      education: data.education,
                      workplace: data.workplace,
                    };

                    await userService.updateProfile(payload);

                    const response = await userService.getMe();
                    if (response?.data) {
                      const updatedUser = response.data;
                      setUser((prev) => ({
                        ...prev,
                        ...updatedUser,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        bio: data.bio,
                        gender: data.gender,
                        workplace: data.workplace,
                        education: data.education,
                        city: data.city,
                        address: data.address
                      }));
                      localStorage.setItem('user_info', JSON.stringify({
                        ...JSON.parse(localStorage.getItem('user_info') || '{}'),
                        ...updatedUser
                      }));
                    }
                    setView('profile');
                  } catch (error) {
                    console.error('Failed to update profile', error);
                    throw error;
                  }
                }}
              />
            ) : view === 'archive' ? (
              <SocialArchive user={user} onBack={() => setView('profile')} />
            ) : view === 'music' ? (
              <SocialMusicLibrary
                isDark={currentTheme === 'dark'}
                onSongSelect={(song) => {
                  setCurrentMusic(song);
                  setIsMusicPlaying(true);
                }}
              />
            ) : (
              <SocialExplore />
            )}
          </div>

          {/* Right Column (Widgets) */}
          {view === 'feed' && (
            <div className="hidden lg:block w-[380px] pt-10 pl-5 shrink-0 border-l border-gray-100 dark:border-gray-900">
              <SocialSidebarRight
                user={user}
                conversations={conversations}
                onSelectContact={handleOpenPopup}
              />
            </div>
          )}
        </div>
      </div>

      {/* Messenger Popups */}
      {isMessengerOpen && (
        <MessengerPopup
          conversation={activePopup}
          conversations={conversations}
          user={user}
          onClose={handleClosePopup}
        />
      )}

      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <CreatePostModal
          user={user}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSharingPost(null);
          }}
          onShare={handleSharePost}
          sharedPost={sharingPost}
        />
      )}

      {/* Create Story Modal */}
      {isCreateStoryOpen && (
        <CreateStoryModal
          user={user}
          onClose={() => setIsCreateStoryOpen(false)}
          onShare={handleShareStory}
        />
      )}

      {/* Search Panel */}
      <SearchPanel
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectUser={handleAuthorClick}
        onSelectHashtag={handleHashtagClick}
      />

      {/* Story Viewer */}
      {viewingStoryAuthorId && (
        <StoryViewer
          stories={stories}
          initialAuthorId={viewingStoryAuthorId}
          onClose={() => setViewingStoryAuthorId(null)}
          currentUserId={currentUserId}
          onStoryViewed={handleStoryViewed}
          onStoryDeleted={handleStoryDeleted}
        />
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          user={user}
          onClose={() => setEditingPost(null)}
          onUpdated={handlePostUpdated}
        />
      )}

      {/* Floating Messages Bar */}
      <FloatingMessengerSidebar
        conversations={conversations}
        onSelectContact={handleOpenPopup}
      />

      {/* Mini Player */}
      {view !== 'music' && currentMusic && (
        <SocialMusicMiniPlayer
          song={currentMusic}
          isPlaying={isMusicPlaying}
          onTogglePlay={() => setIsMusicPlaying(!isMusicPlaying)}
          onExpand={() => setView('music')}
          isDark={currentTheme === 'dark'}
        />
      )}
    </div>
  );
};
