import React, { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  SearchIcon,
  StickerIcon,
  ImagePickerIcon,
  FilePickerIcon,
  ScreenShotIcon,
  BusinessCardIcon,
  LightningIcon,
  EmojiIcon,
  LikeIcon,
  SendIcon,
  VideoPickerIcon,
  VoiceIcon
} from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';
import { StickerPicker } from '@/components/common/StickerPicker';
import { NicknameModal } from '@/components/common/NicknameModal';
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
}

const getFileNameFromUrl = (url: string) => {
  try {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    const filename = lastPart.includes('_') ? lastPart.split('_').slice(1).join('_') : lastPart;
    return decodeURIComponent(filename);
  } catch {
    return 'File đính kèm';
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

const formatDateSeparator = (date?: Date) => {
  if (!date) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = today.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export function ChatWindow({ onToggleSidebar, activeSidebar, selectedChat, currentUser, onUpdateConversation, onSelectConversation }: ChatWindowProps) {
  const { t } = useTranslation();
  const [message, setMessage] = React.useState("");
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const [pickerTab, setPickerTab] = React.useState<'sticker' | 'emoji' | 'gif'>('sticker');

  // Nickname state
  const [nickname, setNickname] = useState<string | null>(null);

  // Message management states (Edit / Recall / Delete)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number; isMe: boolean; type: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'recall' | 'delete'; msgId: string } | null>(null);

  // Friend request state for stranger chats
  const [friendRequestStatus, setFriendRequestStatus] = useState<'none' | 'received' | 'sent' | 'friend'>('none');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  useEffect(() => {
    const checkFriendStatus = async () => {
      if (!selectedChat.otherUserId || !currentUser?.id || selectedChat.isCloud || selectedChat.isGroup) {
        setFriendRequestStatus('none');
        return;
      }
      try {
        const [received, sent, friends] = await Promise.all([
          friendService.getReceivedRequests(),
          friendService.getSentRequests(),
          friendService.getFriends(),
        ]);
        const isFriend = friends.some((f: any) => (f.user_id || f.id) === selectedChat.otherUserId);
        if (isFriend) { setFriendRequestStatus('friend'); return; }
        const receivedReq = received.find(r => r.senderId === selectedChat.otherUserId);
        if (receivedReq) { setFriendRequestStatus('received'); setPendingRequestId(receivedReq.requestId); return; }
        const sentReq = sent.find(r => r.receiverId === selectedChat.otherUserId);
        if (sentReq) { setFriendRequestStatus('sent'); return; }
        setFriendRequestStatus('none');
      } catch { setFriendRequestStatus('none'); }
    };
    checkFriendStatus();
  }, [selectedChat.otherUserId, selectedChat.isCloud, selectedChat.isGroup, currentUser?.id]);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = React.useState(false);
  const [isFilePopoverOpen, setIsFilePopoverOpen] = React.useState(false);
  const [isUserDataModalOpen, setIsUserDataModalOpen] = useState(false);

  // Fetch nickname for current conversation member
  useEffect(() => {
    setNickname(selectedChat?.nickname || null);
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
          toast.error('Tin nhắn quá ngắn (Tối thiểu 1 giây)');
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

        try {
          const uploadToast = toast.loading('Đang gửi tin nhắn thoại...');

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
          toast.success('Gửi tin nhắn thoại thành công!');
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
      toast.info('Đang thu âm... Nhấn lại vào icon để gửi.');
    } catch (err) {
      console.error('Microphone error:', err);
      const { toast } = await import('sonner');
      toast.error('Không thể truy cập Microphone. Hãy kiểm tra quyền truy cập microphone của trình duyệt.');
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
      const uploadToast = toast.loading(`Đang tải ${file.name}...`);
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

      await handleSendMessage(s3Url, msgType, file.name, file.size);
      toast.dismiss(uploadToast);
      toast.success('Gửi media thành công!');
    } catch (error) {
      console.error('Upload error:', error);
      const { toast } = await import('sonner');
      toast.error('Lỗi khi tải media lên S3');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleVideoClick = () => {
    videoInputRef.current?.click();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = React.useState<{ userId: string; displayName: string }[]>([]);
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

          if (data.typing) {
            setTypingUsers(prev => {
              if (prev.some(u => u.userId === data.userId)) return prev;
              return [...prev, { userId: data.userId, displayName: data.displayName }];
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
  }, [selectedChat?.id, currentUser?.id]);

  // Send typing indicator (throttled to once per 2s)
  const sendTypingIndicator = React.useCallback(() => {
    if (!selectedChat?.id || selectedChat.isNew || !currentUser?.id) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    websocketService.send(`/app/chat/${selectedChat.id}/typing`, {
      userId: currentUser.id,
      displayName: currentUser.full_name || currentUser.display_name || 'User',
      typing: true,
    });
  }, [selectedChat?.id, currentUser?.id]);

  // Read receipts state: map of userId -> { displayName, avatarUrl, messageId }
  const [readReceipts, setReadReceipts] = React.useState<Record<string, { displayName: string; avatarUrl?: string; messageId: string }>>({});
  const lastSentReadRef = useRef<string | null>(null);

  // Load initial read status from DB when opening a conversation
  React.useEffect(() => {
    if (!selectedChat?.id || selectedChat.isNew) return;
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
  }, [selectedChat?.id]);

  // Subscribe to read receipt events (real-time updates)
  React.useEffect(() => {
    if (!selectedChat?.id || selectedChat.isNew) return;

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
  }, [selectedChat?.id, currentUser?.id]);

  // Send read receipt when new messages arrive or conversation is opened
  const sendReadReceipt = React.useCallback((messageId: string) => {
    if (!selectedChat?.id || selectedChat.isNew || !currentUser?.id) return;
    if (lastSentReadRef.current === messageId) return;
    lastSentReadRef.current = messageId;
    websocketService.send(`/app/chat/${selectedChat.id}/read`, {
      userId: currentUser.id,
      displayName: currentUser.full_name || currentUser.display_name || 'User',
      avatarUrl: currentUser.avatar_url || '',
      messageId,
    });
  }, [selectedChat?.id, currentUser?.id]);

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
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' });
  };

  React.useEffect(() => {
    const fetchMessages = async () => {
      if (selectedChat?.id) {
        if (selectedChat.isNew) {
          setMessages([]);
          setHasMore(false);
          setIsLoadingMore(false);
          return;
        }

        try {
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
          }));

          setMessages(mapped);
          setHasMore(hasMoreData);
          setShouldScrollToBottom(true);
        } catch (e) {
          console.error("Failed to fetch messages:", e);
        } finally {
          setIsLoadingMore(false);
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
              onUpdateConversation(selectedChat.id, 'Tin nhắn đã được thu hồi');
            }
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
              sender: newMsg.senderId === 'SYSTEM' ? 'SYSTEM' : newMsg.senderId === currentUser?.id ? 'Me' : newMsg.senderName,
              senderId: newMsg.senderId,
              time: newMsg.createdAt ? new Date(newMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
              avatar: newMsg.senderAvatarUrl,
              reactions: [],
              rawDate: newMsg.createdAt ? new Date(newMsg.createdAt) : new Date(),
              isEdited: newMsg.isEdited || false,
              isRecalled: newMsg.isRecalled || false,
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
  }, [selectedChat?.id, currentUser?.id]);

  const [shouldScrollToBottom, setShouldScrollToBottom] = React.useState(false);
  const isInitialLoadRef = useRef(true);

  // Reset initial load flag when conversation changes
  React.useEffect(() => {
    isInitialLoadRef.current = true;
  }, [selectedChat?.id]);

  React.useEffect(() => {
    if (shouldScrollToBottom) {
      // Use instant scroll on initial load (switching conversations), smooth for new messages
      const useInstant = isInitialLoadRef.current;
      if (useInstant) {
        // Delay slightly to let images/media start rendering
        setTimeout(() => {
          scrollToBottom(true);
          isInitialLoadRef.current = false;
        }, 100);
      } else {
        scrollToBottom();
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
      case 'IMAGE': return '[Hình ảnh]';
      case 'VIDEO': return '[Video]';
      case 'MEDIA': return '[File]';
      case 'VOICE': return '[Tin nhắn thoại]';
      case 'STICKER': return '[Sticker]';
      case 'SYSTEM': return content;
      default: return content;
    }
  };

  const handleSendMessage = async (customContent?: string, msgType: string = 'TEXT', fileName?: string, fileSize?: number, voiceDuration?: number) => {
    const contentToUse = customContent || message?.trim();
    if (contentToUse && selectedChat?.id) {
      try {
        if (!customContent) setMessage("");

        const isNewConv = !!selectedChat.isNew;
        const payload: any = {
          content: contentToUse,
          messageType: msgType,
          fileName,
          fileSize,
          voiceDuration
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
              sender: 'Me',
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
              reactions: [],
              rawDate: new Date()
            }];
          });
        }
      } catch (err) {
        console.error("Send failed", err);
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
      const msg = e?.response?.data?.message || e?.message || 'Không thể chỉnh sửa tin nhắn';
      toast.error(msg);
    }
  };

  const handleRecallMessage = async (messageId: string) => {
    try {
      await apiClient.post(`/messages/${messageId}/recall`, {});
      setConfirmDialog(null);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không thể thu hồi tin nhắn';
      toast.error(msg);
      setConfirmDialog(null);
    }
  };

  const handleDeleteLocal = async (messageId: string) => {
    try {
      await apiClient.delete(`/messages/${messageId}/local`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setConfirmDialog(null);
      toast.success('Đã xóa tin nhắn ở phía bạn');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không thể xóa tin nhắn';
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

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] transition-colors duration-200">
      {/* HEADER */}
      <div className="h-[76px] bg-[var(--card-bg)] border-b border-[var(--border)] px-5 flex items-center justify-between shadow-sm flex-shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-4">
          {selectedChat.isCloud ? (
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
                {selectedChat.isCloud
                  ? t('chat.cloud_subheading')
                  : selectedChat.otherUserId
                    ? undefined
                    : (selectedChat.isGroup ? `Nhóm · ${selectedChat.name}` : '')}
              </p>
              {!selectedChat.isCloud && selectedChat.otherUserId && (
                <StatusIndicator userId={selectedChat.otherUserId} />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[var(--sub-text)] pr-2 shrink-0">
          {!selectedChat.isCloud && (
            <>
              <button className="cursor-pointer transition-all p-1.5 rounded-md hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70" title="Thêm vào nhóm">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
              </button>
              <button className="cursor-pointer transition-all p-1.5 rounded-md hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70" title="Cuộc gọi video">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
              </button>
            </>
          )}
          <button onClick={() => onToggleSidebar('search')} className={`cursor-pointer transition-all p-1.5 rounded-md ${activeSidebar === 'search' ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}><SearchIcon size={24} /></button>
          <button onClick={() => onToggleSidebar('info')} className={`cursor-pointer transition-all p-1.5 rounded-md ${activeSidebar === 'info' ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg></button>
        </div>
      </div>

      {/* STRANGER WARNING BANNER */}
      {!selectedChat.isCloud && !selectedChat.isGroup && friendRequestStatus !== 'friend' && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span className="text-[13px] text-amber-800 dark:text-amber-200">
              Người này không có trong danh bạ của bạn. Hãy cẩn thận với các đường link lạ.
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
                    toast.success('Đã chấp nhận lời mời kết bạn!');
                    setFriendRequestStatus('friend');
                  } catch { toast.error('Không thể chấp nhận lời mời'); }
                  setFriendActionLoading(false);
                }}
                className="px-3 py-1.5 bg-[#0068FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Đồng ý
              </button>
            ) : friendRequestStatus === 'sent' ? (
              <span className="text-[12px] text-amber-700 dark:text-amber-300 italic whitespace-nowrap">Đã gửi lời mời</span>
            ) : (
              <button
                disabled={friendActionLoading}
                onClick={async () => {
                  if (!selectedChat.otherUserId) return;
                  setFriendActionLoading(true);
                  try {
                    await friendService.sendRequest(selectedChat.otherUserId);
                    toast.success('Đã gửi lời mời kết bạn!');
                    setFriendRequestStatus('sent');
                  } catch { toast.error('Không thể gửi lời mời'); }
                  setFriendActionLoading(false);
                }}
                className="px-3 py-1.5 bg-[#0068FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Kết bạn
              </button>
            )}
          </div>
        </div>
      )}

      {/* MESSAGES */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-8 bg-[var(--chat-bg)]" onScroll={() => setContextMenu(null)}>
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
                    <span className="bg-black/5 dark:bg-white/10 px-4 py-1.5 rounded-full text-[12px] font-bold text-[var(--sub-text)] opacity-60">{formatDateSeparator(msg.rawDate)}</span>
                  </div>
                )}
                {msg.type === 'SYSTEM' ? (
                  <div className="flex justify-center my-1">
                    <span className="bg-black/5 dark:bg-white/10 px-4 py-1.5 rounded-full text-[12px] text-[var(--sub-text)] opacity-80">{msg.text}</span>
                  </div>
                ) : (
                  <div className={`flex ${msg.sender === 'Me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-1.5 max-w-[72%] group relative ${msg.sender === 'Me' ? 'flex-row-reverse' : ''} items-center`}>
                      {msg.sender !== 'Me' && (
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 border-[1px] border-[#DBDFE6] dark:border-white/10 shadow-sm flex items-center justify-center bg-blue-50">
                          {(msg as any).avatar ? (
                            <img src={(msg as any).avatar} alt="Avatar" className="w-full h-full object-cover" />
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
                            {msg.isRecalled ? (
                              <div className="flex items-center gap-2 py-1 text-[var(--sub-text)] italic opacity-70">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                <span className="text-[14px]">Tin nhắn đã được thu hồi</span>
                              </div>
                            ) : editingMessageId === msg.id ? (
                              <div className="flex flex-col gap-2 min-w-[250px]">
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditMessage(msg.id); if (e.key === 'Escape') { setEditingMessageId(null); setEditContent(''); } }}
                                  className="w-full bg-transparent outline-none border-b-2 border-[#0068FF] text-[15px] py-1 text-[var(--text)]"
                                  autoFocus
                                />
                                <div className="flex items-center gap-2 justify-end">
                                  <button onClick={() => { setEditingMessageId(null); setEditContent(''); }} className="text-[12px] text-[var(--sub-text)] hover:text-[var(--text)] px-2 py-1 rounded cursor-pointer">Hủy</button>
                                  <button onClick={() => handleEditMessage(msg.id)} className="text-[12px] text-white bg-[#0068FF] hover:bg-[#0052CC] px-3 py-1 rounded font-medium cursor-pointer">Lưu</button>
                                </div>
                              </div>
                            ) : msg.type === 'IMAGE' || msg.type === 'VIDEO' ? (
                              <div className="relative group/media-content w-fit max-w-full">
                                {msg.type === 'IMAGE' ? (
                                  <img src={msg.text} alt="Shared" onLoad={scrollToBottom} className="max-w-[320px] max-h-[360px] rounded-md cursor-pointer hover:opacity-90 transition-all shadow-sm object-contain" onClick={() => window.open(msg.text, '_blank')} />
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
                                    <span>Đã có trên Cloud</span>
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
                                  {msg.isEdited && <span className="italic opacity-70">Đã chỉnh sửa</span>}
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
                            <div className="group/reaction-btn relative">
                              {/* Hover Bridge & Wrapper */}
                              <div className={`absolute bottom-full ${msg.sender === 'Me' ? 'right-0' : 'left-1/2 -translate-x-1/2'} hidden group-hover/reaction-btn:flex flex-col items-center z-[100] pb-2 animate-in fade-in zoom-in duration-200`}>
                                <div className="flex items-center gap-1 px-1.5 py-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-full shadow-2xl w-max">
                                  {['👍', '❤️', '😂', '😲', '😭', '😡'].map((emoji) => (
                                    <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReactMessage(msg.id, emoji); }} className="text-[20px] hover:scale-125 transition-transform px-1 cursor-pointer">{emoji}</button>
                                  ))}
                                </div>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); handleReactMessage(msg.id, '👍'); }} className="w-6 h-6 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center shadow-md text-gray-400 hover:scale-110 active:scale-95 transition-all cursor-pointer"><LikeIcon size={14} /></button>
                            </div>

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
                                        <span>Đã xem</span>
                                      </div>
                                    </div>
                                  );
                                }
                                if (anyReaders) {
                                  return (
                                    <div className="bg-blue-500/10 rounded-full px-2 py-0.5 flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /><polyline points="14 6 3 17" /></svg>
                                      <span>Đã xem</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="bg-black/5 dark:bg-white/10 rounded-full px-2 py-0.5 flex items-center gap-1 text-[11px] text-[var(--sub-text)] font-medium">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--sub-text)] opacity-70"><polyline points="20 6 9 17 4 12" /></svg>
                                    <span>Đã gửi</span>
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
                          <button title="Trả lời" className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg></button>
                          <button title="Chuyển tiếp" className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 10l5-5 5 5M8 6v8a4 4 0 004 4h9" /></svg></button>
                          <button title="Thêm" onClick={(e) => openContextMenu(e, msg)} className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg></button>
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
      </div>

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
                  <span className="text-[10px] opacity-70 font-medium mt-0.5">Đang ghi âm...</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => stopRecording(true)}
                  className="text-[13px] font-bold text-[var(--sub-text)] hover:text-red-500 px-3 py-2 cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => stopRecording(false)}
                  className="h-8 px-4 flex items-center gap-2 rounded-md bg-red-500 text-white animate-pulse cursor-pointer shadow-lg shadow-red-500/20"
                >
                  <VoiceIcon size={18} />
                  <span className="text-[13px] font-bold">Gửi</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => togglePicker('sticker')} className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${isPickerOpen && pickerTab === 'sticker' ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}><StickerIcon size={20} /></button>
              <button onClick={handleImageClick} className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] cursor-pointer"><ImagePickerIcon size={20} /></button>
              <input type="file" ref={imageInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              <button onClick={handleVideoClick} className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] cursor-pointer"><VideoPickerIcon size={20} /></button>
              <input type="file" ref={videoInputRef} onChange={handleVideoChange} accept="video/*" className="hidden" />
              <div className="relative">
                <button onClick={handleFileIconClick} className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${isFilePopoverOpen ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}><FilePickerIcon size={20} /></button>
                {isFilePopoverOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilePopoverOpen(false)} />
                    <div className="absolute bottom-[calc(100%+14px)] left-[-10px] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-0 overflow-hidden min-w-[140px]">
                      <button onClick={handleFileClick} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--hover-bg)] w-full text-left text-[var(--text)] text-[14px] font-medium cursor-pointer"><FilePickerIcon size={18} />Chọn File</button>
                      <div className="absolute top-[calc(100%-1px)] left-4 w-4 h-4 overflow-hidden"><div className="w-2.5 h-2.5 bg-[var(--card-bg)] border-b border-r border-[var(--border)] rotate-45 -translate-y-1.5 mx-auto" /></div>
                    </div>
                  </>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <button className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--sub-text)] hover:bg-[var(--hover-bg)] cursor-pointer"><ScreenShotIcon size={20} /></button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--sub-text)] hover:bg-[var(--hover-bg)] cursor-pointer"><BusinessCardIcon size={20} /></button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--sub-text)] hover:bg-[var(--hover-bg)] cursor-pointer"><LightningIcon size={20} /></button>
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
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1 text-[12px] text-[var(--sub-text)] italic animate-pulse">
            {typingUsers.length === 1
              ? `${typingUsers[0].displayName} đang soạn tin...`
              : `${typingUsers.map(u => u.displayName).join(', ')} đang soạn tin...`}
          </div>
        )}
        <div className="flex items-center px-4 py-3 gap-3">
          <div className="flex-1">
            <input type="text" value={message} onChange={(e) => { setMessage(e.target.value); sendTypingIndicator(); }} onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }} placeholder={t('chat.input_placeholder')} className="w-full bg-transparent outline-none text-[15px] placeholder:text-[var(--sub-text)] placeholder:opacity-50 py-1 text-[var(--text)]" />
          </div>
          <div className="flex items-center gap-2 pr-1 shrink-0">
            <button onClick={() => togglePicker('emoji')} className={`transition-colors cursor-pointer ${isPickerOpen && pickerTab === 'emoji' ? 'text-[#0068FF]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}`}><EmojiIcon size={22} /></button>
            {message.trim() ? (
              <button onClick={() => handleSendMessage()} className="text-[#0068FF] flex items-center justify-center transform translate-y-[-1px] cursor-pointer"><SendIcon size={22} /></button>
            ) : (
              <button onClick={() => handleSendMessage('👍')} className="text-[#0068FF] hover:scale-110 active:scale-90 flex items-center justify-center transform translate-y-[-1.5px] cursor-pointer"><LikeIcon size={22} /></button>
            )}
          </div>
        </div>
      </div>

      <NicknameModal isOpen={isNicknameModalOpen} onClose={() => setIsNicknameModalOpen(false)} currentName={nickname || selectedChat.name} avatar={selectedChat.avatar} onConfirm={async (newName) => {
        try {
          await apiClient.patch(`/conversations/${selectedChat.id}/nickname`, { nickname: newName });
          setNickname(newName && newName !== selectedChat.name ? newName : null);
          toast.success('Đã cập nhật biệt danh');
        } catch (e) {
          toast.error('Không thể cập nhật biệt danh');
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
                Chỉnh sửa
              </button>
            )}
            {contextMenu.isMe && (
              <button
                onClick={() => { setConfirmDialog({ type: 'recall', msgId: contextMenu.msgId }); setContextMenu(null); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                Thu hồi
              </button>
            )}
            <button
              onClick={() => { setConfirmDialog({ type: 'delete', msgId: contextMenu.msgId }); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              Xóa ở phía tôi
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
                {confirmDialog.type === 'recall' ? 'Thu hồi tin nhắn' : 'Xóa tin nhắn'}
              </h3>
              <p className="text-[14px] text-[var(--sub-text)]">
                {confirmDialog.type === 'recall'
                  ? 'Tin nhắn sẽ bị thu hồi với tất cả mọi người trong cuộc trò chuyện. Bạn có chắc không?'
                  : 'Tin nhắn sẽ chỉ bị xóa ở phía bạn. Người khác vẫn có thể xem. Bạn có chắc không?'}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-[14px] font-medium text-[var(--sub-text)] hover:bg-[var(--hover-bg)] rounded-md transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.type === 'recall') handleRecallMessage(confirmDialog.msgId);
                  else handleDeleteLocal(confirmDialog.msgId);
                }}
                className={`px-4 py-2 text-[14px] font-medium text-white rounded-md transition-colors cursor-pointer ${confirmDialog.type === 'recall' ? 'bg-[#0068FF] hover:bg-[#0052CC]' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {confirmDialog.type === 'recall' ? 'Thu hồi' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reactionModalMessageId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="bg-[var(--card-bg)] w-[500px] h-auto max-h-[420px] max-w-[95vw] rounded-lg shadow-2xl flex flex-col overflow-hidden border border-[var(--border)]">
            <div className="h-[50px] border-b border-[var(--border)] flex items-center justify-between pl-4 pr-1.5 shrink-0">
              <h3 className="text-[16px] font-bold text-[var(--text)]">Biểu cảm</h3>
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
                      <button onClick={() => setReactionModalEmojiTab('all')} className={`flex items-center justify-between px-2 py-2.5 transition-colors cursor-pointer ${reactionModalEmojiTab === 'all' ? 'bg-[var(--card-bg)] text-[var(--primary)] border-r-2 border-[var(--primary)]' : 'text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5'}`}><span className="text-[13.5px] font-medium">Tất cả</span><span className="text-[12px] text-[var(--sub-text)]">{allReactions.length}</span></button>
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
