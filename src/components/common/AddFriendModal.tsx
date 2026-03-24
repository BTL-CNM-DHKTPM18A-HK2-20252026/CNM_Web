'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { userService, UserResponse } from '@/services/userService';
import { friendService } from '@/services/friendService';
import { toast } from 'sonner';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName?: string;
}

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const UsersIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ChevronDownIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const BackIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);

const EditIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export function AddFriendModal({ isOpen, onClose, currentUserName }: AddFriendModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchResult, setSearchResult] = useState<UserResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Step 2 states
  const [requestMsg, setRequestMsg] = useState('');
  const [blockDiary, setBlockDiary] = useState(false);

  React.useEffect(() => {
    if (isOpen && !requestMsg) {
       setRequestMsg(`Xin chào, mình là ${currentUserName || 'người quen'}. Kết bạn với mình nhé!`);
    }
  }, [isOpen, currentUserName]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!phoneNumber.trim() || phoneNumber.length < 9) return;
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      let query = phoneNumber.trim();
      let result = await userService.getUserByPhone(encodeURIComponent(query));
      
      if (!result && query.startsWith('0')) {
        const altQuery = '+84' + query.substring(1);
        try {
          result = await userService.getUserByPhone(encodeURIComponent(altQuery));
        } catch (e) {}
      } 
      else if (!result && query.startsWith('+84')) {
        const altQuery = '0' + query.substring(3);
        try {
          result = await userService.getUserByPhone(encodeURIComponent(altQuery));
        } catch (e) {}
      }

      if (result && result.user_id) {
        setSearchResult(result);
      } else {
        setSearchError("Không tìm thấy người dùng");
      }
    } catch (err: any) {
      setSearchError(err.message || "Không tìm thấy người dùng");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;
    try {
      await friendService.sendRequest(searchResult.user_id);
      toast.success("Đã gửi lời mời kết bạn!");
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Gửi lời mời thất bại");
    }
  };

  const handleClose = () => {
    setPhoneNumber('');
    setSearchResult(null);
    setSearchError(null);
    setStep(1);
    setRequestMsg('Xin chào, mình là người quen...');
    setBlockDiary(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-300" onClick={handleClose} />
      
      <div className={`w-full max-w-[400px] ${step === 1 ? 'min-h-[460px]' : ''} bg-[var(--card-bg)] rounded-md shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="h-[48px] border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--card-bg)] shrink-0">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button 
                onClick={() => setStep(1)} 
                className="p-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors cursor-pointer"
              >
                <BackIcon />
              </button>
            )}
            <h2 className="text-[16px] font-bold text-[var(--text)]">
              {step === 1 ? "Thêm bạn" : "Thông tin tài khoản"}
            </h2>
          </div>
          <button onClick={handleClose} className="text-[var(--text)] hover:bg-[var(--hover-bg)] p-1 rounded-full transition-all cursor-pointer">
            <XIcon size={22} />
          </button>
        </div>

        {step === 1 ? (
          <>
            <div className="p-5 flex flex-col gap-6 flex-1">
              {/* Phone Input Area */}
              <div className="flex items-center gap-3 border-b border-[var(--border)] pb-1.5 focus-within:border-[#0068FF] focus-within:border-b-2 transition-all">
                <div className="flex items-center gap-1.5 px-1 cursor-pointer hover:bg-[var(--hover-bg)] rounded transition-colors group">
                  <span className="w-6 h-4 rounded-sm overflow-hidden flex-shrink-0 border border-gray-200">
                    <svg viewBox="0 0 30 20" className="w-full h-full object-cover">
                      <rect width="30" height="20" fill="#da251d"/>
                      <polygon fill="#ff0" points="15 4 16.176 7.618 20 7.618 16.912 9.882 18.088 13.5 15 11.236 11.912 13.5 13.088 9.882 10 7.618 13.824 7.618"/>
                    </svg>
                  </span>
                  <span className="text-[15px] font-medium text-[var(--text)]">(+84)</span>
                  <span className="text-gray-400 group-hover:text-[var(--text)] transition-colors"><ChevronDownIcon size={12} /></span>
                </div>
                <input 
                  type="text" 
                  placeholder="Số điện thoại"
                  value={phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val)) setPhoneNumber(val);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 bg-transparent border-none outline-none text-[16px] text-[var(--text)] placeholder:text-[var(--sub-text)] font-medium"
                  autoFocus
                />
              </div>

              {/* Search Result Section */}
              {(searchResult || isSearching || searchError) && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-[13px] font-bold text-[var(--sub-text)] opacity-70">Kết quả gần nhất</h3>
                  {isSearching ? (
                    <div className="flex items-center gap-3 py-2 text-[var(--sub-text)]">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[14px]">Đang tìm kiếm...</span>
                    </div>
                  ) : searchError ? (
                    <div className="py-2 text-[14px] text-red-500 italic">{searchError}</div>
                  ) : searchResult ? (
                    <div className="bg-transparent border border-[var(--border)] rounded-lg p-3 flex items-center justify-between hover:bg-[var(--hover-bg)] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-black/5 bg-blue-50 flex items-center justify-center">
                          {searchResult.avatar_url ? (
                            <Image src={searchResult.avatar_url} alt={searchResult.display_name} width={48} height={48} className="object-cover" />
                          ) : (
                            <span className="text-blue-600 font-bold text-lg">{searchResult.display_name?.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[15px] font-bold text-[var(--text)]">{searchResult.display_name}</span>
                          <span className="text-[12px] text-[var(--sub-text)]">{searchResult.phone_number}</span>
                        </div>
                      </div>
                      
                      {searchResult.friendship_status === 'ACCEPTED' ? (
                         <span className="text-[13px] font-bold text-green-500 px-3 py-1 bg-green-50 rounded-md">Bạn bè</span>
                      ) : (
                        <button 
                          onClick={() => setStep(2)}
                          className="px-4 py-1.5 bg-[#0068FF] hover:bg-[#005AE0] text-white font-bold rounded-md text-[13px] transition-all cursor-pointer"
                        >
                          Kết bạn
                        </button>
                      )}
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
                disabled={phoneNumber.length < 9 || isSearching}
                className={`px-6 py-2 font-bold rounded-[3px] text-[15px] transition-all ${
                  phoneNumber.length >= 9 && !isSearching
                    ? 'bg-[#0068FF] text-white hover:bg-[#0057d1] cursor-pointer' 
                    : 'bg-[#0068FF]/30 text-white/50 cursor-default'
                }`}
              >
                {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-300">
            {/* Visual Header / Cover */}
            <div className="relative h-32 bg-gray-200 shrink-0">
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
                  <div className="relative">
                    <textarea 
                       value={requestMsg}
                       onChange={(e) => setRequestMsg(e.target.value.substring(0, 150))}
                       className="w-full h-24 p-3 bg-transparent border border-[var(--border)] rounded-md outline-none focus:border-[#0068FF] text-[14px] resize-none transition-all"
                       placeholder="Nhập lời nhắn kết bạn"
                    />
                    <span className="absolute bottom-2 right-3 text-[11px] text-[var(--sub-text)]">
                       {requestMsg.length}/150 ký tự
                    </span>
                  </div>

                  <div 
                    onClick={() => setBlockDiary(!blockDiary)}
                    className="flex items-center justify-between bg-[var(--hover-bg)] p-3 rounded-lg group cursor-pointer active:opacity-80 transition-opacity"
                  >
                     <span className="text-[14px] font-medium text-[var(--text)] opacity-80">Chặn người này xem nhật ký của tôi</span>
                     <button 
                        onClick={() => setBlockDiary(!blockDiary)}
                        className={`w-10 h-5 rounded-full transition-all relative ${blockDiary ? 'bg-[#0068FF]' : 'bg-gray-300'}`}
                     >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${blockDiary ? 'right-1' : 'left-1'}`}></div>
                     </button>
                  </div>
               </div>
            </div>

            <div className="mt-auto p-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--card-bg)] shrink-0">
              <button 
                className="flex-1 py-2.5 bg-[#E9EBED] hover:bg-[#D8DADF] text-[var(--text)] font-bold rounded-md text-[14px] transition-all cursor-pointer"
              >
                Thông tin
              </button>
              <button 
                onClick={handleSendRequest}
                className="flex-1 py-2.5 bg-[#0068FF] hover:bg-[#005AE0] text-white font-bold rounded-md text-[14px] transition-all cursor-pointer shadow-md"
              >
                Kết bạn
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
