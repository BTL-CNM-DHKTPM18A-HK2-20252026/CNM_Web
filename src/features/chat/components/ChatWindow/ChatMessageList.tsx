import React, { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';
import { SparklesIcon } from '@/components/ui/Icons';
import { AI_TYPING_USER_ID } from '@/features/chat/components/ChatWindow/useChatWindow';
import type { ChatMessage, ChatMessageListProps } from '@/features/chat/components/ChatWindow/types';

// ── Call History Message ────────────────────────────────────────────────────
function formatCallDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function CallHistoryMessage({
  msg,
  currentUserId,
  t,
}: {
  msg: ChatMessage;
  currentUserId?: string;
  t: (key: string, opts?: Record<string, string>) => string;
}) {
  const isCaller = msg.senderId === currentUserId;

  let label: string;
  let Icon: React.ReactNode;

  if (msg.type === 'CALL_MISSED') {
    label = isCaller
      ? t('chat.call.you_called')
      : t('chat.call.missed_from', { name: msg.sender !== 'Me' ? (msg.sender ?? '') : '' });
    Icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0">
        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.6a19.79 19.79 0 0 1-3.07-8.69A2 2 0 0 1 3.17 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.15 7.8" /><line x1="23" y1="1" x2="1" y2="23" />
      </svg>
    );
  } else if (msg.type === 'CALL_REJECTED') {
    label = t('chat.call.rejected');
    Icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400 shrink-0">
        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.6a19.79 19.79 0 0 1-3.07-8.69A2 2 0 0 1 3.17 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.15 7.8" /><line x1="23" y1="1" x2="1" y2="23" />
      </svg>
    );
  } else {
    // CALL_ENDED
    const durationSeconds = msg.text ? parseInt(msg.text, 10) : 0;
    const durationStr = formatCallDuration(isNaN(durationSeconds) ? 0 : durationSeconds);
    label = `${t('chat.call.ended')} · ${durationStr}`;
    Icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#0068FF] shrink-0">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.26 9.6a19.79 19.79 0 0 1-3.07-8.69A2 2 0 0 1 3.17 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.15 7.8a16 16 0 0 0 6.05 6.05l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92z" />
      </svg>
    );
  }

  return (
    <div className="flex justify-center my-1.5">
      <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/[0.07] px-3 py-1.5 rounded-full select-none">
        {Icon}
        <span className="text-[12px] text-(--sub-text) font-medium">{label}</span>
        <span className="text-[11px] text-(--sub-text) opacity-60">·</span>
        <span className="text-[11px] text-(--sub-text) opacity-60">{msg.time}</span>
      </div>
    </div>
  );
}
// ───────────────────────────────────────────────────────────────────────────

const getFileNameFromUrl = (url: string) => {
  try {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    const filename = lastPart.includes('_') ? lastPart.split('_').slice(1).join('_') : lastPart;
    return decodeURIComponent(filename);
  } catch {
    return 'File';
  }
};

const getFileExtension = (url: string) => {
  const filename = getFileNameFromUrl(url);
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
};

const isOfficeDoc = (url: string) => {
  const ext = getFileExtension(url).toLowerCase();
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
};

const getPreviewUrl = (url: string) => {
  if (isOfficeDoc(url)) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }
  return url;
};

const isDifferentDay = (d1?: Date, d2?: Date) => {
  if (!d1 || !d2) return true;
  return d1.toDateString() !== d2.toDateString();
};

const formatDateSeparator = (date: Date | undefined, t: (key: string) => string) => {
  if (!date) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = today.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('chat.date.today');
  if (diffDays === 1) return t('chat.date.yesterday');
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const resolveImageAspectRatio = (message: ChatMessage) => {
  const width = Number(message?.width || 0);
  const height = Number(message?.height || 0);
  if (width > 0 && height > 0) {
    return `${width} / ${height}`;
  }
  return '4 / 3';
};

const renderText = (text: string, mentions?: string[]) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, idx) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={`url-${idx}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0068FF] hover:underline break-all cursor-pointer font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    // Highlight @mentions (e.g. "@Alice") in blue
    if (mentions && mentions.length > 0) {
      const mentionRegex = /(@\S+)/g;
      const subParts = part.split(mentionRegex);
      return subParts.map((sub, subIdx) => {
        if (sub.startsWith('@')) {
          return (
            <span key={`mention-${idx}-${subIdx}`} className="text-[#0068FF] font-semibold">
              {sub}
            </span>
          );
        }
        return sub;
      });
    }
    return part;
  });
};

function LinkPreview({ url, title, description, thumbnail }: { url: string; title?: string; description?: string; thumbnail?: string }) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    return (
      <div
        className="mt-2 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border)] overflow-hidden flex flex-col cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          window.open(url, '_blank');
        }}
      >
        {thumbnail && (
          <div className="w-full h-32 overflow-hidden bg-gray-100 dark:bg-gray-800 border-b border-[var(--border)]">
            <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-2.5 flex flex-col gap-1">
          <div className="text-[13px] font-bold text-[var(--text)] line-clamp-2 leading-snug">
            {title || (url.length > 60 ? `${url.substring(0, 60)}...` : url)}
          </div>
          {description && (
            <div className="text-[12px] text-[var(--sub-text)] line-clamp-2 leading-snug">{description}</div>
          )}
          <div className="text-[11px] text-[#0068FF] font-medium flex items-center gap-1.5 overflow-hidden">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            <span className="truncate">{domain}</span>
          </div>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}

function VoicePlayer({ url, duration, isMe }: { url: string; duration?: number; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`flex items-center gap-3 py-1.5 px-1 min-w-[200px] ${isMe ? 'text-[var(--message-me-text)]' : 'text-[var(--text)]'}`}>
      <audio ref={audioRef} src={url} className="hidden" />
      <button onClick={togglePlay} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${isMe ? 'bg-[#0068FF]/15 text-[#0068FF] hover:bg-[#0068FF]/25' : 'bg-[#0068FF]/10 text-[#0068FF] hover:bg-[#0068FF]/20'} cursor-pointer`}>
        {isPlaying ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" transform="translate(1, 0)"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className={`h-1 rounded-full relative ${isMe ? 'bg-[#0068FF]/15' : 'bg-black/10 dark:bg-white/10'}`}>
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 bg-[#0068FF]`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] opacity-80 font-medium">
          <span>{formatDuration(audioRef.current?.currentTime || 0)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
      <div className="shrink-0 scale-x-[-1] opacity-60">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
      </div>
    </div>
  );
}

function ChatMessageListImpl({ vm }: ChatMessageListProps) {
  const {
    t,
    selectedChat,
    currentUser,
    messages,
    hasMore,
    isLoadingMore,
    isInitialLoading,
    loadMoreRef,
    scrollContainerRef,
    messagesEndRef,
    typingUsers,
    friendRequestStatus,
    friendActionLoading,
    pinnedMessages,
    showPinnedList,
    setShowPinnedList,
    openContextMenu,
    setContextMenu,
    editingMessageId,
    setEditContent,
    editContent,
    setEditingMessageId,
    handleEditMessage,
    handleDownloadFile,
    setOpenedImageSrc,
    setReactionModalMessageId,
    handleReactMessage,
    setReplyingTo,
    messageInputRef,
    setForwardingMsg,
    handlePinMessage,
    handleUnpinMessage,
    readReceipts,
    handleAcceptFriendRequest,
    handleSendFriendRequest,
  } = vm;

  // ── Virtual list setup ────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 72,
    overscan: 15,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <>
      {!selectedChat.isCloud && !selectedChat.isAi && !selectedChat.isGroup && (selectedChat.otherUserId || selectedChat.recipientId) && friendRequestStatus !== 'friend' && friendRequestStatus !== 'loading' && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span className="text-[13px] text-amber-800 dark:text-amber-200">
              {t('chat.stranger_warning')}
            </span>
          </div>
          <div className="shrink-0">
            {friendRequestStatus === 'received' ? (
              <button
                disabled={friendActionLoading}
                onClick={handleAcceptFriendRequest}
                className="px-3 py-1.5 bg-[#0068FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {t('chat.friend.accept_btn')}
              </button>
            ) : friendRequestStatus === 'sent' ? (
              <span className="text-[12px] text-amber-700 dark:text-amber-300 italic whitespace-nowrap">{t('chat.friend.sent_label')}</span>
            ) : (
              <button
                disabled={friendActionLoading}
                onClick={handleSendFriendRequest}
                className="px-3 py-1.5 bg-[#0068FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {t('chat.friend.add_btn')}
              </button>
            )}
          </div>
        </div>
      )}

      {pinnedMessages.length > 0 && (
        <div className="relative z-20">
          <div
            className="bg-[var(--card-bg)] border-b border-[var(--border)] flex items-stretch cursor-pointer hover:bg-[var(--hover-bg)] transition-colors select-none"
            onClick={() => setShowPinnedList(!showPinnedList)}
          >
            <div className="w-[3px] bg-[#0068FF] shrink-0 rounded-r-sm" />
            <div className="flex items-center gap-2.5 flex-1 min-w-0 px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-[#0068FF]/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-[#0068FF] leading-tight mb-0.5">
                  {pinnedMessages.length > 1 ? `${pinnedMessages.length} ${t('chat.pin.pinned')}` : t('chat.pin.pinned')}
                </div>
                <div className="text-[13px] text-[var(--text)] truncate leading-snug">
                  <span className="font-semibold">{pinnedMessages[0].senderName}: </span>
                  {pinnedMessages[0].messageType !== 'TEXT'
                    ? `[${pinnedMessages[0].messageType}]`
                    : (pinnedMessages[0].content?.length > 60 ? `${pinnedMessages[0].content.slice(0, 60)}...` : pinnedMessages[0].content)}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[var(--sub-text)] shrink-0 transition-transform duration-200 ${showPinnedList ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </div>

          {showPinnedList && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPinnedList(false)} />
              <div className="absolute left-0 right-0 top-full z-20 bg-[var(--card-bg)] border-b border-[var(--border)] max-h-[280px] overflow-y-auto custom-scrollbar shadow-lg rounded-b-lg">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-[var(--sub-text)] uppercase tracking-wider bg-[var(--hover-bg)] sticky top-0 z-10">
                  {t('chat.pin.pinned')} ({pinnedMessages.length})
                </div>
                {pinnedMessages.map((pin, idx) => (
                  <div
                    key={pin.id}
                    className={`px-3 py-2.5 flex items-center gap-3 hover:bg-[var(--hover-bg)] cursor-pointer transition-colors group/pin-item ${idx < pinnedMessages.length - 1 ? 'border-b border-[var(--border)]/40' : ''}`}
                    onClick={() => {
                      const el = document.getElementById(`msg-${pin.messageId}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('highlight-msg');
                        setTimeout(() => el.classList.remove('highlight-msg'), 2000);
                      }
                      setShowPinnedList(false);
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#0068FF]/10 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-[#0068FF]">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[#0068FF] leading-tight">{pin.senderName}</div>
                      <div className="text-[13px] text-[var(--text)] truncate leading-snug mt-0.5">
                        {pin.messageType !== 'TEXT' ? `[${pin.messageType}]` : (pin.content?.length > 80 ? `${pin.content.slice(0, 80)}...` : pin.content)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpinMessage(pin.messageId);
                      }}
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover/pin-item:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 text-[var(--sub-text)] hover:text-red-500 transition-all cursor-pointer"
                      title={t('chat.ctx_menu.unpin')}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-8 bg-[var(--chat-bg)]" onScroll={() => setContextMenu(null)}>
        {isInitialLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {hasMore && <div ref={loadMoreRef} className="h-4 opacity-0" />}
            {isLoadingMore && <div className="flex justify-center p-2"><div className="w-5 h-5 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" /></div>}

            <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {virtualItems.map((virtualRow) => {
                const index = virtualRow.index;
                const msg = messages[index];
                const prevMsg = messages[index - 1];
                const showDateSeparator = !prevMsg || isDifferentDay(msg.rawDate, prevMsg.rawDate);

                return (
                  <div
                    key={msg.id}
                    data-index={index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="pb-10"
                  >
                    {showDateSeparator && (
                      <div className="flex justify-center my-2">
                        <span className="bg-black/5 dark:bg-white/10 px-4 py-1.5 rounded-full text-[12px] font-bold text-[var(--sub-text)] opacity-60">{formatDateSeparator(msg.rawDate, t)}</span>
                      </div>
                    )}

                    {msg.type === 'SYSTEM' ? (
                      <div className="flex justify-center my-1">
                        <span className="bg-black/5 dark:bg-white/10 px-4 py-1.5 rounded-full text-[12px] text-[var(--sub-text)] opacity-80">{msg.text}</span>
                      </div>
                    ) : msg.type === 'CALL_MISSED' || msg.type === 'CALL_REJECTED' || msg.type === 'CALL_ENDED' ? (
                      <CallHistoryMessage msg={msg} currentUserId={currentUser?.id} t={t} />
                    ) : (
                      <div id={`msg-${msg.id}`} className={`flex ${msg.sender === 'Me' ? 'justify-end' : 'justify-start'} transition-colors duration-300 [&.highlight-msg]:bg-[#0068FF]/10 rounded-lg`}>
                        <div className={`flex gap-1.5 max-w-[72%] group relative ${msg.sender === 'Me' ? 'flex-row-reverse' : ''} items-center`}>
                          {msg.sender !== 'Me' && (
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 border-[1px] border-[#DBDFE6] dark:border-white/10 shadow-sm flex items-center justify-center bg-blue-50">
                              {(msg as any).avatar ? (
                                <img src={(msg as any).avatar} alt="Avatar" className="w-full h-full object-cover" />
                              ) : selectedChat.isAi || (msg as any).senderId === AI_TYPING_USER_ID ? (
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white">
                                  <SparklesIcon size={16} />
                                </div>
                              ) : selectedChat.avatar ? (
                                <img src={selectedChat.avatar} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-blue-600 font-bold text-sm">{(msg.sender && msg.sender !== 'Me' ? msg.sender : selectedChat.name)?.charAt(0) || '?'}</span>
                              )}
                            </div>
                          )}

                          <div className={`flex flex-col ${msg.sender === 'Me' ? 'items-end' : 'items-start'} relative group/msg-container`}>
                            {msg.sender !== 'Me' && selectedChat.isGroup && (
                              <span className="text-[12px] font-semibold text-[var(--sub-text)] mb-0.5 ml-1">{msg.sender}</span>
                            )}

                            {msg.replyToMessageId && (() => {
                              const repliedMsg = messages.find(m => m.id === msg.replyToMessageId);
                              if (!repliedMsg) return null;

                              const replySnippet = repliedMsg.isRecalled
                                ? t('chat.message.recalled')
                                : repliedMsg.type === 'IMAGE'
                                ? `📷 ${t('chat.snippet.image')}`
                                : repliedMsg.type === 'VIDEO'
                                ? `🎬 ${t('chat.snippet.video')}`
                                : repliedMsg.type === 'VOICE'
                                ? `🎤 ${t('chat.snippet.voice')}`
                                : repliedMsg.type === 'MEDIA'
                                ? `📎 ${t('chat.snippet.file')}`
                                : repliedMsg.type === 'SHARE_CONTACT'
                                ? (() => { try { const c = JSON.parse(repliedMsg.text || '{}'); return `📇 ${c.fullName || t('share_contact.snippet')}`; } catch { return `📇 ${t('share_contact.snippet')}`; } })()
                                : repliedMsg.text?.length > 80
                                ? `${repliedMsg.text.slice(0, 80)}...`
                                : repliedMsg.text;

                              return (
                                <div
                                  onClick={() => {
                                    const el = document.getElementById(`msg-${repliedMsg.id}`);
                                    if (el) {
                                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      el.classList.add('highlight-msg');
                                      setTimeout(() => el.classList.remove('highlight-msg'), 1500);
                                    }
                                  }}
                                  className={`mb-1 px-2.5 py-1.5 rounded-md border-l-[3px] cursor-pointer transition-colors text-[12px] leading-snug ${msg.sender === 'Me'
                                    ? 'bg-black/5 dark:bg-white/5 border-white/40 dark:border-white/30 hover:bg-black/10 dark:hover:bg-white/10'
                                    : 'bg-black/5 dark:bg-white/5 border-[#0068FF]/40 hover:bg-black/10 dark:hover:bg-white/10'
                                  }`}
                                >
                                  <div className="font-bold text-[11px] text-[#0068FF] mb-0.5">{repliedMsg.sender === 'Me' ? t('common.you') : repliedMsg.sender}</div>
                                  <div className="text-[var(--sub-text)] truncate max-w-[280px]">{replySnippet}</div>
                                </div>
                              );
                            })()}

                            <div
                              className={`relative group w-fit min-w-[100px] ${msg.isRecalled
                                ? `px-3 pt-2 pb-2 rounded-md shadow-sm text-[15px] border border-dashed ${msg.sender === 'Me' ? 'border-gray-300 dark:border-gray-600' : 'border-gray-300 dark:border-gray-600'}`
                                : msg.type === 'MEDIA' || msg.type === 'IMAGE' || msg.type === 'VIDEO' || msg.type === 'SHARE_CONTACT'
                                ? ''
                                : `px-3 pt-2 pb-2 rounded-md shadow-sm text-[15px] border ${msg.sender === 'Me'
                                  ? 'bg-[var(--message-me-bg)] text-[var(--message-me-text)] border-[var(--message-me-border)]'
                                  : 'bg-[var(--message-other-bg)] text-[var(--message-other-text)] border-[var(--message-other-border)]'
                                }`
                              }`}
                              onContextMenu={(e) => openContextMenu(e, msg)}
                            >
                              <div className="leading-relaxed">
                                {msg.forwardedFromSenderName && !msg.isRecalled && (
                                  <div className="flex items-center gap-1 mb-1 text-[11px] text-[var(--sub-text)] italic">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l5-5 5 5M8 6v8a4 4 0 004 4h9" /></svg>
                                    <span>{t('chat.forward.forwarded_from', { name: msg.forwardedFromSenderName })}</span>
                                  </div>
                                )}

                                {msg.isRecalled ? (
                                  <div className="flex items-center gap-2 py-1 text-[var(--sub-text)] italic opacity-70">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                    <span className="text-[14px]">{t('chat.message.recalled')}</span>
                                  </div>
                                ) : editingMessageId === msg.id ? (
                                  <div className="flex flex-col gap-1.5 min-w-[280px]">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                      <span className="text-[11px] font-semibold text-[#0068FF]">{t('chat.confirm.edit_save')}</span>
                                    </div>
                                    <input
                                      type="text"
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleEditMessage(msg.id);
                                        if (e.key === 'Escape') {
                                          setEditingMessageId(null);
                                          setEditContent('');
                                        }
                                      }}
                                      className="w-full bg-[var(--hover-bg)] outline-none border border-[#0068FF]/30 focus:border-[#0068FF] rounded-md text-[15px] px-3 py-1.5 text-[var(--text)] transition-colors"
                                      autoFocus
                                    />
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <span className="text-[11px] text-[var(--sub-text)] mr-auto">Esc {t('chat.confirm.edit_cancel').toLowerCase()}</span>
                                      <button onClick={() => { setEditingMessageId(null); setEditContent(''); }} className="text-[12px] text-[var(--sub-text)] hover:text-[var(--text)] px-3 py-1 rounded-md hover:bg-[var(--hover-bg)] cursor-pointer transition-colors">{t('chat.confirm.edit_cancel')}</button>
                                      <button onClick={() => handleEditMessage(msg.id)} className="text-[12px] text-white bg-[#0068FF] hover:bg-[#0052CC] px-4 py-1 rounded-md font-semibold cursor-pointer shadow-sm transition-colors">{t('chat.confirm.edit_save')}</button>
                                    </div>
                                  </div>
                                ) : msg.type === 'IMAGE' || msg.type === 'VIDEO' ? (
                                  <div className="relative group/media-content w-fit max-w-full">
                                    {msg.type === 'IMAGE' ? (
                                      <div
                                        className={`relative w-full max-w-[320px] overflow-hidden bg-slate-100 shadow-sm ${msg.caption ? 'rounded-t-md' : 'rounded-md'}`}
                                        style={{ aspectRatio: resolveImageAspectRatio(msg) }}
                                      >
                                        <img
                                          src={msg.text}
                                          alt="Shared"
                                          className={`h-full w-full cursor-pointer object-cover transition-all hover:opacity-90 ${msg.isUploading ? 'blur-[2px] brightness-75' : ''}`}
                                          onClick={() => !msg.isUploading && setOpenedImageSrc(msg.text)}
                                        />
                                        <div className="absolute bottom-2 left-2 text-white/80 drop-shadow-md">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>
                                        </div>
                                        {msg.isUploading && (
                                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-md gap-2">
                                            <div className="relative w-12 h-12">
                                              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                                <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="3" />
                                                <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
                                                  strokeDasharray={`${2 * Math.PI * 20}`}
                                                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - (msg.uploadProgress ?? 0) / 100)}`}
                                                  className="transition-all duration-300"
                                                />
                                              </svg>
                                              <span className="absolute inset-0 flex items-center justify-center text-white text-[11px] font-semibold drop-shadow">
                                                {msg.uploadProgress ?? 0}%
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <video src={msg.text} controls className="max-w-[320px] max-h-[360px] rounded-md shadow-sm object-contain" />
                                    )}
                                    {msg.caption && (
                                      <div className={`px-2.5 py-1.5 text-[14px] leading-snug break-words rounded-b-md max-w-[320px] shadow-sm ${
                                        msg.sender === 'Me'
                                          ? 'bg-[var(--message-me-bg)] text-[var(--message-me-text)]'
                                          : 'bg-[var(--message-other-bg)] text-[var(--message-other-text)]'
                                      }`}>
                                        {msg.caption}
                                      </div>
                                    )}
                                  </div>
                                ) : msg.type === 'SHARE_CONTACT' ? (() => {
                                  let contact: any = {};
                                  try {
                                    contact = JSON.parse(msg.text || '{}');
                                  } catch {
                                    contact = {};
                                  }

                                  return (
                                    <div className="w-[320px] rounded-md overflow-hidden border border-[var(--border)] shadow-sm">
                                      <div className="relative bg-[#0068FF] px-5 pt-4 pb-5 min-h-[110px] overflow-hidden">
                                        <div className="absolute right-16 top-1/2 -translate-y-1/2 w-36 h-36 rounded-full border-[28px] border-white/10 pointer-events-none" />
                                        <div className="flex items-center gap-3 pr-28">
                                          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 border-white/30 bg-white/20 flex items-center justify-center">
                                            {contact.avatar ? (
                                              <img src={contact.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <span className="text-white font-bold text-2xl">{(contact.fullName || '?').charAt(0)}</span>
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-bold text-[16px] text-white break-words leading-tight">{contact.fullName || t('common.unknown_user')}</div>
                                            {contact.phoneNumber && (
                                              <div className="text-[13px] text-white/80 mt-1">{contact.phoneNumber}</div>
                                            )}
                                          </div>
                                        </div>
                                        {contact.userId && (
                                          <div className="absolute bottom-3 right-4 bg-white rounded-md p-1 w-20 h-20 flex items-center justify-center">
                                            <img
                                              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(contact.phoneNumber || contact.userId)}`}
                                              alt="QR"
                                              className="w-[72px] h-[72px] object-contain"
                                            />
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        className="w-full py-3 text-[15px] font-semibold text-[#0068FF] hover:bg-[var(--hover-bg)] transition-colors border-t border-[var(--border)] bg-[var(--card-bg)] cursor-pointer"
                                        onClick={() => {
                                          if (contact.userId) {
                                            toast.info(`${contact.fullName}${contact.phoneNumber ? ': ' + contact.phoneNumber : ''}`);
                                          }
                                        }}
                                      >
                                        {t('share_contact.message_btn')}
                                      </button>
                                    </div>
                                  );
                                })() : msg.type === 'MEDIA' ? (
                                  <div className={`border rounded-md p-3 flex items-center gap-3.5 min-w-[270px] hover:shadow-md transition-all cursor-pointer group/file relative ${msg.sender === 'Me' ? 'bg-[var(--message-me-bg)] border-[var(--message-me-border)]' : 'bg-[var(--message-other-bg)] border-[var(--message-other-border)]'}`} onClick={() => window.open(getPreviewUrl(msg.text), '_blank')}>
                                    <div className={`h-11 w-9 rounded-md flex items-center justify-center text-white font-bold text-[12px] shadow-sm shrink-0 ${['pdf'].includes(getFileExtension(msg.text).toLowerCase()) ? 'bg-[#F40F02]' : ['doc', 'docx'].includes(getFileExtension(msg.text).toLowerCase()) ? 'bg-[#0068FF]' : ['xls', 'xlsx'].includes(getFileExtension(msg.text).toLowerCase()) ? 'bg-[#217346]' : 'bg-gray-500'}`}>{getFileExtension(msg.text).toUpperCase().slice(0, 3) || 'FILE'}</div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-[14px] font-bold text-[var(--text)] truncate mb-0.5">{getFileNameFromUrl(msg.text)}</h4>
                                      <div className="flex items-center gap-1 text-[12px] text-[var(--sub-text)] opacity-70">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><path d="M17.5 11.5c.34-.33.74-.5 1.14-.5a1.88 1.88 0 1 1 0 3.75h-10a3.13 3.13 0 1 1 0-6.25c.34 0 .66.05.97.15A4.38 4.38 0 1 1 17.5 11.5Z" /></svg>
                                        <span>{t('chat.status.on_cloud')}</span>
                                      </div>
                                    </div>
                                    <button onClick={(e) => handleDownloadFile(e, msg.text, getFileNameFromUrl(msg.text))} className="h-8 w-8 rounded-lg flex items-center justify-center border border-[var(--border)] group-hover/file:bg-[var(--hover-bg)] transition-all shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg></button>
                                  </div>
                                ) : (
                                  <div className="pb-5 relative min-h-[48px] flex flex-col justify-between">
                                    <div className="block break-words whitespace-pre-wrap leading-normal text-[15px]">
                                      {msg.type === 'VOICE' ? (
                                        <VoicePlayer url={msg.text} duration={msg.voiceDuration} isMe={msg.sender === 'Me'} />
                                      ) : (
                                        <>
                                          {renderText(msg.text ?? '', msg.mentions)}
                                          {(msg.type === 'LINK' || (msg.text && msg.text.match(/(https?:\/\/[^\s]+)/))) && (
                                            <LinkPreview
                                              url={msg.type === 'LINK' ? msg.text : msg.text?.match(/(https?:\/\/[^\s]+)/)![0]}
                                              title={msg.linkTitle}
                                              description={msg.linkDescription}
                                              thumbnail={msg.linkThumbnail}
                                            />
                                          )}
                                        </>
                                      )}
                                    </div>
                                    <div className="absolute bottom-1.5 right-0 text-[11px] text-[var(--sub-text)] opacity-75 font-normal leading-none flex items-center gap-1">
                                      {msg.isEdited && <span className="italic opacity-70">{t('chat.status.edited')}</span>}
                                      {msg.time}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className={`absolute flex items-center gap-1 z-20 ${msg.type === 'IMAGE' || msg.type === 'VIDEO' ? 'bottom-0 right-2 translate-y-[50%]' : 'bottom-0 right-0 translate-y-[50%]'}`}>
                                {msg.reactions && msg.reactions.length > 0 && (
                                  <div onClick={(e) => { e.stopPropagation(); setReactionModalMessageId(msg.id); }} className="flex items-center cursor-pointer shadow-md rounded-full bg-[var(--card-bg)] border border-[var(--border)] px-2 py-1 h-[26px] hover:scale-105 transition-transform">
                                    <div className="flex -space-x-0.5 mr-1.5">
                                      {(() => {
                                        const counts: Record<string, number> = {};
                                        msg.reactions.forEach((reaction: any) => {
                                          counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
                                        });
                                        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([emoji], idx) => (
                                          <div key={`emoji-${idx}`} className="w-5 h-5 rounded-full flex items-center justify-center text-[14px] bg-[var(--card-bg)]">{emoji}</div>
                                        ));
                                      })()}
                                    </div>
                                    <span className="text-[13px] font-bold text-[var(--text)]">{msg.reactions.length}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {(() => {
                              const isLastMyMsg = msg.sender === 'Me' && (() => {
                                for (let k = index + 1; k < messages.length; k += 1) {
                                  if (messages[k].sender === 'Me') return false;
                                }
                                return true;
                              })();
                              const showReadStatus = msg.sender === 'Me' && isLastMyMsg;

                              const readersForThisMsg = showReadStatus
                                ? Object.values(readReceipts).filter(readReceipt => {
                                  const readerIdx = messages.findIndex(item => item.id === readReceipt.messageId);
                                  return readerIdx >= index;
                                })
                                : [];

                              const anyReaders = Object.keys(readReceipts).length > 0;
                              const showSection = msg.type !== 'TEXT' || showReadStatus;
                              if (!showSection) return null;

                              return (
                                <div className={`mt-6 flex items-center gap-2 ${msg.sender === 'Me' ? 'justify-end' : 'justify-start'}`}>
                                  {msg.type !== 'TEXT' && (
                                    <span className="text-[11px] text-[var(--sub-text)] opacity-100 font-medium">{msg.time}</span>
                                  )}
                                  {showReadStatus && (() => {
                                    if (readersForThisMsg.length > 0) {
                                      return (
                                        <div className="flex items-center gap-1">
                                          {readersForThisMsg.slice(0, 3).map((reader, idx) => (
                                            <div key={`reader-${idx}`} className="w-4 h-4 rounded-full overflow-hidden border border-white">
                                              {reader.avatarUrl ? (
                                                <img src={reader.avatarUrl} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold">{reader.displayName?.charAt(0)}</div>
                                              )}
                                            </div>
                                          ))}
                                          <div className="bg-blue-500/10 rounded-full px-2 py-0.5 flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /><polyline points="14 6 3 17" /></svg>
                                            <span>{t('chat.status.seen')}</span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    if (anyReaders) {
                                      return (
                                        <div className="bg-blue-500/10 rounded-full px-2 py-0.5 flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /><polyline points="14 6 3 17" /></svg>
                                          <span>{t('chat.status.seen')}</span>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="bg-black/5 dark:bg-white/10 rounded-full px-2 py-0.5 flex items-center gap-1 text-[11px] text-[var(--sub-text)] font-medium">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--sub-text)] opacity-70"><polyline points="20 6 9 17 4 12" /></svg>
                                        <span>{t('chat.status.sent')}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              );
                            })()}
                          </div>

                          {!msg.isRecalled && (
                            <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity h-fit ${msg.sender === 'Me' ? 'mr-0.5 flex-row-reverse self-center' : 'ml-0.5 self-center'}`}>
                              <div className="relative group/react">
                                <div className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer text-[13px] select-none leading-none">😊</div>
                                <div className={`absolute ${msg.sender === 'Me' ? 'right-0' : 'left-0'} bottom-full opacity-0 invisible group-hover/react:opacity-100 group-hover/react:visible transition-all duration-150 flex items-center gap-0.5 bg-[var(--card-bg)] rounded-full px-2 py-1 shadow-xl border border-[var(--border)] z-50 whitespace-nowrap`}>
                                  {(['👍', '❤️', '😂', '😲', '😭', '😡'] as const).map((emoji) => (
                                    <button key={emoji} onClick={(e) => { e.stopPropagation(); vm.handleReactMessage(String(msg.id), emoji); }} className="w-7 h-7 text-[20px] hover:scale-125 transition-transform cursor-pointer flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)]">{emoji}</button>
                                  ))}
                                </div>
                              </div>

                              <button title={t('chat.actions.reply')} onClick={() => { setReplyingTo({ id: msg.id, text: msg.text, sender: msg.sender, type: msg.type }); setTimeout(() => messageInputRef.current?.focus(), 50); }} className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg></button>
                              <button title={t('chat.actions.forward')} onClick={() => setForwardingMsg({ id: msg.id, text: msg.text, type: msg.type, sender: msg.sender })} className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 10l5-5 5 5M8 6v8a4 4 0 004 4h9" /></svg></button>
                              <button title={t('chat.actions.more')} onClick={(e) => openContextMenu(e, msg)} className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg></button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {typingUsers.length > 0 && (
        <div className="flex flex-col gap-1 px-4 py-2 bg-[var(--chat-bg)] border-t border-[var(--border)]/20 flex-shrink-0">
          {typingUsers.map((user) => (
            <div key={user.userId} className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-[var(--border)] flex items-center justify-center bg-blue-50">
                {user.userId === AI_TYPING_USER_ID ? (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.09 8.26 2 9.27l5 4.87L5.82 21 12 17.77 18.18 21l-1.18-6.86L22 9.27l-7.09-1.01L12 2z" /></svg>
                  </div>
                ) : user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-blue-600 font-bold text-[10px]">{user.displayName?.charAt(0)?.toUpperCase() || '?'}</span>
                )}
              </div>
              <span className="text-[13px] italic text-[var(--sub-text)] opacity-80 select-none">
                {user.displayName} {t('chat.typing.suffix_one')}...
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export const ChatMessageList = React.memo(ChatMessageListImpl);
