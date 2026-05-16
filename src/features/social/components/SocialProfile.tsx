import React, { useEffect, useState, useCallback } from 'react';
import { SocialProfileHeader, SocialProfileTabs } from './layout/SocialProfileLayout';
import { useTranslation } from 'react-i18next';
import { socialApi } from '../api';

import { PostResponse } from '../types';
import { Heart, MessageCircle, Play, Grid3x3, Camera } from 'lucide-react';

interface SocialProfileProps {
  user: any;
  posts?: PostResponse[];
  onEditClick?: () => void;
  onArchiveClick?: () => void;
  onPostClick?: (post: PostResponse) => void;
  onDeletePost?: (postId: string) => void;
  onEditPost?: (post: PostResponse) => void;
}

export const SocialProfile: React.FC<SocialProfileProps> = ({ 
  user, 
  posts: externalPosts,
  onEditClick, 
  onArchiveClick,
  onPostClick,
  onDeletePost,
  onEditPost,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('posts');
  const [userPosts, setUserPosts] = useState<PostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.id || user?.user_id || '';

  // Fetch user's posts from API
  const fetchUserPosts = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await socialApi.getUserPosts(userId);
      setUserPosts(response.content || []);
    } catch (error) {
      console.error('Failed to fetch user posts:', error);
      // Fallback to external posts if provided
      if (externalPosts) {
        setUserPosts(externalPosts.filter(p => p.authorId === userId));
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, externalPosts]);

  useEffect(() => {
    fetchUserPosts();
  }, [fetchUserPosts]);

  // Derive stats from real data
  const postCount = userPosts.length;

  // Get grid content based on active tab
  const getGridPosts = () => {
    switch (activeTab) {
      case 'posts':
        return userPosts;
      case 'reels':
        return userPosts.filter(p => p.mediaList?.some(m => m.type === 'VIDEO'));
      default:
        return userPosts;
    }
  };

  const gridPosts = getGridPosts();

  // Get first media of a post for the grid thumbnail
  const getPostThumbnail = (post: PostResponse): string | null => {
    if (post.mediaList && post.mediaList.length > 0) {
      return post.mediaList[0].url;
    }
    return null;
  };

  const isVideoPost = (post: PostResponse): boolean => {
    return post.mediaList?.some(m => m.type === 'VIDEO') || false;
  };

  // Count total reactions
  const getReactionCount = (post: PostResponse): number => {
    if (!post.reactionSummary) return 0;
    return Object.values(post.reactionSummary).reduce((sum: number, count: number) => sum + count, 0);
  };

  return (
    <div className="w-full py-8">
      <div className="max-w-[935px] mx-auto">
        <SocialProfileHeader 
          user={user} 
          postCount={postCount}
          onEditClick={onEditClick} 
          onArchiveClick={onArchiveClick} 
        />
        
        <SocialProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Posts Grid */}
        <div className="mt-1">
          {isLoading ? (
            // Loading skeleton grid
            <div className="grid grid-cols-3 gap-1 md:gap-7">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="relative aspect-square bg-gray-100 dark:bg-gray-900 animate-pulse rounded-sm" />
              ))}
            </div>
          ) : gridPosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 md:gap-7">
              {gridPosts.map((post) => {
                const thumbnail = getPostThumbnail(post);
                const isVideo = isVideoPost(post);
                const reactions = getReactionCount(post);
                
                return (
                  <div
                    key={post.postId}
                    onClick={() => onPostClick?.(post)}
                    className="relative aspect-square cursor-pointer group bg-gray-100 dark:bg-gray-900 overflow-hidden rounded-sm"
                  >
                    {thumbnail ? (
                      isVideo ? (
                        <video 
                          src={thumbnail} 
                          className="w-full h-full object-cover"
                          muted 
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <img
                          src={thumbnail}
                          alt="Post"
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                      )
                    ) : (
                      // Text-only post
                      <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-[#405DE6] to-[#C13584]">
                        <p className="text-white text-sm font-medium text-center line-clamp-4">
                          {post.content}
                        </p>
                      </div>
                    )}

                    {/* Video indicator */}
                    {isVideo && (
                      <div className="absolute top-2 right-2">
                        <Play size={18} className="text-white drop-shadow-lg" fill="white" />
                      </div>
                    )}

                    {/* Multi-image indicator */}
                    {post.mediaList && post.mediaList.length > 1 && (
                      <div className="absolute top-2 right-2">
                        <Grid3x3 size={18} className="text-white drop-shadow-lg" />
                      </div>
                    )}

                    {/* Hover overlay with stats */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 text-white font-bold text-sm">
                      <div className="flex items-center gap-1.5">
                        <Heart size={18} fill="white" />
                        <span>{reactions}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageCircle size={18} fill="white" />
                        <span>{post.commentCount || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Empty state based on tab
            <div className="col-span-3 py-20 flex flex-col items-center justify-center text-gray-500">
              <div className="w-20 h-20 rounded-full border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center mb-4">
                <Camera size={36} className="text-gray-400" />
              </div>
              {activeTab === 'posts' ? (
                <>
                  <p className="text-2xl font-extrabold text-black dark:text-white mb-2">
                    {t('social.profile.share_photos', 'Chia sẻ ảnh')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('social.posts.no_posts')}
                  </p>
                </>
              ) : activeTab === 'saved' ? (
                <>
                  <p className="text-2xl font-extrabold text-black dark:text-white mb-2">
                    {t('social.profile.saved', 'Đã lưu')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('social.profile.no_saved', 'Lưu ảnh và video mà bạn muốn xem lại.')}
                  </p>
                </>
              ) : activeTab === 'tagged' ? (
                <>
                  <p className="text-2xl font-extrabold text-black dark:text-white mb-2">
                    {t('social.profile.tagged', 'Được gắn thẻ')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('social.profile.no_tagged', 'Khi mọi người gắn thẻ bạn trong ảnh, ảnh sẽ xuất hiện ở đây.')}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-black dark:text-white mb-2">
                    {t('social.profile.no_content', 'Chưa có nội dung')}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer spacer */}
      <div className="h-20" />
    </div>
  );
};
