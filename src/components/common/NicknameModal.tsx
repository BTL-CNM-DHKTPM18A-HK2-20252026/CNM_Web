import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface NicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  avatar?: string;
  onConfirm: (newName: string) => void;
}

export function NicknameModal({ isOpen, onClose, currentName, avatar, onConfirm }: NicknameModalProps) {
  const [nickname, setNickname] = useState(currentName);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setNickname(currentName);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-[var(--card-bg)] w-[400px] rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-[var(--text)]">Đặt tên gợi nhớ</h3>
          <button onClick={onClose} className="text-[var(--sub-text)] hover:text-[var(--text)] transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-md mb-4 bg-gray-100 italic flex items-center justify-center overflow-hidden">
             {avatar ? (
                <img src={avatar} alt={currentName} className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                    {currentName.charAt(0)}
                </div>
             )}
          </div>

          <div className="text-center mb-6">
            <p className="text-[14px] text-[var(--text)] mb-1">
              Hãy đặt cho <span className="font-bold">{currentName}</span> một cái tên dễ nhớ.
            </p>
            <p className="text-[13px] text-[var(--sub-text)]">
              Lưu ý: Tên gợi nhớ sẽ chỉ hiển thị riêng với bạn.
            </p>
          </div>

          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full h-10 px-3 bg-[var(--card-bg)] border border-[#0068FF] rounded-md text-[14px] focus:outline-none shadow-[0_0_0_1px_rgba(0,104,255,0.1)] mb-6"
            placeholder="Nhập tên gợi nhớ"
            autoFocus
            onFocus={(e) => e.target.select()}
          />

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-md bg-[#EAEDF0] text-[#081C36] font-bold text-[14px] hover:bg-[#dfe2e7] transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                onConfirm(nickname);
                onClose();
              }}
              className="px-6 py-2 rounded-md bg-[#0068FF] text-white font-semibold text-[14px] hover:bg-[#005AE0] transition-colors cursor-pointer"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
