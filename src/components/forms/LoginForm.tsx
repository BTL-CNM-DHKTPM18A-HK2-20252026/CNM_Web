import React from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import { EyeIcon, EyeOffIcon } from '@/components/ui/Icons';

interface LoginFormProps {
  loginMethod: 'qr' | 'phone' | 'register';
  setLoginMethod: (method: 'qr' | 'phone' | 'register') => void;
  username: string;
  setUsername: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  firstName: string;
  setFirstName: (val: string) => void;
  lastName: string;
  setLastName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  loading: boolean;
  error: string | null;
  successMsg: string | null;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  confirmPassword?: string;
  setConfirmPassword?: (val: string) => void;
  showConfirmPassword?: boolean;
  setShowConfirmPassword?: (show: boolean) => void;
  onSubmit: (e?: React.FormEvent) => void;
  setError: (err: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export function LoginForm({
  loginMethod,
  setLoginMethod,
  username,
  setUsername,
  password,
  setPassword,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  loading,
  error,
  successMsg,
  showPassword,
  setShowPassword,
  confirmPassword,
  setConfirmPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  onSubmit,
  setError,
  setSuccessMsg,
}: LoginFormProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-lg bg-[var(--card-bg)] border border-[var(--border)] shadow-xl animate-in fade-in zoom-in-95 duration-300">
      <div className="flex border-b border-[var(--border)] uppercase">
        <button 
          onClick={() => { setLoginMethod('qr'); setError(null); setSuccessMsg(null); }} 
          className={`flex-1 cursor-pointer py-4 text-xs font-bold transition-all ${loginMethod === 'qr' ? 'border-b-[3px] border-[#0068FF] text-[#0068FF]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}`}
        >
          {t('login.tabs.qr')}
        </button>
        <button 
          onClick={() => { setLoginMethod('phone'); setError(null); setSuccessMsg(null); }} 
          className={`flex-1 cursor-pointer py-4 text-xs font-bold transition-all ${loginMethod === 'phone' ? 'border-b-[3px] border-[#0068FF] text-[#0068FF]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}`}
        >
          {t('login.tabs.phone')}
        </button>
        <button 
          onClick={() => { setLoginMethod('register'); setError(null); setSuccessMsg(null); }} 
          className={`flex-1 cursor-pointer py-4 text-xs font-bold transition-all ${loginMethod === 'register' ? 'border-b-[3px] border-[#0068FF] text-[#0068FF]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}`}
        >
          {t('login.tabs.register')}
        </button>
      </div>

      <div className="flex flex-col items-center p-8 pb-4 min-h-[340px]">
        {loginMethod === 'qr' ? (
          <>
            <div className="relative mb-6 flex h-64 w-64 items-center justify-center rounded-lg border-2 border-[var(--border)] p-2 cursor-pointer transition-transform hover:scale-102" onClick={() => onSubmit()}>
              <div className="relative flex h-full w-full items-center justify-center bg-white p-2 rounded">
                <QRCodeCanvas value="https://fruvia.chat" size={220} />
              </div>
            </div>
            <p className="mb-4 text-sm font-medium text-[var(--sub-text)]">{t('login.qr.hint')}</p>
          </>
        ) : (
          <form onSubmit={onSubmit} className="w-full px-2">
            <h3 className="mb-8 text-center text-sm font-bold text-[var(--text)]">
              {loginMethod === 'phone' ? t('login.phone.header') : 'Tạo tài khoản mới'}
            </h3>
            
            {loginMethod === 'register' && (
              <>
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div className="flex items-center border-b border-[var(--border)] py-2.5 focus-within:border-[#0068FF] transition-colors">
                    <span className="mr-3 text-gray-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg></span>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Họ" className="w-full bg-transparent text-sm outline-none text-[var(--text)]" required />
                  </div>
                  <div className="flex items-center border-b border-[var(--border)] py-2.5 focus-within:border-[#0068FF] transition-colors">
                    <span className="mr-3 text-gray-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg></span>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tên" className="w-full bg-transparent text-sm outline-none text-[var(--text)]" required />
                  </div>
                </div>
                <div className="mb-6 flex items-center border-b border-[var(--border)] py-2.5 focus-within:border-[#0068FF] transition-colors">
                  <span className="mr-3 text-gray-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-transparent text-sm outline-none text-[var(--text)]" required />
                </div>
              </>
            )}

            <div className="mb-6 flex items-center border-b border-[var(--border)] py-2.5 focus-within:border-[#0068FF] transition-colors text-[var(--text)]">
              <span className="mr-3 text-gray-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg></span>
              <span className="mr-2 text-sm font-bold">+84</span>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('login.phone.phone_placeholder')} className="w-full bg-transparent text-sm outline-none font-medium" required />
            </div>
            
            <div className="mb-8 flex items-center border-b border-[var(--border)] py-2.5 relative focus-within:border-[#0068FF] transition-colors">
              <span className="mr-3 text-gray-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder={t('login.phone.password_placeholder')} 
                className="w-full bg-transparent text-sm outline-none pr-10 text-[var(--text)]" 
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 text-gray-400 hover:text-[#0068FF] focus:outline-none cursor-pointer scale-90"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            
            {loginMethod === 'register' && (
              <div className="mb-8 flex items-center border-b border-[var(--border)] py-2.5 relative focus-within:border-[#0068FF] transition-colors">
                <span className="mr-3 text-gray-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword?.(e.target.value)} 
                  placeholder="Xác nhận mật khẩu" 
                  className="w-full bg-transparent text-sm outline-none pr-10 text-[var(--text)]" 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword?.(!showConfirmPassword)}
                  className="absolute right-0 text-gray-400 hover:text-[#0068FF] focus:outline-none cursor-pointer scale-90"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="mb-4 w-full cursor-pointer rounded-md bg-[#0068FF] py-3 text-sm font-bold text-white transition-all hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 disabled:bg-gray-300">
              {loading ? '...' : (loginMethod === 'phone' ? t('login.phone.submit') : 'Đăng ký tài khoản')}
            </button>

            {error && <p className="mb-4 text-center text-[13px] font-medium text-red-500 animate-in slide-in-from-top-1">{error}</p>}
            {successMsg && <p className="mb-4 text-center text-[13px] font-medium text-green-600 animate-in slide-in-from-top-1">{successMsg}</p>}
            
            <div className="flex flex-col gap-3 text-center">
              {loginMethod === 'phone' && (
                <button type="button" className="cursor-pointer text-[13px] font-medium text-[var(--sub-text)] hover:text-[var(--text)]">{t('login.phone.forgot_password')}</button>
              )}
              <button type="button" onClick={() => setLoginMethod('qr')} className="cursor-pointer text-sm font-bold text-[#0068FF] hover:underline">
                {t('login.phone.qr_back')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
