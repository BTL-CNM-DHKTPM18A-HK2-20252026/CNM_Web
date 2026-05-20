import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { PlusIcon, SearchIcon } from '@/components/ui/Icons';
import { PostCard } from '../PostCard';
import { PostResponse, SocialUser, StoryResponse } from '../../types';
import { useTranslation } from 'react-i18next';
import { socialApi } from '../../api';

interface SocialFeedMainProps {
  user: SocialUser | null;
  posts: PostResponse[];
  stories?: StoryResponse[];
  isLoading: boolean;
  onCreatePost: (content: string) => Promise<void>;
  onLike?: (postId: string) => void;
  onReact?: (postId: string, reaction: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (post: PostResponse) => void;
  onShare?: (post: PostResponse) => void;
  onCreateStory?: () => void;
  onViewStory?: (authorId: string) => void;
  isRanked?: boolean;
  onAuthorClick?: (userId: string) => void;
  onHashtagClick?: (tag: string) => void;
  onSearchClick?: () => void;
}

const TrackedPostCard: React.FC<{
  post: PostResponse;
  onLike?: (postId: string) => void;
  onReact?: (postId: string, reaction: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (post: PostResponse) => void;
  onShare?: (post: PostResponse) => void;
  currentUser: SocialUser | null;
  onAuthorClick?: (userId: string) => void;
  onHashtagClick?: (tag: string) => void;
}> = ({ post, onLike, onReact, onDelete, onEdit, onShare, currentUser, onAuthorClick, onHashtagClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTracked.current) {
          hasTracked.current = true;
          socialApi.trackPostView(post.postId);
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [post.postId]);

  return (
    <div ref={ref}>
      <PostCard
        post={post}
        onLike={onLike}
        onReact={onReact}
        onDelete={onDelete}
        onEdit={onEdit}
        onShareClick={onShare}
        currentUser={currentUser}
        onAuthorClick={onAuthorClick}
        onHashtagClick={onHashtagClick}
      />
    </div>
  );
};

const StoryAvatarRing: React.FC<{
  imageSrc: string;
  alt: string;
  storyCount: number;
  hasUnseenStories: boolean;
  isOwnStory?: boolean;
}> = ({ imageSrc, alt, storyCount, hasUnseenStories, isOwnStory = false }) => {
  const hasStoryRing = hasUnseenStories || isOwnStory;
  const ringStyle = hasStoryRing
    ? { background: 'conic-gradient(from 225deg, #FFD600, #FF7A00, #FF0069, #FFD600)' }
    : { background: '#D1D5DB' };

  return (
    <div className="relative h-[72px] w-[72px]">
      <div
        className={`absolute inset-0 rounded-full p-[3px] ${hasStoryRing ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.6),0_0_12px_rgba(255,122,0,0.25)]' : ''}`}
        style={ringStyle}
      >
        <div className="h-full w-full rounded-full bg-white p-[2px] dark:bg-black">
          <div className="relative h-full w-full overflow-hidden rounded-full">
            <Image src={imageSrc} fill alt={alt} className="object-cover transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>
      </div>
      {hasStoryRing && (
        <div className="absolute inset-1 rounded-full ring-1 ring-white/70 dark:ring-black/60 pointer-events-none" />
      )}
      {storyCount > 1 && (
        <div className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] font-semibold text-white shadow-lg ring-2 ring-white dark:ring-black">
          {storyCount}
        </div>
      )}
    </div>
  );
};

export const SocialFeedMain: React.FC<SocialFeedMainProps> = ({
  user,
  posts,
  stories = [],
  isLoading,
  onLike,
  onReact,
  onDelete,
  onEdit,
  onShare,
  onCreateStory,
  onViewStory,
  isRanked = false,
  onAuthorClick,
  onHashtagClick,
  onSearchClick,
}) => {
  const { t } = useTranslation();
  const currentUserId = String(user?.id || user?.user_id || '');

  const storyGroups = useMemo(() => {
    const map = new Map<string, StoryResponse[]>();

    stories.forEach((story) => {
      const authorId = String(story.authorId);
      if (!map.has(authorId)) map.set(authorId, []);
      map.get(authorId)!.push(story);
    });

    return Array.from(map.entries())
      .map(([authorId, authorStories]) => {
        const sortedStories = [...authorStories].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        return {
          authorId,
          authorStories: sortedStories,
          latestStory: sortedStories[sortedStories.length - 1],
          hasUnseenStories: sortedStories.some((story) => !story.isViewedByMe),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.latestStory?.createdAt || 0).getTime() -
          new Date(a.latestStory?.createdAt || 0).getTime()
      );
  }, [stories]);

  const myStoryGroup = storyGroups.find((group) => group.authorId === currentUserId);
  const otherStoryGroups = storyGroups.filter((group) => group.authorId !== currentUserId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftBtn, setShowLeftBtn] = React.useState(false);
  const [showRightBtn, setShowRightBtn] = React.useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftBtn(scrollLeft > 20);
    setShowRightBtn(scrollLeft < scrollWidth - clientWidth - 20);
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [stories, checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  return (
    <div className="flex w-full flex-col items-center px-4 pb-10 pt-4">
      <div className="mb-6 w-full max-w-[630px]">
        <div
          onClick={onSearchClick}
          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-full border border-transparent bg-[#F0F2F5] px-4 py-2.5 shadow-sm transition-all duration-200 hover:bg-gray-200/70 dark:border-[#262626] dark:bg-[#1A1A1A] dark:hover:bg-[#262626]/80"
        >
          <div className="flex items-center gap-3">
            <SearchIcon size={18} className="text-gray-400 dark:text-gray-500" />
            <span className="text-[14px] font-normal text-gray-500 dark:text-gray-400">
              Tìm kiếm bạn bè, bài viết, hashtag...
            </span>
          </div>
          <div className="flex items-center gap-1 rounded bg-gray-200/50 px-2 py-0.5 text-[10px] font-medium text-gray-500 shadow-sm select-none dark:border-white/5 dark:bg-[#262626] dark:text-gray-400">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      <div className="group/carousel relative mb-8 w-full max-w-[630px] border-b border-gray-100 pb-4 dark:border-gray-900">
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto py-4 scrollbar-hide scroll-smooth"
        >
          <div
            onClick={() => onCreateStory?.()}
            className="group flex shrink-0 cursor-pointer flex-col items-center gap-1.5 snap-start"
          >
            <div className="relative h-[72px] w-[72px]">
              <div className="h-full w-full rounded-full border border-gray-200 p-[3px] dark:border-gray-800">
                <div className="relative h-full w-full overflow-hidden rounded-full">
                  <Image
                    src={user?.avatar_url || user?.avatarUrl || '/avatar.jpg'}
                    fill
                    alt="Add story"
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#0095F6] dark:border-black">
                <PlusIcon size={14} className="text-white" />
              </div>
            </div>
            <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">Thêm tin</span>
          </div>

          {myStoryGroup && (
            <div
              onClick={() => onViewStory?.(currentUserId)}
              className="group flex shrink-0 cursor-pointer flex-col items-center gap-1.5 snap-start"
            >
              <StoryAvatarRing
                imageSrc={user?.avatar_url || user?.avatarUrl || '/avatar.jpg'}
                alt="Your story"
                storyCount={myStoryGroup.authorStories.length}
                hasUnseenStories={myStoryGroup.hasUnseenStories}
                isOwnStory
              />
              <span className="w-[72px] truncate text-center text-[12px] font-semibold text-black dark:text-white">
                {user?.display_name || t('social.posts.your_story')}
              </span>
            </div>
          )}

          {otherStoryGroups.map((group) => {
            const latestStory = group.latestStory;
            if (!latestStory) return null;

            return (
              <div
                key={group.authorId}
                onClick={() => onViewStory?.(group.authorId)}
                className="group flex shrink-0 cursor-pointer flex-col items-center gap-1.5 snap-start"
              >
                <StoryAvatarRing
                  imageSrc={latestStory.authorAvatarUrl || '/avatar.jpg'}
                  alt="Story"
                  storyCount={group.authorStories.length}
                  hasUnseenStories={group.hasUnseenStories}
                />
                <span className="w-[72px] truncate text-center text-[12px] text-black dark:text-white">
                  {latestStory.authorName}
                </span>
              </div>
            );
          })}
        </div>

        {showLeftBtn && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 z-30 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white opacity-0 shadow-md transition-all hover:scale-110 cursor-pointer dark:border-gray-800 dark:bg-[#1A1A1A] group-hover/carousel:opacity-100"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-800 dark:text-gray-200"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        {showRightBtn && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 z-30 flex h-7 w-7 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white opacity-0 shadow-md transition-all hover:scale-110 cursor-pointer dark:border-gray-800 dark:bg-[#1A1A1A] group-hover/carousel:opacity-100"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-800 dark:text-gray-200"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {isRanked && (
        <div className="mb-4 flex w-full max-w-[600px] items-center gap-2 px-1">
          <span className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">✦ Dành riêng cho bạn</span>
          <div className="h-px flex-1 bg-gray-100 dark:bg-gray-900" />
        </div>
      )}

      <div className="flex w-full max-w-[600px] flex-col">
        {isLoading ? (
          [1, 2].map((i) => (
            <div key={i} className="mb-8 w-full animate-pulse">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="mb-4 aspect-square rounded-sm bg-gray-100 dark:bg-gray-800" />
              <div className="mb-2 h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[14px] font-medium text-gray-500">{t('social.posts.no_posts')}</p>
          </div>
        ) : (
          posts.map((post) => (
            <TrackedPostCard
              key={post.postId}
              post={post}
              onLike={onLike}
              onReact={onReact}
              onDelete={onDelete}
              onEdit={onEdit}
              onShare={onShare}
              currentUser={user}
              onAuthorClick={onAuthorClick}
              onHashtagClick={onHashtagClick}
            />
          ))
        )}
      </div>
    </div>
  );
};
