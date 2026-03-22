'use client';
import { ThemeProvider } from '@/themes';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Toaster position="top-right" richColors closeButton duration={5000} />
      {children}
    </ThemeProvider>
  );
}
