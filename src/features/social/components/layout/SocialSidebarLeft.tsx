import React from 'react';
import Image from 'next/image';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  SearchIcon,
  MessageBubbleIcon,
  CompassIcon,
  ClapperboardIcon,
  BellIcon,
  PlusIcon,
  SettingsIcon,
  MoonIcon,
  SunIcon,
  LogOutIcon,
} from '@/components/ui/Icons';
import { useTheme } from '@/themes';
import { Archive as ArchiveIcon, Music as MusicIcon } from 'lucide-react';

interface SocialSidebarLeftProps {
  user: any;
  onMessagesClick?: () => void;
  onProfileClick?: () => void;
  onHomeClick?: () => void;
  onExploreClick?: () => void;
  onCreatePostClick?: () => void;
  onArchiveClick?: () => void;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  onMyMusicClick?: () => void;
  onLogout?: () => void;
}

export const SocialSidebarLeft: React.FC<SocialSidebarLeftProps> = ({
  user,
  onMessagesClick,
  onProfileClick,
  onHomeClick,
  onExploreClick,
  onCreatePostClick,
  onArchiveClick,
  onSearchClick,
  onNotificationsClick,
  onMyMusicClick,
  onLogout
}) => {
  const { t, i18n } = useTranslation();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { id: 'home', icon: HomeIcon, active: true },
    { id: 'explore', icon: CompassIcon },
    { id: 'reels', icon: ClapperboardIcon },
    { id: 'messages', icon: MessageBubbleIcon },
    { id: 'create', icon: PlusIcon },
    { id: 'archive', icon: ArchiveIcon },
    { id: 'my-music', icon: MusicIcon },
    { id: 'profile', icon: null },
  ];

  if (!mounted) return null;

  // Sử dụng resolvedTheme để chắc chắn biết máy đang Sáng hay Tối
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="fixed top-0 left-0 w-[64px] lg:group-hover/sidebar:w-[280px] h-full bg-white dark:bg-black flex flex-col border-r border-gray-200/80 dark:border-[#262626] transition-all duration-300 ease-in-out group z-[9999] overflow-x-hidden lg:hover:shadow-2xl">
      {/* Logo */}
      <div className="px-[16px] pt-6 mb-6 flex items-center shrink-0">
        <div className="flex items-center w-full">
          {/* Collapsed Logo: Fruvia icon */}
          <div className="w-10 h-10 shrink-0 lg:group-hover:hidden transition-all duration-300">
            <Image
              src="https://fruvia-chat-storage.s3.ap-southeast-1.amazonaws.com/public/system/fruvia_logo.png"
              alt="Fruvia"
              width={40}
              height={40}
              className="rounded-full"
            />
          </div>

          {/* Expanded Logo: icon + wordmark */}
          <div className="hidden lg:group-hover:flex items-center gap-2.5 whitespace-nowrap animate-in fade-in zoom-in duration-500">
            <Image
              src="https://fruvia-chat-storage.s3.ap-southeast-1.amazonaws.com/public/system/fruvia_logo.png"
              alt="Fruvia"
              width={36}
              height={36}
              className="rounded-full shrink-0"
            />
            <h1 className="text-[22px] font-bold tracking-tight text-[#0068FF] dark:text-[#0068FF] italic font-serif">
              Fruvia
            </h1>
          </div>
        </div>
      </div>

      {/* Main Menu Navigation */}
      <div className="flex-1 flex flex-col">
        {menuItems.map((item) => (
          item.id !== 'profile' && (
            <div
              key={item.id}
              onClick={() => {
                if (item.id === 'home' && onHomeClick) onHomeClick();
                if (item.id === 'search' && onSearchClick) onSearchClick();
                if (item.id === 'messages' && onMessagesClick) onMessagesClick();
                if (item.id === 'profile' && onProfileClick) onProfileClick();
                if (item.id === 'explore' && onHomeClick) onHomeClick(); // Khám phá hiển thị màn hình trang chủ
                if (item.id === 'reels' && onExploreClick) onExploreClick(); // Reels hiển thị video
                if (item.id === 'create' && onCreatePostClick) onCreatePostClick();
                if (item.id === 'archive' && onArchiveClick) onArchiveClick();
                if (item.id === 'notifications' && onNotificationsClick) onNotificationsClick();
                if (item.id === 'my-music') {
                  if (onMyMusicClick) onMyMusicClick();
                }
              }}
              className="flex items-center gap-3 px-[18px] py-3 hover:bg-[#FAFAFA] dark:hover:bg-[#1A1A1A] cursor-pointer transition-all group/item text-black dark:text-white shrink-0"
            >
              <div className="w-7 flex justify-center shrink-0">
                <item.icon size={24} className="group-hover/item:scale-110 transition-transform" />
              </div>
              <span className={`hidden lg:group-hover:block text-[15px] ${item.active ? 'font-bold' : 'font-normal'} group-hover/item:font-bold whitespace-nowrap overflow-hidden transition-all duration-300`}>
                {t(`social.sidebar.${item.id}`)}
              </span>
            </div>
          )
        ))}

        {/* Profile */}
        <div
          onClick={onProfileClick}
          className="flex items-center gap-3 px-[18px] py-3 hover:bg-[#FAFAFA] dark:hover:bg-[#1A1A1A] cursor-pointer transition-all group/item text-black dark:text-white shrink-0"
        >
          <div className="w-7 h-7 rounded-full overflow-hidden relative border border-gray-200 dark:border-gray-800 shrink-0">
            <Image src={user?.avatar_url || "/avatar.jpg"} fill alt="User" className="object-cover" />
          </div>
          <span className="hidden lg:group-hover:block text-[15px] group-hover/item:font-bold whitespace-nowrap overflow-hidden transition-all duration-300">
            {t('social.sidebar.profile')}
          </span>
        </div>
      </div>

      {/* Settings Section */}
      <div className="mt-auto border-t border-gray-100 dark:border-gray-900 flex flex-col bg-inherit">

        {/* Nút 1: Ngôn ngữ (Nút chuẩn đang hoạt động) */}
        <div
          onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
          className="flex items-center gap-4 px-[18px] py-3 hover:bg-[#FAFAFA] dark:hover:bg-[#1A1A1A] cursor-pointer transition-all group/lang text-black dark:text-white shrink-0"
        >
          <div className="flex items-center gap-3 pointer-events-none">
            <div className="w-7 flex justify-center shrink-0">
              <span className="text-[10px] font-bold border-2 border-current px-1 rounded-md uppercase leading-none py-0.5">{i18n.language}</span>
            </div>
            <span className="hidden lg:group-hover:block text-[13px] font-medium whitespace-nowrap">{i18n.language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
          </div>

          <div className="hidden lg:group-hover:block shrink-0 pointer-events-none">
            <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${i18n.language === 'vi' ? 'bg-[#0095F6]' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 ${i18n.language === 'vi' ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
          </div>
        </div>

        {/* Nút 2: Sáng/Tối (Nhân bản 100% cấu trúc nút Tiếng Việt) */}
        <div
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex items-center gap-4 px-[18px] py-3 hover:bg-[#FAFAFA] dark:hover:bg-[#1A1A1A] cursor-pointer transition-all group/theme text-black dark:text-white shrink-0"
        >
          <div className="flex items-center gap-3 pointer-events-none">
            <div className="w-7 flex justify-center shrink-0">
              {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
            </div>
            <span className="hidden lg:group-hover:block text-[13px] font-medium whitespace-nowrap">
              {isDark ? t('login.theme_switch.light') : t('login.theme_switch.dark')}
            </span>
          </div>

          <div className="hidden lg:group-hover:block shrink-0 pointer-events-none">
            <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${isDark ? 'bg-[#0095F6]' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 ${isDark ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
          </div>
        </div>

        {/* User Profile Summary */}
        <div
          onClick={onProfileClick}
          className="flex items-center gap-3 px-[14px] py-4 hover:bg-[#FAFAFA] dark:hover:bg-[#1A1A1A] cursor-pointer transition-all group/user text-black dark:text-white shrink-0 border-t border-gray-100 dark:border-gray-900 mt-2"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden relative bg-black flex items-center justify-center text-white font-bold shrink-0 text-[15px] border border-gray-700">
            {user?.avatar_url ? (
              <Image src={user.avatar_url} fill alt="User" className="object-cover" />
            ) : (
              <span className="animate-in fade-in duration-300">
                {user?.display_name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="hidden lg:group-hover:flex flex-1 flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="text-[14px] font-bold truncate text-black dark:text-white leading-tight">
              {user?.full_name || user?.display_name || user?.name || 'User'}
            </span>
            <span className="text-[12px] font-normal truncate text-gray-500 dark:text-gray-400">
              {user?.email || user?.phone_number || 'user@fruvia.com'}
            </span>
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              Modal.confirm({
                title: t('social.logout.title', 'Xác nhận đăng xuất'),
                content: t('social.logout.content', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?'),
                okText: t('social.logout.confirm', 'Đăng xuất'),
                cancelText: t('social.logout.cancel', 'Hủy'),
                okButtonProps: { danger: true },
                onOk: () => {
                  if (onLogout) onLogout();
                },
                centered: true,
                className: 'logout-confirmation-modal'
              });
            }}
            className="hidden lg:group-hover:block p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors animate-in fade-in zoom-in duration-300"
          >
            <LogOutIcon size={20} />
          </div>
        </div>
      </div>
    </div>
  );
};
