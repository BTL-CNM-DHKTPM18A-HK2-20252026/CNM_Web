import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchIcon, AddUserIcon, PinIcon, ImagePickerIcon, CreateGroupIcon, ChevronDownIcon, MoreHorizontalIcon } from '@/components/ui/Icons';
import Image from 'next/image';

interface Conversation {
  id: number;
  name: string;
  lastMsg: string;
  time: string;
  active?: boolean;
  pinned?: boolean;
  isCloud?: boolean;
  avatar?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
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

export function ConversationList({ conversations }: ConversationListProps) {
  const { t, i18n } = useTranslation();
  const [isSearching, setIsSearching] = useState(false);
  const [showClassifyMenu, setShowClassifyMenu] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const classifyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (classifyMenuRef.current && !classifyMenuRef.current.contains(event.target as Node)) {
        // Find if the click was on the button itself to avoid double-toggling
        const target = event.target as HTMLElement;
        if (!target.closest('.classify-button')) {
            setShowClassifyMenu(false);
        }
      }
    }
    
    if (showClassifyMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClassifyMenu]);

  const classifyItems = [
    { key: 'customer', color: '#EF4444' }, // Red
    { key: 'family', color: '#4ADE80' },   // Green
    { key: 'work', color: '#F97316' },     // Orange
    { key: 'friends', color: '#8B5CF6' },  // Purple
    { key: 'reply_later', color: '#FACC15' }, // Yellow
    { key: 'colleagues', color: '#0068FF' }, // Blue
  ];

  const recentSearches: SearchItem[] = [
    { id: 101, name: 'Trần Hồng Nhiên', avatar: 'https://picsum.photos/id/101/40/40' },
    { id: 102, name: 'Mẹ', avatar: 'https://picsum.photos/id/102/40/40' },
    { id: 103, name: 'CNM - Nhóm 10', isGroup: true, avatars: ['https://picsum.photos/id/103/20/20', 'https://picsum.photos/id/104/20/20', 'https://picsum.photos/id/105/20/20', 'https://picsum.photos/id/106/20/20'] },
    { id: 108, name: 'Xuân Hồ', isInitial: true, initial: 'XH', bgColor: '#7C3AED' },
  ];

  const toggleTag = (key: string) => {
    setSelectedTags(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const clearTags = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTags([]);
    setShowClassifyMenu(false); // Close as per user request
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
              <button className="p-1.5 cursor-pointer hover:bg-[var(--hover-bg)] text-[var(--text)] opacity-80 rounded-md transition-colors"><AddUserIcon size={20} /></button>
              <button className="p-1.5 cursor-pointer hover:bg-[var(--hover-bg)] text-[var(--text)] opacity-80 rounded-md transition-colors"><CreateGroupIcon size={22} /></button>
            </div>
          )}
        </div>

        {!isSearching && (
          /* Tabs and Filters */
          <div className="flex items-center justify-between px-4 pb-0.5 border-b border-[var(--border)] relative">
            <div className="flex gap-6 text-[14px] font-medium transition-colors duration-200">
              <button className="py-2.5 border-b-2 border-[var(--primary)] text-[var(--primary)] cursor-pointer transition-colors relative">
                {t('chat.tabs.all')}
              </button>
              <button className="py-2.5 text-[var(--sub-text)] cursor-pointer hover:text-[var(--text)] transition-colors">
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
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
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
                               <Image src={a} alt="av" fill className="object-cover" />
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
                            <svg viewBox="0 0 24 24" className="text-blue-900 fill-current"><path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
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
      )}
    </div>
  );
}
