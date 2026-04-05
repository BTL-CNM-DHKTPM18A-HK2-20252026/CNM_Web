import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from '@/components/ui/Icons';
import { apiClient } from '@/lib/http/apiClient';

interface UserDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DataItem {
  id: string;
  name: string;
  size: string;
  rawSize: number;
  type: 'image' | 'video' | 'file' | 'voice';
  date: string;
  url?: string;
}

export function UserDataModal({ isOpen, onClose }: UserDataModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [dataItems, setDataItems] = useState<DataItem[]>([]);

  useEffect(() => {
    setSelectedIds([]); // Reset selection when switching tabs
  }, [activeTab]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res: any = await apiClient.get('/storage/me');
      if (res) {
        setStats(res);
        setDataItems(res.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch storage stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredData = activeTab === 'all' ? dataItems : dataItems.filter(item => item.type === activeTab);

  const totalPossibleSizeMB = 500;
  const currentTotalMB = stats?.totalSize ? (stats.totalSize / (1024 * 1024)) : 0;
  const usagePercentage = Math.min((currentTotalMB / totalPossibleSizeMB) * 100, 100);

  const imagePercentage = stats?.imageSize ? (stats.imageSize / stats.totalSize) * usagePercentage : 0;
  const videoPercentage = stats?.videoSize ? (stats.videoSize / stats.totalSize) * usagePercentage : 0;
  const filePercentage = stats?.fileSize ? (stats.fileSize / stats.totalSize) * usagePercentage : 0;
  const voicePercentage = stats?.voiceSize ? (stats.voiceSize / stats.totalSize) * usagePercentage : 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredData.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-[860px] h-[640px] bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="h-12 border-b border-[var(--border)] px-5 flex items-center justify-between shrink-0 bg-white">
          <h2 className="text-[16px] font-bold text-[#1e1e1e]">{t('userData.title')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors opacity-70 hover:opacity-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Left Sidebar - Usage Info */}
          <div className="w-[230px] border-r border-[var(--border)] bg-[#f0f2f5] p-5 flex flex-col gap-6 shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-[#1e1e1e]">{t('userData.storage')}</span>
                <span className="text-[12px] text-gray-500">{stats?.totalSizeFormatted || '0 B'} / 500 MB</span>
              </div>
              {/* Progress Bar */}
              <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden flex">
                <div style={{ width: `${imagePercentage}%` }} className="h-full bg-[#fa8c16]" />
                <div style={{ width: `${videoPercentage}%` }} className="h-full bg-[#1890ff]" />
                <div style={{ width: `${filePercentage}%` }} className="h-full bg-[#52c41a]" />
                <div style={{ width: `${voicePercentage}%` }} className="h-full bg-[#eb2f96]" />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fa8c16]" /> {t('userData.photos')}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#52c41a]" /> {t('userData.videos')}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffc53d]" /> {t('userData.files')}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#eb2f96]" /> {t('userData.voice')}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> {t('userData.other')}
                </div>
              </div>
            </div>

            {/* Upgrade Banner */}
            <div className="mt-auto p-4 bg-[#e6f7ff] rounded-lg relative overflow-hidden border border-[#91d5ff]">
              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-[#0068ff] rounded-full flex items-center justify-center text-white shadow-md">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-[13px] text-[#0068ff] mb-0.5">{t('userData.upgrade_storage')}</h4>
                  <p className="text-[11px] text-[#0068ff]/80 leading-snug">{t('userData.upgrade_desc')}</p>
                </div>
                <button className="w-full py-2 bg-[#0068ff] text-white rounded-md font-bold text-[12px] hover:bg-[#0052d2] transition-colors shadow-sm">
                  {t('userData.add_storage')}
                </button>
              </div>
            </div>
          </div>

          {/* Right Main Area */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">

            {/* Tabs */}
            <div className="px-5 border-b border-[var(--border)] flex items-center gap-6 shrink-0">
              {[
                { id: 'all', label: `${t('userData.tabs.all')} (${stats?.totalSizeFormatted || '0 B'})` },
                { id: 'image', label: `${t('userData.tabs.image')} (${stats?.imageSizeFormatted || '0 B'})` },
                { id: 'video', label: `${t('userData.tabs.video')} (${stats?.videoSizeFormatted || '0 B'})` },
                { id: 'file', label: `${t('userData.tabs.file')} (${stats?.fileSizeFormatted || '0 B'})` },
                { id: 'voice', label: `${t('userData.tabs.voice')} (${stats?.voiceSizeFormatted || '0 B'})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2.5 text-[12.5px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === tab.id ? 'border-[#0068FF] text-[#0068FF]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter Bar */}
            <div className="px-5 py-3 flex items-center justify-between shrink-0">
              <button className="flex items-center gap-1.5 px-2.5 py-1 border border-gray-200 rounded text-[12px] text-gray-600 hover:bg-gray-50 transition-colors">
                {t('userData.sort_size_desc')}
                <ChevronDownIcon size={12} />
              </button>
              <div className="flex items-center gap-4">
                {selectedIds.length > 0 && (
                  <button className="text-[12px] font-bold text-red-500 hover:text-red-600 cursor-pointer">
                    {t('userData.cleanup', { count: selectedIds.length })}
                  </button>
                )}
                <label className="flex items-center gap-2 text-[12px] text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-[#0068FF] focus:ring-[#0068FF]"
                  />
                  Chọn tất cả
                </label>
              </div>
            </div>

            {/* Content List/Grid */}
            <div className="flex-1 p-5 overflow-y-auto custom-scrollbar pt-0">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {filteredData.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`group relative aspect-square bg-[#f0f2f5] rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${selectedIds.includes(item.id) ? 'border-[#0068FF] bg-[#0068FF]/5' : 'border-transparent hover:border-gray-300'}`}
                    >
                      {item.type === 'image' ? (
                        <div className="w-full h-full flex items-center justify-center overflow-hidden">
                          <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      ) : item.type === 'file' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                          <div className="w-9 h-11 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-[8px] shadow-sm uppercase">{item.name.split('.').pop()}</div>
                          <span className="text-[10px] text-gray-500 truncate w-full px-2 text-center">{item.name}</span>
                        </div>
                      ) : item.type === 'voice' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 bg-[#eb2f96] rounded-full flex items-center justify-center text-white shadow-sm">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                          </div>
                          <span className="text-[10px] text-gray-500 font-medium">Ghi âm</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-gray-400"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                        </div>
                      )}

                      {/* Selection Checkbox */}
                      <div className={`absolute top-1.5 right-1.5 transition-all ${selectedIds.includes(item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedIds.includes(item.id) ? 'bg-[#0068FF] border-[#0068FF] text-white' : 'bg-white/90 border-gray-300'}`}>
                          {selectedIds.includes(item.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                      </div>

                      {/* Metadata at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/50 to-transparent">
                        <span className="text-[9px] font-bold text-white drop-shadow-sm">{item.size}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && filteredData.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60 py-20">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 opacity-20"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M3 6h18" /><path d="M12 2v2" /><path d="M12 20v2" /></svg>
                  <p className="text-[15px]">Không có dữ liệu trong mục này</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
