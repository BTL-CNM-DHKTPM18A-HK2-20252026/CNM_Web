'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { X, UserPlus, RefreshCw, Users } from 'lucide-react';
import { friendService, type FriendSuggestion } from '@/features/friends/services/friendService';

interface SocialSidebarRightProps {
  user: any;
  conversations: any[];
  onSelectContact: (conversation: any) => void;
}

// ── Client-side scoring helpers (fallback when backend is unavailable) ────
function computeSuggestionReason(s: FriendSuggestion): string {
  if (s.reason) return s.reason;
  if (s.mutualFriendCount === 0) return 'Gợi ý cho bạn';
  if (s.mutualFriendCount === 1) {
    return s.mutualFriendNames?.[0]
      ? `Bạn của ${s.mutualFriendNames[0]}`
      : '1 bạn chung';
  }
  if (s.mutualFriendNames?.length) {
    return `${s.mutualFriendNames[0]} + ${s.mutualFriendCount - 1} bạn chung`;
  }
  return `${s.mutualFriendCount} bạn chung`;
}

// ── Mock data (used as fallback when API unavailable) ─────────────────────
const MOCK_SUGGESTIONS: FriendSuggestion[] = [
  { userId: 'u1', fullName: 'Trương Ngọc Trinh', username: 'truongngoctrinh', mutualFriendCount: 3, mutualFriendNames: ['hwlocc.0210'] },
  { userId: 'u2', fullName: 'Nguyễn Uyên', username: 'nguyenuyen_02', mutualFriendCount: 2, mutualFriendNames: ['susan_0708'] },
  { userId: 'u3', fullName: 'Khánh Linh', username: 'khanhlinh.social', mutualFriendCount: 1, mutualFriendNames: ['iamphg24'] },
  { userId: 'u4', fullName: 'Tuyết Trinh', username: 'tuyettrinh_99', mutualFriendCount: 0 },
  { userId: 'u5', fullName: 'Mỹ Nhung', username: 'mynhungan', mutualFriendCount: 1, mutualFriendNames: ['kmi29.4'] },
];

export const SocialSidebarRight: React.FC<SocialSidebarRightProps> = ({ user }) => {
  const { t } = useTranslation();

  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSuggestions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await friendService.getSuggestions(10);
      // Sort by mutualFriendCount descending (friend-graph score)
      const sorted = [...data].sort((a, b) => b.mutualFriendCount - a.mutualFriendCount);
      setSuggestions(sorted);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      setSuggestions(MOCK_SUGGESTIONS);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleFollow = async (suggestion: FriendSuggestion) => {
    setFollowedIds(prev => new Set(prev).add(suggestion.userId));
    try {
      await friendService.followUser(suggestion.userId);
    } catch {
      // Optimistic UI — keep followed state regardless
    }
  };

  const handleDismiss = async (suggestion: FriendSuggestion) => {
    setDismissedIds(prev => new Set(prev).add(suggestion.userId));
    try {
      await friendService.dismissSuggestion(suggestion.userId);
    } catch {
      // Non-critical
    }
  };

  const visibleSuggestions = suggestions.filter(s => !dismissedIds.has(s.userId));

  return (
    <div className="w-full h-full bg-white dark:bg-black flex flex-col pt-4 overflow-y-auto scrollbar-hide">

      {/* ── Current User ──────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full overflow-hidden relative border border-gray-100 dark:border-gray-900 shadow-sm cursor-pointer">
            <Image
              src={user?.avatar_url || '/avatar.jpg'}
              fill
              alt="User"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col">
            <p className="font-semibold text-[14px] text-black dark:text-white leading-tight hover:underline cursor-pointer">
              {user?.display_name || user?.username || t('social.sidebar.you', 'Bạn')}
            </p>
            <p className="text-[14px] text-gray-500 font-normal">
              {user?.full_name || ''}
            </p>
          </div>
        </div>
        <button className="text-[12px] font-semibold text-[#0095F6] hover:text-[#00376B] transition-colors cursor-pointer">
          Switch
        </button>
      </div>

      {/* ── Suggestions Header ────────────────────────── */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-semibold text-[14px] text-gray-500">
          {t('social.suggestions.title', 'Gợi ý cho bạn')}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadSuggestions(true)}
            disabled={isRefreshing}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
            title="Làm mới gợi ý"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button className="text-[12px] font-semibold text-black dark:text-white hover:text-gray-500 transition-colors cursor-pointer">
            {t('social.suggestions.see_all', 'Xem tất cả')}
          </button>
        </div>
      </div>

      {/* ── Suggestions List ──────────────────────────── */}
      <div className="space-y-3 mb-8 px-1">
        {isLoading ? (
          // Skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-32" />
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-12" />
            </div>
          ))
        ) : visibleSuggestions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Users size={32} className="text-gray-300 dark:text-gray-700" />
            <p className="text-[13px] text-gray-400">Không có gợi ý mới</p>
          </div>
        ) : (
          visibleSuggestions.slice(0, 5).map((item) => {
            const isFollowed = followedIds.has(item.userId);
            const reason = computeSuggestionReason(item);

            return (
              <div
                key={item.userId}
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full overflow-hidden relative border border-gray-100 dark:border-gray-900 shrink-0 cursor-pointer">
                    <Image
                      src={item.avatarUrl || `https://api.dicebear.com/8.x/avataaars/svg?seed=${item.userId}`}
                      fill
                      alt={item.fullName}
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/avatar.jpg';
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex flex-col min-w-0">
                    <p className="font-semibold text-[14px] text-black dark:text-white leading-tight hover:underline cursor-pointer">
                      {item.fullName || item.username}
                    </p>
                    <p className="text-[12px] text-gray-500 truncate max-w-[130px]">
                      {reason}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isFollowed ? (
                    <span className="text-[12px] font-semibold text-gray-400">
                      Đang theo dõi
                    </span>
                  ) : (
                    <button
                      onClick={() => handleFollow(item)}
                      className="text-[12px] font-semibold text-[#0095F6] hover:text-[#00376B] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus size={12} />
                      {t('social.suggestions.follow', 'Theo dõi')}
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(item)}
                    className="p-0.5 rounded text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Bỏ qua gợi ý"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer ───────────────────────────────────── */}
      <div className="text-[12px] text-[#C7C7C7] px-1 space-y-4 pb-4 mt-auto">
        <nav className="flex flex-wrap gap-x-2 gap-y-1">
          {[
            { key: 'about',    label: t('social.footer.about',    'Giới thiệu') },
            { key: 'help',     label: t('social.footer.help',     'Trợ giúp') },
            { key: 'press',    label: t('social.footer.press',    'Báo chí') },
            { key: 'api',      label: t('social.footer.api',      'API') },
            { key: 'jobs',     label: t('social.footer.jobs',     'Việc làm') },
            { key: 'privacy',  label: t('social.footer.privacy',  'Quyền riêng tư') },
            { key: 'terms',    label: t('social.footer.terms',    'Điều khoản') },
            { key: 'locations',label: t('social.footer.locations','Vị trí') },
            { key: 'language', label: t('social.footer.language', 'Ngôn ngữ') },
            { key: 'verified', label: t('social.footer.verified', 'Fruvia Verified') },
          ].map(link => (
            <span key={link.key} className="cursor-pointer hover:underline">{link.label}</span>
          ))}
        </nav>
        <p className="font-medium tracking-tight uppercase">
          © 2026 {t('social.footer.copyright', 'FRUVIA FROM IUH')}
        </p>
      </div>
    </div>
  );
};
