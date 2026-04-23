import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/Icons';

interface DatePickerPopoverProps {
  onSelect: (date: Date) => void;
  onClose: () => void;
  initialDate?: Date;
}

export function DatePickerPopover({ onSelect, onClose, initialDate = new Date() }: DatePickerPopoverProps) {
  const [currentViewDate, setCurrentViewDate] = useState(new Date(initialDate));
  const [selectedDate, setSelectedDate] = useState(new Date(initialDate));
  const [timeStr, setTimeStr] = useState(`${String(initialDate.getHours()).padStart(2, '0')}:${String(initialDate.getMinutes()).padStart(2, '0')}`);

  const month = currentViewDate.getMonth();
  const year = currentViewDate.getFullYear();

  const daysInMonth = useMemo(() => {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const startDayOfWeek = startOfMonth.getDay(); // 0 is Sunday
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, month: month - 1, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      days.push({ day: i, month, isCurrentMonth: true });
    }
    
    // Next month days
    const totalDaysSoFar = days.length;
    const remainingDays = 42 - totalDaysSoFar; // 6 rows
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, month: month + 1, isCurrentMonth: false });
    }
    
    return days;
  }, [month, year]);

  const handlePrevMonth = () => setCurrentViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentViewDate(new Date(year, month + 1, 1));

  const handleDayClick = (d: { day: number, month: number, isCurrentMonth: boolean }) => {
    const newDate = new Date(year, d.month, d.day);
    setSelectedDate(newDate);
    onSelect(newDate);
  };

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#1E1E1E] border border-[var(--border)] rounded-lg shadow-2xl w-[300px] overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-white dark:bg-[#1E1E1E]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
            <h4 className="text-[14px] font-bold text-[var(--text)]">Tháng {month + 1}, {year}</h4>
            <div className="flex items-center gap-0.5">
              <button 
                onClick={(e) => { e.stopPropagation(); handlePrevMonth(); }} 
                className="p-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors cursor-pointer text-[var(--text)]"
              >
                <ChevronLeftIcon size={16} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleNextMonth(); }} 
                className="p-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors cursor-pointer text-[var(--text)]"
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 bg-white dark:bg-[#1E1E1E]">
            {dayNames.map(d => (
              <div key={d} className="h-8 flex items-center justify-center text-[11px] font-bold text-[var(--sub-text)] uppercase tracking-tight">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 p-1 bg-white dark:bg-[#1E1E1E]">
            {daysInMonth.map((d, idx) => {
              const isSelected = selectedDate.getDate() === d.day && selectedDate.getMonth() === d.month;
              const isToday = new Date().getDate() === d.day && new Date().getMonth() === d.month && new Date().getFullYear() === year;
              
              return (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); handleDayClick(d); }}
                  className={`h-9 flex items-center justify-center text-[13px] rounded transition-all cursor-pointer relative ${
                    d.isCurrentMonth ? 'text-[var(--text)]' : 'text-[var(--sub-text)] opacity-30'
                  } ${isSelected ? 'bg-[#0068FF] text-white font-bold' : 'hover:bg-[var(--hover-bg)]'} ${
                    !d.isCurrentMonth || (d.isCurrentMonth && d.day < new Date().getDate() && d.month <= new Date().getMonth()) ? 'bg-gray-50/40 dark:bg-white/5' : ''
                  }`}
                >
                  {d.day}
                  {isToday && !isSelected && (
                    <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[#0068FF]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[var(--border)] grid grid-cols-2 gap-3 bg-gray-50/30 dark:bg-white/5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--sub-text)] uppercase">Ngày</label>
              <input
                type="text"
                value={`${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${selectedDate.getFullYear()}`}
                readOnly
                className="w-full h-8 px-2 bg-white dark:bg-black/20 border border-[var(--border)] rounded outline-none text-[12px] text-[var(--text)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--sub-text)] uppercase">Thời gian</label>
              <select
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full h-8 px-2 bg-white dark:bg-black/20 border border-[var(--border)] rounded outline-none text-[12px] text-[var(--text)] focus:border-[#0068FF] appearance-none cursor-pointer"
              >
                {Array.from({ length: 24 * 4 }).map((_, i) => {
                  const hours = Math.floor(i / 4);
                  const minutes = (i % 4) * 15;
                  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                  return <option key={time} value={time}>{time}</option>;
                })}
              </select>
            </div>
          </div>
          
          {/* Action Button to close */}
          <div className="p-2.5 bg-white dark:bg-[#1E1E1E] border-t border-[var(--border)] flex justify-end gap-2">
            <button 
              onClick={onClose}
              className="h-8 px-4 bg-[#E9EBED] hover:bg-[#DDE0E3] text-[var(--text)] rounded text-[12px] font-semibold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button 
              onClick={() => {
                const [h, m] = timeStr.split(':').map(Number);
                const finalDate = new Date(selectedDate);
                finalDate.setHours(h, m);
                onSelect(finalDate);
                onClose();
              }}
              className="h-8 px-4 bg-[#0068FF] text-white rounded text-[12px] font-semibold hover:bg-[#005AE0] transition-colors cursor-pointer"
            >
              Xong
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
