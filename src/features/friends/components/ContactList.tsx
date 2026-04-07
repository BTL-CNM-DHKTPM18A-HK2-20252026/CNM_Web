import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { FriendsIcon, GroupsIcon, FriendRequestIcon, GroupRequestIcon } from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';
import { SearchOverlayDefault } from '@/features/chat/components/shared/SearchOverlayDefault';
import type { SearchRecentItem } from '@/features/chat/components/shared/SearchOverlayDefault';
import { ChatSearchHeader } from '@/features/chat/components/shared/ChatSearchHeader';
import { apiClient } from '@/lib/http/apiClient';

interface ContactListProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onAddFriend?: (prefill?: {
    phoneNumber?: string;
    user?: {
      user_id: string;
      phone_number?: string;
      display_name?: string;
      avatar_url?: string;
      friendship_status?: string;
    };
  }) => void;
  onCreateGroup?: () => void;
}

interface SearchUserItem {
  userId: string;
  displayName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  friendshipStatus?: string;
}

interface SearchUserDocument {
  userId: string;
  displayName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  friendshipStatus?: string;
}

interface EsSearchResult<T> {
  document?: T;
}

export function ContactList({ selectedCategory, onSelectCategory, onAddFriend, onCreateGroup }: ContactListProps) {
  const { t } = useTranslation();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserItem[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recentSearches: SearchRecentItem[] = [];

  const extractEsDocument = <T,>(item: unknown): T | null => {
    if (!item || typeof item !== 'object') return null;
    const wrapped = item as EsSearchResult<T>;
    return wrapped.document ?? (item as T);
  };

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    const query = searchQuery.trim();
    if (!isSearching || !query) {
      setSearchResults([]);
      setIsSearchLoading(false);
      return;
    }

    let cancelled = false;
    setIsSearchLoading(true);

    searchTimerRef.current = setTimeout(async () => {
      try {
        const usersData = await apiClient
          .get(`/search/users?q=${encodeURIComponent(query)}&size=10`)
          .catch(() => null);

        const content = usersData?.content || (Array.isArray(usersData) ? usersData : []);
        let normalizedResults: SearchUserItem[] = Array.isArray(content)
          ? content
              .map((item) => extractEsDocument<SearchUserDocument>(item))
              .filter((doc): doc is SearchUserDocument => Boolean(doc?.userId))
              .map((doc) => ({
                userId: doc.userId,
                displayName: doc.displayName || 'Unknown',
                phoneNumber: doc.phoneNumber,
                avatarUrl: doc.avatarUrl,
                friendshipStatus: doc.friendshipStatus,
              }))
          : [];

        // Fallback for exact phone lookup to ensure non-friend accounts still appear.
        if (normalizedResults.length === 0 && /^\d{9,15}$/.test(query)) {
          const byPhone = await apiClient
            .get(`/users/phone/${encodeURIComponent(query)}`)
            .catch(() => null);

          if (byPhone && (byPhone.user_id || byPhone.userId)) {
            normalizedResults = [
              {
                userId: byPhone.user_id || byPhone.userId,
                displayName: byPhone.display_name || byPhone.displayName || 'Unknown',
                phoneNumber: byPhone.phone_number || byPhone.phoneNumber,
                avatarUrl: byPhone.avatar_url || byPhone.avatarUrl,
                friendshipStatus: byPhone.friendship_status || byPhone.friendshipStatus,
              },
            ];
          }
        }

        if (!cancelled) {
          setSearchResults(normalizedResults);
        }
      } finally {
        if (!cancelled) {
          setIsSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [isSearching, searchQuery]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, []);

  const categories = [
    { id: 'friends', name: t('contacts.title.friends'), icon: <FriendsIcon size={22} /> },
    { id: 'groups', name: t('contacts.title.groups'), icon: <GroupsIcon size={22} /> },
    { id: 'invites', name: t('contacts.title.invites'), icon: <FriendRequestIcon size={22} /> },
    { id: 'group_invites', name: t('contacts.title.group_invites'), icon: <GroupRequestIcon size={22} /> },
  ];

  return (
    <div className="w-[340px] border-r border-[var(--border)] flex flex-col bg-[var(--card-bg)] transition-colors duration-200 h-full">
      {/* Search Header */}
      <ChatSearchHeader
        placeholder={t('chat.search')}
        value={searchQuery}
        isSearching={isSearching}
        closeLabel={t('chat.search_overlay.close')}
        onChange={(value) => setSearchQuery(value)}
        onFocus={() => setIsSearching(true)}
        onClose={() => {
          setIsSearching(false);
          setSearchQuery('');
          setSearchResults([]);
          setIsSearchLoading(false);
        }}
        onAddFriend={() => onAddFriend?.()}
        onCreateGroup={onCreateGroup}
      />

      {isSearching ? (
        <div className="flex-1 bg-[var(--card-bg)] overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
          {!searchQuery.trim() ? (
            <SearchOverlayDefault recentSearches={recentSearches} />
          ) : isSearchLoading ? (
            <div className="py-10 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="px-4 py-3">
              <h3 className="text-[13px] font-bold text-[var(--sub-text)] mb-2 uppercase tracking-wide">
                {t('chat.search_overlay.contacts') || 'Liên hệ'}
              </h3>
              <div className="space-y-0.5">
                {searchResults.map((user) => {
                  const relationKnown = Boolean(user.friendshipStatus);
                  const isFriend = user.friendshipStatus === 'ACCEPTED';

                  return (
                    <div
                      key={user.userId}
                      onClick={() =>
                        onAddFriend?.({
                          phoneNumber: user.phoneNumber,
                          user: {
                            user_id: user.userId,
                            phone_number: user.phoneNumber,
                            display_name: user.displayName,
                            avatar_url: user.avatarUrl,
                            friendship_status: user.friendshipStatus,
                          },
                        })
                      }
                      className="flex items-center gap-3 p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-black/5 bg-gray-100 flex items-center justify-center">
                        {user.avatarUrl ? (
                          <Image src={user.avatarUrl} alt={user.displayName} width={40} height={40} className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-[14px] font-bold text-white bg-[#0068FF] w-full h-full flex items-center justify-center">
                            {user.displayName?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[var(--text)] truncate">{user.displayName}</p>
                        {user.phoneNumber && (
                          <p className="text-[12px] text-[var(--sub-text)] truncate">{user.phoneNumber}</p>
                        )}
                      </div>

                      {relationKnown && (
                        <span
                          className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                            isFriend
                              ? 'text-green-600 bg-green-50'
                              : 'text-[#0068FF] bg-blue-50'
                          }`}
                        >
                          {isFriend ? 'Bạn bè' : 'Chưa kết bạn'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="px-4 py-8 flex items-center justify-center text-[var(--sub-text)] text-[14px]">
              {t('chat.search_overlay.no_results') || 'Không tìm thấy kết quả'}
            </div>
          )}
        </div>
      ) : (
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
      )}
    </div>
  );
}
