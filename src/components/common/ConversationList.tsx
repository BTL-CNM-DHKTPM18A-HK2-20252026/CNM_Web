import React from 'react';
import { useTranslation } from 'react-i18next';
import { SearchIcon, AddUserIcon, PinIcon, ImagePickerIcon, CreateGroupIcon, ChevronDownIcon, MoreHorizontalIcon } from '@/components/ui/Icons';

interface Conversation {
  id: number;
  name: string;
  lastMsg: string;
  time: string;
  active?: boolean;
  pinned?: boolean;
  isCloud?: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
}

export function ConversationList({ conversations }: ConversationListProps) {
  const { t } = useTranslation();
  return (
    <div className="w-[340px] border-r border-[var(--border)] flex flex-col bg-[var(--card-bg)] transition-colors duration-200">
      {/* Header Container (Search + Tabs) */}
      <div className="flex flex-col">
        {/* Search Header */}
        <div className="p-4 py-3 flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <input 
              type="text" 
              placeholder={t('chat.search')} 
              className="w-full bg-[var(--search-bg)] rounded-lg py-1.5 pl-9 text-[14px] text-[var(--text)] outline-none border border-transparent focus:border-[var(--primary)]/20 transition-all placeholder:text-[var(--search-placeholder)]" 
            />
            <div className="absolute left-3 text-gray-400"><SearchIcon size={16} /></div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="p-1.5 cursor-pointer hover:bg-[var(--hover-bg)] text-[var(--text)] opacity-80 rounded-md transition-colors"><AddUserIcon size={20} /></button>
            <button className="p-1.5 cursor-pointer hover:bg-[var(--hover-bg)] text-[var(--text)] opacity-80 rounded-md transition-colors"><CreateGroupIcon size={22} /></button>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="flex items-center justify-between px-4 pb-0.5 border-b border-[var(--border)]">
          <div className="flex gap-6 text-[14px] font-medium transition-colors duration-200">
            <button className="py-2.5 border-b-2 border-[var(--primary)] text-[var(--primary)] cursor-pointer transition-colors relative">
              {t('chat.tabs.all')}
            </button>
            <button className="py-2.5 text-[var(--sub-text)] cursor-pointer hover:text-[var(--text)] transition-colors">
              {t('chat.tabs.unread')}
            </button>
          </div>
          <div className="flex items-center gap-4 text-[13px] text-[var(--sub-text)]">
            <button className="flex items-center gap-1 cursor-pointer hover:text-[var(--text)] transition-colors">
              {t('chat.classify')} <ChevronDownIcon size={14} />
            </button>
            <button 
              title={t('chat.more')}
              className="p-1 cursor-pointer hover:bg-[var(--hover-bg)] rounded-md text-[var(--sub-text)] hover:text-[var(--text)] transition-colors"
            >
              <MoreHorizontalIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pt-2">
        {conversations.map((conv) => (
          <div 
            key={conv.id} 
            className={`flex items-center p-3 mb-1 gap-3 rounded-xl cursor-pointer transition-all group border ${conv.active ? 'bg-[var(--active-bg)] border-[var(--active-card-border)]' : 'hover:bg-[var(--hover-bg)] border-transparent hover:border-[var(--active-card-border)]'}`}
          >
            {/* Avatar / Icon */}
            <div className={`h-12 w-12 rounded-full border-[1.5px] border-black/5 overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm ${conv.id === 5 ? 'bg-[#0068FF]' : 'bg-gray-100 dark:bg-gray-800'}`}>
              {conv.id === 5 ? (
                /* My Cloud Icon similar to image */
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                   <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-6c-2.33 0-4.5 1.17-4.5 2.5V14h9v-1.5c0-1.33-2.17-2.5-4.5-2.5z"/>
                </svg>
              ) : (
                <div className="text-[var(--primary)] font-bold text-lg">
                   {conv.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <h4 className={`text-[15px] font-medium truncate text-[var(--text)]`}>{conv.name}</h4>
                <div className="flex items-center gap-1">
                   <span className="text-[12px] text-[#708090] font-medium mr-1.5">{conv.id === 5 ? '19 phút' : conv.time}</span>
                   <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-black/5 rounded transition-all text-gray-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                   </button>
                </div>
              </div>
              <div className="flex justify-between items-center h-5">
                <div className={`text-[13px] flex items-center gap-1.5 truncate text-[#708090] font-medium`}>
                   {conv.id === 5 ? (
                     <>
                        <span className="shrink-0">Bạn:</span>
                        <div className="shrink-0"><ImagePickerIcon size={16} /></div>
                        <span className="truncate">Hình ảnh</span>
                     </>
                   ) : (
                     <span className="truncate">{conv.lastMsg}</span>
                   )}
                </div>
                {conv.pinned && (
                  <div className="text-[#708090] opacity-80 shrink-0 ml-2">
                    <PinIcon size={14} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
