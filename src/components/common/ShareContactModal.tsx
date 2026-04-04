import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { friendService } from '@/services/friendService';

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
}

const LABEL_FILTERS = ['Tất cả', 'Khách hàng', 'Gia đình', 'Công việc', 'Bạn bè', 'Trả lời sau'];

export function ShareContactModal({ conversationId, currentUserId, onClose, onSent }: ShareContactModalProps) {
  const { t } = useTranslation();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [includePhone, setIncludePhone] = useState(true);

  // Max contacts allowed
  const MAX = 9;

  useEffect(() => {
    const fetchFriends = async () => {
      setLoading(true);
      try {
        const res = await friendService.getFriends();
        const raw: any[] = Array.isArray(res) ? res : ((res as any)?.data ?? []);
        const mapped: FriendItem[] = raw.map((f: any) => ({
          userId: f.user_id || f.userId || f.id || '',
          displayName: f.display_name || f.displayName || f.fullName || f.name || '',
          phoneNumber: f.phone_number || f.phoneNumber || '',
          avatarUrl: f.avatar_url || f.avatarUrl || '',
        })).filter(f => f.userId && f.userId !== currentUserId);
        setFriends(mapped);
      } catch (e) {
        console.error('Failed to fetch friends:', e);
        toast.error(t('share_contact.error_load'));
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [currentUserId, t]);

  // Sort and group alphabetically
  const filtered = useMemo(() => {
    return friends.filter(f =>
      f.displayName.toLowerCase().includes(search.toLowerCase())
    );
  }, [friends, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, FriendItem[]> = {};
    [...filtered].sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi')).forEach(f => {
      const key = f.displayName.charAt(0).toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    return groups;
  }, [filtered]);

  const selectedFriends = useMemo(() => {
    return friends.filter(f => selectedIds.has(f.userId));
  }, [friends, selectedIds]);

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
        const f = friends.find(x => x.userId === uid)!;
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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card-bg)] w-[620px] max-w-[96vw] h-[580px] max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--border)] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-[#0068FF]/10 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>
              <path d="M4 20c0-2.5 1.8-4 4-4"/>
              <line x1="15" y1="8" x2="21" y2="8"/>
              <line x1="15" y1="12" x2="21" y2="12"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-[var(--text)] leading-tight">{t('share_contact.title')}</h3>
            <p className="text-[12px] text-[var(--sub-text)] opacity-70 leading-tight mt-0.5">
              {t('share_contact.subtitle', { max: MAX })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)] text-[var(--sub-text)] transition-colors cursor-pointer shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── LEFT: Search + filter + list ── */}
          <div className="flex flex-col flex-1 min-w-0">

            {/* Search */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2.5 bg-[var(--hover-bg)] rounded-xl px-3.5 py-2.5 ring-1 ring-transparent focus-within:ring-[#0068FF]/30 focus-within:bg-[var(--card-bg)] transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--sub-text)] opacity-50 shrink-0"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('share_contact.search_placeholder')}
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-[var(--text)] placeholder:text-[var(--sub-text)]/40"
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch('')} className="shrink-0 text-[var(--sub-text)] opacity-50 hover:opacity-100 cursor-pointer transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="px-4 pb-2.5 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              {LABEL_FILTERS.map(label => (
                <button
                  key={label}
                  onClick={() => setActiveFilter(label)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    activeFilter === label
                      ? 'bg-[#0068FF] text-white shadow-sm shadow-blue-200 dark:shadow-none'
                      : 'bg-[var(--hover-bg)] text-[var(--sub-text)] hover:text-[var(--text)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Friend count */}
            {!loading && filtered.length > 0 && (
              <div className="px-4 pb-1.5 shrink-0">
                <span className="text-[11px] text-[var(--sub-text)] opacity-60 font-medium uppercase tracking-wide">
                  {filtered.length} người
                </span>
              </div>
            )}

            {/* Friend list */}
            <div className="flex-1 overflow-y-auto modal-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-8 h-8 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[13px] text-[var(--sub-text)] opacity-60">Đang tải...</span>
                </div>
              ) : Object.keys(grouped).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                  <div className="w-12 h-12 rounded-full bg-[var(--hover-bg)] flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--sub-text)] opacity-50"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                  </div>
                  <span className="text-[13px] text-[var(--sub-text)] opacity-70">{t('share_contact.no_results')}</span>
                </div>
              ) : (
                Object.entries(grouped).map(([letter, items]) => (
                  <div key={letter}>
                    {/* Letter separator */}
                    <div className="px-4 py-1 sticky top-0 z-10 bg-[var(--card-bg)]/95 backdrop-blur-sm">
                      <span className="text-[11px] font-bold text-[var(--sub-text)] opacity-50 uppercase tracking-wider">{letter}</span>
                    </div>
                    {items.map(friend => {
                      const isSelected = selectedIds.has(friend.userId);
                      return (
                        <button
                          key={friend.userId}
                          onClick={() => toggleSelect(friend.userId)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer relative ${
                            isSelected
                              ? 'bg-[#0068FF]/6 dark:bg-[#0068FF]/12'
                              : 'hover:bg-[var(--hover-bg)]'
                          }`}
                        >
                          {/* Checkbox circle */}
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-[#0068FF] border-[#0068FF] scale-110'
                              : 'border-[var(--border)] dark:border-gray-600'
                          }`}>
                            {isSelected && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                          </div>

                          {/* Avatar */}
                          <div className="w-[38px] h-[38px] rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10">
                            {friend.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[#0068FF] font-bold text-[13px]">{friend.displayName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-[13.5px] font-medium text-[var(--text)] truncate leading-snug">{friend.displayName}</div>
                            {friend.phoneNumber && (
                              <div className="text-[11.5px] text-[var(--sub-text)] opacity-60 truncate mt-0.5">{friend.phoneNumber}</div>
                            )}
                          </div>

                          {/* Selected accent */}
                          {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0068FF] rounded-r-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div className="w-px bg-[var(--border)] shrink-0" />

          {/* ── RIGHT: Selected preview ── */}
          <div className="w-[192px] shrink-0 flex flex-col bg-[var(--hover-bg)]/40">
            {/* Panel header */}
            <div className="px-3.5 pt-3.5 pb-2 shrink-0 border-b border-[var(--border)]/60">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold text-[var(--sub-text)] uppercase tracking-wide opacity-70">
                  {t('share_contact.selected_label')}
                </span>
                {selectedIds.size > 0 && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 bg-[#0068FF]/10 text-[#0068FF] rounded-full leading-none">
                    {selectedIds.size}/{MAX}
                  </span>
                )}
              </div>
            </div>

            {/* Selected items */}
            <div className="flex-1 overflow-y-auto modal-scrollbar px-2.5 py-2 flex flex-col gap-1.5">
              {selectedFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40 select-none">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--sub-text)]"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                  <span className="text-[11px] text-[var(--sub-text)] text-center leading-snug">Chưa chọn</span>
                </div>
              ) : (
                selectedFriends.map(f => (
                  <div
                    key={f.userId}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)]/50 shadow-sm group animate-in fade-in slide-in-from-right-1 duration-150"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      {f.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[#0068FF] font-bold text-[10px]">{f.displayName.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11.5px] font-semibold text-[var(--text)] truncate leading-tight">{f.displayName}</div>
                      {includePhone && f.phoneNumber && (
                        <div className="text-[10px] text-[var(--sub-text)] opacity-60 truncate">{f.phoneNumber}</div>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); toggleSelect(f.userId); }}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[var(--sub-text)] opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-500 shrink-0 cursor-pointer transition-all"
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Include phone toggle */}
            <div className="px-3.5 py-3 border-t border-[var(--border)]/60 shrink-0">
              <button
                onClick={() => setIncludePhone(p => !p)}
                className="flex items-center gap-2.5 w-full cursor-pointer group"
              >
                {/* Toggle pill */}
                <div className={`w-8 h-4.5 rounded-full relative transition-colors shrink-0 flex items-center ${includePhone ? 'bg-[#0068FF]' : 'bg-gray-300 dark:bg-gray-600'}`}
                  style={{ height: '18px' }}>
                  <div className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-all top-[2px] ${includePhone ? 'left-[18px]' : 'left-[2px]'}`} />
                </div>
                <span className="text-[12px] text-[var(--sub-text)] group-hover:text-[var(--text)] transition-colors leading-tight">
                  {t('share_contact.include_phone')}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--border)] shrink-0 bg-[var(--hover-bg)]/30">
          <span className="text-[12px] text-[var(--sub-text)] opacity-60">
            {selectedIds.size > 0
              ? t('share_contact.will_send', { count: selectedIds.size })
              : t('share_contact.hint')}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13.5px] font-medium text-[var(--sub-text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSend}
              disabled={selectedIds.size === 0 || sending}
              className="px-5 py-2 rounded-lg text-[13.5px] font-semibold text-white bg-[#0068FF] hover:bg-[#0052CC] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm shadow-blue-200 dark:shadow-none"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  {t('share_contact.sending')}
                </span>
              ) : t('share_contact.send_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
