'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { apiClient } from '@/lib/http/apiClient';
import { userService } from '@/features/user';
import { friendService } from '@/features/friends';
import { toast } from 'sonner';

const S3_BASE = process.env.NEXT_PUBLIC_S3_BASE_URL ?? '';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName?: string;
  currentUserId?: string;
  initialPhoneNumber?: string;
  initialUser?: AddFriendTarget | null;
}

interface AddFriendTarget {
  user_id: string;
  phone_number?: string;
  display_name?: string;
  avatar_url?: string;
  friendship_status?: string;
  cover_photo_url?: string;
  bio?: string;
  gender?: string;
  dob?: string;
}

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const UsersIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BackIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const EditIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export function AddFriendModal({
  isOpen,
  onClose,
  currentUserName,
  currentUserId,
  initialPhoneNumber,
  initialUser,
}: AddFriendModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<AddFriendTarget | null>(null);
  const [searchResults, setSearchResults] = useState<AddFriendTarget[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Step 2 states
  const [requestMsg, setRequestMsg] = useState('');
  const [blockDiary, setBlockDiary] = useState(false);
  const [detailUser, setDetailUser] = useState<AddFriendTarget | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchUserDetail = async (userId: string) => {
    setIsLoadingDetail(true);
    try {
      const data: any = await apiClient.get(`/users/${userId}`).catch(() => null);
      if (data?.user_id || data?.userId) {
        setDetailUser({
          user_id: data.user_id || data.userId,
          display_name: data.display_name || data.displayName,
          avatar_url: data.avatar_url || data.avatarUrl,
          phone_number: data.phone_number || data.phoneNumber,
          friendship_status: data.friendship_status || data.friendshipStatus,
          cover_photo_url: data.cover_photo_url || data.coverPhotoUrl,
          bio: data.bio,
          gender: data.gender,
          dob: data.dob,
        });
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && !requestMsg) {
      setRequestMsg(t('addFriend.default_message', { name: currentUserName || '...' }));
    }
  }, [isOpen, currentUserName]);

  React.useEffect(() => {
    if (!isOpen) return;

    if (initialPhoneNumber) {
      setSearchQuery(initialPhoneNumber);
    }

    if (initialUser?.user_id) {
      setSearchError(null);
      setSearchResult(initialUser);
      setSearchResults([initialUser]);
      setStep(2);
      fetchUserDetail(initialUser.user_id);
    }
  }, [isOpen, initialPhoneNumber, initialUser]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query || query.length < 2) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);
    setSearchResults([]);

    try {
      const collected: AddFriendTarget[] = [];

      // 1. Try Elasticsearch search
      const esData = await apiClient
        .get(`/search/users?q=${encodeURIComponent(query)}&size=10`)
        .catch(() => null);

      const content = esData?.content || (Array.isArray(esData) ? esData : []);
      if (Array.isArray(content) && content.length > 0) {
        type EsDoc = { userId?: string; displayName?: string; avatarUrl?: string; friendshipStatus?: string; document?: EsDoc };
        for (const raw of content as EsDoc[]) {
          const doc: EsDoc = raw?.document ?? raw;
          if (doc?.userId) {
            collected.push({
              user_id: doc.userId,
              display_name: doc.displayName,
              avatar_url: doc.avatarUrl,
              friendship_status: doc.friendshipStatus,
            });
          }
        }
      }

      // 2. Fallback: exact phone number lookup
      if (collected.length === 0) {
        const phoneRegex = /^(0|\+84)[0-9]{9}$/;
        if (phoneRegex.test(query)) {
          const byPhone = await userService.getUserByPhone(query).catch(() => null);
          if (byPhone?.user_id) {
            collected.push({
              user_id: byPhone.user_id,
              phone_number: byPhone.phone_number,
              display_name: byPhone.display_name,
              avatar_url: byPhone.avatar_url,
              friendship_status: byPhone.friendship_status,
            });
          }
        }
      }

      // Filter out self
      const filtered = currentUserId
        ? collected.filter((u) => u.user_id !== currentUserId)
        : collected;

      if (filtered.length > 0) {
        setSearchResults(filtered);
      } else {
        setSearchError(t('addFriend.not_found'));
      }
    } catch (err: any) {
      setSearchError(err.message || t('addFriend.not_found'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;
    try {
      await friendService.sendRequest(searchResult.user_id, requestMsg);
      toast.success(t('addFriend.send_success'));
      handleClose();
    } catch (err: any) {
      toast.error(err.message || t('addFriend.send_error'));
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResult(null);
    setSearchResults([]);
    setSearchError(null);
    setStep(1);
    setRequestMsg(t('addFriend.default_message', { name: '...' }));
    setBlockDiary(false);
    setDetailUser(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-300" onClick={handleClose} />

      <div className={`w-full max-w-[400px] ${step === 1 ? 'min-h-[460px]' : ''} bg-[var(--card-bg)] rounded-md shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="h-[48px] border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--card-bg)] shrink-0">
          <div className="flex items-center gap-2">
            {(step === 2 || step === 3) && (
              <button
                onClick={() => step === 3 ? setStep(2) : setStep(1)}
                className="p-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors cursor-pointer"
              >
                <BackIcon />
              </button>
            )}
            <h2 className="text-[16px] font-bold text-[var(--text)]">
              {step === 1 ? t('addFriend.title') : step === 3 ? t('addFriend.profile_detail', 'Trang cá nhân') : t('addFriend.account_info')}
            </h2>
          </div>
          <button onClick={handleClose} className="text-[var(--text)] hover:bg-[var(--hover-bg)] p-1 rounded-full transition-all cursor-pointer">
            <XIcon size={22} />
          </button>
        </div>

        {step === 1 ? (
          <>
            <div className="p-5 flex flex-col gap-6 flex-1">
              {/* Search Input Area */}
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-1.5 focus-within:border-[#0068FF] focus-within:border-b-2 transition-all">
                <input
                  type="text"
                  placeholder={t('addFriend.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 bg-transparent border-none outline-none text-[16px] text-[var(--text)] placeholder:text-[var(--sub-text)] font-medium"
                  autoFocus
                />
              </div>

              {/* Search Result Section */}
              {(searchResults.length > 0 || isSearching || searchError) && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-[13px] font-bold text-[var(--sub-text)] opacity-70">{t('addFriend.recent_results')}</h3>
                  {isSearching ? (
                    <div className="flex items-center gap-3 py-2 text-[var(--sub-text)]">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[14px]">{t('addFriend.searching')}</span>
                    </div>
                  ) : searchError ? (
                    <div className="py-2 text-[14px] text-red-500 italic">{searchError}</div>
                  ) : searchResults.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                      {searchResults.map((result) => (
                        <div key={result.user_id} className="bg-transparent border border-[var(--border)] rounded-lg p-3 flex items-center justify-between hover:bg-[var(--hover-bg)] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-black/5 bg-blue-50 flex items-center justify-center shrink-0">
                              {result.avatar_url ? (
                                <Image src={result.avatar_url} alt={result.display_name || 'Avatar'} width={48} height={48} className="object-cover" />
                              ) : (
                                <span className="text-blue-600 font-bold text-lg">{result.display_name?.charAt(0)}</span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[15px] font-bold text-[var(--text)]">{result.display_name}</span>
                              <span className="text-[12px] text-[var(--sub-text)]">{result.phone_number}</span>
                            </div>
                          </div>

                          {result.friendship_status === 'ACCEPTED' ? (
                            <span className="text-[13px] font-bold text-green-500 px-3 py-1 bg-green-50 rounded-md shrink-0">{t('addFriend.status.friend')}</span>
                          ) : (
                            <button
                              onClick={() => { setSearchResult(result); setStep(2); fetchUserDetail(result.user_id); }}
                              className="px-4 py-1.5 bg-[#0068FF] hover:bg-[#005AE0] text-white font-bold rounded-md text-[13px] transition-all cursor-pointer shrink-0"
                            >
                              {t('addFriend.add_btn')}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--card-bg)] shrink-0">
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-[#E9EBED] hover:bg-[#D8DADF] text-[var(--text)] font-bold rounded-[3px] text-[15px] transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSearch}
                disabled={searchQuery.trim().length < 2 || isSearching}
                className={`px-6 py-2 font-bold rounded-[3px] text-[15px] transition-all ${searchQuery.trim().length >= 2 && !isSearching
                  ? 'bg-[#0068FF] text-white hover:bg-[#0057d1] cursor-pointer'
                  : 'bg-[#0068FF]/30 text-white/50 cursor-default'
                  }`}
              >
                {isSearching ? t('addFriend.searching') : t('addFriend.search_btn')}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-300">
            {/* Visual Header / Cover */}
            <div className="relative h-32 bg-gray-200 shrink-0 overflow-hidden">
              {isLoadingDetail ? (
                <div className="absolute inset-0 animate-pulse bg-gray-300" />
              ) : (
                <Image
                  src={(detailUser?.cover_photo_url) || (() => { const uid = searchResult?.user_id || ''; const s = uid.split('').reduce((a,c)=>a+c.charCodeAt(0),0); return `${S3_BASE}/background/image${(s%3)+1}.jpg`; })()}
                  alt="Cover"
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent"></div>
            </div>

            <div className="px-5 pb-6 -mt-10 relative">
              <div className="flex items-end gap-4 mb-4">
                <div className="w-24 h-24 rounded-full border-4 border-[var(--card-bg)] overflow-hidden shadow-md bg-white shrink-0">
                  {searchResult?.avatar_url ? (
                    <Image src={searchResult.avatar_url} alt="Avatar" width={96} height={96} className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-[#0068FF] text-3xl font-bold">
                      {searchResult?.display_name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col pb-1">
                  <h3 className="text-[18px] font-bold text-[var(--text)]">{searchResult?.display_name}</h3>
                </div>
              </div>

              <div className="space-y-5">
                {searchResult?.friendship_status !== 'ACCEPTED' && (
                  <>
                    <div className="relative">
                      <textarea
                        value={requestMsg}
                        onChange={(e) => setRequestMsg(e.target.value.substring(0, 150))}
                        className="w-full h-24 p-3 bg-transparent border border-[var(--border)] rounded-md outline-none focus:border-[#0068FF] text-[14px] resize-none transition-all"
                        placeholder={t('addFriend.message_placeholder')}
                      />
                      <span className="absolute bottom-2 right-3 text-[11px] text-[var(--sub-text)]">
                        {requestMsg.length}/150 {t('addFriend.char_count')}
                      </span>
                    </div>

                    <div
                      onClick={() => setBlockDiary(!blockDiary)}
                      className="flex items-center justify-between bg-[var(--hover-bg)] p-3 rounded-lg group cursor-pointer active:opacity-80 transition-opacity"
                    >
                      <span className="text-[14px] font-medium text-[var(--text)] opacity-80">{t('addFriend.block_diary')}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setBlockDiary(!blockDiary); }}
                        className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${blockDiary ? 'bg-[#0068FF]' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${blockDiary ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </>
                )}

                {searchResult?.friendship_status === 'ACCEPTED' && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <span className="text-green-600 font-bold text-[14px]">✓ {t('addFriend.status.friend', 'Bạn bè')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto p-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--card-bg)] shrink-0">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 bg-[#E9EBED] hover:bg-[#D8DADF] text-[var(--text)] font-bold rounded-md text-[14px] transition-all cursor-pointer"
              >
                {t('addFriend.info_btn')}
              </button>
              {searchResult?.friendship_status !== 'ACCEPTED' && (
                <button
                  onClick={handleSendRequest}
                  className="flex-1 py-2.5 bg-[#0068FF] hover:bg-[#005AE0] text-white font-bold rounded-md text-[14px] transition-all cursor-pointer shadow-md"
                >
                  {t('addFriend.add_btn')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
