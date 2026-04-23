import React, { useState, useCallback } from 'react';
import { ClockIcon, ChevronDownIcon } from '@/components/ui/Icons';
import { DatePickerPopover } from './DatePickerPopover';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface CreateReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { content: string; time: string; repeat: string }) => void;
}

export function CreateReminderModal({ isOpen, onClose, onSubmit }: CreateReminderModalProps) {
  const [content, setContent] = useState('');
  const [selectedTime, setSelectedTime] = useState('30 phút nữa');
  const [reminderDate, setReminderDate] = useState(new Date());
  const [repeatType, setRepeatType] = useState('Không lặp lại');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const timeOptions = ['15 phút nữa', '30 phút nữa', '9:00 ngày mai', 'Khác'];

  const handleDateSelect = (date: Date) => {
    setReminderDate(date);
    // Note: In a real app we'd keep isDatePickerOpen true for time selection, 
    // but here we can close it if needed or let the user close manually.
  };

  const formattedDateDisplay = format(reminderDate, "'Hôm nay lúc' HH:mm", { locale: vi });
  // In real case we check if it's today/tomorrow
  const getDisplayDate = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return format(date, "'Hôm nay lúc' HH:mm", { locale: vi });
    }
    return format(date, "dd/MM/yyyy 'lúc' HH:mm", { locale: vi });
  };

  const handleSubmit = useCallback(() => {
    if (!content.trim()) return;
    onSubmit({ content: content.trim(), time: selectedTime, repeat: repeatType });
    setContent('');
  }, [content, selectedTime, repeatType, onSubmit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#1E1E1E] w-full max-w-[480px] rounded-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border)]">
          <h3 className="text-[17px] font-bold text-[var(--text)]">Tạo nhắc hẹn</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)] text-[var(--sub-text)] transition-colors cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Content Section */}
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-[var(--text)]">Nhập nội dung</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung mới hoặc dán link"
              className="w-full h-32 p-3 text-[15px] bg-white dark:bg-black/20 border border-[#0068FF] rounded outline-none resize-none focus:ring-1 focus:ring-[#0068FF]/10 transition-all text-[var(--text)]"
            />
          </div>

          {/* Time Options */}
          <div className="space-y-3">
            <label className="text-[14px] font-semibold text-[var(--text)]">Chọn thời gian</label>
            <div className="flex flex-wrap gap-2">
              {timeOptions.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`h-9 px-4 rounded-full text-[14px] font-medium transition-all cursor-pointer ${selectedTime === time
                      ? 'bg-[#E5EFFF] text-[#0068FF] border border-[#0068FF]/20'
                      : 'bg-[#E9EBED] text-[var(--text)] hover:bg-[#DDE0E3]'
                    }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-2 relative">
            <label className="text-[14px] font-semibold text-[var(--text)]">Chọn ngày nhắc hẹn</label>
            <div
              className="relative cursor-pointer"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            >
              <input
                type="text"
                value={getDisplayDate(reminderDate)}
                readOnly
                className="w-full h-11 px-4 pr-10 bg-white dark:bg-black/20 border border-[var(--border)] rounded outline-none text-[14px] text-[var(--text)] cursor-pointer"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sub-text)] pointer-events-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              </div>
            </div>

            {isDatePickerOpen && (
              <>
                <div className="fixed inset-0 z-[105]" onClick={() => setIsDatePickerOpen(false)} />
                <DatePickerPopover
                  initialDate={reminderDate}
                  onSelect={handleDateSelect}
                  onClose={() => setIsDatePickerOpen(false)}
                />
              </>
            )}
          </div>

          {/* Repeat Section */}
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-[var(--text)]">Chọn kiểu lặp lại (vd: Lặp lại hàng tuần)</label>
            <div className="relative">
              <select
                value={repeatType}
                onChange={(e) => setRepeatType(e.target.value)}
                className="w-full h-11 px-4 bg-white dark:bg-black/20 border border-[var(--border)] rounded outline-none text-[14px] text-[var(--text)] appearance-none cursor-pointer pr-10"
              >
                <option>Không lặp lại</option>
                <option>Hàng ngày</option>
                <option>Hàng tuần</option>
                <option>Hàng tháng</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sub-text)] pointer-events-none">
                <ChevronDownIcon size={18} />
              </div>
            </div>
          </div>
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
            className={`h-10 px-6 rounded font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${content.trim()
                ? 'bg-[#0068FF] text-white hover:bg-[#005AE0]'
                : 'bg-[#B9D5FF] text-white'
              }`}
          >
            Tạo nhắc hẹn
          </button>
        </div>
      </div>
    </div>
  );
}
