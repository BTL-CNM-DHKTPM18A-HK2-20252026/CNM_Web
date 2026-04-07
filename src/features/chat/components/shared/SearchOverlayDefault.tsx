import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export interface SearchRecentItem {
  id: string | number;
  name: string;
  avatar?: string;
}

interface SearchOverlayDefaultProps {
  recentSearches: SearchRecentItem[];
  onRecentClick?: (item: SearchRecentItem) => void;
}

export function SearchOverlayDefault({ recentSearches, onRecentClick }: SearchOverlayDefaultProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="px-4 py-3 pb-2">
        <h3 className="text-[14px] font-bold text-[var(--text)] mb-4">{t('chat.search_overlay.recent')}</h3>
        <div className="space-y-1">
          {recentSearches.map((item) => (
            <div
              key={item.id}
              onClick={() => onRecentClick?.(item)}
              className="flex items-center gap-3 p-2 hover:bg-[var(--hover-bg)] rounded-lg cursor-pointer transition-colors"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-black/5">
                {item.avatar ? (
                  <Image src={item.avatar} alt={item.name} width={40} height={40} className="object-cover" />
                ) : (
                  <span className="text-[14px] font-bold text-white bg-[#0068FF] w-full h-full flex items-center justify-center">
                    {item.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <span className="text-[15px] text-[var(--text)] truncate">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--border)] mt-2 pt-4 px-4 pb-8">
        <h3 className="text-[14px] font-bold text-[var(--text)] mb-4">{t('chat.search_overlay.filters.title')}</h3>
        <div className="flex gap-2">
          <button className="px-4 py-1.5 bg-[var(--hover-bg)] rounded-full text-[13.5px] text-[var(--text)] cursor-pointer hover:bg-[var(--border)] transition-colors">
            {t('chat.search_overlay.filters.mention')}
          </button>
          <button className="px-4 py-1.5 bg-[var(--hover-bg)] rounded-full text-[13.5px] text-[var(--text)] cursor-pointer hover:bg-[var(--border)] transition-colors">
            {t('chat.search_overlay.filters.reactions')}
          </button>
        </div>
      </div>
    </>
  );
}
