import React from 'react';
import {
  SearchIcon,
  StickerIcon,
  ImagePickerIcon,
  FilePickerIcon,
  ScreenShotIcon,
  BusinessCardIcon,
  LightningIcon,
  EmojiIcon,
  LikeIcon
} from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';

interface ChatWindowProps {
  onToggleInfo: () => void;
  showInfo: boolean;
}

export function ChatWindow({ onToggleInfo, showInfo }: ChatWindowProps) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] transition-colors duration-200">
      {/* HEADER */}
      <div className="h-[64px] bg-[var(--card-bg)] border-b border-[var(--border)] px-4 flex items-center justify-between shadow-sm flex-shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-[#0068FF] font-bold shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L10 13.17l7.59-7.59L19 7l-8 9z" /></svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold leading-none mb-1 text-[var(--text)] truncate">{t('chat.self_cloud')}</h3>
            <p className="text-[11px] text-[var(--sub-text)] truncate">{t('chat.cloud_subheading')}</p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[var(--sub-text)] pr-2 shrink-0">
          <button className="cursor-pointer hover:text-[#0068FF] transition-colors opacity-70"><SearchIcon size={20} /></button>
          <button 
            onClick={onToggleInfo}
            className={`cursor-pointer transition-all p-1 rounded-md ${showInfo ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {/* Messages will be rendered here */}
        <div className="flex flex-col items-center justify-center h-full text-[var(--sub-text)] opacity-40 italic text-sm">
          {t('chat.cloud_subheading')}
        </div>
      </div>

      {/* REFINED INPUT BAR (Like the screenshot) */}
      <div className="bg-[var(--card-bg)] border-t border-[var(--border)] flex-shrink-0 transition-colors duration-200">
        {/* Row 1: Actions */}
        <div className="flex items-center px-4 py-1.5 gap-1.5 border-b border-[var(--border)] transition-colors duration-200">
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><StickerIcon size={20} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><ImagePickerIcon size={20} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><FilePickerIcon size={20} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><ScreenShotIcon size={20} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><BusinessCardIcon size={20} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><LightningIcon size={20} /></button>
        </div>

        {/* Row 2: Text Input */}
        <div className="flex items-center px-4 py-3 gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={t('chat.input_placeholder')}
              className="w-full bg-transparent outline-none text-[15px] placeholder:text-[var(--sub-text)] placeholder:opacity-50 py-1 text-[var(--text)]"
            />
          </div>
          <div className="flex items-center gap-2 pr-1 shrink-0">
            <button className="cursor-pointer text-[var(--sub-text)] hover:text-[#0068FF] transition-colors"><EmojiIcon size={22} /></button>
            <button className="cursor-pointer text-[#fbbf24] transition-transform hover:scale-110 active:scale-90"><LikeIcon size={24} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
