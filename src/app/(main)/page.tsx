'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '@/features/auth';
import { toast } from 'sonner';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import '@/i18n/config';
import { useTheme } from '@/themes';
import { SunIcon, MoonIcon } from '@/components/ui/Icons';

// Import extracted components
import { ForgotPasswordForm, LoginForm, OtpVerificationForm } from '@/features/auth';
import { ChatDashboard } from '@/features/chat';

interface MainHomeProps {
  initialChatId?: string;
}

/**
 * Main Page Component
 * Handles the high-level authentication state and switches between 
 * the Login screen and the main Chat Dashboard.
 */
export function MainHome({ initialChatId }: MainHomeProps) {
  const { t } = useTranslation();
  const { currentTheme, setCurrentTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'qr' | 'phone' | 'register'>('phone');
  const [isClient, setIsClient] = useState(false);
  const [scannedUser, setScannedUser] = useState<{ display_name: string; avatar_url: string } | null>(null);

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
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dob, setDob] = useState('2004-04-20');
  const [gender, setGender] = useState('Nam');
  const [rememberMe, setRememberMe] = useState(true);
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [qrUuid, setQrUuid] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const checkAuthStatus = async () => {
      const token = authService.getToken();
      if (token) {
        try {
          // Token introspection can be added here for robust validation
          setIsLoggedIn(true);
        } catch {
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

  const connectWebSocket = useCallback((uuid: string) => {
    // If there's an existing client, deactivate it first
    if (stompClient) {
      stompClient.deactivate();
    }

    const socket = new SockJS(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ws`);
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        if (process.env.NODE_ENV === 'development') console.log('STOMP:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      console.log('Connected to WebSocket for QR login:', uuid);
      client.subscribe(`/topic/qr-login/${uuid}`, (message) => {
        try {
          const result = JSON.parse(message.body);

          // Handle Scanned state (show user info before login)
          if (result.message === 'SCANNED' && result.data) {
            setScannedUser({
              display_name: result.data.display_name,
              avatar_url: result.data.avatar_url
            });
            return;
          }

          const token = result.data.access_token;
          authService.setToken(token);
          setIsLoggedIn(true);
        } catch (e) {
          console.error('Error parsing QR login message:', e);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('STOMP Error:', frame.headers['message']);
    };

    client.onWebSocketClose = () => {
      console.log('WebSocket connection closed');
    };

    client.activate();
    setStompClient(client);
  }, [stompClient]);

  const fetchQrSession = useCallback(async () => {
    setQrLoading(true);
    setScannedUser(null); // Reset scanned user when refreshing QR
    try {
      const uuid = await authService.getQrSession();
      setQrUuid(uuid);
      // Start listening for WebSocket updates for this UUID
      connectWebSocket(uuid);
    } catch (err) {
      console.error('Failed to fetch QR session:', err);
      toast.error(t('login.validation.qr_error'));
    } finally {
      setQrLoading(false);
    }
  }, [connectWebSocket, t]);

  // Fetch QR Session when switching to QR method
  useEffect(() => {
    if (loginMethod === 'qr' && !qrUuid) {
      fetchQrSession();
    }
  }, [fetchQrSession, loginMethod, qrUuid]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [stompClient]);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  };

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
        const msg = t('login.validation.phone_invalid');
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
        // toast.success(`Chào mừng bạn trở lại, ${displayName}!`);
      } else if (loginMethod === 'register') {
        // 2. Email validation (for registration only)
        if (!validateEmail(trimmedEmail)) {
          const msg = t('login.validation.email_invalid');
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }

        // 3. Password strength validation (for registration only)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
        if (!passwordRegex.test(password)) {
          const msg = t('login.validation.password_weak');
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }

        if (confirmPassword && password !== confirmPassword) {
          const msg = t('login.validation.confirm_mismatch');
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
        setVerificationEmail(trimmedEmail);
        toast.success(t('login.success.otp_sent'), {
          description: t('login.success.otp_sent_desc'),
          duration: 5000,
          className: "bg-white dark:bg-[#1E1E1E] border border-blue-100 dark:border-blue-900 shadow-xl",
          icon: <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg></div>
        });
      }
    } catch (err: unknown) {
      const fallbackMsg = loginMethod === 'phone' ? t('login.error.login_failed') : t('login.error.register_failed');
      const msg = getErrorMessage(err, fallbackMsg);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setScannedUser(null);
    setVerificationEmail(null);
    setShowForgotPassword(false);
    setLoginMethod('qr');
    setIsLoggedIn(false);
    toast(t('login.success.logout'), {
      description: t('login.success.logout_desc'),
      icon: <span className="text-xl">👋</span>,
      duration: 4000,
    });
  };

  // Prevent hydration mismatch
  if (!isClient) return null;

  // Main Render
  return (
    <div suppressHydrationWarning className={isLoggedIn
      ? "h-screen w-full overflow-hidden"
      : "flex min-h-screen flex-col items-center justify-center bg-[var(--background)] p-4 font-sans text-[var(--text)] transition-colors duration-300"
    }>
      {isLoggedIn ? (
        <ChatDashboard onLogout={handleLogout} userName={username} initialChatId={initialChatId} />
      ) : (
        <>
          {/* Theme Switcher */}
          <div className="absolute top-6 right-6">
            <button
              onClick={() => setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer shadow-sm group"
              title={currentTheme === 'dark' ? t('login.theme_switch.light') : t('login.theme_switch.dark')}
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

          {verificationEmail ? (
            <OtpVerificationForm
              email={verificationEmail}
              onVerified={() => {
                setVerificationEmail(null);
                setLoginMethod('phone');
                toast.success(t('login.success.verify_done'));
              }}
              onBack={() => {
                setVerificationEmail(null);
                setLoginMethod('register');
              }}
            />
          ) : showForgotPassword ? (
            <ForgotPasswordForm
              initialEmail={email}
              onBack={() => {
                setShowForgotPassword(false);
                setLoginMethod('phone');
              }}
              onDone={() => {
                setShowForgotPassword(false);
                setLoginMethod('phone');
                setPassword('');
                setConfirmPassword('');
                toast.success(t('login.forgot.done_login_hint'));
              }}
            />
          ) : (
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
              qrUuid={qrUuid}
              qrLoading={qrLoading}
              onRefreshQr={fetchQrSession}
              scannedUser={scannedUser}
              onForgotPassword={() => {
                setError(null);
                setSuccessMsg(null);
                setShowForgotPassword(true);
              }}
            />
          )}

          <p className="mt-8 text-xs text-gray-400 font-medium">
            © 2026 Fruvia Chat • Privacy • Terms
          </p>
        </>
      )}
    </div>
  );
}

export default function Home() {
  return <MainHome />;
}
