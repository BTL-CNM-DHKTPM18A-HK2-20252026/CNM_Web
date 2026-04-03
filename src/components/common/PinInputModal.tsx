'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface PinInputModalProps {
  /** Title displayed at top of modal */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Whether an error state should be shown */
  error?: string | null;
  /** Whether the confirm button is loading */
  loading?: boolean;
  onConfirm: (pin: string) => void;
  onClose: () => void;
}

export default function PinInputModal({
  title,
  subtitle,
  error,
  loading,
  onConfirm,
  onClose,
}: PinInputModalProps) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [showPin, setShowPin] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset digits when title changes (handles both initial open and multi-step transitions)
  useEffect(() => {
    setDigits(Array(6).fill(''));
    refs.current[0]?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (digits.every(d => d !== '')) {
      onConfirm(digits.join(''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handleChange = useCallback((index: number, value: string) => {
    const char = value.replace(/[^0-9]/g, '').slice(-1);
    setDigits(prev => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    if (char && index < 5) {
      refs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits(prev => { const next = [...prev]; next[index] = ''; return next; });
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        setDigits(prev => { const next = [...prev]; next[index - 1] = ''; return next; });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      refs.current[index + 1]?.focus();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [digits, onClose]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const lastFilled = Math.min(pasted.length, 5);
    refs.current[lastFilled]?.focus();
  }, []);

  const handleSubmit = () => {
    const pin = digits.join('');
    if (pin.length === 6) onConfirm(pin);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative z-[10000] w-full max-w-[360px] bg-[var(--card-bg)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 rounded-full bg-[#0068FF]/10 flex items-center justify-center mx-auto mb-3">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="text-[17px] font-bold text-[var(--text)]">{title}</h3>
          {subtitle && <p className="text-[13px] text-[var(--sub-text)] mt-1">{subtitle}</p>}
        </div>

        {/* PIN boxes */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-center gap-2.5">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { refs.current[i] = el; }}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className={`w-11 h-12 text-center text-[20px] font-bold rounded-xl border-2 bg-[var(--input-bg,var(--card-bg))] text-[var(--text)] outline-none transition-all
                  ${d ? 'border-[#0068FF] bg-[#0068FF]/5' : 'border-[var(--border)]'}
                  focus:border-[#0068FF] focus:bg-[#0068FF]/5
                  ${error ? 'border-red-500 animate-shake' : ''}`}
              />
            ))}
          </div>

          {/* Toggle show PIN */}
          <button
            type="button"
            onClick={() => setShowPin(v => !v)}
            className="mt-2 flex items-center gap-1.5 mx-auto text-[12px] text-[var(--sub-text)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            {showPin ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8A18.45 18.45 0 0 1 5.06 5.06M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
            {showPin ? (t('pin.hide_pin') || 'Ẩn mã PIN') : (t('pin.show_pin') || 'Hiện mã PIN')}
          </button>

          {/* Error */}
          {error && (
            <p className="mt-2 text-center text-[12px] text-red-500 font-medium">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-3 flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-[var(--sub-text)] bg-[var(--hover-bg)] hover:bg-[var(--border)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || digits.some(d => d === '')}
            className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-white bg-[#0068FF] hover:bg-[#0055CC] transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? '...' : (t('common.confirm'))}
          </button>
        </div>
      </div>
    </div>
  );
}
