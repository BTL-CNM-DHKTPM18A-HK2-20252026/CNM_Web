import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/themes';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { apiClient } from '@/lib/http/apiClient';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser?: (user: any) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ isOpen, onClose, onSelectUser }) => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setQuery('');
      setResults([]);
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
  
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Use the existing search/users endpoint
      const response = await apiClient.get<any>(`/search/users?q=${encodeURIComponent(searchQuery)}&size=10`);
      const data = Array.isArray(response) ? response : response?.content || response?.data || [];
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => handleSearch(query), 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, handleSearch]);

  const handleSelectUser = (user: any) => {
    // Save to recent searches
    const newRecent = [user, ...recentSearches.filter(u => (u.id || u.user_id) !== (user.id || user.user_id))].slice(0, 8);
    setRecentSearches(newRecent);
    try {
      localStorage.setItem('social_recent_searches', JSON.stringify(newRecent));
    } catch {}
    
    onSelectUser?.(user);
    onClose();
  };

  const removeRecent = (userId: string) => {
    const newRecent = recentSearches.filter(u => (u.id || u.user_id) !== userId);
    setRecentSearches(newRecent);
    try {
      localStorage.setItem('social_recent_searches', JSON.stringify(newRecent));
    } catch {}
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('social_recent_searches');
    } catch {}
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
      } border-r shadow-2xl transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-[464px]'
      }`}>
        {/* Header */}
        <div className="px-6 pt-8 pb-4 relative">
          <div className="flex items-center justify-between mb-8">
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
              placeholder={t('social.search.placeholder', 'Tìm kiếm')}
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
        </div>

        {/* Divider */}
        <div className={`border-t ${isDark ? 'border-[#262626]' : 'border-gray-100'}`} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-2 pt-3" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          {query ? (
            // Search Results
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
              ) : results.length > 0 ? (
                results.map((user) => (
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
                  <p className="text-sm text-gray-500">{t('social.search.no_results', 'Không tìm thấy kết quả.')}</p>
                </div>
              )}
            </div>
          ) : (
            // Recent Searches
            <div>
              <div className="flex items-center justify-between px-6 mb-2">
                <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                  {t('social.search.recent', 'Gần đây')}
                </span>
                {recentSearches.length > 0 && (
                  <button 
                    onClick={clearAllRecent}
                    className="text-[#0095F6] text-sm font-semibold hover:text-[#1877F2] cursor-pointer bg-transparent border-none"
                  >
                    {t('social.search.clear_all', 'Xóa tất cả')}
                  </button>
                )}
              </div>
              
              {recentSearches.length > 0 ? (
                recentSearches.map((user) => (
                  <div
                    key={user.id || user.user_id}
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
                          src={user.avatar_url || user.avatarUrl || '/avatar.jpg'} 
                          fill 
                          alt={user.display_name || 'User'}
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
                    <button
                      onClick={() => removeRecent(user.id || user.user_id)}
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
          )}
        </div>
      </div>
    </>
  );
};
