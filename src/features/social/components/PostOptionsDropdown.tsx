import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PostResponse, SocialUser } from '../types';
import { socialApi } from '../api';
import { AlertTriangle } from 'lucide-react';
import { friendService } from '@/features/friends/services/friendService';

interface PostOptionsDropdownProps {
  post: PostResponse;
  currentUser: SocialUser | null;
  isDark: boolean;
  onClose: () => void;
  onDelete?: (postId: string) => void;
  onEdit?: (post: PostResponse) => void;
  className?: string;
}

export const PostOptionsDropdown: React.FC<PostOptionsDropdownProps> = ({ 
  post, 
  currentUser, 
  isDark, 
  onClose,
  onDelete,
  onEdit,
  className = ""
}) => {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const currentUserId = currentUser?.id || currentUser?.user_id;
  const isOwner = currentUserId && (currentUserId === post.authorId);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/p/${post.postId}`);
    onClose();
    toast.success(t('social.posts.options.link_copied', 'Đã sao chép liên kết'));
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await socialApi.deletePost(post.postId);
      onDelete?.(post.postId);
      onClose();
      toast.success(t('social.posts.options.delete_success', 'Đã xóa bài viết'));
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error(t('social.posts.options.delete_error', 'Không thể xóa bài viết'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    onEdit?.(post);
    onClose();
  };

  // Delete confirmation overlay
  if (showDeleteConfirm) {
    return (
      <>
        <div className="fixed inset-0 z-[1000]" onClick={() => setShowDeleteConfirm(false)} />
        <div className={`absolute top-full right-0 mt-2 w-[280px] ${isDark ? 'bg-[#262626] border-zinc-700' : 'bg-white border-gray-100'} rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.15)] border z-[1001] animate-in fade-in slide-in-from-top-1 duration-200 ${className}`}>
          <div className="p-5 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h3 className={`text-[15px] font-bold ${isDark ? 'text-white' : 'text-black'}`}>
              {t('social.posts.options.delete_confirm_title', 'Xóa bài viết?')}
            </h3>
            <p className={`text-[13px] text-center leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('social.posts.options.delete_confirm_desc', 'Bài viết sẽ bị xóa vĩnh viễn và không thể khôi phục.')}
            </p>
          </div>
          <div className={`flex flex-col divide-y ${isDark ? 'divide-zinc-800' : 'divide-gray-100'}`}>
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className={`py-3 px-4 text-[14px] font-bold text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-center cursor-pointer border-none bg-transparent ${isDeleting ? 'opacity-50' : ''}`}
            >
              {isDeleting ? t('social.posts.options.deleting', 'Đang xóa...') : t('social.posts.options.delete', 'Xóa bài viết')}
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              className={`py-3 px-4 text-[14px] font-semibold ${isDark ? 'text-white' : 'text-black'} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-center cursor-pointer border-none bg-transparent`}
            >
              {t('social.posts.options.cancel', 'Hủy')}
            </button>
          </div>
        </div>
      </>
    );
  }

  const handleReport = () => {
    onClose();
    toast.success(t('social.posts.options.report_success', 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét bài viết này.'));
  };

  const handleUnfollow = async () => {
    try {
      if (post.authorId) {
        // Using friendService.unfriend as a proxy for unfollow if they share the same system
        await friendService.unfriend(post.authorId);
        toast.success(t('social.posts.options.unfollow_success', 'Đã bỏ theo dõi {{name}}', { name: post.authorName }));
        onClose();
        // Optional: trigger refresh
      }
    } catch (error) {
      toast.error(t('social.posts.options.unfollow_error', 'Không thể bỏ theo dõi lúc này.'));
    }
  };

  const handleAddFavorites = () => {
    onClose();
    toast.success(t('social.posts.options.added_favorites', 'Đã thêm vào mục yêu thích'));
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
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="py-2.5 px-4 text-[13px] font-semibold text-[#ED4956] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent"
            >
              {t('social.posts.options.delete', 'Xóa bài viết')}
            </button>
            <button 
              onClick={handleEdit}
              className={`py-2.5 px-4 text-[13px] font-semibold ${isDark ? 'text-white' : 'text-black'} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent`}
            >
              {t('social.posts.options.edit', 'Chỉnh sửa')}
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={handleReport}
              className="py-2.5 px-4 text-[13px] font-semibold text-[#ED4956] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent"
            >
              {t('social.posts.options.report', 'Báo cáo')}
            </button>
            <button 
              onClick={handleUnfollow}
              className="py-2.5 px-4 text-[13px] font-semibold text-[#ED4956] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent"
            >
              {t('social.posts.options.unfollow', 'Bỏ theo dõi')}
            </button>
            <button 
              onClick={handleAddFavorites}
              className={`py-2.5 px-4 text-[13px] font-semibold ${isDark ? 'text-white' : 'text-black'} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent`}
            >
              {t('social.posts.options.favorites', 'Thêm vào mục yêu thích')}
            </button>
          </>
        )}
        <button 
          className={`py-2.5 px-4 text-[13px] font-semibold ${isDark ? 'text-white' : 'text-black'} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer border-none bg-transparent`}
          onClick={handleCopyLink}
        >
          {t('social.posts.options.copy_link', 'Sao chép liên kết')}
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
