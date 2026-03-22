'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { ChevronDownIcon } from '@/components/ui/Icons';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const SearchIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

const CameraIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { t, i18n } = useTranslation();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const tagsRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    if (tagsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tagsRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }
  };

  useEffect(() => {
    // Initial check
    setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [isOpen]);

  const scrollTags = (direction: 'left' | 'right') => {
    if (tagsRef.current) {
      const scrollAmount = 200;
      tagsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const contacts = [
    { id: 1, name: 'Mẫn Nghi', avatar: 'https://picsum.photos/id/101/40/40', type: 'recent' },
    { id: 2, name: 'Dung Nguyen Tri', avatar: 'https://picsum.photos/id/102/40/40', type: 'recent' },
    { id: 3, name: 'Mẹ', avatar: 'https://picsum.photos/id/103/40/40', type: 'recent' },
    { id: 4, name: 'Hoàng Dep Trai', avatar: 'https://picsum.photos/id/104/40/40', type: 'recent' },
    { id: 5, name: 'Trâm', avatar: 'https://picsum.photos/id/105/40/40', type: 'recent' },
    { id: 6, name: 'Ái Vy', avatar: 'https://picsum.photos/id/106/40/40', type: 'contact', initial: 'A' },
    { id: 7, name: 'Anh Đào', avatar: 'https://picsum.photos/id/107/40/40', type: 'contact', initial: 'A' },
    { id: 8, name: 'Anh Thành chủ trọ', avatar: 'https://picsum.photos/id/108/40/40', type: 'contact', initial: 'A' },
  ];

  const filterTabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'customer', label: 'Khách hàng' },
    { key: 'family', label: 'Gia đình' },
    { key: 'work', label: 'Công việc' },
    { key: 'friends', label: 'Bạn bè' },
    { key: 'reply_later', label: 'Trả lời sau' },
    { key: 'colleagues', label: 'Đồng nghiệp' },
  ];

  const toggleMember = (id: number) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="w-full max-w-[520px] bg-[var(--card-bg)] rounded-md shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col h-[85vh] max-h-[720px]">
        {/* Header */}
        <div className="h-[52px] border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--card-bg)] shrink-0">
          <h2 className="text-[17px] font-bold text-[var(--text)]">Tạo nhóm</h2>
          <button onClick={onClose} className="text-[var(--text)] hover:bg-[var(--hover-bg)] p-1 rounded-full transition-all cursor-pointer">
            <XIcon size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col p-5 gap-5">
          {/* Group Name & Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-[48px] h-[48px] rounded-full border border-[var(--border)] flex items-center justify-center text-gray-400 hover:bg-[var(--hover-bg)] cursor-pointer transition-colors shrink-0">
              <CameraIcon size={22} />
            </div>
            <div className="flex-1 border-b border-[var(--border)] focus-within:border-[#0068FF] transition-all">
              <input 
                type="text" 
                placeholder="Nhập tên nhóm..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-transparent border-none outline-none py-2 text-[16px] text-[var(--text)] placeholder:text-[var(--sub-text)] font-bold"
              />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Nhập tên, số điện thoại, hoặc danh sách số điện thoại"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border border-[var(--border)] rounded-full py-2.5 pl-10 pr-4 text-[14px] text-[var(--text)] focus:border-[#0068FF] outline-none transition-all placeholder:text-[var(--sub-text)]"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon size={18} />
            </div>
          </div>

          {/* Tags with Semi-Circle Navigation Buttons */}
          <div className="shrink-0 -mx-5 px-5 pb-4 border-b border-[var(--border)]">
            <div className="relative">
              {/* Left Semi-Circle Button */}
              {canScrollLeft && (
                <button 
                  onClick={() => scrollTags('left')}
                  className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-7 h-11 bg-[var(--card-bg)] border border-[var(--border)] border-l-0 rounded-r-full shadow-[2px_0_8px_rgba(0,0,0,0.1)] flex items-center justify-center z-10 hover:bg-[var(--hover-bg)] transition-all cursor-pointer animate-in slide-in-from-left-2 fade-in active:scale-95"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="rotate-180 mr-1"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              )}

              <div 
                ref={tagsRef}
                onScroll={checkScroll}
                className="flex items-center gap-2 overflow-x-hidden scroll-smooth no-scrollbar py-0.5"
              >
                {filterTabs.map((tab, idx) => (
                  <button 
                    key={tab.key}
                    className={`px-3.5 py-1.5 rounded-[3px] text-[13px] font-bold whitespace-nowrap transition-all cursor-pointer
                      ${idx === 0 ? 'bg-[#0068FF] text-white' : 'bg-[var(--hover-bg)] text-[var(--text)] hover:opacity-80'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Right Semi-Circle Button */}
              {canScrollRight && (
                <button 
                  onClick={() => scrollTags('right')}
                  className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-7 h-11 bg-[var(--card-bg)] border border-[var(--border)] border-r-0 rounded-l-full shadow-[-2px_0_8px_rgba(0,0,0,0.1)] flex items-center justify-center z-10 hover:bg-[var(--hover-bg)] transition-all cursor-pointer animate-in slide-in-from-right-2 fade-in active:scale-95"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-1"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Member List */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-[14px] font-bold text-[var(--text)] mb-3 shrink-0">Trò chuyện gần đây</h3>
            
            <div className="flex-1 overflow-y-auto px-1 custom-scrollbar space-y-1">
              {contacts.filter(c => c.type === 'recent').map(user => (
                <label key={user.id} className="flex items-center gap-4 p-2 hover:bg-[var(--hover-bg)] rounded-lg cursor-pointer group transition-colors select-none">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="peer hidden" 
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => toggleMember(user.id)}
                    />
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#0068FF] peer-checked:bg-[#0068FF] transition-all flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" className={`transition-transform duration-200 ${selectedMembers.includes(user.id) ? 'scale-100' : 'scale-0'}`}><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-black/5 bg-gray-100 flex-shrink-0">
                    <Image src={user.avatar} width={40} height={40} alt={user.name} className="object-cover" />
                  </div>
                  <span className="text-[15px] text-[var(--text)] font-medium flex-1 truncate">{user.name}</span>
                </label>
              ))}

              <div className="pt-4 pb-2">
                <h3 className="text-[14px] font-bold text-[var(--text)] mb-3">A</h3>
                {contacts.filter(c => c.type === 'contact').map(user => (
                  <label key={user.id} className="flex items-center gap-4 p-2 hover:bg-[var(--hover-bg)] rounded-lg cursor-pointer group transition-colors select-none">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        className="peer hidden" 
                        checked={selectedMembers.includes(user.id)}
                        onChange={() => toggleMember(user.id)}
                      />
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#0068FF] peer-checked:bg-[#0068FF] transition-all flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" className={`transition-transform duration-200 ${selectedMembers.includes(user.id) ? 'scale-100' : 'scale-0'}`}><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-black/5 bg-gray-100 flex-shrink-0">
                      <Image src={user.avatar} width={40} height={40} alt={user.name} className="object-cover" />
                    </div>
                    <span className="text-[15px] text-[var(--text)] font-medium flex-1 truncate">{user.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--card-bg)] shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-1.5 bg-[var(--hover-bg)] hover:bg-[#dfe0e2] dark:hover:opacity-80 text-[var(--text)] font-bold rounded-[3px] text-[15px] transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button 
            disabled={groupName.length === 0 || selectedMembers.length === 0}
            className={`px-5 py-1.5 font-bold rounded-[3px] text-[15px] transition-all min-w-[120px] ${
              groupName.length > 0 && selectedMembers.length > 0
                ? 'bg-[#0068FF] text-white hover:bg-[#0057d1] cursor-pointer' 
                : 'bg-[#0068FF]/30 text-white/50 cursor-default'
            }`}
          >
            Tạo nhóm
          </button>
        </div>
      </div>
    </div>
  );
}
