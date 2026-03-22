import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { SettingsIcon, UserCircleIcon, DatabaseIcon,  GlobeIcon,
  HelpIcon,
  LogOutIcon,
  ZaloChatIcon,
  ZaloContactIcon,
  ZaloCloudIcon,
  ZaloFileIcon,
  ZaloBusinessIcon,
  ZaloSettingsIcon
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
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const handleLangChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLangSubMenu(false);
    setShowSettingsMenu(false);
  };

  return (
    <div className="w-[64px] bg-[var(--sidebar-bg)] flex flex-col items-center py-4 gap-2 relative z-[60] transition-colors duration-200 shrink-0 shadow-[inset_-1px_0_0_rgba(255,255,255,0.1)]">
      {/* Avatar */}
      <div 
        onClick={() => {
          setShowUserMenu(!showUserMenu);
          setShowSettingsMenu(false); // Close settings menu if open
        }}
        className="h-11 w-11 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer mb-2 shrink-0 relative transition-transform active:scale-95"
      >
        <Image src="/avatar.jpg" fill alt="User" className="object-cover" />
      </div>

      {/* User Menu Popup */}
      {showUserMenu && (
        <div className="absolute left-[70px] top-4 w-[280px] bg-[var(--card-bg)] rounded-xl shadow-2xl border border-[var(--border)] py-1.5 z-[70] animate-in slide-in-from-left-2 fade-in duration-200">
          <div className="px-4 py-3 border-b border-[var(--border)] mb-1">
            <h3 className="text-[17px] font-bold text-[var(--text)]">Nguyễn Quang Huy</h3>
          </div>
          
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] text-[15px] group cursor-pointer">
            <span className="font-medium">{t('sidebar.upgrade_account')}</span>
            <span className="text-gray-400 group-hover:text-[#0068FF] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </span>
          </button>

          <button 
            onClick={() => { setIsProfileModalOpen(true); setShowUserMenu(false); }}
            className="w-full flex items-center px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] text-[15px] font-medium cursor-pointer"
          >
            {t('sidebar.your_profile')}
          </button>

          <button 
            onClick={() => { setIsSettingsModalOpen(true); setShowUserMenu(false); }}
            className="w-full flex items-center px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] text-[15px] font-medium border-b border-[var(--border)] pb-4 cursor-pointer"
          >
            {t('sidebar.settings')}
          </button>

          <div className="pt-1">
            <button 
              onClick={() => { onLogout(); setShowUserMenu(false); }}
              className="w-full flex items-center px-4 py-3 hover:bg-red-500/10 transition-colors text-red-500 text-[15px] font-bold cursor-pointer"
            >
              {t('sidebar.logout')}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="w-full flex flex-col items-center gap-1.5 relative">
        <button
          onClick={() => setActiveTab('chat')}
          className={`w-[52px] h-[52px] flex items-center justify-center rounded-lg transition-all cursor-pointer ${activeTab === 'chat' ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]' : 'hover:bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text)]'}`}
        >
          <ZaloChatIcon size={28} active={activeTab === 'chat'} />
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`w-[52px] h-[52px] flex items-center justify-center rounded-lg transition-all cursor-pointer ${activeTab === 'contacts' ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]' : 'hover:bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text)]'}`}
        >
          <ZaloContactIcon size={26} active={activeTab === 'contacts'} />
        </button>

        <button
          onClick={() => setActiveTab('cloud')}
          className={`w-[52px] h-[52px] flex items-center justify-center rounded-lg transition-all cursor-pointer ${activeTab === 'cloud' ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]' : 'hover:bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text)]'}`}
        >
          <ZaloCloudIcon size={26} />
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`w-[52px] h-[52px] flex items-center justify-center rounded-lg transition-all cursor-pointer ${activeTab === 'files' ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]' : 'hover:bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text)]'}`}
        >
          <ZaloFileIcon size={26} />
        </button>

        <button
          onClick={() => setActiveTab('business')}
          className={`w-[52px] h-[52px] flex items-center justify-center rounded-lg transition-all cursor-pointer ${activeTab === 'business' ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]' : 'hover:bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text)]'}`}
        >
          <ZaloBusinessIcon size={26} />
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
          className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)] transition-colors cursor-pointer"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </button>

        <button
          onClick={() => {
            setShowSettingsMenu(!showSettingsMenu);
            setShowUserMenu(false); // Close user menu if open
          }}
          className={`w-[52px] h-[52px] flex items-center justify-center rounded-lg transition-all cursor-pointer ${showSettingsMenu ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]' : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)]'}`}
        >
          <ZaloSettingsIcon size={28} />
        </button>
      </div>
    </div>
  );
}
