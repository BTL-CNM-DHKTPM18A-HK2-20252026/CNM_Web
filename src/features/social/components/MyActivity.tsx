import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { socialApi } from '../api';
import { PostResponse, SocialUser } from '../types';
import { PostCard } from './PostCard';
import { CreatePost } from './CreatePost';
import { toast } from 'sonner';
import { ChevronLeftIcon } from '@/components/ui/Icons';

interface MyActivityProps {
  user: SocialUser | null;
  onBack?: () => void;
}

export const MyActivity: React.FC<MyActivityProps> = ({ user, onBack }) => {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserId = user?.user_id || user?.id || '';
  const currentUserName = user?.full_name || user?.display_name || 'Fruvia user';
  const currentUserAvatar = user?.avatar_url || user?.avatarUrl || '/avatar.jpg';

  const enrichPost = useCallback((post: PostResponse): PostResponse => ({
    ...post,
    authorId: post.authorId || currentUserId,
    authorName: post.authorName || currentUserName,
    authorAvatar: post.authorAvatar || currentUserAvatar,
  }), [currentUserAvatar, currentUserId, currentUserName]);

  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!currentUserId) return;
      try {
        setIsLoading(true);
        const response = await socialApi.getUserPosts(currentUserId);
        setPosts((response.content || []).map(enrichPost));
      } catch (error) {
        console.error('Failed to fetch user posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyPosts();
  }, [currentUserId, enrichPost]);

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.postId === postId);
    if (!post) return;

    try {
      if (post.isLiked) {
        await socialApi.unlikePost(postId);
        setPosts(prev => prev.map(p => 
          p.postId === postId 
            ? { ...p, isLiked: false, likeCount: Math.max(0, p.likeCount - 1), currentUserReaction: undefined } 
            : p
        ));
      } else {
        await socialApi.likePost(postId);
        setPosts(prev => prev.map(p => 
          p.postId === postId 
            ? { ...p, isLiked: true, likeCount: p.likeCount + 1, currentUserReaction: 'LIKE' } 
            : p
        ));
      }
    } catch (error) {
      console.error('Failed to like/unlike post:', error);
      toast.error('Không thể thực hiện thao tác');
    }
  };

  const handleReact = async (postId: string, reaction: string) => {
    try {
      await socialApi.reactToPost(postId, reaction);
      
      setPosts(prev => prev.map(p => {
        if (p.postId !== postId) return p;
        
        const wasLiked = p.isLiked;
        const isTogglingOff = p.currentUserReaction === reaction;
        
        return {
          ...p,
          isLiked: isTogglingOff ? false : true,
          currentUserReaction: isTogglingOff ? undefined : reaction,
          likeCount: isTogglingOff ? Math.max(0, p.likeCount - 1) : (wasLiked ? p.likeCount : p.likeCount + 1)
        };
      }));
    } catch (error) {
      console.error('Failed to react to post:', error);
      toast.error('Không thể thực hiện thao tác');
    }
  };

  const handleCreatePost = async (content: string) => {
    try {
      const newPost = await socialApi.createPost({
        content,
        privacy: 'PUBLIC'
      }, currentUserId);
      setPosts(prev => [enrichPost(newPost), ...prev]);
      toast.success('Đã đăng bài viết mới!');
    } catch (error) {
      toast.error('Không thể đăng bài viết');
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-full border-r border-[var(--border)] bg-[var(--background)] overflow-y-auto custom-scrollbar">
      {/* Profile Header */}
      <div className="p-6 bg-[var(--card-bg)] border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden relative border-2 border-[#0068FF]">
              <Image
                src={user?.avatar_url || "/avatar.jpg"}
                fill
                alt="Avatar"
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">{user?.full_name || 'Người dùng'}</h2>
              <p className="text-sm text-[var(--sub-text)]">@{user?.phone_number || 'fruvia_user'}</p>
            </div>
          </div>
          
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 hover:bg-[var(--hover-bg)] rounded-full transition-all text-[#0068FF] group"
              title="Quay lại Tin nhắn"
            >
              <div className="flex items-center gap-1">
                <ChevronLeftIcon size={20} />
                <span className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">Chat</span>
              </div>
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-[var(--border)]/50 mt-4">
          <div className="text-center">
            <div className="font-bold text-[var(--text)]">{posts.length}</div>
            <div className="text-[11px] text-[var(--sub-text)] uppercase tracking-wider">Bài viết</div>
          </div>
          <div className="text-center border-x border-[var(--border)]/50">
            <div className="font-bold text-[var(--text)]">0</div>
            <div className="text-[11px] text-[var(--sub-text)] uppercase tracking-wider">Bạn bè</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-[var(--text)]">0</div>
            <div className="text-[11px] text-[var(--sub-text)] uppercase tracking-wider">Theo dõi</div>
          </div>
        </div>
      </div>

      {/* Post Creation & List */}
      <div className="p-4 flex flex-col gap-4">
        <CreatePost user={user} onSubmit={handleCreatePost} />
        
        <h3 className="text-[15px] font-bold text-[var(--text)] px-1">Hoạt động gần đây</h3>
        
        {isLoading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            {[1, 2].map(i => (
              <div key={i} className="h-40 bg-[var(--card-bg)] rounded-xl border border-[var(--border)]" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="p-10 text-center bg-[var(--card-bg)] rounded-xl border border-dashed border-[var(--border)]">
            <p className="text-[13px] text-[var(--sub-text)]">Bạn chưa có hoạt động nào.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map(post => (
              <PostCard 
                key={post.postId} 
                post={post} 
                onLike={handleLike}
                onReact={handleReact}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
