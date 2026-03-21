'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '@/services/authService';
import '../i18n/config';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'qr' | 'phone' | 'register'>('phone');
  const [isClient, setIsClient] = useState(false);

  // Form states
  const [username, setUsername] = useState('0399614016'); // phoneNumber
  const [password, setPassword] = useState('TestUser123@');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
        await authService.register({ 
          phoneNumber: username, 
          email, 
          password, 
          displayName 
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
    return <ChatDashboard onLogout={handleLogout} />;
  }

  // Show Login Screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#E6F0F8] p-4 font-sans text-[#1e293b] selection:bg-blue-100">
      <div className="mb-7 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="mb-2 text-4xl font-black tracking-tighter text-black drop-shadow-sm">
          {t('login.title')}
        </h1>
        <p className="max-w-xs mx-auto text-[15px] font-medium leading-tight text-gray-500 opacity-80">
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
        displayName={displayName}
        setDisplayName={setDisplayName}
        email={email}
        setEmail={setEmail}
        loading={loading}
        error={error}
        successMsg={successMsg}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
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
