'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, UserCheck, UserPlus } from 'lucide-react';
import { friendService } from '@/features/friends/services/friendService';
import { UserResponse } from '@/features/user/services/userService';
import { toast } from 'sonner';

interface FollowersModalProps {
  type: 'followers' | 'following';
  userId: string;
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
}

export const FollowersModal: React.FC<FollowersModalProps> = ({
  type,
  userId,
  onClose,
  onViewProfile,
}) => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        // Both followers and following use the friends list as data source
        const friends = await friendService.getFriends();
        setUsers(Array.isArray(friends) ? friends : []);
      } catch {
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId, type]);

  const handleUnfriend = async (targetId: string) => {
    setActionLoading(targetId);
    try {
      await friendService.unfriend(targetId);
      setUsers(prev => prev.filter(u => u.user_id !== targetId));
      toast.success('Đã hủy kết bạn');
    } catch {
      toast.error('Không thể thực hiện lúc này');
    } finally {
      setActionLoading(null);
    }
  };

  const title = type === 'followers' ? 'Người theo dõi' : 'Đang theo dõi';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#262626] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-8" />
          <h3 className="font-bold text-sm text-black dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[480px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-2 border-[#0095F6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              {type === 'followers' ? 'Chưa có người theo dõi' : 'Chưa theo dõi ai'}
            </div>
          ) : (
            <ul>
              {users.map(user => (
                <li
                  key={user.user_id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#363636] transition-colors"
                >
                  <div
                    className="w-11 h-11 rounded-full overflow-hidden shrink-0 cursor-pointer"
                    onClick={() => { onViewProfile?.(user.user_id); onClose(); }}
                  >
                    <Image
                      src={user.avatar_url || '/avatar.jpg'}
                      alt={user.display_name || 'User'}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => { onViewProfile?.(user.user_id); onClose(); }}
                  >
                    <div className="text-sm font-semibold text-black dark:text-white">
                      {user.display_name || user.full_name || 'User'}
                    </div>
                    {user.full_name && user.display_name !== user.full_name && (
                      <div className="text-xs text-gray-500">{user.full_name}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnfriend(user.user_id)}
                    disabled={actionLoading === user.user_id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#efefef] dark:bg-[#363636] hover:bg-[#dbdbdb] dark:hover:bg-[#262626] text-black dark:text-white transition-colors disabled:opacity-50"
                  >
                    {actionLoading === user.user_id ? (
                      <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserCheck size={12} />
                        Bạn bè
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
