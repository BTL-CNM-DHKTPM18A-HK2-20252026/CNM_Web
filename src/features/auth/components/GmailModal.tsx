import React from 'react';
import { useTranslation } from 'react-i18next';

interface GmailModalProps {
  loading: boolean;
  apiError?: string | null;
  onSubmit: (gmail: string) => void;
  onClose: () => void;
}

type ModalView = 'email' | 'skip-warning';

export function GmailModal({ loading, apiError, onSubmit, onClose }: GmailModalProps) {
  const { t } = useTranslation();
  const [gmail, setGmail] = React.useState('');
  const [error, setError] = React.useState('');
  const [view, setView] = React.useState<ModalView>('email');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (view === 'email') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [view]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = gmail.trim();
    if (!trimmed) {
      setError(t('login.gmail_modal.required'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError(t('login.gmail_modal.invalid'));
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  // Sync apiError from parent into local error state
  React.useEffect(() => {
    if (apiError) setError(apiError);
  }, [apiError]);

  const limitedFeatures: string[] = t('login.gmail_modal.limited_features', { returnObjects: true }) as string[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-[400px] mx-4 rounded-sm bg-[var(--card-bg)] border border-[var(--border)] shadow-2xl">

        {view === 'skip-warning' ? (
          /* Skip warning view - show disabled features */
          <div className="p-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
            </div>
            <h3 className="text-center text-[15px] font-bold text-[var(--text)] mb-2">
              {t('login.gmail_modal.skip_warning_title')}
            </h3>
            <p className="text-center text-xs text-gray-400 mb-4 leading-relaxed">
              {t('login.gmail_modal.skip_warning_desc')}
            </p>

            {/* Limited features list */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10 p-4 mb-5">
              <ul className="space-y-2.5">
                {limitedFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[13px] text-[var(--text)]">
                    <span className="mt-0.5 flex-shrink-0 text-amber-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </span>
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setView('email')}
                className="w-full cursor-pointer rounded bg-[#0068FF] py-2.5 text-sm font-bold text-white hover:bg-blue-600 transition-all"
              >
                {t('login.gmail_modal.skip_warning_back')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full cursor-pointer rounded py-2.5 text-sm font-semibold text-red-400 hover:text-red-500 transition-colors"
              >
                {t('login.gmail_modal.skip_warning_continue')}
              </button>
            </div>
          </div>
        ) : (
          /* Email verification view */
          <div className="p-6 pb-2">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="1.8">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-center text-[15px] font-bold text-[var(--text)] mb-1">
              {t('login.gmail_modal.title')}
            </h3>
            <p className="text-center text-xs text-gray-400 mb-5 leading-relaxed">
              {t('login.gmail_modal.subtitle')}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className={`flex items-center border-b py-2.5 focus-within:border-[#0068FF] transition-colors ${error ? 'border-red-500' : 'border-[var(--border)]'}`}>
                <span className="mr-3 text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  ref={inputRef}
                  type="email"
                  value={gmail}
                  onChange={(e) => { setGmail(e.target.value); setError(''); }}
                  placeholder={t('login.gmail_modal.placeholder')}
                  className="w-full bg-transparent text-sm outline-none font-medium text-[var(--text)]"
                  disabled={loading}
                />
              </div>
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

              <div className="mt-6 mb-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full cursor-pointer rounded bg-[#0068FF] py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 disabled:bg-gray-300"
                >
                  {loading ? '...' : t('login.gmail_modal.verify_btn')}
                </button>
                <button
                  type="button"
                  onClick={() => setView('skip-warning')}
                  disabled={loading}
                  className="w-full cursor-pointer rounded border border-[var(--border)] py-2.5 text-sm font-semibold text-[var(--sub-text)] hover:bg-[var(--hover-bg)] transition-all disabled:opacity-40"
                >
                  {t('login.gmail_modal.skip_btn')}
                </button>
              </div>
            </form>

            <div className="pb-4 pt-3">
              <p className="text-center text-[11px] text-gray-400 leading-relaxed">
                {t('login.gmail_modal.hint')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
