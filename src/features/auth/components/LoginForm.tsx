import React from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import { EyeIcon, EyeOffIcon, SparklesIcon } from '@/components/ui/Icons';

interface LoginFormProps {
  loginMethod: 'qr' | 'email' | 'register';
  setLoginMethod: (method: 'qr' | 'email' | 'register') => void;
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
  qrUuid?: string | null;
  qrLoading?: boolean;
  onRefreshQr?: () => void;
  scannedUser?: { display_name: string; avatar_url: string } | null;
  onForgotPassword?: () => void;
}

type RegisterField = 'lastName' | 'firstName' | 'username' | 'password' | 'confirmPassword';

type RegisterValues = {
  lastName: string;
  firstName: string;
  username: string;
  password: string;
  confirmPassword: string;
};

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
  qrUuid,
  qrLoading,
  onRefreshQr,
  scannedUser,
  onForgotPassword,
}: LoginFormProps) {
  const { t } = useTranslation();
  const [registerTouched, setRegisterTouched] = React.useState<Record<RegisterField, boolean>>({
    lastName: false,
    firstName: false,
    username: false,
    password: false,
    confirmPassword: false,
  });
  const [registerErrors, setRegisterErrors] = React.useState<Partial<Record<RegisterField, string>>>({});

  const getRegisterValues = React.useCallback(
    (): RegisterValues => ({
      lastName,
      firstName,
      username,
      password,
      confirmPassword: confirmPassword || '',
    }),
    [confirmPassword, firstName, lastName, password, username]
  );

  const validateRegisterValues = React.useCallback(
    (values: RegisterValues): Partial<Record<RegisterField, string>> => {
      const nextErrors: Partial<Record<RegisterField, string>> = {};

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

      if (!values.lastName.trim()) {
        nextErrors.lastName = t('login.validation.last_name_required');
      }
      if (!values.firstName.trim()) {
        nextErrors.firstName = t('login.validation.first_name_required');
      }
      const normalizedUsername = values.username.trim();
      const usernameEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      if (!usernameEmailRegex.test(normalizedUsername)) {
        nextErrors.username = t('login.validation.email_invalid');
      }
      if (!passwordRegex.test(values.password)) {
        nextErrors.password = t('login.validation.password_weak');
      }
      if (values.confirmPassword !== values.password) {
        nextErrors.confirmPassword = t('login.validation.confirm_mismatch');
      }

      return nextErrors;
    },
    [t]
  );

  const showRegisterError = React.useCallback(
    (field: RegisterField) => loginMethod === 'register' && registerTouched[field] && Boolean(registerErrors[field]),
    [loginMethod, registerErrors, registerTouched]
  );

  const handleRegisterFieldBlur = React.useCallback(
    (field: RegisterField) => {
      if (loginMethod !== 'register') return;
      setRegisterTouched((prev) => ({ ...prev, [field]: true }));
      setRegisterErrors(validateRegisterValues(getRegisterValues()));
    },
    [getRegisterValues, loginMethod, validateRegisterValues]
  );

  const updateRegisterField = React.useCallback(
    (field: RegisterField, value: string, setter: (val: string) => void) => {
      setter(value);
      if (loginMethod !== 'register') return;

      const current = getRegisterValues();
      const nextValues = { ...current, [field]: value } as RegisterValues;

      if (registerTouched[field]) {
        setRegisterErrors(validateRegisterValues(nextValues));
      }
    },
    [getRegisterValues, loginMethod, registerTouched, validateRegisterValues]
  );

  const handleFormSubmit = React.useCallback(
    (e: React.FormEvent) => {
      if (loginMethod !== 'register') {
        onSubmit(e);
        return;
      }

      const nextTouched: Record<RegisterField, boolean> = {
        lastName: true,
        firstName: true,
        username: true,
        password: true,
        confirmPassword: true,
      };

      setRegisterTouched(nextTouched);
      const nextErrors = validateRegisterValues(getRegisterValues());
      setRegisterErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) {
        e.preventDefault();
        return;
      }

      onSubmit(e);
    },
    [getRegisterValues, loginMethod, onSubmit, validateRegisterValues]
  );

  React.useEffect(() => {
    if (loginMethod === 'register') return;
    setRegisterTouched({
      lastName: false,
      firstName: false,
      username: false,
      password: false,
      confirmPassword: false,
    });
    setRegisterErrors({});
  }, [loginMethod]);

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

    if (loginMethod === 'register') {
      const nextValues: RegisterValues = {
        ...getRegisterValues(),
        password: shuffled,
        confirmPassword: shuffled,
      };
      setRegisterErrors(validateRegisterValues(nextValues));
    }
  };

  return (
    <div suppressHydrationWarning className="w-full max-w-[400px] overflow-hidden rounded-lg bg-[var(--card-bg)] border border-[var(--border)] shadow-xl animate-in fade-in zoom-in-95 duration-300">
      <div className="flex border-b border-[var(--border)] uppercase">
        <button
          onClick={() => { setLoginMethod('qr'); setError(null); setSuccessMsg(null); }}
          className={`flex-1 cursor-pointer py-4 text-xs font-bold transition-all ${loginMethod === 'qr' ? 'border-b-[3px] border-[#0068FF] text-[#0068FF]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}`}
        >
          {t('login.tabs.qr')}
        </button>
        <button
          onClick={() => { setLoginMethod('email'); setError(null); setSuccessMsg(null); }}
          className={`flex-1 cursor-pointer py-4 text-xs font-bold transition-all ${loginMethod === 'email' ? 'border-b-[3px] border-[#0068FF] text-[#0068FF]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'}`}
        >
          {t('login.tabs.email')}
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
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            {scannedUser ? (
              // View when QR is already scanned by a mobile device
              <div className="flex flex-col items-center gap-6 py-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-[#0068FF] to-[#00C2FF] rounded-full blur opacity-5 transition duration-500"></div>
                  <div className="relative h-28 w-28 rounded-full overflow-hidden border-[0.5px] border-black/10 dark:border-white/10 shadow-lg">
                    <img
                      src={scannedUser.avatar_url || "/default/image1.jpg"}
                      alt={scannedUser.display_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-xl font-semibold text-[var(--text)] mb-1 opacity-90">
                    {scannedUser.display_name}
                  </h3>
                  <p className="text-sm text-[var(--sub-text)] font-medium opacity-70">
                    {t('login.qr.confirm_on_phone')}
                  </p>
                </div>

                <p className="text-xs text-[var(--sub-text)] text-center px-4 leading-relaxed opacity-60" dangerouslySetInnerHTML={{ __html: t('login.qr.allow_hint') }} />

                <button
                  onClick={onRefreshQr}
                  className="mt-6 text-sm text-[#0068FF]/80 font-semibold hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <SparklesIcon size={14} />
                  {t('login.qr.switch_account')}
                </button>
              </div>
            ) : (
              // Standard QR scan view
              <>
                <div className="relative mb-6 flex h-64 w-64 items-center justify-center rounded-lg border-2 border-[var(--border)] p-2 cursor-pointer transition-transform hover:scale-102 overflow-hidden" onClick={onRefreshQr}>
                  <div className={`relative flex h-full w-full items-center justify-center bg-white p-2 rounded transition-opacity duration-300 ${qrLoading ? 'opacity-20' : 'opacity-100'}`}>
                    {qrUuid ? (
                      <QRCodeCanvas value={`frv:auth:${qrUuid}`} size={220} />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <svg className="animate-spin h-8 w-8 text-[#0068FF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>

                  {(qrLoading || !qrUuid) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-[#0068FF] animate-spin"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {qrUuid && !qrLoading && (
                    <div className="absolute top-2 right-2 p-1.5 bg-white shadow-md rounded-full text-[#0068FF] hover:bg-blue-50 transition-colors" title={t('login.qr.refresh')} onClick={(e) => { e.stopPropagation(); onRefreshQr?.(); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                    </div>
                  )}
                </div>
                <p className="mb-4 text-xs font-semibold text-[var(--sub-text)] text-center max-w-[240px] leading-tight">
                  {qrLoading ? t('login.qr.loading') : t('login.qr.hint')}
                </p>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} noValidate className="w-full px-2">
            <h3 className="mb-8 text-center text-sm font-bold text-[var(--text)]">
              {loginMethod === 'email' ? t('login.email.header') : t('login.register.header')}
            </h3>

            {loginMethod === 'register' && (
              <>
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">{t('login.register.last_name')}</span>
                    <div className={`flex items-center border-b border-[var(--border)] py-2 focus-within:border-[#0068FF] transition-colors group ${showRegisterError('lastName') ? 'border-red-500' : ''}`}>
                      <span className="mr-3 text-gray-400 group-focus-within:text-[#0068FF] transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /></svg></span>
                      <input type="text" value={lastName} onChange={(e) => updateRegisterField('lastName', e.target.value, setLastName)} onBlur={() => handleRegisterFieldBlur('lastName')} placeholder={t('login.register.last_name_placeholder')} className="w-full bg-transparent text-[13px] font-medium outline-none text-[var(--text)]" required />
                    </div>
                    {showRegisterError('lastName') && <p className="mt-1 text-xs text-red-500">{registerErrors.lastName}</p>}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">{t('login.register.first_name')}</span>
                    <div className={`flex items-center border-b border-[var(--border)] py-2 focus-within:border-[#0068FF] transition-colors group ${showRegisterError('firstName') ? 'border-red-500' : ''}`}>
                      <span className="mr-3 text-gray-400 group-focus-within:text-[#0068FF] transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /></svg></span>
                      <input type="text" value={firstName} onChange={(e) => updateRegisterField('firstName', e.target.value, setFirstName)} onBlur={() => handleRegisterFieldBlur('firstName')} placeholder={t('login.register.first_name_placeholder')} className="w-full bg-transparent text-[13px] font-medium outline-none text-[var(--text)]" required />
                    </div>
                    {showRegisterError('firstName') && <p className="mt-1 text-xs text-red-500">{registerErrors.firstName}</p>}
                  </div>
                </div>

              </>
            )}

            {loginMethod === 'register' ? (
              <div className="mb-6 flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">{t('login.register.email_login_label')}</span>
                <div className={`flex items-center border-b border-[var(--border)] py-2.5 focus-within:border-[#0068FF] transition-colors text-[var(--text)] ${showRegisterError('username') ? 'border-red-500' : ''}`}>
                  <span
                    className="mr-3 text-gray-400 cursor-help transition-colors hover:text-[#0068FF]"
                    title={t('login.register.email_hint')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input type="email" value={username} onChange={(e) => updateRegisterField('username', e.target.value, setUsername)} onBlur={() => handleRegisterFieldBlur('username')} placeholder={t('login.register.email_login_placeholder')} className="w-full bg-transparent text-sm outline-none font-medium" required />
                </div>
                {showRegisterError('username') && <p className="mt-1 text-xs text-red-500">{registerErrors.username}</p>}
              </div>
            ) : (
              <div className="mb-6 flex items-center border-b border-[var(--border)] py-2.5 focus-within:border-[#0068FF] transition-colors text-[var(--text)]">
                <span
                  className="mr-3 text-gray-400 cursor-help transition-colors hover:text-[#0068FF]"
                  title={t('login.email.hint')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('login.email.email_placeholder')} className="w-full bg-transparent text-sm outline-none font-medium" required />
              </div>
            )}

            {loginMethod === 'register' ? (
              <div className="mb-8 flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">{t('login.register.password_label')}</span>
                <div className={`flex items-center border-b border-[var(--border)] py-2.5 relative focus-within:border-[#0068FF] transition-colors group/pwd ${showRegisterError('password') ? 'border-red-500' : ''}`}>
                  <span
                    className="mr-3 text-gray-400 cursor-help transition-colors hover:text-[#0068FF]"
                    title={t('login.register.confirm_password_hint')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => updateRegisterField('password', e.target.value, setPassword)}
                    onBlur={() => handleRegisterFieldBlur('password')}
                    placeholder={t('login.register.password_placeholder')}
                    className="w-full bg-transparent text-sm outline-none pr-10 text-[var(--text)]"
                    required
                  />
                  <div className="absolute right-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-gray-400 hover:text-[#0068FF] focus:outline-none cursor-pointer transition-colors"
                      title={t('login.register.password_hint')}
                    >
                      <SparklesIcon size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-[#0068FF] focus:outline-none cursor-pointer scale-90 transition-colors"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                {showRegisterError('password') && <p className="mt-1 text-xs text-red-500">{registerErrors.password}</p>}
              </div>
            ) : (
              <div className="mb-8 flex items-center border-b border-[var(--border)] py-2.5 relative focus-within:border-[#0068FF] transition-colors group/pwd">
                <span
                  className="mr-3 text-gray-400 cursor-help transition-colors hover:text-[#0068FF]"
                  title={t('login.register.confirm_password_hint')}
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
                  placeholder={t('login.email.password_placeholder')}
                  className="w-full bg-transparent text-sm outline-none pr-10 text-[var(--text)]"
                  required
                />
                <div className="absolute right-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-[#0068FF] focus:outline-none cursor-pointer scale-90 transition-colors"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
            )}

            {loginMethod === 'email' && (
              <div className="mb-6 flex items-center">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-[#0068FF] border-[#0068FF]' : 'bg-transparent border-[var(--border)] group-hover:border-[#0068FF]'}`}>
                    {rememberMe && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </div>
                  <input type="checkbox" className="hidden" checked={rememberMe} onChange={(e) => setRememberMe?.(e.target.checked)} />
                  <span className="text-[13px] text-[var(--sub-text)] font-medium group-hover:text-[var(--text)] transition-colors select-none">{t('login.email.remember_me')}</span>
                </label>
              </div>
            )}

            {loginMethod === 'register' && (
              <div className="mb-8 flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">{t('login.register.confirm_password_label')}</span>
                <div className={`flex items-center border-b border-[var(--border)] py-2.5 relative focus-within:border-[#0068FF] transition-colors ${showRegisterError('confirmPassword') ? 'border-red-500' : ''}`}>
                  <span className="mr-3 text-gray-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => updateRegisterField('confirmPassword', e.target.value, (val) => setConfirmPassword?.(val))}
                    onBlur={() => handleRegisterFieldBlur('confirmPassword')}
                    placeholder={t('login.register.confirm_password_placeholder')}
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
                {showRegisterError('confirmPassword') && <p className="mt-1 text-xs text-red-500">{registerErrors.confirmPassword}</p>}
              </div>
            )}

            <button type="submit" disabled={loading} className="mb-4 w-full cursor-pointer rounded-md bg-[#0068FF] py-3 text-sm font-bold text-white transition-all hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 disabled:bg-gray-300">
              {loading ? '...' : (loginMethod === 'email' ? t('login.email.submit') : t('login.register.register_btn'))}
            </button>

            <div className="flex flex-col gap-3 text-center">
              {loginMethod === 'email' && (
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="cursor-pointer text-[13px] font-semibold text-[#dc2626] hover:text-[#b91c1c]"
                >
                  {t('login.email.forgot_password')}
                </button>
              )}
              <button type="button" onClick={() => setLoginMethod('qr')} className="cursor-pointer text-sm font-bold text-[#0068FF] hover:underline">
                {t('login.email.qr_back')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
