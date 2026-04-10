import React, { useEffect, useState } from 'react';
import { FriendsIcon, GroupsIcon, FriendRequestIcon, GroupRequestIcon } from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';
import { friendService } from '@/features/friends/services/friendService';

interface ContactListProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function ContactList({ selectedCategory, onSelectCategory }: ContactListProps) {
  const { t } = useTranslation();
  const [friendCount, setFriendCount] = useState(0);
  const [inviteCount, setInviteCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [friends, received] = await Promise.all([
          friendService.getFriends().catch(() => []),
          friendService.getReceivedRequests().catch(() => []),
        ]);
        setFriendCount(Array.isArray(friends) ? friends.length : 0);
        setInviteCount(Array.isArray(received) ? received.length : 0);
      } catch { /* ignore */ }
    };
    fetchCounts();
  }, [selectedCategory]);

  const categories = [
    { id: 'friends', name: t('contacts.title.friends'), icon: <FriendsIcon size={22} />, badge: friendCount },
    { id: 'groups', name: t('contacts.title.groups'), icon: <GroupsIcon size={22} />, badge: 0 },
    { id: 'invites', name: t('contacts.title.invites'), icon: <FriendRequestIcon size={22} />, badge: inviteCount },
    { id: 'group_invites', name: t('contacts.title.group_invites'), icon: <GroupRequestIcon size={22} />, badge: 0 },
  ];

  return (
    <div className="flex-1 overflow-y-auto pt-2">
      {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center px-4 py-3.5 gap-3.5 cursor-pointer transition-colors group ${isActive ? 'bg-[var(--active-bg)] text-[var(--active-text)]' : 'hover:bg-[var(--hover-bg)] text-[var(--text)]'}`}
              >
                <div className={`${isActive ? 'text-[var(--active-text)]' : 'text-[var(--sub-text)]'} group-hover:text-[var(--active-text)] transition-colors`}>
                  {cat.icon}
                </div>
                <span className={`text-[14.5px] ${isActive ? 'font-bold' : 'font-medium'} truncate flex-1`}>
                  {cat.name}
                </span>
                {cat.badge > 0 && (
                  <span className="min-w-[20px] h-[20px] flex items-center justify-center bg-[#FF3B30] text-white text-[11px] font-bold rounded-full px-1.5">
                    {cat.badge > 99 ? '99+' : cat.badge}
                  </span>
                )}
              </div>
            );
      })}
    </div>
  );
}
