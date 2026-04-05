import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { EyeIcon, EyeOffIcon } from '@/components/ui/Icons';
import { authService } from '../services/authService';

interface ForgotPasswordFormProps {
  initialEmail?: string;
  onBack: () => void;
  onDone: () => void;
}

type ForgotStep = 'request' | 'reset';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 59;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function isValidEmail(email: string) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!emailRegex.test(email)) return false;
  if (email.includes('..')) return false;
  const [localPart] = email.split('@');
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  return true;
}

export function ForgotPasswordForm({ initialEmail, onBack, onDone }: ForgotPasswordFormProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<ForgotStep>('request');
  const [email, setEmail] = useState((initialEmail ?? '').trim());
  const [otpValues, setOtpValues] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otp = useMemo(() => otpValues.join(''), [otpValues]);

  useEffect(() => {
    if (step !== 'reset') {
      return;
    }

    inputRefs.current[0]?.focus();
  }, [step]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const updateOtpAtIndex = (index: number, value: string) => {
    const next = [...otpValues];
    next[index] = value;
    setOtpValues(next);
  };

  const handleOtpChange = (index: number, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '');

    if (!digitsOnly) {
      updateOtpAtIndex(index, '');
      return;
    }

    if (digitsOnly.length > 1) {
      const pasted = digitsOnly.slice(0, OTP_LENGTH).split('');
      const next = Array(OTP_LENGTH).fill('');

      pasted.forEach((char, pastedIndex) => {
        next[pastedIndex] = char;
      });

      setOtpValues(next);
      const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    updateOtpAtIndex(index, digitsOnly);
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace') {
      return;
    }

    if (otpValues[index]) {
      updateOtpAtIndex(index, '');
      return;
    }

    if (index > 0) {
      updateOtpAtIndex(index - 1, '');
      inputRefs.current[index - 1]?.focus();
    }
  };

  const sendOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      toast.error(t('login.validation.email_invalid'));
      return;
    }

    setSendingOtp(true);
    try {
      await authService.sendPasswordResetOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setOtpValues(Array(OTP_LENGTH).fill(''));
      setSecondsLeft(RESEND_SECONDS);
      setStep('reset');
      toast.success(t('login.forgot.send_success'));
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('login.forgot.send_failed'));
      toast.error(message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleRequestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (sendingOtp) {
      return;
    }
    await sendOtp();
  };

  const handleResendOtp = async () => {
    if (resendingOtp || secondsLeft > 0) {
      return;
    }

    setResendingOtp(true);
    try {
      await authService.sendPasswordResetOtp(email);
      setOtpValues(Array(OTP_LENGTH).fill(''));
      setSecondsLeft(RESEND_SECONDS);
      inputRefs.current[0]?.focus();
      toast.success(t('login.forgot.resend_success'));
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('login.forgot.resend_failed'));
      toast.error(message);
    } finally {
      setResendingOtp(false);
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();

    if (resetting) {
      return;
    }

    if (otp.length !== OTP_LENGTH) {
      toast.error(t('login.forgot.otp_invalid'));
      return;
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      toast.error(t('login.validation.password_weak'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('login.validation.confirm_mismatch'));
      return;
    }

    setResetting(true);
    try {
      await authService.resetPassword(email, otp, newPassword);
      toast.success(t('login.forgot.reset_success'));
      onDone();
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('login.forgot.reset_failed'));
      toast.error(message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] shadow-xl transition-colors duration-300">
      <div className="border-b border-[var(--border)] px-7 py-6 transition-colors duration-300">
        <h3 className="mt-2 text-[24px] font-extrabold tracking-tight text-[#0068FF]">{t('login.forgot.title')}</h3>
        <p className="mt-2 text-sm text-[var(--sub-text)]">
          {step === 'request' ? t('login.forgot.subtitle_request') : t('login.forgot.subtitle_reset')}
        </p>
      </div>

      {step === 'request' ? (
        <form onSubmit={handleRequestSubmit} className="px-7 pb-7 pt-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sub-text)]">
            {t('login.forgot.email_label')}
          </label>
          <div className="flex items-center rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 shadow-sm transition-colors duration-300 focus-within:border-[#0068FF] focus-within:ring-2 focus-within:ring-[#0068FF]/20">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('login.forgot.email_placeholder')}
              className="w-full bg-transparent text-sm font-medium text-[var(--text)] placeholder:text-[var(--sub-text)] outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={sendingOtp}
            className="mt-6 w-full rounded-md bg-[#0068FF] py-3 text-sm font-bold text-white transition-all enabled:cursor-pointer enabled:hover:bg-[#0057d6] enabled:hover:shadow-[0_12px_24px_rgba(0,104,255,0.25)] disabled:cursor-not-allowed disabled:bg-[#b8c9ea]"
          >
            {sendingOtp ? t('login.forgot.sending') : t('login.forgot.send_otp')}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="mt-4 w-full cursor-pointer text-sm font-semibold text-[var(--sub-text)] transition-colors hover:text-[#0068FF]"
          >
            {t('login.forgot.back_to_login')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="px-7 pb-7 pt-6">
          <div className="rounded-md border border-[var(--border)] bg-[var(--hover-bg)] p-4 text-sm text-[var(--sub-text)] transition-colors duration-300">
            {t('login.forgot.sent_to')} <span className="font-semibold text-[var(--text)]">{email}</span>
          </div>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sub-text)]">
            {t('login.forgot.otp_label')}
          </label>
          <div className="mt-2 flex items-center justify-between gap-2">
            {otpValues.map((value, index) => (
              <input
                key={`forgot-otp-${index}`}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                value={value}
                onChange={(event) => handleOtpChange(index, event.target.value)}
                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                className="h-13 w-12 rounded-md border border-[var(--border)] bg-[var(--card-bg)] text-center text-xl font-bold text-[var(--text)] shadow-sm outline-none transition-all focus:border-[#0068FF] focus:ring-2 focus:ring-[#0068FF]/20"
                aria-label={`${t('login.otp.digit')} ${index + 1}`}
              />
            ))}
          </div>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sub-text)]">
            {t('login.forgot.new_password_label')}
          </label>
          <div className="mt-2 flex items-center rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 shadow-sm transition-colors duration-300 focus-within:border-[#0068FF] focus-within:ring-2 focus-within:ring-[#0068FF]/20">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={t('login.forgot.new_password_placeholder')}
              className="w-full bg-transparent text-sm font-medium text-[var(--text)] placeholder:text-[var(--sub-text)] outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              className="cursor-pointer text-[var(--sub-text)] transition-colors hover:text-[#0068FF]"
            >
              {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sub-text)]">
            {t('login.forgot.confirm_password_label')}
          </label>
          <div className="mt-2 flex items-center rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 shadow-sm transition-colors duration-300 focus-within:border-[#0068FF] focus-within:ring-2 focus-within:ring-[#0068FF]/20">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t('login.forgot.confirm_password_placeholder')}
              className="w-full bg-transparent text-sm font-medium text-[var(--text)] placeholder:text-[var(--sub-text)] outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="cursor-pointer text-[var(--sub-text)] transition-colors hover:text-[#0068FF]"
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-md bg-[var(--hover-bg)] px-4 py-3 transition-colors duration-300">
            <p className="text-sm font-medium text-[var(--sub-text)]">
              {secondsLeft > 0
                ? `${t('login.otp.resend_in')} ${formatTimer(secondsLeft)}`
                : t('login.otp.can_resend')}
            </p>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={secondsLeft > 0 || resendingOtp}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-[#0068FF] transition-colors enabled:cursor-pointer enabled:hover:bg-[#e8f1ff] dark:enabled:hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:text-[#9fb5df]"
            >
              {resendingOtp ? t('login.otp.resending') : t('login.otp.resend')}
            </button>
          </div>

          <button
            type="submit"
            disabled={resetting}
            className="mt-6 w-full rounded-md bg-[#0068FF] py-3 text-sm font-bold text-white transition-all enabled:cursor-pointer enabled:hover:bg-[#0057d6] enabled:hover:shadow-[0_12px_24px_rgba(0,104,255,0.25)] disabled:cursor-not-allowed disabled:bg-[#b8c9ea]"
          >
            {resetting ? t('login.forgot.resetting') : t('login.forgot.reset_password')}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="mt-4 w-full cursor-pointer text-sm font-semibold text-[var(--sub-text)] transition-colors hover:text-[#0068FF]"
          >
            {t('login.forgot.back_to_login')}
          </button>
        </form>
      )}
    </div>
  );
}
