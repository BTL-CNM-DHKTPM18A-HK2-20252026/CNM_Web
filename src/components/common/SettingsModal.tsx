import React, { useState } from 'react';
import {
  SettingsIcon,
  ShieldIcon,
  SyncIcon,
  MonitorIcon,
  BellIcon,
  MessageSquareIcon,
  ToolIcon
} from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/themes';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const { currentTheme, setCurrentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [contactDisplay, setContactDisplay] = useState('zalo-only');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [useAvatarAsBg, setUseAvatarAsBg] = useState(false);

  if (!isOpen) return null;

  const sideItems = [
    { id: 'general', label: t('settings.tabs.general'), icon: <SettingsIcon size={18} /> },
    { id: 'privacy', label: t('settings.tabs.privacy'), icon: <ShieldIcon size={18} /> },
    { id: 'sync', label: t('settings.tabs.sync'), icon: <SyncIcon size={18} /> },
    { id: 'interface', label: t('settings.tabs.interface'), icon: <MonitorIcon size={18} /> },
    { id: 'notifications', label: t('settings.tabs.notifications'), icon: <BellIcon size={18} /> },
    { id: 'messages', label: t('settings.tabs.messages'), icon: <MessageSquareIcon size={18} /> },
    { id: 'utils', label: t('settings.tabs.utils'), icon: <ToolIcon size={18} /> },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-[1px] animate-in fade-in duration-200 p-4">
      <div className="w-[850px] h-[600px] max-w-full max-h-[90vh] bg-[var(--card-bg)] rounded-xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200 border border-[var(--border)] relative transition-colors duration-200">
        {/* Sidebar */}
        <div className="w-[260px] border-r border-[var(--border)] flex flex-col pt-4 flex-shrink-0 transition-colors duration-200">
          <h2 className="text-[18px] font-semibold mb-4 px-5 text-[var(--text)]">{t('settings.title')}</h2>
          <div className="flex-1 px-2 space-y-0.5">
            {sideItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer text-[14px] whitespace-nowrap ${activeTab === item.id
                  ? 'bg-[var(--active-bg)] text-[var(--active-text)] font-semibold'
                  : 'text-[var(--text)] font-medium hover:bg-[var(--hover-bg)] hover:text-[var(--active-text)]'
                  }`}
              >
                <span className={activeTab === item.id ? 'text-[var(--active-text)]' : 'text-gray-500'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-[var(--background)] transition-colors duration-200">
          {/* Content Header */}
          <div className="h-[56px] px-5 flex justify-end items-center bg-[var(--background)] flex-shrink-0 transition-colors duration-200">
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--hover-bg)] shadow-sm bg-[var(--card-bg)] border border-[var(--border)] rounded-full transition-colors cursor-pointer text-gray-500 hover:text-[#0068FF]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className="px-8 pb-8 overflow-y-auto flex-1 space-y-8">
            {activeTab === 'general' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Danh bạ Section */}
                  <section className="space-y-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.general.contacts.title')}</h4>
                    <p className="text-[13px] text-[var(--sub-text)] mt-1">{t('settings.general.contacts.desc')}</p>
                  </div>

                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm transition-colors duration-200">
                    <label className="flex items-center justify-between p-4 px-5 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer group">
                      <span className="text-[14px] text-[var(--text)] font-medium">{t('settings.general.contacts.show_all')}</span>
                      <div className="relative flex items-center">
                        <input
                          type="radio"
                          name="contact-display"
                          className="peer hidden"
                          checked={contactDisplay === 'all'}
                          onChange={() => setContactDisplay('all')}
                        />
                        <div className="w-5 h-5 rounded-full border border-gray-300 peer-checked:border-[#0068FF] transition-all bg-[var(--card-bg)] flex items-center justify-center">
                          <div className={`w-[14px] h-[14px] rounded-full bg-[#0068FF] transition-transform border-[1.5px] border-[var(--card-bg)] ${contactDisplay === 'all' ? 'scale-100' : 'scale-0'}`}></div>
                        </div>
                      </div>
                    </label>
                    <div className="h-px bg-[var(--border)] mx-5 opacity-50"></div>
                    <label className="flex items-center justify-between p-4 px-5 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer group">
                      <span className="text-[14px] text-[var(--text)] font-medium">{t('settings.general.contacts.zalo_only')}</span>
                      <div className="relative flex items-center">
                        <input
                          type="radio"
                          name="contact-display"
                          className="peer hidden"
                          checked={contactDisplay === 'zalo-only'}
                          onChange={() => setContactDisplay('zalo-only')}
                        />
                        <div className="w-5 h-5 rounded-full border border-gray-300 peer-checked:border-[#0068FF] transition-all bg-[var(--card-bg)] flex items-center justify-center">
                          <div className={`w-[14px] h-[14px] rounded-full bg-[#0068FF] transition-transform border-[1.5px] border-[var(--card-bg)] ${contactDisplay === 'zalo-only' ? 'scale-100' : 'scale-0'}`}></div>
                        </div>
                      </div>
                    </label>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.general.language.title')}</h4>
                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 px-5 flex items-center justify-between shadow-sm overflow-visible transition-colors duration-200">
                    <span className="text-[14px] text-[var(--text)] font-medium">{t('settings.general.language.change')}</span>
                    <div className="relative">
                      <button
                        onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                        className={`flex items-center justify-between w-[160px] bg-[var(--card-bg)] border rounded-md py-1.5 px-3 text-[14px] text-[var(--text)] font-medium transition-all cursor-pointer ${isLangDropdownOpen ? 'border-[#0068FF] shadow-[0_0_0_1px_#0068FF]' : 'border-[var(--border)] hover:border-[#0068FF] opacity-90'}`}
                      >
                        <span>{i18n.language === 'vi' ? t('settings.general.language.vi') : t('settings.general.language.en')}</span>
                        <div className={`transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                      </button>

                      {isLangDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-[110]" onClick={() => setIsLangDropdownOpen(false)}></div>
                          <div className="absolute right-0 top-full mt-1.5 w-[180px] bg-[var(--card-bg)] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[var(--border)] py-1.5 z-[120] animate-in fade-in slide-in-from-top-1 duration-150">
                            <button
                              onClick={() => { i18n.changeLanguage('vi'); setIsLangDropdownOpen(false); }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-[14px] cursor-pointer transition-colors ${i18n.language === 'vi' ? 'bg-[#E5EFFF] dark:bg-blue-500/10 text-[#0068FF] font-semibold' : 'text-[var(--text)] hover:bg-[var(--hover-bg)]'}`}
                            >
                              {t('settings.general.language.vi')}
                              {i18n.language === 'vi' && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#0068FF]"><path d="m20 6-11 11-5-5" /></svg>
                              )}
                            </button>
                            <button
                              onClick={() => { i18n.changeLanguage('en'); setIsLangDropdownOpen(false); }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-[14px] cursor-pointer transition-colors ${i18n.language === 'en' ? 'bg-[#E5EFFF] dark:bg-blue-500/10 text-[#0068FF] font-semibold' : 'text-[var(--text)] hover:bg-[var(--hover-bg)]'}`}
                            >
                              {t('settings.general.language.en')}
                              {i18n.language === 'en' && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#0068FF]"><path d="m20 6-11 11-5-5" /></svg>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab !== 'general' && activeTab !== 'interface' && (
              <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-[var(--active-bg)] text-[var(--active-text)] flex items-center justify-center mb-4 transition-colors duration-200">
                  {React.cloneElement(sideItems.find(i => i.id === activeTab)?.icon as React.ReactElement, { size: 32 } as any)}
                </div>
                <p className="text-[15px] font-medium italic text-[var(--sub-text)]">{t('settings.development', { name: sideItems.find(i => i.id === activeTab)?.label })}</p>
              </div>
            )}

            {activeTab === 'interface' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Theme Section */}
                <section className="space-y-4">
                  <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.appearance.title')}</h4>
                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-7 flex gap-7 shadow-sm transition-colors duration-200">
                    {/* Light Theme */}
                    <div className="flex flex-col items-center gap-4 group">
                      <button 
                        onClick={() => setCurrentTheme('light')}
                        className={`w-[130px] h-[86px] rounded-lg border-2 transition-all p-2 flex flex-col gap-1 cursor-pointer overflow-hidden ${currentTheme === 'light' ? 'border-[#0068FF] bg-[#E8F1FF]' : 'border-[var(--border)] bg-[#F4F7FC] hover:border-[#0068FF]'}`}
                      >
                        <div className="w-4 h-4 rounded-full bg-blue-300 translate-x-1 translate-y-1"></div>
                        <div className="w-10 h-3 bg-white rounded-sm mt-1 translate-x-1"></div>
                        <div className="w-8 h-5 bg-blue-400 self-end mt-auto rounded-sm -translate-x-1 -translate-y-1"></div>
                      </button>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="radio" className="hidden peer" checked={currentTheme === 'light'} onChange={() => setCurrentTheme('light')} />
                        <div className="w-5 h-5 rounded-full border border-[var(--border)] peer-checked:border-[#0068FF] transition-all bg-[var(--card-bg)] flex items-center justify-center">
                          <div className={`w-[14px] h-[14px] rounded-full bg-[#0068FF] transition-transform border-[1.5px] border-[var(--card-bg)] ${currentTheme === 'light' ? 'scale-100' : 'scale-0'}`}></div>
                        </div>
                        <span className="text-[14px] text-[var(--text)] font-medium">{t('settings.appearance.theme.light')}</span>
                      </label>
                    </div>

                    {/* Dark Theme */}
                    <div className="flex flex-col items-center gap-4 group">
                      <button 
                        onClick={() => setCurrentTheme('dark')}
                        className={`w-[130px] h-[86px] rounded-lg border-2 transition-all p-2 flex flex-col gap-1 cursor-pointer overflow-hidden ${currentTheme === 'dark' ? 'border-[#0068FF] bg-[#000000]' : 'border-transparent bg-[#111111] hover:border-[#0068FF]'}`}
                      >
                        <div className="w-4 h-4 rounded-full bg-blue-500 translate-x-1 translate-y-1"></div>
                        <div className="w-10 h-3 bg-gray-700 rounded-sm mt-1 translate-x-1"></div>
                        <div className="w-8 h-5 bg-[#0068FF] self-end mt-auto rounded-sm -translate-x-1 -translate-y-1"></div>
                      </button>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="radio" className="hidden peer" checked={currentTheme === 'dark'} onChange={() => setCurrentTheme('dark')} />
                        <div className="w-5 h-5 rounded-full border border-[var(--border)] peer-checked:border-[#0068FF] transition-all bg-[var(--card-bg)] flex items-center justify-center">
                          <div className={`w-[14px] h-[14px] rounded-full bg-[#0068FF] transition-transform border-[1.5px] border-[var(--card-bg)] ${currentTheme === 'dark' ? 'scale-100' : 'scale-0'}`}></div>
                        </div>
                        <span className="text-[14px] text-[var(--text)] font-medium">{t('settings.appearance.theme.dark')}</span>
                      </label>
                    </div>

                    {/* System Theme */}
                    <div className="flex flex-col items-center gap-4 group">
                      <button 
                        onClick={() => setCurrentTheme('system')}
                        className={`w-[130px] h-[86px] rounded-lg border-2 transition-all flex cursor-pointer overflow-hidden ${currentTheme === 'system' ? 'border-[#0068FF]' : 'border-[var(--border)] hover:border-[#0068FF]'}`}
                      >
                        <div className="w-1/2 bg-[#E8F1FF] p-2 flex flex-col gap-1">
                          <div className="w-4 h-4 rounded-full bg-blue-300 translate-x-1 translate-y-1"></div>
                          <div className="w-8 h-3 bg-white rounded-sm mt-1 translate-x-1"></div>
                        </div>
                        <div className="w-1/2 bg-[#1a1c22] p-2 flex flex-col gap-1 items-end">
                          <div className="w-8 h-3 bg-gray-700 rounded-sm translate-x-1 mt-6"></div>
                          <div className="w-8 h-5 bg-[#0068FF] mt-auto rounded-sm -translate-x-1 -translate-y-1"></div>
                        </div>
                      </button>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="radio" className="hidden peer" checked={currentTheme === 'system'} onChange={() => setCurrentTheme('system')} />
                        <div className="w-5 h-5 rounded-full border border-[var(--border)] peer-checked:border-[#0068FF] transition-all bg-[var(--card-bg)] flex items-center justify-center">
                          <div className={`w-[14px] h-[14px] rounded-full bg-[#0068FF] transition-transform border-[1.5px] border-[var(--card-bg)] ${currentTheme === 'system' ? 'scale-100' : 'scale-0'}`}></div>
                        </div>
                        <span className="text-[14px] text-[var(--text)] font-medium">{t('settings.appearance.theme.system')}</span>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Background Section */}
                <section className="space-y-4">
                  <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.appearance.wallpaper.title')}</h4>
                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 px-5 flex items-center justify-between shadow-sm transition-colors duration-200">
                    <span className="text-[14px] text-[var(--text)] font-medium">{t('settings.appearance.wallpaper.use_avatar')}</span>
                    <button
                      onClick={() => setUseAvatarAsBg(!useAvatarAsBg)}
                      className={`w-10 h-5 rounded-full relative transition-all duration-200 cursor-pointer ${useAvatarAsBg ? 'bg-[#0068FF]' : 'bg-[var(--border)] hover:opacity-80'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${useAvatarAsBg ? 'left-6' : 'left-1'}`}></div>
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
