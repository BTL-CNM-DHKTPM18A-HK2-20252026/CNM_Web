import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { authService } from '../services/authService';

interface OtpVerificationFormProps {
  email: string;
  onVerified: () => void | Promise<void>;
  onBack: () => void;
  onClose?: () => void;
  onVerifyOtp?: (email: string, otp: string) => Promise<unknown>;
  onResendOtp?: (email: string) => Promise<unknown>;
}

const OTP_LENGTH = 6;
const RESEND_SECONDS = 59;

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

export function OtpVerificationForm({
  email,
  onVerified,
  onBack,
  onClose,
  onVerifyOtp,
  onResendOtp,
}: OtpVerificationFormProps) {
  const { t } = useTranslation();
  const [otpValues, setOtpValues] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otp = useMemo(() => otpValues.join(''), [otpValues]);
  const canVerify = otp.length === OTP_LENGTH && !verifying;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

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

  const handleInputChange = (index: number, rawValue: string) => {
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

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
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

  const handleVerify = async (event?: FormEvent) => {
    event?.preventDefault();

    if (!canVerify) {
      return;
    }

    setVerifying(true);

    try {
      const verifyHandler = onVerifyOtp ?? authService.verifyOtp;
      await verifyHandler(email, otp);
      await onVerified();
      toast.success(t('login.otp.verify_success'));
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('login.otp.verify_failed'));
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) {
      return;
    }

    setResending(true);

    try {
      const resendHandler = onResendOtp ?? authService.resendOtp;
      await resendHandler(email);
      setOtpValues(Array(OTP_LENGTH).fill(''));
      setSecondsLeft(RESEND_SECONDS);
      inputRefs.current[0]?.focus();
      toast.success(t('login.otp.resend_success'));
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('login.otp.resend_failed'));
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-lg border border-[#d8e5ff] bg-white shadow-[0_16px_32px_rgba(0,92,245,0.10)]">
      <div className="relative bg-[linear-gradient(120deg,#0068FF_0%,#00A9FF_100%)] px-5 py-4 text-white">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/85 transition-colors hover:bg-white/20 hover:text-white"
            aria-label={t('common.close')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">{t('login.otp.badge')}</p>
        <h3 className="mt-1.5 text-[20px] font-extrabold tracking-tight">{t('login.otp.title')}</h3>
        <p className="mt-1 text-[13px] text-white/85">{t('login.otp.subtitle')}</p>
      </div>

      <form onSubmit={handleVerify} className="px-5 pb-5 pt-4">
        <div className="rounded-lg border border-[#e6eeff] bg-[#f8fbff] p-3 text-[13px] text-[#35558a]">
          {t('login.otp.sent_to')} <span className="font-semibold text-[#0f2b61]">{email}</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-1.5">
          {otpValues.map((value, index) => (
            <input
              key={`otp-${index}`}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              value={value}
              onChange={(event) => handleInputChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              className="h-11 w-10 rounded-lg border border-[#bed5ff] bg-white text-center text-lg font-bold text-[#0f2b61] shadow-sm outline-none transition-all focus:border-[#0068FF] focus:ring-2 focus:ring-[#0068FF]/20"
              aria-label={`${t('login.otp.digit')} ${index + 1}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-[#f4f8ff] px-3 py-2.5">
          <p className="text-[13px] font-medium text-[#4a6595]">
            {secondsLeft > 0
              ? `${t('login.otp.resend_in')} ${formatTimer(secondsLeft)}`
              : t('login.otp.can_resend')}
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={secondsLeft > 0 || resending}
            className="rounded-md px-2.5 py-1 text-[13px] font-semibold text-[#0068FF] transition-colors enabled:cursor-pointer enabled:hover:bg-[#e8f1ff] disabled:cursor-not-allowed disabled:text-[#9fb5df]"
          >
            {resending ? t('login.otp.resending') : t('login.otp.resend')}
          </button>
        </div>

        <button
          type="submit"
          disabled={!canVerify}
          className="mt-4 w-full rounded-lg bg-[#0068FF] py-2.5 text-[13px] font-bold text-white transition-all enabled:cursor-pointer enabled:hover:bg-[#0057d6] enabled:hover:shadow-[0_12px_24px_rgba(0,104,255,0.25)] disabled:cursor-not-allowed disabled:bg-[#b8c9ea]"
        >
          {verifying ? t('login.otp.verifying') : t('login.otp.verify')}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="mt-3 w-full cursor-pointer text-[13px] font-semibold text-[#4a6595] transition-colors hover:text-[#0068FF]"
        >
          {t('login.otp.back_to_register')}
        </button>
      </form>
    </div>
  );
}
