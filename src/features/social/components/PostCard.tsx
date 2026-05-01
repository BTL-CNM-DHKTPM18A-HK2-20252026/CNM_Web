import React, { useState } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { 
  HeartIcon, 
  MessageCircleIcon, 
  SendIcon, 
  MoreHorizontalIcon,
  BookmarkIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon
} from '@/components/ui/Icons';
import { PostResponse } from '../types';
import { useTranslation } from 'react-i18next';
import { enUS, vi as viLocale } from 'date-fns/locale';
import { Modal, Image as AntImage } from 'antd';
import { CommentModal } from './CommentModal';
import { useTheme } from '@/themes';
import { PostOptionsDropdown } from './PostOptionsDropdown';
import { toast } from 'sonner';
import { SocialUser } from '../types';

interface PostCardProps {
  post: PostResponse;
  onLike?: (postId: string) => void;
  onReact?: (postId: string, reaction: string) => void;
  onComment?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (post: PostResponse) => void;
  onShareClick?: (post: PostResponse) => void;
  currentUser?: SocialUser | null;
}
export const PostCard: React.FC<PostCardProps> = ({ post, onLike, onReact, onComment, onDelete, onEdit, onShareClick, currentUser }) => {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [previewVisible, setPreviewVisible] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  
  // Separate states for Video Preview
  const [videoPreviewVisible, setVideoPreviewVisible] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(post.isSaved || false);

  // Reaction Picker states
  const [showReactions, setShowReactions] = useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const mediaItems = post.mediaList || [];
  const imagesOnly = mediaItems.filter(item => item.type?.toUpperCase() !== 'VIDEO');
  const videosOnly = mediaItems.filter(item => item.type?.toUpperCase() === 'VIDEO');
  
  const currentLocale = i18n.language === 'vi' ? viLocale : enUS;

  // Helper to get reaction icon/text
  const getReactionDisplay = () => {
    if (!post.currentUserReaction) return null;
    
    const reactionConfig: Record<string, { emoji: string; color: string; labelKey: string }> = {
      LIKE: { emoji: '👍', color: 'text-[#0095F6]', labelKey: 'social.posts.reactions.LIKE' },
      LOVE: { emoji: '❤️', color: 'text-red-500', labelKey: 'social.posts.reactions.LOVE' },
      HAHA: { emoji: '😂', color: 'text-yellow-500', labelKey: 'social.posts.reactions.HAHA' },
      WOW: { emoji: '😮', color: 'text-yellow-500', labelKey: 'social.posts.reactions.WOW' },
      SAD: { emoji: '😢', color: 'text-yellow-500', labelKey: 'social.posts.reactions.SAD' },
      ANGRY: { emoji: '😡', color: 'text-orange-600', labelKey: 'social.posts.reactions.ANGRY' }
    };

    const config = reactionConfig[post.currentUserReaction];
    if (!config) return null;

    return { 
      emoji: config.emoji, 
      color: config.color, 
      label: t(config.labelKey) 
    };
  };

  const reaction = getReactionDisplay();

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (mediaItems.length <= 1) return;
    setCurrentPreviewIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (mediaItems.length <= 1) return;
    setCurrentPreviewIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewVisible) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setPreviewVisible(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewVisible, mediaItems.length]);
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/p/${post.postId}`);
    toast.success(t('social.posts.options.link_copied', 'Đã sao chép liên kết'));
  };

  const handleToggleBookmark = async () => {
    try {
      // Toggle local state
      const newState = !isBookmarked;
      setIsBookmarked(newState);
      
      // Call API
      // await socialApi.toggleBookmark(post.postId);
      
      if (newState) {
        toast.success(t('social.posts.bookmarks.added', 'Đã lưu bài viết'));
      } else {
        toast.success(t('social.posts.bookmarks.removed', 'Đã gỡ khỏi mục lưu trữ'));
      }
    } catch (error) {
      // Rollback on error
      setIsBookmarked(!isBookmarked);
      toast.error(t('social.posts.bookmarks.error', 'Không thể thực hiện lúc này.'));
    }
  };

  const renderMediaItem = (item: any, className: string, index: number, showMoreCount?: number) => {
    const isVid = item.type?.toUpperCase() === 'VIDEO';
    
    // Find index within its own category
    const categoryIndex = isVid 
      ? videosOnly.findIndex(v => v.url === item.url)
      : imagesOnly.findIndex(i => i.url === item.url);

    return (
      <div 
        className={`relative overflow-hidden group/item cursor-pointer bg-black/5 ${className}`}
        onClick={() => {
          if (isVid) {
            setCurrentVideoIndex(categoryIndex);
            setVideoPreviewVisible(true);
          } else {
            setCurrentPreviewIndex(categoryIndex);
            setPreviewVisible(true);
          }
        }}
      >
        {isVid ? (
          <div className="w-full h-full relative">
            {item.url ? (
              <video 
                key={item.url}
                src={item.url} 
                poster={item.thumbnailUrl}
                className="w-full h-full object-cover" 
                muted 
                loop 
                autoPlay
                playsInline
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <p className="text-[10px] text-white/50">Video Unavailable</p>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40">
                <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <img
              src={item.url}
              alt={item.altText || "Media"}
              className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500"
              crossOrigin="anonymous"
            />
          </div>
        )}
        
        {showMoreCount && showMoreCount > 0 && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="text-white text-lg font-bold">+{showMoreCount}</span>
          </div>
        )}
      </div>
    );
  };

  const renderMedia = () => {
    if (post.type === 'LINK' && post.linkMetadata) {
      return (
        <a 
          href={post.linkMetadata.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block mx-2 mb-2 border border-[#EFEFEF] dark:border-[#262626] rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors group"
        >
          {post.linkMetadata.thumbnailUrl && (
            <div className="relative w-full aspect-[2/1] border-b border-[#EFEFEF] dark:border-[#262626]">
              <img 
                src={post.linkMetadata.thumbnailUrl} 
                alt="Preview" 
                className="w-full h-full object-cover" 
              />
            </div>
          )}
          <div className="p-2">
            <p className="text-[10px] text-[#8E8E8E] uppercase font-semibold mb-0.5">{post.linkMetadata.siteName || 'WEBSITE'}</p>
            <h4 className="text-[13px] font-semibold text-black dark:text-white line-clamp-1 group-hover:text-[#0095F6] transition-colors">
              {post.linkMetadata.title || post.linkMetadata.url}
            </h4>
            {post.linkMetadata.description && (
              <p className="text-[12px] text-[#8E8E8E] line-clamp-2 mt-0.5">{post.linkMetadata.description}</p>
            )}
          </div>
        </a>
      );
    }

    if (post.sharedPost) {
      return (
        <div className="mx-3 mb-3 border border-gray-100 dark:border-[#262626] rounded-xl overflow-hidden hover:bg-gray-50/50 dark:hover:bg-[#121212] transition-all bg-[#FAFAFA]/50 dark:bg-[#0A0A0A]/50">
          <div className="p-3 flex items-center gap-2">
            <div className="h-5 w-5 rounded-full overflow-hidden relative border border-gray-100 dark:border-zinc-800">
              <Image
                src={post.sharedPost.authorAvatar || "/avatar.jpg"}
                fill
                alt={post.sharedPost.authorName}
                className="object-cover"
              />
            </div>
            <span className="text-[12px] font-bold text-black dark:text-white">{post.sharedPost.authorName}</span>
            <span className="text-[#8E8E8E] text-[11px]">
              {formatDistanceToNow(new Date(post.sharedPost.createdAt), { locale: currentLocale, addSuffix: false }).replace('khoảng ', '').replace('about ', '')}
            </span>
          </div>
          <div className="px-3 pb-3 text-[13px] text-gray-800 dark:text-gray-200">
            {post.sharedPost.content}
          </div>
          {post.sharedPost.mediaList && post.sharedPost.mediaList.length > 0 && (
             <div className="relative aspect-video w-full">
                <img 
                  src={post.sharedPost.mediaList[0].url} 
                  alt="Original post" 
                  className="w-full h-full object-cover"
                />
                {post.sharedPost.mediaList.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-1.5 py-0.5 rounded">
                    +{post.sharedPost.mediaList.length - 1}
                  </div>
                )}
             </div>
          )}
        </div>
      );
    }

    if (mediaItems.length === 0) return null;

    const count = mediaItems.length;

    return (
      <div className="mx-2 mb-2 rounded-lg overflow-hidden border border-[#EFEFEF] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#121212]">
        {/* Ant Design Official Image Preview - IMAGES ONLY */}
        <div className="hidden">
          <AntImage.PreviewGroup
            preview={{
              open: previewVisible,
              onVisibleChange: (vis) => setPreviewVisible(vis),
              current: currentPreviewIndex,
              onChange: (current) => setCurrentPreviewIndex(current),
            }}
          >
            {imagesOnly.map((item: any, idx: number) => (
              <AntImage key={idx} src={item.url} />
            ))}
          </AntImage.PreviewGroup>
        </div>

        {/* Ant Design Official Preview for Videos - Separate but Consistent UI */}
        <div className="hidden">
          {videosOnly.length > 0 && (
            <AntImage
              src={videosOnly[currentVideoIndex]?.thumbnailUrl || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"}
              preview={{
                visible: videoPreviewVisible,
                onVisibleChange: (vis) => setVideoPreviewVisible(vis),
                imageRender: () => (
                  <div className="flex items-center justify-center w-screen h-screen bg-black/90 p-4 md:p-12" onClick={(e) => e.stopPropagation()}>
                    <div className="relative w-full h-full flex items-center justify-center">
                      <video 
                        key={videosOnly[currentVideoIndex]?.url}
                        src={videosOnly[currentVideoIndex]?.url}
                        controls
                        autoPlay
                        preload="auto"
                        crossOrigin="anonymous"
                        className="max-w-[95vw] max-h-[90vh] rounded-md shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5"
                      />
                    </div>
                  </div>
                ),
                toolbarRender: () => null,
              }}
            />
          )}
        </div>

        {/* Display Grid */}
        {count === 1 && (
          <div className="relative w-full aspect-[4/3]">
            {renderMediaItem(mediaItems[0], "w-full h-full", 0)}
          </div>
        )}

        {count === 2 && (
          <div className="grid grid-cols-2 gap-0.5 aspect-[4/3]">
            {renderMediaItem(mediaItems[0], "w-full h-full", 0)}
            {renderMediaItem(mediaItems[1], "w-full h-full", 1)}
          </div>
        )}

        {count === 3 && (
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5 aspect-[4/3]">
            {renderMediaItem(mediaItems[0], "col-span-2 row-span-1", 0)}
            {renderMediaItem(mediaItems[1], "col-span-1 row-span-1", 1)}
            {renderMediaItem(mediaItems[2], "col-span-1 row-span-1", 2)}
          </div>
        )}

        {count === 4 && (
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5 aspect-[4/3]">
            {renderMediaItem(mediaItems[0], "w-full h-full", 0)}
            {renderMediaItem(mediaItems[1], "w-full h-full", 1)}
            {renderMediaItem(mediaItems[2], "w-full h-full", 2)}
            {renderMediaItem(mediaItems[3], "w-full h-full", 3)}
          </div>
        )}

        {count >= 5 && (
          <div className="grid grid-cols-6 grid-rows-2 gap-0.5 aspect-[4/3]">
            {renderMediaItem(mediaItems[0], "col-span-3 row-span-1", 0)}
            {renderMediaItem(mediaItems[1], "col-span-3 row-span-1", 1)}
            {renderMediaItem(mediaItems[2], "col-span-2 row-span-1", 2)}
            {renderMediaItem(mediaItems[3], "col-span-2 row-span-1", 3)}
            {renderMediaItem(mediaItems[4], "col-span-2 row-span-1", 4, count > 5 ? count - 5 : 0)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-white dark:bg-black mb-3 border-b border-gray-100 dark:border-[#262626] sm:border-none" suppressHydrationWarning>
      {/* Author Header */}
      <div className="py-2 px-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full p-[1px] bg-gradient-to-tr from-[#FFD600] via-[#FF7A00] to-[#FF0069]">
            <div className="w-full h-full rounded-full bg-white dark:bg-black p-[1px]">
               <div className="w-full h-full rounded-full overflow-hidden relative">
                <Image
                  src={post.authorAvatar || "/avatar.jpg"}
                  fill
                  alt={post.authorName}
                  className="object-cover"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <h4 className="text-[13px] font-semibold text-black dark:text-white hover:text-gray-500 cursor-pointer transition-colors">
              {post.authorName}
            </h4>
            {post.location && (
              <>
                <span className="text-[#8E8E8E] text-[12px] font-medium">•</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[100px]">{post.location}</span>
              </>
            )}
            <span className="text-[#8E8E8E] text-[12px] font-medium">•</span>
            <span className="text-[#8E8E8E] text-[12px]">
              {formatDistanceToNow(new Date(post.createdAt), { locale: currentLocale, addSuffix: false }).replace('khoảng ', '').replace('about ', '')}
            </span>
          </div>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="text-black dark:text-white hover:text-gray-500 transition-colors p-1 cursor-pointer"
          >
            <MoreHorizontalIcon size={18} />
          </button>

          {showMoreOptions && (
            <PostOptionsDropdown 
              post={post}
              currentUser={currentUser || null}
              isDark={isDark}
              onClose={() => setShowMoreOptions(false)}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          )}
        </div>
      </div>

      {/* Media */}
      <div className="cursor-pointer">
        {renderMedia()}
      </div>

      {/* Action Buttons */}
      <div className="py-1 px-2 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div 
            className="relative"
            onMouseEnter={() => {
              if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
              if (!showReactions) {
                hoverTimeoutRef.current = setTimeout(() => setShowReactions(true), 400);
              }
            }}
            onMouseLeave={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              leaveTimeoutRef.current = setTimeout(() => setShowReactions(false), 400);
            }}
          >
            {/* Reaction Picker Popover */}
            {showReactions && (
              <div 
                className="absolute bottom-full left-0 mb-0 pb-6 z-[1000]"
                onMouseEnter={() => {
                  if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
                }}
              >
                <div className="p-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.2)] border border-white/20 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {[
                    { emoji: '👍', label: t('social.posts.reactions.LIKE'), type: 'LIKE' },
                    { emoji: '❤️', label: t('social.posts.reactions.LOVE'), type: 'LOVE' },
                    { emoji: '😂', label: t('social.posts.reactions.HAHA'), type: 'HAHA' },
                    { emoji: '😮', label: t('social.posts.reactions.WOW'), type: 'WOW' },
                    { emoji: '😢', label: t('social.posts.reactions.SAD'), type: 'SAD' },
                    { emoji: '😡', label: t('social.posts.reactions.ANGRY'), type: 'ANGRY' }
                  ].map((react, i) => (
                    <button 
                      key={react.label}
                      className="w-8 h-8 flex items-center justify-center text-xl hover:scale-150 transition-transform duration-200 origin-bottom cursor-pointer select-none"
                      style={{ transitionDelay: `${i * 20}ms` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReact?.(post.postId, react.type);
                        setShowReactions(false);
                      }}
                    >
                      {react.emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={() => onLike?.(post.postId)}
              className={`transition-all active:scale-125 hover:scale-110 cursor-pointer p-1 flex items-center gap-1 ${reaction ? reaction.color : (post.isLiked ? 'text-red-500' : 'text-black dark:text-white hover:text-gray-500')}`}
            >
              {reaction ? (
                <>
                  <span className="text-[18px] leading-none">{reaction.emoji}</span>
                  <span className="text-[13px] font-bold">{reaction.label}</span>
                </>
              ) : (
                <HeartIcon size={20} className={post.isLiked ? "fill-current" : "stroke-current"} />
              )}
            </button>
          </div>
          
          <button 
            onClick={() => setShowComments(true)}
            className="text-black dark:text-white hover:text-gray-500 transition-all hover:scale-110 cursor-pointer"
          >
            <MessageCircleIcon size={20} />
          </button>

          <button 
            onClick={() => onShareClick?.(post)}
            className="text-black dark:text-white hover:text-gray-500 transition-all hover:scale-110 cursor-pointer p-1"
            title="Chia sẻ lên tường của bạn"
          >
            <SendIcon size={18} className="rotate-[-20deg]" />
          </button>

          <button 
            onClick={handleCopyLink}
            className="text-black dark:text-white hover:text-gray-500 transition-all hover:scale-110 cursor-pointer p-1"
            title="Sao chép liên kết"
          >
            <BookmarkIcon size={18} className="rotate-0" />
          </button>
        </div>

        {/* Bookmark Button moved to options or kept? Let's keep it but change the icon to SendIcon for sharing maybe? */}
        {/* Actually, SendIcon is usually for DM/Share. Bookmark is for Save. */}
        {/* Let's follow Instagram: Heart, Comment, Share (SendIcon). Bookmark is on the right. */}
        <button 
          onClick={handleToggleBookmark}
          className={`transition-all active:scale-125 hover:scale-110 cursor-pointer p-1 ${isBookmarked ? 'text-black dark:text-white' : 'text-black dark:text-white hover:text-gray-500'}`}
        >
          <BookmarkIcon size={20} className={isBookmarked ? "fill-current" : "stroke-current"} />
        </button>

        <div className="flex -space-x-1.5 items-center group/reactions relative cursor-pointer ml-3">
          {(post.reactionCounts && Object.entries(post.reactionCounts).length > 0) ? (
            <>
              {Object.entries(post.reactionCounts)
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([type], idx) => (
                  <div 
                    key={type} 
                    className="w-5 h-5 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-[12px] shadow-sm border border-gray-100 dark:border-zinc-700"
                    style={{ zIndex: 3 - idx }}
                  >
                    {{
                      LIKE: '👍',
                      LOVE: '❤️',
                      HAHA: '😂',
                      WOW: '😮',
                      SAD: '😢',
                      ANGRY: '😡'
                    }[type] || '👍'}
                  </div>
                ))}
              
              {/* Hover Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover/reactions:opacity-100 transition-opacity duration-200 pointer-events-none z-[1100]">
                <div className="bg-black/90 dark:bg-zinc-900/95 backdrop-blur-md text-white text-[11px] py-1.5 px-3 rounded-lg shadow-xl border border-white/10 min-w-[120px] whitespace-pre-line leading-relaxed">
                  {post.reactionNames && Object.entries(post.reactionNames).some(([_, names]) => names.length > 0) ? (
                    <div className="space-y-0.5">
                      {Object.entries(post.reactionNames)
                        .filter(([_, names]) => names.length > 0)
                        .sort((a, b) => (post.reactionCounts?.[b[0]] || 0) - (post.reactionCounts?.[a[0]] || 0))
                        .map(([type, names]) => (
                          <div key={type} className="flex flex-col">
                            <span className="font-bold text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
                              {{
                                LIKE: 'Thích',
                                LOVE: 'Yêu thích',
                                HAHA: 'Haha',
                                WOW: 'Wow',
                                SAD: 'Buồn',
                                ANGRY: 'Phẫn nộ'
                              }[type] || type}
                            </span>
                            {names.slice(0, 10).map((name, i) => (
                              <div key={i} className="pl-1 truncate">{name}</div>
                            ))}
                            {names.length > 10 && <div className="pl-1 text-gray-500">và {names.length - 10} người khác...</div>}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">Chưa có thông tin người dùng</div>
                  )}
                </div>
                {/* Tooltip Arrow */}
                <div className="w-2 h-2 bg-black/90 dark:bg-zinc-900/95 rotate-45 border-r border-b border-white/10 absolute -bottom-1 right-3"></div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Interaction Stats */}
      <div className="space-y-1 px-2 pb-3">
        {!post.hideLikes && (
          <p className="text-[13px] font-bold text-black dark:text-white">
            {post.likeCount.toLocaleString()} {t('social.posts.likes')}
            {post.shareCount > 0 && (
              <>
                <span className="mx-1.5 opacity-30">•</span>
                <span>{post.shareCount.toLocaleString()} {t('social.posts.shares', 'lượt chia sẻ')}</span>
              </>
            )}
          </p>
        )}
        
        {/* Caption */}
        <div className="text-[13px] leading-snug">
          <span className="font-semibold text-black dark:text-white mr-1.5">{post.authorName}</span>
          <span className="text-gray-800 dark:text-gray-200">{post.content}</span>
        </div>

        {!post.turnOffComments && post.commentCount > 0 && (
          <button 
            onClick={() => setShowComments(true)}
            className="text-[12px] text-gray-500 hover:text-gray-400 transition-colors block cursor-pointer"
          >
            {t('social.posts.view_comments', { count: post.commentCount })}
          </button>
        )}
      </div>

      <CommentModal 
        post={post}
        open={showComments}
        onClose={() => setShowComments(false)}
        currentUser={currentUser}
        onCommentAdded={() => {
          // You could trigger a refresh here if needed, 
          // but the modal handles its own list.
        }}
      />
    </div>
  );
};
