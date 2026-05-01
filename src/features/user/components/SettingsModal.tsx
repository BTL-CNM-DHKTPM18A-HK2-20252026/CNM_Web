import React, { useState, useEffect } from 'react';
import {
  SettingsIcon,
  ShieldIcon,
  SyncIcon,
  MonitorIcon,
  BellIcon,
  MessageSquareIcon,
  ToolIcon,
  SparklesIcon
} from '@/components/ui/Icons';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/themes';
import { apiClient } from '@/lib/http/apiClient';
import PinInputModal from '@/components/ui/PinInputModal';

type AiAccessSettings = {
  allowFullDataAccess: boolean;
};

type AiThemeType =
  | 'GENERAL'
  | 'SALES'
  | 'OFFICE'
  | 'GLOBAL'
  | 'CREATIVE'
  | 'STUDY'
  | 'DEV'
  | 'CODE_REVIEW';

const AI_ACCESS_SETTINGS_STORAGE_KEY = 'fruvia.ai.access-settings.v1';
const AI_THEME_STORAGE_KEY = 'fruvia.ai.theme.v1';

const DEFAULT_AI_ACCESS_SETTINGS: AiAccessSettings = {
  allowFullDataAccess: false,
};

const getStoredAiAccessSettings = (): AiAccessSettings => {
  if (typeof window === 'undefined') return DEFAULT_AI_ACCESS_SETTINGS;

  try {
    const raw = window.localStorage.getItem(AI_ACCESS_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_AI_ACCESS_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AiAccessSettings>;
    return {
      ...DEFAULT_AI_ACCESS_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_AI_ACCESS_SETTINGS;
  }
};

const getStoredAiTheme = (): AiThemeType => {
  if (typeof window === 'undefined') return 'GENERAL';

  const raw = (window.localStorage.getItem(AI_THEME_STORAGE_KEY) || '').trim().toUpperCase();
  if (raw === 'WORK') return 'OFFICE';
  if (raw === 'CHILL') return 'CREATIVE';
  if (raw === 'JAPANESE') return 'GLOBAL';

  if (
    raw === 'DEV' ||
    raw === 'CODE_REVIEW' ||
    raw === 'SALES' ||
    raw === 'OFFICE' ||
    raw === 'GLOBAL' ||
    raw === 'CREATIVE' ||
    raw === 'STUDY'
  ) {
    return raw as AiThemeType;
  }

  return 'GENERAL';
};

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
  const [aiAccessSettings, setAiAccessSettings] = useState<AiAccessSettings>(() => getStoredAiAccessSettings());
  const [aiTheme, setAiTheme] = useState<AiThemeType>(() => getStoredAiTheme());
  const [aiAccessSavedAt, setAiAccessSavedAt] = useState<number | null>(null);

  // PIN management state
  const [hasPinConfigured, setHasPinConfigured] = useState<boolean | null>(null);
  type PinModalMode = null | 'setup' | 'change_current' | 'change_new';
  const [pinModalMode, setPinModalMode] = useState<PinModalMode>(null);
  const [pinModalError, setPinModalError] = useState<string | null>(null);
  const [pinModalLoading, setPinModalLoading] = useState(false);
  const [pendingCurrentPin, setPendingCurrentPin] = useState('');

  // Account lock state
  const [accountLocked, setAccountLocked] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    showReadReceipts: true,
    showOnlineStatus: true,
    allowSearchByPhone: true,
    allowSearchByQR: true,
    allowSearchByGroup: true,
    blockStrangerMessages: false,
    blockStrangerProfileView: false,
  });
  const [privacySaving, setPrivacySaving] = useState(false);

  // Device management state
  const [devices, setDevices] = useState<Array<{id: string; deviceName: string; deviceType: string; browser: string; os: string; ipAddress: string; loginAt: string; lastActiveAt: string; isActive: boolean}>>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  // AI token usage state
  const [tokenUsage, setTokenUsage] = useState<{totalTokensToday: number; requestCount: number; date: string} | null>(null);

  // Storage stats state
  const [storageStats, setStorageStats] = useState<{totalSize: number; imageSize: number; videoSize: number; fileSize: number; voiceSize: number} | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // Auto-delete radio state
  const [autoDeleteOption, setAutoDeleteOption] = useState('off');

  // Load PIN status when modal opens
  useEffect(() => {
    if (!isOpen) return;
    apiClient.get('/users/me/pin/status')
      .then((res: any) => setHasPinConfigured(Boolean(res?.hasPin ?? res?.data?.hasPin)))
      .catch(() => setHasPinConfigured(false));
    // Load account lock status + privacy settings
    apiClient.get('/users/me/settings')
      .then((res: any) => {
        const data = res?.data ?? res;
        setAccountLocked(Boolean(data?.accountLocked));
        setPrivacySettings({
          showReadReceipts: data?.showReadReceipts !== false,
          showOnlineStatus: data?.showOnlineStatus !== false,
          allowSearchByPhone: data?.allowSearchByPhone !== false,
          allowSearchByQR: data?.allowSearchByQR !== false,
          allowSearchByGroup: data?.allowSearchByGroup !== false,
          blockStrangerMessages: Boolean(data?.blockStrangerMessages),
          blockStrangerProfileView: Boolean(data?.blockStrangerProfileView),
        });
      })
      .catch(() => setAccountLocked(false));
  }, [isOpen]);

  // Load devices when sync tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'sync') return;
    setDevicesLoading(true);
    apiClient.get('/users/me/devices')
      .then((res: any) => {
        const data = res?.data ?? res;
        setDevices(Array.isArray(data) ? data : []);
      })
      .catch(() => setDevices([]))
      .finally(() => setDevicesLoading(false));
  }, [isOpen, activeTab]);

  // Load AI token usage when ai tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'ai') return;
    apiClient.get('/users/me/ai/usage/today')
      .then((res: any) => {
        const data = res?.data ?? res;
        setTokenUsage(data);
      })
      .catch(() => setTokenUsage(null));
  }, [isOpen, activeTab]);

  // Load storage stats when utils tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'utils') return;
    setStorageLoading(true);
    apiClient.get('/storage/me')
      .then((res: any) => {
        const data = res?.data ?? res;
        setStorageStats(data);
      })
      .catch(() => setStorageStats(null))
      .finally(() => setStorageLoading(false));
  }, [isOpen, activeTab]);

  const handleRemoteLogout = async (deviceId: string) => {
    if (!confirm(t('settings.devices.confirm_logout'))) return;
    try {
      await apiClient.delete(`/users/me/devices/${deviceId}`);
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      toast.success(t('settings.devices.logged_out'));
    } catch {
      toast.error(t('settings.devices.logout_failed'));
    }
  };

  const handleClearCache = () => {
    try {
      if ('caches' in window) {
        caches.keys().then(names => names.forEach(name => caches.delete(name)));
      }
      toast.success(t('settings.storage.cleared'));
    } catch {
      toast.error('Failed to clear cache');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handlePinModalClose = () => {
    setPinModalMode(null);
    setPinModalError(null);
    setPendingCurrentPin('');
  };

  const handlePinConfirm = async (pin: string) => {
    if (pinModalMode === 'setup') {
      setPinModalLoading(true);
      setPinModalError(null);
      try {
        await apiClient.post('/users/me/pin', { pin });
        toast.success(t('pin.setup_success'));
        setHasPinConfigured(true);
        handlePinModalClose();
      } catch (e: any) {
        setPinModalError(e?.message || t('pin.wrong'));
      } finally {
        setPinModalLoading(false);
      }
    } else if (pinModalMode === 'change_current') {
      // Store current PIN, advance to new PIN step
      setPendingCurrentPin(pin);
      setPinModalError(null);
      setPinModalMode('change_new');
    } else if (pinModalMode === 'change_new') {
      setPinModalLoading(true);
      setPinModalError(null);
      try {
        await apiClient.post('/users/me/pin', { pin, currentPin: pendingCurrentPin });
        toast.success(t('pin.change_success'));
        setHasPinConfigured(true);
        handlePinModalClose();
      } catch (e: any) {
        const msg = e?.message || '';
        if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('wrong') || msg.toLowerCase().includes('không chính xác')) {
          // Wrong current PIN — go back to current PIN step
          setPendingCurrentPin('');
          setPinModalMode('change_current');
          setPinModalError(t('pin.error_wrong_current'));
        } else {
          setPinModalError(msg || t('pin.wrong'));
        }
      } finally {
        setPinModalLoading(false);
      }
    }
  };

  const handleToggleAccountLock = async () => {
    setLockLoading(true);
    try {
      const newVal = !accountLocked;
      await apiClient.patch('/users/me/settings/lock', { accountLocked: newVal });
      setAccountLocked(newVal);
      toast.success(
        newVal
          ? (i18n.language === 'vi' ? 'Tài khoản đã được khóa' : 'Account locked')
          : (i18n.language === 'vi' ? 'Tài khoản đã được mở khóa' : 'Account unlocked')
      );
    } catch {
      toast.error(i18n.language === 'vi' ? 'Thao tác thất bại' : 'Operation failed');
    } finally {
      setLockLoading(false);
    }
  };

  const handlePrivacyToggle = async (key: keyof typeof privacySettings) => {
    const newVal = !privacySettings[key];
    const updated = { ...privacySettings, [key]: newVal };
    setPrivacySettings(updated);
    setPrivacySaving(true);
    try {
      await apiClient.patch('/users/me/settings/privacy', {
        show_read_receipts: updated.showReadReceipts,
        show_online_status: updated.showOnlineStatus,
        allow_search_by_phone: updated.allowSearchByPhone,
        allow_search_by_qr: updated.allowSearchByQR,
        allow_search_by_group: updated.allowSearchByGroup,
        block_stranger_messages: updated.blockStrangerMessages,
        block_stranger_profile_view: updated.blockStrangerProfileView,
      });
      toast.success(t('settings.privacy.saved'));
    } catch {
      // Revert on failure
      setPrivacySettings(prev => ({ ...prev, [key]: !newVal }));
      toast.error(t('settings.privacy.save_failed'));
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleSaveAiAccessSettings = () => {
    try {
      window.localStorage.setItem(AI_ACCESS_SETTINGS_STORAGE_KEY, JSON.stringify(aiAccessSettings));
      window.localStorage.setItem(AI_THEME_STORAGE_KEY, aiTheme);
      setAiAccessSavedAt(Date.now());
      toast.success(i18n.language === 'vi' ? 'Đã lưu cài đặt AI' : 'AI settings saved');
    } catch {
      toast.error(i18n.language === 'vi' ? 'Lưu cài đặt AI thất bại' : 'Failed to save AI settings');
    }
  };

  const aiThemeCards = [
    {
      value: 'GENERAL' as const,
      icon: '🤖',
      group: 'popular' as const,
      viTitle: 'Trợ lý Đa năng',
      enTitle: 'General Assistant',
      viDesc: 'Cân bằng cho mọi nhu cầu hằng ngày',
      enDesc: 'Balanced support for daily needs',
    },
    {
      value: 'SALES' as const,
      icon: '🛍️',
      group: 'work' as const,
      viTitle: 'Chuyên gia Bán hàng',
      enTitle: 'Sales Pro',
      viDesc: 'Caption, tư vấn khách, xử lý khiếu nại',
      enDesc: 'Captions, customer replies, complaint handling',
    },
    {
      value: 'OFFICE' as const,
      icon: '📎',
      group: 'work' as const,
      viTitle: 'Trợ lý Văn phòng',
      enTitle: 'Office Hero',
      viDesc: 'Email, biên bản họp, danh sách việc cần làm',
      enDesc: 'Emails, meeting notes, to-do lists',
    },
    {
      value: 'GLOBAL' as const,
      icon: '🌐',
      group: 'popular' as const,
      viTitle: 'Thông dịch viên',
      enTitle: 'Global Friend',
      viDesc: 'Dịch thuật tự nhiên nhiều ngôn ngữ',
      enDesc: 'Natural multi-language translation',
    },
    {
      value: 'CREATIVE' as const,
      icon: '✨',
      group: 'popular' as const,
      viTitle: 'Góc Sáng tạo',
      enTitle: 'Creative Ghostwriter',
      viDesc: 'Lời chúc, thơ, kịch bản ngắn, bắt trend',
      enDesc: 'Wishes, poems, short scripts, trendy writing',
    },
    {
      value: 'STUDY' as const,
      icon: '📚',
      group: 'work' as const,
      viTitle: 'Chuyên gia Học tập',
      enTitle: 'Study Mate',
      viDesc: 'Giải thích dễ hiểu, tóm tắt kiến thức',
      enDesc: 'Easy explanations and knowledge summaries',
    },
    {
      value: 'DEV' as const,
      icon: '💻',
      group: 'advanced' as const,
      viTitle: 'Dev Mode',
      enTitle: 'Dev Mode',
      viDesc: 'Fix bug, review code cho dân kỹ thuật',
      enDesc: 'Technical coding assistance',
    },
    {
      value: 'CODE_REVIEW' as const,
      icon: '🔍',
      group: 'advanced' as const,
      viTitle: 'Review Code',
      enTitle: 'Code Review',
      viDesc: 'Phân tích mã nguồn theo mức độ lỗi',
      enDesc: 'Severity-based code review',
    },
  ];

  const groupedThemeCards = {
    popular: aiThemeCards.filter((item) => item.group === 'popular'),
    work: aiThemeCards.filter((item) => item.group === 'work'),
    advanced: aiThemeCards.filter((item) => item.group === 'advanced'),
  };

  if (!isOpen) return null;

  const sideItems = [
    { id: 'general', label: t('settings.tabs.general'), icon: <SettingsIcon size={18} /> },
    { id: 'ai', label: t('settings.tabs.ai'), icon: <SparklesIcon size={18} /> },
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

          <div className="px-8 pb-8 overflow-y-auto flex-1 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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

                {/* PIN Management Section */}
                <section className="space-y-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.general.pin.title')}</h4>
                    <p className="text-[13px] text-[var(--sub-text)] mt-1">{t('settings.general.pin.desc')}</p>
                  </div>
                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden transition-colors duration-200">
                    <div className="p-4 px-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0068FF]/10 flex items-center justify-center flex-shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-[var(--text)]">{t('settings.general.pin.title')}</p>
                          <p className={`text-[12px] font-medium mt-0.5 ${hasPinConfigured ? 'text-green-500' : 'text-[var(--sub-text)]'}`}>
                            {hasPinConfigured === null ? '...' : hasPinConfigured ? t('settings.general.pin.status_set') : t('settings.general.pin.status_not_set')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setPinModalError(null); setPinModalMode(hasPinConfigured ? 'change_current' : 'setup'); }}
                        className="px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-[#0068FF] text-white hover:bg-[#0055CC] transition-colors cursor-pointer"
                      >
                        {hasPinConfigured ? t('settings.general.pin.change_btn') : t('settings.general.pin.setup_btn')}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-2">
                  <h4 className="text-[18px] font-semibold text-[var(--text)]">{t('settings.ai.title')}</h4>
                  <p className="text-[13px] text-[var(--sub-text)]">{t('settings.ai.desc')}</p>
                </section>

                <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden transition-colors duration-200">
                  <div className="p-4 px-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[14px] font-semibold text-[var(--text)]">{t('settings.ai.full_access.title')}</p>
                      <p className="text-[12px] text-[var(--sub-text)]">{t('settings.ai.full_access.desc')}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAiAccessSettings((prev) => ({ ...prev, allowFullDataAccess: !prev.allowFullDataAccess }))}
                      className={`w-10 h-5 shrink-0 rounded-full relative transition-all duration-200 cursor-pointer ${aiAccessSettings.allowFullDataAccess ? 'bg-[#0068FF]' : 'bg-[var(--border)] hover:opacity-80'}`}
                      aria-label={t('settings.ai.full_access.title')}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${aiAccessSettings.allowFullDataAccess ? 'left-6' : 'left-1'}`}></div>
                    </button>
                  </div>
                </section>

                <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 px-5 shadow-sm transition-colors duration-200 space-y-3">
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--text)]">
                      {i18n.language === 'vi' ? 'Chế độ AI' : 'AI Mode'}
                    </p>
                    <p className="text-[12px] text-[var(--sub-text)] mt-1">
                      {i18n.language === 'vi'
                        ? 'Chọn chế độ theo đúng nhu cầu: đời sống, công việc hoặc nâng cao.'
                        : 'Choose the response style for Fruvia Chatbot based on your current task.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[12px] font-semibold text-[var(--sub-text)] uppercase tracking-wider mb-2">
                        {i18n.language === 'vi' ? 'Nhóm phổ thông' : 'General Group'}
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {groupedThemeCards.popular.map((card) => {
                          const active = aiTheme === card.value;
                          return (
                            <button
                              key={card.value}
                              type="button"
                              onClick={() => setAiTheme(card.value)}
                              className={`rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${active
                                ? 'border-[#0068FF] bg-[#E5EFFF] dark:bg-blue-500/10'
                                : 'border-[var(--border)] hover:border-[#0068FF] hover:bg-[var(--hover-bg)]'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[16px] leading-none">{card.icon}</span>
                                {active && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#0068FF] shrink-0"><path d="m20 6-11 11-5-5" /></svg>
                                )}
                              </div>
                              <p className="text-[13px] font-semibold text-[var(--text)] mt-1.5">{i18n.language === 'vi' ? card.viTitle : card.enTitle}</p>
                              <p className="text-[11px] text-[var(--sub-text)] mt-0.5">{i18n.language === 'vi' ? card.viDesc : card.enDesc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-[12px] font-semibold text-[var(--sub-text)] uppercase tracking-wider mb-2">
                        {i18n.language === 'vi' ? 'Nhóm công việc' : 'Work Group'}
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {groupedThemeCards.work.map((card) => {
                          const active = aiTheme === card.value;
                          return (
                            <button
                              key={card.value}
                              type="button"
                              onClick={() => setAiTheme(card.value)}
                              className={`rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${active
                                ? 'border-[#0068FF] bg-[#E5EFFF] dark:bg-blue-500/10'
                                : 'border-[var(--border)] hover:border-[#0068FF] hover:bg-[var(--hover-bg)]'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[16px] leading-none">{card.icon}</span>
                                {active && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#0068FF] shrink-0"><path d="m20 6-11 11-5-5" /></svg>
                                )}
                              </div>
                              <p className="text-[13px] font-semibold text-[var(--text)] mt-1.5">{i18n.language === 'vi' ? card.viTitle : card.enTitle}</p>
                              <p className="text-[11px] text-[var(--sub-text)] mt-0.5">{i18n.language === 'vi' ? card.viDesc : card.enDesc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-[12px] font-semibold text-[var(--sub-text)] uppercase tracking-wider mb-2">
                        {i18n.language === 'vi' ? 'Nhóm nâng cao' : 'Advanced Group'}
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {groupedThemeCards.advanced.map((card) => {
                          const active = aiTheme === card.value;
                          return (
                            <button
                              key={card.value}
                              type="button"
                              onClick={() => setAiTheme(card.value)}
                              className={`rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${active
                                ? 'border-[#0068FF] bg-[#E5EFFF] dark:bg-blue-500/10'
                                : 'border-[var(--border)] hover:border-[#0068FF] hover:bg-[var(--hover-bg)]'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[16px] leading-none">{card.icon}</span>
                                {active && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#0068FF] shrink-0"><path d="m20 6-11 11-5-5" /></svg>
                                )}
                              </div>
                              <p className="text-[13px] font-semibold text-[var(--text)] mt-1.5">{i18n.language === 'vi' ? card.viTitle : card.enTitle}</p>
                              <p className="text-[11px] text-[var(--sub-text)] mt-0.5">{i18n.language === 'vi' ? card.viDesc : card.enDesc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 px-5 shadow-sm transition-colors duration-200 space-y-3">
                  <p className="text-[12px] text-[var(--sub-text)]">{t('settings.ai.browser_scope_note')}</p>
                  <div className="flex items-center justify-end gap-3">
                    {aiAccessSavedAt && (
                      <span className="text-[12px] text-[var(--sub-text)]">
                        {t('settings.ai.actions.saved_at', {
                          time: new Date(aiAccessSavedAt).toLocaleTimeString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }),
                        })}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveAiAccessSettings}
                      className="px-4 py-2 text-[13px] font-semibold rounded-lg text-white bg-[#0068FF] hover:bg-[#0058d8] transition-colors cursor-pointer"
                    >
                      {t('settings.ai.actions.save')}
                    </button>
                  </div>
                </section>

                {/* AI Persona Cards */}
                <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 px-5 shadow-sm transition-colors duration-200 space-y-3">
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--text)]">{t('settings.ai_persona.title')}</p>
                    <p className="text-[12px] text-[var(--sub-text)] mt-1">{t('settings.ai_persona.desc')}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { key: 'humorous', icon: '😂', color: '#F59E0B' },
                      { key: 'financial', icon: '💰', color: '#10B981' },
                      { key: 'japanese_teacher', icon: '🇯🇵', color: '#EF4444' },
                    ].map((persona) => {
                      const storedPersona = typeof window !== 'undefined' ? localStorage.getItem('fruvia.ai.persona') || '' : '';
                      const isActive = storedPersona === persona.key;
                      return (
                        <button
                          key={persona.key}
                          type="button"
                          onClick={() => {
                            localStorage.setItem('fruvia.ai.persona', persona.key);
                            toast.success(i18n.language === 'vi' ? 'Đã kích hoạt persona' : 'Persona activated');
                          }}
                          className={`rounded-lg border px-3 py-3 text-left transition-all cursor-pointer ${isActive
                            ? 'border-[#0068FF] bg-[#E5EFFF] dark:bg-blue-500/10'
                            : 'border-[var(--border)] hover:border-[#0068FF] hover:bg-[var(--hover-bg)]'
                            }`}
                        >
                          <span className="text-[22px] leading-none block">{persona.icon}</span>
                          <p className="text-[13px] font-semibold text-[var(--text)] mt-2">{t(`settings.ai_persona.${persona.key}`)}</p>
                          <p className="text-[11px] text-[var(--sub-text)] mt-0.5">{t(`settings.ai_persona.${persona.key}_desc`)}</p>
                          <span className={`inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-[#0068FF] text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {isActive ? t('settings.ai_persona.active') : t('settings.ai_persona.activate')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Token Quota */}
                <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 px-5 shadow-sm transition-colors duration-200 space-y-3">
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--text)]">{t('settings.token_quota.title')}</p>
                    <p className="text-[12px] text-[var(--sub-text)] mt-1">{t('settings.token_quota.desc')}</p>
                  </div>
                  {tokenUsage ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[var(--sub-text)]">{t('settings.token_quota.used')}</span>
                        <span className="text-[16px] font-bold text-[#0068FF]">
                          {tokenUsage.totalTokensToday.toLocaleString()} {t('settings.token_quota.tokens')}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#0068FF] to-[#00A3FF] rounded-full transition-all duration-500"
                          style={{width: `${Math.min((tokenUsage.totalTokensToday / 50000) * 100, 100)}%`}}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[12px] text-[var(--sub-text)]">
                        <span>{tokenUsage.requestCount} {t('settings.token_quota.requests')}</span>
                        <span>{tokenUsage.date}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[var(--sub-text)] italic">{t('settings.token_quota.no_usage')}</p>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

                {/* 1. Read Receipts */}
                <section className="space-y-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.privacy.read_receipts.title')}</h4>
                    <p className="text-[13px] text-[var(--sub-text)] mt-1">{t('settings.privacy.read_receipts.desc')}</p>
                  </div>
                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden transition-colors duration-200">
                    <div className="p-4 px-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0068FF]/10 flex items-center justify-center flex-shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m1 12 4.2 4.2a1 1 0 0 0 1.4 0L12 11"/><path d="m12 12 4.2 4.2a1 1 0 0 0 1.4 0L23 11"/></svg>
                        </div>
                        <span className="text-[14px] font-medium text-[var(--text)]">{t('settings.privacy.read_receipts.label')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrivacyToggle('showReadReceipts')}
                        disabled={privacySaving}
                        className={`w-10 h-5 shrink-0 rounded-full relative transition-all duration-200 cursor-pointer ${privacySettings.showReadReceipts ? 'bg-[#0068FF]' : 'bg-[var(--border)] hover:opacity-80'} ${privacySaving ? 'opacity-50' : ''}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${privacySettings.showReadReceipts ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </section>

                {/* 2. Online Status */}
                <section className="space-y-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.privacy.online_status.title')}</h4>
                    <p className="text-[13px] text-[var(--sub-text)] mt-1">{t('settings.privacy.online_status.desc')}</p>
                  </div>
                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden transition-colors duration-200">
                    <div className="p-4 px-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="#22C55E"/></svg>
                        </div>
                        <span className="text-[14px] font-medium text-[var(--text)]">{t('settings.privacy.online_status.label')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrivacyToggle('showOnlineStatus')}
                        disabled={privacySaving}
                        className={`w-10 h-5 shrink-0 rounded-full relative transition-all duration-200 cursor-pointer ${privacySettings.showOnlineStatus ? 'bg-[#0068FF]' : 'bg-[var(--border)] hover:opacity-80'} ${privacySaving ? 'opacity-50' : ''}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${privacySettings.showOnlineStatus ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </section>

                {/* 3. Search Sources / Friend Discovery */}
                <section className="space-y-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.privacy.search_sources.title')}</h4>
                    <p className="text-[13px] text-[var(--sub-text)] mt-1">{t('settings.privacy.search_sources.desc')}</p>
                  </div>
                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden transition-colors duration-200">
                    {/* Phone */}
                    <div className="p-4 px-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </div>
                        <span className="text-[14px] font-medium text-[var(--text)]">{t('settings.privacy.search_sources.phone')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrivacyToggle('allowSearchByPhone')}
                        disabled={privacySaving}
                        className={`w-10 h-5 shrink-0 rounded-full relative transition-all duration-200 cursor-pointer ${privacySettings.allowSearchByPhone ? 'bg-[#0068FF]' : 'bg-[var(--border)] hover:opacity-80'} ${privacySaving ? 'opacity-50' : ''}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${privacySettings.allowSearchByPhone ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="h-px bg-[var(--border)] mx-5 opacity-50"></div>
                    {/* QR */}
                    <div className="p-4 px-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M21 14h-3v7h3z"/><path d="M14 18h3v3"/></svg>
                        </div>
                        <span className="text-[14px] font-medium text-[var(--text)]">{t('settings.privacy.search_sources.qr')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrivacyToggle('allowSearchByQR')}
                        disabled={privacySaving}
                        className={`w-10 h-5 shrink-0 rounded-full relative transition-all duration-200 cursor-pointer ${privacySettings.allowSearchByQR ? 'bg-[#0068FF]' : 'bg-[var(--border)] hover:opacity-80'} ${privacySaving ? 'opacity-50' : ''}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${privacySettings.allowSearchByQR ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="h-px bg-[var(--border)] mx-5 opacity-50"></div>
                    {/* Group */}
                    <div className="p-4 px-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <span className="text-[14px] font-medium text-[var(--text)]">{t('settings.privacy.search_sources.group')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrivacyToggle('allowSearchByGroup')}
                        disabled={privacySaving}
                        className={`w-10 h-5 shrink-0 rounded-full relative transition-all duration-200 cursor-pointer ${privacySettings.allowSearchByGroup ? 'bg-[#0068FF]' : 'bg-[var(--border)] hover:opacity-80'} ${privacySaving ? 'opacity-50' : ''}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${privacySettings.allowSearchByGroup ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </section>

                {/* 4. Block Strangers */}
                <section className="space-y-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.privacy.block_strangers.title')}</h4>
                    <p className="text-[13px] text-[var(--sub-text)] mt-1">{t('settings.privacy.block_strangers.desc')}</p>
                  </div>
                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden transition-colors duration-200">
                    {/* Block stranger messages */}
                    <div className="p-4 px-5 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-[14px] font-medium text-[var(--text)]">{t('settings.privacy.block_strangers.messages')}</p>
                        <p className="text-[12px] text-[var(--sub-text)] mt-0.5">{t('settings.privacy.block_strangers.messages_desc')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrivacyToggle('blockStrangerMessages')}
                        disabled={privacySaving}
                        className={`w-10 h-5 shrink-0 rounded-full relative transition-all duration-200 cursor-pointer ${privacySettings.blockStrangerMessages ? 'bg-[#0068FF]' : 'bg-[var(--border)] hover:opacity-80'} ${privacySaving ? 'opacity-50' : ''}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${privacySettings.blockStrangerMessages ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="h-px bg-[var(--border)] mx-5 opacity-50"></div>
                    {/* Block stranger profile view */}
                    <div className="p-4 px-5 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-[14px] font-medium text-[var(--text)]">{t('settings.privacy.block_strangers.profile')}</p>
                        <p className="text-[12px] text-[var(--sub-text)] mt-0.5">{t('settings.privacy.block_strangers.profile_desc')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrivacyToggle('blockStrangerProfileView')}
                        disabled={privacySaving}
                        className={`w-10 h-5 shrink-0 rounded-full relative transition-all duration-200 cursor-pointer ${privacySettings.blockStrangerProfileView ? 'bg-[#0068FF]' : 'bg-[var(--border)] hover:opacity-80'} ${privacySaving ? 'opacity-50' : ''}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${privacySettings.blockStrangerProfileView ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </section>

                {/* Account Lock Section */}
                <section className="space-y-4">
                  <h4 className="text-[16px] font-semibold text-[var(--text)]">
                    {t('settings.privacy.lock_account.title')}
                  </h4>
                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6 shadow-sm transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <p className="text-[14px] font-medium text-[var(--text)]">
                          {t('settings.privacy.lock_account.label')}
                        </p>
                        <p className="text-[13px] text-[var(--sub-text)] mt-1">
                          {t('settings.privacy.lock_account.desc')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleAccountLock}
                        disabled={lockLoading}
                        className={`w-10 h-5 shrink-0 rounded-full relative transition-all duration-200 cursor-pointer ${
                          accountLocked ? 'bg-red-500' : 'bg-[var(--border)] hover:opacity-80'
                        } ${lockLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div
                          className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200 ${
                            accountLocked ? 'left-6' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    {accountLocked && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2">
                          <span className="text-red-500"><ShieldIcon size={16} /></span>
                          <p className="text-[13px] font-medium text-red-600 dark:text-red-400">
                            {t('settings.privacy.lock_account.warning')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab !== 'general' && activeTab !== 'interface' && activeTab !== 'ai' && activeTab !== 'privacy' && activeTab !== 'sync' && activeTab !== 'messages' && activeTab !== 'utils' && (
              <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-[var(--active-bg)] text-[var(--active-text)] flex items-center justify-center mb-4 transition-colors duration-200">
                  {(() => {
                    const activeIcon = sideItems.find((item) => item.id === activeTab)?.icon;
                    if (!activeIcon) return null;
                    return React.cloneElement(activeIcon, { size: 32 });
                  })()}
                </div>
                <p className="text-[15px] font-medium italic text-[var(--sub-text)]">{t('settings.development', { name: sideItems.find(i => i.id === activeTab)?.label })}</p>
              </div>
            )}

            {/* ==================== SYNC TAB — DEVICE MANAGEMENT ==================== */}
            {activeTab === 'sync' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.devices.title')}</h4>
                    <p className="text-[13px] text-[var(--sub-text)] mt-1">{t('settings.devices.desc')}</p>
                  </div>

                  {devicesLoading ? (
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-8 flex items-center justify-center shadow-sm">
                      <div className="w-6 h-6 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : devices.length === 0 ? (
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-8 text-center shadow-sm">
                      <p className="text-[14px] text-[var(--sub-text)]">{t('settings.devices.no_devices')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {devices.map((device, index) => (
                        <div key={device.id} className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 px-5 shadow-sm transition-colors duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#0068FF]/10 flex items-center justify-center flex-shrink-0">
                                {device.deviceType === 'MOBILE' ? (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                                ) : (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
                                )}
                              </div>
                              <div>
                                <p className="text-[14px] font-semibold text-[var(--text)]">
                                  {device.deviceName}
                                  {index === 0 && <span className="ml-2 text-[11px] text-[#0068FF] bg-[#0068FF]/10 px-2 py-0.5 rounded-full">{t('settings.devices.current_device')}</span>}
                                </p>
                                <p className="text-[12px] text-[var(--sub-text)] mt-0.5">
                                  IP: {device.ipAddress} · {t('settings.devices.login_at')}: {device.loginAt ? new Date(device.loginAt).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US') : '-'}
                                </p>
                              </div>
                            </div>
                            {index !== 0 && (
                              <button
                                onClick={() => handleRemoteLogout(device.id)}
                                className="px-3 py-1.5 text-[12px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                              >
                                {t('settings.devices.remote_logout')}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ==================== MESSAGES TAB — AUTO-DELETE ==================== */}
            {activeTab === 'messages' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.messages_settings.auto_delete.title')}</h4>
                    <p className="text-[13px] text-[var(--sub-text)] mt-1">{t('settings.messages_settings.auto_delete.desc')}</p>
                  </div>

                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden transition-colors duration-200">
                    {['off', '1d', '7d', '30d'].map((option, idx) => (
                      <React.Fragment key={option}>
                        {idx > 0 && <div className="h-px bg-[var(--border)] mx-5 opacity-50" />}
                        <label className="flex items-center justify-between p-4 px-5 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{background: option === 'off' ? 'rgba(107,114,128,0.1)' : 'rgba(239,68,68,0.1)'}}>
                              {option === 'off' ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/></svg>
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                              )}
                            </div>
                            <span className="text-[14px] font-medium text-[var(--text)]">
                              {t(`settings.messages_settings.auto_delete.${option}`)}
                            </span>
                          </div>
                          <div className="relative flex items-center">
                            <input type="radio" name="auto-delete-default" className="peer hidden" value={option} checked={autoDeleteOption === option} onChange={() => setAutoDeleteOption(option)} />
                            <div className="w-5 h-5 rounded-full border border-gray-300 peer-checked:border-[#0068FF] transition-all bg-[var(--card-bg)] flex items-center justify-center">
                              <div className={`w-[14px] h-[14px] rounded-full bg-[#0068FF] transition-transform border-[1.5px] border-[var(--card-bg)] ${autoDeleteOption === option ? 'scale-100' : 'scale-0'}`}></div>
                            </div>
                          </div>
                        </label>
                      </React.Fragment>
                    ))}
                  </div>

                  <p className="text-[12px] text-[var(--sub-text)] italic px-1">{t('settings.messages_settings.auto_delete.note')}</p>
                </section>
              </div>
            )}

            {/* ==================== UTILS TAB — STORAGE & DATA ==================== */}
            {activeTab === 'utils' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section className="space-y-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--text)]">{t('settings.storage.title')}</h4>
                    <p className="text-[13px] text-[var(--sub-text)] mt-1">{t('settings.storage.desc')}</p>
                  </div>

                  {storageLoading ? (
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-8 flex items-center justify-center shadow-sm">
                      <div className="w-6 h-6 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : storageStats ? (
                    <div className="space-y-3">
                      {/* Total size */}
                      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-5 shadow-sm transition-colors duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[14px] font-semibold text-[var(--text)]">{t('settings.storage.total_size')}</span>
                          <span className="text-[16px] font-bold text-[#0068FF]">{formatFileSize(storageStats.totalSize)}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full flex">
                            {storageStats.totalSize > 0 && (
                              <>
                                <div className="bg-blue-500 h-full" style={{width: `${(storageStats.imageSize / storageStats.totalSize) * 100}%`}} />
                                <div className="bg-purple-500 h-full" style={{width: `${(storageStats.videoSize / storageStats.totalSize) * 100}%`}} />
                                <div className="bg-green-500 h-full" style={{width: `${(storageStats.fileSize / storageStats.totalSize) * 100}%`}} />
                                <div className="bg-orange-500 h-full" style={{width: `${(storageStats.voiceSize / storageStats.totalSize) * 100}%`}} />
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Breakdown */}
                      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden transition-colors duration-200">
                        {[
                          { key: 'images', size: storageStats.imageSize, color: 'bg-blue-500', icon: '🖼️' },
                          { key: 'videos', size: storageStats.videoSize, color: 'bg-purple-500', icon: '🎬' },
                          { key: 'files', size: storageStats.fileSize, color: 'bg-green-500', icon: '📄' },
                          { key: 'voices', size: storageStats.voiceSize, color: 'bg-orange-500', icon: '🎙️' },
                        ].map((item, idx) => (
                          <React.Fragment key={item.key}>
                            {idx > 0 && <div className="h-px bg-[var(--border)] mx-5 opacity-50" />}
                            <div className="p-4 px-5 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-[18px]">{item.icon}</span>
                                <span className="text-[14px] font-medium text-[var(--text)]">{t(`settings.storage.${item.key}`)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                                <span className="text-[13px] text-[var(--sub-text)]">{formatFileSize(item.size)}</span>
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-8 text-center shadow-sm">
                      <p className="text-[14px] text-[var(--sub-text)]">{t('settings.storage.no_data')}</p>
                    </div>
                  )}

                  {/* Clear cache */}
                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 px-5 shadow-sm transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-medium text-[var(--text)]">{t('settings.storage.clear_cache')}</p>
                        <p className="text-[12px] text-[var(--sub-text)] mt-0.5">{t('settings.storage.clear_cache_desc')}</p>
                      </div>
                      <button
                        onClick={handleClearCache}
                        className="px-4 py-2 text-[13px] font-semibold rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        {t('settings.storage.clear_cache')}
                      </button>
                    </div>
                  </div>
                </section>
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
                      className={`w-10 h-5 shrink-0 rounded-full relative transition-all duration-200 cursor-pointer ${useAvatarAsBg ? 'bg-[#0068FF]' : 'bg-[var(--border)] hover:opacity-80'}`}
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

      {/* PIN Modal — single persistent instance, title/subtitle change per step */}
      {pinModalMode !== null && (
        <PinInputModal
          title={
            pinModalMode === 'setup' ? t('pin.setup_title') :
            pinModalMode === 'change_current' ? t('pin.change_current_title') :
            t('pin.change_new_title')
          }
          subtitle={
            pinModalMode === 'setup' ? t('pin.setup_subtitle') :
            pinModalMode === 'change_current' ? t('pin.change_current_subtitle') :
            t('pin.change_new_subtitle')
          }
          error={pinModalError}
          loading={pinModalLoading}
          onConfirm={handlePinConfirm}
          onClose={handlePinModalClose}
        />
      )}
    </div>
  );
}
