import React from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import { EyeIcon, EyeOffIcon, SparklesIcon } from '@/components/ui/Icons';

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
  dob?: string;
  setDob?: (val: string) => void;
  gender?: string;
  setGender?: (val: string) => void;
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
  rememberMe?: boolean;
  setRememberMe?: (val: boolean) => void;
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
  dob,
  setDob,
  gender,
  setGender,
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
  rememberMe,
  setRememberMe,
}: LoginFormProps) {
  const { t } = useTranslation();
  const [isGenderOpen, setIsGenderOpen] = React.useState(false);
  
  const handleGeneratePassword = () => {
    const lowers = "abcdefghijklmnopqrstuvwxyz";
    const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const specials = "!@#$%^&*";
    const all = lowers + uppers + numbers + specials;
    
    let generated = "";
    // Guaranteed diversity (2 of each)
    for (let i = 0; i < 2; i++) {
      generated += lowers.charAt(Math.floor(Math.random() * lowers.length));
      generated += uppers.charAt(Math.floor(Math.random() * uppers.length));
      generated += numbers.charAt(Math.floor(Math.random() * numbers.length));
      generated += specials.charAt(Math.floor(Math.random() * specials.length));
    }
    // Add 4 more random to reach 12
    for (let i = 0; i < 4; i++) {
      generated += all.charAt(Math.floor(Math.random() * all.length));
    }
    // Shuffle the result
    const shuffled = generated.split('').sort(() => Math.random() - 0.5).join('');
    
    setPassword(shuffled);
    if (setConfirmPassword) setConfirmPassword(shuffled);
    setShowPassword(true);
    if (setShowConfirmPassword) setShowConfirmPassword(true);
  };

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
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Họ</span>
                    <div className="flex items-center border-b border-[var(--border)] py-2 focus-within:border-[#0068FF] transition-colors group">
                      <span className="mr-3 text-gray-400 group-focus-within:text-[#0068FF] transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg></span>
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nhập họ..." className="w-full bg-transparent text-[13px] font-medium outline-none text-[var(--text)]" required />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Tên</span>
                    <div className="flex items-center border-b border-[var(--border)] py-2 focus-within:border-[#0068FF] transition-colors group">
                      <span className="mr-3 text-gray-400 group-focus-within:text-[#0068FF] transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg></span>
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nhập tên..." className="w-full bg-transparent text-[13px] font-medium outline-none text-[var(--text)]" required />
                    </div>
                  </div>
                </div>
                <div className="mb-6 flex flex-col">
                  <span className="text-[11px] font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Email</span>
                  <div className="flex items-center border-b border-[var(--border)] py-2 focus-within:border-[#0068FF] transition-colors group">
                    <span 
                      className="mr-3 text-gray-400 group-focus-within:text-[#0068FF] transition-colors cursor-help hover:text-[#0068FF]" 
                      title="Sử dụng định dạng email hợp lệ (ví dụ: user@example.com). Không dùng dấu chấm liên tiếp .."
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" className="w-full bg-transparent text-[13px] font-medium outline-none text-[var(--text)]" required />
                  </div>
                </div>
                <div className="mb-6 flex space-x-4 items-center">
                  <div className="flex-1 flex flex-col">
                    <span className="text-[11px] font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Ngày sinh</span>
                    <div className="flex items-center border-b border-[var(--border)] py-2 focus-within:border-[#0068FF] transition-colors group cursor-pointer">
                      <span className="mr-3 text-gray-400 group-focus-within:text-[#0068FF] transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      </span>
                      <input 
                        type="date" 
                        value={dob} 
                        onChange={(e) => setDob?.(e.target.value)} 
                        className="w-full bg-transparent text-[13px] font-medium outline-none text-[var(--text)] cursor-pointer" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col relative">
                    <span className="text-[11px] font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Giới tính</span>
                    <div 
                      className="flex items-center border-b border-[var(--border)] py-2 cursor-pointer focus-within:border-[#0068FF] transition-colors group"
                      onClick={() => setIsGenderOpen(!isGenderOpen)}
                    >
                      <span className="mr-3 text-gray-400 group-hover:text-[#0068FF] transition-colors transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2C9.24 2 7 4.24 7 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM12 14c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5z"/></svg>
                      </span>
                      <span className="w-full bg-transparent text-[13px] font-medium text-[var(--text)] select-none">
                        {gender || 'Nam'}
                      </span>
                      <span className={`ml-auto text-gray-400 transition-transform duration-200 ${isGenderOpen ? 'rotate-180' : ''}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                      </span>
                    </div>

                    {isGenderOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsGenderOpen(false)}></div>
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card-bg)] shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                          {['Nam', 'Nữ', 'Khác'].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                setGender?.(val);
                                setIsGenderOpen(false);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-[13px] font-bold transition-all cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-600/10 ${gender === val ? 'text-[#0068FF] bg-blue-50/80 dark:bg-blue-600/20' : 'text-[var(--text)]'}`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="mb-6 flex items-center border-b border-[var(--border)] py-2.5 focus-within:border-[#0068FF] transition-colors text-[var(--text)]">
              <span 
                className="mr-3 text-gray-400 cursor-help transition-colors hover:text-[#0068FF]" 
                title="Số điện thoại di động Việt Nam: Gồm 10 chữ số và bắt đầu bằng các đầu số: 03, 05, 07, 08, 09"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                  <path d="M12 18h.01" />
                </svg>
              </span>
              <span className="mr-2 text-sm font-bold">+84</span>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('login.phone.phone_placeholder')} className="w-full bg-transparent text-sm outline-none font-medium" required />
            </div>
            
            <div className="mb-8 flex items-center border-b border-[var(--border)] py-2.5 relative focus-within:border-[#0068FF] transition-colors group/pwd">
              <span 
                className="mr-3 text-gray-400 cursor-help transition-colors hover:text-[#0068FF]" 
                title="Mật khẩu mạnh: Ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder={t('login.phone.password_placeholder')} 
                className="w-full bg-transparent text-sm outline-none pr-10 text-[var(--text)]" 
                required 
              />
              <div className="absolute right-0 flex items-center gap-2">
                {loginMethod === 'register' && (
                  <button 
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-gray-400 hover:text-[#0068FF] focus:outline-none cursor-pointer transition-colors"
                    title="Tạo mật khẩu mạnh"
                  >
                    <SparklesIcon size={16} />
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-[#0068FF] focus:outline-none cursor-pointer scale-90 transition-colors"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {loginMethod === 'phone' && (
              <div className="mb-6 flex items-center">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-[#0068FF] border-[#0068FF]' : 'bg-transparent border-[var(--border)] group-hover:border-[#0068FF]'}`}>
                    {rememberMe && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  <input type="checkbox" className="hidden" checked={rememberMe} onChange={(e) => setRememberMe?.(e.target.checked)} />
                  <span className="text-[13px] text-[var(--sub-text)] font-medium group-hover:text-[var(--text)] transition-colors select-none">Ghi nhớ hồ sơ</span>
                </label>
              </div>
            )}
            
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
