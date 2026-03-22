'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const CameraIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

const PencilIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);

const ChevronLeftIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);

const ChevronDownIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9l6 6 6-6"/>
  </svg>
);

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState("Nguyễn Quang Huy");
  const [gender, setGender] = useState("Nam");
  
  // Custom Dropdown State
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [day, setDay] = useState("20");
  const [month, setMonth] = useState("04");
  const [year, setYear] = useState("2004");

  if (!isOpen) return null;

  const initialValues = {
    userName: "Nguyễn Quang Huy",
    gender: "Nam",
    day: "20",
    month: "04",
    year: "2004"
  };

  const hasChanged = 
    userName !== initialValues.userName ||
    gender !== initialValues.gender ||
    day !== initialValues.day ||
    month !== initialValues.month ||
    year !== initialValues.year;

  const handleClose = () => {
    setIsEditing(false);
    setOpenDropdown(null);
    onClose();
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const years = Array.from({ length: 100 }, (_, i) => (2024 - i).toString());

  const DropdownMenu = ({ options, current, onSelect }: { options: string[], current: string, onSelect: (val: string) => void }) => (
    <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-md shadow-lg z-[110] max-h-[220px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
      {options.map((opt) => (
        <div 
          key={opt}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(opt);
          }}
          className={`h-[40px] px-3 flex items-center justify-between cursor-pointer transition-colors ${opt === current ? 'bg-[var(--active-bg)] text-[var(--active-text)]' : 'hover:bg-[var(--hover-bg)] text-[var(--text)]'}`}
        >
          <span className="text-[15px]">{opt}</span>
          {opt === current && <CheckIcon size={18} />}
        </div>
      ))}
    </div>
  );

  if (isEditing) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-300" onClick={handleClose} />
        
        <div className="w-full max-w-[400px] bg-[var(--card-bg)] rounded-md shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 overflow-visible flex flex-col h-auto max-h-[90vh]">
          {/* Header */}
          <div className="h-[48px] border-b border-[var(--border)] flex items-center justify-between px-3 bg-[var(--card-bg)] shrink-0 rounded-t-md">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-[var(--hover-bg)] rounded-full text-[var(--text)] transition-colors cursor-pointer"
              >
                <ChevronLeftIcon size={24} />
              </button>
              <h2 className="text-[17px] font-bold text-[var(--text)]">Cập nhật thông tin cá nhân</h2>
            </div>
            <button 
              onClick={handleClose} 
              className="text-[var(--text)] hover:bg-[var(--hover-bg)] p-1.5 rounded-full transition-all cursor-pointer"
            >
              <XIcon size={24} />
            </button>
          </div>

          {/* Form Area */}
          <div 
            className="p-4 flex flex-col gap-5 overflow-visible"
            onClick={() => setOpenDropdown(null)}
          >
            {/* Display Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-bold text-[var(--text)]">Tên hiển thị</label>
              <div className="h-[42px] w-full border border-[var(--border)] rounded-md px-3 flex items-center focus-within:border-[#0068FF] transition-colors text-sm">
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-transparent outline-none text-[15px] text-[var(--text)]"
                />
              </div>
            </div>

            {/* Personal Info Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[16px] font-bold text-[var(--text)]">Thông tin cá nhân</h3>
              
              {/* Gender Radio */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${gender === 'Nam' ? 'border-[#0068FF]' : 'border-[var(--border)]'}`}>
                    {gender === 'Nam' && <div className="w-2.5 h-2.5 rounded-full bg-[#0068FF]" />}
                  </div>
                  <input type="radio" className="hidden" name="gender" checked={gender === 'Nam'} onChange={() => setGender('Nam')} />
                  <span className="text-[15px] text-[var(--text)]">Nam</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${gender === 'Nữ' ? 'border-[#0068FF]' : 'border-[var(--border)]'}`}>
                    {gender === 'Nữ' && <div className="w-2.5 h-2.5 rounded-full bg-[#0068FF]" />}
                  </div>
                  <input type="radio" className="hidden" name="gender" checked={gender === 'Nữ'} onChange={() => setGender('Nữ')} />
                  <span className="text-[15px] text-[var(--text)]">Nữ</span>
                </label>
              </div>
            </div>

            {/* Birthday Dropdowns */}
            <div className="flex flex-col gap-1.5 relative mb-4">
              <label className="text-[15px] font-bold text-[var(--text)]">Ngày sinh</label>
              <div className="grid grid-cols-3 gap-3">
                {/* DAY */}
                <div className="relative">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === 'day' ? null : 'day');
                    }}
                    className={`h-[42px] border rounded-md px-3 flex items-center justify-between cursor-pointer transition-all ${openDropdown === 'day' ? 'border-[#0068FF]' : 'border-[var(--border)] hover:border-gray-400'}`}
                  >
                    <span className="text-[15px] text-[var(--text)]">{day}</span>
                    <ChevronDownIcon size={18} className="text-[var(--sub-text)]" />
                  </div>
                  {openDropdown === 'day' && (
                    <DropdownMenu 
                      options={days} 
                      current={day} 
                      onSelect={(val) => {
                        setDay(val);
                        setOpenDropdown(null);
                      }} 
                    />
                  )}
                </div>

                {/* MONTH */}
                <div className="relative">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === 'month' ? null : 'month');
                    }}
                    className={`h-[42px] border rounded-md px-3 flex items-center justify-between cursor-pointer transition-all ${openDropdown === 'month' ? 'border-[#0068FF]' : 'border-[var(--border)] hover:border-gray-400'}`}
                  >
                    <span className="text-[15px] text-[var(--text)]">{month}</span>
                    <ChevronDownIcon size={18} className="text-[var(--sub-text)]" />
                  </div>
                  {openDropdown === 'month' && (
                    <DropdownMenu 
                      options={months} 
                      current={month} 
                      onSelect={(val) => {
                        setMonth(val);
                        setOpenDropdown(null);
                      }} 
                    />
                  )}
                </div>

                {/* YEAR */}
                <div className="relative">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === 'year' ? null : 'year');
                    }}
                    className={`h-[42px] border rounded-md px-3 flex items-center justify-between cursor-pointer transition-all ${openDropdown === 'year' ? 'border-[#0068FF]' : 'border-[var(--border)] hover:border-gray-400'}`}
                  >
                    <span className="text-[15px] text-[var(--text)]">{year}</span>
                    <ChevronDownIcon size={18} className="text-[var(--sub-text)]" />
                  </div>
                  {openDropdown === 'year' && (
                    <DropdownMenu 
                      options={years} 
                      current={year} 
                      onSelect={(val) => {
                        setYear(val);
                        setOpenDropdown(null);
                      }} 
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-3 shrink-0 rounded-b-md">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-5 py-1.5 bg-[var(--hover-bg)] hover:opacity-80 text-[var(--text)] font-bold rounded-[3px] text-[15px] transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button 
              onClick={() => {
                if (hasChanged) {
                  // Save logic would go here
                  setIsEditing(false);
                }
              }}
              className={`px-5 py-1.5 font-bold rounded-[3px] text-[15px] transition-all ${
                  hasChanged 
                    ? 'bg-[#0068FF] text-white hover:bg-[#0057d1] cursor-pointer' 
                    : 'bg-[#0068FF]/30 text-white/50 cursor-default'
                }`}
            >
              Cập nhật
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-300" onClick={handleClose} />
      
      <div className="w-full max-w-[400px] bg-[var(--card-bg)] rounded-md shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 overflow-visible flex flex-col">
        {/* Header */}
        <div className="h-[48px] border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--card-bg)] shrink-0 rounded-t-md">
          <h2 className="text-[17px] font-bold text-[var(--text)]">Thông tin tài khoản</h2>
          <button onClick={handleClose} className="text-[var(--text)] hover:bg-[var(--hover-bg)] p-1 rounded-full transition-all cursor-pointer">
            <XIcon size={24} />
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden custom-scrollbar bg-[var(--card-bg)]">
          <div className="h-[180px] w-full relative">
            <Image src="https://picsum.photos/id/1018/800/400" alt="Cover" fill className="object-cover" />
          </div>

          <div className="relative px-4 pb-4 border-b-8 border-[var(--background)]">
            <div className="flex items-center gap-4">
               <div className="relative -mt-8 mb-2">
                 <div className="w-[80px] h-[80px] rounded-full border-[3px] border-[var(--card-bg)] overflow-hidden bg-[var(--card-bg)] shadow-md relative">
                    <Image src="/avatar.jpg" fill alt="Avatar" className="object-cover" />
                 </div>
                 <button className="absolute bottom-0 right-0 w-[30px] h-[30px] bg-[var(--hover-bg)] rounded-full flex items-center justify-center text-[var(--sub-text)] border border-[var(--card-bg)] hover:opacity-80 transition-colors cursor-pointer shadow-sm">
                   <CameraIcon size={16} />
                 </button>
               </div>
               
               <div className="flex items-center gap-1.5 pt-2">
                 <h1 className="text-[18px] font-bold text-[var(--text)]">{userName}</h1>
                 <button 
                  onClick={() => setIsEditing(true)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[var(--hover-bg)] rounded-full text-[var(--text)] opacity-70 transition-colors cursor-pointer ml-1"
                 >
                    <PencilIcon size={18} />
                 </button>
               </div>
            </div>
          </div>

          <div className="px-4 py-5">
            <h3 className="text-[16px] font-bold text-[var(--text)] mb-5">Thông tin cá nhân</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="w-[100px] text-[15px] text-[var(--sub-text)] shrink-0">Giới tính</span>
                <span className="text-[15px] text-[var(--text)]">{gender}</span>
              </div>
              <div className="flex items-start">
                <span className="w-[100px] text-[15px] text-[var(--sub-text)] shrink-0">Ngày sinh</span>
                <span className="text-[15px] text-[var(--text)]">20 tháng 04, 2004</span>
              </div>
              <div className="flex items-start">
                <span className="w-[100px] text-[15px] text-[var(--sub-text)] shrink-0">Điện thoại</span>
                <span className="text-[15px] text-[var(--text)]">+84 399 614 016</span>
              </div>
            </div>
            <div className="mt-8">
              <p className="text-[13px] text-[var(--sub-text)] leading-relaxed">
                Chỉ bạn bè có lưu số của bạn trong danh bạ máy xem được số này
              </p>
            </div>
            
            {/* Added Update Button at bottom like first screenshot showed earlier, 
                but I'll also allow clicking the pencil. 
                Wait, if the user only showed the second screen for updating, I'll stick to that. */}
            <div className="mt-6 pt-2">
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--hover-bg)] hover:opacity-80 border border-[var(--border)] rounded-md transition-all text-[var(--text)] font-bold text-[15px] cursor-pointer"
              >
                <PencilIcon size={18} />
                Cập nhật thông tin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
