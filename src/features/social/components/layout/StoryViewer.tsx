import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, MoreHorizontal, Heart, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { socialApi } from '../../api';
import { StoryResponse, StoryViewerResponse } from '../../types';

interface StoryViewerProps {
  stories: StoryResponse[];
  initialAuthorId: string;
  onClose: () => void;
  currentUserId: string;
  onStoryViewed?: (storyId: string) => void;
  onStoryDeleted?: (storyId: string) => void;
}

type StoryGroup = {
  authorId: string;
  authorStories: StoryResponse[];
  latestAt: string;
};

const STORY_DURATION = 5000;

export const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  initialAuthorId,
  onClose,
  currentUserId,
  onStoryViewed,
  onStoryDeleted,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewedStoryIdsRef = useRef<Set<string>>(new Set());
  const reactionHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groupedStories = useMemo<StoryGroup[]>(() => {
    const map = new Map<string, StoryResponse[]>();

    stories.forEach((story) => {
      if (!map.has(story.authorId)) map.set(story.authorId, []);
      map.get(story.authorId)!.push(story);
    });

    return Array.from(map.entries())
      .map(([authorId, authorStories]) => {
        const sortedStories = [...authorStories].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        return {
          authorId,
          authorStories: sortedStories,
          latestAt: sortedStories[sortedStories.length - 1]?.createdAt || '',
        };
      })
      .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
  }, [stories]);

  const [activeAuthorId, setActiveAuthorId] = useState(initialAuthorId);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerResponse[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentAuthorIndex = useMemo(() => {
    const idx = groupedStories.findIndex((group) => group.authorId === activeAuthorId);
    return idx >= 0 ? idx : 0;
  }, [activeAuthorId, groupedStories]);

  const currentGroup = groupedStories[currentAuthorIndex];
  const currentStory = currentGroup?.authorStories[currentStoryIndex];

  const mediaTypeUpper = currentStory?.mediaType?.trim().toUpperCase();
  const mediaUrlLower = currentStory?.mediaUrl?.toLowerCase() || '';
  const isImage = mediaTypeUpper === 'IMAGE' || /\.(png|jpe?g|gif|webp|avif)(\?|#|$)/.test(mediaUrlLower);
  const isVideo = mediaTypeUpper === 'VIDEO'
    || (!isImage && mediaTypeUpper !== 'TEXT' && !!currentStory?.mediaUrl)
    || /\.(mp4|mov|webm|m4v|m3u8)(\?|#|$)/.test(mediaUrlLower);
  const isText = mediaTypeUpper === 'TEXT' || (!currentStory?.mediaUrl && !!currentStory?.caption);
  const displayProgress = isVideo ? videoProgress : storyProgress;

  const QUICK_REACTIONS = ['😂', '😮', '😢', '👏', '🔥', '🎉', '❤️', '💯'];

  const clearReactionTimer = useCallback(() => {
    if (reactionHideTimerRef.current) {
      clearTimeout(reactionHideTimerRef.current);
      reactionHideTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setActiveAuthorId(initialAuthorId);
    setCurrentStoryIndex(0);
    setVideoProgress(0);
    setStoryProgress(0);
    setShowViewers(false);
    setShowReactions(false);
    setMenuOpen(false);
    setReplyText('');
    clearReactionTimer();
  }, [initialAuthorId, clearReactionTimer]);

  useEffect(() => {
    if (!currentStory) return;

    if (!currentStory.isViewedByMe && !viewedStoryIdsRef.current.has(currentStory.storyId)) {
      viewedStoryIdsRef.current.add(currentStory.storyId);
      socialApi.viewStory(currentStory.storyId, currentUserId)
        .then(() => onStoryViewed?.(currentStory.storyId))
        .catch(console.error);
    }
  }, [currentStory, currentUserId, onStoryViewed]);

  useEffect(() => {
    if (!currentStory || isVideo) {
      setStoryProgress(0);
      return;
    }

    let rafId = 0;
    let cycleStart = performance.now();

    const animate = (now: number) => {
      const elapsed = now - cycleStart;

      if (elapsed >= STORY_DURATION) {
        cycleStart = now - (elapsed % STORY_DURATION);
      }

      const nextProgress = Math.min(((now - cycleStart) / STORY_DURATION) * 100, 100);
      setStoryProgress(nextProgress);
      rafId = window.requestAnimationFrame(animate);
    };

    setStoryProgress(0);
    rafId = window.requestAnimationFrame(animate);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [currentStory, isVideo]);

  const restartCurrentVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setVideoProgress(0);
    video.play().catch(() => {});
  }, []);

  const goToStory = useCallback((authorIndex: number, storyIndex: number) => {
    const targetGroup = groupedStories[authorIndex];
    if (!targetGroup) return;

    setActiveAuthorId(targetGroup.authorId);
    setCurrentStoryIndex(storyIndex);
    setVideoProgress(0);
    setStoryProgress(0);
    setShowViewers(false);
    setShowReactions(false);
    setMenuOpen(false);
    setReplyText('');
    clearReactionTimer();
  }, [clearReactionTimer, groupedStories]);

  const handleNext = useCallback(() => {
    if (!currentGroup) return;

    if (currentStoryIndex < currentGroup.authorStories.length - 1) {
      goToStory(currentAuthorIndex, currentStoryIndex + 1);
      return;
    }

    if (currentAuthorIndex < groupedStories.length - 1) {
      goToStory(currentAuthorIndex + 1, 0);
      return;
    }

    goToStory(0, 0);
  }, [
    currentAuthorIndex,
    currentGroup,
    currentStoryIndex,
    goToStory,
    groupedStories,
  ]);

  const handlePrev = useCallback(() => {
    if (!currentGroup) return;

    if (currentStoryIndex > 0) {
      goToStory(currentAuthorIndex, currentStoryIndex - 1);
      return;
    }

    if (currentAuthorIndex > 0) {
      const prevGroup = groupedStories[currentAuthorIndex - 1];
      goToStory(currentAuthorIndex - 1, prevGroup.authorStories.length - 1);
      return;
    }

    const lastGroup = groupedStories[groupedStories.length - 1];
    if (lastGroup) {
      goToStory(groupedStories.length - 1, lastGroup.authorStories.length - 1);
    }
  }, [currentAuthorIndex, currentGroup, currentStoryIndex, goToStory, groupedStories]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNext, handlePrev, onClose]);

  useEffect(() => {
    if (!showViewers || !currentStory) return;

    let cancelled = false;

    const loadViewers = async () => {
      setIsLoadingViewers(true);
      try {
        const data = await socialApi.getStoryViewers(currentStory.storyId, currentUserId);
        if (!cancelled) setViewers(data);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setIsLoadingViewers(false);
      }
    };

    void loadViewers();

    return () => {
      cancelled = true;
    };
  }, [currentStory, currentUserId, showViewers]);

  const handleReact = async (reaction: string) => {
    if (!currentStory) return;

    try {
      await socialApi.reactToStory(currentStory.storyId, reaction, currentUserId);
      toast.success(`Đã bày tỏ cảm xúc ${reaction}`);
      setShowReactions(false);
      clearReactionTimer();
    } catch (error) {
      console.error('Failed to react:', error);
      toast.error('Có lỗi xảy ra khi thả cảm xúc');
    }
  };

  const handleReply = async () => {
    if (!currentStory || !replyText.trim()) return;

    try {
      await socialApi.replyToStory(currentStory.storyId, replyText, currentUserId);
      toast.success('Đã gửi phản hồi');
      setReplyText('');
    } catch (error) {
      console.error('Failed to reply:', error);
      toast.error('Gửi phản hồi thất bại');
    }
  };

  const handleDelete = async () => {
    if (!currentStory) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa tin này không?')) return;

    try {
      await socialApi.deleteStory(currentStory.storyId, currentUserId);
      onStoryDeleted?.(currentStory.storyId);
      toast.success('Đã xóa tin thành công');
      onClose();
    } catch (error) {
      console.error('Failed to delete story:', error);
      toast.error('Có lỗi xảy ra khi xóa tin');
    }
  };

  if (!currentGroup || !currentStory) return null;

  const renderContent = () => {
    if (isText) {
      return (
        <div
          className="flex h-full w-full items-center justify-center p-8 text-center"
          style={{ background: currentStory.background || 'linear-gradient(45deg, #FF6B6B, #C0392B)' }}
        >
          <p className="whitespace-pre-wrap text-2xl font-bold text-white">{currentStory.caption}</p>
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="relative flex h-full w-full items-center justify-center bg-black">
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

    if (isVideo) {
      return (
        <video
          key={currentStory.storyId}
          ref={videoRef}
          src={currentStory.mediaUrl}
          className="h-full w-full bg-black object-contain"
          autoPlay
          playsInline
          onEnded={restartCurrentVideo}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            if (!video.duration || Number.isNaN(video.duration)) return;
            setVideoProgress((video.currentTime / video.duration) * 100);
          }}
          onLoadedMetadata={() => setVideoProgress(0)}
        />
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
      <button
        onClick={onClose}
        className="absolute right-6 top-6 z-50 cursor-pointer p-2 text-white/70 hover:text-white"
      >
        <X size={32} />
      </button>

      <div className="relative flex h-full w-full items-center justify-center">
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-900 shadow-2xl md:h-[800px] md:max-h-[90vh] md:w-[400px] md:rounded-2xl">
          <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 bg-gradient-to-b from-black/60 to-transparent p-4 pt-5 pointer-events-none">
            {currentGroup.authorStories.map((story, idx) => (
              <div key={story.storyId} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full bg-white transition-all duration-75 ease-linear"
                  style={{
                    width: idx === currentStoryIndex
                      ? `${displayProgress}%`
                      : idx < currentStoryIndex ? '100%' : '0%',
                  }}
                />
              </div>
            ))}
          </div>

        <div className="absolute left-0 right-0 top-8 z-20 flex items-center justify-between px-4 pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/20">
              <Image
                src={currentStory.authorAvatarUrl || '/avatar.jpg'}
                alt={currentStory.authorName}
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-white drop-shadow-md">
                {currentStory.authorName}
              </span>
              <span className="text-[13px] font-medium text-white/70 drop-shadow-md">
                {formatTimeAgo(currentStory.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {currentStory.authorId === currentUserId && (
              <button
                onClick={handleDelete}
                className="cursor-pointer p-1 text-white/90 transition-colors hover:text-red-500"
                title="Xóa tin"
              >
                <Trash2 size={20} />
              </button>
            )}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="cursor-pointer p-1 text-white/90 transition-colors hover:text-white"
              >
                <MoreHorizontal size={20} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur-md">
                  {currentStory.authorId === currentUserId ? (
                    <>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setShowViewers(true);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
                      >
                        Xem người xem
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleDelete();
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        Xóa tin
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-full px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
                    >
                      Đóng
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="relative flex-1 cursor-pointer"
          onPointerDown={(e) => {
            if (isVideo) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 3) {
              handlePrev();
            } else if (x > (rect.width / 3) * 2) {
              handleNext();
            } else {
              setShowReactions(false);
            }
          }}
        >
          {renderContent()}
        </div>

        {currentStory.authorId !== currentUserId ? (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={`Trả lời ${currentStory.authorName}...`}
                className="w-full rounded-full border border-white/40 bg-transparent px-5 py-3 text-[14px] text-white placeholder-white/70 backdrop-blur-md transition-all focus:border-white focus:bg-black/20 focus:outline-none"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
              />
            </div>

            <div
              className="relative shrink-0"
              onPointerEnter={() => setShowReactions(true)}
              onPointerLeave={() => {
                reactionHideTimerRef.current = setTimeout(() => {
                  setShowReactions(false);
                  reactionHideTimerRef.current = null;
                }, 180);
              }}
            >
              {showReactions && (
                <div
                  className="absolute bottom-[calc(100%+6px)] right-0 z-[60] flex items-end"
                  onPointerEnter={() => clearTimeout(reactionHideTimerRef.current as ReturnType<typeof setTimeout>)}
                  onPointerLeave={() => {
                    reactionHideTimerRef.current = setTimeout(() => {
                      setShowReactions(false);
                      reactionHideTimerRef.current = null;
                    }, 180);
                  }}
                >
                  <div className="pointer-events-auto rounded-full bg-black/90 px-1.5 py-1.5 shadow-2xl ring-1 ring-white/10 backdrop-blur-md animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-1.5">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(emoji)}
                          className="cursor-pointer rounded-full p-0.5 text-lg transition-transform hover:scale-125 active:scale-95"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => handleReact('❤️')}
                className="cursor-pointer rounded-full p-2 text-white transition-transform hover:scale-110 active:scale-95"
              >
                <Heart size={26} />
              </button>
            </div>

            <button
              onClick={handleReply}
              className="cursor-pointer rounded-full p-2 text-white transition-transform hover:scale-110 active:scale-95"
            >
              <Send size={24} />
            </button>
          </div>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
            <button
              onClick={() => setShowViewers(true)}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-md transition-all hover:bg-white/20"
            >
              <span className="text-[14px] font-medium text-white">
                {currentStory.viewCount || 0} người xem
              </span>
            </button>
          </div>
        )}

          <div className="fixed left-0 right-0 top-1/2 z-[120] pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="pointer-events-auto absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/75 cursor-pointer"
            style={{ left: 'calc(50% - 252px)' }}
            aria-label="Previous story"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="pointer-events-auto absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/75 cursor-pointer"
            style={{ left: 'calc(50% + 252px)' }}
            aria-label="Next story"
          >
            <ChevronRight size={24} />
          </button>
          </div>

          {showViewers && (
          <div className="absolute inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h3 className="font-semibold text-white">Người xem</h3>
              <button
                onClick={() => setShowViewers(false)}
                className="cursor-pointer text-white/70 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingViewers ? (
                <div className="space-y-4 py-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="flex animate-pulse items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/10" />
                        <div className="space-y-2">
                          <div className="h-3 w-28 rounded bg-white/10" />
                          <div className="h-2 w-16 rounded bg-white/10" />
                        </div>
                      </div>
                      <div className="h-6 w-6 rounded-full bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : viewers.length === 0 ? (
                <div className="py-10 text-center text-white/50">Chưa có người xem</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {viewers.map((viewer) => (
                    <div key={viewer.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full">
                          <Image
                            src={viewer.avatarUrl || '/avatar.jpg'}
                            alt={viewer.displayName}
                            width={40}
                            height={40}
                          />
                        </div>
                        <div>
                          <div className="text-[14px] font-medium text-white">{viewer.displayName}</div>
                          <div className="text-[12px] text-white/50">{formatTimeAgo(viewer.viewedAt)}</div>
                        </div>
                      </div>

                      {viewer.reaction && (
                        <div className="text-xl">{viewer.reaction === 'HEART' ? '❤️' : viewer.reaction}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
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
