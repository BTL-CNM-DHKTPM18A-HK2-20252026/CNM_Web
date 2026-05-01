import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import {
  XIcon,
  ArrowLeftIcon,
  VideoPickerIcon as MediaIcon,
  SmileIcon,
  MapPinIcon,
  ChevronDownIcon,
  PlusIcon
} from '@/components/ui/Icons';

interface CreatePostModalProps {
  user: any;
  onClose: () => void;
  onShare: (data: {
    content: string;
    files: File[];
    location?: string;
    altText?: string;
    hideLikes?: boolean;
    turnOffComments?: boolean;
    sharedPostId?: string;
  }) => Promise<void>;
  sharedPost?: any;
}

type Step = 'select' | 'details';

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ user, onClose, onShare }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('select');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hideLikes, setHideLikes] = useState(false);
  const [disableComments, setDisableComments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [location, setLocation] = useState('');
  const [altText, setAltText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoThumbnails, setVideoThumbnails] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If sharing, start at details step
  React.useEffect(() => {
    if (sharedPost) {
      setStep('details');
    }
  }, [sharedPost]);

  const emojis = ['😀', '😍', '🔥', '🙌', '✨', '❤️', '📍', '💯', '🚀', '📸'];
  const mockLocations = [
    'Hồ Chí Minh, Việt Nam',
    'Hà Nội, Việt Nam',
    'Đà Nẵng, Việt Nam',
    'Phú Quốc, Việt Nam',
    'Sapa, Việt Nam'
  ];

  const generateVideoThumbnail = (file: File, index: number) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = 0.5; // Capture frame at 0.5s
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg');
      setVideoThumbnails(prev => ({ ...prev, [index]: thumbnail }));
      URL.revokeObjectURL(video.src);
    };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB
    const currentTotalSize = files.reduce((acc, f) => acc + f.size, 0);
    let cumulativeNewSize = 0;

    const currentImages = files.filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)).length;
    const currentVideos = files.filter(f => f.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(f.name)).length;
    const currentOthers = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/') && !/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv|webm)$/i.test(f.name)).length;

    let newImages = 0;
    let newVideos = 0;
    let newOthers = 0;
    const validNewFiles: File[] = [];
    let sizeLimitReached = false;

    for (const file of selectedFiles) {
      // Check total size limit first
      if (currentTotalSize + cumulativeNewSize + file.size > MAX_TOTAL_SIZE) {
        sizeLimitReached = true;
        continue;
      }

      const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
      const isVid = file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name);

      if (isImg) {
        if (currentImages + newImages < 10) {
          validNewFiles.push(file);
          newImages++;
          cumulativeNewSize += file.size;
        }
      } else if (isVid) {
        if (currentVideos + newVideos < 3) {
          validNewFiles.push(file);
          newVideos++;
          cumulativeNewSize += file.size;
        }
      } else {
        if (currentOthers + newOthers < 3) {
          validNewFiles.push(file);
          newOthers++;
          cumulativeNewSize += file.size;
        }
      }
    }

    if (sizeLimitReached) {
      alert('Tổng dung lượng bài viết không được vượt quá 20MB!');
    } else if (validNewFiles.length < selectedFiles.length) {
      alert(t('social.create_post.limit_warning', { 
        images: 10, 
        videos: 3, 
        others: 3 
      }) || 'Giới hạn: 10 ảnh, 3 video, 3 file khác');
    }

    if (validNewFiles.length > 0) {
      const startingIndex = files.length;
      setFiles(prev => [...prev, ...validNewFiles]);
      const newPreviews = validNewFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
      
      // Generate thumbnails for new videos
      validNewFiles.forEach((file, idx) => {
        const isVid = file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name);
        if (isVid) {
          generateVideoThumbnail(file, startingIndex + idx);
        }
      });

      if (step === 'select') setStep('details');
    }
    
    if (e.target) e.target.value = '';
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setFiles(newFiles);
    setPreviews(newPreviews);
    
    // Cleanup and re-map video thumbnails
    const newThumbnails: Record<number, string> = {};
    Object.entries(videoThumbnails).forEach(([key, value]) => {
      const idx = parseInt(key);
      if (idx < index) newThumbnails[idx] = value;
      else if (idx > index) newThumbnails[idx - 1] = value;
    });
    setVideoThumbnails(newThumbnails);

    if (newFiles.length === 0) setStep('select');
    if (currentIndex >= newFiles.length) setCurrentIndex(Math.max(0, newFiles.length - 1));
  };

  const handleShare = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onShare({
        content: caption,
        files,
        location,
        altText,
        hideLikes,
        turnOffComments: disableComments,
        sharedPostId: sharedPost?.postId
      });
      onClose();
    } catch (error) {
      console.error('Error sharing post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:opacity-70 transition-opacity z-[20001] cursor-pointer"
      >
        <XIcon size={32} />
      </button>

      {/* Main Container */}
      <div className={`relative bg-white dark:bg-[#262626] rounded-xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col ${step === 'select' ? 'w-[500px] h-[500px]' : 'w-[940px] h-[720px]'
        }`}>

        {/* Hidden File Input (Always available) */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="*"
          onChange={handleFileSelect}
        />

        {/* Header */}
        <div className="h-11 border-b border-gray-100 dark:border-[#363636] flex items-center justify-between px-4 shrink-0">
          <div className="min-w-[80px] w-fit">
            {step === 'details' ? (
              <button onClick={() => setStep('select')} className="cursor-pointer hover:opacity-60">
                <ArrowLeftIcon size={24} />
              </button>
            ) : (
              <button onClick={onClose} className="cursor-pointer hover:opacity-60">
                <XIcon size={24} />
              </button>
            )}
          </div>
          <h2 className="text-[16px] font-bold">
            {t('social.create_post.title')}
          </h2>
          <div className="min-w-[80px] w-fit flex justify-end">
            {step === 'details' && (
              <button
                onClick={handleShare}
                disabled={isSubmitting}
                className="text-[#0095F6] font-bold text-[14px] hover:text-[#00376B] transition-colors cursor-pointer disabled:opacity-30"
              >
                {isSubmitting ? t('social.create_post.sharing') : t('social.create_post.share')}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {step === 'select' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <MediaIcon size={96} className="text-gray-400 mb-4" />
              <p className="text-[20px] font-medium mb-6">{t('social.create_post.drag_hint')}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#0095F6] text-white px-4 py-2 rounded-lg font-bold text-[14px] hover:bg-[#1877F2] transition-colors cursor-pointer"
              >
                {t('social.create_post.select_btn')}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex w-full">
              {/* Media Preview Section */}
              <div className="flex-1 flex flex-col bg-black relative transition-colors duration-700 overflow-hidden" 
                   style={{
                     background: (() => {
                       const file = files[currentIndex];
                       if (!file) return '#000';
                       const name = file.name;
                       const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
                       const isVid = file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(name);
                       if (isImg || isVid) return '#000';
                       
                       const isPdf = /\.pdf$/i.test(name);
                       const isWord = /\.(doc|docx)$/i.test(name);
                       const isExcel = /\.(xls|xlsx)$/i.test(name);
                       const isPpt = /\.(ppt|pptx)$/i.test(name);
                       const isZip = /\.(zip|rar|7z)$/i.test(name);

                       let baseColor = "rgba(100,100,100,0.3)";
                       if (isPdf) baseColor = "rgba(255, 0, 0, 0.25)";
                       else if (isWord) baseColor = "rgba(43, 87, 154, 0.25)";
                       else if (isExcel) baseColor = "rgba(33, 115, 70, 0.25)";
                       else if (isPpt) baseColor = "rgba(210, 71, 38, 0.25)";
                       else if (isZip) baseColor = "rgba(123, 31, 162, 0.25)";

                       return `radial-gradient(circle at center, ${baseColor} 0%, #000 80%)`;
                     })()
                   }}>
                {/* File Statistics Overlay */}
                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 text-white text-[11px] shadow-2xl min-w-[160px]">
                    <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1">
                      <span className="font-bold opacity-70 uppercase tracking-wider">Thống kê file</span>
                      <span className="font-bold text-[#0095F6]">
                        {(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      {[
                        { label: 'Ảnh', test: (f: File) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name) },
                        { label: 'Video', test: (f: File) => f.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(f.name) },
                        { label: 'PDF', test: (f: File) => /\.pdf$/i.test(f.name) },
                        { label: 'Word', test: (f: File) => /\.(doc|docx)$/i.test(f.name) },
                        { label: 'Excel', test: (f: File) => /\.(xls|xlsx)$/i.test(f.name) },
                        { label: 'PowerPoint', test: (f: File) => /\.(ppt|pptx)$/i.test(f.name) },
                        { label: 'ZIP/RAR', test: (f: File) => /\.(zip|rar|7z)$/i.test(f.name) },
                        { 
                          label: 'Khác', 
                          test: (f: File) => !f.type.startsWith('image/') && 
                                          !f.type.startsWith('video/') && 
                                          !/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv|webm|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z)$/i.test(f.name) 
                        },
                      ].map((group, idx) => {
                        const groupFiles = files.filter(group.test);
                        if (groupFiles.length === 0) return null;
                        
                        const size = groupFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024;
                        
                        return (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="opacity-60">{group.label} ({groupFiles.length})</span>
                            <span className="font-medium">{size.toFixed(2)} MB</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 90% Image Area */}
                <div className="flex-1 relative group/media overflow-hidden flex items-center justify-center">
                  {sharedPost && files.length === 0 && (
                    <div className="w-full max-w-[420px] bg-white dark:bg-black rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-500 mx-auto">
                      <div className="p-3 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800">
                        <div className="w-6 h-6 rounded-full overflow-hidden relative">
                           <Image src={sharedPost.authorAvatar || "/avatar.jpg"} fill alt="Original Author" className="object-cover" />
                        </div>
                        <span className="text-[13px] font-bold">{sharedPost.authorName}</span>
                      </div>
                      <div className="p-4 text-[14px]">
                        {sharedPost.content}
                      </div>
                      {sharedPost.mediaList && sharedPost.mediaList.length > 0 && (
                        <div className="relative aspect-video">
                          <img src={sharedPost.mediaList[0].url} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  )}

                  {previews[currentIndex] && (() => {
                    const file = files[currentIndex];
                    const name = file?.name || '';
                    const isVid = file?.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(name);
                    const isImg = file?.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
                    
                    if (isVid) {
                      return (
                        <video src={previews[currentIndex]} className="w-full h-full object-cover" controls />
                      );
                    }
                    
                    if (isImg) {
                      return (
                        <Image src={previews[currentIndex]} fill alt="Preview" className="object-cover" />
                      );
                    }

                    // Document Card UI
                    const isPdf = /\.pdf$/i.test(name);
                    const isWord = /\.(doc|docx)$/i.test(name);
                    const isExcel = /\.(xls|xlsx)$/i.test(name);
                    const isPpt = /\.(ppt|pptx)$/i.test(name);
                    const isZip = /\.(zip|rar|7z)$/i.test(name);

                    let color = "bg-gray-500";
                    let ext = "FILE";
                    let glow = "shadow-[0_0_50px_-12px_rgba(255,255,255,0.3)]";

                    if (isPdf) { color = "bg-[#FF0000]"; ext = "PDF"; glow = "shadow-[0_0_50px_-12px_rgba(255,0,0,0.5)]"; }
                    else if (isWord) { color = "bg-[#2B579A]"; ext = "DOCX"; glow = "shadow-[0_0_50px_-12px_rgba(43,87,154,0.5)]"; }
                    else if (isExcel) { color = "bg-[#217346]"; ext = "XLSX"; glow = "shadow-[0_0_50px_-12px_rgba(33,115,70,0.5)]"; }
                    else if (isPpt) { color = "bg-[#D24726]"; ext = "PPTX"; glow = "shadow-[0_0_50px_-12px_rgba(210,71,38,0.5)]"; }
                    else if (isZip) { color = "bg-[#7B1FA2]"; ext = "ZIP"; glow = "shadow-[0_0_50px_-12px_rgba(123,31,162,0.5)]"; }

                    return (
                      <div className="flex flex-col items-center justify-center p-12 text-white animate-in zoom-in-95 duration-500">
                        {/* Glowing Card */}
                        <div className={`w-40 h-52 ${color} rounded-2xl ${glow} relative overflow-hidden flex flex-col items-center justify-center mb-6 transition-transform hover:scale-105 duration-300`}>
                          <div className="absolute top-0 left-0 w-full h-1/3 bg-white/10" />
                          <MediaIcon size={64} className="text-white/90 mb-2" />
                          <span className="font-black text-2xl tracking-tighter">{ext}</span>
                          <div className="absolute bottom-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white/60 w-2/3" />
                          </div>
                        </div>
                        
                        <div className="max-w-[400px] text-center">
                          <p className="font-bold text-xl mb-2 line-clamp-2 leading-tight">
                            {name}
                          </p>
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                            <span className="text-[12px] font-medium text-gray-300">
                              {(file?.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Navigation Arrows (Absolute to image area) */}
                  {previews.length > 1 && (
                    <>
                      {currentIndex > 0 && (
                        <button
                          onClick={() => setCurrentIndex(prev => prev - 1)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-[#0095F6] transition-all z-10 cursor-pointer shadow-lg border border-white/10"
                        >
                          <ArrowLeftIcon size={24} />
                        </button>
                      )}
                      {currentIndex < previews.length - 1 && (
                        <button
                          onClick={() => setCurrentIndex(prev => prev + 1)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-[#0095F6] transition-all z-10 rotate-180 cursor-pointer shadow-lg border border-white/10"
                        >
                          <ArrowLeftIcon size={24} />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* 10% Media Controls Bar (Solid Bottom) */}
                <div className="h-[90px] bg-black flex items-center justify-between px-4 shrink-0 border-t border-white/5">
                  <div className="flex-1 flex gap-2.5 overflow-x-auto scrollbar-hide py-2">
                    {previews.map((preview, idx) => {
                      const file = files[idx];
                      const name = file?.name || '';
                      const isImg = file?.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
                      const isVid = file?.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(name);
                      const isPdf = /\.pdf$/i.test(name);
                      const isWord = /\.(doc|docx)$/i.test(name);
                      const isExcel = /\.(xls|xlsx)$/i.test(name);
                      const isPpt = /\.(ppt|pptx)$/i.test(name);
                      const isZip = /\.(zip|rar|7z)$/i.test(name);

                      let thumbColor = "bg-gray-700";
                      let thumbExt = "FILE";
                      if (isPdf) { thumbColor = "bg-[#FF0000]"; thumbExt = "PDF"; }
                      else if (isWord) { thumbColor = "bg-[#2B579A]"; thumbExt = "DOCX"; }
                      else if (isExcel) { thumbColor = "bg-[#217346]"; thumbExt = "XLSX"; }
                      else if (isPpt) { thumbColor = "bg-[#D24726]"; thumbExt = "PPTX"; }
                      else if (isZip) { thumbColor = "bg-[#7B1FA2]"; thumbExt = "ZIP"; }
                      
                      return (
                        <div
                          key={idx}
                          onClick={() => setCurrentIndex(idx)}
                          className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${idx === currentIndex ? 'border-[#0095F6] scale-110 z-10 ring-4 ring-[#0095F6]/20' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'
                            }`}
                        >
                          {isVid ? (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center relative">
                              {videoThumbnails[idx] ? (
                                <Image src={videoThumbnails[idx]} fill alt="Video Thumb" className="object-cover opacity-80" />
                              ) : (
                                <div className="absolute inset-0 bg-gray-800" />
                              )}
                              <div className="relative z-10 w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-0.5 drop-shadow-md" />
                            </div>
                          ) : isImg ? (
                            <Image src={preview} fill alt="Thumb" className="object-cover" />
                          ) : (
                            <div className={`w-full h-full ${thumbColor} flex flex-col items-center justify-center p-1 shadow-inner`}>
                              <MediaIcon size={18} className="text-white/80 mb-0.5" />
                              <span className="text-[9px] text-white font-black leading-none uppercase">
                                {thumbExt}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 pl-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-10 h-10 bg-white/10 text-white rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                      title="Them anh/video/file"
                    >
                      <PlusIcon size={24} />
                    </button>
                    <button
                      onClick={() => removeFile(currentIndex)}
                      className="w-10 h-10 bg-red-500/20 text-white rounded-lg flex items-center justify-center hover:bg-red-500/40 transition-colors cursor-pointer"
                      title="Xoa"
                    >
                      <XIcon size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Side */}
              <div className="w-[340px] flex flex-col border-l border-gray-100 dark:border-[#363636] bg-white dark:bg-[#262626] overflow-y-auto scrollbar-hide">
                <div className="p-4 flex items-center gap-3 shrink-0">
                  <div className="w-7 h-7 rounded-full overflow-hidden relative">
                    <Image src={user?.avatar_url || "/avatar.jpg"} fill alt="Me" className="object-cover" />
                  </div>
                  <span className="font-bold text-[14px]">
                    {user?.full_name || user?.display_name || user?.name || user?.username || 'User'}
                  </span>
                </div>

                <textarea
                  placeholder={t('social.create_post.caption_placeholder')}
                  className="w-full min-h-[150px] p-4 bg-transparent resize-none outline-none text-[16px] shrink-0"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />

                <div className="p-4 border-t border-gray-100 dark:border-[#363636] space-y-2 relative">
                  <div className="flex items-center justify-between text-gray-400 mb-2 pr-2 relative">
                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="cursor-pointer hover:opacity-60 transition-opacity"
                      >
                        <SmileIcon size={20} />
                      </button>

                      {showEmojiPicker && (
                        <div className="absolute bottom-full mb-2 left-0 w-[240px] bg-[#262626] border border-[#363636] rounded-xl shadow-2xl z-[20100] animate-in slide-in-from-bottom-2 duration-200 overflow-hidden">
                          {/* Inline style to hide scrollbar */}
                          <style dangerouslySetInnerHTML={{
                            __html: `
                            .custom-emoji-scrollbar::-webkit-scrollbar { display: none; }
                            .custom-emoji-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                          `}} />

                          {/* Little Arrow */}
                          <div className="absolute bottom-[-6px] left-2 w-3 h-3 bg-[#262626] rotate-45 border-r border-b border-[#363636]" />

                          <div className="p-3">
                            <div className="text-[13px] font-medium text-gray-300 mb-3 px-1">
                              {t('social.create_post.most_popular')}
                            </div>

                            <div className="flex gap-2 relative">
                              <div className="flex-1 grid grid-cols-6 gap-1.5 max-h-[120px] overflow-y-auto pr-3 custom-emoji-scrollbar">
                                {[...emojis, ...emojis, ...emojis].map((emoji, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      setCaption(prev => prev + emoji);
                                      setShowEmojiPicker(false);
                                    }}
                                    className="text-[18px] hover:scale-120 transition-transform cursor-pointer p-0.5 flex items-center justify-center"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>

                              {/* Custom Scrollbar Decoration - Slimmer and Integrated */}
                              <div className="w-2.5 flex flex-col items-center py-1 bg-transparent">
                                <div className="text-[6px] text-gray-500 mb-0.5 opacity-50">▲</div>
                                <div className="flex-1 w-[3px] bg-gray-600 rounded-full my-0.5" />
                                <div className="text-[6px] text-gray-500 mt-0.5 opacity-50">▼</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] font-medium">{caption.length}/2,200</span>
                  </div>

                  {/* Location Section */}
                  <div className="border-b border-gray-100 dark:border-[#363636] py-3 pr-2 relative">
                    <div className="flex items-center justify-between group">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder={t('social.create_post.add_location')}
                        className="bg-transparent border-none outline-none text-[15px] w-full placeholder:text-gray-500"
                      />
                      <button
                        onClick={() => setShowLocationSuggestions(!showLocationSuggestions)}
                        className="cursor-pointer hover:opacity-60 transition-opacity shrink-0"
                      >
                        <MapPinIcon size={20} className="text-black dark:text-white" />
                      </button>
                    </div>

                    {showLocationSuggestions && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-[#262626] border border-gray-100 dark:border-[#363636] rounded-xl shadow-2xl z-[20050] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="p-2 border-b border-gray-100 dark:border-[#363636] bg-gray-50 dark:bg-[#1a1a1a] text-[12px] font-bold text-gray-500">
                          GỢI Ý VỊ TRÍ
                        </div>
                        {mockLocations.map(loc => (
                          <button
                            key={loc}
                            onClick={() => {
                              setLocation(loc);
                              setShowLocationSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-[14px] hover:bg-gray-100 dark:hover:bg-[#363636] transition-colors cursor-pointer border-b last:border-0 border-gray-50 dark:border-gray-800"
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Accessibility Section */}
                  <details className="group border-b border-gray-100 dark:border-[#363636]">
                    <summary className="flex items-center justify-between py-3 pr-2 cursor-pointer list-none">
                      <span className="text-[15px] font-medium">{t('social.create_post.accessibility')}</span>
                      <ChevronDownIcon size={18} className="group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="pb-4 pt-1 px-1">
                      <p className="text-[12px] text-gray-500 mb-3">
                        {t('social.create_post.accessibility_desc')}
                      </p>
                      <div className="flex gap-3 items-center">
                        <div className="w-11 h-11 relative bg-gray-100 shrink-0">
                          <Image src={previews[0]} fill alt="Thumbnail" className="object-cover" />
                        </div>
                        <input
                          type="text"
                          value={altText}
                          onChange={(e) => setAltText(e.target.value)}
                          placeholder={t('social.create_post.alt_text_placeholder')}
                          className="flex-1 bg-transparent border border-gray-200 dark:border-gray-800 rounded px-2 py-1.5 text-[14px] outline-none focus:border-gray-400"
                        />
                      </div>
                    </div>
                  </details>

                  {/* Advanced Settings Section */}
                  <details className="group">
                    <summary className="flex items-center justify-between py-3 pr-2 cursor-pointer list-none">
                      <span className="text-[15px] font-medium">{t('social.create_post.advanced_settings')}</span>
                      <ChevronDownIcon size={18} className="group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="pb-4 pt-1 space-y-4 pr-2">
                      <div>
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-[14px] pt-0.5">{t('social.create_post.hide_likes')}</span>
                          <button
                            onClick={() => setHideLikes(!hideLikes)}
                            className={`w-8 h-4.5 rounded-full relative cursor-pointer transition-colors duration-200 shrink-0 mt-1 ${hideLikes ? 'bg-[#0095F6]' : 'bg-gray-200 dark:bg-gray-700'}`}
                          >
                            <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-200 ${hideLikes ? 'left-[16px]' : 'left-0.5'}`} />
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-tight">
                          {t('social.create_post.hide_likes_desc')}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-[14px] pt-0.5">{t('social.create_post.turn_off_comments')}</span>
                          <button
                            onClick={() => setDisableComments(!disableComments)}
                            className={`w-8 h-4.5 rounded-full relative cursor-pointer transition-colors duration-200 shrink-0 mt-1 ${disableComments ? 'bg-[#0095F6]' : 'bg-gray-200 dark:bg-gray-700'}`}
                          >
                            <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-200 ${disableComments ? 'left-[16px]' : 'left-0.5'}`} />
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-tight">
                          {t('social.create_post.turn_off_comments_desc')}
                        </p>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
