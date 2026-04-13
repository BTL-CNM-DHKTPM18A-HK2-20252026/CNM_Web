import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageModalProps {
  src: string;
  onClose: () => void;
  allImages?: string[];
  onNavigate?: (src: string) => void;
}

export function ImageModal({ src, onClose, allImages, onNavigate }: ImageModalProps) {
  const currentIdx = allImages ? allImages.indexOf(src) : -1;
  const hasPrev = currentIdx > 0;
  const hasNext = allImages ? currentIdx < allImages.length - 1 : false;

  const goPrev = useCallback(() => {
    if (hasPrev && allImages && onNavigate) onNavigate(allImages[currentIdx - 1]);
  }, [hasPrev, allImages, onNavigate, currentIdx]);

  const goNext = useCallback(() => {
    if (hasNext && allImages && onNavigate) onNavigate(allImages[currentIdx + 1]);
  }, [hasNext, allImages, onNavigate, currentIdx]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, goPrev, goNext]);

  return (
    <div
      className="fixed inset-0 z-500 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview modal"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-510 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="Close image preview"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Prev button */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-510 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 active:scale-95"
          aria-label="Previous image"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-510 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 active:scale-95"
          aria-label="Next image"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Counter */}
      {allImages && allImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-510 rounded-full bg-black/50 px-3 py-1 text-[13px] text-white/80">
          {currentIdx + 1} / {allImages.length}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.img
          key={src}
          src={src}
          alt="Image preview"
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] max-w-[88vw] rounded-md object-contain shadow-2xl"
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />
      </AnimatePresence>
    </div>
  );
}

