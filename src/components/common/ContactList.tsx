import React from 'react';
import { SearchIcon, AddUserIcon, CreateGroupIcon, FriendsIcon, GroupsIcon, FriendRequestIcon, GroupRequestIcon } from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';

interface ContactListProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function ContactList({ selectedCategory, onSelectCategory }: ContactListProps) {
  const { t } = useTranslation();

  const categories = [
    { id: 'friends', name: 'Danh sách bạn bè', icon: <FriendsIcon size={22} /> },
    { id: 'groups', name: 'Danh sách nhóm và cộng đồng', icon: <GroupsIcon size={22} /> },
    { id: 'invites', name: 'Lời mời kết bạn', icon: <FriendRequestIcon size={22} /> },
    { id: 'group_invites', name: 'Lời mời vào nhóm và cộng đồng', icon: <GroupRequestIcon size={22} /> },
  ];

  return (
    <div className="w-[340px] border-r border-[var(--border)] flex flex-col bg-[var(--card-bg)] transition-colors duration-200 h-full">
      {/* Search Header */}
      <div className="p-4 py-3 flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            placeholder="Tìm kiếm"
            className="w-full bg-[var(--search-bg)] border-transparent rounded-full py-1.5 pl-9 pr-3 text-[13.5px] text-[var(--text)] outline-none border transition-all placeholder:text-[var(--search-placeholder)]"
          />
          <div className="absolute left-3 text-gray-400"><SearchIcon size={16} /></div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 cursor-pointer hover:bg-[var(--hover-bg)] text-[var(--text)] opacity-70 rounded-md transition-colors"><AddUserIcon size={20} /></button>
          <button className="p-1.5 cursor-pointer hover:bg-[var(--hover-bg)] text-[var(--text)] opacity-70 rounded-md transition-colors"><CreateGroupIcon size={22} /></button>
        </div>
      </div>

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
              <span className={`text-[14.5px] ${isActive ? 'font-bold' : 'font-medium'} truncate`}>
                {cat.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
