'use client';

import React from 'react';

interface SessionKickModalProps {
  isOpen: boolean;
  onReactivate: () => void;
}

/**
 * Zalo-style session kick modal.
 * Hiển thị khi tài khoản đã mở ở tab/thiết bị khác.
 * Nút "Kích hoạt" → reconnect lại WebSocket trên tab hiện tại.
 */
export const SessionKickModal: React.FC<SessionKickModalProps> = ({
  isOpen,
  onReactivate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-[#8B8B8B]/80">
      <div className="bg-white w-full max-w-120 rounded-lg shadow-xl overflow-hidden">
        {/* Content */}
        <div className="px-6 pt-6 pb-4">
          <p className="text-[15px] font-semibold text-[#333] leading-relaxed">
            Bạn đang mở Fruvia trên một Tab khác hoặc không sử dụng Fruvia quá
            lâu
          </p>
          <p className="text-[13.5px] text-[#666] mt-2">
            Nhấn kích hoạt để sử dụng trên Tab này
          </p>
        </div>

        {/* Action */}
        <div className="px-6 pb-5 flex justify-end">
          <button
            onClick={onReactivate}
            className="px-6 py-2 bg-[#0068FF] text-white text-[14px] font-semibold rounded-md hover:bg-[#0055D4] active:bg-[#004ABB] transition-colors cursor-pointer"
          >
            Kích hoạt
          </button>
        </div>
      </div>
    </div>
  );
};
