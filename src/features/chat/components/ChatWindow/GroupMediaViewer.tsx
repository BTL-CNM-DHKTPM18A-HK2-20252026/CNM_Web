import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/http/apiClient';


interface GroupMediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: any[];
  initialIndex?: number;
  groupName: string;
  currentUser?: any;
  members?: any[];
  onForward?: (item: any) => void;
}

export function GroupMediaViewer({ isOpen, onClose, mediaItems, initialIndex = 0, groupName, currentUser, members = [], onForward }: GroupMediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const activeThumbRef = React.useRef<HTMLButtonElement>(null);

  // Reset scale and rotation when image changes
  useEffect(() => {
    setScale(1);
    setRotation(0);
  }, [currentIndex]);

  // Auto-scroll sidebar to active thumbnail
  useEffect(() => {
    if (activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentIndex]);

  const currentItem = mediaItems[currentIndex];
  const currentUserId = currentUser?.id || currentUser?.user_id || currentUser?._id;
  
  // Exhaustive ID extraction from item
  const itemSenderId = currentItem?.senderId || 
                       currentItem?.sender_id || 
                       currentItem?.userId || 
                       currentItem?.user_id || 
                       currentItem?.user?.id || 
                       currentItem?.user?.userId ||
                       currentItem?.user?.user_id ||
                       currentItem?.sender;

  const isMe = currentItem && currentUserId && String(itemSenderId) === String(currentUserId);

  // Try to find sender in members list if not "me"
  const memberInfo = !isMe && itemSenderId ? members.find(m => 
    String(m.id || m.userId || m.user_id || m.id) === String(itemSenderId)
  ) : null;

  const isValidName = (name: any) => {
    if (!name || typeof name !== 'string') return false;
    const n = name.trim().toLowerCase();
    return n !== '' && n !== 'unknown' && n !== 'người dùng' && n !== 'null' && n !== 'undefined';
  };

  const getBestName = () => {
    if (isMe) return currentUser?.displayName || currentUser?.full_name || currentUser?.display_name || currentUser?.name || 'Bạn';
    
    // Try currentItem properties
    const itemFields = [
      currentItem?.senderName,
      currentItem?.senderDisplayName,
      currentItem?.fullName,
      currentItem?.displayName,
      currentItem?.userName,
      currentItem?.sender_name,
      currentItem?.user?.full_name,
      currentItem?.user?.display_name,
      currentItem?.user?.name
    ];
    for (const field of itemFields) {
      if (isValidName(field)) return field;
    }

    // Try memberInfo
    const memberFields = [
      memberInfo?.displayName,
      memberInfo?.display_name,
      memberInfo?.full_name,
      memberInfo?.name,
      memberInfo?.userName
    ];
    for (const field of memberFields) {
      if (isValidName(field)) return field;
    }

    // Final fallbacks
    if (typeof currentItem?.sender === 'string' && isNaN(Number(currentItem.sender)) && isValidName(currentItem.sender)) {
      return currentItem.sender;
    }

    return 'Người dùng';
  };

  const resolvedName = getBestName();

  // Exhaustive avatar resolution
  const resolvedAvatar = isMe ? (currentUser?.avatarUrl || currentUser?.avatar_url || currentUser?.avatar) : (
    currentItem?.senderAvatar || 
    currentItem?.senderAvatarUrl || 
    currentItem?.avatar || 
    currentItem?.sender_avatar_url || 
    currentItem?.user?.avatar_url || 
    currentItem?.user?.avatar ||
    memberInfo?.avatarUrl ||
    memberInfo?.avatar_url ||
    memberInfo?.avatar
  );

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, currentIndex, mediaItems.length]);

  if (!isOpen) return null;
  
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };
  const goNext = () => {
    if (currentIndex < mediaItems.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleDownload = () => {
    if (!currentItem) return;

    const url = currentItem.content;
    const fileName = `zalo_media_${Date.now()}.${currentItem.messageType === 'VIDEO' ? 'mp4' : 'png'}`;

    // Check if the URL is external
    const isExternal = url.startsWith('http') && !url.includes(window.location.hostname);

    if (isExternal) {
      // Use direct link to the backend proxy
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
      const proxyUrl = `${apiBaseUrl}/files/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(fileName)}`;
      
      const link = document.createElement('a');
      link.href = proxyUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For local URLs
    const triggerBlobDownload = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } catch (e) {
        console.error('Download failed', e);
        window.open(url, '_blank');
      }
    };

    triggerBlobDownload();
  };

  // Group media by date
  const groupedMedia: { [key: string]: any[] } = {};
  mediaItems.forEach((item, index) => {
    const dateObj = item.createdAt ? new Date(item.createdAt) : new Date();
    const dateKey = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!groupedMedia[dateKey]) groupedMedia[dateKey] = [];
    groupedMedia[dateKey].push({ ...item, originalIndex: index });
  });

  const currentItemDate = currentItem?.createdAt ? new Date(currentItem.createdAt) : new Date();
  const currentItemTimeStr = `${currentItemDate.getHours().toString().padStart(2, '0')}:${currentItemDate.getMinutes().toString().padStart(2, '0')} ${currentItemDate.getDate().toString().padStart(2, '0')}/${(currentItemDate.getMonth() + 1).toString().padStart(2, '0')}/${currentItemDate.getFullYear()}`;

  return (
    <div className="fixed inset-0 z-[200] flex bg-[#1A1A1A] font-sans">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-[#202020] border-b border-[#333333] flex items-center justify-between px-4 z-50">
        <div className="flex-1" />
        <div className="text-[#E0E0E0] text-[14px] font-medium truncate max-w-[50%] text-center">
          {groupName}
        </div>
        <div className="flex-1 flex justify-end">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[#E0E0E0] hover:bg-white/10 rounded-full transition-colors cursor-pointer" title="Đóng">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col pt-12 pb-14 relative transition-all duration-300 ${isSidebarOpen ? 'mr-[120px]' : 'mr-0'}`}>
        <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
          {currentItem && currentItem.messageType === 'VIDEO' ? (
            <video 
              src={currentItem.content} 
              controls 
              className="max-w-full max-h-full object-contain" 
              style={{ transform: `scale(${scale}) rotate(${rotation}deg)`, transition: 'transform 0.2s ease-out' }}
            />
          ) : currentItem ? (
            <img 
              src={currentItem.content} 
              alt="Media" 
              className="max-w-full max-h-full object-contain select-none" 
              style={{ transform: `scale(${scale}) rotate(${rotation}deg)`, transition: 'transform 0.2s ease-out' }}
            />
          ) : null}
        </div>
        
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-12 bg-[#1A1A1A] rounded-l-full border-y border-l border-[#333333] flex items-center justify-center text-white hover:bg-[#2A2A2A] transition-colors cursor-pointer z-40"
          title={isSidebarOpen ? "Đóng danh sách" : "Mở danh sách"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {isSidebarOpen ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
        
        {/* Navigation Buttons Stacked on Right */}
        <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-[150]">
          <button 
            onClick={goPrev} 
            disabled={currentIndex === 0}
            className={`w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center transition-colors shadow-lg border border-white/10 ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/80 cursor-pointer'}`}
            title="Ảnh trước"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-90">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button 
            onClick={goNext} 
            disabled={currentIndex === mediaItems.length - 1}
            className={`w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center transition-colors shadow-lg border border-white/10 ${currentIndex === mediaItems.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/80 cursor-pointer'}`}
            title="Ảnh sau"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-90">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`absolute bottom-0 left-0 h-14 bg-[#202020] border-t border-[#333333] flex items-center justify-between px-4 z-40 transition-all duration-300 ${isSidebarOpen ? 'right-[120px]' : 'right-0'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-600 overflow-hidden shrink-0">
            {resolvedAvatar ? (
              <img src={resolvedAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-[12px] font-bold">
                {resolvedName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[#E0E0E0] text-[14px] font-medium leading-tight">
              {resolvedName}
            </span>
            <span className="text-[#888888] text-[12px]">{currentItemTimeStr}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {onForward && (
            <button 
              onClick={() => onForward?.(currentItem)}
              className="text-[#E0E0E0] hover:text-white transition-colors cursor-pointer opacity-70 hover:opacity-100" 
              title="Chuyển tiếp"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg>
            </button>
          )}
          <button onClick={handleDownload} className="text-[#E0E0E0] hover:text-white transition-colors cursor-pointer opacity-70 hover:opacity-100" title="Tải xuống">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <div className="w-[1px] h-4 bg-[#444444] mx-1" />
          
          <button 
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="text-[#E0E0E0] hover:text-white transition-colors cursor-pointer opacity-70 hover:opacity-100" 
            title="Xoay ảnh"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>

          <button 
            onClick={() => setScale(prev => Math.min(prev + 0.25, 3))}
            className="text-[#E0E0E0] hover:text-white transition-colors cursor-pointer opacity-70 hover:opacity-100" 
            title="Phóng to"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>

          <button 
            onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
            className="text-[#E0E0E0] hover:text-white transition-colors cursor-pointer opacity-70 hover:opacity-100" 
            title="Thu nhỏ"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
           <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white cursor-pointer hover:bg-white/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
           </button>
           <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white cursor-pointer hover:bg-white/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/></svg>
           </button>
        </div>
      </div>

      {/* Right Sidebar */}
      <div 
        className={`bg-[#1A1A1A] border-l border-[#333333] pt-12 pb-14 overflow-y-auto custom-scrollbar flex flex-col absolute right-0 top-0 bottom-0 z-30 transition-transform duration-300 w-[120px] scroll-smooth ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex-1 p-2 space-y-4">
          {Object.keys(groupedMedia).map((dateStr) => (
            <div key={dateStr} className="flex flex-col items-center">
              <div className="text-[#888888] text-[11px] mb-2">{dateStr}</div>
              <div className="flex flex-col gap-2 w-full">
                {groupedMedia[dateStr].map((item) => {
                  const isSelected = item.originalIndex === currentIndex;
                  return (
                    <button
                      key={item.originalIndex}
                      ref={isSelected ? activeThumbRef : null}
                      onClick={() => setCurrentIndex(item.originalIndex)}
                      className={`relative w-full aspect-square rounded-md overflow-hidden border-2 cursor-pointer transition-colors ${isSelected ? 'border-[#0068FF]' : 'border-transparent hover:border-white/30'}`}
                    >
                       {item.messageType === 'VIDEO' ? (
                          <video src={item.content} className="w-full h-full object-cover" />
                       ) : (
                          <img src={item.content} className="w-full h-full object-cover" />
                       )}
                       {item.messageType === 'VIDEO' && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                       )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
