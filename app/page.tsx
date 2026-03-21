'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import { authService } from '@/services/authService';
import '../i18n/config';

// Icons Helpers
const SearchIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const AddUserIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>;
const PinIcon = () => <svg width="12" height="12" fill="currentColor" className="text-gray-400 rotate-45"><path d="M12.9 6.1L4.8 14.2c-.3.3-.8.3-1.1 0l-.7-.7c-.3-.3-.3-.8 0-1.1l8.1-8.1c.3-.3.8-.3 1.1 0l.7-.7c.3-.3.3-.8 0-1.1z" /><path d="M6.2 3.8L4.1 1.7c-.3-.3-.8-.3-1.1 0L1.7 3.1c-.3.3-.3.8 0 1.1l2.1 2.1c.3.3.8.3 1.1 0l1.3-1.3c-.3-.3-.3-.8 0-1.1v-.1zM11.2 8.8l-1.3 1.3c-.3.3-.8.3-1.1 0L6.7 8c-.3-.3-.3-.8 0-1.1l2.1-2.1c.3-.3.8-.3 1.1 0l2.1 2.1c.3.3.3.8 0 1.1l-.8.8z" /></svg>;

// Chat Input Toolbar Icons
const StickerIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/></svg>;
const ImagePickerIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>;
const FilePickerIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const BusinessCardIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="15" r="2"/></svg>;
const ScreenShotIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="10" height="10" x="7" y="7" rx="1"/><path d="M4 16v-2m0-4v-2c0-1.1.9-2 2-2h2m4 0h2m4 0h2c1.1 0 2 .9 2 2v2m0 4v2m0 4v2c0 1.1-.9 2-2 2h-2m-4 0h-2m-4 0h-2c-1.1 0-2-.9-2-2v-2"/></svg>;
const AaIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 13l5-10 5 10M5 19H19M7 13h10"/></svg>;
const LightningIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
const EmojiIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/></svg>;
const LikeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFC107" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 11v10h-2c-1.104 0-2-.896-2-2v-6c0-1.104.896-2 2-2h2zm16 1.157l-1.896 6.836c-.287 1.031-1.22 1.761-2.289 1.761h-8.815v-10l3.14-7.394c.328-.771 1.085-1.272 1.916-1.272h.43a1.45 1.45 0 0 1 1.45 1.45 2.112 2.112 0 0 1-.224.942l-1.326 2.652h5.5c1.45 0 2.508 1.341 2.114 2.731v.294z" />
  </svg>
);

export default function Home() {
  const { t, i18n } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'qr' | 'phone'>('qr');
  const [isClient, setIsClient] = useState(false);

  // Login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (authService.getToken()) setIsLoggedIn(true);
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loginMethod === 'qr') { setIsLoggedIn(true); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.login(username, password);
      setIsLoggedIn(true);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsLoggedIn(false);
  };

  if (!isClient) return null;
  if (isLoggedIn) return <ChatDashboard onLogout={handleLogout} />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#E6F0F8] p-4 font-sans text-[#1e293b]">
      <h1 className="mb-2 text-5xl font-black tracking-tight text-[#0068FF]">{t('login.title')}</h1>
      <p className="mb-8 max-w-xs text-center text-lg font-medium leading-tight text-gray-700">{t('login.subheading')}</p>

      <div className="w-full max-w-[400px] overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex border-b border-gray-100 uppercase">
          <button onClick={() => setLoginMethod('qr')} className={`flex-1 cursor-pointer py-4 text-xs font-bold transition-all ${loginMethod === 'qr' ? 'border-b-[3px] border-[#005ae0] text-[#005ae0]' : 'text-gray-500 hover:text-gray-700'}`}>{t('login.tabs.qr')}</button>
          <button onClick={() => setLoginMethod('phone')} className={`flex-1 cursor-pointer py-4 text-xs font-bold transition-all ${loginMethod === 'phone' ? 'border-b-[3px] border-[#005ae0] text-[#005ae0]' : 'text-gray-500 hover:text-gray-700'}`}>{t('login.tabs.phone')}</button>
        </div>

        <div className="flex flex-col items-center p-8 pb-4 min-h-[340px]">
          {loginMethod === 'qr' ? (
            <>
              <div className="relative mb-6 flex h-64 w-64 items-center justify-center rounded-lg border-2 border-gray-100 p-2 cursor-pointer" onClick={() => handleLogin()}>
                <div className="relative flex h-full w-full items-center justify-center bg-white p-2">
                  <QRCodeCanvas value="https://fruvia.chat" size={220} />
                </div>
              </div>
              <p className="mb-4 text-sm font-medium text-gray-600">{t('login.qr.hint')}</p>
            </>
          ) : (
            <form onSubmit={handleLogin} className="w-full px-2">
              <h3 className="mb-8 text-center text-sm font-bold text-gray-800">{t('login.phone.header')}</h3>
              {error && <p className="mb-4 text-center text-xs font-semibold text-red-500 bg-red-50 py-2 rounded">{error}</p>}
              <div className="mb-6 flex items-center border-b border-gray-300 py-2">
                <span className="mr-3 text-gray-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg></span>
                <span className="mr-2 text-sm font-medium">+84</span>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('login.phone.phone_placeholder')} className="w-full text-sm outline-none" />
              </div>
              <div className="mb-8 flex items-center border-b border-gray-300 py-2">
                <span className="mr-3 text-gray-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('login.phone.password_placeholder')} className="w-full text-sm outline-none" />
              </div>
              <button type="submit" disabled={loading} className="mb-4 w-full cursor-pointer rounded-md bg-[#0068FF] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400">{loading ? '...' : t('login.phone.submit')}</button>
              <div className="flex flex-col gap-3 text-center">
                <button className="cursor-pointer text-sm font-medium text-gray-500">{t('login.phone.forgot_password')}</button>
                <button onClick={() => setLoginMethod('qr')} className="cursor-pointer text-sm font-bold text-[#0068FF] hover:underline">{t('login.phone.qr_back')}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('chat');
  const conversations = [
    { id: 5, name: 'Cloud của tôi', lastMsg: 'Bạn: ngrok http 8080', time: '3 phút', active: true, pinned: true },
  ];

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-[#1e293b]">
      {/* 1. LEFT SIDEBAR (Zalo Style) */}
      <div className="w-[64px] bg-[#0068FF] flex flex-col items-center py-4 gap-2 text-white/70 shadow-inner">
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
        <div className="mt-auto w-full flex flex-col items-center">
          <button 
            className="w-full flex justify-center py-3.5 text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full flex justify-center py-4 text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 2. MIDDLE LIST */}
      <div className="w-[340px] border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 flex gap-2">
          <div className="relative flex-1 flex items-center">
            <input type="text" placeholder="Tìm kiếm" className="w-full bg-gray-100 rounded-md py-1.5 pl-8 text-[13px] outline-none" />
            <div className="absolute left-2.5 text-gray-500"><SearchIcon /></div>
          </div>
          <button className="p-1 cursor-pointer hover:bg-gray-100 rounded"><AddUserIcon /></button>
        </div>

        <div className="flex border-b border-gray-100 px-4 gap-6 text-[13px] font-semibold">
          <button className="py-2 border-b-[3px] border-[#005ae0] text-[#005ae0]">Tất cả</button>
          <button className="py-2 text-gray-500">Chưa đọc</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div key={conv.id} className="flex items-center p-4 gap-3 cursor-pointer bg-[#E5EFFF]">
              <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-blue-100 text-[#0068FF] font-bold">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L10 13.17l7.59-7.59L19 7l-8 9z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h4 className="text-[14px] font-bold truncate">{conv.name}</h4>
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-[10px] text-gray-400 shrink-0">{conv.time}</span>
                    <PinIcon />
                  </div>
                </div>
                <p className="text-[12px] text-gray-500 truncate">{conv.lastMsg}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CHAT CONTENT */}
      <div className="flex-1 flex flex-col bg-[#F4F5F7]">
        {/* HEADER */}
        <div className="h-[64px] bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-[#0068FF] font-bold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L10 13.17l7.59-7.59L19 7l-8 9z" /></svg>
            </div>
            <div>
              <h3 className="text-[15px] font-bold leading-none mb-1">Cloud của tôi</h3>
              <p className="text-[11px] text-gray-500">Truyền file giữa các thiết bị của bạn</p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-gray-500 pr-2">
            <button className="cursor-pointer hover:text-blue-500"><SearchIcon /></button>
            <button className="cursor-pointer hover:text-blue-500"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg></button>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <div className="flex justify-center my-2">
            <span className="px-3 py-1 bg-gray-200/50 rounded-full text-[11px] text-gray-500 font-medium">Hôm nay</span>
          </div>
          <div className="self-end max-w-[70%] text-right mb-2">
            <div className="bg-[#E5EFFF] p-3 rounded-lg rounded-tr-none shadow-sm text-sm border border-blue-100 inline-block text-left">
              ngrok http 8080
            </div>
            <div className="text-[10px] text-gray-400 mt-1 italic mr-1">09:24</div>
          </div>
        </div>

        {/* REFINED INPUT BAR (Like the screenshot) */}
        <div className="bg-white border-t border-gray-200">
           {/* Row 1: Actions */}
           <div className="flex items-center px-4 py-2 gap-5 text-gray-500 border-b border-gray-200">
              <button className="cursor-pointer hover:text-blue-600 transition-colors"><StickerIcon /></button>
              <button className="cursor-pointer hover:text-blue-600 transition-colors"><ImagePickerIcon /></button>
              <button className="cursor-pointer hover:text-blue-600 transition-colors"><FilePickerIcon /></button>
              <button className="cursor-pointer hover:text-blue-600 transition-colors"><ScreenShotIcon /></button>
              <button className="cursor-pointer hover:text-blue-600 transition-colors"><BusinessCardIcon /></button>
              <button className="cursor-pointer hover:text-blue-600 transition-colors"><LightningIcon /></button>
           </div>

          {/* Row 2: Text Input */}
          <div className="flex items-center px-4 py-3 gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Nhập @, tin nhắn tới Cloud của tôi"
                className="w-full outline-none text-[15px] placeholder:text-gray-400 py-1"
              />
            </div>
            <div className="flex items-center gap-2 pr-1">
              <button className="cursor-pointer text-gray-500 hover:text-blue-600 transition-colors"><EmojiIcon /></button>
              <button className="cursor-pointer text-[#fbbf24] transition-transform hover:scale-110"><LikeIcon /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
