import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { FruviaChatbotAvatar } from '@/components/ui/FruviaChatbotAvatar';
import { toast } from 'sonner';
import {
  PlusIcon,
  SendIcon,
  FilePickerIcon,
  ImagePickerIcon,
  LikeIcon,
  ChevronDownIcon,
  MinusIcon,
  XIcon,
  FileIcon,
  StickerIcon,
  VoiceIcon,
  TextColorIcon,
  MoreHorizontalIcon,
} from '@/components/ui/Icons';
import { apiClient } from '@/lib/http/apiClient';
import { useTranslation } from 'react-i18next';
import { StickerPicker } from '@/features/chat/components/StickerPicker';
import { ChatImageUpload } from '@/features/chat/components/ChatImageUpload';
import { websocketService } from '@/lib/realtime/websocketService';

interface PopupMessage {
  id?: string;
  messageId?: string;
  senderId?: string;
  sender_id?: string;
  content?: string;
  messageType?: string;
  message_type?: string;
  createdAt?: string;
  created_at?: string;
}

interface ConversationMessagesResponse {
  content?: PopupMessage[];
}

interface SendMessageResponse {
  message?: PopupMessage;
}

const stripHtml = (html: string): string => (html || '').replace(/<[^>]*>?/gm, '');

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileNameFromUrl = (url: string): string => {
  try {
    const normalizedPath = (() => {
      try {
        return new URL(url).pathname;
      } catch {
        return url.split('?')[0] || url;
      }
    })();
    const parts = normalizedPath.split('/');
    const lastPart = parts[parts.length - 1];
    const filename = lastPart.includes('_') ? lastPart.split('_').slice(1).join('_') : lastPart;
    return decodeURIComponent(filename);
  } catch {
    return 'File';
  }
};

const getFileExtension = (url: string): string => {
  const filename = getFileNameFromUrl(url);
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
};

const parseMessagesFromResponse = (payload: unknown): PopupMessage[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const envelope = payload as ConversationMessagesResponse;
  return Array.isArray(envelope.content) ? envelope.content : [];
};

const extractSendMessage = (payload: unknown): PopupMessage | null => {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as SendMessageResponse & PopupMessage;
  if (value.message && typeof value.message === 'object') return value.message;
  if (value.messageId || value.id) return value;
  return null;
};

const getMessageSenderId = (msg: PopupMessage): string => String(msg.senderId || msg.sender_id || '');
const getMessageCreatedAt = (msg: PopupMessage): number => {
  const createdAt = msg.createdAt || msg.created_at || '';
  const time = new Date(createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

interface MessengerPopupProps {
  conversation?: {
    id?: string | number;
    name?: string;
    avatar?: string;
    isAi?: boolean;
  } | null;
  user?: {
    id?: string;
    user_id?: string;
  } | null;
  onClose: () => void;
  conversations?: any[];
}

export const MessengerPopup: React.FC<MessengerPopupProps> = ({
  conversation: initialConversation,
  user,
  onClose,
  conversations = []
}) => {
  const { t } = useTranslation();
  const [view, setView] = useState<'LIST' | 'CHAT'>(initialConversation ? 'CHAT' : 'LIST');
  const [activeConversation, setActiveConversation] = useState(initialConversation);
  const [messages, setMessages] = useState<PopupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Picker states
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'sticker'>('sticker');
  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
  const [isFilePopoverOpen, setIsFilePopoverOpen] = useState(false);
  const [isFormattingActive, setIsFormattingActive] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = activeConversation?.name || t('common.unknown_user');
  const avatarUrl = activeConversation?.avatar || '/avatar.jpg';
  const isAi = (activeConversation as any)?.isAi || false;
  const isSelf = (activeConversation as any)?.isSelf || false;

  const renderAvatar = (url: string, isAiConv: boolean, isSelfConv: boolean, size: number = 32) => {
    if (isAiConv) {
      return (
        <FruviaChatbotAvatar className="w-full h-full" imageClassName="w-full h-full object-cover" />
      );
    }
    if (isSelfConv) {
      return (
        <div className="w-full h-full bg-[#0068FF] flex items-center justify-center text-white">
          <svg width={Math.round(size * 0.65)} height={Math.round(size * 0.65)} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.5 19c3.037 0 5.5-2.463 5.5-5.5 0-2.97-2.354-5.391-5.291-5.492a7 7 0 0 0-13.709 0C1.109 8.109 1 10.53 1 13.5c0 3.037 2.463 5.5 5.5 5.5h11z" />
          </svg>
        </div>
      );
    }
    return <Image src={url || "/avatar.jpg"} fill alt="Avatar" className="object-cover" />;
  };
  const conversationId = activeConversation?.id;
  const currentUserId = useMemo(() => String(user?.id || user?.user_id || ''), [user?.id, user?.user_id]);

  useEffect(() => {
    if (initialConversation) {
      setActiveConversation(initialConversation);
      setView('CHAT');
    }
  }, [initialConversation]);

  // Real-time messages subscription
  useEffect(() => {
    if (!conversationId || view !== 'CHAT') return;

    const topic = `/topic/chat/${conversationId}`;
    const sub = websocketService.subscribe(topic, (msg) => {
      try {
        const raw = JSON.parse(msg.body);
        const newMsg = raw.message || raw;

        // Skip non-message events
        if (newMsg.type && ['REACTION_UPDATE', 'MESSAGE_EDIT', 'MESSAGE_RECALL', 'MESSAGE_PIN', 'MESSAGE_UNPIN'].includes(newMsg.type)) {
          return;
        }

        setMessages((prev) => {
          const incomingId = String(newMsg.id || newMsg.messageId);
          const exists = prev.some((m) => String(m.id || m.messageId) === incomingId);
          if (exists) return prev;
          
          const mappedMsg: PopupMessage = {
            id: incomingId,
            senderId: String(newMsg.senderId),
            content: newMsg.content,
            messageType: newMsg.messageType || 'TEXT',
            createdAt: newMsg.createdAt || new Date().toISOString(),
          };

          // Optimistic replacement: If message is from me, try to find a matching temp message
          if (String(newMsg.senderId) === currentUserId) {
            const optimisticIdx = prev.findIndex(m => 
              String(m.id || m.messageId).startsWith('temp-') && 
              m.content === mappedMsg.content && 
              m.messageType === mappedMsg.messageType
            );

            if (optimisticIdx !== -1) {
              const next = [...prev];
              next[optimisticIdx] = mappedMsg;
              return next;
            }
          }
          
          return [...prev, mappedMsg];
        });
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    });

    return () => sub.unsubscribe();
  }, [conversationId, view]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.lastMessage.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!conversationId || view !== 'CHAT') {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      if (!silent) setIsLoading(true);
      const res = await apiClient.get<ConversationMessagesResponse | PopupMessage[]>(
        `/messages/conversation/${conversationId}?size=50&page=0`
      );
      const items = parseMessagesFromResponse(res);
      const sorted = [...items].sort((a, b) => getMessageCreatedAt(a) - getMessageCreatedAt(b));
      setMessages(sorted);
    } catch (error) {
      if (!silent) {
        console.error('Failed to fetch messages:', error);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [conversationId, view]);

  useEffect(() => {
    void fetchMessages(false);
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId || view !== 'CHAT') return undefined;
    const timer = setInterval(() => {
      void fetchMessages(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [conversationId, fetchMessages, view]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO' | 'FILE') => {
    const files = event.target.files;
    if (!files || files.length === 0 || !conversationId) return;
    
    const file = files[0];
    event.target.value = '';
    
    try {
      setIsSending(true);
      // Use the same endpoint as the main chat
      const res = await apiClient.get<any>(`/messages/presigned-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`);
      
      // Robustly extract the presigned URL
      const presignedUrl = typeof res === 'string' ? res : (res?.data || res?.url || res);
      
      if (!presignedUrl || typeof presignedUrl !== 'string') {
        throw new Error('Could not get presigned URL');
      }

      // Upload to S3
      await axios.put(presignedUrl, file, { 
        headers: { "Content-Type": file.type } 
      });
      
      // Get the final S3 URL (without query params)
      const s3Url = presignedUrl.split('?')[0];
      
      // Send message directly (the main chat doesn't call /images/save)
      await handleSendMessage(s3Url, type, file.name, file.size);
    } catch (error) {
      console.error('File upload failed:', error);
      toast.error(t('chat.upload.error'));
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async (
    rawContent?: string,
    type: string = 'TEXT',
    originalName?: string,
    fileSize?: number
  ) => {
    const content = (rawContent ?? draft).trim();
    if (!content || !conversationId || isSending) return;

    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: PopupMessage = {
      id: optimisticId,
      senderId: currentUserId,
      content,
      messageType: type,
      createdAt: new Date().toISOString(),
    };

    setIsSending(true);
    setMessages(prev => [...prev, optimisticMessage]);
    if (!rawContent) setDraft('');

    try {
      const res = await apiClient.post<SendMessageResponse | PopupMessage>('/messages', {
        conversationId: String(conversationId),
        content,
        messageType: type,
        originalName,
        fileSize,
      });

      const sentMessage = extractSendMessage(res);
      if (sentMessage) {
        setMessages(prev =>
          prev.map(msg => ((msg.id || msg.messageId) === optimisticId ? sentMessage : msg))
        );
      } else {
        setMessages(prev => prev.filter(msg => (msg.id || msg.messageId) !== optimisticId));
        await fetchMessages(true);
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => (msg.id || msg.messageId) !== optimisticId));
      if (!rawContent) setDraft(content);
      toast.error(t('common.action_failed'));
    } finally {
      setIsSending(false);
    }
  }, [conversationId, currentUserId, draft, fetchMessages, isSending, t]);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) return;
      event.preventDefault();
      if (draft.trim()) {
        void handleSendMessage();
      }
    },
    [draft, handleSendMessage]
  );

  const renderText = (text: string) => {
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
            className="text-inherit underline break-all cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const renderMessageContent = (msg: PopupMessage) => {
    const type = String(msg.messageType || msg.message_type || 'TEXT').toUpperCase();
    const content = stripHtml(String(msg.content || ''));
    const isMe = getMessageSenderId(msg) === currentUserId;

    if (type === 'SYSTEM' || type === 'NOTIFICATION' || !getMessageSenderId(msg)) {
      return (
        <div className="flex justify-center w-full my-2">
          <p className="text-[11px] text-gray-500 text-center italic">{content}</p>
        </div>
      );
    }

    // Auto-detect image URL in TEXT messages
    const isImageContent = content.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i);

    if (type === 'IMAGE' || (type === 'TEXT' && isImageContent)) {
      return (
        <div className={`relative max-w-[85%] rounded-[12px] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 ${isMe ? 'ml-auto' : ''}`}>
          <img
            src={content}
            alt="Sent image"
            className="max-h-[240px] w-auto object-contain cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => window.open(content, '_blank')}
          />
        </div>
      );
    }

    if (type === 'VIDEO') {
      return (
        <div className={`relative max-w-[85%] rounded-[12px] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 ${isMe ? 'ml-auto' : ''}`}>
          <video
            src={content}
            controls
            className="max-h-[240px] w-full object-contain bg-black"
          />
        </div>
      );
    }

    if (type === 'STICKER') {
      return (
        <div className={`max-w-[85%] ${isMe ? 'ml-auto' : ''}`}>
          <img
            src={content}
            alt="Sticker"
            className="w-32 h-32 object-contain"
          />
        </div>
      );
    }

    if (type === 'FILE' || type === 'MEDIA' || content.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z)$/i)) {
      const ext = getFileExtension(content).toUpperCase();
      const isWord = ['DOC', 'DOCX'].includes(ext);
      const isExcel = ['XLS', 'XLSX'].includes(ext);
      const isPDF = ext === 'PDF';
      const isPowerPoint = ['PPT', 'PPTX'].includes(ext);

      return (
        <div 
          onClick={() => window.open(content, '_blank')}
          className={`flex items-center gap-3 p-2.5 rounded-xl border max-w-[85%] cursor-pointer transition-all hover:shadow-md ${
            isMe 
              ? 'bg-[#EBF5FF] border-[#D0E7FF] ml-auto' 
              : 'bg-[#F0F7FF] border-[#E0EFFF]'
          }`}
        >
          <div className={`h-10 w-8 rounded flex items-center justify-center text-white font-bold text-[10px] shrink-0 ${
            isPDF ? 'bg-red-500' : isWord ? 'bg-blue-600' : isExcel ? 'bg-green-600' : isPowerPoint ? 'bg-orange-500' : 'bg-gray-400'
          }`}>
            {ext.slice(0, 3)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#1f2329] truncate">{getFileNameFromUrl(content)}</p>
            <p className="text-[10px] text-[#647081] mt-0.5">{ext} File</p>
          </div>
          <div className="shrink-0 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
          </div>
        </div>
      );
    }

    return (
      <div className={`max-w-[85%] px-3 py-1.5 rounded-[18px] text-[14px] shadow-sm break-words whitespace-pre-wrap ${isMe
          ? 'bg-[#0095F6] text-white'
          : 'bg-[#EFEFEF] dark:bg-[#262626] text-black dark:text-white'
        }`}>
        {(/<[a-z][\s\S]*>/i.test(content)) ? (
          <div className="tiptap-content prose dark:prose-invert max-w-none text-inherit" dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          renderText(content)
        )}
      </div>
    );
  };

  if (view === 'LIST') {
    return (
      <div className="fixed bottom-4 right-4 z-[200] w-[350px] bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#262626] flex flex-col h-[550px] text-black dark:text-white overflow-hidden">
        <div className="py-2.5 px-3 flex items-center justify-between border-b border-gray-100 dark:border-[#262626]">
          <h3 className="text-[15px] font-bold">{t('social.sidebar.messages')}</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1 hover:bg-gray-50 dark:hover:bg-[#262626] rounded-lg transition-colors text-gray-400 hover:text-black dark:hover:text-white cursor-pointer">
              <XIcon size={18} />
            </button>
          </div>
        </div>

        <div className="px-3 py-1.5">
          <div className="w-full bg-gray-100 dark:bg-[#262626] rounded-xl px-3 py-1.5 flex items-center gap-2">
            <PlusIcon size={14} className="text-gray-500 cursor-pointer" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('social.messenger.search')}
              className="bg-transparent border-none outline-none text-[13px] w-full text-black dark:text-white placeholder-gray-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv, idx) => (
              <div
                key={conv.id || idx}
                onClick={() => {
                  setActiveConversation(conv);
                  setView('CHAT');
                }}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#262626] cursor-pointer transition-all group border-b border-gray-50 dark:border-gray-900 last:border-none"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden relative shrink-0 border border-gray-100 dark:border-gray-800 cursor-pointer">
                  {renderAvatar(conv.avatar, conv.isAi, conv.isSelf, 40)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] truncate cursor-pointer">{conv.name}</p>
                  <p className="text-[12px] text-gray-500 truncate leading-tight cursor-pointer">
                    {(conv.lastSenderId === currentUserId || !conv.lastSenderId) && `${t('social.messenger.you')}: `}
                    {stripHtml(conv.lastMessage)} 
                    {conv.lastMessageTime && (
                      <>
                        {' • '}
                        {(() => {
                          const date = new Date(conv.lastMessageTime);
                          const diff = Date.now() - date.getTime();
                          if (diff < 60000) return t('presence.just_now');
                          if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
                          if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
                          return `${Math.floor(diff / 86400000)}d`;
                        })()}
                      </>
                    )}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#0095F6] hidden group-hover:block" />
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-gray-500 text-[14px]">
              {t('social.messenger.no_messages')}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-[350px] bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#262626] flex flex-col h-[550px] text-black dark:text-white">
      <div className="py-2 px-3 border-b border-gray-100 dark:border-[#262626] flex items-center justify-between bg-white dark:bg-[#121212] sticky top-0 rounded-t-2xl">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-8 w-8 rounded-full overflow-hidden relative border border-gray-100 dark:border-gray-800 cursor-pointer shrink-0">
            {renderAvatar(avatarUrl, isAi, isSelf, 32)}
          </div>
          <div className="min-w-0 flex-1 cursor-pointer">
            <p className="text-[14px] font-bold truncate pr-2">{displayName}</p>
            <p className="text-[11px] text-green-500">{t('social.messenger.online')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-gray-50 dark:hover:bg-[#262626] rounded-lg transition-colors text-black dark:text-white cursor-pointer" onClick={() => setView('LIST')}>
            <XIcon size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-hide bg-white dark:bg-[#121212]">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#0095F6] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length > 0 ? (
          <>
            {messages.map((msg, idx) => {
              const senderId = getMessageSenderId(msg);
              const isMe = senderId === currentUserId;
              return (
                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                  {renderMessageContent(msg)}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        ) : null}
      </div>

      {/* Messenger Style Input Area */}
      <div className="p-2 bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-[#262626] rounded-b-2xl">
        <div className="flex items-center gap-1">
          {/* Action Icons */}
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setIsFilePopoverOpen(!isFilePopoverOpen)}
                className={`p-2 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-full transition-colors cursor-pointer ${isFilePopoverOpen ? 'text-[#0084FF] bg-gray-100 dark:bg-[#262626]' : 'text-[#0084FF]'}`}
              >
                <FilePickerIcon size={20} />
              </button>
              
              {isFilePopoverOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilePopoverOpen(false)} />
                  <div className="absolute bottom-[calc(100%+12px)] left-[-10px] bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#262626] rounded-xl shadow-2xl z-50 py-1.5 min-w-[160px] animate-in slide-in-from-bottom-2 duration-200">
                    <button 
                      onClick={() => { imageInputRef.current?.click(); setIsFilePopoverOpen(false); }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-[#262626] w-full text-left text-black dark:text-white text-[14px] font-medium transition-colors cursor-pointer"
                    >
                      <ImagePickerIcon size={20} className="text-gray-500" />
                      {t('chat.choose_image')}
                    </button>
                    <button 
                      onClick={() => { fileInputRef.current?.click(); setIsFilePopoverOpen(false); }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-[#262626] w-full text-left text-black dark:text-white text-[14px] font-medium transition-colors cursor-pointer"
                    >
                      <FilePickerIcon size={20} className="text-gray-500" />
                      {t('chat.choose_file')}
                    </button>
                    <div className="absolute top-[calc(100%-1px)] left-6 w-4 h-4 overflow-hidden">
                      <div className="w-2.5 h-2.5 bg-white dark:bg-[#121212] border-b border-r border-gray-100 dark:border-[#262626] rotate-45 -translate-y-1.5 mx-auto" />
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setPickerTab('sticker');
                setIsPickerOpen(!isPickerOpen);
              }}
              className={`p-2 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-full transition-colors cursor-pointer ${isPickerOpen && pickerTab === 'sticker' ? 'text-[#0084FF] bg-gray-100 dark:bg-[#262626]' : 'text-[#0084FF]'}`}
            >
              <StickerIcon size={20} />
            </button>
          </div>

          {/* Pill Input */}
          <div className="flex-1 bg-gray-100 dark:bg-[#262626] rounded-full px-4 py-1.5 flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Aa"
              className="bg-transparent w-full text-[15px] text-black dark:text-white focus:outline-none placeholder-gray-500"
            />
          </div>

          {/* Right Action (Like or Send) */}
          <div className="flex items-center pl-1">
            {draft.trim() ? (
              <button
                onClick={() => void handleSendMessage()}
                className="p-2 text-[#0084FF] hover:opacity-80 transition-opacity cursor-pointer"
              >
                <SendIcon size={24} />
              </button>
            ) : (
              <button
                onClick={() => void handleSendMessage('👍')}
                className="p-2 text-[#0084FF] hover:opacity-80 transition-opacity cursor-pointer"
              >
                <LikeIcon size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Picker and Upload Modals */}
        <div className="relative">
          <StickerPicker
            isOpen={isPickerOpen}
            onClose={() => setIsPickerOpen(false)}
            onSelect={(stickerUrl) => {
              void handleSendMessage(stickerUrl, 'STICKER');
              setIsPickerOpen(false);
            }}
            activeTab={pickerTab}
            className="w-[350px] h-[480px] right-[calc(100%+12px)] bottom-0"
          />
          {/* Hidden File Inputs */}
          <input type="file" ref={imageInputRef} onChange={(e) => handleFileUpload(e, 'IMAGE')} accept="image/*" className="hidden" />
          <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, 'FILE')} className="hidden" />
        </div>
      </div>
    </div>
  );
};
