'use client';
import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const CameraIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

const PencilIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="w-[400px] bg-[var(--card-bg)] rounded-lg overflow-hidden shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 border border-[var(--border)]">
        
        {/* Header - Overlays the cover image */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/40 to-transparent">
          <h2 className="text-[16px] font-semibold text-white drop-shadow-md">{t('profile.title')}</h2>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-white/10 p-1.5 rounded-full transition-all cursor-pointer"
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* Cover Photo */}
          <div className="h-[180px] w-full bg-[#2A333A] relative group">
            <Image 
              src="https://picsum.photos/id/1018/800/400" 
              alt="Cover" 
              fill
              className="object-cover opacity-90"
            />
            <button className="absolute bottom-3 right-3 w-[34px] h-[34px] bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all cursor-pointer border border-white/20">
              <CameraIcon size={18} />
            </button>
          </div>

          {/* Profile Details */}
          <div className="px-4 pb-6">
            {/* Avatar and Name Section */}
            <div className="flex items-end gap-4 -mt-8 relative z-20 mb-6">
              <div className="relative ml-2">
                <div className="w-[88px] h-[88px] rounded-full border-[3px] border-[var(--card-bg)] overflow-hidden bg-[#2A333A] shadow-xl">
                   <Image 
                    src="https://avatar.talk.vtalk.ai/avatar/default" 
                    width={88} 
                    height={88} 
                    alt="Avatar" 
                    className="w-full h-full object-cover" 
                   />
                </div>
                <button className="absolute bottom-0 right-0 w-[28px] h-[28px] bg-[var(--card-bg)] rounded-full flex items-center justify-center text-gray-400 border border-[var(--border)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer shadow-md">
                  <CameraIcon size={14} />
                </button>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-[18px] font-bold text-[var(--text)]">Nguyễn Quang Huy</h1>
                <button className="p-1 hover:bg-[var(--hover-bg)] rounded-full text-gray-400 transition-colors cursor-pointer">
                   <PencilIcon size={16} />
                </button>
              </div>
            </div>

            {/* Info Sections */}
            <div className="space-y-6">
              <div className="bg-[var(--background)]/50 rounded-xl p-4 border border-[var(--border)]/50">
                <h3 className="text-[15px] font-bold text-[var(--text)] mb-4">{t('profile.personal_info')}</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-[var(--sub-text)]">{t('profile.gender')}</span>
                    <span className="text-[14px] text-[var(--text)] font-medium">{t('profile.gender_male')}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-[var(--sub-text)]">{t('profile.birthday')}</span>
                    <span className="text-[14px] text-[var(--text)] font-medium">20/04/2004</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/50">
                    <span className="text-[14px] text-[var(--sub-text)]">{t('profile.phone')}</span>
                    <span className="text-[14px] text-[var(--text)] font-medium">+84 399 614 016</span>
                  </div>
                </div>
              </div>

              <div className="px-2">
                <p className="text-[13px] text-[var(--sub-text)] italic leading-snug">
                  {t('profile.privacy_note')}
                </p>
              </div>

              <div className="pt-2">
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--hover-bg)] hover:bg-[var(--active-bg)] border border-[var(--border)] rounded-xl transition-all text-[var(--text)] font-bold text-[15px] cursor-pointer active:scale-[0.98]">
                  <PencilIcon size={18} />
                  {t('profile.update')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
