import React from 'react';
import Image from 'next/image';
import { PlusIcon } from '@/components/ui/Icons';
import { PostCard } from '../PostCard';
import { PostResponse, SocialUser, StoryResponse } from '../../types';
import { useTranslation } from 'react-i18next';

interface SocialFeedMainProps {
  user: SocialUser | null;
  posts: PostResponse[];
  stories?: StoryResponse[];
  isLoading: boolean;
  onCreatePost: (content: string) => Promise<void>;
  onLike?: (postId: string) => void;
  onReact?: (postId: string, reaction: string) => void;
  onCreateStory?: () => void;
}

export const SocialFeedMain: React.FC<SocialFeedMainProps> = ({ user, posts, stories = [], isLoading, onLike, onReact, onCreateStory }) => {
  const { t } = useTranslation();

  const currentUserId = user?.id || user?.user_id;
  const userStories = stories.filter(s => s.authorId === currentUserId);
  const otherStories = stories.filter(s => s.authorId !== currentUserId);

  // Group stories by author
  const uniqueAuthors = Array.from(new Set(otherStories.map(s => s.authorId)))
    .map(id => otherStories.find(s => s.authorId === id)!);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showLeftBtn, setShowLeftBtn] = React.useState(false);
  const [showRightBtn, setShowRightBtn] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftBtn(scrollLeft > 20);
      setShowRightBtn(scrollLeft < scrollWidth - clientWidth - 20);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [stories, checkScroll]);

  const handleScroll = () => {
    checkScroll();
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full flex flex-col items-center pt-4 px-4 pb-10">
      {/* Stories Carousel Wrapper */}
      <div className="w-full max-w-[630px] mb-8 relative group/carousel">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full overflow-x-auto scrollbar-hide py-4 flex gap-4 snap-x snap-mandatory scroll-smooth"
        >
          {/* Current User Story */}
          <div 
            onClick={onCreateStory}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer snap-start"
          >
            <div className="relative">
              <div className={`w-[72px] h-[72px] rounded-full p-[2px] ${userStories.length > 0 ? 'bg-gradient-to-tr from-[#FFD600] via-[#FF7A00] to-[#FF0069]' : 'border border-gray-100 dark:border-gray-800'}`}>
                <div className={`w-full h-full rounded-full ${userStories.length > 0 ? 'bg-white dark:bg-black p-[2px]' : ''}`}>
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    <Image
                      src={user?.avatar_url || user?.avatarUrl || "/avatar.jpg"}
                      fill
                      alt="Your story"
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
              {userStories.length === 0 && (
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#0095F6] rounded-full border-2 border-white dark:border-black flex items-center justify-center">
                  <PlusIcon size={12} className="text-white" />
                </div>
              )}
            </div>
            <span className="text-[12px] text-gray-500 dark:text-gray-400">{t('social.posts.your_story')}</span>
          </div>

          {/* Other Stories */}
          {uniqueAuthors.map((story, idx) => (
            <div key={story.storyId} className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer snap-start">
              <div className={`w-[72px] h-[72px] rounded-full p-[2px] ${story.isViewedByMe ? 'border border-gray-300 dark:border-gray-700' : 'bg-gradient-to-tr from-[#FFD600] via-[#FF7A00] to-[#FF0069]'}`}>
                <div className="w-full h-full rounded-full bg-white dark:bg-black p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    <Image
                      src={story.authorAvatarUrl || "/avatar.jpg"}
                      fill
                      alt="Story"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>
              <span className="text-[12px] text-black dark:text-white truncate w-[72px] text-center">{story.authorName}</span>
            </div>
          ))}
        </div>

        {/* Standard Professional Scroll Buttons */}
        {showLeftBtn && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-white dark:bg-[#1A1A1A] rounded-full shadow-md flex items-center justify-center z-30 border border-gray-200 dark:border-gray-800 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800 dark:text-gray-200"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        )}
        {showRightBtn && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-7 h-7 bg-white dark:bg-[#1A1A1A] rounded-full shadow-md flex items-center justify-center z-30 border border-gray-200 dark:border-gray-800 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800 dark:text-gray-200"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        )}
      </div>

      {/* Main Feed Content */}
      <div className="w-full max-w-[600px] flex flex-col">
        {isLoading ? (
          /* Visual placeholders while loading data */
          [1, 2].map((i) => (
            <div key={i} className="w-full animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-24"></div>
              </div>
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-sm mb-4"></div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2"></div>
            </div>
          ))
        ) : posts.length === 0 ? (
          /* Message shown when there are no posts in the feed */
          <div className="py-20 text-center">
            <p className="text-gray-500 font-medium text-[14px]">{t('social.posts.no_posts')}</p>
          </div>
        ) : (
          /* Render list of post cards */
          posts.map((post) => (
            <PostCard 
              key={post.postId} 
              post={post} 
              onLike={onLike}
              onReact={onReact}
              currentUser={user}
            />
          ))
        )}
      </div>
    </div>
  );
};
