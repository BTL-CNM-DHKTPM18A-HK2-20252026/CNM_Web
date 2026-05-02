import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { SearchIcon } from '@/components/ui/Icons';
import { useTheme } from '@/themes';
import emojiPack from '@/data/emoji-pack.json';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  activeTab?: 'sticker' | 'emoji' | 'gif';
  className?: string;
}

interface StickerItem {
  id: string;
  src: string;
}

interface StickerPackData {
  id: string;
  name: string;
  icon: string;
  stickers: StickerItem[];
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
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [stickerPacks, setStickerPacks] = useState<StickerPackData[]>([]);
  const [activeStickerPackId, setActiveStickerPackId] = useState('');
  const [stickerLoading, setStickerLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const { currentTheme } = useTheme();
  const { t } = useTranslation();
  const S3_BASE = process.env.NEXT_PUBLIC_S3_BASE_URL ?? '';
  const normalizeSrc = (src: string) =>
    S3_BASE + src.replace(/\\/g, '/').replace(/\.webp$/i, '.png');
  const normalizeEmojiSrc = (src: string) =>
    S3_BASE + src.replace('/fruvia_emoji', '');

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

  // Lazy-load sticker packs from S3 the first time the sticker tab is opened
  useEffect(() => {
    if (activeTab !== 'sticker' || stickerPacks.length > 0) return;
    setStickerLoading(true);
    fetch(`${S3_BASE}/stickers/sticker-pack.json`)
      .then(r => r.json())
      .then((data: { packs: StickerPackData[] }) => {
        const packs = data.packs.filter(p => p.id !== 'pack_0');
        setStickerPacks(packs);
        setActiveStickerPackId(packs[0]?.id ?? '');
      })
      .catch(() => { /* silent – giữ nguyên "Chưa có sticker" khi lỗi */ })
      .finally(() => setStickerLoading(false));
  }, [activeTab, S3_BASE, stickerPacks.length]);

  const activePack = stickerPacks.find(p => p.id === activeStickerPackId);
  const filteredStickers = activePack
    ? (searchQuery.trim()
        ? activePack.stickers.filter(s => s.id.toLowerCase().includes(searchQuery.toLowerCase()))
        : activePack.stickers)
    : [];

  if (!isOpen) return null;

  const tabs = [
    { id: 'sticker', label: 'STICKER' },
    { id: 'emoji', label: 'EMOJI' },
  ];

  const handleEmojiClick = (emoji: any) => {
    onSelect(emoji.shortcode);
    onClose();
  };

  // Optimization: If no search query, only render the active category to prevent DOM bloat and lag.
  // If searching, show all matching categories.
  const displayCategories = searchQuery.trim() 
    ? emojiPack.categories.map(cat => ({
        ...cat,
        icons: cat.icons.filter(icon => 
          icon.shortcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          icon.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      })).filter(cat => cat.icons.length > 0)
    : emojiPack.categories.filter(cat => cat.id === activeCategory);

  return (
    <div
      ref={pickerRef}
      className={`absolute mb-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-2xl z-[50] flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-200 ${className || 'w-[400px] h-[480px] left-4 bottom-full'}`}
    >
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 h-10 shrink-0">
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
      <div className="p-2.5 shrink-0 border-b border-[var(--border)]">
        <div className="relative shrink-0">
          <input
            type="text"
            placeholder={activeTab === 'sticker' ? t('sticker.search_sticker') : "Tìm kiếm emoji..."}
            className="w-full h-8 bg-[var(--hover-bg)] border border-transparent rounded-full pl-9 pr-4 text-[13px] text-[var(--text)] focus:bg-[var(--card-bg)] focus:border-[#0068FF] outline-none transition-all placeholder:text-[var(--sub-text)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sub-text)]">
            <SearchIcon size={16} />
          </div>
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto px-1 py-4 modal-scrollbar">
          {activeTab === 'sticker' && stickerLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {activeTab === 'sticker' && !stickerLoading && stickerPacks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-[var(--sub-text)] opacity-60 py-10">
              <p>Chưa có sticker</p>
            </div>
          )}
          {activeTab === 'sticker' && !stickerLoading && stickerPacks.length > 0 && (
            <div className="grid grid-cols-5 gap-1 px-1">
              {filteredStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  onClick={() => { onSelect(normalizeSrc(sticker.src)); onClose(); }}
                  className="p-1 rounded-md hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-center cursor-pointer group"
                  title={sticker.id}
                >
                  <img
                    src={normalizeSrc(sticker.src)}
                    alt={sticker.id}
                    className="w-14 h-14 object-contain group-hover:scale-110 transition-transform"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {activeTab === 'emoji' && (
            <div className="flex flex-col gap-6">
              {displayCategories.map((cat) => (
                <div key={cat.id}>
                  <h3 className="text-[12px] font-bold text-[var(--sub-text)] uppercase mb-3 px-1">{cat.name}</h3>
                  <div className="grid grid-cols-8 gap-1">
                    {cat.icons.map((icon) => (
                      <button
                        key={icon.id}
                        onClick={() => handleEmojiClick(icon)}
                        className="p-1 rounded-md hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-center cursor-pointer group"
                        title={icon.shortcode}
                      >
                        <Image 
                          src={normalizeEmojiSrc(icon.src)}
                          alt={icon.alt}
                          width={32}
                          height={32}
                          className="group-hover:scale-110 transition-transform"
                          unoptimized
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {displayCategories.length === 0 && (
                <div className="text-center py-20 text-[var(--sub-text)]">
                  Không tìm thấy emoji nào phù hợp
                </div>
              )}
            </div>
          )}
        </div>

      {/* Bottom Navigation - Categories */}
      {activeTab === 'emoji' && (
        <div className="h-10 border-t border-[var(--border)] flex items-center px-2 shrink-0 bg-[var(--card-bg)] overflow-x-auto no-scrollbar gap-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {emojiPack.categories.map((cat) => {
            const representativeIcon = cat.icons[0];
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer shrink-0 flex items-center justify-center
                  ${activeCategory === cat.id 
                    ? 'bg-[#0068FF]/10 text-[#0068FF] ring-1 ring-[#0068FF]/30' 
                    : 'hover:bg-[var(--hover-bg)] opacity-60 hover:opacity-100'
                  }
                `}
                title={cat.name}
              >
                {representativeIcon ? (
                  <Image 
                    src={normalizeEmojiSrc(representativeIcon.src)}
                    alt={cat.name}
                    width={18}
                    height={18}
                    className="w-[18px] h-[18px] object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-[10px] font-bold uppercase">{cat.name.substring(0, 2)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'sticker' && (
        <div className="h-12 border-t border-[var(--border)] flex items-center px-2 shrink-0 bg-[var(--card-bg)] overflow-x-auto no-scrollbar gap-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {stickerPacks.map((pack) => {
            const iconSticker = pack.stickers[0];
            return (
              <button
                key={pack.id}
                onClick={() => { setActiveStickerPackId(pack.id); setSearchQuery(''); }}
                className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center transition-all cursor-pointer
                  ${
                    activeStickerPackId === pack.id
                      ? 'bg-[#0068FF]/10 ring-1 ring-[#0068FF]/30'
                      : 'hover:bg-[var(--hover-bg)] opacity-60 hover:opacity-100'
                  }
                `}
                title={pack.name}
              >
                {iconSticker ? (
                  <img
                    src={normalizeSrc(iconSticker.src)}
                    alt={pack.name}
                    className="w-6 h-6 object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-[9px] font-bold uppercase">{pack.name.substring(0, 2)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
