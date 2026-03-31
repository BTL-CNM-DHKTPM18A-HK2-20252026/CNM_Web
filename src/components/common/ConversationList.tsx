import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchIcon, AddUserIcon, PinIcon, ImagePickerIcon, CreateGroupIcon, ChevronDownIcon, MoreHorizontalIcon } from '@/components/ui/Icons';
import Image from 'next/image';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';
import { StatusIndicator } from './StatusIndicator';
import { usePresence } from '@/components/providers/PresenceProvider';

interface Conversation {
  id: string | number;
  name: string;
  lastMsg: string;
  time: string;
  active?: boolean;
  pinned?: boolean;
  isCloud?: boolean;
  avatar?: string;
  unreadCount?: number;
  otherUserId?: string;
  conversationStatus?: string;
  isRequest?: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
  onAddFriend: () => void;
  onCreateGroup: () => void;
  onSelectConversation: (id: string | number) => void;
  onPinConversation?: (id: string | number, pinned: boolean) => void;
  onDeleteConversation?: (id: string | number) => void;
}

interface SearchItem {
  id: number;
  name: string;
  avatar?: string;
  isGroup?: boolean;
  avatars?: string[];
  more?: number;
  isInitial?: boolean;
  initial?: string;
  bgColor?: string;
  isCircle?: boolean;
  color?: string;
  isIcon?: boolean;
}

export function ConversationList({ conversations, onAddFriend, onCreateGroup, onSelectConversation, onPinConversation, onDeleteConversation }: ConversationListProps) {
  const { t, i18n } = useTranslation();
  const { isOnline, getTimeAgo } = usePresence();

  // Force re-render every 60s so "X minutes ago" text auto-updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const [isSearching, setIsSearching] = useState(false);
  const [showClassifyMenu, setShowClassifyMenu] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');

  const filteredConversations = filterTab === 'unread'
    ? conversations.filter(c => (c.unreadCount && c.unreadCount > 0) || c.isRequest)
    : conversations;
  const [contextMenu, setContextMenu] = useState<{ id: string | number; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const classifyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (classifyMenuRef.current && !classifyMenuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.classify-button')) {
          setShowClassifyMenu(false);
        }
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
        setShowSubMenu(null);
      }
    }

    if (showClassifyMenu || contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClassifyMenu, contextMenu]);

  const classifyItems = [
    { key: 'customer', color: '#EF4444' }, // Red
    { key: 'family', color: '#4ADE80' },   // Green
    { key: 'work', color: '#F97316' },     // Orange
    { key: 'friends', color: '#8B5CF6' },  // Purple
    { key: 'reply_later', color: '#FACC15' }, // Yellow
    { key: 'colleagues', color: '#0068FF' }, // Blue
  ];

  const recentSearches: SearchItem[] = [];

  const toggleTag = (key: string) => {
    setSelectedTags(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const clearTags = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTags([]);
    setShowClassifyMenu(false);
  };

  const handleContextMenu = (e: React.MouseEvent, convId: string | number) => {
    e.preventDefault();
    e.stopPropagation();
    // Clamp menu position within viewport
    const menuWidth = 220;
    const menuHeight = 380;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight);
    setContextMenu({ id: convId, x, y });
  };

  const openContextMenuFromButton = (e: React.MouseEvent, convId: string | number) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 380;
    const x = Math.min(rect.right, window.innerWidth - menuWidth);
    const y = Math.min(rect.bottom + 4, window.innerHeight - menuHeight);
    setContextMenu({ id: convId, x, y });
  };

  const [showSubMenu, setShowSubMenu] = useState<string | null>(null);

  const contextConv = contextMenu ? conversations.find(c => c.id === contextMenu.id) : null;

  const subMenuItems = [
    { key: 'customer', label: 'Khách hàng', color: '#EF4444' },
    { key: 'family', label: 'Gia đình', color: '#4ADE80' },
    { key: 'work', label: 'Công việc', color: '#F97316' },
    { key: 'friends', label: 'Bạn bè', color: '#8B5CF6' },
    { key: 'reply_later', label: 'Trả lời sau', color: '#FACC15' },
    { key: 'colleagues', label: 'Đồng nghiệp', color: '#0068FF' },
  ];

  const renderContextMenu = () => {
    if (!contextMenu || !contextConv) return null;
    const isPinned = contextConv.pinned;

    return (
      <div
        ref={contextMenuRef}
        className="fixed z-[9999] w-[220px] bg-white dark:bg-[var(--card-bg)] rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-200 dark:border-[var(--border)] py-1 animate-in fade-in zoom-in-95 duration-100"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        {/* Ghim / Bỏ ghim */}
        <button
          onClick={async () => {
            const convId = contextMenu.id;
            setContextMenu(null);
            try {
              const res = await apiClient.post<any>(`/conversations/${convId}/pin`, {});
              const newPinned = res?.data?.isPinned ?? res?.isPinned ?? !isPinned;
              onPinConversation?.(convId, newPinned);
              toast.success(newPinned ? 'Đã ghim hội thoại' : 'Đã bỏ ghim hội thoại');
            } catch (e: any) {
              toast.error(e.message || 'Không thể cập nhật ghim');
            }
          }}
          className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center gap-3 text-[var(--text)] transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
          <span>{isPinned ? 'Bỏ ghim hội thoại' : 'Ghim hội thoại'}</span>
        </button>

        {/* Phân loại — with submenu */}
        <div
          className="relative"
          onMouseEnter={() => setShowSubMenu('classify')}
          onMouseLeave={() => setShowSubMenu(null)}
        >
          <button
            className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center justify-between text-[var(--text)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></svg>
              <span>Phân loại</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40"><path d="m9 18 6-6-6-6" /></svg>
          </button>

          {/* Sub-menu */}
          {showSubMenu === 'classify' && (
            <div className="absolute left-full top-0 z-50 pl-1 pointer-events-auto">
              <div className="w-[210px] bg-white dark:bg-[var(--card-bg)] rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-200 dark:border-[var(--border)] py-1 animate-in fade-in duration-100">
                {subMenuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => { setContextMenu(null); }}
                    className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center gap-3 text-[var(--text)] transition-colors cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={item.color} stroke={item.color} strokeWidth="1.5" className="shrink-0">
                      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
                    </svg>
                    <span>{item.label}</span>
                  </button>
                ))}
                <div className="h-[1px] bg-gray-100 dark:bg-white/5 mx-2 my-0.5" />
                <button
                  onClick={() => { setContextMenu(null); }}
                  className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center gap-3 text-[var(--text)] transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                  <span>Quản lý thẻ phân loại</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Đánh dấu chưa đọc */}
        <button
          onClick={() => { setContextMenu(null); }}
          className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center gap-3 text-[var(--text)] transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><circle cx="19" cy="19" r="3" /></svg>
          <span>Đánh dấu chưa đọc</span>
        </button>

        <div className="h-[1px] bg-gray-100 dark:bg-white/5 mx-2" />

        {/* Tắt thông báo */}
        <div
          className="relative"
          onMouseEnter={() => setShowSubMenu('mute')}
          onMouseLeave={() => setShowSubMenu(null)}
        >
          <button
            className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center justify-between text-[var(--text)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              <span>Tắt thông báo</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40"><path d="m9 18 6-6-6-6" /></svg>
          </button>

          {/* Mute sub-menu */}
          {showSubMenu === 'mute' && (
            <div className="absolute left-full top-0 z-50 pl-1 pointer-events-auto">
              <div className="w-[180px] bg-white dark:bg-[var(--card-bg)] rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-200 dark:border-[var(--border)] py-1 animate-in fade-in duration-100">
                {[
                  { label: 'Trong 1 giờ', value: '1h' },
                  { label: 'Trong 4 giờ', value: '4h' },
                  { label: 'Đến 8:00 sáng', value: '8am' },
                  { label: 'Cho đến khi mở lại', value: 'forever' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => { setContextMenu(null); }}
                    className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 text-[var(--text)] transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ẩn trò chuyện */}
        <button
          onClick={() => { setContextMenu(null); }}
          className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center gap-3 text-[var(--text)] transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          <span>Ẩn trò chuyện</span>
        </button>

        {/* Tin nhắn tự xóa */}
        <div
          className="relative"
          onMouseEnter={() => setShowSubMenu('autodelete')}
          onMouseLeave={() => setShowSubMenu(null)}
        >
          <button
            className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 flex items-center justify-between text-[var(--text)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <span>Tin nhắn tự xóa</span>
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40"><path d="m9 18 6-6-6-6" /></svg>
          </button>

          {/* Auto-delete sub-menu */}
          {showSubMenu === 'autodelete' && (
            <div className="absolute left-full top-0 z-50 pl-1 pointer-events-auto">
              <div className="w-[180px] bg-white dark:bg-[var(--card-bg)] rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-200 dark:border-[var(--border)] py-1 animate-in fade-in duration-100">
                {[
                  { label: 'Tắt', value: 'off' },
                  { label: '1 ngày', value: '1d' },
                  { label: '7 ngày', value: '7d' },
                  { label: '30 ngày', value: '30d' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => { setContextMenu(null); }}
                    className="w-full px-4 py-2 text-left text-[13px] hover:bg-[#e5efff] dark:hover:bg-white/10 text-[var(--text)] transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-[1px] bg-gray-100 dark:bg-white/5 mx-2" />

        {/* Xóa hội thoại */}
        <button
          onClick={() => {
            const convId = contextMenu.id;
            const convName = contextConv.name;
            setContextMenu(null);
            toast(`Xóa hội thoại "${convName}"?`, {
              description: 'Tin nhắn sẽ bị ẩn khỏi danh sách của bạn.',
              duration: 10000,
              action: {
                label: 'Xác nhận xóa',
                onClick: async () => {
                  try {
                    await apiClient.delete(`/conversations/${convId}`);
                    onDeleteConversation?.(convId);
                    toast.success('Đã xóa hội thoại');
                  } catch (e: any) {
                    toast.error(e.message || 'Không thể xóa hội thoại');
                  }
                },
              },
              cancel: { label: 'Hủy', onClick: () => { } },
            });
          }}
          className="w-full px-4 py-2 text-left text-[13px] hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 text-red-500 transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
          <span>Xóa hội thoại</span>
        </button>

        {/* Báo xấu */}
        <button
          onClick={() => { setContextMenu(null); }}
          className="w-full px-4 py-2 text-left text-[13px] hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-3 text-red-500 transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          <span>Báo xấu</span>
        </button>
      </div>
    );
  };

  return (
    <div className="w-[340px] border-r border-[var(--border)] flex flex-col bg-[var(--card-bg)] transition-colors duration-200 relative h-full">

      {/* Header Container (Search + Tabs) */}
      <div className="flex flex-col relative z-20 bg-[var(--card-bg)]">
        {/* Search Header */}
        <div className="p-4 py-3 flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              placeholder={t('chat.search')}
              onFocus={() => setIsSearching(true)}
              className={`w-full ${isSearching ? 'bg-[var(--card-bg)] border-[#0068FF]' : 'bg-[var(--search-bg)] border-transparent'} rounded-lg py-1.5 pl-9 pr-3 text-[14px] text-[var(--text)] outline-none border transition-all placeholder:text-[var(--search-placeholder)]`}
            />
            <div className={`absolute left-3 ${isSearching ? 'text-[#0068FF]' : 'text-gray-400'}`}><SearchIcon size={16} /></div>
          </div>
          {isSearching ? (
            <button
              onClick={() => setIsSearching(false)}
              className="text-[15px] font-bold text-[var(--text)] px-1 cursor-pointer hover:opacity-80 active:scale-95"
            >
              {t('chat.search_overlay.close')}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onAddFriend}
                className="p-1.5 cursor-pointer hover:bg-[var(--hover-bg)] text-[var(--text)] opacity-80 rounded-md transition-colors"
              >
                <AddUserIcon size={20} />
              </button>
              <button
                onClick={onCreateGroup}
                className="p-1.5 cursor-pointer hover:bg-[var(--hover-bg)] text-[var(--text)] opacity-80 rounded-md transition-colors"
              >
                <CreateGroupIcon size={22} />
              </button>
            </div>
          )}
        </div>

        {!isSearching && (
          /* Tabs and Filters */
          <div className="flex items-center justify-between px-4 pb-0.5 border-b border-[var(--border)] relative">
            <div className="flex gap-4 text-[13px] font-medium transition-colors duration-200">
              <button
                onClick={() => setFilterTab('all')}
                className={`py-2.5 cursor-pointer transition-colors relative whitespace-nowrap ${filterTab === 'all' ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}`}
              >
                {t('chat.tabs.all')}
              </button>
              <button
                onClick={() => setFilterTab('unread')}
                className={`py-2.5 cursor-pointer transition-colors relative whitespace-nowrap ${filterTab === 'unread' ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}`}
              >
                {t('chat.tabs.unread')}
              </button>
            </div>
            <div className="flex items-center gap-4 text-[13px] text-[var(--sub-text)]">
              <div className="relative">
                <button
                  onClick={() => setShowClassifyMenu(!showClassifyMenu)}
                  className={`classify-button flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors cursor-pointer ${selectedTags.length > 0 ? 'bg-blue-50 text-[var(--primary)] border border-blue-100' : showClassifyMenu ? 'text-[var(--primary)] font-bold' : 'hover:text-[var(--text)]'}`}
                >
                  {selectedTags.length > 0 ? (
                    <>
                      <span className="font-bold text-[var(--primary)] text-[13px]">
                        {selectedTags.length === 1
                          ? (selectedTags[0] === 'strangers' ? t('chat.classify_menu.strangers') : t(`chat.classify_menu.${selectedTags[0]}`))
                          : `${selectedTags.length} ${i18n.language === 'vi' ? 'thẻ' : 'tags'}`
                        }
                      </span>
                      <div
                        onClick={clearTags}
                        className="w-[18px] h-[18px] rounded-full border border-[var(--primary)] flex items-center justify-center ml-1 hover:bg-blue-100 transition-colors"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0056D2" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </div>
                    </>
                  ) : (
                    <>
                      {showClassifyMenu ? (i18n.language === 'vi' ? 'Thẻ' : 'Tags') : t('chat.classify')} <ChevronDownIcon size={14} />
                    </>
                  )}
                </button>

                {/* Classify Dropdown Menu */}
                {showClassifyMenu && (
                  <div
                    ref={classifyMenuRef}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full right-[-50px] mt-2 w-[260px] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-4 py-2 text-[13px] font-medium text-[var(--sub-text)]">
                      {t('chat.classify_menu.title')}
                    </div>

                    <div className="py-1 px-1">
                      {classifyItems.map((item) => (
                        <div
                          key={item.key}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTag(item.key);
                          }}
                          className={`px-3 py-2 flex items-center gap-3 cursor-pointer group transition-colors rounded-lg mb-0.5
                            ${selectedTags.includes(item.key)
                              ? 'bg-[#E7F2FF] dark:bg-[#0068FF]/10'
                              : 'hover:bg-[var(--hover-bg)]'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(item.key)}
                            readOnly
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded-sm border-gray-300 text-[#0068FF] focus:ring-[#0068FF] cursor-pointer"
                          />
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill={item.color} stroke={item.color} strokeWidth="2">
                              <path d="M21 12l-5 8H8l-5-8 5-8h8l5 8z" />
                            </svg>
                          </div>
                          <span className={`text-[14px] flex-1 ${selectedTags.includes(item.key) ? 'text-[var(--text)] font-medium' : 'text-[var(--text)]'}`}>{t(`chat.classify_menu.${item.key}`)}</span>
                        </div>
                      ))}

                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTag('strangers');
                        }}
                        className={`px-3 py-2 flex items-center gap-3 cursor-pointer transition-colors rounded-lg
                          ${selectedTags.includes('strangers')
                            ? 'bg-[#E7F2FF] dark:bg-[#0068FF]/10'
                            : 'hover:bg-[var(--hover-bg)]'
                          } border-b border-[var(--border)] mb-1 pb-3`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes('strangers')}
                          readOnly
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded-sm border-gray-300 text-[#0068FF] focus:ring-[#0068FF] cursor-pointer"
                        />
                        <div className="w-5 h-5 flex items-center justify-center text-[var(--text)] shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                          </svg>
                        </div>
                        <span className={`text-[14px] flex-1 ${selectedTags.includes('strangers') ? 'text-[var(--text)] font-medium' : 'text-[var(--text)]'}`}>{t('chat.classify_menu.strangers')}</span>
                      </div>
                    </div>

                    <button className="w-full text-center py-2.5 text-[15px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer">
                      {t('chat.classify_menu.manage')}
                    </button>
                  </div>
                )}
              </div>

              <button
                title={t('chat.more')}
                className="p-1 cursor-pointer hover:bg-[var(--hover-bg)] rounded-md text-[var(--sub-text)] hover:text-[var(--text)] transition-colors"
              >
                <MoreHorizontalIcon size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isSearching ? (
        /* Search Backdrop / Overlay Content */
        <div className="flex-1 bg-[var(--card-bg)] overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
          <div className="px-4 py-3 pb-2">
            <h3 className="text-[14px] font-bold text-[var(--text)] mb-4">{t('chat.search_overlay.recent')}</h3>

            <div className="space-y-1">
              {recentSearches.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-[var(--hover-bg)] rounded-lg cursor-pointer transition-colors">
                  {/* Mock Avatars */}
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-black/5">
                    {item.isInitial ? (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-[14px]" style={{ backgroundColor: item.bgColor }}>
                        {item.initial}
                      </div>
                    ) : item.isGroup ? (
                      <div className="grid grid-cols-2 w-full h-full bg-gray-100">
                        {item.avatars?.slice(0, 3).map((a, i) => (
                          <div key={i} className="relative w-full h-full border-[0.5px] border-white/50 overflow-hidden">
                            <Image src={a} alt="av" fill className="object-cover" sizes="20px" />
                          </div>
                        ))}
                        {item.more && (
                          <div className="flex items-center justify-center bg-gray-200 text-[10px] text-gray-500 font-bold">
                            {item.more}
                          </div>
                        )}
                      </div>
                    ) : item.isCircle ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[8px] text-white leading-[1.1] p-1 font-bold text-center" style={{ backgroundColor: item.color }}>
                        <span>Tạp Hóa</span>
                        <span>MMO</span>
                      </div>
                    ) : item.isIcon ? (
                      <div className="w-full h-full flex items-center justify-center p-2" style={{ backgroundColor: item.bgColor }}>
                        <svg viewBox="0 0 24 24" className="text-blue-900 fill-current"><path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" /></svg>
                      </div>
                    ) : (
                      <Image src={item.avatar || ''} alt={item.name} width={40} height={40} className="object-cover" />
                    )}
                  </div>
                  <span className="text-[15px] text-[var(--text)] truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--border)] mt-2 pt-4 px-4 pb-8">
            <h3 className="text-[14px] font-bold text-[var(--text)] mb-4">{t('chat.search_overlay.filters.title')}</h3>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 bg-[var(--hover-bg)] rounded-full text-[13.5px] text-[var(--text)] cursor-pointer hover:bg-[var(--border)] transition-colors">
                {t('chat.search_overlay.filters.mention')}
              </button>
              <button className="px-4 py-1.5 bg-[var(--hover-bg)] rounded-full text-[13.5px] text-[var(--text)] cursor-pointer hover:bg-[var(--border)] transition-colors">
                {t('chat.search_overlay.filters.reactions')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Normal List */
        <div className="flex-1 overflow-y-auto px-2 pt-2 custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--sub-text)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-3">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-[14px]">
                {filterTab === 'requests' ? 'Không có tin nhắn chờ' : filterTab === 'unread' ? 'Không có tin nhắn chưa đọc' : 'Không có hội thoại'}
              </span>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                onContextMenu={(e) => handleContextMenu(e, conv.id)}
                className={`flex items-center p-3 mb-1 gap-3 rounded-xl cursor-pointer transition-all group border ${conv.active ? 'bg-[var(--active-bg)] border-[var(--active-card-border)]' : 'hover:bg-[var(--hover-bg)] border-transparent hover:border-[var(--active-card-border)]'}`}
              >
                {/* Avatar / Icon */}
                <div className={`h-12 w-12 rounded-full border-[1px] border-black/[0.06] dark:border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative ${conv.isCloud ? 'bg-[#0068FF]' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {conv.isCloud ? (
                    /* My Cloud Icon similar to image */
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                      <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-6c-2.33 0-4.5 1.17-4.5 2.5V14h9v-1.5c0-1.33-2.17-2.5-4.5-2.5z" />
                    </svg>
                  ) : conv.avatar ? (
                    <Image src={conv.avatar} alt={conv.name} width={48} height={48} className="object-cover" unoptimized />
                  ) : (
                    <div className="text-[var(--primary)] font-bold text-lg">
                      {conv.name.charAt(0)}
                    </div>
                  )}
                  {/* Online status dot */}
                  {conv.otherUserId && (
                    <StatusIndicator userId={conv.otherUserId} dotOnly dotSize={12} className="absolute bottom-0 right-0" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className={`text-[15px] ${conv.pinned ? 'font-bold' : 'font-medium'} truncate text-[var(--text)]`}>{conv.name}</h4>
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-[#708090] font-medium mr-1">{conv.time}</span>
                      {conv.pinned && (
                        <div className="text-[#708090] opacity-80 shrink-0 transform rotate-45 mr-1">
                          <PinIcon size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center h-5">
                    <div className={`text-[13px] flex items-center gap-1.5 truncate ${conv.unreadCount && conv.unreadCount > 0 ? 'text-[var(--text)] font-semibold' : 'text-[#708090]'}`}>
                      {conv.otherUserId && conv.lastMsg === 'Bắt đầu trò chuyện' ? (
                        isOnline(conv.otherUserId) ? (
                          <span className="text-green-500 font-medium">Đang hoạt động</span>
                        ) : getTimeAgo(conv.otherUserId) ? (
                          <span className="truncate">{getTimeAgo(conv.otherUserId)}</span>
                        ) : (
                          <span className="truncate">{conv.lastMsg}</span>
                        )
                      ) : (
                        <span className="truncate">{conv.lastMsg}</span>
                      )}
                    </div>

                    {/* Unread Badge */}
                    {conv.unreadCount ? (
                      <div className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 bg-[#EF4444]">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </div>
                    ) : null}

                    <button
                      onClick={(e) => openContextMenuFromButton(e, conv.id)}
                      className="hidden group-hover:flex opacity-60 hover:opacity-100 p-0.5 hover:bg-black/5 rounded transition-all text-gray-500 absolute right-4"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Conversation Context Menu */}
      {renderContextMenu()}
    </div>
  );
}
