import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/themes';
import { Search, X, Users, FileText, Hash } from 'lucide-react';
import Image from 'next/image';
import { apiClient } from '@/lib/http/apiClient';
import { PostResponse } from '../types';

type SearchTab = 'users' | 'posts' | 'hashtags';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser?: (user: any) => void;
  onSelectPost?: (post: PostResponse) => void;
  onSelectHashtag?: (tag: string) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ isOpen, onClose, onSelectUser, onSelectPost, onSelectHashtag }) => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('users');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [postResults, setPostResults] = useState<PostResponse[]>([]);
  const [hashtagResults, setHashtagResults] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setQuery('');
      setUserResults([]);
      setPostResults([]);
      setHashtagResults([]);
    }
  }, [isOpen]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('social_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

  // Debounced search
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const extractHashtags = (posts: PostResponse[]): string[] => {
    const tags = new Set<string>();
    posts.forEach(p => {
      const matches = p.content?.match(/#[a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]+/g) || [];
      matches.forEach(m => tags.add(m.toLowerCase()));
    });
    return Array.from(tags);
  };

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setUserResults([]);
      setPostResults([]);
      setHashtagResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      if (activeTab === 'users') {
        const response = await apiClient.get<any>(`/search/users?q=${encodeURIComponent(searchQuery)}&size=10`);
        const data = Array.isArray(response) ? response : response?.content || response?.data || [];
        setUserResults(data);
      } else if (activeTab === 'posts' || activeTab === 'hashtags') {
        // Fetch feed and filter client-side
        const response = await apiClient.get<any>(`/posts/feed?size=50`);
        const posts: PostResponse[] = response?.content || response || [];
        const q = searchQuery.toLowerCase();

        if (activeTab === 'posts') {
          setPostResults(posts.filter(p => p.content?.toLowerCase().includes(q)));
        } else {
          // Hashtag search: find hashtags matching the prefix
          const prefix = searchQuery.startsWith('#') ? searchQuery.toLowerCase() : `#${searchQuery.toLowerCase()}`;
          const allTags = extractHashtags(posts);
          setHashtagResults(allTags.filter(t => t.startsWith(prefix)));
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => handleSearch(query), 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, handleSearch]);

  const handleSelectUser = (user: any) => {
    // Normalize: chỉ lưu các field cần thiết — tránh lưu raw API object vào localStorage
    const entry = {
      id: user.id || user.user_id,
      displayName: user.display_name || user.full_name || user.displayName || 'User',
      avatarUrl: user.avatar_url || user.avatarUrl || '',
    };
    const newRecent = [entry, ...recentSearches.filter(u => u.id !== entry.id)].slice(0, 8);
    setRecentSearches(newRecent);
    try {
      localStorage.setItem('social_recent_searches', JSON.stringify(newRecent));
    } catch {}
    
    onSelectUser?.(user);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[998] bg-black/20"
          onClick={onClose}
        />
      )}
      
      {/* Panel */}
      <div className={`fixed top-0 left-[64px] h-full w-[400px] z-[999] ${
        isDark ? 'bg-black border-[#262626]' : 'bg-white border-[#DBDBDB]'
      } border-r shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-[464px]'
      }`}>
        {/* Header */}
        <div className="px-6 pt-8 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {t('social.sidebar.search', 'Tìm kiếm')}
            </h2>
            <button 
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors cursor-pointer border-none bg-transparent ${
                isDark ? 'hover:bg-[#262626] text-white' : 'hover:bg-gray-100 text-black'
              }`}
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Search Input */}
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
            isDark ? 'bg-[#262626]' : 'bg-[#EFEFEF]'
          }`}>
            {!query && <Search size={16} className="text-gray-400 shrink-0" />}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeTab === 'users' ? t('social.search.placeholder', 'Tìm người dùng') :
                activeTab === 'posts' ? 'Tìm bài viết...' :
                'Tìm hashtag... (vd: #vui)'
              }
              className={`flex-1 bg-transparent outline-none text-sm ${
                isDark ? 'text-white placeholder:text-gray-500' : 'text-black placeholder:text-gray-400'
              }`}
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X size={12} className="text-white" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className={`flex mt-4 border-b ${isDark ? 'border-[#262626]' : 'border-gray-100'}`}>
            {([
              { id: 'users', label: 'Người dùng', icon: Users },
              { id: 'posts', label: 'Bài viết', icon: FileText },
              { id: 'hashtags', label: 'Hashtag', icon: Hash },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setQuery(''); }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-all bg-transparent cursor-pointer ${
                  activeTab === tab.id
                    ? `border-black dark:border-white ${isDark ? 'text-white' : 'text-black'}`
                    : `border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`
                }`}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-2 pt-2">
          {query ? (
            <div>
              {isSearching ? (
                <div className="flex flex-col gap-3 px-4 py-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-800" />
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24 mb-2" />
                        <div className="h-2.5 bg-gray-100 dark:bg-gray-900 rounded w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeTab === 'users' ? (
                userResults.length > 0 ? (
                  userResults.map((user) => (
                    <button
                      key={user.id || user.user_id}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors cursor-pointer bg-transparent border-none text-left ${
                        isDark ? 'hover:bg-[#1A1A1A]' : 'hover:bg-[#FAFAFA]'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden relative shrink-0 border border-gray-200 dark:border-gray-700">
                        <Image 
                          src={user.avatar_url || user.avatarUrl || '/avatar.jpg'} 
                          fill 
                          alt={user.display_name || user.full_name || 'User'}
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-black'}`}>
                          {user.display_name || user.full_name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email || user.phone_number || ''}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-500">Không tìm thấy người dùng.</p>
                  </div>
                )
              ) : activeTab === 'posts' ? (
                postResults.length > 0 ? (
                  postResults.map(post => (
                    <button
                      key={post.postId}
                      onClick={() => { onSelectPost?.(post); onClose(); }}
                      className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer bg-transparent border-none text-left ${
                        isDark ? 'hover:bg-[#1A1A1A]' : 'hover:bg-[#FAFAFA]'
                      }`}
                    >
                      {post.mediaList?.[0]?.url ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden relative shrink-0">
                          <Image
                            src={post.mediaList[0].url}
                            fill
                            alt=""
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-[#262626]' : 'bg-gray-100'}`}>
                          <FileText size={16} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-black'}`}>
                          {post.authorName || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">{post.content}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-500">Không tìm thấy bài viết.</p>
                  </div>
                )
              ) : (
                // Hashtags
                hashtagResults.length > 0 ? (
                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    {hashtagResults.map(tag => (
                      <button
                        key={tag}
                        onClick={() => { onSelectHashtag?.(tag); onClose(); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#EFF5FF] dark:bg-[#1A2840] text-[#0095F6] text-sm font-semibold hover:bg-[#DBEAFE] dark:hover:bg-[#1E3A5F] transition-colors cursor-pointer border-none"
                      >
                        <Hash size={12} />
                        {tag.replace('#', '')}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-500">Không tìm thấy hashtag.</p>
                  </div>
                )
              )}
            </div>
          ) : (
            // Recent Searches (only for users tab)
            activeTab === 'users' ? (
              <div>
                <div className="flex items-center justify-between px-6 mb-2">
                  <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                    {t('social.search.recent', 'Gần đây')}
                  </span>
                  {recentSearches.length > 0 && (
                    <button 
                      onClick={() => { setRecentSearches([]); localStorage.removeItem('social_recent_searches'); }}
                      className="text-[#0095F6] text-sm font-semibold hover:text-[#1877F2] cursor-pointer bg-transparent border-none"
                    >
                      {t('social.search.clear_all', 'Xóa tất cả')}
                    </button>
                  )}
                </div>
                
                {recentSearches.length > 0 ? (
                  recentSearches.map((user) => (
                    <div
                      key={user.id}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-[#1A1A1A]' : 'hover:bg-[#FAFAFA]'
                      }`}
                    >
                      <button
                        onClick={() => handleSelectUser(user)}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer bg-transparent border-none text-left"
                      >
                        <div className="w-11 h-11 rounded-full overflow-hidden relative shrink-0 border border-gray-200 dark:border-gray-700">
                          <Image 
                            src={user.avatarUrl || '/avatar.jpg'} 
                            fill 
                            alt={user.displayName || 'User'}
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-black'}`}>
                            {user.displayName || 'User'}
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          const newR = recentSearches.filter(u => u.id !== user.id);
                          setRecentSearches(newR);
                          try { localStorage.setItem('social_recent_searches', JSON.stringify(newR)); } catch {}
                        }}
                        className={`p-1.5 rounded-full transition-colors cursor-pointer bg-transparent border-none ${
                          isDark ? 'hover:bg-[#262626] text-gray-500' : 'hover:bg-gray-100 text-gray-400'
                        }`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">{t('social.search.no_recent', 'Không có tìm kiếm gần đây.')}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-gray-400">
                  {activeTab === 'posts' ? 'Nhập từ khóa để tìm bài viết' : 'Nhập # để tìm hashtag'}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
};
