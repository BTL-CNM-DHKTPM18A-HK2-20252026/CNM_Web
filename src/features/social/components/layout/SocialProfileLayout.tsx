import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { SettingsIcon, GridIcon, BookmarkIcon, TagIcon, ClapperboardIcon } from '@/components/ui/Icons';
import { FollowersModal } from './FollowersModal';
import { friendService } from '@/features/friends/services/friendService';

interface SocialProfileHeaderProps {
  user: any;
  postCount?: number;
  onEditClick?: () => void;
  onArchiveClick?: () => void;
  onViewProfile?: (userId: string) => void;
}

export const SocialProfileHeader: React.FC<SocialProfileHeaderProps> = ({
  user,
  postCount = 0,
  onEditClick,
  onArchiveClick,
  onViewProfile,
}) => {
  const { t } = useTranslation();
  const [friendCount, setFriendCount] = React.useState<number | null>(null);
  const [showFollowersModal, setShowFollowersModal] = React.useState<'followers' | 'following' | null>(null);

  React.useEffect(() => {
    friendService
      .getFriends()
      .then((friends: any[]) => {
        setFriendCount(Array.isArray(friends) ? friends.length : 0);
      })
      .catch(() => setFriendCount(0));
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-8 md:gap-20 mb-12 px-4 md:px-0">
      <div className="flex justify-center md:block">
        <div className="relative group/avatar">
          <div className="relative w-20 h-20 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-gray-100 dark:border-gray-800 cursor-pointer">
            <Image
              src={user?.avatar_url || '/avatar.jpg'}
              fill
              alt="Profile"
              className="object-cover group-hover/avatar:scale-110 transition-transform duration-500"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <h2 className="text-xl font-normal text-black dark:text-white">{user?.full_name || user?.display_name || 'Username'}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onEditClick}
              className="px-4 py-1.5 bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] rounded-lg text-sm font-semibold text-black dark:text-white transition-colors cursor-pointer"
            >
              {t('social.profile.edit')}
            </button>
            <button
              onClick={onArchiveClick}
              className="px-4 py-1.5 bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] rounded-lg text-sm font-semibold text-black dark:text-white transition-colors cursor-pointer"
            >
              {t('social.profile.view_archive')}
            </button>
            <button className="p-2 text-black dark:text-white cursor-pointer">
              <SettingsIcon size={24} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="flex items-center gap-1">
            <span className="font-bold text-black dark:text-white">{postCount}</span>
            <span className="text-black dark:text-white">{t('social.profile.posts')}</span>
          </div>
          <button
            onClick={() => setShowFollowersModal('followers')}
            className="flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity bg-transparent border-none p-0"
          >
            <span className="font-bold text-black dark:text-white">
              {friendCount !== null ? friendCount : '—'}
            </span>
            <span className="text-black dark:text-white">{t('social.profile.followers')}</span>
          </button>
          <button
            onClick={() => setShowFollowersModal('following')}
            className="flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity bg-transparent border-none p-0"
          >
            <span className="font-bold text-black dark:text-white">
              {friendCount !== null ? friendCount : '—'}
            </span>
            <span className="text-black dark:text-white">{t('social.profile.following')}</span>
          </button>
        </div>

        <div className="flex flex-col">
          <span className="font-semibold text-sm text-black dark:text-white">{user?.full_name || 'User Name'}</span>
          <p className="text-sm text-black dark:text-white mt-1 whitespace-pre-line">
            {user?.bio || t('social.profile.no_bio', 'Chưa có tiểu sử.')}
          </p>
        </div>
      </div>

      {showFollowersModal && (
        <FollowersModal
          type={showFollowersModal}
          userId={user?.user_id || user?.id || ''}
          onClose={() => setShowFollowersModal(null)}
          onViewProfile={(uid) => {
            onViewProfile?.(uid);
            setShowFollowersModal(null);
          }}
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
