import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiClient } from '@/lib/http/apiClient';
import { friendService } from '@/features/friends';

interface ShareContactModalProps {
  conversationId: string;
  currentUserId?: string;
  onClose: () => void;
  onSent?: () => void;
}

interface FriendItem {
  userId: string;
  displayName: string;
  phoneNumber: string;
  avatarUrl: string;
  workplace?: string;
  friendshipStatus?: string;
  isSelf?: boolean;
}

interface FriendApiItem {
  user_id?: string;
  userId?: string;
  id?: string;
  display_name?: string;
  displayName?: string;
  fullName?: string;
  name?: string;
  phone_number?: string;
  phoneNumber?: string;
  avatar_url?: string;
  avatarUrl?: string;
  workplace?: string;
  workplace_name?: string;
  friendship_status?: string;
  friendshipStatus?: string;
}

interface MeProfileItem {
  id?: string;
  user_id?: string;
  full_name?: string;
  display_name?: string;
  fullName?: string;
  phone_number?: string;
  phoneNumber?: string;
  avatar_url?: string;
  avatarUrl?: string;
  workplace?: string;
  workplace_name?: string;
}

const LABEL_FILTERS = ['Tất cả', 'Khách hàng', 'Gia đình', 'Công việc', 'Bạn bè', 'Trả lời sau'];

type ContactFilter = typeof LABEL_FILTERS[number];

const normalizeText = (value: string) => value.trim().toLowerCase();

const categorizeFriend = (friend: FriendItem) => {
  const name = normalizeText(friend.displayName);
  const phone = friend.phoneNumber.replace(/\s+/g, '');
  const workplace = normalizeText(friend.workplace || '');
  const isFamily = /(^|[\s._-])(mẹ|me|bố|bo|cha|ba|anh|chị|chi|em|cô|co|dì|di|chú|chu|bác|bac|ông|ong|bà|ba|gia đình|family)([\s._-]|$)/i.test(name);
  const isWork = Boolean(workplace) || /(công ty|cong ty|company|corp|office|work|cty|tnhh|tmcp|jsc|ltd)/i.test(name) || /(công ty|cong ty|company|corp|office|work|cty|tnhh|tmcp|jsc|ltd)/i.test(workplace);
  const isFriends = !friend.isSelf && (friend.friendshipStatus === 'ACCEPTED' || friend.friendshipStatus === 'FRIEND');
  const isReplyLater = !friend.isSelf && (/(later|sau|tạm|tam|pending|đợi|doi)/i.test(name) || friend.friendshipStatus === 'PENDING');
  const isCustomer = !isFamily && !isWork && !isFriends && !isReplyLater && (phone.length >= 10 || /khách|customer|client|sale/i.test(name));

  if (isFamily) return 'Gia đình';
  if (isWork) return 'Công việc';
  if (isFriends) return 'Bạn bè';
  if (isReplyLater) return 'Trả lời sau';
  if (isCustomer) return 'Khách hàng';
  return 'Khách hàng';
};

export function ShareContactModal({ conversationId, currentUserId, onClose, onSent }: ShareContactModalProps) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<ContactFilter>(LABEL_FILTERS[0]);
  const [includePhone, setIncludePhone] = useState(true);

  const MAX = 9;

  useEffect(() => {
    const fetchFriends = async () => {
      setLoading(true);
      try {
        const [friendsRes, meRes] = await Promise.all([
          friendService.getFriends(),
          apiClient.get('/users/me').catch(() => null),
        ]);
        const raw = (Array.isArray(friendsRes)
          ? friendsRes
          : ((friendsRes as { data?: unknown[] } | undefined)?.data ?? [])) as FriendApiItem[];
        const mapped: FriendItem[] = raw
          .map((f) => ({
            userId: f.user_id || f.userId || f.id || '',
            displayName: f.display_name || f.displayName || f.fullName || f.name || '',
            phoneNumber: f.phone_number || f.phoneNumber || '',
            avatarUrl: f.avatar_url || f.avatarUrl || '',
            workplace: f.workplace || f.workplace_name || '',
            friendshipStatus: f.friendship_status || f.friendshipStatus || '',
            isSelf: false,
          }))
          .filter(f => f.userId && f.userId !== currentUserId);
        const mePayload = (() => {
          if (meRes && typeof meRes === 'object' && 'data' in meRes) {
            return (meRes as { data?: MeProfileItem }).data;
          }
          return meRes;
        })() as MeProfileItem | null;
        const meCard: FriendItem | null = mePayload
          ? {
            userId: String(mePayload.id || mePayload.user_id || currentUserId || ''),
            displayName: mePayload.full_name || mePayload.display_name || mePayload.fullName || 'Bạn',
            phoneNumber: mePayload.phone_number || mePayload.phoneNumber || '',
            avatarUrl: mePayload.avatar_url || mePayload.avatarUrl || '',
            workplace: mePayload.workplace || mePayload.workplace_name || '',
            friendshipStatus: 'FRIEND',
            isSelf: true,
          }
          : null;
        setContacts(meCard ? [meCard, ...mapped] : mapped);
      } catch (e) {
        console.error('Failed to fetch friends:', e);
        toast.error(t('share_contact.error_load'));
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [currentUserId, t]);

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase();
    return contacts.filter(f => {
      const matchesSearch =
        f.displayName.toLowerCase().includes(keyword) ||
        f.phoneNumber.toLowerCase().includes(keyword);
      if (!matchesSearch) return false;
      if (activeFilter === 'Tất cả') return true;
      return categorizeFriend(f) === activeFilter;
    });
  }, [contacts, search, activeFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, FriendItem[]> = {};
    [...filtered]
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'))
      .forEach(f => {
        const key = f.displayName.charAt(0).toUpperCase() || '#';
        if (!groups[key]) groups[key] = [];
        groups[key].push(f);
      });
    return groups;
  }, [filtered]);

  const selectedFriends = useMemo(() => {
    return contacts.filter(f => selectedIds.has(f.userId));
  }, [contacts, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX) {
          toast.info(t('share_contact.max_warn', { count: MAX }));
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    try {
      const sends = Array.from(selectedIds).map(async (uid) => {
        const f = contacts.find(x => x.userId === uid)!;
        const contactData = {
          userId: f.userId,
          fullName: f.displayName,
          phoneNumber: includePhone ? f.phoneNumber : '',
          avatar: f.avatarUrl,
        };
        return apiClient.post('/messages', {
          conversationId,
          content: JSON.stringify(contactData),
          messageType: 'SHARE_CONTACT',
        });
      });
      await Promise.all(sends);
      toast.success(t('share_contact.success', { count: selectedIds.size }));
      onSent?.();
      onClose();
    } catch (e) {
      console.error('Share contact failed:', e);
      toast.error(t('share_contact.error_send'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4 dark:bg-black/55"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[900px] h-[620px] bg-white dark:bg-[#1E1E1E] rounded-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 px-4 py-3.5 border-b border-[var(--border)] bg-white dark:bg-[#1E1E1E]">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0068FF] text-white shadow-sm">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="3" />
                  <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />
                  <path d="M4 20c0-2.5 1.8-4 4-4" />
                  <line x1="15" y1="8" x2="21" y2="8" />
                  <line x1="15" y1="12" x2="21" y2="12" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[19px] font-bold text-[var(--text)]">
                    {t('share_contact.title')}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-[#0068FF]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#0068FF]">
                    {selectedIds.size}/{MAX}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-[var(--sub-text)]">
                  {t('share_contact.subtitle', { max: MAX })}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--sub-text)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text)] cursor-pointer"
              aria-label={t('common.close') || 'Đóng'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_280px]">
            <div className="flex min-h-0 flex-col border-r border-[var(--border)] bg-[#f7f8fa] dark:bg-black/10">
              <div className="space-y-2.5 px-4 py-3">
                <div className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-white px-4 py-2.5 shadow-sm focus-within:border-[#0068FF] focus-within:ring-1 focus-within:ring-[#0068FF]/10 transition-all dark:bg-[#1E1E1E]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--sub-text)]">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('share_contact.search_placeholder')}
                    className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--sub-text)]"
                    autoFocus
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="shrink-0 rounded-full p-1 text-[var(--sub-text)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text)] cursor-pointer"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {LABEL_FILTERS.map(label => (
                    <button
                      key={label}
                      onClick={() => setActiveFilter(label)}
                        className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-all cursor-pointer ${
                          activeFilter === label
                          ? 'bg-[#0068FF] text-white shadow-sm'
                          : 'bg-[#E9EBED] text-[var(--sub-text)] hover:bg-[#DDE0E3] hover:text-[var(--text)] dark:bg-black/20 dark:hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-semibold tracking-normal text-[var(--sub-text)]">
                    {loading ? '...' : `${filtered.length} người`}
                  </div>
                  <div className="text-[12px] text-[var(--sub-text)]">
                    {selectedIds.size > 0 ? t('share_contact.will_send', { count: selectedIds.size }) : t('share_contact.hint')}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                {loading ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-[var(--border)] bg-white dark:bg-[#1E1E1E]">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0068FF] border-t-transparent" />
                    <span className="text-[13px] text-[var(--sub-text)]">{t('common.loading') || 'Đang tải...'}</span>
                  </div>
                ) : Object.keys(grouped).length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-[var(--border)] bg-white px-6 text-center dark:bg-[#1E1E1E]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F2F4] text-[var(--sub-text)] dark:bg-black/20">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-[var(--text)]">{t('share_contact.no_results')}</div>
                      <div className="mt-1 text-[13px] text-[var(--sub-text)]">Thử đổi từ khóa tìm kiếm hoặc bỏ bộ lọc hiện tại.</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(grouped).map(([letter, items]) => (
                      <div key={letter}>
                        <div className="sticky top-0 z-10 mb-2 bg-[#f7f8fa] px-2 py-1 dark:bg-[#1E1E1E]">
                          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--sub-text)]">{letter}</span>
                        </div>
                        <div className="space-y-2">
                          {items.map(friend => {
                            const isSelected = selectedIds.has(friend.userId);
                            return (
                              <button
                                key={friend.userId}
                                onClick={() => toggleSelect(friend.userId)}
                                className={`group relative flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-[#0068FF]/20 bg-[#E5EFFF]/75 shadow-sm backdrop-blur-[1px] ring-1 ring-[#0068FF]/10 dark:bg-[#0068FF]/12 dark:border-[#0068FF]/30 dark:ring-[#0068FF]/20'
                                    : 'border-[var(--border)] bg-white hover:bg-[#F8F9FA] dark:bg-[#1E1E1E] dark:hover:bg-white/5'
                                }`}
                              >
                                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                  isSelected ? 'border-[#0068FF] bg-[#0068FF] scale-105' : 'border-[#D0D5DD] bg-white dark:border-white/20 dark:bg-[#1E1E1E]'
                                }`}>
                                  {isSelected && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>

                                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-[#EAF2FF] ring-1 ring-[var(--border)] dark:bg-black/20">
                                  {friend.avatarUrl ? (
                                    <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[14px] font-extrabold text-[#0068FF] dark:text-[#8bb8ff]">
                                      {friend.displayName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[14px] font-semibold text-[var(--text)]">{friend.displayName}</div>
                                  {friend.phoneNumber && (
                                    <div className="mt-0.5 truncate text-[12px] text-[var(--sub-text)]">{friend.phoneNumber}</div>
                                  )}
                                </div>

                                {isSelected ? (
                                  <div className="rounded-full bg-[#E5EFFF] px-3 py-1 text-[11px] font-bold text-[#0068FF] dark:bg-[#0068FF]/10 dark:text-[#8bb8ff]">
                                    Đã chọn
                                  </div>
                                ) : (
                                  <div className="rounded-full bg-[#F1F2F4] px-3 py-1 text-[11px] font-medium text-[var(--sub-text)] dark:bg-black/20">
                                    Chọn
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col bg-white dark:bg-[#1E1E1E]">
              <div className="border-b border-[var(--border)] px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--sub-text)]">
                      {t('share_contact.selected_label')}
                    </div>
                    <div className="mt-1 text-[13px] text-[var(--sub-text)]">
                      {selectedIds.size > 0
                        ? `${selectedIds.size} danh thiếp sẵn sàng gửi`
                        : 'Chọn danh thiếp từ danh sách bên trái'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    disabled={selectedIds.size === 0}
                    className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-[#0068FF] transition-colors hover:bg-[#E5EFFF] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#8bb8ff] dark:hover:bg-white/10"
                  >
                    Xóa tất cả
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
                {selectedFriends.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-white px-5 text-center dark:bg-[#1E1E1E]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F1F2F4] text-[var(--sub-text)] dark:bg-black/20">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                    </div>
                    <div className="mt-4 text-[14px] font-semibold text-[var(--text)]">Chưa chọn danh thiếp nào</div>
                    <div className="mt-1 text-[13px] text-[var(--sub-text)]">Chọn một hoặc nhiều liên hệ để gửi nhanh vào cuộc trò chuyện.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedFriends.map(f => (
                      <div
                        key={f.userId}
                        className="group flex items-center gap-3 rounded-md border border-[var(--border)] bg-white/90 px-3 py-3 shadow-sm transition-all dark:bg-[#1E1E1E]/90"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[#EAF2FF] ring-1 ring-[var(--border)] dark:bg-black/20">
                          {f.avatarUrl ? (
                            <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[13px] font-extrabold text-[#0068FF] dark:text-[#8bb8ff]">
                              {f.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-semibold text-[var(--text)]">{f.displayName}</div>
                          {includePhone && f.phoneNumber && (
                            <div className="mt-0.5 truncate text-[12px] text-[var(--sub-text)]">{f.phoneNumber}</div>
                          )}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); toggleSelect(f.userId); }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--sub-text)] transition-colors hover:bg-red-50 hover:text-red-500 cursor-pointer opacity-80 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                          aria-label={`Bỏ chọn ${f.displayName}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--border)] px-4 py-3.5">
                <button
                  onClick={() => setIncludePhone(p => !p)}
                  className="flex w-full items-center justify-between gap-4 rounded-md border border-[var(--border)] bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-[#F8F9FA] cursor-pointer dark:bg-[#1E1E1E] dark:hover:bg-white/5"
                >
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--text)]">{t('share_contact.include_phone')}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--sub-text)]">Bật để đính kèm số điện thoại trong danh thiếp.</div>
                  </div>
                  <div className={`relative inline-flex h-5 w-10 flex-shrink-0 items-center rounded-full p-0.5 transition-colors ${includePhone ? 'bg-[#0068FF]' : 'bg-[#D0D5DD] dark:bg-white/15'}`}>
                    <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${includePhone ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-white px-4 py-2.5 dark:bg-[#1E1E1E]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[12px] text-[var(--sub-text)]">
                {selectedIds.size > 0
                  ? t('share_contact.will_send', { count: selectedIds.size })
                  : t('share_contact.hint')}
              </div>
              <div className="flex items-center gap-2.5 sm:justify-end">
                <button
                  onClick={onClose}
                  className="rounded-md border border-[var(--border)] bg-[#E9EBED] px-4 py-2.5 text-[13px] font-semibold text-[var(--text)] transition-colors hover:bg-[#DDE0E3] cursor-pointer dark:bg-black/20 dark:hover:bg-white/10"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSend}
                  disabled={selectedIds.size === 0 || sending}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0068FF] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-[#005AE0] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      {t('share_contact.sending')}
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      {t('share_contact.send_btn')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
