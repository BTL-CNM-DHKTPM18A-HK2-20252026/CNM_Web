import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { SettingsIcon, GridIcon, BookmarkIcon, TagIcon, ClapperboardIcon } from '@/components/ui/Icons';
import { NewNoteModal } from './NewNoteModal';
// import { Film } from 'lucide-react';

interface SocialProfileHeaderProps {
  user: any;
  postCount?: number;
  onEditClick?: () => void;
  onArchiveClick?: () => void;
}

export const SocialProfileHeader: React.FC<SocialProfileHeaderProps> = ({ user, postCount = 0, onEditClick, onArchiveClick }) => {
  const { t } = useTranslation();
  const [isNoteModalOpen, setIsNoteModalOpen] = React.useState(false);
  const [activeNote, setActiveNote] = React.useState<string | null>(null);

  const handleShareNote = (noteText: string) => {
    setActiveNote(noteText);
    setIsNoteModalOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 md:gap-20 mb-12 px-4 md:px-0">
      {/* Avatar */}
      <div className="flex justify-center md:block">
        <div className="relative group/avatar">
          {/* Note Bubble */}
          <div 
            className="absolute -top-4 -left-2 md:-top-6 md:-left-4 z-10 animate-in fade-in zoom-in duration-300"
            onClick={() => setIsNoteModalOpen(true)}
          >
            <div className="relative bg-white dark:bg-[#262626] px-3 py-2 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform">
              <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium max-w-[80px] truncate">
                {activeNote || 'Note...'}
              </span>
              <div className="flex flex-col -mr-1 opacity-40">
                <span className="text-[8px] leading-none">▲</span>
                <span className="text-[8px] leading-none">▼</span>
              </div>
              
              {/* Bubble Tail */}
              <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white dark:bg-[#262626] border-r border-b border-gray-100 dark:border-gray-800 rotate-45"></div>
            </div>
          </div>

          <div className="relative w-20 h-20 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-gray-100 dark:border-gray-800 cursor-pointer">
            <Image 
              src={user?.avatar_url || "/avatar.jpg"} 
              fill 
              alt="Profile" 
              className="object-cover group-hover/avatar:scale-110 transition-transform duration-500"
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Row 1: Username and Buttons */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <h2 className="text-xl font-normal text-black dark:text-white">{user?.full_name || user?.display_name || 'Username'}</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={onEditClick}
              className="px-4 py-1.5 bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] rounded-lg text-sm font-semibold text-black dark:text-white transition-colors"
            >
              {t('social.profile.edit')}
            </button>
            <button 
              onClick={onArchiveClick}
              className="px-4 py-1.5 bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] rounded-lg text-sm font-semibold text-black dark:text-white transition-colors"
            >
              {t('social.profile.view_archive')}
            </button>
            <button className="p-2 text-black dark:text-white cursor-pointer">
              <SettingsIcon size={24} />
            </button>
          </div>
        </div>

        {/* Row 2: Stats - Using real post count */}
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-1">
            <span className="font-bold text-black dark:text-white">{postCount}</span>
            <span className="text-black dark:text-white">{t('social.profile.posts')}</span>
          </div>
          <div className="flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity">
            <span className="font-bold text-black dark:text-white">0</span>
            <span className="text-black dark:text-white">{t('social.profile.followers')}</span>
          </div>
          <div className="flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity">
            <span className="font-bold text-black dark:text-white">0</span>
            <span className="text-black dark:text-white">{t('social.profile.following')}</span>
          </div>
        </div>

        {/* Row 3: Bio */}
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-black dark:text-white">{user?.full_name || 'User Name'}</span>
          <p className="text-sm text-black dark:text-white mt-1 whitespace-pre-line">
            {user?.bio || t('social.profile.no_bio', 'Chưa có tiểu sử.')}
          </p>
        </div>
      </div>

      {/* Note Modal */}
      {isNoteModalOpen && (
        <NewNoteModal 
          user={user} 
          onClose={() => setIsNoteModalOpen(false)} 
          onShare={handleShareNote}
        />
      )}
    </div>
  );
};

interface SocialProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const SocialProfileTabs: React.FC<SocialProfileTabsProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();

  const tabs = [
    { id: 'posts', label: t('social.profile.posts'), icon: GridIcon },
    { id: 'reels', label: t('social.profile.reels'), icon: ClapperboardIcon },
    { id: 'saved', label: t('social.profile.saved'), icon: BookmarkIcon },
    { id: 'tagged', label: t('social.profile.tagged'), icon: TagIcon },
  ];

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 flex justify-center gap-12">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 py-4 border-t transition-all uppercase tracking-widest text-[12px] font-semibold cursor-pointer bg-transparent ${
            activeTab === tab.id 
              ? 'border-black dark:border-white text-black dark:text-white' 
              : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <tab.icon size={12} />
          {tab.label}
        </button>
      ))}
    </div>
  );
};
