'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { friendService } from '@/features/friends';
import { apiClient } from '@/lib/http/apiClient';
import { toast } from 'sonner';

interface Friend {
  user_id?: string;
  id?: string;
  display_name?: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
  avatar?: string;
  phone_number?: string;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: (group: any) => void;
}

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const SearchIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

const CameraIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
  </svg>
);

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const { t, i18n } = useTranslation();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch friends when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      friendService.getFriends()
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setFriends(list);
        })
        .catch((err) => {
          console.error('Failed to fetch friends:', err);
          setFriends([]);
        })
        .finally(() => setLoading(false));
    } else {
      // Reset state when closed
      setGroupName('');
      setSearchQuery('');
      setSelectedMembers([]);
      setFriends([]);
    }
  }, [isOpen]);

  const getFriendId = (f: Friend) => f.user_id || f.id || '';
  const getFriendName = (f: Friend) => f.display_name || f.full_name || f.name || 'Unknown';
  const getFriendAvatar = (f: Friend) => f.avatar_url || f.avatar || '';

  // Filter friends by search query
  const filteredFriends = friends.filter(f => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = getFriendName(f).toLowerCase();
    const phone = (f.phone_number || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  // Group friends by first letter of name
  const groupedFriends: Record<string, Friend[]> = {};
  filteredFriends.forEach(f => {
    const firstChar = getFriendName(f).charAt(0).toUpperCase();
    if (!groupedFriends[firstChar]) groupedFriends[firstChar] = [];
    groupedFriends[firstChar].push(f);
  });
  const sortedLetters = Object.keys(groupedFriends).sort();

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async () => {
    if (creating || selectedMembers.length === 0) return;
    setCreating(true);
    try {
      const res = await apiClient.post('/conversations', {
        conversationType: 'GROUP',
        conversationName: groupName.trim() || selectedMembers
          .map(id => getFriendName(friends.find(f => getFriendId(f) === id)!))
          .join(', '),
        memberIds: selectedMembers,
      });
      toast.success(t('createGroup.success'));
      onGroupCreated?.(res);
      onClose();
    } catch (err: any) {
      console.error('Failed to create group:', err);
      toast.error(err.message || t('createGroup.error'));
    } finally {
      setCreating(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-300" onClick={onClose} />

      <div className="w-full max-w-[520px] bg-[var(--card-bg)] rounded-md shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col h-[85vh] max-h-[720px]">
        {/* Header */}
        <div className="h-[52px] border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--card-bg)] shrink-0">
          <h2 className="text-[17px] font-bold text-[var(--text)]">{t('createGroup.title')}</h2>
          <button onClick={onClose} className="text-[var(--text)] hover:bg-[var(--hover-bg)] p-1 rounded-full transition-all cursor-pointer">
            <XIcon size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col p-5 gap-5">
          {/* Group Name & Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-[48px] h-[48px] rounded-full border border-[var(--border)] flex items-center justify-center text-gray-400 hover:bg-[var(--hover-bg)] cursor-pointer transition-colors shrink-0">
              <CameraIcon size={22} />
            </div>
            <div className="flex-1 border-b border-[var(--border)] focus-within:border-[#0068FF] transition-all">
              <input
                type="text"
                placeholder={t('createGroup.name_placeholder')}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-transparent border-none outline-none py-2 text-[16px] text-[var(--text)] placeholder:text-[var(--sub-text)] font-bold"
              />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder={t('createGroup.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border border-[var(--border)] rounded-full py-2.5 pl-10 pr-4 text-[14px] text-[var(--text)] focus:border-[#0068FF] outline-none transition-all placeholder:text-[var(--sub-text)]"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon size={18} />
            </div>
          </div>

          {/* Selected Members Chips */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 -mx-5 px-5 pb-3 border-b border-[var(--border)]">
              {selectedMembers.map(id => {
                const f = friends.find(fr => getFriendId(fr) === id);
                if (!f) return null;
                return (
                  <div key={id} className="flex items-center gap-1.5 bg-[#e5efff] dark:bg-[#0068FF]/20 text-[#0068FF] rounded-full pl-1 pr-2 py-0.5">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 shrink-0">
                      {getFriendAvatar(f) ? (
                        <Image src={getFriendAvatar(f)} width={20} height={20} alt="" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white bg-[#0068FF]">
                          {getFriendName(f).charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] font-medium max-w-[80px] truncate">{getFriendName(f)}</span>
                    <button onClick={() => toggleMember(id)} className="hover:bg-black/10 rounded-full p-0.5 cursor-pointer">
                      <XIcon size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Member List */}
          <div className="flex-1 flex flex-col min-h-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-[var(--sub-text)] text-[14px]">
                {t('createGroup.loading_friends')}
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[var(--sub-text)] text-[14px]">
                {searchQuery ? t('createGroup.no_results') : t('createGroup.no_friends')}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-1 custom-scrollbar space-y-1">
                {sortedLetters.map(letter => (
                  <div key={letter}>
                    <h3 className="text-[13px] font-bold text-[var(--sub-text)] mb-1 mt-3 first:mt-0">{letter}</h3>
                    {groupedFriends[letter].map(user => {
                      const uid = getFriendId(user);
                      const name = getFriendName(user);
                      const avatar = getFriendAvatar(user);
                      const isSelected = selectedMembers.includes(uid);
                      return (
                        <label key={uid} className="flex items-center gap-4 p-2 hover:bg-[var(--hover-bg)] rounded-lg cursor-pointer group transition-colors select-none">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              className="peer hidden"
                              checked={isSelected}
                              onChange={() => toggleMember(uid)}
                            />
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#0068FF] peer-checked:bg-[#0068FF] transition-all flex items-center justify-center">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" className={`transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-0'}`}><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-black/5 bg-gray-100 flex-shrink-0">
                            {avatar ? (
                              <Image src={avatar} width={40} height={40} alt={name} className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[16px] font-bold text-white bg-gradient-to-br from-blue-400 to-blue-600">
                                {name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="text-[15px] text-[var(--text)] font-medium flex-1 truncate">{name}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--card-bg)] shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[var(--hover-bg)] hover:bg-[#dfe0e2] dark:hover:opacity-80 text-[var(--text)] font-bold rounded-[3px] text-[15px] transition-all cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={selectedMembers.length < 2 || creating}
            className={`px-5 py-1.5 font-bold rounded-[3px] text-[15px] transition-all min-w-[120px] ${selectedMembers.length >= 2 && !creating
              ? 'bg-[#0068FF] text-white hover:bg-[#0057d1] cursor-pointer'
              : 'bg-[#0068FF]/30 text-white/50 cursor-default'
              }`}
          >
            {creating ? t('createGroup.creating') : selectedMembers.length > 0 ? t('createGroup.create_btn', { count: selectedMembers.length }) : t('createGroup.title')}
          </button>
        </div>
      </div>
    </div>
  );
}
