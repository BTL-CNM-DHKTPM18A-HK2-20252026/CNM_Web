'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { authService } from '@/features/auth';
import { toast } from 'sonner';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import '@/i18n/config';
import { useTheme } from '@/themes';
import { SunIcon, MoonIcon } from '@/components/ui/Icons';

// Import extracted components
import { ForgotPasswordForm, GmailModal, LoginForm, OtpVerificationForm } from '@/features/auth';
import { ChatDashboard } from '@/features/chat';

/* ────── Left Panel Carousel ────── */
const CAROUSEL_SLIDES = [
  {
    bg: 'from-[#4158D0] via-[#4169E1] to-[#2D5FE5]',
    heading: 'Trò chuyện dễ dàng',
    sub: 'Kết nối nhanh chóng và an toàn',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    cardTitle: 'Fruvia Chat',
    cardDesc: 'Kết nối mọi lúc, mọi nơi',
    mockRows: [
      { w1: 'w-24', w2: 'w-36' },
      { w1: 'w-20', w2: 'w-28' },
      { w1: 'w-28', w2: 'w-32' },
    ],
    dots: [
      { cls: 'top-12 left-16 w-4 h-4 bg-orange-400', delay: '0s' },
      { cls: 'top-24 right-20 w-3 h-3 bg-pink-400', delay: '0.3s' },
      { cls: 'top-[40%] left-8 w-2.5 h-2.5 bg-green-400', delay: '0.6s' },
      { cls: 'bottom-32 left-24 w-2 h-2 bg-blue-300', delay: '1.2s' },
      { cls: 'bottom-20 right-32 w-3.5 h-3.5 bg-red-400', delay: '0.4s' },
    ],
  },
  {
    bg: 'from-[#6C3FB5] via-[#8B5CF6] to-[#7C3AED]',
    heading: 'Nhóm & Cộng đồng',
    sub: 'Tạo nhóm không giới hạn thành viên',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    cardTitle: 'Nhóm chat',
    cardDesc: 'Lên đến 1000 thành viên',
    mockRows: [
      { w1: 'w-28', w2: 'w-32' },
      { w1: 'w-20', w2: 'w-36' },
      { w1: 'w-24', w2: 'w-28' },
    ],
    dots: [
      { cls: 'top-16 left-12 w-3 h-3 bg-purple-300', delay: '0.1s' },
      { cls: 'top-28 right-16 w-4 h-4 bg-pink-300', delay: '0.5s' },
      { cls: 'top-[45%] left-10 w-2 h-2 bg-yellow-300', delay: '0.8s' },
      { cls: 'bottom-28 left-20 w-3.5 h-3.5 bg-indigo-300', delay: '0.3s' },
      { cls: 'bottom-16 right-28 w-2.5 h-2.5 bg-fuchsia-300', delay: '0.7s' },
    ],
  },
  {
    bg: 'from-[#0F766E] via-[#14B8A6] to-[#0D9488]',
    heading: 'Bảo mật tối đa',
    sub: 'Mã hoá đầu cuối mọi tin nhắn',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    cardTitle: 'An toàn tuyệt đối',
    cardDesc: 'Mã hoá end-to-end',
    mockRows: [
      { w1: 'w-24', w2: 'w-28' },
      { w1: 'w-28', w2: 'w-36' },
      { w1: 'w-20', w2: 'w-32' },
    ],
    dots: [
      { cls: 'top-14 left-20 w-3 h-3 bg-emerald-300', delay: '0.2s' },
      { cls: 'top-20 right-14 w-2.5 h-2.5 bg-teal-200', delay: '0.6s' },
      { cls: 'top-[50%] left-6 w-4 h-4 bg-cyan-300', delay: '0.4s' },
      { cls: 'bottom-24 left-28 w-2 h-2 bg-lime-300', delay: '1.0s' },
      { cls: 'bottom-14 right-20 w-3 h-3 bg-green-300', delay: '0.5s' },
    ],
  },
];

/* ── Floating Chat Bubbles & Decorations ── */
const FLOAT_MESSAGES = [
  { text: 'Ê, tối nay đi ăn không? 🍜', pos: 'top-6 left-4', anim: 'float_6s_ease-in-out_infinite', tail: 'bl' },
  { text: 'Ok nha, 7h hen! 👍', pos: 'top-4 right-6', anim: 'float_5s_ease-in-out_infinite_0.5s', tail: 'br' },
  { text: 'Gửi file cho mình nha', pos: 'top-20 left-[28%]', anim: 'float_7s_ease-in-out_infinite_1.2s', tail: 'bl' },
  { text: 'Nhóm ơi check tin nhé 📢', pos: 'top-14 right-[22%]', anim: 'float_5.5s_ease-in-out_infinite_2s', tail: 'br' },
  { text: 'Đã nhận được rồi ạ ✅', pos: 'bottom-14 left-4', anim: 'float_5.5s_ease-in-out_infinite_0.8s', tail: 'tl' },
  { text: 'Cảm ơn bạn nhiều! 😄', pos: 'bottom-10 right-5', anim: 'float_6.5s_ease-in-out_infinite_1.5s', tail: 'tr' },
  { text: 'Cuộc họp 3h chiều nha', pos: 'bottom-28 left-[35%]', anim: 'float_4.5s_ease-in-out_infinite_0.3s', tail: 'tl' },
];

const TAIL_CLASS: Record<string, string> = {
  bl: 'rounded-2xl rounded-bl-sm',
  br: 'rounded-2xl rounded-br-sm',
  tl: 'rounded-2xl rounded-tl-sm',
  tr: 'rounded-2xl rounded-tr-sm',
};

function FloatingDecorations({ position }: { position: 'top' | 'bottom' }) {
  const msgs = FLOAT_MESSAGES.filter((m) =>
    position === 'top' ? m.pos.startsWith('top') : m.pos.startsWith('bottom')
  );

  return (
    <div className={`absolute ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 ${position === 'top' ? 'h-[32%]' : 'h-[26%]'} pointer-events-none z-[1] overflow-hidden`}>
      {msgs.map((m, i) => (
        <div key={i} className={`absolute ${m.pos} animate-[${m.anim}]`}>
          <div className={`bg-white/15 backdrop-blur-sm ${TAIL_CLASS[m.tail]} px-3.5 py-2 shadow-lg border border-white/10 max-w-[180px]`}>
            <p className="text-white/90 text-[11px] leading-snug font-medium">{m.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeftPanelCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((p) => (p + 1) % CAROUSEL_SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = CAROUSEL_SLIDES[active];

  return (
    <>
      {/* Full background gradient - transitions smoothly */}
      <div
        key={active}
        className={`absolute inset-0 bg-gradient-to-br ${slide.bg} animate-in fade-in duration-700`}
      />

      {/* Floating chat decorations - top & bottom only */}
      <FloatingDecorations position="top" />
      <FloatingDecorations position="bottom" />

      {/* Decorative confetti dots */}
      {slide.dots.map((dot, i) => (
        <div
          key={`${active}-${i}`}
          className={`absolute rounded-full animate-bounce ${dot.cls}`}
          style={{ animationDelay: dot.delay }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[380px]">
        {/* Heading */}
        <div key={`h-${active}`} className="text-center mb-8 animate-in fade-in slide-in-from-top-6 duration-500">
          <h2 className="text-white text-2xl font-extrabold mb-1">{slide.heading}</h2>
          <p className="text-white/65 text-sm">{slide.sub}</p>
        </div>

        {/* Card */}
        <div key={`c-${active}`} className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              {slide.icon}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{slide.cardTitle}</h3>
              <p className="text-white/60 text-xs">{slide.cardDesc}</p>
            </div>
          </div>
          <div className="space-y-3">
            {slide.mockRows.map((item, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex-shrink-0" />
                <div className="flex-1">
                  <div className={`h-2.5 bg-white/30 rounded-full ${item.w1} mb-1.5`} />
                  <div className={`h-2 bg-white/15 rounded-full ${item.w2}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots indicator */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {CAROUSEL_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`rounded-full transition-all duration-300 cursor-pointer ${i === active ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}

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
  const [loginMethod, setLoginMethod] = useState<'qr' | 'email' | 'register'>('email');
  const [isClient, setIsClient] = useState(false);
  const [scannedUser, setScannedUser] = useState<{ display_name: string; avatar_url: string } | null>(null);

  // Form states
  const [username, setUsername] = useState('0399614016'); // email
  const [password, setPassword] = useState('TestUser123@');
  const [confirmPassword, setConfirmPassword] = useState('TestUser123@');
  const [firstName, setFirstName] = useState('Quang Huy');
  const [lastName, setLastName] = useState('Nguyễn');
  const [email, setEmail] = useState(''); // gmail for OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [pendingRegisterData, setPendingRegisterData] = useState<{
    phoneNumber: string;
    password: string;
    displayName: string;
    firstName: string;
    lastName: string;
    dob?: Date;
    gender?: string;
  } | null>(null);
  const [gmailModalError, setGmailModalError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
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
    const phoneRegex = /^(0|\+84)[0-9]{9}$/;
    if (saved && phoneRegex.test(saved)) {
      setUsername(saved);
    } else if (saved) {
      localStorage.removeItem('savedUsername');
    }
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

    // Phone: validate Vietnamese phone number
    const validatePhone = (p: string) => {
      const phoneRegex = /^(0|\+84)[0-9]{9}$/;
      return phoneRegex.test(p);
    };

    try {
      // 1. Phone validation
      if (!validatePhone(trimmedPhone)) {
        const msg = t('login.validation.phone_invalid');
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (loginMethod === 'email') {
        await authService.login(trimmedPhone, password);
        if (rememberMe) {
          localStorage.setItem('savedUsername', trimmedPhone);
        } else {
          localStorage.removeItem('savedUsername');
        }
        setIsLoggedIn(true);
      } else if (loginMethod === 'register') {
        // 2. Password strength validation (for registration only)
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
        // Save register data, show gmail modal
        setPendingRegisterData({
          phoneNumber: trimmedPhone,
          password,
          displayName: `${lastName} ${firstName}`.trim(),
          firstName: firstName || '',
          lastName: lastName || '',
          dob: dob ? new Date(dob) : undefined,
          gender: gender
        });
      }
    } catch (err: unknown) {
      const fallbackMsg = loginMethod === 'email' ? t('login.error.login_failed') : t('login.error.register_failed');
      const msg = getErrorMessage(err, fallbackMsg);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGmailModalSubmit = async (gmail: string) => {
    if (!pendingRegisterData) return;
    setLoading(true);
    setGmailModalError(null);

    // Step 1: Fast check – does this email already exist?
    let emailExists = false;
    try {
      emailExists = await authService.checkEmail(gmail);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t('login.error.register_failed'));
      setGmailModalError(msg);
      setLoading(false);
      return;
    }

    if (emailExists) {
      setGmailModalError(t('login.gmail_modal.email_exists'));
      setLoading(false);
      return;
    }

    // Step 2: Email available → close GmailModal and show OTP modal immediately
    const registrationData = { ...pendingRegisterData, email: gmail };
    setPendingRegisterData(null);
    setVerificationEmail(gmail);
    setLoading(false);

    // Step 3: Register in background (user is already on OTP modal)
    try {
      await authService.register(registrationData);
      toast.success(t('login.success.otp_sent'), {
        description: t('login.success.otp_sent_desc'),
        duration: 5000,
        className: "bg-white dark:bg-[#1E1E1E] border border-blue-100 dark:border-blue-900 shadow-xl",
        icon: <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg></div>
      });
    } catch (err: unknown) {
      // Registration failed after OTP modal was opened – restore gmail modal
      const msg = getErrorMessage(err, t('login.error.register_failed'));
      toast.error(msg);
      setVerificationEmail(null);
      setPendingRegisterData(pendingRegisterData);
      setGmailModalError(msg);
    }
  };

  const handleGmailModalSkip = async () => {
    if (!pendingRegisterData) return;
    setLoading(true);
    setGmailModalError(null);
    try {
      await authService.register(pendingRegisterData);
      setPendingRegisterData(null);
      toast.success(t('login.success.register'), {
        description: t('login.success.register_desc'),
      });
      setLoginMethod('email');
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t('login.error.register_failed'));
      setGmailModalError(msg);
      toast.error(msg);
      // Keep GmailModal open so user can see error and retry
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
      : "flex min-h-screen font-sans text-[var(--text)] transition-colors duration-300"
    }>
      {isLoggedIn ? (
        <ChatDashboard onLogout={handleLogout} userName={username} initialChatId={initialChatId} />
      ) : (
        <>
          {/* Left Panel - Carousel with full background change */}
          <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col items-center justify-center p-12">
            <LeftPanelCarousel />
          </div>

          {/* Right Panel - Login Form */}
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--background)] p-4 min-h-screen relative">
            {/* Theme + Language Switcher */}
            <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
              className="w-10 h-10 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer shadow-sm text-xs font-bold"
              title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            >
              {i18n.language === 'vi' ? 'EN' : 'VI'}
            </button>
            <button
              onClick={() => setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer shadow-sm group"
              title={currentTheme === 'dark' ? t('login.theme_switch.light') : t('login.theme_switch.dark')}
            >
              {currentTheme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
            </button>
          </div>

          <div className="w-full max-w-[440px]">
            <div className="mb-6 text-center animate-in fade-in slide-in-from-top-4 duration-700">
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
                setLoginMethod('email');
                toast.success(t('login.success.verify_done'));
              }}
              onBack={() => {
                setVerificationEmail(null);
                setLoginMethod('register');
              }}
            />
          ) : showForgotPassword ? (
            <ForgotPasswordForm
              initialEmail={username}
              onBack={() => {
                setShowForgotPassword(false);
                setLoginMethod('email');
              }}
              onDone={() => {
                setShowForgotPassword(false);
                setLoginMethod('email');
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
          </div>

          {/* Gmail Modal - shown after register form submission */}
          {pendingRegisterData && (
            <GmailModal
              loading={loading}
              apiError={gmailModalError}
              onSubmit={handleGmailModalSubmit}
              onClose={handleGmailModalSkip}
            />
          )}

          <p className="mt-8 text-xs text-gray-400 font-medium">
            © 2026 Fruvia Chat • Privacy • Terms
          </p>
          </div>
        </>
      )}
    </div>
  );
}
