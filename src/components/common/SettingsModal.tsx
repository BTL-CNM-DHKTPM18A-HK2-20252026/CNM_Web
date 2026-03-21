import React from 'react';
import { SettingsIcon, UserCircleIcon } from '@/components/ui/Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-[1px] animate-in fade-in duration-200">
      <div className="w-[600px] h-[480px] bg-white rounded-xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
        {/* Sidebar */}
        <div className="w-[180px] bg-[#f8f9fa] border-r border-gray-100 flex flex-col pt-5">
          <h2 className="text-[16px] font-bold mb-4 px-5 text-[#1e293b]">Cài đặt</h2>
          <div className="flex-1 px-2 space-y-0.5">
            <button className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 text-[#0068FF] font-semibold text-[13px] flex items-center gap-2.5 cursor-pointer">
              <span className="opacity-90"><SettingsIcon size={18} /></span>
              Cài đặt chung
            </button>
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200/50 text-[#1e293b] font-medium text-[13px] flex items-center gap-2.5 grayscale transition-all cursor-pointer">
              <span className="opacity-60"><UserCircleIcon size={18} /></span>
              Tài khoản
            </button>
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200/50 text-[#1e293b] font-medium text-[13px] flex items-center gap-2.5 grayscale transition-all cursor-pointer">
              <span className="opacity-60"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
              Bảo mật
            </button>
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200/50 text-[#1e293b] font-medium text-[13px] flex items-center gap-2.5 grayscale transition-all cursor-pointer">
              <span className="opacity-60"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>
              Thông báo
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="h-[56px] px-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-[15px] text-[#1e293b]">Cài đặt chung</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          
          <div className="p-7 overflow-y-auto flex-1 space-y-7 text-[#1e293b]">
            <section>
              <h4 className="font-bold text-[11px] mb-3 uppercase text-gray-400 tracking-wider">Giao diện</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 border border-gray-100 rounded-lg hover:bg-gray-50/50 transition-all cursor-default">
                  <div>
                    <p className="font-bold text-[13px] text-[#1e293b]">Chế độ tối (Dark mode)</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Sử dụng giao diện tối</p>
                  </div>
                  <div className="w-10 h-5 bg-gray-200 rounded-full relative cursor-pointer hover:bg-gray-300 transition-colors">
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-bold text-[11px] mb-3 uppercase text-gray-400 tracking-wider">Ngôn ngữ</h4>
              <div className="grid grid-cols-2 gap-3">
                <button className="py-6 px-3 rounded-lg border-2 border-blue-500 bg-blue-50/30 flex flex-col items-center gap-1.5 cursor-pointer">
                   <span className="text-xl">🇻🇳</span>
                   <span className="font-bold text-[12px] text-[#1e293b]">Tiếng Việt</span>
                </button>
                <button className="py-6 px-3 rounded-lg border-2 border-transparent bg-gray-50 hover:bg-gray-100 flex flex-col items-center gap-1.5 transition-all cursor-pointer">
                   <span className="text-xl">🇺🇸</span>
                   <span className="font-medium text-[12px] text-gray-500">English</span>
                </button>
              </div>
            </section>
          </div>

          <div className="p-4 px-6 border-t border-gray-50 flex justify-end gap-2.5">
            <button onClick={onClose} className="px-5 py-1.5 rounded-md font-bold text-[13px] text-gray-500 hover:text-gray-700 transition-all cursor-pointer">Hủy</button>
            <button className="px-7 py-1.5 rounded-md font-bold text-[13px] bg-[#0068FF] text-white hover:bg-blue-600 transition-all cursor-pointer">Lưu</button>
          </div>
        </div>
      </div>
    </div>
  );
}
