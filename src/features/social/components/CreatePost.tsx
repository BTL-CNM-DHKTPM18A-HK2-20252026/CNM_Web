import React, { useState } from 'react';
import Image from 'next/image';
import { ImagePickerIcon, LocationIcon, EmojiIcon, SendIcon } from '@/components/ui/Icons';

interface CreatePostProps {
  user: any;
  onSubmit: (content: string) => Promise<void>;
}

export const CreatePost: React.FC<CreatePostProps> = ({ user, onSubmit }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full overflow-hidden relative shrink-0 border border-[var(--border)]">
          <Image
            src={user?.avatar_url || (user?.id ? `/default/image${(user.id.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0) % 8) + 1}.jpg` : "/avatar.jpg")}
            fill
            alt="User"
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`${user?.full_name || 'Huy'}, bạn đang nghĩ gì?`}
            className="w-full bg-[var(--hover-bg)]/50 border-none rounded-2xl px-4 py-2.5 text-[15px] text-[var(--text)] placeholder:text-[var(--sub-text)] focus:ring-1 focus:ring-[#0068FF] resize-none transition-all outline-none min-h-[44px]"
            rows={content ? 3 : 1}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]/50">
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors text-[var(--sub-text)]">
            <ImagePickerIcon size={20} className="text-green-500" />
            <span className="text-[14px] font-medium hidden sm:inline">Ảnh/Video</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors text-[var(--sub-text)]">
            <LocationIcon size={20} className="text-red-500" />
            <span className="text-[14px] font-medium hidden sm:inline">Vị trí</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors text-[var(--sub-text)]">
            <EmojiIcon size={20} className="text-yellow-500" />
            <span className="text-[14px] font-medium hidden sm:inline">Cảm xúc</span>
          </button>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-[14px] transition-all ${
            content.trim() && !isSubmitting 
              ? 'bg-[#0068FF] text-white hover:bg-[#0052cc] shadow-md shadow-[#0068FF]/20' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <SendIcon size={16} />
              <span>Đăng</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
