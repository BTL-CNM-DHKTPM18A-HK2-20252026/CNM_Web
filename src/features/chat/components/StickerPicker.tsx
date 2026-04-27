import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { SearchIcon, ClockIcon } from '@/components/ui/Icons';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { useTheme } from '@/themes';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sticker: any) => void;
  activeTab?: 'sticker' | 'emoji' | 'gif';
  className?: string;
}

export function StickerPicker({ 
  isOpen, 
  onClose, 
  onSelect, 
  activeTab: initialTab = 'sticker',
  className = ""
}: StickerPickerProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const { currentTheme } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'sticker', label: 'STICKER' },
    { id: 'emoji', label: 'EMOJI' },
  ];

  // STICKER DATA (Empty for now)
  const amiStickers: any[] = [];
  const recentStickers: any[] = [];

  const onEmojiClick = (emojiData: EmojiClickData) => {
    onSelect(emojiData.emoji);
    onClose();
  };

  return (
    <div
      ref={pickerRef}
      className={`absolute mb-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-2xl z-[50] flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-200 ${className || 'w-[400px] h-[480px] left-4 bottom-full'}`}
    >
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 h-12 shrink-0">
        <div className="flex items-center h-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`h-full px-4 text-[13px] font-bold transition-all relative cursor-pointer
                ${activeTab === tab.id ? 'text-[#0068FF]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}
              `}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0068FF] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
        <button className="p-1.5 hover:bg-[var(--hover-bg)] rounded-md text-[var(--sub-text)] transition-colors cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
        </button>
      </div>

      {/* Search Bar Area */}
      <div className="p-4 flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
        <div className="relative shrink-0">
          <input
            type="text"
            placeholder={activeTab === 'sticker' ? t('sticker.search_sticker') : t('sticker.search_emoji')}
            className="w-full h-9 bg-[var(--hover-bg)] border border-transparent rounded-full pl-9 pr-4 text-[13px] text-[var(--text)] focus:bg-[var(--card-bg)] focus:border-[#0068FF] outline-none transition-all placeholder:text-[var(--sub-text)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sub-text)]">
            <SearchIcon size={16} />
          </div>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {activeTab === 'sticker' && (
            <div className="flex flex-col items-center justify-center h-full text-[var(--sub-text)] opacity-60 py-10">
              <p>Chưa có sticker</p>
            </div>
          )}

          {activeTab === 'emoji' && (
            <div className="absolute inset-0 top-[108px] bottom-12 overflow-hidden bg-[var(--card-bg)]">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                width="100%"
                height="100%"
                theme={currentTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
                searchDisabled={true} // We have our own search if we want, but library search is better
                skinTonesDisabled={true}
                previewConfig={{ showPreview: false }}
                autoFocusSearch={false}
              />
            </div>
          )}


        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="h-12 border-t border-[var(--border)] flex items-center px-4 shrink-0 bg-[var(--card-bg)]">
        <div className="flex items-center gap-1">
          <button className="h-9 w-9 flex items-center justify-center rounded-md bg-[var(--hover-bg)] text-[#0068FF] transition-all cursor-pointer">
            <ClockIcon size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
