import React, { useState, useCallback } from 'react';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { content: string; pin: boolean }) => void;
}

export function CreateNoteModal({ isOpen, onClose, onSubmit }: CreateNoteModalProps) {
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!content.trim() || content.length > 300) return;
    onSubmit({ content: content.trim(), pin: isPinned });
    setContent('');
    setIsPinned(false);
  }, [content, isPinned, onSubmit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#1E1E1E] w-full max-w-[400px] rounded-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)]">
          <h3 className="text-[16px] font-bold text-[var(--text)]">Tạo ghi chú</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)] text-[var(--sub-text)] transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[13px] font-semibold text-[var(--text)]">Nội dung</label>
              <span className={`text-[11px] ${content.length >= 300 ? 'text-red-500 font-bold' : 'text-[var(--sub-text)]'}`}>
                {content.length}/300
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 300))}
              placeholder="Nhập nội dung mới hoặc dán link"
              maxLength={300}
              className="w-full h-32 p-3 text-[14px] bg-white dark:bg-black/20 border border-[#0068FF] rounded outline-none resize-none focus:ring-1 focus:ring-[#0068FF]/10 transition-all text-[var(--text)]"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer group py-1">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-[var(--border)] bg-white dark:bg-black/20 transition-all checked:bg-[#0068FF] checked:border-[#0068FF]"
              />
              <svg
                className="absolute h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-[14px] text-[var(--text)] group-hover:text-[#0068FF] transition-colors">
              Ghim lên đầu trò chuyện
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-white dark:bg-[#1E1E1E]">
          <button 
            onClick={onClose}
            className="h-10 px-8 rounded bg-[#E9EBED] hover:bg-[#DDE0E3] text-[var(--text)] font-semibold transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!content.trim()}
            className={`h-10 px-6 rounded font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${
              content.trim() 
                ? 'bg-[#0068FF] text-white hover:bg-[#005AE0]' 
                : 'bg-[#B9D5FF] text-white'
            }`}
          >
            Tạo ghi chú
          </button>
        </div>
      </div>
    </div>
  );
}
