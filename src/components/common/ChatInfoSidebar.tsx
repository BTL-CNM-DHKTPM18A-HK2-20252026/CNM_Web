import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronDownIcon, 
  ClockIcon, 
  InfoIcon, 
  SearchIcon,
} from '@/components/ui/Icons';
import Image from 'next/image';
import { apiClient } from '@/services/api';

interface ChatInfoSidebarProps {
  onClose: () => void;
  onOpenDataModal?: () => void;
}

export function ChatInfoSidebar({ onClose, onOpenDataModal }: ChatInfoSidebarProps) {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [showMedia, setShowMedia] = React.useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res: any = await apiClient.get('/storage/me');
      if (res) setStats(res);
    } catch (error) {
      console.error("Failed to fetch sidebar stats:", error);
    }
  };

  const totalPossibleSizeMB = 500;
  const currentTotalMB = stats?.totalSize ? (stats.totalSize / (1024 * 1024)) : 0;
  const usagePercentage = Math.min((currentTotalMB / totalPossibleSizeMB) * 100, 100);

  const imagePercentage = stats?.imageSize ? (stats.imageSize / stats.totalSize) * usagePercentage : 0;
  const videoPercentage = stats?.videoSize ? (stats.videoSize / stats.totalSize) * usagePercentage : 0;
  const filePercentage = stats?.fileSize ? (stats.fileSize / stats.totalSize) * usagePercentage : 0;
  const voicePercentage = stats?.voiceSize ? (stats.voiceSize / stats.totalSize) * usagePercentage : 0;

  return (
    <div className="w-[350px] bg-[var(--card-bg)] border-l border-[var(--border)] flex flex-col h-full animate-in slide-in-from-right duration-300 transition-colors duration-200">
      {/* Lightbox / Image Zoom */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute top-6 right-6 flex gap-4">
             <button 
               onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
               className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
             >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>
          <div 
            className="relative w-[90vw] h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image 
              src={selectedImage} 
              alt="Zoomed Media" 
              width={1200}
              height={1200}
              className="object-contain max-w-full max-h-full transition-all duration-300 animate-in zoom-in-95"
            />
          </div>
        </div>
      )}

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
            <span className="text-[var(--sub-text)]">{stats?.totalSizeFormatted || '0 B'} / 500 MB</span>
          </div>
          
          <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
            <div className="h-full bg-orange-500" style={{ width: `${imagePercentage}%` }}></div>
            <div className="h-full bg-blue-500" style={{ width: `${videoPercentage}%` }}></div>
            <div className="h-full bg-green-500" style={{ width: `${filePercentage}%` }}></div>
            <div className="h-full bg-pink-500" style={{ width: `${voicePercentage}%` }}></div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[var(--sub-text)]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>{t('info.legend.photos')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>{t('info.legend.videos')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>{t('info.legend.files')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-pink-500"></div>
              <span>{t('info.legend.voice')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span>{t('info.legend.other')}</span>
            </div>
          </div>

          <button 
            onClick={onOpenDataModal}
            className="w-full py-2 bg-[var(--hover-bg)] hover:bg-[var(--border)] rounded flex items-center justify-center text-[13px] font-bold text-[var(--text)] transition-colors cursor-pointer active:scale-[0.98]"
          >
            {t('info.cloud.storage.clean_up')}
          </button>
        </div>



        {/* Sections */}
        <div className="divide-y divide-[var(--border)] transition-colors duration-200">
          <SectionItem icon={<ClockIcon size={18} />} title={t('info.sections.reminders')} />
          
          <div className="flex flex-col">
             <div 
               onClick={() => setShowMedia(!showMedia)}
               className="p-4 flex items-center justify-between hover:bg-[var(--hover-bg)] cursor-pointer transition-colors group"
             >
                <span className="text-[14px] font-bold text-[var(--text)]">{t('info.sections.media')}</span>
                <span className={`text-[var(--sub-text)] transition-transform duration-200 ${!showMedia ? '-rotate-90' : ''}`}>
                  <ChevronDownIcon size={16} />
                </span>
             </div>

             {showMedia && (
               <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                 <div className="grid grid-cols-4 gap-1 mb-4">
                    {[1,2,3,4,5,6,7,8].map(i => {
                      const imgSrc = `https://picsum.photos/id/${10+i}/800/800`;
                      return (
                        <div 
                          key={i} 
                          onClick={() => setSelectedImage(imgSrc)}
                          className="aspect-square bg-[var(--hover-bg)] rounded overflow-hidden relative group cursor-pointer"
                        >
                          <Image src={`https://picsum.photos/id/${10+i}/100/100`} alt="Media" fill className="object-cover group-hover:scale-110 transition-transform" sizes="100px" />
                        </div>
                      );
                    })}
                 </div>
                 <button 
                   onClick={onOpenDataModal}
                   className="w-full py-2 bg-[var(--hover-bg)] hover:bg-[var(--border)] rounded flex items-center justify-center text-[13px] font-bold text-[var(--text)] transition-colors cursor-pointer active:scale-[0.98]"
                 >
                    {t('info.sections.view_all')}
                 </button>
               </div>
             )}
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
