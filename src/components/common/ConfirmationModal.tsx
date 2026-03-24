import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  isDanger?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  isDanger = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[1px] animate-in fade-in duration-200">
      <div 
        className="bg-[var(--card-bg)] w-full max-w-[340px] rounded-xl shadow-2xl border border-[var(--border)] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2 text-center">
          <h3 className="text-[18px] font-bold text-[var(--text)]">{title}</h3>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 text-center">
          <p className="text-[14.5px] text-[var(--sub-text)] leading-relaxed font-medium">
            {message}
          </p>
        </div>

        {/* Actions - iOS/Zalo style */}
        <div className="flex border-t border-[var(--border)]">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-[16px] font-medium text-[var(--sub-text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <div className="w-[1px] bg-[var(--border)]"></div>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 text-[16px] font-bold transition-colors cursor-pointer ${
              isDanger ? 'text-[#FF3B30] hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-[#0068FF] hover:bg-blue-50 dark:hover:bg-blue-500/10'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
