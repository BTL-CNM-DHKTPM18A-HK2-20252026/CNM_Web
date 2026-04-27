import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { SocialSidebarLeft } from './layout/SocialSidebarLeft';
import { SocialSidebarRight } from './layout/SocialSidebarRight';
import { SocialFeedMain } from './layout/SocialFeedMain';
import { SocialProfile } from './SocialProfile';
import { SocialExplore } from './SocialExplore';
import { MessengerPopup } from './layout/MessengerPopup';
import { FloatingMessengerSidebar } from './layout/FloatingMessengerSidebar';
import { CreatePostModal } from './layout/CreatePostModal';
import { CreateStoryModal } from './layout/CreateStoryModal';
import { socialApi } from '../api';
import { messageService } from '@/features/chat/services/messageService';
import { websocketService } from '@/lib/realtime/websocketService';
import { PostResponse, SocialUser } from '../types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/themes';
import { authService } from '@/features/auth/services/authService';

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


export const SocialFeed: React.FC<SocialFeedProps> = ({ user, onBack }) => {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [stories, setStories] = useState<StoryResponse[]>([]);
  const [conversations, setConversations] = useState<SocialConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'feed' | 'profile' | 'explore'>('feed');
  const [activePopup, setActivePopup] = useState<SocialConversation | null>(null);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const { t } = useTranslation();
  const { currentTheme } = useTheme();

  const currentUserId = user?.id || user?.user_id || '';
  const currentUserName = user?.full_name || user?.display_name || 'Fruvia user';
  const currentUserAvatar = user?.avatar_url || user?.avatarUrl || '/avatar.jpg';

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

      let displayName = rawName || 'Cuoc tro chuyen';
      let displayAvatar = avatar;

      if (isPrivate && members.length > 0) {
        const otherUser = members.find((member) => (
          (member.userId || member.user_id) !== user?.id
          && (member.userId || member.user_id) !== user?.user_id
        ));

        if (otherUser) {
          displayName = otherUser.displayName || otherUser.display_name || displayName;
          displayAvatar = otherUser.avatarUrl || otherUser.avatar_url || displayAvatar;
        }
      }

      return {
        id,
        name: displayName,
        avatar: displayAvatar,
        isGroup,
        isSelf,
        isAi: isSelf && (displayName === 'Fruvia AI' || rawName === 'Fruvia AI'),
        members,
        lastMessage: conversation.lastMessageContent || conversation.last_message_content || conversation.lastMessage || conversation.last_message || (isSelf ? 'Chào chính mình!' : 'Xin chào!'),
        lastSenderId: conversation.lastMessageSenderId || conversation.last_message_sender_id || conversation.lastSenderId || conversation.last_sender_id || '',
        lastMessageTime: conversation.lastMessageTime || conversation.last_message_time || '',
      };
    });
  }, [user?.id, user?.user_id]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [postRes, convRes, storyRes] = await Promise.all([
        socialApi.getFeed(),
        messageService.getConversations(),
        socialApi.getStoryFeed(currentUserId, []),
      ]);
      
      setStories(storyRes);

      if (postRes?.content?.length > 0) {
        setPosts(postRes.content.map(enrichPost));
      } else {
        setPosts([]);
      }

      const envelope = convRes as ConversationEnvelope | RawConversation[];
      const rawConversations = Array.isArray(envelope)
        ? envelope
        : envelope.success
          ? envelope.data || []
          : (envelope as RawConversation[]);

      setConversations(mapConversations(rawConversations));
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [enrichPost, mapConversations]);

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

  return (
    <div className="flex h-screen w-full bg-white dark:bg-black overflow-hidden text-black dark:text-white font-sans relative">
      {/* Left Sidebar (Fixed container, Expandable content) */}
      <div className="hidden md:block w-[64px] lg:hover:w-[280px] transition-all duration-300 ease-in-out h-full shrink-0 relative z-50 group/sidebar">
        <SocialSidebarLeft
          user={user}
          onMessagesClick={onBack}
          onProfileClick={() => setView('profile')}
          onHomeClick={() => setView('feed')}
          onExploreClick={() => setView('explore')}
          onCreatePostClick={() => setIsCreateModalOpen(true)}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 h-full overflow-y-auto scrollbar-hide flex justify-center lg:pl-[64px]">
        <div className={`w-full ${view === 'profile' ? 'max-w-[1280px]' : 'max-w-[1150px]'} flex flex-col lg:flex-row px-4 md:px-8 lg:px-0 justify-between`}>

          {/* Middle Column (Feed or Profile) */}
          <div className={`${view === 'profile' || view === 'explore' ? 'flex-1 max-w-[935px]' : 'w-full lg:max-w-[630px]'} pt-4`}>
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
                  onCreateStory={() => setIsCreateStoryOpen(true)}
                />
              </div>
            ) : view === 'profile' ? (
              <SocialProfile user={user} />
            ) : (
              <SocialExplore />
            )}
          </div>

          {/* Right Column (Widgets) */}
          <div className="hidden lg:block w-[320px] pt-10 pl-10 shrink-0">
            {view === 'feed' ? (
              <SocialSidebarRight
                user={user}
                conversations={conversations}
                onSelectContact={handleOpenPopup}
              />
            ) : null}
          </div>
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
          onClose={() => setIsCreateModalOpen(false)} 
          onShare={handleSharePost}
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

      {/* Floating Messages Bar */}
      <FloatingMessengerSidebar
        conversations={conversations}
        onSelectContact={handleOpenPopup}
      />
    </div>
  );
};
