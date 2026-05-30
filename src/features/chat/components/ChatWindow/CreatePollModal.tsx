import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SettingsIcon, HelpIcon, ClockIcon } from '@/components/ui/Icons';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    question: string;
    options: string[];
    deadline?: string;
    isPinned?: boolean;
    multipleChoices?: boolean;
    allowAddOptions?: boolean;
    hideResultsBeforeVote?: boolean;
    hideVoters?: boolean;
  }) => void;
}

export function CreatePollModal({ isOpen, onClose, onSubmit }: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [lastAddedIdx, setLastAddedIdx] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Settings states
  const [showSettings, setShowSettings] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [multipleChoices, setMultipleChoices] = useState(true);
  const [allowAddOptions, setAllowAddOptions] = useState(true);
  const [hideResultsBeforeVote, setHideResultsBeforeVote] = useState(false);
  const [hideVoters, setHideVoters] = useState(false);

  useEffect(() => {
    if (lastAddedIdx !== null && inputRefs.current[lastAddedIdx]) {
      inputRefs.current[lastAddedIdx]?.focus();
      setLastAddedIdx(null);
    }
  }, [lastAddedIdx]);

  const handleAddOption = useCallback(() => {
    setOptions(prev => {
      setLastAddedIdx(prev.length);
      return [...prev, ''];
    });
  }, []);

  const handleOptionChange = useCallback((index: number, value: string) => {
    setOptions(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleRemoveOption = useCallback((index: number) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, i) => i !== index));
  }, [options.length]);

  const handleSubmit = useCallback(() => {
    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) return;
    onSubmit({
      question: question.trim(),
      options: validOptions,
      deadline: deadline || undefined,
      isPinned,
      multipleChoices,
      allowAddOptions,
      hideResultsBeforeVote,
      hideVoters,
    });
    setQuestion('');
    setOptions(['', '']);
    setDeadline('');
    setIsPinned(false);
    setMultipleChoices(true);
    setAllowAddOptions(true);
    setHideResultsBeforeVote(false);
    setHideVoters(false);
    setShowSettings(false);
  }, [
    question,
    options,
    onSubmit,
    deadline,
    isPinned,
    multipleChoices,
    allowAddOptions,
    hideResultsBeforeVote,
    hideVoters,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      
      <div className={`relative bg-white dark:bg-[#1E1E1E] w-full transition-all duration-300 rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 ${showSettings ? 'max-w-[800px]' : 'max-w-[480px]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border)]">
          <h3 className="text-[17px] font-bold text-[var(--text)]">Tạo bình chọn</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)] text-[var(--sub-text)] transition-colors cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex divide-x divide-[var(--border)] overflow-hidden">
          {/* Left Side: Basic Info */}
          <div className={`flex-1 p-5 space-y-6 min-w-[400px]`}>
            {/* Question Section */}
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-[var(--text)]">Chủ đề bình chọn</label>
              <div className="relative">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
                  placeholder="Đặt câu hỏi bình chọn"
                  className="w-full h-28 p-3 text-[15px] bg-white dark:bg-black/20 border border-[#0068FF] rounded outline-none resize-none focus:ring-1 focus:ring-[#0068FF]/10 transition-all text-[var(--text)]"
                />
                <div className="absolute bottom-2 right-3 text-[12px] text-[var(--sub-text)] opacity-60">
                  {question.length}/200
                </div>
              </div>
            </div>

            {/* Options Section */}
            <div className="space-y-3">
              <label className="text-[14px] font-semibold text-[var(--text)]">Các lựa chọn</label>
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                {options.map((opt, idx) => (
                  <div key={idx} className="relative group">
                    <input
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Lựa chọn ${idx + 1}`}
                      className="w-full h-11 px-4 pr-10 bg-white dark:bg-black/20 border border-[var(--border)] rounded outline-none focus:border-[#0068FF] transition-all text-[14px] text-[var(--text)]"
                    />
                    {options.length > 2 && (
                      <button 
                        onClick={() => handleRemoveOption(idx)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handleAddOption}
                className="flex items-center gap-2 text-[#0068FF] hover:text-[#005AE0] text-[15px] font-semibold transition-colors cursor-pointer pt-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Thêm lựa chọn
              </button>
            </div>
          </div>

          {/* Right Side: Settings */}
          {showSettings && (
            <div className="w-[320px] p-5 space-y-6 bg-white dark:bg-black/10 animate-in slide-in-from-right-4 duration-300">
              {/* Deadline */}
              <div className="space-y-3">
                <label className="text-[14px] font-semibold text-[var(--text)]">Thời hạn bình chọn</label>
                <div className="relative">
                  <input
                    type="text"
                    value={deadline || 'Không thời hạn'}
                    readOnly
                    className="w-full h-11 px-4 pr-10 bg-white dark:bg-black/20 border border-[var(--border)] rounded outline-none text-[14px] text-[var(--text)] cursor-pointer"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sub-text)]">
                    <ClockIcon size={18} />
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4">
                <label className="text-[14px] font-semibold text-[var(--text)]">Thiết lập nâng cao</label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-[var(--text)]">Ghim lên đầu trò chuyện</span>
                    <button 
                      onClick={() => setIsPinned(!isPinned)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${isPinned ? 'bg-[#0068FF]' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isPinned ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] text-[var(--text)]">Chọn nhiều phương án</span>
                      <HelpIcon size={14} className="text-[var(--sub-text)] opacity-60" />
                    </div>
                    <button 
                      onClick={() => setMultipleChoices(!multipleChoices)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${multipleChoices ? 'bg-[#0068FF]' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${multipleChoices ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] text-[var(--text)]">Có thể thêm phương án</span>
                      <HelpIcon size={14} className="text-[var(--sub-text)] opacity-60" />
                    </div>
                    <button 
                      onClick={() => setAllowAddOptions(!allowAddOptions)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${allowAddOptions ? 'bg-[#0068FF]' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${allowAddOptions ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Anonymous Poll */}
              <div className="space-y-4">
                <label className="text-[14px] font-semibold text-[var(--text)]">Bình chọn ẩn danh</label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] text-[var(--text)]">Ẩn kết quả khi chưa bình chọn</span>
                      <HelpIcon size={14} className="text-[var(--sub-text)] opacity-60" />
                    </div>
                    <button 
                      onClick={() => setHideResultsBeforeVote(!hideResultsBeforeVote)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${hideResultsBeforeVote ? 'bg-[#0068FF]' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${hideResultsBeforeVote ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] text-[var(--text)]">Ẩn người bình chọn</span>
                      <HelpIcon size={14} className="text-[var(--sub-text)] opacity-60" />
                    </div>
                    <button 
                      onClick={() => setHideVoters(!hideVoters)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${hideVoters ? 'bg-[#0068FF]' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${hideVoters ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-white dark:bg-[#1E1E1E]">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors cursor-pointer ${showSettings ? 'bg-blue-50 text-[#0068FF]' : 'hover:bg-[var(--hover-bg)] text-[var(--sub-text)]'}`}
          >
            <SettingsIcon size={22} />
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="h-10 px-8 rounded bg-[#E9EBED] hover:bg-[#DDE0E3] text-[var(--text)] font-semibold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
              className={`h-10 px-6 rounded font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${
                (!question.trim() || options.filter(o => o.trim()).length < 2)
                  ? 'bg-[#B9D5FF] text-white'
                  : 'bg-[#0068FF] hover:bg-[#005AE0] text-white'
              }`}
            >
              Tạo bình chọn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
