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

export function ChatWindow() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col bg-[#F4F5F7]">
      {/* HEADER */}
      <div className="h-[64px] bg-white border-b border-gray-300 px-4 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-[#0068FF] font-bold shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L10 13.17l7.59-7.59L19 7l-8 9z" /></svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold leading-none mb-1 text-[#1e293b] truncate">{t('chat.self_cloud')}</h3>
            <p className="text-[11px] text-gray-500 truncate">{t('chat.cloud_subheading')}</p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-gray-400 pr-2 shrink-0">
          <button className="cursor-pointer hover:text-[#0068FF] transition-colors"><SearchIcon size={20} /></button>
          <button className="cursor-pointer hover:text-[#0068FF] transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <div className="flex justify-center my-2">
          <span className="px-3 py-1 bg-gray-200/50 rounded-full text-[11px] text-gray-500 font-medium">{t('chat.today')}</span>
        </div>
        <div className="self-end max-w-[70%] text-right mb-2 group">
          <div className="bg-[#E5EFFF] p-3 rounded-xl rounded-tr-none shadow-sm text-sm border border-blue-100 inline-block text-left text-[#1e293b]">
            ngrok http 8080
          </div>
          <div className="text-[10px] text-gray-400 mt-1 italic mr-1">09:24</div>
        </div>
      </div>

      {/* REFINED INPUT BAR (Like the screenshot) */}
      <div className="bg-white border-t border-gray-300 flex-shrink-0">
        {/* Row 1: Actions */}
        <div className="flex items-center px-4 py-2 gap-5 text-gray-400 border-b border-gray-300">
          <button className="cursor-pointer hover:text-[#0068FF] transition-colors"><StickerIcon size={20} /></button>
          <button className="cursor-pointer hover:text-[#0068FF] transition-colors"><ImagePickerIcon size={20} /></button>
          <button className="cursor-pointer hover:text-[#0068FF] transition-colors"><FilePickerIcon size={20} /></button>
          <button className="cursor-pointer hover:text-[#0068FF] transition-colors"><ScreenShotIcon size={20} /></button>
          <button className="cursor-pointer hover:text-[#0068FF] transition-colors"><BusinessCardIcon size={20} /></button>
          <button className="cursor-pointer hover:text-[#0068FF] transition-colors"><LightningIcon size={20} /></button>
        </div>

        {/* Row 2: Text Input */}
        <div className="flex items-center px-4 py-3 gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={t('chat.input_placeholder')}
              className="w-full outline-none text-[15px] placeholder:text-gray-400 py-1 text-[#1e293b]"
            />
          </div>
          <div className="flex items-center gap-2 pr-1 shrink-0">
            <button className="cursor-pointer text-gray-400 hover:text-[#0068FF] transition-colors"><EmojiIcon size={22} /></button>
            <button className="cursor-pointer text-[#fbbf24] transition-transform hover:scale-110 active:scale-90"><LikeIcon size={24} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
