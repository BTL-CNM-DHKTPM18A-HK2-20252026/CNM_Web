import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { SettingsIcon, UserCircleIcon, DatabaseIcon,  GlobeIcon,
  HelpIcon,
  LogOutIcon 
} from '@/components/ui/Icons';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showSettingsMenu: boolean;
  setShowSettingsMenu: (show: boolean) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
  setIsProfileModalOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  showSettingsMenu,
  setShowSettingsMenu,
  setIsSettingsModalOpen,
  setIsProfileModalOpen,
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
    <div className="w-[64px] bg-[var(--sidebar-bg)] flex flex-col items-center py-4 gap-3 text-[var(--sidebar-text)] shadow-inner relative z-[60] transition-colors duration-200 border-r border-[var(--border)]">
      {/* Avatar */}
      <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer mb-2 shrink-0">
        <Image src="https://avatar.talk.vtalk.ai/avatar/default" width={44} height={44} alt="User" className="bg-gray-200" />
      </div>

      {/* Navigation Tabs */}
      <div className="w-full flex flex-col items-center gap-3 relative">
        <button
          onClick={() => setActiveTab('chat')}
          className={`w-[48px] h-[48px] flex items-center justify-center rounded-xl transition-all cursor-pointer relative ${activeTab === 'chat' ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]' : 'hover:bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text)]'}`}
        >
          {/* Indicator Bar for Black interface */}
          {activeTab === 'chat' && <div className="absolute left-[-8px] w-1 h-6 bg-[var(--sidebar-indicator)] rounded-r-full"></div>}
          <svg width="26" height="26" viewBox="0 0 24 24" fill={activeTab === 'chat' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {activeTab === 'chat' ? (
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338c1.47.851 3.179 1.338 5 1.338 5.523 0 10-4.477 10-10S17.523 2 12 2zm3.5 11h-7v-1.5h7V13zm0-3.5h-7V8h7v1.5z"/>
            ) : (
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.3 8.38 8.38 0 0 1 3.8.9L21 3.5Z"/>
            )}
          </svg>
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`w-[48px] h-[48px] flex items-center justify-center rounded-xl transition-all cursor-pointer relative ${activeTab === 'contacts' ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]' : 'hover:bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text)]'}`}
        >
          {/* Indicator Bar for Black interface */}
          {activeTab === 'contacts' && <div className="absolute left-[-8px] w-1 h-6 bg-[var(--sidebar-indicator)] rounded-r-full"></div>}
          <svg width="26" height="26" viewBox="0 0 24 24" fill={activeTab === 'contacts' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {activeTab === 'contacts' ? (
              <path fillRule="evenodd" clipRule="evenodd" d="M19 2H7c-1.1 0-2 .89-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.11-.9-2-2-2zm-2 15H9V5h8v12zM13 8.5c-.828 0-1.5.672-1.5 1.5s.672 1.5 1.5 1.5 1.5-.672 1.5-1.5-.672-1.5-1.5-1.5zm0 4.5c-1.381 0-2.5.5-2.5 1.5V15h5v-.5c0-1-1.119-1.5-2.5-1.5zM3 7h2v2H3V7zm0 4h2v2H3v-2zm0 4h2v2H3v-2z"/>
            ) : (
              <>
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><rect x="3" y="2" width="18" height="20" rx="2" ry="2"/>
              </>
            )}
          </svg>
        </button>

        <button
          onClick={() => setActiveTab('cloud')}
          className={`w-[48px] h-[48px] flex items-center justify-center rounded-xl transition-all cursor-pointer relative ${activeTab === 'cloud' ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]' : 'hover:bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text)]'}`}
        >
          {/* Indicator Bar for Black interface */}
          {activeTab === 'cloud' && <div className="absolute left-[-8px] w-1 h-6 bg-[var(--sidebar-indicator)] rounded-r-full"></div>}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c2.21 0 4-1.79 4-4s-1.79-4-4-4h-0.5c-0.34-3.15-2.82-5.5-5.75-5.5-2.26 0-4.22 1.39-4.99 3.39-2.31 0.47-4.01 2.5-4.01 4.93 0 2.76 2.24 5 5 5h10.25Z"/><text x="9" y="16" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">Z</text></svg>
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto w-full flex flex-col items-center gap-1 relative">
        {/* Settings Popup Menu */}
        {showSettingsMenu && (
          <div className="absolute left-[70px] bottom-2 w-[280px] bg-[var(--card-bg)] rounded-xl shadow-2xl border border-[var(--border)] py-2.5 z-[70] animate-in slide-in-from-left-2 fade-in duration-200">
            <button 
              onClick={() => { setIsProfileModalOpen(true); setShowSettingsMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] text-[15px] group cursor-pointer"
            >
              <span className="text-gray-400 group-hover:text-[#0068FF] transition-colors"><UserCircleIcon size={18} /></span>
              <span className="font-medium group-hover:text-[#0068FF] transition-colors">{t('sidebar.account_info')}</span>
            </button>
            <button
              onClick={() => { setIsSettingsModalOpen(true); setShowSettingsMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] text-[15px] group border-b border-[var(--border)] cursor-pointer"
            >
              <span className="text-gray-400 group-hover:text-[#0068FF] transition-colors"><SettingsIcon size={18} /></span>
              <span className="font-medium group-hover:text-[#0068FF] transition-colors">{t('sidebar.settings')}</span>
            </button>

            <div className="py-1">
              <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] text-[15px] group cursor-pointer">
                <div className="flex items-center gap-3">
                   <span className="text-gray-400 group-hover:text-[#0068FF] transition-colors"><DatabaseIcon size={18} /></span>
                   <span className="font-medium group-hover:text-[#0068FF] transition-colors">{t('sidebar.data')}</span>
                </div>
                <span className="text-gray-300"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg></span>
              </button>
              
              <div 
                className="relative"
                onMouseEnter={() => setShowLangSubMenu(true)}
                onMouseLeave={() => setShowLangSubMenu(false)}
              >
                <button 
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] text-[15px] group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                     <span className="text-gray-400 group-hover:text-[#0068FF] transition-colors"><GlobeIcon size={18} /></span>
                     <span className="font-medium group-hover:text-[#0068FF] transition-colors">{t('sidebar.language')}</span>
                  </div>
                  <span className="text-gray-300"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg></span>
                </button>
                
                {showLangSubMenu && (
                  <div 
                    className="absolute left-full top-[-10px] pl-[6px] z-[80] animate-in slide-in-from-left-1 fade-in duration-200"
                  >
                    <div className="w-[200px] bg-[var(--card-bg)] rounded-xl shadow-2xl border border-[var(--border)] py-2">
                       <button 
                         onClick={() => handleLangChange('vi')}
                         className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] text-[14px] cursor-pointer"
                       >
                         <div className="flex items-center gap-3">
                           <span className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 border border-[var(--border)] flex items-center justify-center">
                             <svg viewBox="0 0 30 20" className="w-full h-full object-cover">
                               <rect width="30" height="20" fill="#da251d"/>
                               <polygon fill="#ff0" points="15 4 16.176 7.618 20 7.618 16.912 9.882 18.088 13.5 15 11.236 11.912 13.5 13.088 9.882 10 7.618 13.824 7.618"/>
                             </svg>
                           </span>
                           <span>{t('settings.general.language.vi')}</span>
                         </div>
                         {i18n.language === 'vi' && <span className="text-blue-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m20 6-11 11-5-5"/></svg></span>}
                       </button>
                       <button 
                         onClick={() => handleLangChange('en')}
                         className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] text-[14px] cursor-pointer"
                       >
                         <div className="flex items-center gap-3">
                           <span className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 border border-[var(--border)] flex items-center justify-center">
                             <svg viewBox="0 0 7410 3900" className="w-full h-full object-cover">
                               <rect width="7410" height="3900" fill="#b22234"/>
                               <path d="M0,450H7410M0,1050H7410M0,1650H7410M0,2250H7410M0,2850H7410M0,3450H7410" stroke="#fff" strokeWidth="300"/>
                               <rect width="2964" height="2100" fill="#3c3b6e"/>
                             </svg>
                           </span>
                           <span>{t('settings.general.language.en')}</span>
                         </div>
                         {i18n.language === 'en' && <span className="text-blue-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m20 6-11 11-5-5"/></svg></span>}
                       </button>
                    </div>
                  </div>
                )}
              </div>

              <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] text-[15px] group border-b border-[var(--border)] cursor-pointer">
                <div className="flex items-center gap-3">
                   <span className="text-gray-400 group-hover:text-[#0068FF] transition-colors"><HelpIcon size={18} /></span>
                   <span className="font-medium group-hover:text-[#0068FF] transition-colors">{t('sidebar.support')}</span>
                </div>
                <span className="text-gray-300"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg></span>
              </button>
            </div>

            <button
              onClick={() => { onLogout(); setShowSettingsMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors text-red-500 text-[15px] group cursor-pointer"
            >
              <span className="text-red-400 group-hover:text-red-500 transition-colors"><LogOutIcon size={18} /></span>
              <span className="font-bold">{t('sidebar.logout')}</span>
            </button>
          </div>
        )}

        <button
          className="w-10 h-10 flex items-center justify-center rounded-xl text-inherit opacity-70 hover:bg-[var(--sidebar-hover-bg)] transition-colors cursor-pointer"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </button>

        <button
          onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${showSettingsMenu ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]' : 'text-inherit opacity-70 hover:bg-[var(--sidebar-hover-bg)]'}`}
        >
          <SettingsIcon size={24} />
        </button>
      </div>
    </div>
  );
}
