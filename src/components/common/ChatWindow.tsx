import React, { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  SearchIcon,
  StickerIcon,
  ImagePickerIcon,
  FilePickerIcon,
  EmojiIcon,
  SparklesIcon,
  LikeIcon,
  SendIcon,
  VideoPickerIcon,
  VoiceIcon
} from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';
import { StickerPicker } from '@/components/common/StickerPicker';
import { NicknameModal } from '@/components/common/NicknameModal';
import { ForwardModal } from '@/components/common/ForwardModal';
import { apiClient } from '@/services/api';
import { websocketService } from '@/services/websocketService';
import { friendService } from '@/services/friendService';
import { useInView } from 'react-intersection-observer';
import { StatusIndicator } from './StatusIndicator';

interface ChatWindowProps {
  onToggleSidebar: (type: 'info' | 'search') => void;
  activeSidebar: 'info' | 'search' | null;
  selectedChat: {
    id: string | number;
    name: string;
    isCloud?: boolean;
    isAi?: boolean;
    isGroup?: boolean;
    avatar?: string;
    isNew?: boolean;
    recipientId?: string;
    otherUserId?: string;
    isRequest?: boolean;
    conversationStatus?: string;
    nickname?: string;
  };
  currentUser?: any;
  onUpdateConversation?: (id: string | number, lastMsg: string, time?: string) => void;
  onSelectConversation?: (id: string | number) => void;
  onNicknameChange?: (id: string | number, nickname: string | null) => void;
  refreshTrigger?: number;
}

type AiAccessSettings = {
  allowFullDataAccess: boolean;
};

type AiThemeType = 'GENERAL' | 'SALES' | 'OFFICE' | 'GLOBAL' | 'CREATIVE' | 'STUDY' | 'DEV' | 'CODE_REVIEW';

const AI_ACCESS_SETTINGS_STORAGE_KEY = 'fruvia.ai.access-settings.v1';
const AI_THEME_STORAGE_KEY = 'fruvia.ai.theme.v1';
const AI_TYPING_USER_ID = 'FRUVIA_AI_ASSISTANT';

const getAiFullAccessGranted = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const raw = window.localStorage.getItem(AI_ACCESS_SETTINGS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<AiAccessSettings>;
    return Boolean(parsed.allowFullDataAccess);
  } catch {
    return false;
  }
};

const getAiThemeType = (): AiThemeType => {
  if (typeof window === 'undefined') return 'GENERAL';

  try {
    const raw = (window.localStorage.getItem(AI_THEME_STORAGE_KEY) || '').trim().toUpperCase();
    if (raw === 'WORK') return 'OFFICE';
    if (raw === 'CHILL') return 'CREATIVE';
    if (raw === 'JAPANESE') return 'GLOBAL';

    if (
      raw === 'DEV' ||
      raw === 'CODE_REVIEW' ||
      raw === 'SALES' ||
      raw === 'OFFICE' ||
      raw === 'GLOBAL' ||
      raw === 'CREATIVE' ||
      raw === 'STUDY'
    ) {
      return raw as AiThemeType;
    }

    return 'GENERAL';
  } catch {
    return 'GENERAL';
  }
};

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

const formatDateSeparator = (date?: Date, t?: (key: string) => string) => {
  if (!date) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = today.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t ? t('chat.date.today') : "Hôm nay";
  if (diffDays === 1) return t ? t('chat.date.yesterday') : "Hôm qua";
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export function ChatWindow({ onToggleSidebar, activeSidebar, selectedChat, currentUser, onUpdateConversation, onSelectConversation, onNicknameChange, refreshTrigger }: ChatWindowProps) {
  const { t, i18n } = useTranslation();
  const [message, setMessage] = React.useState("");
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const [pickerTab, setPickerTab] = React.useState<'sticker' | 'emoji' | 'gif'>('sticker');

  // Nickname state
  const [nickname, setNickname] = useState<string | null>(null);

  // AI send lock – prevents concurrent AI requests
  const [isSendingAi, setIsSendingAi] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; sender: string; type: string } | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Forward state
  const [forwardingMsg, setForwardingMsg] = useState<{ id: string; text: string; type: string; sender: string } | null>(null);

  // Message management states (Edit / Recall / Delete)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number; isMe: boolean; type: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'recall' | 'delete'; msgId: string } | null>(null);

  // Pinned messages state
  const [pinnedMessages, setPinnedMessages] = useState<{ id: string; messageId: string; content: string; senderName: string; messageType: string; pinnedAt: string }[]>([]);
  const [showPinnedList, setShowPinnedList] = useState(false);

  // Friend request state for stranger chats
  const [friendRequestStatus, setFriendRequestStatus] = useState<'loading' | 'none' | 'received' | 'sent' | 'friend'>('loading');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  useEffect(() => {
    const checkFriendStatus = async () => {
      const peerId = selectedChat.otherUserId || selectedChat.recipientId;
      if (!peerId || !currentUser?.id || selectedChat.isCloud || selectedChat.isAi || selectedChat.isGroup) {
        setFriendRequestStatus('none');
        return;
      }
      try {
        // Fetch independently to avoid one failure breaking all checks
        const [friendsResult, receivedResult, sentResult] = await Promise.allSettled([
          friendService.getFriends(),
          friendService.getReceivedRequests(),
          friendService.getSentRequests(),
        ]);

        // Unwrap safely — apiClient may return raw ApiResponse or unwrapped data
        const unwrap = (r: PromiseSettledResult<any>): any[] => {
          if (r.status !== 'fulfilled') return [];
          const v = r.value;
          if (Array.isArray(v)) return v;
          if (v && Array.isArray(v.data)) return v.data;
          return [];
        };
        const friends = unwrap(friendsResult);
        const received = unwrap(receivedResult);
        const sent = unwrap(sentResult);

        const isFriend = friends.some((f: any) => (f.user_id || f.userId || f.id) === peerId);
        if (isFriend) { setFriendRequestStatus('friend'); return; }
        const receivedReq = received.find((r: any) => (r.senderId || r.sender_id) === peerId);
        if (receivedReq) { setFriendRequestStatus('received'); setPendingRequestId(receivedReq.requestId); return; }
        const sentReq = sent.find((r: any) => (r.receiverId || r.receiver_id) === peerId);
        if (sentReq) { setFriendRequestStatus('sent'); return; }
        setFriendRequestStatus('none');
      } catch { setFriendRequestStatus('none'); }
    };
    setFriendRequestStatus('loading');
    checkFriendStatus();
  }, [selectedChat.otherUserId, selectedChat.recipientId, selectedChat.isCloud, selectedChat.isAi, selectedChat.isGroup, currentUser?.id]);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = React.useState(false);
  const [isFilePopoverOpen, setIsFilePopoverOpen] = React.useState(false);
  const [isUserDataModalOpen, setIsUserDataModalOpen] = useState(false);

  // Fetch nickname for current conversation member
  useEffect(() => {
    setNickname(selectedChat?.nickname || null);
    setReplyingTo(null);
  }, [selectedChat?.id, selectedChat?.nickname]);

  // Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingTimerRef = useRef<any>(null);
  const [isInitializingMic, setIsInitializingMic] = useState(false);
  const discardRef = useRef(false);

  const startRecording = async () => {
    if (isRecording || isInitializingMic) return;
    setIsInitializingMic(true);
    discardRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      mediaRecorder.onstop = async () => {
        if (discardRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const duration = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
        const { toast } = await import('sonner');

        if (duration < 1) {
          toast.error(t('chat.voice.too_short'));
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

        try {
          const uploadToast = toast.loading(t('chat.voice.sending'));

          const res = await apiClient.get<any>(`/messages/presigned-url?fileName=${encodeURIComponent(audioFile.name)}&fileType=${encodeURIComponent(audioFile.type)}`);
          const presignedUrl = typeof res === 'string' ? res : (res?.data || res?.url || res);

          await fetch(presignedUrl, {
            method: 'PUT',
            body: audioFile,
            headers: { 'Content-Type': audioFile.type }
          });

          const s3Url = presignedUrl.split('?')[0];
          await handleSendMessage(s3Url, 'VOICE', audioFile.name, audioFile.size, duration);

          toast.dismiss(uploadToast);
          toast.success(t('chat.voice.send_success'));
        } catch (err) {
          console.error('Voice upload error:', err);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      const { toast } = await import('sonner');
      toast.info(t('chat.voice.recording_hint'));
    } catch (err) {
      console.error('Microphone error:', err);
      const { toast } = await import('sonner');
      toast.error(t('chat.voice.mic_error'));
    } finally {
      setIsInitializingMic(false);
    }
  };

  const stopRecording = (discard = false) => {
    discardRef.current = discard;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Add these helper functions inside ChatWindow or as separate components
  const renderText = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
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
      return part;
    });
  };

  const LinkPreview = ({ url, title, thumbnail }: { url: string, title?: string, thumbnail?: string }) => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      return (
        <div
          className="mt-2 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border)] overflow-hidden flex flex-col cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }}
        >
          {thumbnail && (
            <div className="w-full h-32 overflow-hidden bg-gray-100 dark:bg-gray-800 border-b border-[var(--border)]">
              <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-2.5 flex flex-col gap-1">
            <div className="text-[13px] font-bold text-[var(--text)] line-clamp-2 leading-snug">
              {title || (url.length > 60 ? url.substring(0, 60) + '...' : url)}
            </div>
            <div className="text-[11px] text-[#0068FF] font-medium flex items-center gap-1.5 overflow-hidden">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              <span className="truncate">{domain}</span>
            </div>
          </div>
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  const VoicePlayer = ({ url, duration, isMe }: { url: string, duration?: number, isMe: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100);
      const handleEnded = () => { setIsPlaying(false); setProgress(0); };

      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('ended', handleEnded);
      return () => {
        audio.removeEventListener('timeupdate', updateProgress);
        audio.removeEventListener('ended', handleEnded);
      };
    }, []);

    const togglePlay = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPlaying) audioRef.current?.pause();
      else audioRef.current?.play();
      setIsPlaying(!isPlaying);
    };

    const formatDuration = (seconds?: number) => {
      if (!seconds) return "0:00";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
      <div className={`flex items-center gap-3 py-1.5 px-1 min-w-[200px] ${isMe ? 'text-white' : 'text-[var(--text)]'}`}>
        <audio ref={audioRef} src={url} className="hidden" />
        <button onClick={togglePlay} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[#0068FF]/10 text-[#0068FF] hover:bg-[#0068FF]/20'} cursor-pointer`}>
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" transform="translate(1, 0)"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <div className="flex-1 flex flex-col gap-1.5">
          <div className={`h-1 rounded-full relative ${isMe ? 'bg-white/30' : 'bg-black/10 dark:bg-white/10'}`}>
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${isMe ? 'bg-white' : 'bg-[#0068FF]'}`}
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
  };

  const [reactionModalMessageId, setReactionModalMessageId] = React.useState<string | number | null>(null);
  const [reactionModalEmojiTab, setReactionModalEmojiTab] = React.useState<string>('all');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleFileIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFilePopoverOpen(!isFilePopoverOpen);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
    setIsFilePopoverOpen(false);
  };

  const handleDownloadFile = async (e: React.MouseEvent, url: string, fileName: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed, opening in new tab:", err);
      window.open(url, '_blank');
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const { toast } = await import('sonner');
      const uploadToast = toast.loading(t('chat.upload.loading', { name: file.name }));
      const res = await apiClient.get<any>(`/messages/presigned-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`);
      const presignedUrl = typeof res === 'string' ? res : (res?.data || res?.url || res);

      if (!presignedUrl || typeof presignedUrl !== 'string') throw new Error('Invalid presigned URL');

      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!response.ok) throw new Error('S3 upload failed');

      const s3Url = presignedUrl.split('?')[0];
      let msgType = 'MEDIA';
      if (file.type.startsWith('image/')) msgType = 'IMAGE';
      else if (file.type.startsWith('video/')) msgType = 'VIDEO';

      // Extract video duration if it's a video
      let videoDur: number | undefined;
      if (msgType === 'VIDEO') {
        videoDur = await new Promise<number>((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            URL.revokeObjectURL(video.src);
            resolve(Math.round(video.duration));
          };
          video.onerror = () => resolve(0);
          video.src = URL.createObjectURL(file);
        });
      }

      await handleSendMessage(s3Url, msgType, file.name, file.size, undefined, videoDur);
      toast.dismiss(uploadToast);
      toast.success(t('chat.upload.success'));
    } catch (error) {
      console.error('Upload error:', error);
      const { toast } = await import('sonner');
      toast.error(t('chat.upload.error'));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleVideoClick = () => {
    videoInputRef.current?.click();
    setIsFilePopoverOpen(false);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const [messages, setMessages] = React.useState<any[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = React.useState<{ userId: string; displayName: string; avatarUrl?: string }[]>([]);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastTypingSentRef = useRef<number>(0);

  // Subscribe to typing events
  React.useEffect(() => {
    if (!selectedChat?.id || selectedChat.isNew) return;

    const typingSub = websocketService.subscribe(
      `/topic/chat/${selectedChat.id}/typing`,
      (msg) => {
        try {
          const data = JSON.parse(msg.body);
          if (data.userId === currentUser?.id) return; // Ignore self

          const resolvedDisplayName = data.displayName
            || (data.userId === AI_TYPING_USER_ID ? (selectedChat.name || 'Fruvia AI') : t('common.unknown_user'));

          if (data.typing) {
            setTypingUsers(prev => {
              if (prev.some(u => u.userId === data.userId)) return prev;
              return [...prev, { userId: data.userId, displayName: resolvedDisplayName, avatarUrl: data.avatarUrl }];
            });
            // Auto-remove after 3s if no new typing event
            const existing = typingTimeoutRef.current.get(data.userId);
            if (existing) clearTimeout(existing);
            typingTimeoutRef.current.set(data.userId, setTimeout(() => {
              setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
              typingTimeoutRef.current.delete(data.userId);
            }, 3000));
          } else {
            setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
            const existing = typingTimeoutRef.current.get(data.userId);
            if (existing) { clearTimeout(existing); typingTimeoutRef.current.delete(data.userId); }
          }
        } catch (e) { /* ignore */ }
      }
    );

    return () => {
      typingSub?.unsubscribe();
      setTypingUsers([]);
      typingTimeoutRef.current.forEach(t => clearTimeout(t));
      typingTimeoutRef.current.clear();
    };
  }, [selectedChat?.id, selectedChat?.isNew, selectedChat?.name, currentUser?.id, t]);

  // Auto-scroll when someone starts typing
  React.useEffect(() => {
    if (typingUsers.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [typingUsers.length]);

  // Send typing indicator (throttled to once per 2s)
  const sendTypingIndicator = React.useCallback(() => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi || !currentUser?.id) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    websocketService.send(`/app/chat/${selectedChat.id}/typing`, {
      userId: currentUser.id,
      displayName: currentUser.full_name || currentUser.display_name || 'User',
      typing: true,
    });
  }, [selectedChat?.id, selectedChat?.isAi, currentUser?.id]);

  const sendStopTypingIndicator = React.useCallback(() => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi || !currentUser?.id) return;
    websocketService.send(`/app/chat/${selectedChat.id}/typing`, {
      userId: currentUser.id,
      displayName: currentUser.full_name || currentUser.display_name || 'User',
      typing: false,
    });
  }, [selectedChat?.id, selectedChat?.isAi, selectedChat?.isNew, currentUser?.id]);

  // Read receipts state: map of userId -> { displayName, avatarUrl, messageId }
  const [readReceipts, setReadReceipts] = React.useState<Record<string, { displayName: string; avatarUrl?: string; messageId: string }>>({});
  const lastSentReadRef = useRef<string | null>(null);

  // Load initial read status from DB when opening a conversation
  React.useEffect(() => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi) return;
    const fetchReadStatus = async () => {
      try {
        const res = await apiClient.get(`/conversations/${selectedChat.id}/read-status`);
        const data = res?.success ? res.data : (Array.isArray(res) ? res : []);
        if (Array.isArray(data)) {
          const initial: Record<string, { displayName: string; avatarUrl?: string; messageId: string }> = {};
          data.forEach((entry: any) => {
            if (entry.userId && entry.messageId) {
              initial[entry.userId] = {
                displayName: entry.displayName || 'User',
                avatarUrl: entry.avatarUrl || undefined,
                messageId: entry.messageId,
              };
            }
          });
          setReadReceipts(initial);
        }
      } catch (e) {
        console.error("Failed to fetch read status:", e);
      }
    };
    fetchReadStatus();
  }, [selectedChat?.id, selectedChat?.isAi]);

  // Subscribe to read receipt events (real-time updates)
  React.useEffect(() => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi) return;

    const readSub = websocketService.subscribe(
      `/topic/chat/${selectedChat.id}/read`,
      (msg) => {
        try {
          const data = JSON.parse(msg.body);
          if (data.userId === currentUser?.id) return;
          setReadReceipts(prev => ({
            ...prev,
            [data.userId]: {
              displayName: data.displayName,
              avatarUrl: data.avatarUrl,
              messageId: data.messageId,
            },
          }));
        } catch (e) { /* ignore */ }
      }
    );

    return () => {
      readSub?.unsubscribe();
      lastSentReadRef.current = null;
    };
  }, [selectedChat?.id, selectedChat?.isAi, currentUser?.id]);

  // Send read receipt when new messages arrive or conversation is opened
  const sendReadReceipt = React.useCallback((messageId: string) => {
    if (!selectedChat?.id || selectedChat.isNew || selectedChat.isAi || !currentUser?.id) return;
    if (lastSentReadRef.current === messageId) return;
    lastSentReadRef.current = messageId;
    websocketService.send(`/app/chat/${selectedChat.id}/read`, {
      userId: currentUser.id,
      displayName: currentUser.full_name || currentUser.display_name || 'User',
      avatarUrl: currentUser.avatar_url || '',
      messageId,
    });
  }, [selectedChat?.id, selectedChat?.isAi, currentUser?.id]);

  // Auto-send read receipt when messages load or new messages arrive
  React.useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender !== 'Me') {
      sendReadReceipt(lastMsg.id);
    }
  }, [messages, sendReadReceipt]);

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0 });

  const scrollToBottom = (instant?: boolean) => {
    const container = scrollContainerRef.current;
    if (container) {
      if (instant) {
        container.scrollTop = container.scrollHeight;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  React.useEffect(() => {
    const fetchMessages = async () => {
      if (selectedChat?.id) {
        if (selectedChat.isNew) {
          setMessages([]);
          setHasMore(false);
          setIsLoadingMore(false);
          setIsInitialLoading(false);
          return;
        }

        try {
          setIsInitialLoading(true);
          setIsLoadingMore(true);
          const res = await apiClient.get(`/messages/conversation/${selectedChat.id}?size=20&page=0`);
          let items: any[] = [];
          let hasMoreData = false;

          if (res.success && res.data) {
            items = Array.isArray(res.data) ? res.data : (res.data.content || []);
            hasMoreData = res.data.last === false;
          } else if (res.content) {
            items = res.content;
            hasMoreData = res.last === false;
          }

          const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          const mapped = sorted.map(m => ({
            id: m.messageId || m.id,
            text: m.content,
            type: m.messageType || 'TEXT',
            linkTitle: m.linkTitle,
            linkThumbnail: m.linkThumbnail,
            voiceDuration: m.voiceDuration,
            videoDuration: m.videoDuration,
            fileName: m.fileName,
            fileSize: m.fileSize,
            replyToMessageId: m.replyToMessageId || null,
            sender: m.senderId === 'SYSTEM' ? 'SYSTEM' : m.senderId === currentUser?.id ? 'Me' : m.senderName,
            senderId: m.senderId,
            time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
            avatar: m.senderAvatarUrl,
            reactions: (m.reactions || []).map((r: any) => {
              let emoji = '👍';
              switch (r.icon || r.reactionType) {
                case 'LOVE': emoji = '❤️'; break;
                case 'HAHA': emoji = '😂'; break;
                case 'WOW': emoji = '😲'; break;
                case 'SAD': emoji = '😭'; break;
                case 'ANGRY': emoji = '😡'; break;
                default: emoji = '👍';
              }
              return { emoji, userId: r.userId, id: r.id || r.reactionId, userName: r.userName, userAvatar: r.userAvatar };
            }),
            rawDate: m.createdAt ? new Date(m.createdAt) : undefined,
            isEdited: m.isEdited || false,
            isRecalled: m.isRecalled || false,
            forwardedFromSenderName: m.forwardedFromSenderName || null,
          }));

          setMessages(mapped);
          setHasMore(hasMoreData);
          setIsLoadingMore(false);
          setIsInitialLoading(false);
          setShouldScrollToBottom(true);
        } catch (e) {
          console.error("Failed to fetch messages:", e);
          setIsLoadingMore(false);
          setIsInitialLoading(false);
        }
      }
    };
    fetchMessages();

    let subscription: any = null;
    if (selectedChat?.id && !selectedChat.isNew) {
      const topic = `/topic/chat/${selectedChat.id}`;
      subscription = websocketService.subscribe(topic, (msg) => {
        try {
          const raw = JSON.parse(msg.body);
          // Backend broadcasts MessageAndConversationResponse { message, conversation }
          // Unwrap if needed
          const newMsg = raw.message || raw;

          if (newMsg.type === 'REACTION_UPDATE') {
            setMessages(prev => prev.map(m => {
              if (m.id === newMsg.messageId) {
                let emoji = null;
                switch (newMsg.reactionType) {
                  case 'LIKE': emoji = '👍'; break;
                  case 'LOVE': emoji = '❤️'; break;
                  case 'HAHA': emoji = '😂'; break;
                  case 'WOW': emoji = '😲'; break;
                  case 'SAD': emoji = '😭'; break;
                  case 'ANGRY': emoji = '😡'; break;
                }
                const newReactions = m.reactions ? [...m.reactions] : [];
                if (emoji && newMsg.action !== 'REMOVE') {
                  newReactions.push({ emoji, userId: newMsg.userId, id: newMsg.reactionId, userName: newMsg.userName, userAvatar: newMsg.userAvatar });
                }
                return { ...m, reactions: newReactions };
              }
              return m;
            }));
            return;
          }

          // Handle MESSAGE_EDIT event
          if (newMsg.type === 'MESSAGE_EDIT') {
            setMessages(prev => prev.map(m => {
              if (m.id === newMsg.messageId) {
                return { ...m, text: newMsg.content, isEdited: true };
              }
              return m;
            }));
            return;
          }

          // Handle MESSAGE_RECALL event
          if (newMsg.type === 'MESSAGE_RECALL') {
            setMessages(prev => prev.map(m => {
              if (m.id === newMsg.messageId) {
                return { ...m, isRecalled: true, text: '' };
              }
              return m;
            }));
            if (onUpdateConversation) {
              onUpdateConversation(selectedChat.id, t('chat.message.recalled'));
            }
            return;
          }

          // Handle MESSAGE_PIN / MESSAGE_UNPIN events
          if (newMsg.type === 'MESSAGE_PIN' || newMsg.type === 'MESSAGE_UNPIN') {
            fetchPinnedMessages(String(selectedChat.id));
            return;
          }

          if (onUpdateConversation) {
            onUpdateConversation(selectedChat.id, getSnippet(newMsg.content, newMsg.messageType), newMsg.createdAt ? new Date(newMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined);
          }
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.messageId || m.id === newMsg.id);
            if (exists) return prev;

            const mappedMsg = {
              id: newMsg.messageId || newMsg.id,
              text: newMsg.content,
              type: newMsg.messageType || 'TEXT',
              replyToMessageId: newMsg.replyToMessageId || null,
              sender: newMsg.senderId === 'SYSTEM' ? 'SYSTEM' : newMsg.senderId === currentUser?.id ? 'Me' : (newMsg.senderId === AI_TYPING_USER_ID ? (newMsg.senderName || 'Fruvia AI') : newMsg.senderName),
              senderId: newMsg.senderId,
              time: newMsg.createdAt ? new Date(newMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
              avatar: newMsg.senderAvatarUrl,
              reactions: [],
              rawDate: newMsg.createdAt ? new Date(newMsg.createdAt) : new Date(),
              isEdited: newMsg.isEdited || false,
              isRecalled: newMsg.isRecalled || false,
              forwardedFromSenderName: newMsg.forwardedFromSenderName || null,
            };
            setShouldScrollToBottom(true);
            return [...prev, mappedMsg];
          });
        } catch (e) {
          console.error("Failed to parse incoming WS message:", e);
        }
      });
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [selectedChat?.id, currentUser?.id, refreshTrigger]);

  const [shouldScrollToBottom, setShouldScrollToBottom] = React.useState(false);
  const isInitialLoadRef = useRef(true);

  // Reset initial load flag when conversation changes
  React.useEffect(() => {
    isInitialLoadRef.current = true;
    setIsInitialLoading(true);
  }, [selectedChat?.id]);

  React.useLayoutEffect(() => {
    if (shouldScrollToBottom) {
      const container = scrollContainerRef.current;
      if (container) {
        if (isInitialLoadRef.current) {
          // Flag to suppress scrollbar visibility during programmatic scroll
          container.dataset.programmaticScroll = '1';
          container.scrollTop = container.scrollHeight;
          // Remove flag after scroll event fires
          requestAnimationFrame(() => { delete container.dataset.programmaticScroll; });
          isInitialLoadRef.current = false;
        } else {
          // Smooth scroll for new incoming messages
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
      setShouldScrollToBottom(false);
    }
  }, [messages, shouldScrollToBottom]);

  const loadMoreMessages = async () => {
    if (!selectedChat?.id || isLoadingMore || !hasMore || messages.length === 0) return;

    try {
      setIsLoadingMore(true);
      const oldestMessageId = messages[0].id;
      const scrollContainer = scrollContainerRef.current;
      const previousScrollHeight = scrollContainer?.scrollHeight || 0;

      const res = await apiClient.get(`/messages/conversation/${selectedChat.id}?beforeId=${oldestMessageId}&size=20`);
      let items: any[] = [];
      let hasMoreData = false;

      if (res.success && res.data) {
        items = Array.isArray(res.data) ? res.data : (res.data.content || []);
        hasMoreData = res.data.last === false;
      } else if (res.content) {
        items = res.content;
        hasMoreData = res.last === false;
      }

      if (items.length > 0) {
        const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const mappedOldItems = sorted.map(m => ({
          id: m.messageId || m.id,
          text: m.content,
          type: m.messageType || 'TEXT',
          replyToMessageId: m.replyToMessageId || null,
          sender: m.senderId === 'SYSTEM' ? 'SYSTEM' : m.senderId === currentUser?.id ? 'Me' : m.senderName,
          senderId: m.senderId,
          time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
          avatar: m.senderAvatarUrl,
          reactions: (m.reactions || []).map((r: any) => {
            let emoji = '👍';
            switch (r.icon || r.reactionType) {
              case 'LOVE': emoji = '❤️'; break;
              case 'HAHA': emoji = '😂'; break;
              case 'WOW': emoji = '😲'; break;
              case 'SAD': emoji = '😭'; break;
              case 'ANGRY': emoji = '😡'; break;
              default: emoji = '👍';
            }
            return { emoji, userId: r.userId, id: r.id || r.reactionId, userName: r.userName, userAvatar: r.userAvatar };
          }),
          rawDate: m.createdAt ? new Date(m.createdAt) : undefined,
          isEdited: m.isEdited || false,
          isRecalled: m.isRecalled || false,
          forwardedFromSenderName: m.forwardedFromSenderName || null,
        }));

        setMessages(prev => {
          const prevIds = new Set(prev.map(m => m.id));
          const uniqueOldItems = mappedOldItems.filter(m => !prevIds.has(m.id));
          return [...uniqueOldItems, ...prev];
        });
        setHasMore(hasMoreData);

        setTimeout(() => {
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight - previousScrollHeight;
          }
        }, 0);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error("Failed to load more:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  React.useEffect(() => {
    if (inView && hasMore && !isLoadingMore && messages.length > 0) {
      loadMoreMessages();
    }
  }, [inView]);

  const getSnippet = (content: string, messageType?: string) => {
    switch (messageType) {
      case 'IMAGE': return t('chat.snippet.image');
      case 'VIDEO': return t('chat.snippet.video');
      case 'MEDIA': return t('chat.snippet.file');
      case 'VOICE': return t('chat.snippet.voice');
      case 'STICKER': return t('chat.snippet.sticker');
      case 'SYSTEM': return content;
      default: return content;
    }
  };

  const handleSendMessage = async (customContent?: string, msgType: string = 'TEXT', fileName?: string, fileSize?: number, voiceDuration?: number, videoDuration?: number) => {
    const contentToUse = customContent || message?.trim();
    if (contentToUse && selectedChat?.id) {
      try {
        if (!customContent) setMessage("");

        if (selectedChat.isAi) {
          if (isSendingAi) return; // Prevent concurrent AI requests
          setIsSendingAi(true);
          const locale = (i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
          const tempUserMessageId = `temp-ai-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

          // Optimistic render: show user's message immediately, do not wait for AI roundtrip.
          setMessages(prev => ([
            ...prev,
            {
              id: tempUserMessageId,
              text: contentToUse,
              type: msgType,
              replyToMessageId: replyingTo?.id || null,
              sender: 'Me',
              senderId: currentUser?.id,
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
              reactions: [],
              rawDate: new Date(),
              isEdited: false,
              isRecalled: false,
              forwardedFromSenderName: null,
            }
          ]));
          setShouldScrollToBottom(true);
          setReplyingTo(null);

          setTypingUsers(prev => {
            if (prev.some(u => u.userId === AI_TYPING_USER_ID)) return prev;
            return [...prev, { userId: AI_TYPING_USER_ID, displayName: selectedChat.name || t('chat.ai_name'), avatarUrl: undefined }];
          });

          const aiPayload: any = {
            content: contentToUse,
            useRag: true,
            language: locale.startsWith('en') ? 'en' : 'vi',
            fullAccessGranted: getAiFullAccessGranted(),
            themeType: getAiThemeType(),
          };
          if (!selectedChat.isNew) {
            aiPayload.conversationId = selectedChat.id.toString();
          }

          try {
            const aiRes = await apiClient.post<any>('/messages/ai', aiPayload);
            const aiData = aiRes?.success ? aiRes.data : aiRes;
            const userMessage = aiData?.userMessage;
            const imageMessage = aiData?.imageMessage;
            const assistantMessage = aiData?.assistantMessage;
            const aiConversation = aiData?.conversation;
            const finalConvId = aiConversation?.conversationId || aiConversation?.id || selectedChat.id;

            if (onSelectConversation && finalConvId !== selectedChat.id) {
              onSelectConversation(finalConvId);
            }

            if (onUpdateConversation && assistantMessage?.content) {
              onUpdateConversation(
                finalConvId,
                getSnippet(assistantMessage.content, assistantMessage.messageType || 'TEXT'),
                new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
              );
            }

            setMessages(prev => {
              let next = [...prev];

              if (userMessage) {
                const userMessageId = userMessage.messageId || userMessage.id;
                next = next.map(m => {
                  if (m.id !== tempUserMessageId) return m;
                  return {
                    ...m,
                    id: userMessageId || m.id,
                    text: userMessage.content ?? m.text,
                    type: userMessage.messageType || m.type,
                    senderId: userMessage.senderId || m.senderId,
                    avatar: userMessage.senderAvatarUrl,
                    isEdited: userMessage.isEdited || false,
                    isRecalled: userMessage.isRecalled || false,
                    forwardedFromSenderName: userMessage.forwardedFromSenderName || null,
                    rawDate: userMessage.createdAt ? new Date(userMessage.createdAt) : m.rawDate,
                  };
                });
              }

              if (imageMessage) {
                const imageMessageId = imageMessage.messageId || imageMessage.id;
                const exists = next.some(m => m.id === imageMessageId);
                if (!exists) {
                  next.push({
                    id: imageMessageId,
                    text: imageMessage.content,
                    type: imageMessage.messageType || 'IMAGE',
                    replyToMessageId: imageMessage.replyToMessageId || null,
                    sender: imageMessage.senderName || 'Fruvia AI',
                    senderId: imageMessage.senderId,
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                    avatar: imageMessage.senderAvatarUrl,
                    reactions: [],
                    rawDate: imageMessage.createdAt ? new Date(imageMessage.createdAt) : new Date(),
                    isEdited: imageMessage.isEdited || false,
                    isRecalled: imageMessage.isRecalled || false,
                    forwardedFromSenderName: imageMessage.forwardedFromSenderName || null,
                  });
                }
              }

              if (assistantMessage) {
                const assistantMessageId = assistantMessage.messageId || assistantMessage.id;
                const exists = next.some(m => m.id === assistantMessageId);
                if (!exists) {
                  next.push({
                    id: assistantMessageId,
                    text: assistantMessage.content,
                    type: assistantMessage.messageType || 'TEXT',
                    replyToMessageId: assistantMessage.replyToMessageId || null,
                    sender: assistantMessage.senderName || 'Fruvia AI',
                    senderId: assistantMessage.senderId,
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                    avatar: assistantMessage.senderAvatarUrl,
                    reactions: [],
                    rawDate: assistantMessage.createdAt ? new Date(assistantMessage.createdAt) : new Date(),
                    isEdited: assistantMessage.isEdited || false,
                    isRecalled: assistantMessage.isRecalled || false,
                    forwardedFromSenderName: assistantMessage.forwardedFromSenderName || null,
                  });
                }
              }

              return next;
            });

            setShouldScrollToBottom(true);
          } catch (aiError: any) {
            console.error('AI send failed', aiError);
            // Keep the user message (it's already saved in backend) and show an error AI response
            const errorText = aiError?.response?.data?.message
              || (locale.startsWith('en')
                ? 'Sorry, AI is temporarily unavailable. Please try again in a moment.'
                : 'Xin lỗi, AI tạm thời không phản hồi được. Bạn thử lại sau vài giây nhé.');
            setMessages(prev => [
              ...prev,
              {
                id: `ai-error-${Date.now()}`,
                text: errorText,
                type: 'TEXT',
                replyToMessageId: null,
                sender: 'Fruvia AI',
                senderId: AI_TYPING_USER_ID,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                reactions: [],
                rawDate: new Date(),
                isEdited: false,
                isRecalled: false,
                forwardedFromSenderName: null,
              }
            ]);
            setShouldScrollToBottom(true);
          } finally {
            setIsSendingAi(false);
            setTypingUsers(prev => prev.filter(u => u.userId !== AI_TYPING_USER_ID));
            const existing = typingTimeoutRef.current.get(AI_TYPING_USER_ID);
            if (existing) {
              clearTimeout(existing);
              typingTimeoutRef.current.delete(AI_TYPING_USER_ID);
            }
          }
          return;
        }

        sendStopTypingIndicator();

        const isNewConv = !!selectedChat.isNew;
        const payload: any = {
          content: contentToUse,
          messageType: msgType,
          fileName,
          fileSize,
          voiceDuration,
          videoDuration,
          replyToMessageId: replyingTo?.id || undefined
        };

        if (isNewConv) {
          payload.recipientId = selectedChat.recipientId;
        } else {
          payload.conversationId = selectedChat.id.toString();
        }

        const res = await apiClient.post<any>('/messages', payload);
        const data = res.success ? res.data : res;

        // Backend returns MessageAndConversationResponse if conversation was created
        const newMsg = data.message || data;
        const newConv = data.conversation;

        if (newMsg?.messageId || newMsg?.id) {
          const currentId = selectedChat.id;
          const finalConvId = newConv ? (newConv.conversationId || newConv.id) : currentId;

          if (isNewConv && newConv && onSelectConversation) {
            onSelectConversation(finalConvId);
          }

          if (onUpdateConversation) {
            onUpdateConversation(finalConvId, getSnippet(newMsg.content, newMsg.messageType || msgType), new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }));
          }

          setMessages(prev => {
            if (prev.some(m => (m.id === newMsg.messageId || m.id === newMsg.id))) return prev;
            setShouldScrollToBottom(true);
            return [...prev, {
              id: newMsg.messageId || newMsg.id,
              text: newMsg.content,
              type: newMsg.messageType || msgType,
              replyToMessageId: newMsg.replyToMessageId || replyingTo?.id || null,
              sender: 'Me',
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
              reactions: [],
              rawDate: new Date()
            }];
          });
          setReplyingTo(null);
        }
      } catch (e) {
        console.error("Send failed", e);
      }
    }
  };

  const togglePicker = (tab: 'sticker' | 'emoji' | 'gif') => {
    if (isPickerOpen && pickerTab === tab) setIsPickerOpen(false);
    else { setPickerTab(tab); setIsPickerOpen(true); }
  };

  const onSelectSticker = (sticker: any) => {
    if (typeof sticker === 'string') setMessage(prev => prev + sticker);
  };

  const handleReactMessage = async (messageId: string, emoji: string) => {
    try {
      let reactionType = 'LIKE';
      switch (emoji) {
        case '👍': reactionType = 'LIKE'; break;
        case '❤️': reactionType = 'LOVE'; break;
        case '😂': reactionType = 'HAHA'; break;
        case '😲': reactionType = 'WOW'; break;
        case '😭': reactionType = 'SAD'; break;
        case '😡': reactionType = 'ANGRY'; break;
      }
      await apiClient.post(`/messages/${messageId}/react`, { reactionType });
    } catch (e) { console.error("React failed", e); }
  };

  // === Message management handlers ===
  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;
    try {
      await apiClient.put(`/messages/${messageId}?content=${encodeURIComponent(editContent.trim())}`, {});
      setEditingMessageId(null);
      setEditContent('');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('chat.message.edit_error');
      toast.error(msg);
    }
  };

  const handleRecallMessage = async (messageId: string) => {
    try {
      await apiClient.post(`/messages/${messageId}/recall`, {});
      setConfirmDialog(null);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('chat.message.recall_error');
      toast.error(msg);
      setConfirmDialog(null);
    }
  };

  const handleDeleteLocal = async (messageId: string) => {
    try {
      await apiClient.delete(`/messages/${messageId}/local`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setConfirmDialog(null);
      toast.success(t('chat.message.delete_local_success'));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('chat.message.delete_error');
      toast.error(msg);
      setConfirmDialog(null);
    }
  };

  const startEditMessage = (msg: any) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.text);
    setContextMenu(null);
  };

  const openContextMenu = (e: React.MouseEvent, msg: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      msgId: msg.id,
      x: e.clientX,
      y: e.clientY,
      isMe: msg.sender === 'Me',
      type: msg.type,
    });
  };

  // === Pinned messages handlers ===
  const fetchPinnedMessages = async (convId: string) => {
    try {
      const res: any = await apiClient.get(`/messages/conversations/${convId}/pinned`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setPinnedMessages(list.map((p: any) => ({
        id: p.id,
        messageId: p.messageId,
        content: p.content,
        senderName: p.senderName,
        messageType: p.messageType,
        pinnedAt: p.pinnedAt,
      })));
    } catch {
      setPinnedMessages([]);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      await apiClient.post(`/messages/${messageId}/pin`, {});
      toast.success(t('chat.pin.pin_success'));
      if (selectedChat?.id) fetchPinnedMessages(String(selectedChat.id));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('chat.pin.pin_error');
      toast.error(msg);
    }
    setContextMenu(null);
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      await apiClient.delete(`/messages/${messageId}/pin`);
      toast.success(t('chat.pin.unpin_success'));
      if (selectedChat?.id) fetchPinnedMessages(String(selectedChat.id));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('chat.pin.unpin_error');
      toast.error(msg);
    }
    setContextMenu(null);
  };

  useEffect(() => {
    if (selectedChat?.id && !selectedChat.isNew) {
      fetchPinnedMessages(String(selectedChat.id));
    } else {
      setPinnedMessages([]);
    }
    setShowPinnedList(false);
  }, [selectedChat?.id]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] transition-colors duration-200">
      {/* HEADER */}
      <div className="h-[76px] bg-[var(--card-bg)] border-b border-[var(--border)] px-5 flex items-center justify-between shadow-sm flex-shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-4">
          {selectedChat.isAi ? (
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
              <SparklesIcon size={24} />
            </div>
          ) : selectedChat.isCloud ? (
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-[#0068FF] font-bold shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L10 13.17l7.59-7.59L19 7l-8 9z" /></svg>
            </div>
          ) : selectedChat.avatar ? (
            <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 relative">
              <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" />
              {selectedChat.otherUserId && (
                <StatusIndicator userId={selectedChat.otherUserId} dotOnly dotSize={12} className="absolute bottom-0 right-0" />
              )}
            </div>
          ) : (
            <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 relative">
              <span className="text-[#0068FF] font-bold text-lg">{selectedChat.name?.charAt(0) || '?'}</span>
              {selectedChat.otherUserId && (
                <StatusIndicator userId={selectedChat.otherUserId} dotOnly dotSize={12} className="absolute bottom-0 right-0" />
              )}
            </div>
          )}
          <div className="min-w-0 group/info cursor-pointer flex items-center gap-2">
            <div>
              <h3 className="text-[18px] font-bold leading-none mb-1.5 text-[var(--text)] truncate flex items-center gap-1.5">
                {nickname || selectedChat.name}
                <button onClick={() => setIsNicknameModalOpen(true)} className="p-1 hover:bg-[var(--hover-bg)] rounded-md opacity-0 group-hover/info:opacity-100 transition-all text-gray-400 hover:text-[var(--text)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
              </h3>
              <p className="text-[13px] text-[var(--sub-text)] truncate">
                {selectedChat.isAi
                  ? t('chat.ai_subheading')
                  : selectedChat.isCloud
                  ? t('chat.cloud_subheading')
                  : selectedChat.otherUserId
                    ? undefined
                    : (selectedChat.isGroup ? `${t('chat.header.group_prefix')} · ${selectedChat.name}` : '')}
              </p>
              {!selectedChat.isCloud && !selectedChat.isAi && selectedChat.otherUserId && (
                <StatusIndicator userId={selectedChat.otherUserId} />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[var(--sub-text)] pr-2 shrink-0">
          {!selectedChat.isCloud && !selectedChat.isAi && (
            <>
              <button className="cursor-pointer transition-all p-1.5 rounded-md hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70" title={t('chat.header.add_to_group')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
              </button>
              <button className="cursor-pointer transition-all p-1.5 rounded-md hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70" title={t('chat.header.video_call')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
              </button>
            </>
          )}
          <button onClick={() => onToggleSidebar('search')} className={`cursor-pointer transition-all p-1.5 rounded-md ${activeSidebar === 'search' ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}><SearchIcon size={24} /></button>
          <button onClick={() => onToggleSidebar('info')} className={`cursor-pointer transition-all p-1.5 rounded-md ${activeSidebar === 'info' ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg></button>
        </div>
      </div>

      {/* STRANGER WARNING BANNER */}
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
                onClick={async () => {
                  if (!pendingRequestId) return;
                  setFriendActionLoading(true);
                  try {
                    await friendService.acceptRequest(pendingRequestId);
                    toast.success(t('chat.friend.accept_success'));
                    setFriendRequestStatus('friend');
                  } catch { toast.error(t('chat.friend.accept_error')); }
                  setFriendActionLoading(false);
                }}
                className="px-3 py-1.5 bg-[#0068FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {t('chat.friend.accept_btn')}
              </button>
            ) : friendRequestStatus === 'sent' ? (
              <span className="text-[12px] text-amber-700 dark:text-amber-300 italic whitespace-nowrap">{t('chat.friend.sent_label')}</span>
            ) : (
              <button
                disabled={friendActionLoading}
                onClick={async () => {
                  const peerId = selectedChat.otherUserId || selectedChat.recipientId;
                  if (!peerId) return;
                  setFriendActionLoading(true);
                  try {
                    await friendService.sendRequest(peerId);
                    toast.success(t('chat.friend.send_success'));
                    setFriendRequestStatus('sent');
                  } catch { toast.error(t('chat.friend.send_error')); }
                  setFriendActionLoading(false);
                }}
                className="px-3 py-1.5 bg-[#0068FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {t('chat.friend.add_btn')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* PINNED MESSAGE BAR — Zalo style */}
      {pinnedMessages.length > 0 && (
        <div className="relative z-20">
          <div className="bg-[var(--card-bg)] border-b border-[var(--border)] flex items-stretch cursor-pointer hover:bg-[var(--hover-bg)] transition-colors select-none"
            onClick={() => setShowPinnedList(!showPinnedList)}
          >
            {/* Left accent bar */}
            <div className="w-[3px] bg-[#0068FF] shrink-0 rounded-r-sm" />
            <div className="flex items-center gap-2.5 flex-1 min-w-0 px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-[#0068FF]/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-[#0068FF] leading-tight mb-0.5">
                  {pinnedMessages.length > 1
                    ? `${pinnedMessages.length} ${t('chat.pin.pinned')}`
                    : t('chat.pin.pinned')}
                </div>
                <div className="text-[13px] text-[var(--text)] truncate leading-snug">
                  <span className="font-semibold">{pinnedMessages[0].senderName}: </span>
                  {pinnedMessages[0].messageType !== 'TEXT'
                    ? `[${pinnedMessages[0].messageType}]`
                    : (pinnedMessages[0].content?.length > 60
                      ? pinnedMessages[0].content.slice(0, 60) + '...'
                      : pinnedMessages[0].content)}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[var(--sub-text)] shrink-0 transition-transform duration-200 ${showPinnedList ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </div>

          {/* PINNED MESSAGES DROPDOWN — Zalo style (overlay) */}
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
                    {/* Pin number badge */}
                    <div className="w-6 h-6 rounded-full bg-[#0068FF]/10 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-[#0068FF]">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[#0068FF] leading-tight">{pin.senderName}</div>
                      <div className="text-[13px] text-[var(--text)] truncate leading-snug mt-0.5">
                        {pin.messageType !== 'TEXT' ? `[${pin.messageType}]` : (pin.content?.length > 80 ? pin.content.slice(0, 80) + '...' : pin.content)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUnpinMessage(pin.messageId); }}
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

      {/* MESSAGES */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-8 bg-[var(--chat-bg)]" onScroll={() => setContextMenu(null)}>
        {isInitialLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (<>
        {hasMore && <div ref={loadMoreRef} className="h-4 opacity-0" />}
        {isLoadingMore && <div className="flex justify-center p-2"><div className="w-5 h-5 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" /></div>}

        <div className="flex flex-col gap-10">

          {messages.map((msg, index) => {
            const prevMsg = messages[index - 1];
            const showDateSeparator = !prevMsg || isDifferentDay(msg.rawDate, prevMsg.rawDate);
            return (
              <React.Fragment key={msg.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-2">
                    <span className="bg-black/5 dark:bg-white/10 px-4 py-1.5 rounded-full text-[12px] font-bold text-[var(--sub-text)] opacity-60">{formatDateSeparator(msg.rawDate, t)}</span>
                  </div>
                )}
                {msg.type === 'SYSTEM' ? (
                  <div className="flex justify-center my-1">
                    <span className="bg-black/5 dark:bg-white/10 px-4 py-1.5 rounded-full text-[12px] text-[var(--sub-text)] opacity-80">{msg.text}</span>
                  </div>
                ) : (
                  <div id={`msg-${msg.id}`} className={`flex ${msg.sender === 'Me' ? 'justify-end' : 'justify-start'} transition-colors duration-300 [&.highlight-msg]:bg-[#0068FF]/10 rounded-lg`}>
                    <div className={`flex gap-1.5 max-w-[72%] group relative ${msg.sender === 'Me' ? 'flex-row-reverse' : ''} items-center`}>

                      {msg.sender !== 'Me' && (
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 border-[1px] border-[#DBDFE6] dark:border-white/10 shadow-sm flex items-center justify-center bg-blue-50">
                          {(msg as any).avatar ? (
                            <img src={(msg as any).avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : selectedChat.isAi || (msg as any).senderId === 'FRUVIA_AI_ASSISTANT' ? (
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
                        {/* Reply reference */}
                        {msg.replyToMessageId && (() => {
                          const repliedMsg = messages.find(m => m.id === msg.replyToMessageId);
                          if (!repliedMsg) return null;
                          const replySnippet = repliedMsg.isRecalled ? t('chat.message.recalled') : repliedMsg.type === 'IMAGE' ? `📷 ${t('chat.snippet.image')}` : repliedMsg.type === 'VIDEO' ? `🎬 ${t('chat.snippet.video')}` : repliedMsg.type === 'VOICE' ? `🎤 ${t('chat.snippet.voice')}` : repliedMsg.type === 'MEDIA' ? `📎 ${t('chat.snippet.file')}` : repliedMsg.text?.length > 80 ? repliedMsg.text.slice(0, 80) + '...' : repliedMsg.text;
                          return (
                            <div
                              onClick={() => {
                                const el = document.getElementById(`msg-${repliedMsg.id}`);
                                if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('highlight-msg'); setTimeout(() => el.classList.remove('highlight-msg'), 1500); }
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
                        <div className={`relative group w-fit min-w-[100px] 
                    ${msg.isRecalled
                            ? `px-3 pt-2 pb-2 rounded-lg shadow-sm text-[15px] border border-dashed ${msg.sender === 'Me' ? 'border-gray-300 dark:border-gray-600' : 'border-gray-300 dark:border-gray-600'}`
                            : msg.type === 'MEDIA' || msg.type === 'IMAGE' || msg.type === 'VIDEO'
                              ? ''
                              : `px-3 pt-2 pb-2 rounded-lg shadow-sm text-[15px] border ${msg.sender === 'Me'
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
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditMessage(msg.id); if (e.key === 'Escape') { setEditingMessageId(null); setEditContent(''); } }}
                                  className="w-full bg-[var(--hover-bg)] outline-none border border-[#0068FF]/30 focus:border-[#0068FF] rounded-lg text-[15px] px-3 py-1.5 text-[var(--text)] transition-colors"
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
                                  <img src={msg.text} alt="Shared" onLoad={() => scrollToBottom()} className="max-w-[320px] max-h-[360px] rounded-md cursor-pointer hover:opacity-90 transition-all shadow-sm object-contain" onClick={() => window.open(msg.text, '_blank')} />
                                ) : (
                                  <video src={msg.text} controls className="max-w-[320px] max-h-[360px] rounded-md shadow-sm object-contain" />
                                )}
                                {/* Cloud icon for media */}
                                <div className="absolute bottom-2 left-2 text-white/80 drop-shadow-md">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>
                                </div>
                              </div>
                            ) : msg.type === 'MEDIA' ? (
                              <div className={`border rounded-lg p-3 flex items-center gap-3.5 min-w-[270px] hover:shadow-md transition-all cursor-pointer group/file relative ${msg.sender === 'Me' ? 'bg-[var(--message-me-bg)] border-[var(--message-me-border)]' : 'bg-[var(--message-other-bg)] border-[var(--message-other-border)]'}`} onClick={() => window.open(getPreviewUrl(msg.text), '_blank')}>
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
                                      {renderText(msg.text ?? '')}
                                      {(msg.type === 'LINK' || (msg.text && msg.text.match(/(https?:\/\/[^\s]+)/))) && (
                                        <LinkPreview
                                          url={msg.type === 'LINK' ? msg.text : msg.text?.match(/(https?:\/\/[^\s]+)/)![0]}
                                          title={msg.linkTitle}
                                          thumbnail={msg.linkThumbnail}
                                        />
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="absolute bottom-1.5 right-0 text-[11.5px] text-[var(--sub-text)] opacity-90 font-medium leading-none flex items-center gap-1">
                                  {msg.isEdited && <span className="italic opacity-70">{t('chat.status.edited')}</span>}
                                  {msg.time}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Reaction Cluster (Bottom-Right behavior) */}
                          <div className={`absolute flex items-center gap-1 z-20 ${msg.type === 'IMAGE' || msg.type === 'VIDEO' ? 'bottom-0 right-2 translate-y-[50%]' : 'bottom-0 right-0 translate-y-[50%]'}`}>
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div onClick={(e) => { e.stopPropagation(); setReactionModalMessageId(msg.id); }} className="flex items-center cursor-pointer shadow-md rounded-full bg-[var(--card-bg)] border border-[var(--border)] px-2 py-1 h-[26px] hover:scale-105 transition-transform">
                                <div className="flex -space-x-0.5 mr-1.5">
                                  {(() => {
                                    const counts: Record<string, number> = {};
                                    msg.reactions.forEach((r: any) => counts[r.emoji] = (counts[r.emoji] || 0) + 1);
                                    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([emj], i) => (
                                      <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[14px] bg-[var(--card-bg)]">{emj}</div>
                                    ));
                                  })()}
                                </div>
                                <span className="text-[13px] font-bold text-[var(--text)]">{msg.reactions.length}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status & Time (Outside and below) */}
                        {(() => {
                          // Compute who has read up to this message
                          const isLastMyMsg = msg.sender === 'Me' && (() => {
                            for (let k = index + 1; k < messages.length; k++) {
                              if (messages[k].sender === 'Me') return false;
                            }
                            return true;
                          })();
                          const showReadStatus = msg.sender === 'Me' && isLastMyMsg;

                          // Collect readers who have read up to or past this message
                          const readersForThisMsg = showReadStatus ? Object.values(readReceipts).filter(r => {
                            const readerIdx = messages.findIndex(m => m.id === r.messageId);
                            return readerIdx >= index;
                          }) : [];
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
                                      {readersForThisMsg.slice(0, 3).map((r, i) => (
                                        <div key={i} className="w-4 h-4 rounded-full overflow-hidden border border-white">
                                          {r.avatarUrl ? (
                                            <img src={r.avatarUrl} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold">{r.displayName?.charAt(0)}</div>
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

                      {/* Actions on hover */}
                      {!msg.isRecalled && (
                        <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity h-fit ${msg.sender === 'Me' ? 'mr-0.5 flex-row-reverse self-center' : 'ml-0.5 self-center'}`}>
                          <button title={t('chat.actions.reply')} onClick={() => { setReplyingTo({ id: msg.id, text: msg.text, sender: msg.sender, type: msg.type }); setTimeout(() => messageInputRef.current?.focus(), 50); }} className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg></button>
                          <button title={t('chat.actions.forward')} onClick={() => setForwardingMsg({ id: msg.id, text: msg.text, type: msg.type, sender: msg.sender })} className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 10l5-5 5 5M8 6v8a4 4 0 004 4h9" /></svg></button>
                          <button title={t('chat.actions.more')} onClick={(e) => openContextMenu(e, msg)} className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg></button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
        </>)}
      </div>

      {/* Typing indicator — outside scroll, above reply bar and input bar */}
      {typingUsers.length > 0 && (
        <div className="flex flex-col gap-1 px-4 py-2 bg-[var(--chat-bg)] border-t border-[var(--border)]/20 flex-shrink-0">
          {typingUsers.map((u) => (
            <div key={u.userId} className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-[var(--border)] flex items-center justify-center bg-blue-50">
                {u.userId === AI_TYPING_USER_ID ? (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.09 8.26 2 9.27l5 4.87L5.82 21 12 17.77 18.18 21l-1.18-6.86L22 9.27l-7.09-1.01L12 2z"/></svg>
                  </div>
                ) : u.avatarUrl ? (
                  <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-blue-600 font-bold text-[10px]">{u.displayName?.charAt(0)?.toUpperCase() || '?'}</span>
                )}
              </div>
              <span className="text-[13px] italic text-[var(--sub-text)] opacity-80 select-none">
                {u.displayName} {t('chat.typing.suffix_one')}...
              </span>
            </div>
          ))}
        </div>
      )}

      {/* REPLY PREVIEW BAR */}
      {replyingTo && (
        <div className="bg-[var(--card-bg)] border-t border-[var(--border)] px-4 py-2 flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="w-1 h-10 rounded-full bg-[#0068FF] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-[#0068FF]">{t('chat.reply.replying_to')} {replyingTo.sender === 'Me' ? t('common.you') : replyingTo.sender}</div>
            <div className="text-[13px] text-[var(--sub-text)] truncate">
              {replyingTo.type === 'IMAGE' ? `📷 ${t('chat.snippet.image')}` : replyingTo.type === 'VIDEO' ? `🎬 ${t('chat.snippet.video')}` : replyingTo.type === 'VOICE' ? `🎤 ${t('chat.snippet.voice')}` : replyingTo.type === 'MEDIA' ? `📎 ${t('chat.snippet.file')}` : replyingTo.text?.length > 60 ? replyingTo.text.slice(0, 60) + '...' : replyingTo.text}
            </div>
          </div>
          <button onClick={() => setReplyingTo(null)} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)] text-[var(--sub-text)] transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      {/* INPUT BAR */}
      <div className="bg-[var(--card-bg)] border-t border-[var(--border)] flex-shrink-0 transition-colors duration-200">
        <div className="flex items-center px-4 py-1.5 gap-1.5 border-b border-[var(--border)] relative h-[46px]">
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-lg border border-red-100 dark:border-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <div className="flex flex-col leading-none">
                  <span className="text-[13px] font-bold font-mono">
                    {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] opacity-70 font-medium mt-0.5">{t('chat.voice.recording')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => stopRecording(true)}
                  className="text-[13px] font-bold text-[var(--sub-text)] hover:text-red-500 px-3 py-2 cursor-pointer transition-colors"
                >
                  {t('chat.recording_cancel')}
                </button>
                <button
                  onClick={() => stopRecording(false)}
                  className="h-8 px-4 flex items-center gap-2 rounded-md bg-red-500 text-white animate-pulse cursor-pointer shadow-lg shadow-red-500/20"
                >
                  <VoiceIcon size={18} />
                  <span className="text-[13px] font-bold">{t('chat.recording_send')}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => togglePicker('sticker')} className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${isPickerOpen && pickerTab === 'sticker' ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}><StickerIcon size={20} /></button>
              <button onClick={handleImageClick} className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] cursor-pointer"><ImagePickerIcon size={20} /></button>
              <input type="file" ref={imageInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              <input type="file" ref={videoInputRef} onChange={handleVideoChange} accept="video/*" className="hidden" />
              <div className="relative">
                <button onClick={handleFileIconClick} className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${isFilePopoverOpen ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}><FilePickerIcon size={20} /></button>
                {isFilePopoverOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilePopoverOpen(false)} />
                    <div className="absolute bottom-[calc(100%+14px)] left-[-10px] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-0 overflow-hidden min-w-[140px]">
                      <button onClick={handleVideoClick} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--hover-bg)] w-full text-left text-[var(--text)] text-[14px] font-medium cursor-pointer"><VideoPickerIcon size={18} />{t('chat.choose_video')}</button>
                      <button onClick={handleFileClick} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--hover-bg)] w-full text-left text-[var(--text)] text-[14px] font-medium cursor-pointer"><FilePickerIcon size={18} />{t('chat.choose_file')}</button>
                      <div className="absolute top-[calc(100%-1px)] left-4 w-4 h-4 overflow-hidden"><div className="w-2.5 h-2.5 bg-[var(--card-bg)] border-b border-r border-[var(--border)] rotate-45 -translate-y-1.5 mx-auto" /></div>
                    </div>
                  </>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (isRecording) stopRecording();
                  else startRecording();
                }}
                disabled={isInitializingMic}
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-all cursor-pointer ${isInitializingMic ? 'opacity-50 cursor-not-allowed' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}
              >
                {isInitializingMic ? (
                  <div className="w-4 h-4 border-2 border-[var(--text)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <VoiceIcon size={20} />
                )}
              </button>
            </>
          )}
          <StickerPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSelect={onSelectSticker} activeTab={pickerTab} />
        </div>
        <div className="flex items-center px-4 py-3 gap-3">
          <div className="flex-1">
            <input ref={messageInputRef} type="text" value={message} onChange={(e) => { setMessage(e.target.value); sendTypingIndicator(); }} onKeyDown={(e) => { if (e.key === 'Enter' && !(selectedChat.isAi && isSendingAi)) handleSendMessage(); if (e.key === 'Escape' && replyingTo) setReplyingTo(null); }} placeholder={selectedChat.isAi && isSendingAi ? (t('chat.ai_thinking') || 'AI đang suy nghĩ...') : (selectedChat.isAi ? t('chat.ai_input_placeholder') : t('chat.input_placeholder'))} disabled={selectedChat.isAi && isSendingAi} className="w-full bg-transparent outline-none text-[15px] placeholder:text-[var(--sub-text)] placeholder:opacity-50 py-1 text-[var(--text)] disabled:opacity-50" />
          </div>
          <div className="flex items-center gap-2 pr-1 shrink-0">
            <button onClick={() => togglePicker('emoji')} className={`transition-colors cursor-pointer ${isPickerOpen && pickerTab === 'emoji' ? 'text-[#0068FF]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}`}><EmojiIcon size={22} /></button>
            {message.trim() ? (
              <button onClick={() => handleSendMessage()} disabled={selectedChat.isAi && isSendingAi} className={`flex items-center justify-center transform translate-y-[-1px] cursor-pointer ${selectedChat.isAi && isSendingAi ? 'text-gray-400 cursor-not-allowed' : 'text-[#0068FF]'}`}><SendIcon size={22} /></button>
            ) : (
              <button onClick={() => handleSendMessage('👍')} className="text-[#0068FF] hover:scale-110 active:scale-90 flex items-center justify-center transform translate-y-[-1.5px] cursor-pointer"><LikeIcon size={22} /></button>
            )}
          </div>
        </div>
      </div>

      {/* Forward Modal */}
      {forwardingMsg && (
        <ForwardModal
          message={forwardingMsg}
          currentConversationId={String(selectedChat.id)}
          currentUserId={currentUser?.id}
          onClose={() => setForwardingMsg(null)}
          onForwarded={(convId) => {
            if (onUpdateConversation) {
              const snippet = forwardingMsg.type === 'IMAGE' ? t('chat.snippet.image') : forwardingMsg.type === 'VIDEO' ? t('chat.snippet.video') : forwardingMsg.type === 'MEDIA' ? t('chat.snippet.file') : forwardingMsg.type === 'VOICE' ? t('chat.snippet.voice') : forwardingMsg.text;
              onUpdateConversation(convId, snippet, new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }));
            }
          }}
        />
      )}

      <NicknameModal isOpen={isNicknameModalOpen} onClose={() => setIsNicknameModalOpen(false)} currentName={nickname || selectedChat.name} avatar={selectedChat.avatar} onConfirm={async (newName) => {
        try {
          await apiClient.patch(`/conversations/${selectedChat.id}/nickname`, { nickname: newName });
          const newNickname = newName && newName !== selectedChat.name ? newName : null;
          setNickname(newNickname);
          onNicknameChange?.(selectedChat.id, newNickname);
          toast.success(t('chat.nickname.update_success'));
        } catch (e) {
          toast.error(t('chat.nickname.update_error'));
        }
      }} />

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[150]" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-[151] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-2xl py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
            style={{ top: contextMenu.y, left: contextMenu.x, transform: 'translate(-50%, 4px)' }}
          >
            {contextMenu.isMe && contextMenu.type === 'TEXT' && (
              <button
                onClick={() => {
                  const msg = messages.find(m => m.id === contextMenu.msgId);
                  if (msg) startEditMessage(msg);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                {t('chat.ctx_menu.edit')}
              </button>
            )}
            {contextMenu.isMe && (
              <button
                onClick={() => { setConfirmDialog({ type: 'recall', msgId: contextMenu.msgId }); setContextMenu(null); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                {t('chat.ctx_menu.recall')}
              </button>
            )}
            {(() => {
              const isPinned = pinnedMessages.some(p => p.messageId === contextMenu.msgId);
              return (
                <button
                  onClick={() => isPinned ? handleUnpinMessage(contextMenu.msgId) : handlePinMessage(contextMenu.msgId)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" /></svg>
                  {isPinned ? t('chat.ctx_menu.unpin') : t('chat.ctx_menu.pin')}
                </button>
              );
            })()}
            <button
              onClick={() => { setConfirmDialog({ type: 'delete', msgId: contextMenu.msgId }); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              {t('chat.ctx_menu.delete_local')}
            </button>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="bg-[var(--card-bg)] w-[380px] max-w-[90vw] rounded-lg shadow-2xl overflow-hidden border border-[var(--border)]">
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-[16px] font-bold text-[var(--text)] mb-2">
                {confirmDialog.type === 'recall' ? t('chat.confirm.recall_title') : t('chat.confirm.delete_title')}
              </h3>
              <p className="text-[14px] text-[var(--sub-text)]">
                {confirmDialog.type === 'recall'
                  ? t('chat.confirm.recall_message')
                  : t('chat.confirm.delete_message')}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-[14px] font-medium text-[var(--sub-text)] hover:bg-[var(--hover-bg)] rounded-md transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.type === 'recall') handleRecallMessage(confirmDialog.msgId);
                  else handleDeleteLocal(confirmDialog.msgId);
                }}
                className={`px-4 py-2 text-[14px] font-medium text-white rounded-md transition-colors cursor-pointer ${confirmDialog.type === 'recall' ? 'bg-[#0068FF] hover:bg-[#0052CC]' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {confirmDialog.type === 'recall' ? t('chat.confirm.recall_btn') : t('chat.confirm.delete_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {reactionModalMessageId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="bg-[var(--card-bg)] w-[500px] h-auto max-h-[420px] max-w-[95vw] rounded-lg shadow-2xl flex flex-col overflow-hidden border border-[var(--border)]">
            <div className="h-[50px] border-b border-[var(--border)] flex items-center justify-between pl-4 pr-1.5 shrink-0">
              <h3 className="text-[16px] font-bold text-[var(--text)]">{t('chat.reactions.title')}</h3>
              <button onClick={() => setReactionModalMessageId(null)} className="w-8 h-8 flex items-center justify-center text-[var(--sub-text)] hover:bg-[var(--hover-bg)] rounded-full transition-colors cursor-pointer"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div className="flex-1 flex overflow-hidden min-h-[280px]">
              <div className="w-[85px] bg-[var(--hover-bg)] flex flex-col pt-0.5 shrink-0 overflow-y-auto border-r border-[var(--border)]">
                {(() => {
                  const targetMsg = messages.find(m => m.id === reactionModalMessageId);
                  const allReactions = targetMsg?.reactions || [];
                  const counts: Record<string, number> = {};
                  allReactions.forEach((r: any) => counts[r.emoji] = (counts[r.emoji] || 0) + 1);
                  return (
                    <div className="flex flex-col">
                      <button onClick={() => setReactionModalEmojiTab('all')} className={`flex items-center justify-between px-2 py-2.5 transition-colors cursor-pointer ${reactionModalEmojiTab === 'all' ? 'bg-[var(--card-bg)] text-[var(--primary)] border-r-2 border-[var(--primary)]' : 'text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5'}`}><span className="text-[13.5px] font-medium">{t('chat.reactions.all')}</span><span className="text-[12px] text-[var(--sub-text)]">{allReactions.length}</span></button>
                      {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([emj, count]) => (
                        <button key={emj} onClick={() => setReactionModalEmojiTab(emj)} className={`flex items-center justify-between px-2 py-2.5 transition-colors cursor-pointer ${reactionModalEmojiTab === emj ? 'bg-[var(--card-bg)] text-[var(--primary)] border-r-2 border-[var(--primary)]' : 'text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5'}`}><span className="text-[17px] leading-none">{emj}</span><span className="text-[12px] text-[var(--sub-text)]">{count}</span></button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="flex-1 overflow-y-auto bg-[var(--card-bg)] p-1.5 custom-scrollbar">
                {(() => {
                  const targetMsg = messages.find(m => m.id === reactionModalMessageId);
                  let filtered = targetMsg?.reactions || [];
                  if (reactionModalEmojiTab !== 'all') filtered = filtered.filter((r: any) => r.emoji === reactionModalEmojiTab);
                  const userMap: Record<string, any> = {};
                  filtered.forEach((r: any) => {
                    if (!userMap[r.userId]) userMap[r.userId] = { userId: r.userId, name: r.userName, avatar: r.userAvatar, emojis: [], total: 0 };
                    userMap[r.userId].emojis.push(r.emoji);
                    userMap[r.userId].total++;
                  });
                  return Object.values(userMap).map((usr, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 hover:bg-[var(--hover-bg)] rounded-md transition-colors mb-0.5 group/user">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-[42px] h-[42px] rounded-full overflow-hidden border border-[var(--border)]"><img src={usr.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(usr.name || 'U')}`} alt="Avatar" className="w-full h-full object-cover" /></div>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-medium text-[14px] text-[var(--text)] truncate group-hover/user:text-[var(--primary)]">{usr.name}</span>
                          <div className="flex items-center gap-1">{Array.from(new Set(usr.emojis)).map((emj: any, j) => <span key={j} className="text-[14px]">{emj}</span>)}<span className="text-[12px] text-[var(--sub-text)] ml-1">{usr.total}</span></div>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getFileIcon(ext: string) {
  const size = 26;
  if (['pdf'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 18H17V16H7V18Z" fill="#F40F02" />
        <path d="M19 13.5V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V4C5 2.9 5.9 2 7 2H14L19 7V13.5Z" stroke="#F40F02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2V8H19" stroke="#F40F02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="6" y="15" fill="#F40F02" fontSize="6.5" fontWeight="bold" fontFamily="Arial">PDF</text>
      </svg>
    );
  }
  if (['doc', 'docx'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 13.5V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V4C5 2.9 5.9 2 7 2H14L19 7V13.5Z" stroke="#2B579A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2V8H19" stroke="#2B579A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="7" y="11" width="10" height="7" rx="1" fill="#2B579A" />
        <text x="9" y="16.5" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial">W</text>
      </svg>
    );
  }
  if (['xls', 'xlsx'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 13.5V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V4C5 2.9 5.9 2 7 2H14L19 7V13.5Z" stroke="#217346" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2V8H19" stroke="#217346" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="7" y="11" width="10" height="7" rx="1" fill="#217346" />
        <text x="10" y="16.5" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial">X</text>
      </svg>
    );
  }
  if (['zip', 'rar', '7z'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 13.5V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V4C5 2.9 5.9 2 7 2H14L19 7V13.5Z" stroke="#E4910C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2L14 22" stroke="#E4910C" strokeWidth="2" strokeDasharray="2 2" />
        <path d="M14 2V8H19" stroke="#E4910C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="13.5" y="10" width="1" height="6" fill="#E4910C" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
      <polyline points="13 2 13 9 20 9"></polyline>
    </svg>
  );
}

export default ChatWindow;
