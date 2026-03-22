'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const SearchIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

const UsersIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');

  if (!isOpen) return null;

  const suggestions = [
    { id: 1, name: 'Áo Cưới Trang Đài', avatar: 'https://picsum.photos/id/64/40/40' },
    { id: 2, name: 'Bình Nhii', avatar: 'https://picsum.photos/id/65/40/40' },
    { id: 3, name: 'Bùi Đình Nghị', avatar: 'https://picsum.photos/id/66/40/40' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="w-full max-w-[400px] bg-[var(--card-bg)] rounded-md shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-[48px] border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--card-bg)] shrink-0">
          <h2 className="text-[17px] font-bold text-[var(--text)]">Thêm bạn</h2>
          <button onClick={onClose} className="text-[var(--text)] hover:bg-[var(--hover-bg)] p-1 rounded-full transition-all cursor-pointer">
            <XIcon size={24} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {/* Phone Input Area */}
          <div className="flex items-center gap-3 border-b border-[#0068FF] pb-1.5 focus-within:border-b-2 transition-all">
            <div className="flex items-center gap-1.5 px-1 cursor-pointer hover:bg-[var(--hover-bg)] rounded transition-colors group">
              <span className="w-6 h-4 rounded-sm overflow-hidden flex-shrink-0 border border-gray-200">
                <svg viewBox="0 0 30 20" className="w-full h-full object-cover">
                  <rect width="30" height="20" fill="#da251d"/>
                  <polygon fill="#ff0" points="15 4 16.176 7.618 20 7.618 16.912 9.882 18.088 13.5 15 11.236 11.912 13.5 13.088 9.882 10 7.618 13.824 7.618"/>
                </svg>
              </span>
              <span className="text-[15px] font-medium text-[var(--text)]">(+84)</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-400 group-hover:text-[var(--text)] transition-colors"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <input 
              type="text" 
              placeholder="Số điện thoại"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[16px] text-[var(--text)] placeholder:text-[var(--sub-text)] font-medium"
            />
          </div>

          {/* Suggestions Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[14px] text-[var(--sub-text)] font-medium opacity-80">
              <UsersIcon size={18} />
              <span>Có thể bạn quen</span>
            </div>

            <div className="space-y-3">
              {suggestions.map(user => (
                <div key={user.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-black/5 bg-gray-100">
                      <Image src={user.avatar} width={48} height={48} alt={user.name} className="object-cover" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-[var(--text)]">{user.name}</h4>
                      <p className="text-[12px] text-[var(--sub-text)]">Từ gợi ý kết bạn</p>
                    </div>
                  </div>
                  <button className="px-4 py-1.5 bg-[#E7F2FF] hover:bg-[#D1E6FF] dark:bg-[#0068FF]/20 dark:hover:bg-[#0068FF]/30 text-[#0068FF] font-bold rounded-[3px] text-[13px] transition-all cursor-pointer">
                    Kết bạn
                  </button>
                </div>
              ))}
            </div>

            <button className="text-[14px] font-bold text-[#0068FF] mt-1 hover:underline cursor-pointer">
              Xem thêm
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--card-bg)] shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-1.5 bg-[var(--hover-bg)] hover:opacity-80 text-[var(--text)] font-bold rounded-[3px] text-[15px] transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button 
            disabled={phoneNumber.length < 9}
            className={`px-5 py-1.5 font-bold rounded-[3px] text-[15px] transition-all ${
              phoneNumber.length >= 9 
                ? 'bg-[#0068FF] text-white hover:bg-[#0057d1] cursor-pointer' 
                : 'bg-[#0068FF]/30 text-white/50 cursor-default'
            }`}
          >
            Tìm kiếm
          </button>
        </div>
      </div>
    </div>
  );
}
