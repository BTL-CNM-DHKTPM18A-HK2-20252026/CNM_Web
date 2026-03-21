import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronDownIcon, 
  ClockIcon, 
  InfoIcon, 
  SearchIcon,
} from '@/components/ui/Icons';
import Image from 'next/image';

interface ChatInfoSidebarProps {
  onClose: () => void;
}

export function ChatInfoSidebar({ onClose }: ChatInfoSidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="w-[350px] bg-[var(--card-bg)] border-l border-[var(--border)] flex flex-col h-full animate-in slide-in-from-right duration-300 transition-colors duration-200">
      {/* Header */}
      <div className="h-[64px] border-b border-[var(--border)] flex items-center justify-center relative flex-shrink-0 transition-colors duration-200">
        <h2 className="text-[17px] font-bold text-[var(--text)]">{t('info.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Profile Section */}
        <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-[var(--border)] transition-colors duration-200">
          <div className="w-16 h-16 rounded-full bg-[#0068FF] flex items-center justify-center text-white shadow-lg mb-4">
             <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-6c-2.33 0-4.5 1.17-4.5 2.5V14h9v-1.5c0-1.33-2.17-2.5-4.5-2.5z"/>
             </svg>
          </div>
          <h3 className="text-[18px] font-bold text-[var(--text)] mb-2 flex items-center gap-2">
            {t('chat.self_cloud')}
          </h3>
          <p className="text-[13px] text-[var(--sub-text)] text-center leading-normal">
            {t('info.cloud.desc')}
          </p>
        </div>



        {/* Storage Section */}
        <div className="p-4 border-b border-[var(--border)] space-y-4 transition-colors duration-200">
          <div className="flex justify-between items-center text-[13px]">
            <span className="font-bold text-[var(--text)]">{t('info.cloud.storage.title')}</span>
            <span className="text-[var(--sub-text)]">111 MB / 500 MB</span>
          </div>
          
          <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
            <div className="h-full bg-orange-500" style={{ width: '22%' }}></div>
            <div className="h-full bg-yellow-400" style={{ width: '1%' }}></div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[var(--sub-text)]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>{t('info.legend.photos')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>{t('info.legend.videos')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span>{t('info.legend.files')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span>{t('info.legend.other')}</span>
            </div>
          </div>

          <button className="w-full py-2 bg-[var(--hover-bg)] hover:bg-[var(--border)] rounded flex items-center justify-center text-[13px] font-bold text-[var(--text)] transition-colors cursor-pointer active:scale-[0.98]">
            {t('info.cloud.storage.clean_up')}
          </button>
        </div>



        {/* Sections */}
        <div className="divide-y divide-[var(--border)] transition-colors duration-200">
          <SectionItem icon={<ClockIcon size={18} />} title={t('info.sections.reminders')} />
          
          <div className="p-4 space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-[var(--text)]">{t('info.sections.media')}</span>
                <span className="text-[var(--sub-text)]"><ChevronDownIcon size={16} /></span>
             </div>
             <div className="grid grid-cols-4 gap-1">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="aspect-square bg-[var(--hover-bg)] rounded overflow-hidden relative group cursor-pointer">
                    <Image src={`https://picsum.photos/id/${10+i}/100/100`} alt="Media" fill className="object-cover group-hover:scale-110 transition-transform" />
                  </div>
                ))}
             </div>
             <button className="w-full py-2 bg-[var(--hover-bg)] hover:bg-[var(--border)] rounded flex items-center justify-center text-[13px] font-bold text-[var(--text)] transition-colors cursor-pointer">
                {t('info.sections.view_all')}
             </button>
          </div>

          <SectionItem icon={null} title={t('info.sections.files')} hasChevron />
          <SectionItem icon={null} title={t('info.sections.links')} hasChevron />
        </div>
      </div>
    </div>
  );
}

function SectionItem({ icon, title, hasChevron = false }: { icon: React.ReactNode, title: string, hasChevron?: boolean }) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-[var(--hover-bg)] cursor-pointer transition-colors group">
      <div className="flex items-center gap-3">
        {icon && <span className="text-gray-400 group-hover:text-[var(--primary)] transition-colors">{icon}</span>}
        <span className="text-[14px] font-bold text-[var(--text)]">{title}</span>
      </div>
      {(hasChevron || !icon) && <span className="text-[var(--sub-text)]"><ChevronDownIcon size={16} /></span>}
    </div>
  );
}
