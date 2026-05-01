import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/themes';
import { Settings, ChevronRight } from 'lucide-react';
import Image from 'next/image';

// Notification types
interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'friend_request' | 'message' | 'react';
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  content?: string;
  postThumbnail?: string;
  createdAt: Date;
  isRead: boolean;
  actionText?: string;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  variant?: 'sidebar' | 'dropdown';
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, currentUserId, variant = 'sidebar' }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Generate mock notifications based on the screenshot
  useEffect(() => {
    if (isOpen) {
      setNotifications([
        {
          id: '1',
          type: 'friend_request',
          user: { id: 'u1', name: 'Hoàng Thị Thu Hà', avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Ha' },
          actionText: 'đã gửi lời mời kết bạn',
          createdAt: new Date(Date.now() - 1000 * 60 * 2),
          isRead: false
        },
        {
          id: '2',
          type: 'follow',
          user: { id: 'u2', name: 'Nguyễn Quang Huy', avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Huy' },
          actionText: 'đã theo dõi bạn',
          createdAt: new Date(Date.now() - 1000 * 60 * 15),
          isRead: false
        },
        {
          id: '3',
          type: 'message',
          user: { id: 'u3', name: 'Lê Mẫn Nghi', avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Nghi' },
          actionText: 'đã gửi tin nhắn cho bạn',
          createdAt: new Date(Date.now() - 1000 * 60 * 60),
          isRead: false
        },
        {
          id: '4',
          type: 'react',
          user: { id: 'u4', name: 'Trần Hồng Nhiên', avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Nhien' },
          actionText: 'đã react ❤️ tin nhắn của bạn',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          isRead: false
        },
        {
          id: '5',
          type: 'mention',
          user: { id: 'u5', name: 'Nguyễn Ngọc Hồng Minh', avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Minh' },
          actionText: 'đã nhắc đến bạn trong nhóm',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
          isRead: false
        },
        {
          id: '6',
          type: 'comment',
          user: { id: 'u6', name: 'Phan Thanh Tùng', avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Tung' },
          actionText: 'đã bình luận vào bài viết của bạn',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
          isRead: false
        }
      ]);
    }
  }, [isOpen]);

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  const isDropdown = variant === 'dropdown';

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className={`fixed inset-0 z-[998] ${isDropdown ? 'bg-transparent' : 'bg-black/20'}`}
          onClick={onClose}
        />
      )}
      
      {/* Panel */}
      <div className={`fixed z-[999] ${
        isDark ? 'bg-[#18191A] text-white border-[#2F3031]' : 'bg-white text-black border-[#DBDBDB]'
      } border shadow-2xl transition-all duration-300 ease-in-out ${
        isDropdown 
          ? `top-[68px] right-8 w-[400px] rounded-[16px] overflow-visible ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`
          : `top-0 left-[64px] h-full w-[400px] border-r ${isOpen ? 'translate-x-0' : '-translate-x-[464px]'}`
      }`}>
        {/* Triangle Arrow for Dropdown */}
        {isDropdown && (
          <div className={`absolute -top-1.5 right-10 w-3 h-3 rotate-45 border-t border-l ${
            isDark ? 'bg-[#18191A] border-[#2F3031]' : 'bg-white border-[#DBDBDB]'
          }`} />
        )}

        {/* Header */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-0.5">
            <h2 className="text-[18px] font-bold tracking-tight">
              Thông báo
            </h2>
            <button className={`p-1.5 rounded-full transition-colors cursor-pointer border-none bg-transparent ${
              isDark ? 'hover:bg-[#3A3B3C] text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}>
              <Settings size={18} />
            </button>
          </div>
          <p className="text-[12px] text-gray-500">
            Bạn có <span className="font-semibold text-[#0095F6]">{notifications.filter(n => !n.isRead).length}</span> thông báo mới
          </p>
        </div>

        {/* Divider */}
        <div className={`border-t ${isDark ? 'border-[#2F3031]' : 'border-gray-100'}`} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: isDropdown ? '500px' : 'calc(100vh - 180px)' }}>
          <div className="py-1">
            {notifications.map((notif, idx) => (
              <React.Fragment key={notif.id}>
                <div
                  className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer group ${
                    isDark ? 'hover:bg-[#242526]' : 'hover:bg-[#F0F2F5]'
                  }`}
                >
                  {/* Unread Indicator */}
                  <div className="w-1.5 pt-4 shrink-0">
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-[#0095F6]" />
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full overflow-hidden relative shrink-0">
                    <Image 
                      src={notif.user.avatar}
                      fill
                      alt={notif.user.name}
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[14px] font-bold leading-tight mb-0.5 truncate ${isDark ? 'text-white' : 'text-black'}`}>
                          {notif.user.name}
                        </p>
                        <p className={`text-[12px] leading-snug truncate ${isDark ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                          {notif.actionText}
                        </p>
                        <p className="text-[10px] text-[#8C9199] mt-0.5">
                          {getTimeAgo(notif.createdAt)}
                        </p>
                      </div>

                      {/* Action Buttons (Right Aligned) */}
                      {notif.type === 'friend_request' && (
                        <div className="flex gap-1.5 shrink-0 pt-1">
                          <button className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            isDark ? 'bg-[#3A3B3C] hover:bg-[#4E4F50] text-white' : 'bg-gray-200 hover:bg-gray-300 text-black'
                          }`}>
                            Từ chối
                          </button>
                          <button className="px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-[#0095F6] hover:bg-[#0081D6] text-white transition-all cursor-pointer">
                            Chấp nhận
                          </button>
                        </div>
                      )}

                      {notif.type === 'follow' && (
                        <div className="shrink-0 pt-1">
                          <button className="px-3 py-1.5 rounded-md text-[11px] font-bold bg-[#0095F6] hover:bg-[#0081D6] text-white transition-all cursor-pointer">
                            Theo dõi
                          </button>
                        </div>
                      )}

                      {/* Chevron/Action Icon */}
                      {!['friend_request', 'follow'].includes(notif.type) && (
                        <div className="pt-4 shrink-0">
                          <ChevronRight size={14} className="text-[#8C9199] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Subtle Divider between items */}
                {idx < notifications.length - 1 && (
                  <div className={`mx-4 border-t ${isDark ? 'border-[#2F3031]' : 'border-gray-50'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`border-t py-3 text-center ${isDark ? 'border-[#2F3031]' : 'border-gray-100'}`}>
          <button className="text-[13px] font-bold text-[#0095F6] hover:bg-transparent border-none cursor-pointer">
            Xem tất cả thông báo
          </button>
        </div>
      </div>
    </>
  );
};
