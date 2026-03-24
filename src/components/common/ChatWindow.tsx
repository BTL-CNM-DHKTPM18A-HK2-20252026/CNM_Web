import React, { useRef } from 'react';
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
  SendIcon
} from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';
import { StickerPicker } from '@/components/common/StickerPicker';
import { NicknameModal } from '@/components/common/NicknameModal';
import { apiClient } from '@/services/api';
import { websocketService } from '@/services/websocketService';
import { useInView } from 'react-intersection-observer';

interface ChatWindowProps {
  onToggleSidebar: (type: 'info' | 'search') => void;
  activeSidebar: 'info' | 'search' | null;
  selectedChat: {
    id: string | number;
    name: string;
    isCloud?: boolean;
    avatar?: string;
  };
  currentUser?: any;
  onUpdateConversation?: (id: string | number, lastMsg: string, time?: string) => void;
}

const getFileNameFromUrl = (url: string) => {
  try {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    // Remove the UUID prefix (UUID_filename.ext)
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

export function ChatWindow({ onToggleSidebar, activeSidebar, selectedChat, currentUser, onUpdateConversation }: ChatWindowProps) {
  const { t } = useTranslation();
  const [message, setMessage] = React.useState("");
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const [pickerTab, setPickerTab] = React.useState<'sticker' | 'emoji' | 'gif'>('sticker');
  const [isNicknameModalOpen, setIsNicknameModalOpen] = React.useState(false);
  const [isFilePopoverOpen, setIsFilePopoverOpen] = React.useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
      // Create a hidden link and click it to trigger native download behavior
      // Note: for cross-origin URLs like S3, browser might just open them in a tab
      // if headers don't strictly require attachment.
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
      // Fallback: open in new tab (some browsers will download it there)
      window.open(url, '_blank');
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const { toast } = await import('sonner');
      const uploadToast = toast.loading(`Đang tải ${file.name}...`);

      // 1. Get pre-signed URL from Backend
      const res = await apiClient.get<any>(`/messages/presigned-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`);

      // Since Backend wraps result in ApiResponse, we extract 'data'
      const presignedUrl = typeof res === 'string' ? res : (res?.data || res?.url || res);

      if (!presignedUrl || typeof presignedUrl !== 'string') {
        throw new Error('Invalid presigned URL from server');
      }

      // 2. Upload file directly to S3 via PUT
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) throw new Error('S3 upload failed');

      // 3. Get the final URL (strip query params)
      const s3Url = presignedUrl.split('?')[0];

      // 4. Map file type to MessageType
      let msgType = 'MEDIA';
      if (file.type.startsWith('image/')) msgType = 'IMAGE';
      else if (file.type.startsWith('video/')) msgType = 'VIDEO';

      // 5. Send message with S3 URL
      await handleSendMessage(s3Url, msgType);

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
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const [messages, setMessages] = React.useState<any[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    const fetchMessages = async () => {
      if (selectedChat?.id) {
        try {
          setIsLoadingMore(true);
          // Initial fetch: 20 most recent messages
          const res = await apiClient.get(`/messages/conversation/${selectedChat.id}?size=20&page=0`);
          let items: any[] = [];
          let hasMoreData = false;

          if (res.success && res.data) {
            items = Array.isArray(res.data) ? res.data : (res.data.content || []);
            hasMoreData = res.data.last === false; // Spring Data Page 'last' property
          } else if (res.content) {
            items = res.content;
            hasMoreData = res.last === false;
          }

          const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          const mapped = sorted.map(m => ({
            id: m.messageId || m.id,
            text: m.content,
            type: m.messageType || 'TEXT',
            sender: m.senderId === currentUser?.id ? 'Me' : m.senderName,
            senderId: m.senderId,
            time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
            avatar: m.senderAvatarUrl,
            reaction: null,
            rawDate: m.createdAt ? new Date(m.createdAt) : undefined
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
    if (selectedChat?.id) {
      const topic = `/topic/chat/${selectedChat.id}`;
      subscription = websocketService.subscribe(topic, (msg) => {
        try {
          const newMsg = JSON.parse(msg.body);
          if (onUpdateConversation) {
            onUpdateConversation(selectedChat.id, newMsg.content, newMsg.createdAt ? new Date(newMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined);
          }
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.messageId || m.id === newMsg.id);
            if (exists) return prev;

            const mappedMsg = {
              id: newMsg.messageId || newMsg.id,
              text: newMsg.content,
              type: newMsg.messageType || 'TEXT',
              sender: newMsg.senderId === currentUser?.id ? 'Me' : newMsg.senderName,
              senderId: newMsg.senderId,
              time: newMsg.createdAt ? new Date(newMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
              avatar: newMsg.senderAvatarUrl,
              reaction: null,
              rawDate: newMsg.createdAt ? new Date(newMsg.createdAt) : new Date()
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
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [selectedChat?.id, currentUser?.id]);

  const [shouldScrollToBottom, setShouldScrollToBottom] = React.useState(false);

  React.useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom();
      setShouldScrollToBottom(false);
    }
  }, [messages, shouldScrollToBottom]);

  // Load more messages when scrolling to top
  const loadMoreMessages = async () => {
    if (!selectedChat?.id || isLoadingMore || !hasMore || messages.length === 0) return;

    try {
      setIsLoadingMore(true);
      const oldestMessageId = messages[0].id;
      
      // Capture current scroll height to preserve position
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
          sender: m.senderId === currentUser?.id ? 'Me' : m.senderName,
          senderId: m.senderId,
          time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
          avatar: m.senderAvatarUrl,
          reaction: null,
          rawDate: m.createdAt ? new Date(m.createdAt) : undefined
        }));

        setMessages(prev => {
          // Extra safety check for duplicates when prepending
          const prevIds = new Set(prev.map(m => m.id));
          const uniqueOldItems = mappedOldItems.filter(m => !prevIds.has(m.id));
          return [...uniqueOldItems, ...prev];
        });
        setHasMore(hasMoreData);

        // Preserve scroll position after DOM update
        setTimeout(() => {
          if (scrollContainer) {
            const newScrollHeight = scrollContainer.scrollHeight;
            scrollContainer.scrollTop = newScrollHeight - previousScrollHeight;
          }
        }, 0);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error("Failed to load more messages:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  React.useEffect(() => {
    if (inView && hasMore && !isLoadingMore && messages.length > 0) {
      loadMoreMessages();
    }
  }, [inView]);

  const handleSendMessage = async (customContent?: string, msgType: string = 'TEXT') => {
    const contentToUse = customContent || message.trim();
    if (contentToUse && selectedChat?.id) {
      try {
        const textToSend = contentToUse;
        if (!customContent) setMessage(""); // Only reset if it was a typed message

        const payload = {
          conversationId: selectedChat.id.toString(),
          content: textToSend,
          messageType: msgType
        };

        const res = await apiClient.post('/messages', payload);
        const newMsg = res.success ? res.data : res;

        if (newMsg?.messageId || newMsg?.id) {
          if (onUpdateConversation) {
            onUpdateConversation(selectedChat.id, newMsg.content, new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }));
          }
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.messageId || m.id === newMsg.id);
            if (exists) return prev;
            setShouldScrollToBottom(true);
            return [...prev, {
              id: newMsg.messageId || newMsg.id,
              text: newMsg.content,
              type: newMsg.messageType || msgType,
              sender: 'Me',
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
              rawDate: new Date()
            }];
          });
        }
      } catch (err) {
        console.error("Failed to send message", err);
        import('sonner').then(({ toast }) => {
          toast.error("Không thể gửi tin nhắn. Thử lại sau.");
        });
      }
    }
  };

  const togglePicker = (tab: 'sticker' | 'emoji' | 'gif') => {
    if (isPickerOpen && pickerTab === tab) {
      setIsPickerOpen(false);
    } else {
      setPickerTab(tab);
      setIsPickerOpen(true);
    }
  };

  const onSelectSticker = (sticker: any) => {
    if (typeof sticker === 'string') {
      // It's an emoji, append to message input
      setMessage(prev => prev + sticker);
    } else {
      // It's a sticker or something else, maybe send immediately?
      // For now let's just treat as text if possible or ignore
      if (sticker.id) {
        // immediate sticker send if we had sticker support
      }
    }
    // Note: Don't close picker here for emojis so user can pick multiple,
    // but the user's request said "it hasn't displayed", so we just need to update state.
    // Zalo actually keeps the picker open for emojis.
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
          ) : (
            <div className="h-12 w-12 rounded-full overflow-hidden shrink-0">
              <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0 group/info cursor-pointer flex items-center gap-2">
            <div>
              <h3 className="text-[18px] font-bold leading-none mb-1.5 text-[var(--text)] truncate flex items-center gap-1.5">
                {selectedChat.name}
                <button
                  onClick={() => setIsNicknameModalOpen(true)}
                  className="p-1 hover:bg-[var(--hover-bg)] rounded-md opacity-0 group-hover/info:opacity-100 transition-all text-gray-400 hover:text-[var(--text)]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
              </h3>
              <p className="text-[13px] text-[var(--sub-text)] truncate">{selectedChat.isCloud ? t('chat.cloud_subheading') : 'Truy cập 2 giờ trước'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[var(--sub-text)] pr-2 shrink-0">
          <button
            onClick={() => onToggleSidebar('search')}
            className={`cursor-pointer transition-all p-1.5 rounded-md ${activeSidebar === 'search' ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}
          >
            <SearchIcon size={24} />
          </button>
          <button
            onClick={() => onToggleSidebar('info')}
            className={`cursor-pointer transition-all p-1.5 rounded-md ${activeSidebar === 'info' ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6 bg-[var(--chat-bg)]"
      >
        {/* Infinite Scroll Trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="h-4 flex items-center justify-center opacity-0">
             {/* Hidden observer element */}
          </div>
        )}

        {isLoadingMore && (
          <div className="flex justify-center p-2">
            <div className="w-5 h-5 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {selectedChat.isCloud && messages.length === 0 && (
          <div className="flex justify-center my-2">
            <span className="bg-black/5 dark:bg-white/10 px-4 py-1.5 flex flex-col items-center text-center rounded-lg text-[13px] font-medium text-[var(--sub-text)] opacity-80 backdrop-blur-sm">
              <span className="font-bold mb-0.5 text-[var(--text)]">{selectedChat.name}</span>
              {t('chat.cloud_subheading')}
            </span>
          </div>
        )}

        {messages.map((msg, index) => {
          const prevMsg = messages[index - 1];
          const showDateSeparator = !prevMsg || isDifferentDay(msg.rawDate, prevMsg.rawDate);

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-2">
                  <span className="bg-black/5 dark:bg-white/10 px-4 py-1.5 rounded-full text-[12px] font-bold text-[var(--sub-text)] opacity-60">
                    {formatDateSeparator(msg.rawDate)}
                  </span>
                </div>
              )}
              <div className={`flex ${msg.sender === 'Me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[80%] group relative ${msg.sender === 'Me' ? 'flex-row-reverse' : ''}`}>
              {msg.sender !== 'Me' && (
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 border-[1px] border-[#DBDFE6] dark:border-white/10 shadow-sm">
                  <img src={selectedChat.avatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
              )}

              <div className={`flex flex-col ${msg.sender === 'Me' ? 'items-end' : 'items-start'} relative mt-1.5`}>
                <div className={`relative group min-w-[60px] 
                  ${msg.type === 'MEDIA' || msg.type === 'IMAGE' || msg.type === 'VIDEO'
                    ? ''
                    : `px-3 py-2 rounded-lg shadow-sm text-[15px] border ${msg.sender === 'Me'
                      ? 'bg-[var(--message-me-bg)] text-[var(--message-me-text)] border-[var(--message-me-border)]'
                      : 'bg-[var(--message-other-bg)] text-[var(--message-other-text)] border-[var(--message-other-border)]'
                    }`
                  }`}>
                  <div className="mb-1 leading-relaxed">
                    {msg.type === 'IMAGE' ? (
                      <img src={msg.text} alt="Shared" className="max-w-[300px] rounded-md cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all" onClick={() => window.open(msg.text, '_blank')} />
                    ) : msg.type === 'VIDEO' ? (
                      <video src={msg.text} controls className="max-w-[300px] rounded-md" />
                    ) : msg.type === 'MEDIA' ? (
                      <div className={`border rounded-lg p-3 flex items-center gap-3.5 min-w-[270px] hover:shadow-md transition-all cursor-pointer group/file relative ${msg.sender === 'Me'
                        ? 'bg-[var(--message-me-bg)] border-[var(--message-me-border)]'
                        : 'bg-[var(--message-other-bg)] border-[var(--message-other-border)]'
                        }`} onClick={() => window.open(getPreviewUrl(msg.text), '_blank')}>
                        <div className={`h-12 w-10 rounded-md flex items-center justify-center text-white font-bold text-[16px] shadow-sm shrink-0 shadow-inner ${['PDF'].includes(getFileExtension(msg.text)) ? 'bg-red-500' :
                            ['DOC', 'DOCX', 'W'].includes(getFileExtension(msg.text)) ? 'bg-blue-600' :
                              ['XLS', 'XLSX'].includes(getFileExtension(msg.text)) ? 'bg-green-600' :
                                ['PPT', 'PPTX'].includes(getFileExtension(msg.text)) ? 'bg-orange-500' :
                                  ['ZIP', 'RAR', '7Z'].includes(getFileExtension(msg.text)) ? 'bg-purple-600' :
                                    'bg-gray-500'
                          }`}>
                          {getFileExtension(msg.text).slice(0, 3) || 'FILE'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[14px] font-bold text-[var(--text)] truncate mb-0.5">{getFileNameFromUrl(msg.text)}</h4>
                          <div className="flex items-center gap-1.5 text-[12px] text-[var(--sub-text)] opacity-80">
                            <span className="flex items-center gap-1">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-60"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>
                              Xem trực tiếp
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDownloadFile(e, msg.text, getFileNameFromUrl(msg.text))}
                          className="h-8 w-8 rounded-lg flex items-center justify-center border border-[var(--border)] group-hover/file:bg-[var(--hover-bg)] text-[var(--sub-text)] transition-all shrink-0 hover:scale-110 active:scale-90 cursor-pointer"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                        </button>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                  <div className={`text-[12px] text-[var(--sub-text)] font-medium opacity-85 mt-0.5 ${msg.sender === 'Me' ? 'text-right' : 'text-left'}`}>
                    {msg.time}
                  </div>

                  {/* Reactions - Absolute positioned at the bottom right/left of the bubble */}
                  {msg.reaction && (
                    <div className={`absolute -bottom-3 ${msg.sender === 'Me' ? 'right-2' : 'left-[calc(100%-40px)]'} flex items-center gap-1 z-10 animate-in fade-in slide-in-from-top-1 duration-200`}>
                      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-sm h-6">
                        <span className="text-[14px]">❤️</span>
                        <span className="text-[11px] font-bold text-[var(--text)]">{msg.reaction}</span>
                      </div>
                    </div>
                  )}

                  {/* Quick Reaction Button (Visible on hover) */}
                  <div className={`absolute -bottom-4 ${msg.sender === 'Me' ? 'left-[-40px]' : 'right-[-40px]'} opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 group/reaction-btn`}>
                    {/* The Pill Menu (Visible when hovering the button) */}
                    <div className="absolute bottom-[24px] left-1/2 -translate-x-1/2 hidden group-hover/reaction-btn:flex items-center gap-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-full px-3 py-1.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 pb-3">
                      {['👍', '❤️', '😂', '😲', '😭', '😡'].map((emoji) => (
                        <button
                          key={emoji}
                          className="text-[20px] hover:scale-125 transition-transform cursor-pointer relative z-50 pt-3"
                          title={emoji}
                        >
                          <span className="block mt-[-12px]">{emoji}</span>
                        </button>
                      ))}
                    </div>

                    {/* The Main Quick Icon Button */}
                    <button className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer text-gray-400 hover:text-[#0068FF]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action buttons on hover */}
              <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity h-fit mt-1.5 ${msg.sender === 'Me' ? 'mr-2 flex-row-reverse' : 'ml-2'}`}>
                <button className="w-8 h-8 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] shadow-sm transition-all border border-[var(--border)]/20 cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                </button>
                <button className="w-8 h-8 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] shadow-sm transition-all border border-[var(--border)]/20 cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 10l5-5 5 5M8 6v8a4 4 0 004 4h9" /></svg>
                </button>
                <button className="w-8 h-8 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] shadow-sm transition-all border border-[var(--border)]/20 cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                </button>
              </div>
            </div>
          </div>
          </React.Fragment>
        );
      })}
        <div ref={messagesEndRef} />
      </div>

      {/* REFINED INPUT BAR (Like the screenshot) */}
      <div className="bg-[var(--card-bg)] border-t border-[var(--border)] flex-shrink-0 transition-colors duration-200">
        {/* Row 1: Actions */}
        <div className="flex items-center px-4 py-1.5 gap-1.5 border-b border-[var(--border)] transition-colors duration-200 relative">
          <button
            onClick={() => togglePicker('sticker')}
            className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-all ${isPickerOpen && pickerTab === 'sticker' ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}
          >
            <StickerIcon size={20} />
          </button>
          <button
            onClick={handleImageClick}
            className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"
          >
            <ImagePickerIcon size={20} />
          </button>
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          <div className="relative">
            <button
              onClick={handleFileIconClick}
              className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-all ${isFilePopoverOpen ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}
            >
              <FilePickerIcon size={20} />
            </button>
            {/* Popover */}
            {isFilePopoverOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFilePopoverOpen(false)} />
                <div className="absolute bottom-[calc(100%+14px)] left-[-10px] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-0 animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden">
                  <button
                    onClick={handleFileClick}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer whitespace-nowrap min-w-[140px]"
                  >
                    <div className="text-[var(--text)] opacity-80">
                      <FilePickerIcon size={18} />
                    </div>
                    <span className="text-[14px] font-medium text-[var(--text)]">Chọn File</span>
                  </button>
                  {/* Arrow */}
                  <div className="absolute top-[calc(100%-1px)] left-4 w-4 h-4 overflow-hidden">
                    <div className="w-2.5 h-2.5 bg-[var(--card-bg)] border-b border-r border-[var(--border)] rotate-45 -translate-y-1.5 mx-auto" />
                  </div>
                </div>
              </>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><ScreenShotIcon size={20} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><BusinessCardIcon size={20} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><LightningIcon size={20} /></button>

          <StickerPicker
            isOpen={isPickerOpen}
            onClose={() => setIsPickerOpen(false)}
            onSelect={onSelectSticker}
            activeTab={pickerTab}
          />
        </div>

        {/* Row 2: Text Input */}
        <div className="flex items-center px-4 py-3 gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={t('chat.input_placeholder')}
              className="w-full bg-transparent outline-none text-[15px] placeholder:text-[var(--sub-text)] placeholder:opacity-50 py-1 text-[var(--text)]"
            />
          </div>
          <div className="flex items-center gap-2 pr-1 shrink-0">
            <button
              onClick={() => togglePicker('emoji')}
              className={`cursor-pointer transition-colors ${isPickerOpen && pickerTab === 'emoji' ? 'text-[#0068FF]' : 'text-[var(--sub-text)] hover:text-[#0068FF]'}`}
            >
              <EmojiIcon size={22} />
            </button>
            {message.trim() ? (
              <button
                onClick={() => handleSendMessage()}
                className="cursor-pointer text-[#0068FF] transition-all animate-in fade-in zoom-in-50 duration-200 flex items-center justify-center transform translate-y-[-1px]"
              >
                <SendIcon size={24} />
              </button>
            ) : (
              <button
                onClick={() => handleSendMessage('👍')}
                className="cursor-pointer text-[#0068FF] transition-transform hover:scale-110 active:scale-90 animate-in fade-in zoom-in-50 duration-200 flex items-center justify-center transform translate-y-[-1.5px]"
              >
                <LikeIcon size={24} />
              </button>
            )}
          </div>
        </div>
      </div>

      <NicknameModal
        isOpen={isNicknameModalOpen}
        onClose={() => setIsNicknameModalOpen(false)}
        currentName={selectedChat.name}
        avatar={selectedChat.avatar}
        onConfirm={(newName) => {
          // In a real app, we'd update state/API here.
        }}
      />
    </div>
  );
}
