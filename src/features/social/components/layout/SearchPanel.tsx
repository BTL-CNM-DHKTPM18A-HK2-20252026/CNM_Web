import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/themes';
import { Search, X, Users, FileText, Hash, Flag, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { apiClient } from '@/lib/http/apiClient';
import { PostResponse } from '../types';
import { friendService, type FriendSuggestion } from '@/features/friends/services/friendService';
import { toast } from 'sonner';

type SearchTab = 'users' | 'posts' | 'hashtags' | 'groups' | 'pages';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser?: (user: any) => void;
  onSelectPost?: (post: PostResponse) => void;
  onSelectHashtag?: (tag: string) => void;
}

// Inline Group SVG for absolute version compatibility
const GroupIcon = ({ size = 16, className = '' }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    stroke="currentColor" 
    strokeWidth="2" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

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

  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Load suggestions from API
  useEffect(() => {
    if (isOpen) {
      const loadSuggestions = async () => {
        setIsLoadingSuggestions(true);
        try {
          const data = await friendService.getSuggestions(10);
          const sorted = [...data].sort((a, b) => b.mutualFriendCount - a.mutualFriendCount);
          setSuggestions(sorted);
        } catch (error) {
          console.error('Failed to load suggestions in SearchPanel:', error);
          setSuggestions([]);
        } finally {
          setIsLoadingSuggestions(false);
        }
      };
      loadSuggestions();
    }
  }, [isOpen]);

  const handleConnect = async (userId: string) => {
    setConnectedIds(prev => new Set(prev).add(userId));
    try {
      await friendService.sendRequest(userId);
      toast.success(t('social.suggestions.request_sent', 'Đã gửi lời mời kết bạn'));
    } catch (error) {
      console.error('Failed to send friend request:', error);
      toast.error(t('common.action_failed', 'Gửi lời mời thất bại'));
      setConnectedIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
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
        const response = await apiClient.get<any>(`/posts/feed?size=50`);
        const posts: PostResponse[] = response?.content || response || [];
        const q = searchQuery.toLowerCase();

        if (activeTab === 'posts') {
          setPostResults(posts.filter(p => p.content?.toLowerCase().includes(q)));
        } else {
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

  if (!isOpen) return null;



  // Popular hashtags
  const popularHashtags = [
    { name: '#FruviaTrip', count: '12.3K bài viết' },
    { name: '#ChillVibes', count: '8.7K bài viết' },
    { name: '#ĐàLạt', count: '6.1K bài viết' },
    { name: '#WeekendVibes', count: '4.2K bài viết' },
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Modal Dialog */}
      <div className={`w-full max-w-[880px] h-[640px] rounded-xl shadow-2xl flex flex-col overflow-hidden border animate-in zoom-in-95 duration-200 ${
        isDark ? 'bg-[#18181B] border-zinc-800' : 'bg-white border-zinc-100'
      }`}>
        
        {/* Top Header Section */}
        <div className={`flex items-center gap-3 px-6 py-4 border-b shrink-0 ${
          isDark ? 'border-zinc-800' : 'border-zinc-100'
        }`}>
          {/* Search Input Box */}
          <div className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-full ${
            isDark ? 'bg-[#27272A]' : 'bg-[#F0F2F5]'
          }`}>
            <Search size={18} className="text-zinc-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm bạn bè, bài viết, hashtag..."
              className={`flex-1 bg-transparent border-none outline-none text-[15px] font-normal leading-normal ${
                isDark ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
              }`}
            />
          </div>

          {/* Close Circular Button */}
          <button 
            onClick={onClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer border-none shrink-0 ${
              isDark ? 'bg-[#27272A] hover:bg-[#3F3F46] text-zinc-400' : 'bg-[#F0F2F5] hover:bg-[#E4E6EB] text-zinc-500'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Main Split Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Suggestion Tabs & Recent Searches */}
          <div className={`w-[260px] border-r p-5 flex flex-col gap-6 overflow-y-auto shrink-0 select-none ${
            isDark ? 'border-zinc-800' : 'border-zinc-100'
          }`}>
            {/* suggestions category */}
            <div>
              <h3 className="text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase mb-2.5">
                Gợi ý tìm kiếm
              </h3>
              <div className="flex flex-col gap-1">
                {([
                  { id: 'users', label: 'Bạn bè', icon: Users },
                  { id: 'posts', label: 'Bài viết', icon: FileText },
                  { id: 'hashtags', label: 'Hashtag', icon: Hash },
                  { id: 'groups', label: 'Nhóm', icon: GroupIcon },
                  { id: 'pages', label: 'Trang', icon: Flag }
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); setQuery(''); }}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border-none text-left bg-transparent ${
                      activeTab === tab.id
                        ? 'bg-blue-50/80 dark:bg-blue-950/20 text-[#0068FF] dark:text-blue-400'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* recent searches category */}
            <div className="border-t pt-4 dark:border-zinc-800">
              <h3 className="text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase mb-3">
                Tìm kiếm gần đây
              </h3>
              
              {recentSearches.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {recentSearches.map((user) => (
                    <div key={user.id} className="flex items-center justify-between group/recent">
                      <button
                        onClick={() => handleSelectUser(user)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 bg-transparent border-none text-left cursor-pointer"
                      >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800">
                          <Image src={user.avatarUrl || '/avatar.jpg'} fill className="object-cover" alt="" />
                        </div>
                        <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                          {user.displayName}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          const newR = recentSearches.filter(u => u.id !== user.id);
                          setRecentSearches(newR);
                          try { localStorage.setItem('social_recent_searches', JSON.stringify(newR)); } catch {}
                        }}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 bg-transparent border-none cursor-pointer rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => { setRecentSearches([]); try { localStorage.removeItem('social_recent_searches'); } catch {} }}
                    className="text-[#0068FF] dark:text-blue-400 text-xs font-semibold hover:underline cursor-pointer bg-transparent border-none text-left mt-2 pl-0.5"
                  >
                    Xóa tất cả
                  </button>
                </div>
              ) : (
                <span className="text-[13px] text-zinc-400 dark:text-zinc-500 pl-0.5">
                  Không có tìm kiếm gần đây.
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Suggestion details or active search results */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
            
            {query ? (
              // Dynamic Search Results Mode
              <div>
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase mb-3">
                  Kết quả tìm kiếm cho "{query}"
                </h3>
                
                {isSearching ? (
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        <div className="flex-1">
                          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-24 mb-2" />
                          <div className="h-2.5 bg-zinc-100 dark:bg-zinc-900 rounded w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activeTab === 'users' ? (
                  userResults.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {userResults.map((user) => (
                        <button
                          key={user.id || user.user_id}
                          onClick={() => handleSelectUser(user)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors cursor-pointer bg-transparent border-none text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                        >
                          <div className="w-11 h-11 rounded-full overflow-hidden relative shrink-0 border border-zinc-100 dark:border-zinc-800">
                            <Image 
                              src={user.avatar_url || user.avatarUrl || '/avatar.jpg'} 
                              fill 
                              alt={user.display_name || user.full_name || 'User'}
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                              {user.display_name || user.full_name || 'User'}
                            </p>
                            <p className="text-xs text-zinc-400 truncate">
                              {user.email || user.phone_number || ''}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 text-center py-8">Không tìm thấy người dùng nào.</p>
                  )
                ) : activeTab === 'posts' ? (
                  postResults.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {postResults.map(post => (
                        <button
                          key={post.postId}
                          onClick={() => { onSelectPost?.(post); onClose(); }}
                          className="w-full flex items-start gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer bg-transparent border-none text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
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
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-zinc-100 dark:bg-zinc-800">
                              <FileText size={16} className="text-zinc-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                              {post.authorName || 'User'}
                            </p>
                            <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">{post.content}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 text-center py-8">Không tìm thấy bài viết nào.</p>
                  )
                ) : (
                  hashtagResults.length > 0 ? (
                    <div className="flex flex-wrap gap-2 py-2">
                      {hashtagResults.map(tag => (
                        <button
                          key={tag}
                          onClick={() => { onSelectHashtag?.(tag); onClose(); }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-50/60 dark:bg-blue-950/20 text-[#0068FF] text-sm font-semibold hover:bg-blue-100/80 transition-colors cursor-pointer border-none"
                        >
                          <Hash size={12} />
                          {tag.replace('#', '')}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 text-center py-8">Không tìm thấy hashtag nào.</p>
                  )
                )}
              </div>
            ) : (
              // Default Suggestions Mode (Exactly like the design screenshots)
              <>
                {/* SUGGESTION CATEGORY: USER SUGGESTION */}
                {activeTab === 'users' && (
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
                        Gợi ý bạn bè
                      </h4>
                      <button className="text-xs font-bold text-[#0068FF] hover:underline cursor-pointer bg-transparent border-none">
                        Xem tất cả
                      </button>
                    </div>

                    <div className="flex flex-col gap-4">
                      {isLoadingSuggestions ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                              <div className="space-y-1.5">
                                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-24" />
                                <div className="h-2.5 bg-zinc-100 dark:bg-zinc-900 rounded w-16" />
                              </div>
                            </div>
                            <div className="w-16 h-7 bg-zinc-200 dark:bg-zinc-800 rounded-full shrink-0" />
                          </div>
                        ))
                      ) : suggestions.length === 0 ? (
                        <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 text-sm">
                          Không có gợi ý mới
                        </div>
                      ) : (
                        suggestions.slice(0, 5).map((item) => {
                          const isSent = connectedIds.has(item.userId);
                          return (
                            <div key={item.userId} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800 cursor-pointer">
                                  <img 
                                    src={item.avatarUrl || `https://api.dicebear.com/8.x/avataaars/svg?seed=${item.userId}`} 
                                    className="w-full h-full object-cover" 
                                    alt={item.fullName}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/avatar.jpg';
                                    }}
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[14px] font-semibold text-zinc-900 dark:text-white hover:underline cursor-pointer">
                                      {item.fullName || item.username}
                                    </span>
                                  </div>
                                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                    {item.mutualFriendCount > 0 
                                      ? `${item.mutualFriendCount} bạn chung` 
                                      : 'Gợi ý cho bạn'}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleConnect(item.userId)}
                                disabled={isSent}
                                className={`text-[12px] font-bold cursor-pointer transition-all border-none bg-transparent ${
                                  isSent
                                    ? 'text-zinc-400 dark:text-zinc-500 cursor-default pointer-events-none'
                                    : 'text-[#0068FF] dark:text-blue-400 hover:text-[#00376B]'
                                }`}
                              >
                                {isSent ? 'Đã gửi' : 'Kết bạn'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* SUGGESTION CATEGORY: HASHTAG POPULAR */}
                {activeTab === 'hashtags' && (
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
                        Hashtag phổ biến
                      </h4>
                      <button className="text-xs font-bold text-[#0068FF] hover:underline cursor-pointer bg-transparent border-none">
                        Xem tất cả
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {popularHashtags.map((tag) => (
                        <div 
                          key={tag.name}
                          onClick={() => { onSelectHashtag?.(tag.name); onClose(); }}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-all cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-[#0068FF] font-bold text-[18px] shrink-0">
                            #
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-zinc-900 dark:text-white block leading-tight">
                              {tag.name}
                            </span>
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                              {tag.count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* OTHER TABS EMPTY/FALLBACK STATE */}
                {['posts', 'groups', 'pages'].includes(activeTab) && (
                  <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-center mb-3">
                      <Search size={22} className="text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Chưa có tìm kiếm nào cho mục này
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-[280px]">
                      Nhập từ khóa ở ô tìm kiếm phía trên để hiển thị kết quả lọc chi tiết.
                    </span>
                  </div>
                )}

                {/* BOTTOM COMPONENT: SEE MORE BAR */}
                <div className="mt-auto border-t pt-4 dark:border-zinc-800">
                  <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isDark ? 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/40' : 'bg-[#FAFAFA] border-zinc-100 hover:bg-zinc-100/50'
                  }`}>
                    <span className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                      Xem thêm kết quả cho "{query}"
                    </span>
                    <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-500" />
                  </div>

                  {/* Quick helper buttons */}
                  <div className="flex items-center gap-4 mt-4 justify-center">
                    <button 
                      onClick={() => setActiveTab('posts')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-semibold cursor-pointer border-none transition-colors"
                    >
                      <FileText size={14} />
                      Bài viết
                    </button>
                    <button 
                      onClick={() => setActiveTab('groups')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-semibold cursor-pointer border-none transition-colors"
                    >
                      <GroupIcon size={14} className="text-zinc-400 dark:text-zinc-500" />
                      Nhóm
                    </button>
                    <button 
                      onClick={() => setActiveTab('pages')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-semibold cursor-pointer border-none transition-colors"
                    >
                      <Flag size={14} />
                      Trang
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
