'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '@/services/authService';
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
  const [username, setUsername] = useState('0123456789'); // phoneNumber
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

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loginMethod === 'qr') { 
      setIsLoggedIn(true); 
      return; 
    }
    
    setLoading(true);
    setError(null);
    try {
      if (loginMethod === 'phone') {
        await authService.login(username, password);
        setIsLoggedIn(true);
      } else if (loginMethod === 'register') {
        if (password !== confirmPassword) {
          setError('Mật khẩu xác nhận không khớp');
          setLoading(false);
          return;
        }
        await authService.register({ 
          phoneNumber: username, 
          email: email || '', 
          password, 
          displayName: `${lastName} ${firstName}`.trim(),
          firstName: firstName || '',
          lastName: lastName || ''
        });
        setSuccessMsg('Đăng ký thành công! Hãy đăng nhập.');
        setLoginMethod('phone');
      }
    } catch (err: any) {
      setError(err.message || (loginMethod === 'phone' ? 'Đăng nhập thất bại' : 'Đăng ký thất bại'));
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
      />
      
      <p className="mt-8 text-xs text-gray-400 font-medium">
        © 2026 Fruvia Chat • Privacy • Terms
      </p>
    </div>
  );
}
