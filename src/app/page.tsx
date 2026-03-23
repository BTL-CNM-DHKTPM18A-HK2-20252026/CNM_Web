'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '@/services/authService';
import { toast } from 'sonner';
import '../i18n/config';
import { useTheme } from '@/themes';
import { SunIcon, MoonIcon } from '@/components/ui/Icons';

// Import extracted components
import { LoginForm } from '@/components/forms/LoginForm';
import { ChatDashboard } from '@/components/common/ChatDashboard';

/**
 * Main Page Component
 * Handles the high-level authentication state and switches between 
 * the Login screen and the main Chat Dashboard.
 */
export default function Home() {
  const { t } = useTranslation();
  const { currentTheme, setCurrentTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'qr' | 'phone' | 'register'>('phone');
  const [isClient, setIsClient] = useState(false);

  // Form states
  const [username, setUsername] = useState('0901234567'); // phoneNumber (Ví dụ số hợp lệ)
  const [password, setPassword] = useState('TestUser123@');
  const [confirmPassword, setConfirmPassword] = useState('TestUser123@');
  const [firstName, setFirstName] = useState('Văn A');
  const [lastName, setLastName] = useState('Nguyễn');
  const [email, setEmail] = useState('nguyenvana@gmail.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dob, setDob] = useState('2004-04-20');
  const [gender, setGender] = useState('Nam');
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    setIsClient(true);
    const checkAuthStatus = async () => {
      const token = authService.getToken();
      if (token) {
        try {
          // Token introspection can be added here for robust validation
          setIsLoggedIn(true);
        } catch (e) {
          authService.logout();
        }
      }
    };
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('savedUsername');
    if (saved) setUsername(saved);
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loginMethod === 'qr') {
      setIsLoggedIn(true);
      return;
    }

    setLoading(true);
    setError(null);

    const trimmedPhone = username.trim();
    const trimmedEmail = email.trim();

    // Vietnamese Mobile: 10 digits, starts with 0, prefixes 3,5,7,8,9
    const phoneRegex = /^0[35789]\d{8}$/;

    // Email: basic RFC + manual checks for dots
    const validateEmail = (e: string) => {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      if (!emailRegex.test(e)) return false;
      if (e.includes('..')) return false;
      const [localPart] = e.split('@');
      if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
      return true;
    };

    try {
      // 1. Phone validation (both login and register)
      if (!phoneRegex.test(trimmedPhone)) {
        const msg = 'Số điện thoại không hợp lệ (10 chữ số, ví dụ: 0901234567)';
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (loginMethod === 'phone') {
        await authService.login(trimmedPhone, password);
        if (rememberMe) {
          localStorage.setItem('savedUsername', trimmedPhone);
        } else {
          localStorage.removeItem('savedUsername');
        }
        setIsLoggedIn(true);
      } else if (loginMethod === 'register') {
        // 2. Email validation (for registration only)
        if (!validateEmail(trimmedEmail)) {
          const msg = 'Email không hợp lệ (kiểm tra lại định dạng và các dấu chấm)';
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }

        // 3. Password strength validation (for registration only)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
        if (!passwordRegex.test(password)) {
          const msg = 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*)';
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }

        if (confirmPassword && password !== confirmPassword) {
          const msg = 'Mật khẩu xác nhận không khớp';
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }
        await authService.register({
          phoneNumber: trimmedPhone,
          email: trimmedEmail,
          password,
          displayName: `${lastName} ${firstName}`.trim(),
          firstName: firstName || '',
          lastName: lastName || '',
          dob: dob ? new Date(dob) : undefined,
          gender: gender
        });
        toast.success("Đăng ký tài khoản thành công!", {
          description: "Bây giờ bạn có thể đăng nhập bằng số điện thoại vừa đăng ký.",
          duration: 5000,
          className: "bg-white dark:bg-[#1E1E1E] border border-blue-100 dark:border-blue-900 shadow-xl",
          icon: <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg></div>
        });
        setLoginMethod('phone');
      }
    } catch (err: any) {
      const msg = err.message || (loginMethod === 'phone' ? 'Đăng nhập thất bại' : 'Đăng ký thất bại');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsLoggedIn(false);
  };

  // Prevent hydration mismatch
  if (!isClient) return null;

  // Show Chat Dashboard if logged in
  if (isLoggedIn) {
    return <ChatDashboard onLogout={handleLogout} userName={username} />;
  }

  // Show Login Screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] p-4 font-sans text-[var(--text)] transition-colors duration-300">
      {/* Theme Switcher */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
          className="w-10 h-10 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer shadow-sm group"
          title={currentTheme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        >
          {currentTheme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
        </button>
      </div>

      <div className="mb-7 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="mb-2 text-4xl font-black tracking-tighter text-[#0068FF] drop-shadow-sm">
          {t('login.title')}
        </h1>
        <p className="max-w-xs mx-auto text-[15px] font-medium leading-tight text-[var(--sub-text)] opacity-80">
          {t('login.subheading')}
        </p>
      </div>

      <LoginForm
        loginMethod={loginMethod}
        setLoginMethod={setLoginMethod}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        email={email}
        setEmail={setEmail}
        dob={dob}
        setDob={setDob}
        gender={gender}
        setGender={setGender}
        loading={loading}
        error={error}
        successMsg={successMsg}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        showConfirmPassword={showConfirmPassword}
        setShowConfirmPassword={setShowConfirmPassword}
        onSubmit={handleLogin}
        setError={setError}
        setSuccessMsg={setSuccessMsg}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
      />

      <p className="mt-8 text-xs text-gray-400 font-medium">
        © 2026 Fruvia Chat • Privacy • Terms
      </p>
    </div>
  );
}
