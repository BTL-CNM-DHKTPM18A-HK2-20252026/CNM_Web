import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, MoreHorizontal, Heart, Send } from 'lucide-react';
import { StoryResponse, StoryViewerResponse } from '../../types';
import { socialApi } from '../../api';

interface StoryViewerProps {
  stories: StoryResponse[];
  initialAuthorId: string;
  onClose: () => void;
  currentUserId: string;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  initialAuthorId,
  onClose,
  currentUserId
}) => {
  // Group stories by author
  const groupedStories = useMemo(() => {
    const map = new Map<string, StoryResponse[]>();
    stories.forEach(story => {
      if (!map.has(story.authorId)) {
        map.set(story.authorId, []);
      }
      map.get(story.authorId)!.push(story);
    });
    return Array.from(map.entries()).map(([authorId, authorStories]) => ({
      authorId,
      authorStories: authorStories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }));
  }, [stories]);

  const [currentAuthorIndex, setCurrentAuthorIndex] = useState(() => {
    const idx = groupedStories.findIndex(g => g.authorId === initialAuthorId);
    return idx >= 0 ? idx : 0;
  });

  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerResponse[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  
  const currentGroup = groupedStories[currentAuthorIndex];
  const currentStory = currentGroup?.authorStories[currentStoryIndex];

  const STORY_DURATION = 5000;
  const TICK_RATE = 50;

  const handleNext = () => {
    if (!currentGroup) return;
    if (currentStoryIndex < currentGroup.authorStories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
    } else if (currentAuthorIndex < groupedStories.length - 1) {
      setCurrentAuthorIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (!currentGroup) return;
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    } else if (currentAuthorIndex > 0) {
      setCurrentAuthorIndex(prev => prev - 1);
      const prevGroup = groupedStories[currentAuthorIndex - 1];
      setCurrentStoryIndex(prevGroup.authorStories.length - 1);
      setProgress(0);
    }
  };

  useEffect(() => {
    if (!currentStory || isPaused) return;

    if (!currentStory.isViewedByMe) {
      socialApi.viewStory(currentStory.storyId, currentUserId).catch(console.error);
      currentStory.isViewedByMe = true;
    }

    let interval: NodeJS.Timeout;
    
    if (currentStory.mediaType !== 'VIDEO') {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (TICK_RATE / STORY_DURATION) * 100;
          if (newProgress >= 100) {
            clearInterval(interval);
            handleNext();
            return 100;
          }
          return newProgress;
        });
      }, TICK_RATE);
    }

    return () => clearInterval(interval);
  }, [currentStory, isPaused, currentAuthorIndex, currentStoryIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGroup, currentStoryIndex, onClose]);

  useEffect(() => {
    if (showViewers && currentStory) {
      setIsLoadingViewers(true);
      socialApi.getStoryViewers(currentStory.storyId, currentUserId)
        .then(setViewers)
        .catch(console.error)
        .finally(() => setIsLoadingViewers(false));
    }
  }, [showViewers, currentStory?.storyId]);

  const handleReact = async (reaction: string) => {
    if (!currentStory) return;
    try {
      await socialApi.reactToStory(currentStory.storyId, reaction, currentUserId);
      // Optional: show some visual feedback
    } catch (error) {
      console.error('Failed to react:', error);
    }
  };

  const handleReply = async () => {
    if (!currentStory || !replyText.trim()) return;
    try {
      await socialApi.replyToStory(currentStory.storyId, replyText, currentUserId);
      setReplyText('');
      // Optional: show success
    } catch (error) {
      console.error('Failed to reply:', error);
    }
  };

  if (!currentGroup || !currentStory) return null;

  const renderContent = () => {
    if (currentStory.mediaType === 'TEXT') {
      return (
        <div 
          className="w-full h-full flex items-center justify-center p-8 text-center"
          style={{ background: currentStory.background || 'linear-gradient(45deg, #FF6B6B, #C0392B)' }}
        >
          <p className="text-white text-2xl font-bold whitespace-pre-wrap">{currentStory.caption}</p>
        </div>
      );
    }

    if (currentStory.mediaType === 'IMAGE') {
      return (
        <div className="w-full h-full relative bg-black flex items-center justify-center">
          <Image
            src={currentStory.mediaUrl || '/placeholder.png'}
            alt="Story"
            fill
            className="object-contain"
            priority
          />
        </div>
      );
    }

    if (currentStory.mediaType === 'VIDEO') {
      return (
        <video
          src={currentStory.mediaUrl}
          className="w-full h-full object-contain bg-black"
          autoPlay
          playsInline
          onEnded={handleNext}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            const progress = (video.currentTime / video.duration) * 100;
            setProgress(progress);
          }}
        />
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-50 text-white/70 hover:text-white p-2"
      >
        <X size={32} />
      </button>

      <div className="relative w-full h-full md:w-[400px] md:h-[800px] md:max-h-[90vh] bg-zinc-900 md:rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-4 pt-5 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          {currentGroup.authorStories.map((s, idx) => (
            <div key={s.storyId} className="h-[3px] flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{ 
                  width: idx === currentStoryIndex 
                    ? `${progress}%` 
                    : idx < currentStoryIndex ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-8 left-0 right-0 z-20 px-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20">
              <Image 
                src={currentStory.authorAvatarUrl || '/avatar.jpg'} 
                alt={currentStory.authorName}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-[14px] drop-shadow-md">
                {currentStory.authorName}
              </span>
              <span className="text-white/70 text-[13px] font-medium drop-shadow-md">
                {formatTimeAgo(currentStory.createdAt)}
              </span>
            </div>
          </div>
          <button className="text-white/90 hover:text-white p-1 pointer-events-auto">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div 
          className="flex-1 relative cursor-pointer"
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 3) {
              handlePrev();
            } else if (x > (rect.width / 3) * 2) {
              handleNext();
            } else {
              setIsPaused(true);
            }
          }}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
        >
          {renderContent()}
        </div>

        {currentStory.authorId !== currentUserId ? (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center gap-3">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder={`Trả lời ${currentStory.authorName}...`}
                className="w-full bg-transparent border border-white/40 rounded-full px-5 py-3 text-white text-[14px] placeholder-white/70 focus:outline-none focus:border-white focus:bg-black/20 backdrop-blur-md transition-all"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
              />
            </div>
            <button 
              onClick={() => handleReact('HEART')}
              className="text-white hover:scale-110 transition-transform p-2"
            >
              <Heart size={26} />
            </button>
            <button 
              onClick={handleReply}
              className="text-white hover:scale-110 transition-transform p-2"
            >
              <Send size={24} />
            </button>
          </div>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center">
            <button 
              onClick={() => setShowViewers(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-md transition-all"
            >
              <span className="text-white text-[14px] font-medium">{currentStory.viewCount || 0} người xem</span>
            </button>
          </div>
        )}
        
        {/* Viewers Modal */}
        {showViewers && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold">Người xem</h3>
              <button onClick={() => setShowViewers(false)} className="text-white/70 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {isLoadingViewers ? (
                <div className="text-white/50 text-center py-10">Đang tải...</div>
              ) : viewers.length === 0 ? (
                <div className="text-white/50 text-center py-10">Chưa có người xem</div>
              ) : (
                viewers.map((viewer) => (
                  <div key={viewer.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <Image 
                          src={viewer.avatarUrl || '/avatar.jpg'} 
                          alt={viewer.displayName}
                          width={40}
                          height={40}
                        />
                      </div>
                      <div>
                        <div className="text-white font-medium text-[14px]">{viewer.displayName}</div>
                        <div className="text-white/50 text-[12px]">{formatTimeAgo(viewer.viewedAt)}</div>
                      </div>
                    </div>
                    {viewer.reaction && (
                      <div className="text-xl">{viewer.reaction === 'HEART' ? '❤️' : viewer.reaction}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        <div className="hidden md:flex absolute inset-y-0 -left-16 items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
        <div className="hidden md:flex absolute inset-y-0 -right-16 items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  
  return `${Math.floor(diffInHours / 24)}d`;
}
