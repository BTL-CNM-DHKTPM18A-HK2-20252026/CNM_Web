import React, { useState } from 'react';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/themes';
import { PostResponse, PrivacyLevel } from '../../types';
import { socialApi } from '../../api';
import { toast } from 'sonner';
import { Globe, Lock, Users, ChevronDown, X } from 'lucide-react';
import Image from 'next/image';

interface EditPostModalProps {
  post: PostResponse;
  user: any;
  onClose: () => void;
  onUpdated: (updatedPost: PostResponse) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ post, user, onClose, onUpdated }) => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [content, setContent] = useState(post.content);
  const [privacy, setPrivacy] = useState<PrivacyLevel>(post.privacy);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);

  const privacyOptions: { value: PrivacyLevel; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'PUBLIC', label: t('social.posts.privacy.public', 'Công khai'), icon: <Globe size={16} />, desc: t('social.posts.privacy.public_desc', 'Tất cả mọi người') },
    { value: 'FRIENDS', label: t('social.posts.privacy.friends', 'Bạn bè'), icon: <Users size={16} />, desc: t('social.posts.privacy.friends_desc', 'Chỉ bạn bè') },
    { value: 'PRIVATE', label: t('social.posts.privacy.private', 'Chỉ mình tôi'), icon: <Lock size={16} />, desc: t('social.posts.privacy.private_desc', 'Chỉ bạn mới thấy') },
  ];

  const currentPrivacy = privacyOptions.find(p => p.value === privacy) || privacyOptions[0];
  const hasChanges = content !== post.content || privacy !== post.privacy;

  const handleSubmit = async () => {
    if (!content.trim() || !hasChanges) return;
    setIsSubmitting(true);
    try {
      const updatedPost = await socialApi.editPost(post.postId, { content, privacy });
      onUpdated(updatedPost);
      onClose();
      toast.success(t('social.posts.options.edit_success', 'Đã cập nhật bài viết'));
    } catch (error) {
      console.error('Failed to edit post:', error);
      toast.error(t('social.posts.options.edit_error', 'Không thể cập nhật bài viết'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .edit-post-modal .ant-modal-content {
          padding: 0 !important;
          background-color: transparent !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        .edit-post-modal .ant-modal-body {
          padding: 0 !important;
        }
        .edit-post-modal .ant-modal-close {
          display: none !important;
        }
      `}</style>
      <Modal
        open={true}
        onCancel={onClose}
        footer={null}
        width={520}
        centered
        closable={false}
        className="edit-post-modal"
        styles={{
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }
        }}
        modalRender={() => (
          <div className="w-full flex items-center justify-center pointer-events-none">
            <div 
              className={`w-full max-w-[520px] ${isDark ? 'bg-[#262626] text-white' : 'bg-white text-black'} rounded-xl overflow-hidden shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 duration-300`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-zinc-700' : 'border-gray-100'}`}>
                <button 
                  onClick={onClose}
                  className={`text-[14px] font-medium ${isDark ? 'text-white' : 'text-black'} hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none`}
                >
                  {t('social.posts.options.cancel', 'Hủy')}
                </button>
                <h3 className="text-[16px] font-bold">
                  {t('social.posts.options.edit_title', 'Chỉnh sửa bài viết')}
                </h3>
                <button
                  onClick={handleSubmit}
                  disabled={!hasChanges || !content.trim() || isSubmitting}
                  className={`text-[14px] font-bold transition-opacity cursor-pointer bg-transparent border-none ${
                    hasChanges && content.trim() && !isSubmitting 
                      ? 'text-[#0095F6] opacity-100 hover:text-[#1877F2]' 
                      : 'text-[#0095F6] opacity-40 cursor-default'
                  }`}
                >
                  {isSubmitting ? t('social.posts.options.saving', 'Đang lưu...') : t('social.posts.options.save', 'Lưu')}
                </button>
              </div>

              {/* Author info */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                <div className="w-9 h-9 rounded-full overflow-hidden relative shrink-0">
                  <Image
                    src={user?.avatar_url || user?.avatarUrl || post.authorAvatar || '/avatar.jpg'}
                    fill
                    alt="Avatar"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className={`text-[14px] font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                    {user?.full_name || user?.display_name || post.authorName}
                  </span>

                  {/* Privacy Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                      className={`flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer border ${
                        isDark 
                          ? 'bg-zinc-700 border-zinc-600 text-gray-300 hover:bg-zinc-600' 
                          : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {currentPrivacy.icon}
                      <span>{currentPrivacy.label}</span>
                      <ChevronDown size={12} />
                    </button>

                    {showPrivacyDropdown && (
                      <>
                        <div className="fixed inset-0 z-[50]" onClick={() => setShowPrivacyDropdown(false)} />
                        <div className={`absolute top-full left-0 mt-1 w-[200px] ${isDark ? 'bg-[#363636] border-zinc-600' : 'bg-white border-gray-200'} rounded-lg shadow-xl border z-[51] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150`}>
                          {privacyOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setPrivacy(option.value);
                                setShowPrivacyDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer border-none ${
                                privacy === option.value 
                                  ? (isDark ? 'bg-zinc-700 text-white' : 'bg-blue-50 text-[#0095F6]')
                                  : (isDark ? 'bg-transparent text-gray-300 hover:bg-zinc-700' : 'bg-transparent text-gray-700 hover:bg-gray-50')
                              }`}
                            >
                              <div className="shrink-0">{option.icon}</div>
                              <div className="flex flex-col">
                                <span className="text-[13px] font-semibold">{option.label}</span>
                                <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{option.desc}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Content editor */}
              <div className="px-4 pb-2">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('social.posts.edit_placeholder', 'Nội dung bài viết...')}
                  className={`w-full min-h-[120px] max-h-[300px] resize-none text-[15px] leading-relaxed outline-none border-none bg-transparent ${
                    isDark ? 'text-white placeholder:text-zinc-500' : 'text-black placeholder:text-gray-400'
                  }`}
                  autoFocus
                />
              </div>

              {/* Media preview (read-only) */}
              {post.mediaList && post.mediaList.length > 0 && (
                <div className={`mx-4 mb-4 rounded-lg overflow-hidden border ${isDark ? 'border-zinc-700' : 'border-gray-200'}`}>
                  <div className={`grid ${post.mediaList.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-0.5`}>
                    {post.mediaList.slice(0, 4).map((media, idx) => (
                      <div key={media.mediaId || idx} className="relative aspect-square">
                        {media.type === 'VIDEO' ? (
                          <video src={media.url} className="w-full h-full object-cover" muted crossOrigin="anonymous" />
                        ) : (
                          <img src={media.url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                        )}
                        {idx === 3 && post.mediaList.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">+{post.mediaList.length - 4}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className={`px-3 py-2 text-[11px] ${isDark ? 'text-zinc-500 bg-zinc-800' : 'text-gray-400 bg-gray-50'}`}>
                    {t('social.posts.options.media_readonly', 'Ảnh/video không thể chỉnh sửa từ đây')}
                  </div>
                </div>
              )}

              {/* Character count */}
              <div className={`flex items-center justify-end px-4 pb-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                <span className="text-[12px]">{content.length}</span>
              </div>
            </div>
          </div>
        )}
      />
    </>
  );
};
