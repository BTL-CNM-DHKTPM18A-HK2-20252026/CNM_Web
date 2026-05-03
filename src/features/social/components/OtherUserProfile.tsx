'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { ArrowLeft, Grid3x3, Play, Heart, MessageCircle, UserPlus, UserCheck, UserX, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { userService } from '@/features/user/services/userService';
import { friendService } from '@/features/friends/services/friendService';
import { socialApi } from '../api';
import { PostResponse } from '../types';
import { toast } from 'sonner';

const S3_BASE = process.env.NEXT_PUBLIC_S3_BASE_URL ?? '';

interface OtherUserProfileProps {
  userId: string;
  currentUserId: string;
  onBack: () => void;
  onOpenPost?: (post: PostResponse) => void;
}

type FriendStatus = 'NONE' | 'PENDING' | 'ACCEPTED' | 'FOLLOWING' | 'BLOCKED';
type ActiveTab = 'posts' | 'reels';

export const OtherUserProfile: React.FC<OtherUserProfileProps> = ({
  userId,
  currentUserId,
  onBack,
  onOpenPost,
}) => {
  const { t } = useTranslation();

  const [profileUser, setProfileUser] = useState<any>(null);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('NONE');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('posts');
  const [friendCount, setFriendCount] = useState(0);
  const [showOptions, setShowOptions] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoadingUser(true);
    try {
      const userData = await userService.getUserById(userId);
      setProfileUser(userData);
      const status = (userData?.friendship_status || userData?.friendshipStatus || 'NONE') as FriendStatus;
      setFriendStatus(status);
    } catch (err) {
      console.error('Failed to load profile:', err);
      toast.error('Không thể tải hồ sơ người dùng');
    } finally {
      setIsLoadingUser(false);
    }
  }, [userId]);

  const loadPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    try {
      const res = await socialApi.getUserPosts(userId);
      setPosts(res.content || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [userId]);

  const loadFriendCount = useCallback(async () => {
    try {
      const friends = await friendService.getFriends();
      // Show friend count for current user proxy; for other user just approximate from posts
      setFriendCount(Array.isArray(friends) ? friends.length : 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadProfile();
    loadPosts();
  }, [loadProfile, loadPosts]);

  const handleSendRequest = async () => {
    setIsActionLoading(true);
    try {
      await friendService.sendRequest(userId);
      setFriendStatus('PENDING');
      toast.success('Đã gửi lời mời kết bạn');
    } catch {
      toast.error('Không thể gửi lời mời kết bạn');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFollow = async () => {
    setIsActionLoading(true);
    try {
      await friendService.followUser(userId);
      setFriendStatus('FOLLOWING');
      toast.success('Đã theo dõi');
    } catch {
      toast.error('Không thể theo dõi');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setIsActionLoading(true);
    try {
      await friendService.unfollowUser(userId);
      setFriendStatus('NONE');
      toast.success('Đã bỏ theo dõi');
    } catch {
      toast.error('Không thể bỏ theo dõi');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    setIsActionLoading(true);
    try {
      await friendService.unfriend(userId);
      setFriendStatus('NONE');
      toast.success('Đã hủy kết bạn');
    } catch {
      toast.error('Không thể hủy kết bạn');
    } finally {
      setIsActionLoading(false);
      setShowOptions(false);
    }
  };

  const gridPosts = activeTab === 'reels'
    ? posts.filter(p => p.mediaList?.some(m => m.type === 'VIDEO'))
    : posts;

  const getPostThumbnail = (post: PostResponse): string | null => {
    if (post.mediaList && post.mediaList.length > 0) {
      const url = post.mediaList[0].url;
      return url.startsWith('http') ? url : `${S3_BASE}${url}`;
    }
    return null;
  };

  const renderFriendButton = () => {
    if (isActionLoading) {
      return (
        <button className="px-6 py-2 bg-gray-200 dark:bg-[#363636] rounded-lg text-sm font-semibold opacity-60 cursor-not-allowed">
          <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
        </button>
      );
    }

    switch (friendStatus) {
      case 'ACCEPTED':
        return (
          <div className="relative">
            <button
              onClick={() => setShowOptions(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] rounded-lg text-sm font-semibold text-black dark:text-white transition-colors"
            >
              <UserCheck size={16} />
              Bạn bè
              <MoreHorizontal size={14} />
            </button>
            {showOptions && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#262626] border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[160px]">
                <button
                  onClick={handleUnfriend}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-[#363636] text-red-500 transition-colors"
                >
                  <UserX size={14} />
                  Hủy kết bạn
                </button>
              </div>
            )}
          </div>
        );
      case 'PENDING':
        return (
          <button
            onClick={handleUnfriend}
            className="flex items-center gap-2 px-4 py-2 bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] rounded-lg text-sm font-semibold text-black dark:text-white transition-colors"
          >
            <UserX size={16} />
            Hủy lời mời
          </button>
        );
      case 'FOLLOWING':
        return (
          <button
            onClick={handleUnfollow}
            className="flex items-center gap-2 px-4 py-2 bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] rounded-lg text-sm font-semibold text-black dark:text-white transition-colors"
          >
            <UserCheck size={16} />
            Đang theo dõi
          </button>
        );
      default:
        return (
          <button
            onClick={handleSendRequest}
            className="flex items-center gap-2 px-4 py-2 bg-[#0095F6] hover:bg-[#1877F2] rounded-lg text-sm font-semibold text-white transition-colors"
          >
            <UserPlus size={16} />
            Thêm bạn
          </button>
        );
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="w-8 h-8 border-2 border-[#0095F6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
        <p className="text-gray-500">Không tìm thấy người dùng</p>
        <button onClick={onBack} className="text-[#0095F6] text-sm font-semibold">Quay lại</button>
      </div>
    );
  }

  const avatarSrc = profileUser.avatar_url || profileUser.avatarUrl || '/avatar.jpg';

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 max-w-[935px] mx-auto pt-4 pb-10">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white mb-6 hover:opacity-70 transition-opacity"
      >
        <ArrowLeft size={20} />
        Quay lại
      </button>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-20 mb-10">
        {/* Avatar */}
        <div className="flex justify-center md:block">
          <div className="w-20 h-20 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-gray-100 dark:border-gray-800 shrink-0">
            <Image
              src={avatarSrc}
              alt={profileUser.display_name || profileUser.full_name || 'User'}
              width={144}
              height={144}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Row 1: name + buttons */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
            <h2 className="text-xl font-normal text-black dark:text-white">
              {profileUser.display_name || profileUser.full_name || 'User'}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {renderFriendButton()}
              <button
                onClick={handleFollow}
                className="px-4 py-2 bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] rounded-lg text-sm font-semibold text-black dark:text-white transition-colors"
              >
                Theo dõi
              </button>
            </div>
          </div>

          {/* Row 2: Stats */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-1">
              <span className="font-bold text-black dark:text-white">{posts.length}</span>
              <span className="text-black dark:text-white">bài viết</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-black dark:text-white">—</span>
              <span className="text-black dark:text-white">người theo dõi</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-black dark:text-white">—</span>
              <span className="text-black dark:text-white">đang theo dõi</span>
            </div>
          </div>

          {/* Row 3: Bio */}
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-black dark:text-white">
              {profileUser.full_name || profileUser.display_name || 'User'}
            </span>
            {profileUser.bio && (
              <p className="text-sm text-black dark:text-white mt-1 whitespace-pre-line">{profileUser.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-gray-200 dark:border-gray-800 mb-4">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-1.5 px-6 py-3 text-xs font-bold tracking-widest uppercase transition-all border-t-2 -mt-px ${
            activeTab === 'posts'
              ? 'border-black dark:border-white text-black dark:text-white'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Grid3x3 size={14} />
          Bài viết
        </button>
        <button
          onClick={() => setActiveTab('reels')}
          className={`flex items-center gap-1.5 px-6 py-3 text-xs font-bold tracking-widest uppercase transition-all border-t-2 -mt-px ${
            activeTab === 'reels'
              ? 'border-black dark:border-white text-black dark:text-white'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Play size={14} />
          Reels
        </button>
      </div>

      {/* Post Grid */}
      {isLoadingPosts ? (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 animate-pulse rounded-sm" />
          ))}
        </div>
      ) : gridPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-full border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center">
            {activeTab === 'reels' ? <Play size={24} className="text-gray-400" /> : <Grid3x3 size={24} className="text-gray-400" />}
          </div>
          <p className="text-gray-500 text-sm">
            {activeTab === 'reels' ? 'Chưa có Reels' : 'Chưa có bài viết'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {gridPosts.map((post) => {
            const thumb = getPostThumbnail(post);
            const hasVideo = post.mediaList?.some(m => m.type === 'VIDEO');
            return (
              <div
                key={post.postId}
                className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-800"
                onClick={() => onOpenPost?.(post)}
              >
                {thumb ? (
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                    <span className="text-gray-400 text-xs text-center px-2 line-clamp-4">{post.content}</span>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1 text-white font-semibold text-sm">
                    <Heart size={16} fill="white" />
                    {post.likeCount}
                  </div>
                  <div className="flex items-center gap-1 text-white font-semibold text-sm">
                    <MessageCircle size={16} fill="white" />
                    {post.commentCount}
                  </div>
                </div>
                {hasVideo && (
                  <div className="absolute top-2 right-2 text-white">
                    <Play size={14} fill="white" />
                  </div>
                )}
                {post.mediaList && post.mediaList.length > 1 && (
                  <div className="absolute top-2 right-2 text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M2 6h2v14h14v2H2zM6 2h16v16H6z"/></svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
