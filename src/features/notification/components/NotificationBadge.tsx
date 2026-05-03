'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../store/NotificationContext';

interface Props {
  active?: boolean;
  onClick?: () => void;
  className?: string;
  size?: number;
}

export const NotificationBadge: React.FC<Props> = ({ active = false, onClick, className = '', size = 20 }) => {
  const { unreadCount } = useNotifications();
  return (
    <button
      onClick={onClick}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border shadow-sm active:scale-95 ${
        active
          ? 'bg-[#0095F6] text-white border-[#0095F6]'
          : 'bg-gray-50/50 dark:bg-[#1A1A1A]/50 backdrop-blur-md text-black dark:text-white border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-[#262626]'
      } ${className}`}
      aria-label="Thông báo"
    >
      <Bell size={size} fill={active ? 'currentColor' : 'none'} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white dark:border-black">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
