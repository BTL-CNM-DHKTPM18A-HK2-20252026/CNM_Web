'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import '../i18n/config'; // Import the i18n config

export default function Home() {
  const { t, i18n } = useTranslation();
  const [loginMethod, setLoginMethod] = useState<'qr' | 'phone'>('qr');
  const [isClient, setIsClient] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  if (!isClient) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#E6F0F8] p-4 font-sans text-[#1e293b]">
      {/* Fruvia Logo and Name */}
      <div className="mb-2 flex flex-col items-center gap-2">
        <h1 className="text-5xl font-black tracking-tight text-[#0068FF]">
          {t('login.title')}
        </h1>
      </div>
      
      {/* Subheading */}
      <p className="mb-8 max-w-xs text-center text-lg font-medium leading-tight text-gray-700">
        {t('login.subheading')}
      </p>

      {/* Main Login Card */}
      <div className="w-full max-w-[400px] overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Card Header / Tabs */}
        <div className="flex border-b border-gray-100 uppercase">
          <button 
            onClick={() => setLoginMethod('qr')}
            className={`flex-1 cursor-pointer py-4 text-xs font-bold transition-all ${
              loginMethod === 'qr' 
                ? 'border-b-2 border-[#0068FF] text-[#0068FF]' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('login.tabs.qr')}
          </button>
          <button 
            onClick={() => setLoginMethod('phone')}
            className={`flex-1 cursor-pointer py-4 text-xs font-bold transition-all ${
              loginMethod === 'phone' 
                ? 'border-b-2 border-[#0068FF] text-[#0068FF]' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('login.tabs.phone')}
          </button>
        </div>

        {/* Card Body */}
        <div className="flex flex-col items-center p-8 pb-4 min-h-[340px]">
          {loginMethod === 'qr' ? (
            /* QR Code Section */
            <>
              <div className="relative mb-6 flex h-64 w-64 items-center justify-center rounded-lg border-2 border-gray-100 p-2">
                <div className="relative flex h-full w-full items-center justify-center bg-white p-2">
                  <div className="grid grid-cols-10 gap-0.5 opacity-20 w-full h-full">
                    {[...Array(100)].map((_, i) => (
                      <div key={i} className="h-full w-full bg-black"></div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90">
                    <p className="mb-4 text-xs text-center text-gray-600 font-medium px-8">{t('login.qr.expired')}</p>
                    <button className="cursor-pointer rounded-md bg-[#0068FF] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-600 shadow-md">
                      {t('login.qr.refresh')}
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="mb-4 text-sm font-medium text-gray-600">{t('login.qr.hint')}</p>
              </div>
            </>
          ) : (
            /* Phone Number / Password Section */
            <div className="w-full px-2">
              <h3 className="mb-8 text-center text-sm font-bold text-gray-800">{t('login.phone.header')}</h3>
              
              {/* Phone Input */}
              <div className="mb-6 flex items-center border-b border-gray-300 py-2 transition-colors focus-within:border-[#0068FF]">
                <span className="mr-3 text-gray-400">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                </span>
                <span className="mr-2 text-sm font-medium">+84</span>
                <span className="mr-3 scale-75 text-gray-400">▼</span>
                <input 
                  type="text" 
                  placeholder={t('login.phone.phone_placeholder')}
                  className="w-full text-sm outline-none placeholder:text-gray-400"
                />
              </div>

              {/* Password Input */}
              <div className="mb-8 flex items-center border-b border-gray-300 py-2 transition-colors focus-within:border-[#0068FF]">
                <span className="mr-3 text-gray-400">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input 
                  type="password" 
                  placeholder={t('login.phone.password_placeholder')}
                  className="w-full text-sm outline-none placeholder:text-gray-400"
                />
              </div>

              <button className="mb-4 w-full cursor-pointer rounded-md bg-[#0068FF] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600">
                {t('login.phone.submit')}
              </button>

              <div className="flex flex-col gap-3 text-center">
                <button className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">{t('login.phone.forgot_password')}</button>
                <button 
                  onClick={() => setLoginMethod('qr')}
                  className="cursor-pointer text-sm font-bold text-[#0068FF] hover:underline"
                >
                  {t('login.phone.qr_back')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Promo Section */}
        <div className="mx-4 mb-4 mt-2 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-100 text-[#0068FF]">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9"/><rect width="20" height="3" x="2" y="16" rx="1"/></svg>
          </div>
          <div className="flex-1">
            <h4 className="text-[11px] font-bold text-gray-800 leading-tight">{t('login.promo.title')}</h4>
            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
              {t('login.promo.desc')}
            </p>
          </div>
          <button className="cursor-pointer rounded bg-[#0068FF] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-blue-600 shrink-0">
            {t('login.promo.download')}
          </button>
        </div>
      </div>

      {/* Language Footer */}
      <div className="mt-8 flex gap-6 text-[13px] font-medium text-[#0068FF]">
        <button 
          onClick={() => changeLanguage('vi')}
          className={`cursor-pointer hover:underline ${i18n.language === 'vi' ? 'font-bold underline' : 'text-gray-400'}`}
        >
          Tiếng Việt
        </button>
        <button 
          onClick={() => changeLanguage('en')}
          className={`cursor-pointer hover:underline ${i18n.language === 'en' ? 'font-bold underline' : 'text-gray-400'}`}
        >
          English
        </button>
      </div>
    </div>
  );
}
