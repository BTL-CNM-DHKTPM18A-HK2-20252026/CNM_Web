import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PostResponse, SocialUser } from '../types';

interface PostOptionsDropdownProps {
  post: PostResponse;
  currentUser: SocialUser | null;
  isDark: boolean;
  onClose: () => void;
  className?: string;
}

export const PostOptionsDropdown: React.FC<PostOptionsDropdownProps> = ({ 
  post, 
  currentUser, 
  isDark, 
  onClose,
  className = ""
}) => {
  const { t } = useTranslation();
  const currentUserId = currentUser?.id || currentUser?.user_id;
  const isOwner = currentUserId && (currentUserId === post.authorId);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/p/${post.postId}`);
    onClose();
    toast.success(t('social.posts.options.link_copied', 'Đã sao chép liên kết'));
  };

  return (
    <>
      {/* Invisible Backdrop for click-outside */}
      <div 
        className="fixed inset-0 z-[1000]" 
        onClick={onClose}
      />
      <div className={`absolute top-full right-0 mt-2 w-[220px] ${isDark ? 'bg-[#262626] border-zinc-700' : 'bg-white border-gray-100'} rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.15)] border z-[1001] flex flex-col divide-y ${isDark ? 'divide-zinc-800' : 'divide-gray-50'} animate-in fade-in slide-in-from-top-1 duration-200 ${className}`}>
        {isOwner ? (
          <>
            <button className="py-2.5 px-4 text-[13px] font-semibold text-[#ED4956] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent">
              {t('social.posts.options.delete', 'Xóa bài viết')}
            </button>
            <button className={`py-2.5 px-4 text-[13px] font-semibold ${isDark ? 'text-white' : 'text-black'} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent`}>
              {t('social.posts.options.edit', 'Chỉnh sửa')}
            </button>
          </>
        ) : (
          <>
            <button className="py-2.5 px-4 text-[13px] font-semibold text-[#ED4956] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent">
              {t('social.posts.options.report')}
            </button>
            <button className="py-2.5 px-4 text-[13px] font-semibold text-[#ED4956] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent">
              {t('social.posts.options.unfollow')}
            </button>
            <button className={`py-2.5 px-4 text-[13px] font-semibold ${isDark ? 'text-white' : 'text-black'} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent`}>
              {t('social.posts.options.favorites')}
            </button>
          </>
        )}
        <button 
          className={`py-2.5 px-4 text-[13px] font-semibold ${isDark ? 'text-white' : 'text-black'} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent`}
          onClick={handleCopyLink}
        >
          {t('social.posts.options.copy_link')}
        </button>
        <button 
          onClick={onClose}
          className={`py-2.5 px-4 text-[13px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent`}
        >
          {t('social.posts.options.close', 'Đóng')}
        </button>
      </div>
    </>
  );
};
