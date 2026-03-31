'use client';
import { useEffect } from 'react';
import { ThemeProvider } from '@/themes';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.classList && target.classList.contains('custom-scrollbar')) {
        // Skip programmatic scrolls (flagged via data attribute)
        if (target.dataset.programmaticScroll) return;

        target.classList.add('is-scrolling');
        
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          target.classList.remove('is-scrolling');
        }, 800);
      }
    };

    // Use capturing phase to catch all scrolls
    window.addEventListener('scroll', handleScroll, true); 
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  return (
    <ThemeProvider>
      <Toaster position="top-right" richColors closeButton duration={5000} />
      {children}
    </ThemeProvider>
  );
}
