import React, { useState, useEffect, useRef } from 'react';
import { Modal, Avatar, Spin, Input } from 'antd';
import { formatDistanceToNow } from 'date-fns';
import { enUS, vi as viLocale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/themes';
import { socialApi } from '../api';
import { CommentResponse, PostResponse } from '../types';
import {
  HeartIcon,
  MessageCircleIcon,
  SendIcon,
  XIcon,
  MoreHorizontalIcon,
  BookmarkIcon,
  SmileIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@/components/ui/Icons';
import { toast } from 'sonner';
import { Popover } from 'antd';
import { PostOptionsDropdown } from './PostOptionsDropdown';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';

interface CommentModalProps {
  post: PostResponse;
  open: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
  currentUser?: SocialUser | null;
}

export const CommentModal: React.FC<CommentModalProps> = ({ post, open, onClose, onCommentAdded, currentUser }) => {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentResponse | null>(null);
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  const currentLocale = i18n.language === 'vi' ? viLocale : enUS;
  const currentUserId = currentUser?.id || currentUser?.user_id;
  const isOwner = currentUserId && (currentUserId === post.authorId);

  const formatTime = (date: string | Date) => {
    if (i18n.language === 'vi') {
      const distance = formatDistanceToNow(new Date(date), { locale: currentLocale, addSuffix: true });
      if (distance.includes('dưới 1 phút')) {
        return '1 phút trước';
      }
      return distance;
    }
    return formatDistanceToNow(new Date(date), { locale: currentLocale, addSuffix: true });
  };

  useEffect(() => {
    if (replyingTo && !content.includes(`@${replyingTo.userName}`)) {
      setReplyingTo(null);
    }
  }, [content, replyingTo]);

  const mediaItems = post.mediaList || [];

  useEffect(() => {
    if (open && post.postId) {
      fetchComments();
      setCurrentMediaIndex(0);
    }
  }, [open, post.postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await socialApi.getComments(post.postId);
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (commentId: string) => {
    setExpandedCommentIds(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await socialApi.addComment(post.postId, {
        content,
        parentCommentId: replyingTo?.commentId
      });
      setContent('');
      setReplyingTo(null);
      await fetchComments();
      onCommentAdded?.();
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error(t('common.action_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMediaIndex < mediaItems.length - 1) {
      setCurrentMediaIndex(prev => prev + 1);
    }
  };

  const handlePrevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(prev => prev - 1);
    }
  };

  const updateCommentInList = (list: CommentResponse[], id: string, updater: (c: CommentResponse) => CommentResponse): CommentResponse[] => {
    return list.map(c => {
      if (c.commentId === id) return updater(c);
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: updateCommentInList(c.replies, id, updater) };
      }
      return c;
    });
  };

  const handleLikeComment = async (commentId: string, type: string = 'LIKE') => {
    try {
      // Optimistic update using recursive helper
      setComments(prev => updateCommentInList(prev, commentId, (c) => {
        const isCurrentType = c.currentUserReaction === type;
        return {
          ...c,
          currentUserReaction: isCurrentType ? null : type,
          likeCount: isCurrentType ? Math.max(0, c.likeCount - 1) : (c.currentUserReaction ? c.likeCount : c.likeCount + 1)
        };
      }));

      // Call API
      await socialApi.reactToComment(post.postId, commentId, type);
    } catch (error) {
      console.error('Failed to react to comment:', error);
    }
  };



  const renderMediaContent = (item: any) => {
    const isVideo = item.type?.toUpperCase() === 'VIDEO' || item.url?.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/);

    if (isVideo) {
      return (
        <video
          src={item.url}
          controls
          autoPlay
          muted
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
        />
      );
    }

    return (
      <img
        src={item.url}
        className="w-full h-full object-cover"
        alt="Post content"
        crossOrigin="anonymous"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x800?text=Image+Unavailable&bg=222&fc=444';
        }}
      />
    );
  };

  return (
    <>
      <style>{`
        .instagram-modal-final .ant-modal-content {
          padding: 0 !important;
          background-color: transparent !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        .instagram-modal-final .ant-modal-body {
          padding: 0 !important;
          background-color: transparent !important;
        }
        .instagram-modal-final .ant-modal-close {
          display: none !important;
        }
        .instagram-modal-final .ant-input::placeholder {
          color: ${isDark ? '#a1a1aa' : '#8e8e8e'} !important;
          opacity: 1 !important;
        }
        .instagram-modal-final .ant-input {
          color: ${isDark ? 'white' : 'black'} !important;
        }
        *::-webkit-scrollbar {
          width: 4px !important;
          height: 4px !important;
        }
        *::-webkit-scrollbar-track {
          background: transparent !important;
        }
        *::-webkit-scrollbar-thumb {
          background: ${isDark ? '#333' : '#dbdbdb'} !important;
          border-radius: 10px !important;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? '#444' : '#c7c7c7'} !important;
        }
      `}</style>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width="100%"
        style={{ maxWidth: '100vw', top: 0, padding: 0 }}
        styles={{
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }
        }}
        className="instagram-modal-final"
        closable={false}
        centered
        modalRender={() => (
          <div className="w-full h-screen flex items-center justify-center pointer-events-none p-0 md:p-8 lg:p-12">
            <div
              className={`flex flex-col md:flex-row h-full md:h-[85vh] md:max-h-[850px] w-full max-w-[1000px] ${isDark ? 'bg-black text-white' : 'bg-white text-black'} overflow-hidden relative shadow-2xl rounded-sm pointer-events-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Media Section (Left) */}
              <div className={`w-full md:w-[60%] lg:w-[60%] ${isDark ? 'bg-black border-zinc-900' : 'bg-zinc-50 border-zinc-200'} flex items-center justify-center relative border-r group/media overflow-hidden`}>
                {mediaItems.length > 0 ? (
                  <div className="w-full h-full flex items-center justify-center relative">
                    {renderMediaContent(mediaItems[currentMediaIndex])}

                    {mediaItems.length > 1 && (
                      <>
                        {currentMediaIndex > 0 && (
                          <button
                            onClick={handlePrevMedia}
                            className="absolute left-4 p-1.5 bg-zinc-800/60 hover:bg-zinc-700/80 text-white rounded-full transition-all backdrop-blur-md z-10 cursor-pointer"
                          >
                            <ChevronLeftIcon size={24} />
                          </button>
                        )}
                        {currentMediaIndex < mediaItems.length - 1 && (
                          <button
                            onClick={handleNextMedia}
                            className="absolute right-4 p-1.5 bg-zinc-800/60 hover:bg-zinc-700/80 text-white rounded-full transition-all backdrop-blur-md z-10 cursor-pointer"
                          >
                            <ChevronRightIcon size={24} />
                          </button>
                        )}
                        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-zinc-900/60 backdrop-blur-md rounded-full text-[12px] font-semibold text-white/90">
                          {currentMediaIndex + 1} / {mediaItems.length}
                        </div>
                      </>
                    )}
                  </div>
                ) : post.type === 'LINK' && post.linkMetadata ? (
                  <div className={`w-full h-full p-10 flex items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
                    <a
                      href={post.linkMetadata.url}
                      target="_blank"
                      className={`block max-w-md w-full ${isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'} border rounded-xl overflow-hidden transition-colors`}
                    >
                      {post.linkMetadata.thumbnailUrl && (
                        <img src={post.linkMetadata.thumbnailUrl} className="w-full aspect-video object-cover" alt="Preview" />
                      )}
                      <div className="p-4">
                        <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase font-bold mb-1`}>{post.linkMetadata.siteName}</p>
                        <h4 className={`font-bold line-clamp-2 mb-1 ${isDark ? 'text-white' : 'text-black'}`}>{post.linkMetadata.title}</h4>
                        <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-[12px] line-clamp-2`}>{post.linkMetadata.description}</p>
                      </div>
                    </a>
                  </div>
                ) : (
                  <div className={`p-12 ${isDark ? 'text-white/40' : 'text-black/40'} text-center`}>
                    <p className="text-2xl italic font-light">{post.content}</p>
                  </div>
                )}
              </div>

              {/* Content Section (Right) */}
              <div className={`w-full md:w-[40%] lg:w-[40%] flex flex-col h-full ${isDark ? 'bg-black' : 'bg-white'}`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-4 border-b ${isDark ? 'border-zinc-900' : 'border-zinc-100'} shrink-0`}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full p-[1.5px] bg-gradient-to-tr from-[#FFD600] via-[#FF7A00] to-[#FF0069]">
                      <div className={`w-full h-full rounded-full ${isDark ? 'bg-black' : 'bg-white'} p-[1.5px]`}>
                        <Avatar src={post.authorAvatar} size={32} className="border-none" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className={`text-[14px] font-bold ${isDark ? 'text-white hover:text-gray-400' : 'text-black hover:text-gray-600'} cursor-pointer transition-colors`}>
                          {post.authorName}
                        </span>
                        <span className="text-blue-500">•</span>
                        {!isOwner && (
                          <button className="text-[14px] font-bold text-[#0095F6] hover:text-[#00376B] transition-colors cursor-pointer">
                            {t('social.posts.following')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowOptions(!showOptions)}
                      className={`${isDark ? 'text-white' : 'text-black'} hover:opacity-50 transition-opacity cursor-pointer`}
                    >
                      <MoreHorizontalIcon size={20} />
                    </button>
                    {showOptions && (
                      <PostOptionsDropdown
                        post={post}
                        currentUser={currentUser || null}
                        isDark={isDark}
                        onClose={() => {
                          setShowOptions(false);
                          onClose();
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Comments List */}
                <div
                  ref={scrollRef}
                  className={`flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-6 ${isDark ? 'bg-black' : 'bg-white'}`}
                >
                  <div className="flex gap-3">
                    <Avatar src={post.authorAvatar} size={32} className="shrink-0" />
                    <div className="flex flex-col flex-1">
                      <div className="text-[14px] leading-relaxed">
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-black'} mr-2 hover:opacity-70 cursor-pointer`}>
                          {post.authorName}
                        </span>
                        <span className={`${isDark ? 'text-white' : 'text-black'} whitespace-pre-wrap`}>{post.content}</span>
                      </div>
                      <div className={`flex items-center gap-3 mt-2 text-[12px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <span>{formatTime(post.createdAt)}</span>
                        {post.location && <span className={`font-medium ${isDark ? 'text-white' : 'text-black'}`}>{post.location}</span>}
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-10">
                      <Spin size="small" />
                    </div>
                  ) : comments.length > 0 ? (
                    comments.map((comment) => (
                      <CommentItem
                        key={comment.commentId}
                        comment={comment}
                        isDark={isDark}
                        t={t}
                        formatTime={formatTime}
                        handleLikeComment={handleLikeComment}
                        setReplyingTo={setReplyingTo}
                        setContent={setContent}
                        isExpanded={expandedCommentIds.has(comment.commentId)}
                        onToggleExpand={() => toggleExpand(comment.commentId)}
                      />
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center pb-10">
                      <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'} mb-2`}>{t('social.posts.no_comments')}</h3>
                      <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('social.posts.no_comments_desc')}</p>
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div className={`px-4 py-4 border-t ${isDark ? 'border-zinc-900' : 'border-zinc-100'} shrink-0 ${isDark ? 'bg-black' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <button className={`hover:opacity-50 transition-opacity cursor-pointer ${post.isLiked ? 'text-red-500' : (isDark ? 'text-white' : 'text-black')}`}>
                        <HeartIcon size={26} className={post.isLiked ? "fill-current" : "stroke-current"} />
                      </button>
                      <button
                        onClick={() => inputRef.current?.focus()}
                        className={`${isDark ? 'text-white' : 'text-black'} hover:opacity-50 transition-opacity cursor-pointer`}
                      >
                        <MessageCircleIcon size={26} />
                      </button>
                      <button className={`${isDark ? 'text-white' : 'text-black'} hover:opacity-50 transition-opacity cursor-pointer`}>
                        <SendIcon size={24} />
                      </button>
                    </div>
                    <button className={`${isDark ? 'text-white' : 'text-black'} hover:opacity-50 transition-opacity cursor-pointer`}>
                      <BookmarkIcon size={26} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className={`text-[14px] font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                      {post.likeCount.toLocaleString()} {t('social.posts.likes')}
                    </p>
                    <p className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'} uppercase tracking-tight`}>
                      {formatTime(post.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Input Section */}
                <div className={`p-4 border-t ${isDark ? 'border-zinc-900' : 'border-zinc-100'} ${isDark ? 'bg-black' : 'bg-white'} shrink-0`}>
                  <div className="flex items-center gap-3">
                    <Popover
                      content={
                        <EmojiPicker
                          onEmojiClick={(emojiData) => setContent(prev => prev + emojiData.emoji)}
                          theme={isDark ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                          lazyLoadEmojis={true}
                          searchPlaceholder={i18n.language === 'vi' ? 'Tìm kiếm biểu tượng...' : 'Search emojis...'}
                          categories={i18n.language === 'vi' ? [
                            { category: 'suggested' as any, name: 'Thường xuyên dùng' },
                            { category: 'smileys_people' as any, name: 'Biểu cảm & Con người' },
                            { category: 'animals_nature' as any, name: 'Động vật & Thiên nhiên' },
                            { category: 'food_drink' as any, name: 'Đồ ăn & Thức uống' },
                            { category: 'travel_places' as any, name: 'Du lịch & Địa điểm' },
                            { category: 'activities' as any, name: 'Hoạt động' },
                            { category: 'objects' as any, name: 'Đồ vật' },
                            { category: 'symbols' as any, name: 'Biểu tượng' },
                            { category: 'flags' as any, name: 'Lá cờ' }
                          ] : undefined}
                          previewConfig={{
                            showPreview: true,
                            defaultCaption: i18n.language === 'vi' ? 'Bạn đang cảm thấy thế nào?' : "What's Your Mood?"
                          }}
                        />
                      }
                      trigger="click"
                      placement="topLeft"
                      overlayInnerStyle={{ padding: 0 }}
                    >
                      <button className={`${isDark ? 'text-white' : 'text-black'} hover:opacity-50 transition-opacity cursor-pointer`}>
                        <SmileIcon size={26} />
                      </button>
                    </Popover>
                    <Input
                      ref={inputRef}
                      placeholder={t('social.posts.add_comment') || "Thêm bình luận..."}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onPressEnter={handleSubmit}
                      bordered={false}
                      className={`bg-transparent text-[14px] px-2 focus:ring-0 ${isDark ? '!text-white' : '!text-black'} flex-1 border-none shadow-none`}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={!content.trim() || submitting}
                      className={`text-[14px] font-bold transition-all cursor-pointer ${content.trim() && !submitting ? 'text-[#0095F6] opacity-100 hover:text-[#18a4f9]' : 'text-[#0095F6] opacity-50 cursor-default'}`}
                    >
                      {submitting ? <Spin size="small" className="ml-1" /> : (t('social.post_action') || 'Bình luận')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Global Close Button */}
              <button
                onClick={onClose}
                className="fixed top-5 right-5 z-[2000] text-white hover:opacity-70 transition-opacity hidden md:block cursor-pointer"
              >
                <XIcon size={24} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      />
    </>
  );
};

interface CommentItemProps {
  comment: CommentResponse;
  depth?: number;
  isDark: boolean;
  t: any;
  formatTime: (date: string | Date) => string;
  handleLikeComment: (commentId: string, type?: string) => Promise<void>;
  setReplyingTo: (comment: CommentResponse | null) => void;
  setContent: (content: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth = 0,
  isDark,
  t,
  formatTime,
  handleLikeComment,
  setReplyingTo,
  setContent,
  isExpanded,
  onToggleExpand
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const isReply = depth > 0;

  const reactionContent = (
    <div className={`flex items-center gap-1 p-1 rounded-full ${isDark ? 'bg-[#262626] border-zinc-700' : 'bg-white border-zinc-100'} shadow-xl border`}>
      {[
        { emoji: '👍', label: t('social.posts.reactions.LIKE'), type: 'LIKE' },
        { emoji: '❤️', label: t('social.posts.reactions.LOVE'), type: 'LOVE' },
        { emoji: '😂', label: t('social.posts.reactions.HAHA'), type: 'HAHA' },
        { emoji: '😮', label: t('social.posts.reactions.WOW'), type: 'WOW' },
        { emoji: '😢', label: t('social.posts.reactions.SAD'), type: 'SAD' },
        { emoji: '😡', label: t('social.posts.reactions.ANGRY'), type: 'ANGRY' }
      ].map((react) => (
        <button
          key={react.type}
          onClick={(e) => {
            e.stopPropagation();
            handleLikeComment(comment.commentId, react.type);
            setShowReactions(false);
          }}
          className="w-8 h-8 flex items-center justify-center text-xl hover:scale-150 transition-transform duration-200 cursor-pointer border-none bg-transparent"
        >
          {react.emoji}
        </button>
      ))}
    </div>
  );

  const getReactionDisplay = () => {
    if (!comment.currentUserReaction) return <HeartIcon size={14} />;

    const reactions: Record<string, any> = {
      LIKE: { emoji: '👍', color: 'text-blue-500' },
      LOVE: { emoji: '❤️', color: 'text-red-500' },
      HAHA: { emoji: '😂', color: 'text-yellow-500' },
      WOW: { emoji: '😮', color: 'text-yellow-500' },
      SAD: { emoji: '😢', color: 'text-yellow-500' },
      ANGRY: { emoji: '😡', color: 'text-red-600' }
    };

    const r = reactions[comment.currentUserReaction] || { emoji: '❤️', color: 'text-red-500' };
    return <span className="text-[14px] leading-none">{r.emoji}</span>;
  };

  return (
    <div className="flex flex-col relative">
      {/* Thread line for Level 2 comments */}
      {isReply && (
        <div
          className={`absolute left-[15px] top-[-16px] bottom-[20px] w-[1.5px] ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'} rounded-full`}
        />
      )}

      <div
        className={`flex gap-3 mb-4 group relative ${isReply ? 'ml-10' : ''}`}
      >
        <Avatar src={comment.userAvatar || "/avatar.jpg"} size={isReply ? 24 : 32} className="shrink-0 z-10" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={`text-[14px] font-bold ${isDark ? 'text-white' : 'text-black'}`}>
              {comment.userName}
            </span>
            <p className={`text-[14px] ${isDark ? 'text-zinc-300' : 'text-zinc-800'} break-all whitespace-pre-wrap`}>
              {comment.content}
            </p>
          </div>
          <div className={`flex items-center flex-wrap gap-x-4 gap-y-1 mt-1 text-[12px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'} font-semibold`}>
            <span className="whitespace-nowrap">{formatTime(comment.createdAt)}</span>
            {comment.likeCount > 0 && (
              <span className="whitespace-nowrap">{comment.likeCount} {t('social.posts.interactions', 'lượt tương tác')}</span>
            )}
            {!isReply && comment.replies && comment.replies.length > 0 && (
              <span className="whitespace-nowrap">{comment.replies.length} {t('social.posts.comment_count', 'lượt bình luận')}</span>
            )}
            {!isReply && (
              <button
                onClick={() => {
                  setReplyingTo(comment);
                  setContent(`@${comment.userName} `);
                }}
                className={`hover:${isDark ? 'text-white' : 'text-black'} transition-colors cursor-pointer whitespace-nowrap`}
              >
                {t('social.posts.reply')}
              </button>
            )}
          </div>
        </div>

        <Popover
          content={reactionContent}
          trigger="hover"
          open={showReactions}
          onOpenChange={setShowReactions}
          overlayInnerStyle={{ padding: 0, borderRadius: '999px', overflow: 'hidden' }}
          placement="topRight"
        >
          <button
            onClick={() => handleLikeComment(comment.commentId, 'LOVE')}
            className={`transition-colors self-start mt-1 cursor-pointer ${comment.currentUserReaction ? 'scale-110' : 'text-zinc-600 hover:text-red-500'}`}
          >
            {getReactionDisplay()}
          </button>
        </Popover>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className={`flex flex-col ${isReply ? 'ml-0' : 'ml-12'}`}>
          {!isExpanded ? (
            <button
              onClick={onToggleExpand}
              className={`flex items-center gap-4 text-[12px] font-bold ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'} transition-colors mt-2 mb-4 cursor-pointer`}
            >
              <div className={`h-[1px] w-10 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              <span>
                {t('social.posts.view_replies', 'Xem phản hồi')} ({comment.replies.length})
              </span>
            </button>
          ) : (
            <>
              <button
                onClick={onToggleExpand}
                className={`flex items-center gap-4 text-[12px] font-bold ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'} transition-colors mt-2 mb-4 cursor-pointer`}
              >
                <div className={`h-[1px] w-10 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                <span>{t('social.posts.hide_replies', 'Ẩn phản hồi')}</span>
              </button>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.commentId}
                  comment={reply}
                  depth={depth + 1}
                  isDark={isDark}
                  t={t}
                  formatTime={formatTime}
                  handleLikeComment={handleLikeComment}
                  setReplyingTo={setReplyingTo}
                  setContent={setContent}
                  isExpanded={false} // Nested replies handle their own or don't expand deeper in 2-level flat
                  onToggleExpand={() => { }}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
