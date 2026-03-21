import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { SettingsIcon, UserCircleIcon, DatabaseIcon, GlobeIcon, HelpIcon } from '@/components/ui/Icons';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showSettingsMenu: boolean;
  setShowSettingsMenu: (show: boolean) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  showSettingsMenu,
  setShowSettingsMenu,
  setIsSettingsModalOpen,
  onLogout,
}: SidebarProps) {
  const { t, i18n } = useTranslation();
  const [showLangSubMenu, setShowLangSubMenu] = React.useState(false);

  const handleLangChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLangSubMenu(false);
    setShowSettingsMenu(false);
  };

  return (
    <div className="w-[64px] bg-[#0068FF] flex flex-col items-center py-4 gap-2 text-white/70 shadow-inner relative z-[60]">
      {/* Avatar */}
      <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer mb-2">
        <Image src="https://avatar.talk.vtalk.ai/avatar/default" width={48} height={48} alt="User" className="bg-gray-200" />
      </div>

      {/* Navigation Tabs */}
      <button
        onClick={() => setActiveTab('chat')}
        className={`w-full flex justify-center py-3.5 relative transition-colors cursor-pointer ${activeTab === 'chat' ? 'bg-[#005AE0] text-white' : 'hover:bg-white/10'}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill={activeTab === 'chat' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.3 8.38 8.38 0 0 1 3.8.9L21 3.5Z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>
      </button>

      <button
        onClick={() => setActiveTab('contacts')}
        className={`w-full flex justify-center py-3.5 relative transition-colors cursor-pointer ${activeTab === 'contacts' ? 'bg-[#005AE0] text-white' : 'hover:bg-white/10'}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><rect x="3" y="2" width="18" height="20" rx="2" ry="2"/></svg>
      </button>

      <button
        onClick={() => setActiveTab('cloud')}
        className={`w-full flex justify-center py-3.5 relative transition-colors cursor-pointer ${activeTab === 'cloud' ? 'bg-[#005AE0] text-white' : 'hover:bg-white/10'}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c2.21 0 4-1.79 4-4s-1.79-4-4-4h-0.5c-0.34-3.15-2.82-5.5-5.75-5.5-2.26 0-4.22 1.39-4.99 3.39-2.31 0.47-4.01 2.5-4.01 4.93 0 2.76 2.24 5 5 5h10.25Z"/><text x="9" y="16" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">Z</text></svg>
      </button>

      <button
        className="w-full flex justify-center py-3.5 relative text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M12 11v4"/><path d="M10 13h4"/></svg>
      </button>

      {/* Bottom Actions */}
      <div className="mt-auto w-full flex flex-col items-center relative">
        {/* Settings Popup Menu */}
        {showSettingsMenu && (
          <div className="absolute left-[70px] bottom-2 w-[280px] bg-white rounded-xl shadow-2xl border border-gray-100 py-2.5 z-[70] animate-in slide-in-from-left-2 fade-in duration-200">
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-[#1e293b] text-[15px] group cursor-pointer">
              <span className="text-gray-400 group-hover:text-[#0068FF] transition-colors"><UserCircleIcon size={18} /></span>
              <span className="font-medium">{t('sidebar.account_info')}</span>
            </button>
            <button
              onClick={() => { setIsSettingsModalOpen(true); setShowSettingsMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-[#1e293b] text-[15px] group border-b border-gray-100/50 cursor-pointer"
            >
              <span className="text-gray-400 group-hover:text-[#0068FF] transition-colors"><SettingsIcon size={18} /></span>
              <span className="font-medium">{t('sidebar.settings')}</span>
            </button>

            <div className="py-1">
              <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-[#1e293b] text-[15px] group cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors"><DatabaseIcon size={18} /></span>
                  <span className="font-medium">{t('sidebar.data')}</span>
                </div>
                <span className="text-gray-300"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg></span>
              </button>
              
              <div 
                className="relative"
                onMouseEnter={() => setShowLangSubMenu(true)}
                onMouseLeave={() => setShowLangSubMenu(false)}
              >
                <button 
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-[#1e293b] text-[15px] group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 group-hover:text-gray-600 transition-colors"><GlobeIcon size={18} /></span>
                    <span className="font-medium">{t('sidebar.language')}</span>
                  </div>
                  <span className="text-gray-300"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg></span>
                </button>
                
                {showLangSubMenu && (
                  <div 
                    className="absolute left-full top-[-10px] pl-[6px] z-[80] animate-in slide-in-from-left-1 fade-in duration-200"
                  >
                    <div className="w-[200px] bg-white rounded-xl shadow-2xl border border-gray-100 py-2">
                       <button 
                         onClick={() => handleLangChange('vi')}
                         className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-[#1e293b] text-[14px] cursor-pointer"
                       >
                         <div className="flex items-center gap-3">
                           <span className="text-lg">🇻🇳</span>
                           <span>Tiếng Việt</span>
                         </div>
                         {i18n.language === 'vi' && <span className="text-blue-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m20 6-11 11-5-5"/></svg></span>}
                       </button>
                       <button 
                         onClick={() => handleLangChange('en')}
                         className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-[#1e293b] text-[14px] cursor-pointer"
                       >
                         <div className="flex items-center gap-3">
                           <span className="text-lg">🇺🇸</span>
                           <span>English</span>
                         </div>
                         {i18n.language === 'en' && <span className="text-blue-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m20 6-11 11-5-5"/></svg></span>}
                       </button>
                    </div>
                  </div>
                )}
              </div>

              <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-[#1e293b] text-[15px] group border-b border-gray-100/50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors"><HelpIcon size={18} /></span>
                  <span className="font-medium">{t('sidebar.support')}</span>
                </div>
                <span className="text-gray-300"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg></span>
              </button>
            </div>

            <button
              onClick={() => { onLogout(); setShowSettingsMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-red-500 text-[15px] group cursor-pointer"
            >
              <span className="opacity-0 w-5"></span>
              <span className="font-bold">{t('sidebar.logout')}</span>
            </button>
          </div>
        )}

        <button
          className="w-full flex justify-center py-3.5 text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </button>

        <button
          onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          className={`w-full flex justify-center py-4 transition-colors cursor-pointer ${showSettingsMenu ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}
        >
          <SettingsIcon />
        </button>
      </div>
    </div>
  );
}
