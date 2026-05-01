import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
  Pause,
  CheckCircle2,
  Plus,
  Search,
  Copy,
  Layers,
  PlaySquare,
  Music,
  X,
  Send,
  Smile,
  Link,
  MessageCircle as MessageCircleIcon,
  Mail,
  Code,
  AlertCircle,
  Frown,
  MessageSquare,
  ChevronDown,
  Globe,
  Image as ImageIcon,
  MoreVertical,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  Settings,
  Keyboard,
  Clock,
  Flag,
  Smartphone,
  PlayCircle
} from 'lucide-react';
import { useTheme } from '@/themes';
import { socialApi } from '../api';
import { PostResponse } from '../types';
import { toast } from 'sonner';

interface ExploreItem {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  url: string;
  thumbnail: string;
  likes: string;
  comments: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  caption?: string;
}

const CATEGORIES = [
  'social.explore.all',
  'social.explore.nature',
  'social.explore.architecture',
  'social.explore.fashion',
  'social.explore.tech',
  'social.explore.food',
  'social.explore.travel',
  'social.explore.art'
];

export const SocialExplore: React.FC = () => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [viewMode, setViewMode] = useState<'grid' | 'reels'>('reels');
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [initialReelIndex, setInitialReelIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'comments' | 'share' | 'favorites' | 'settings' | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollNext = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: scrollContainerRef.current.clientHeight, behavior: 'smooth' });
    }
  };

  const scrollPrev = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: -scrollContainerRef.current.clientHeight, behavior: 'smooth' });
    }
  };

  // Load mock data from public folder
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/mock/explore_data.json');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setItems(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const videoItems = items.filter(item => item.type === 'VIDEO');

  if (isLoading) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className={`w-full h-full flex flex-col relative ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Top Search Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-[calc(50%+50px)] z-[60] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]">
        {!isSearchModalOpen ? (
          <div className={`w-[460px] flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${isDark ? 'bg-[#1A1A1A]/80 border-white/5 focus-within:border-white/20' : 'bg-white/80 border-gray-200 focus-within:border-blue-500'
            } backdrop-blur-md`}>
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder={t('social.search.placeholder', 'Tìm kiếm')}
              className="bg-transparent border-none outline-none text-[13px] w-full cursor-text"
              onFocus={() => setIsSearchModalOpen(true)}
            />
          </div>
        ) : (
          <ExploreSearchModal onClose={() => setIsSearchModalOpen(false)} isDark={isDark} />
        )}
      </div>

      {/* Reels Vertical Feed */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-hide h-full"
      >
        {videoItems.map((item) => (
          <ReelItem
            key={item.id}
            item={item}
            onPrev={scrollPrev}
            onNext={scrollNext}
            activePanel={activePanel}
            setActivePanel={setActivePanel}
          />
        ))}
      </div>
    </div>
  );
};

const ReelItem: React.FC<{
  item: ExploreItem;
  onNext: () => void;
  onPrev: () => void;
  activePanel: 'comments' | 'share' | 'favorites' | 'settings' | null;
  setActivePanel: (panel: 'comments' | 'share' | 'favorites' | 'settings' | null) => void;
}> = ({ item, onNext, onPrev, activePanel, setActivePanel }) => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ── Watch tracking refs ───────────────────────────────────────────────────
  const watchStartTime = useRef<number>(0);
  const totalWatched = useRef<number>(0);
  const rewatchCount = useRef<number>(0);
  const hasWatchedOnce = useRef<boolean>(false);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Entered viewport — start tracking
          watchStartTime.current = Date.now();
          if (hasWatchedOnce.current) rewatchCount.current += 1;
          hasWatchedOnce.current = true;
          setIsPlaying(true);
          videoRef.current?.play().catch(() => {});
        } else {
          // Left viewport — send watch event
          const sessionDuration = (Date.now() - watchStartTime.current) / 1000;
          totalWatched.current += sessionDuration;
          const vid = videoRef.current;
          if (vid && vid.duration > 0) {
            socialApi.trackReelWatch({
              reelId: item.id,
              watchedDuration: Math.min(totalWatched.current, vid.duration),
              totalDuration: vid.duration,
              isCompleted: (totalWatched.current / vid.duration) >= 0.9,
              rewatchCount: rewatchCount.current,
              source: 'explore',
            });
          }
          setIsPlaying(false);
          videoRef.current?.pause();
          setActivePanel(null);
        }
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [item.id]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  return (
    <div className={`h-full w-full flex items-center justify-start snap-start shrink-0 relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-white'
      }`}>
      {/* Video + Sidebar layout */}
      <div className="relative flex items-center gap-6 h-[88vh] w-full px-4 py-4 justify-center">
        {/* Video Player Container */}
        <div className={`relative h-full bg-black rounded-2xl overflow-hidden group/reel border border-white/10 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${activePanel ? 'flex-1 max-w-[calc(50%-1.5rem)]' : 'aspect-[9/16]'
          }`}>
          <video
            ref={videoRef}
            src={item.url}
            className="w-full h-full object-cover cursor-pointer"
            loop
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onClick={() => {
              if (isPlaying) {
                videoRef.current?.pause();
                setIsPlaying(false);
              } else {
                videoRef.current?.play();
                setIsPlaying(true);
              }
            }}
            playsInline
          />

          {/* Gradient Overlays */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/70"></div>

          {/* Top: Author + Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full border-2 border-white/30 p-0.5 overflow-hidden">
                <img src={item.author.avatar} className="w-full h-full rounded-full object-cover" alt="" />
              </div>
              <span className="font-bold text-white text-[13px] drop-shadow-md">{item.author.name}</span>
              <CheckCircle2 size={12} className="text-blue-400 fill-current" />
              <button className="px-3 py-1 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-lg text-white text-[11px] font-bold border border-white/10 cursor-pointer transition-all">
                {t('social.suggestions.follow', 'Theo dõi')}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-all cursor-pointer"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-all cursor-pointer">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>

          {/* Bottom: Caption + Music + Progress */}
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none text-white">
            <p className="text-[13px] font-bold mb-1 drop-shadow-md line-clamp-2">
              Một buổi tối chill trên rooftop 🌙
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="text-[11px] font-bold text-blue-400">#chillvibes</span>
              <span className="text-[11px] font-bold text-blue-400">#rooftop</span>
              <span className="text-[11px] font-bold text-blue-400">#sunset</span>
              <span className="text-[11px] font-bold text-blue-400">#relax</span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Music size={13} className="text-white/70" />
              <span className="text-[11px] font-semibold">Chill Vibes</span>
              <span className="text-[11px] text-white/60">Lo-fi • 02:34</span>
            </div>

            <div className="text-[11px] font-mono text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Progress Bar at bottom of video */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20 pointer-events-none">
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Pause indicator */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
                <Play size={32} className="text-white fill-current ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Right Side Interaction Bar - OUTSIDE video */}
        <div className="flex flex-col gap-5 pb-4 shrink-0 z-10 items-center">
          {/* Nav Up */}
          <div className="flex flex-col items-center gap-1 mb-2">
            <button
              onClick={onPrev}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer group border ${isDark ? 'bg-[#1A1A1A] border-white/5 text-white hover:bg-[#262626]' : 'bg-white border-gray-200 text-black hover:bg-gray-50 shadow-sm'
                }`}>
              <ArrowUp size={24} strokeWidth={2.5} className="group-hover:-translate-y-1 transition-transform" />
            </button>
            <span className="text-[9px] font-medium text-gray-500 text-center leading-tight max-w-[60px]">
              Xem video trước đó
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer group border ${isDark ? 'bg-[#1A1A1A] border-white/5 text-white hover:bg-[#262626]' : 'bg-white border-gray-200 text-black hover:bg-gray-50 shadow-sm'
              }`}>
              <Heart size={26} strokeWidth={2.2} className="group-hover:scale-110 group-hover:text-red-500 transition-all" />
            </button>
            <span className={`font-bold text-[12px] ${isDark ? 'text-white' : 'text-black'}`}>12.4K</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => setActivePanel(activePanel === 'comments' ? null : 'comments')}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer group border ${activePanel === 'comments' ? 'bg-[#262626] border-white/20' : (isDark ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-gray-200')} text-white hover:bg-[#262626] shadow-sm`
              }>
              <MessageCircle size={26} strokeWidth={2.2} className="group-hover:scale-110 transition-all" />
            </button>
            <span className={`font-bold text-[12px] ${isDark ? 'text-white' : 'text-black'}`}>256</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => setActivePanel(activePanel === 'share' ? null : 'share')}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer group border ${activePanel === 'share' ? 'bg-[#262626] border-white/20' : (isDark ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-gray-200')} text-white hover:bg-[#262626] shadow-sm`
              }>
              <Share2 size={26} strokeWidth={2.2} className="group-hover:scale-110 transition-all" />
            </button>
            <span className={`font-bold text-[12px] ${isDark ? 'text-white' : 'text-black'}`}>128</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => setActivePanel(activePanel === 'favorites' ? null : 'favorites')}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer group border ${activePanel === 'favorites' ? 'bg-[#262626] border-white/20' : (isDark ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-gray-200')} text-white hover:bg-[#262626] shadow-sm`
              }>
              <Bookmark size={26} strokeWidth={2.2} className="group-hover:scale-110 transition-all" />
            </button>
            <span className={`font-bold text-[12px] ${isDark ? 'text-white' : 'text-black'}`}>1.2K</span>
          </div>

          <button
            onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer group border ${activePanel === 'settings' ? 'bg-[#262626] border-white/20' : (isDark ? 'bg-[#1A1A1A] border-white/5' : 'bg-white border-gray-200')} text-white hover:bg-[#262626] shadow-sm`
            }>
            <MoreHorizontal size={26} strokeWidth={2.2} className="group-hover:scale-110 transition-all" />
          </button>

          {/* Nav Down */}
          <div className="flex flex-col items-center gap-1 mt-2">
            <button
              onClick={onNext}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer group border ${isDark ? 'bg-[#1A1A1A] border-white/5 text-white hover:bg-[#262626]' : 'bg-white border-gray-200 text-black hover:bg-gray-50 shadow-sm'
                }`}>
              <ArrowDown size={24} strokeWidth={2.5} className="group-hover:translate-y-1 transition-transform" />
            </button>
            <span className="text-[9px] font-medium text-gray-500 text-center leading-tight max-w-[60px]">
              Xem video tiếp theo
            </span>
          </div>
        </div>

        {/* Side Panels Container */}
        <div className={`h-full transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden flex ${activePanel ? 'flex-1 opacity-100 max-w-[50%]' : 'w-0 opacity-0'
          }`}>
          <div className="w-full h-full min-w-[350px]">
            {activePanel === 'comments' && <CommentPanel onClose={() => setActivePanel(null)} isDark={isDark} />}
            {activePanel === 'share' && <SharePanel onClose={() => setActivePanel(null)} isDark={isDark} />}
            {activePanel === 'favorites' && <FavoritesPanel onClose={() => setActivePanel(null)} isDark={isDark} />}
            {activePanel === 'settings' && <SettingsPanel onClose={() => setActivePanel(null)} isDark={isDark} />}
          </div>
        </div>
      </div>
    </div>
  );
};

const CommentPanel: React.FC<{ onClose: () => void; isDark: boolean }> = ({ onClose, isDark }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');

  return (
    <div className={`w-full h-full rounded-2xl flex flex-col border transition-colors ${isDark ? 'bg-[#121212] border-white/10 text-white' : 'bg-white border-gray-200 text-black'}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <span className="font-bold text-[15px]">Bình luận (256)</span>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Tabs & Sort */}
      <div className="px-4 pb-2 border-b border-white/5 flex items-center justify-between">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`text-[13px] font-bold pb-2 border-b-2 transition-all ${activeTab === 'all' ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`text-[13px] font-bold pb-2 border-b-2 transition-all ${activeTab === 'following' ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Đang theo dõi
          </button>
        </div>
        <button className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 hover:text-white transition-colors">
          Sắp xếp: Mới nhất
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {/* Comment Thread */}
        <div className="space-y-4">
          <div className="flex gap-3 relative">
            {/* Vertical Line for thread */}
            <div className="absolute left-[15px] top-[32px] bottom-[-20px] w-[1px] bg-[#333]"></div>

            <img src="https://i.pravatar.cc/150?u=linh" className="w-8 h-8 rounded-full shrink-0 z-10" alt="" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[13px]">linh.nguyen</span>
                  <span className="text-gray-500 text-[11px]">2 giờ</span>
                </div>
                <button className="text-gray-500 hover:text-white">
                  <MoreHorizontal size={16} />
                </button>
              </div>
              <p className="text-[13px]">Chill quá, view xịn xò!</p>
              <div className="flex items-center gap-4 pt-1">
                <button className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors">Trả lời</button>
                <div className="flex items-center gap-1 text-gray-500">
                  <Heart size={14} />
                  <span className="text-[11px]">128</span>
                </div>
              </div>

              {/* Reply Thread */}
              <div className="pt-3 flex gap-3 relative">
                {/* Connector Line */}
                <div className="absolute left-[-18px] top-[12px] w-[18px] h-[1px] bg-[#333]"></div>

                <img src="https://i.pravatar.cc/150?u=pexel" className="w-6 h-6 rounded-full shrink-0" alt="" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[12px]">pexel.captures</span>
                      <CheckCircle2 size={10} className="text-blue-400 fill-current" />
                      <span className="text-gray-500 text-[11px]">1 giờ</span>
                    </div>
                    <button className="text-gray-500 hover:text-white">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                  <p className="text-[12px]">Cảm ơn bạn nhiều! ❤️</p>
                  <div className="flex items-center gap-4 pt-1">
                    <button className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors">Trả lời</button>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Heart size={12} />
                      <span className="text-[11px]">32</span>
                    </div>
                  </div>
                </div>
              </div>
              <button className="text-[11px] font-bold text-gray-500 pt-2 flex items-center gap-1">
                <div className="w-6 h-[1px] bg-gray-500" />
                Xem 3 câu trả lời khác
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Another Comment */}
        <div className="flex gap-3">
          <img src="https://i.pravatar.cc/150?u=hoang" className="w-8 h-8 rounded-full shrink-0" alt="" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px]">minh.hoang</span>
                <span className="text-gray-500 text-[11px]">3 giờ</span>
              </div>
              <button className="text-gray-500 hover:text-white">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <p className="text-[13px]">Địa điểm ở đâu vậy ạ?</p>
            <div className="flex items-center gap-4 pt-1">
              <button className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors">Trả lời</button>
              <div className="flex items-center gap-1 text-gray-500">
                <Heart size={14} />
                <span className="text-[11px]">18</span>
              </div>
            </div>
          </div>
        </div>

        {/* More Mock Comments for scrolling */}
        <div className="flex gap-3">
          <img src="https://i.pravatar.cc/150?u=huy" className="w-8 h-8 rounded-full shrink-0" alt="" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px]">quang.huy</span>
                <span className="text-gray-500 text-[11px]">5 giờ</span>
              </div>
              <button className="text-gray-500 hover:text-white">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <p className="text-[13px]">Đẹp quá, cho mình xin info với!</p>
            <div className="flex items-center gap-4 pt-1">
              <button className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors">Trả lời</button>
              <div className="flex items-center gap-1 text-gray-500">
                <Heart size={14} />
                <span className="text-[11px]">15</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <img src="https://i.pravatar.cc/150?u=dung" className="w-8 h-8 rounded-full shrink-0" alt="" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px]">thuy.dung</span>
                <span className="text-gray-500 text-[11px]">5 giờ</span>
              </div>
              <button className="text-gray-500 hover:text-white">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <p className="text-[13px]">Nhạc chill quá, đúng vibe mình thích 😍</p>
            <div className="flex items-center gap-4 pt-1">
              <button className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors">Trả lời</button>
              <div className="flex items-center gap-1 text-gray-500">
                <Heart size={14} />
                <span className="text-[11px]">7</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
          <img src="https://i.pravatar.cc/150?u=current_user" className="w-full h-full object-cover" alt="" />
        </div>
        <div className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-100'}`}>
          <input
            type="text"
            placeholder="Thêm bình luận..."
            className="flex-1 bg-transparent border-none outline-none text-[13px]"
          />
          <div className="flex items-center gap-3 text-gray-400">
            <Smile size={20} className="cursor-pointer hover:text-white transition-colors" />
            <ImageIcon size={20} className="cursor-pointer hover:text-white transition-colors" />
            <button className="text-blue-500 hover:text-blue-400 transition-colors">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SharePanel: React.FC<{ onClose: () => void; isDark: boolean }> = ({ onClose, isDark }) => {
  const shareOptions = [
    { icon: Link, label: 'Sao chép liên kết', color: 'bg-blue-500' },
    { icon: MessageCircleIcon, label: 'Messenger', color: 'bg-[#00B2FF]' },
    { icon: MessageSquare, label: 'Zalo', color: 'bg-[#0068FF]' },
    { icon: MessageCircle, label: 'WhatsApp', color: 'bg-[#25D366]' },
    { icon: Globe, label: 'Facebook', color: 'bg-[#1877F2]' },
    { icon: Share2, label: 'Twitter', color: 'bg-[#1DA1F2]' },
    { icon: Mail, label: 'Email', color: 'bg-gray-500' },
    { icon: MoreHorizontal, label: 'Khác', color: 'bg-gray-700' },
  ];

  const moreOptions = [
    { icon: Code, label: 'Nhúng' },
    { icon: Link, label: 'Sao chép link tại thời điểm hiện tại' },
    { icon: AlertCircle, label: 'Báo cáo' },
    { icon: Frown, label: 'Không quan tâm' },
  ];

  return (
    <div className={`w-full h-full rounded-2xl flex flex-col border transition-colors ${isDark ? 'bg-[#121212] border-white/10 text-white' : 'bg-white border-gray-200 text-black'}`}>
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <span className="font-bold text-[15px]">Chia sẻ</span>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
        <div>
          <span className="text-[13px] font-bold text-gray-400 block mb-4">Chia sẻ nhanh</span>
          <div className="grid grid-cols-4 gap-y-6">
            {shareOptions.map((opt, i) => (
              <div key={i} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className={`w-12 h-12 ${opt.color} rounded-full flex items-center justify-center text-white group-hover:scale-105 transition-transform`}>
                  <opt.icon size={22} />
                </div>
                <span className="text-[10px] text-center px-1 font-medium">{opt.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-[13px] font-bold text-gray-400 block mb-1">Chia sẻ khác</span>
          {moreOptions.map((opt, i) => (
            <button key={i} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isDark ? 'bg-[#1A1A1A] hover:bg-[#262626]' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <div className="flex items-center gap-3">
                <opt.icon size={18} className="text-gray-400" />
                <span className="text-[13px] font-medium">{opt.label}</span>
              </div>
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const FavoritesPanel: React.FC<{ onClose: () => void; isDark: boolean }> = ({ onClose, isDark }) => {
  const collections = [
    { id: '1', title: 'Yêu thích', count: 467, thumb: 'https://images.pexels.com/photos/33109/fall-autumn-red-season.jpg?auto=compress&cs=tinysrgb&w=150', selected: true },
    { id: '2', title: 'Du lịch', count: 128, thumb: 'https://images.pexels.com/photos/2356059/pexels-photo-2356059.jpeg?auto=compress&cs=tinysrgb&w=150' },
    { id: '3', title: 'Inspiration', count: 89, thumb: 'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=150' },
    { id: '4', title: 'Chill vibes', count: 215, thumb: 'https://images.pexels.com/photos/1757363/pexels-photo-1757363.jpeg?auto=compress&cs=tinysrgb&w=150' },
    { id: '5', title: 'Work out', count: 73, thumb: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=150' },
  ];

  return (
    <div className={`w-full h-full rounded-2xl flex flex-col border transition-colors ${isDark ? 'bg-[#121212] border-white/10 text-white' : 'bg-white border-gray-200 text-black'}`}>
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <span className="font-bold text-[15px]">Đã lưu vào mục Yêu thích</span>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-bold text-gray-400">Bộ sưu tập</span>
          <button className="text-blue-500 text-[13px] font-bold flex items-center gap-1 hover:text-blue-400">
            <Plus size={16} />
            Tạo mới
          </button>
        </div>

        <div className="space-y-4">
          {collections.map((col) => (
            <div key={col.id} className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10">
                  <img src={col.thumb} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold">{col.title}</span>
                  <span className="text-[11px] text-gray-500">{col.count} video</span>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${col.selected ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>
                {col.selected && <CheckCircle2 size={14} className="text-white fill-current" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-white/5">
        <button className="w-full text-center text-gray-400 text-[13px] font-bold hover:text-white transition-colors">
          Xem tất cả bộ sưu tập &gt;
        </button>
      </div>
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <div
    onClick={onChange}
    className={`w-10 h-[22px] flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${checked ? 'bg-[#2185FF]' : 'bg-white/20'}`}
  >
    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`} />
  </div>
);

const SettingsPanel: React.FC<{ onClose: () => void; isDark: boolean }> = ({ onClose, isDark }) => {
  const [seekBack, setSeekBack] = useState(5);
  const [seekForward, setSeekForward] = useState(15);
  const [quickSkip, setQuickSkip] = useState('10 giây');
  const [speed, setSpeed] = useState('1.0x');
  const [quality, setQuality] = useState('Auto');
  const [displayOpts, setDisplayOpts] = useState({
    openComments: true,
    showInfo: true,
    autoSound: true,
    showNav: true,
    autoNext: false
  });

  const handleSeekBackChange = (delta: number) => {
    setSeekBack(prev => Math.max(5, prev + delta));
  };

  const handleSeekForwardChange = (delta: number) => {
    setSeekForward(prev => Math.max(5, prev + delta));
  };

  const toggleDisplayOpt = (key: keyof typeof displayOpts) => {
    setDisplayOpts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={`w-full h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-2xl flex flex-col border transition-colors ${isDark ? 'bg-[#121212] border-white/10 text-white' : 'bg-white border-gray-200 text-black'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-5 pb-3">
        <h2 className="text-[18px] font-bold">Cài đặt video</h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white cursor-pointer">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 pt-1 space-y-6">
        {/* Top Row: Tua video & Tốc độ phát/Chất lượng */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Tua video */}
            <div>
              <h3 className="text-[14px] font-bold mb-3">Tua video</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-gray-400">Tua lùi</span>
                  <div className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-[10px] p-2 px-3">
                    <Minus size={16} onClick={() => handleSeekBackChange(-5)} className="text-gray-400 cursor-pointer hover:text-white" />
                    <span className="text-[13px] font-medium">{seekBack} giây</span>
                    <Plus size={16} onClick={() => handleSeekBackChange(5)} className="text-gray-400 cursor-pointer hover:text-white" />
                  </div>
                </div>
                <div className="w-[1px] h-8 bg-white/10 mt-6"></div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-gray-400">Tua tiến</span>
                  <div className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-[10px] p-2 px-3">
                    <Minus size={16} onClick={() => handleSeekForwardChange(-5)} className="text-gray-400 cursor-pointer hover:text-white" />
                    <span className="text-[13px] font-medium">{seekForward} giây</span>
                    <Plus size={16} onClick={() => handleSeekForwardChange(5)} className="text-gray-400 cursor-pointer hover:text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bỏ qua nhanh */}
            <div>
              <h3 className="text-[14px] font-bold mb-3">Bỏ qua nhanh</h3>
              <div className="flex bg-white/5 border border-white/10 rounded-[10px] p-1">
                {['10 giây', '30 giây', '1 phút'].map((opt) => (
                  <button key={opt} onClick={() => setQuickSkip(opt)} className={`flex-1 py-1.5 text-[13px] font-medium rounded-lg transition-colors cursor-pointer ${quickSkip === opt ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Tốc độ phát */}
            <div>
              <h3 className="text-[14px] font-bold mb-3">Tốc độ phát</h3>
              <div className="flex bg-white/5 border border-white/10 rounded-[10px] p-1 mb-2">
                {['0.5x', '0.75x', '1.0x', '1.25x', '1.5x', '2.0x'].map((opt) => (
                  <button key={opt} onClick={() => setSpeed(opt)} className={`flex-1 py-1.5 text-[13px] font-medium rounded-lg transition-colors cursor-pointer ${speed === opt ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white'}`}>
                    {opt}
                  </button>
                ))}
              </div>
              <div className="text-center">
                <span className="text-[11px] text-gray-400">Bình thường</span>
              </div>
            </div>

            {/* Chất lượng video */}
            <div>
              <h3 className="text-[14px] font-bold mb-3">Chất lượng video</h3>
              <div className="flex bg-white/5 border border-white/10 rounded-[10px] p-1 mb-2">
                {['Auto', '480p', '720p', '1080p'].map((opt) => (
                  <button key={opt} onClick={() => setQuality(opt)} className={`flex-1 py-1.5 text-[13px] font-medium rounded-lg transition-colors cursor-pointer ${quality === opt ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white'}`}>
                    {opt}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-gray-400 pl-4">Tự động</div>
            </div>
          </div>
        </div>

        <div className="h-[1px] bg-white/10 my-4"></div>

        {/* Tùy chọn hiển thị */}
        <div>
          <h3 className="text-[14px] font-bold mb-3">Tùy chọn hiển thị</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              { key: 'openComments', icon: MessageSquare, title: 'Mở bình luận mặc định', desc: 'Tự động mở bảng bình luận khi xem video' },
              { key: 'showInfo', icon: Info, title: 'Hiển thị thông tin video', desc: 'Hiển thị mô tả, hashtag và thông tin nhạc' },
              { key: 'autoSound', icon: Volume2, title: 'Phát âm thanh tự động', desc: 'Tự động phát âm thanh khi chuyển video' },
              { key: 'showNav', icon: Smartphone, title: 'Hiển thị nút điều hướng (lên/xuống)', desc: 'Cho phép chuyển video bằng nút lên/xuống' },
              { key: 'autoNext', icon: PlayCircle, title: 'Phát video tiếp theo tự động', desc: 'Tự động phát video tiếp theo khi kết thúc' },
            ].map((item) => (
              <div key={item.key} onClick={() => toggleDisplayOpt(item.key as keyof typeof displayOpts)} className="flex items-start gap-3 cursor-pointer group">
                <item.icon size={18} className="text-gray-400 shrink-0 mt-0.5 group-hover:text-white transition-colors" />
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-gray-300 group-hover:text-white transition-colors mb-0.5">{item.title}</div>
                  <div className="text-[11px] text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">{item.desc}</div>
                </div>
                <Toggle checked={displayOpts[item.key as keyof typeof displayOpts]} onChange={() => { }} />
              </div>
            ))}
          </div>
        </div>

        <div className="h-[1px] bg-white/10 my-4"></div>

        {/* Khác */}
        <div>
          <h3 className="text-[14px] font-bold mb-3">Khác</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              { icon: Flag, title: 'Báo cáo nội dung', desc: '' },
              { icon: Frown, title: 'Không quan tâm', desc: '' },
              { icon: Link, title: 'Sao chép liên kết video', desc: '' },
              { icon: Keyboard, title: 'Phím tắt', desc: 'Xem và tùy chỉnh phím tắt' },
              { icon: Clock, title: 'Lịch sử xem', desc: 'Quản lý lịch sử video đã xem' },
              { icon: Settings, title: 'Khôi phục cài đặt mặc định', desc: 'Đặt lại tất cả cài đặt về mặc định' },
            ].map((item, i) => (
              <div key={i} onClick={() => toast.success(`Đã chọn: ${item.title}`)} className="flex items-center gap-3 cursor-pointer group">
                <item.icon size={18} className="text-gray-400 shrink-0 group-hover:text-white transition-colors" />
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-gray-300 group-hover:text-white transition-colors">{item.title}</div>
                  {item.desc && <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{item.desc}</div>}
                </div>
                <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

const ExploreSearchModal: React.FC<{ onClose: () => void; isDark: boolean }> = ({ onClose, isDark }) => {
  const [activeTab, setActiveTab] = useState('Tất cả');
  const tabs = ['Tất cả', 'Video', 'Người dùng', 'Âm thanh', 'Hashtag'];

  const MOCK_VIDEOS = [
    { title: 'Chill vibes - Lo-fi mix to relax/study', author: 'lofi.chillhop', views: '1.2M lượt xem', time: '2 tuần trước', duration: '00:32', desc: 'Một chút chill cho ngày dài mệt mỏi 🌙 #chill #lofi #study', verified: true, image: 'https://images.unsplash.com/photo-1516280440502-a2f2dd8377b2?auto=format&fit=crop&q=80&w=200' },
    { title: 'Chill sunset by the beach', author: 'waves.collective', views: '856K lượt xem', time: '1 tháng trước', duration: '00:28', desc: 'Gió biển, hoàng hôn và nhạc chill 🌅 #chillvibes #sunset', verified: true, image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=200' },
    { title: 'Sunday morning chill', author: 'morningtapes', views: '623K lượt xem', time: '3 ngày trước', duration: '00:45', desc: 'Playlist nhẹ nhàng cho một buổi sáng thư giãn ☕ #morningchill', verified: true, image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=200' }
  ];

  const MOCK_USERS = [
    { name: 'Chill With Me', handle: 'chillwithme', followers: '235K người theo dõi', verified: true, avatar: 'https://i.pravatar.cc/150?u=chill1' },
    { name: 'Lo-fi Chillhop', handle: 'lofi.chillhop', followers: '1.1M người theo dõi', verified: true, avatar: 'https://i.pravatar.cc/150?u=chill2' },
    { name: 'Chill Vibes Daily', handle: 'chill.vibes.daily', followers: '98.7K người theo dõi', verified: false, avatar: 'https://i.pravatar.cc/150?u=chill3' }
  ];

  const MOCK_AUDIO = [
    { title: 'Chill Vibes', author: 'Lo-fi', duration: '02:34', videos: '1.2M video', verified: true, image: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&q=80&w=200' }
  ];

  const MOCK_HASHTAGS = [
    { name: 'chill', count: '12.3M bài viết' },
    { name: 'chillvibes', count: '8.6M bài viết' },
    { name: 'chillhop', count: '2.1M bài viết' },
    { name: 'chillmusic', count: '1.5M bài viết' },
    { name: 'chilltime', count: '994K bài viết' }
  ];

  return (
    <div className={`w-[850px] max-h-[85vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col ${isDark ? 'bg-[#1A1A1A] border-white/10 text-white' : 'bg-white border-gray-200 text-black'} animate-in fade-in zoom-in-95 duration-200`}>
      {/* Header / Input */}
      <div className="p-4 border-b border-white/10 shrink-0">
        <div className={`flex items-center gap-3 rounded-xl px-4 py-2 border transition-all ${isDark ? 'bg-white/5 border-white/20' : 'bg-gray-100 border-gray-300'}`}>
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            autoFocus
            defaultValue="chill"
            className="bg-transparent border-none outline-none flex-1 text-[14px]"
          />
          <X size={18} className="text-gray-400 cursor-pointer hover:text-white shrink-0" onClick={onClose} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 px-6 pt-2 border-b border-white/10 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-[14px] font-medium transition-colors relative cursor-pointer ${activeTab === tab ? (isDark ? 'text-white' : 'text-black') : 'text-gray-500 hover:text-gray-400'}`}
          >
            {tab}
            {activeTab === tab && <div className={`absolute bottom-0 left-0 w-full h-[2px] rounded-t-md ${isDark ? 'bg-white' : 'bg-black'}`}></div>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 space-y-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Video Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold">Video</h3>
            <button className="text-[13px] text-gray-400 hover:text-white transition-colors cursor-pointer">Xem tất cả</button>
          </div>
          <div className="space-y-4">
            {MOCK_VIDEOS.map((v, i) => (
              <div key={i} className="flex gap-4 cursor-pointer group">
                <div className="relative w-[140px] h-[80px] shrink-0 rounded-lg overflow-hidden bg-black">
                  <img src={v.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white">{v.duration}</div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-[14px] font-bold truncate mb-1">{v.title}</div>
                  <div className="flex items-center gap-1 text-[12px] text-gray-400 mb-1">
                    <span className="truncate">{v.author}</span>
                    {v.verified && <CheckCircle2 size={12} className="text-blue-500 shrink-0" />}
                    <span className="mx-1">•</span>
                    <span>{v.views}</span>
                    <span className="mx-1">•</span>
                    <span>{v.time}</span>
                  </div>
                  <div className="text-[12px] text-gray-400 truncate">{v.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Người dùng Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold">Người dùng</h3>
            <button className="text-[13px] text-gray-400 hover:text-white transition-colors cursor-pointer">Xem tất cả</button>
          </div>
          <div className="space-y-4">
            {MOCK_USERS.map((u, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 cursor-pointer min-w-0">
                  <img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-[14px] font-bold truncate">
                      {u.name}
                      {u.verified && <CheckCircle2 size={12} className="text-blue-500 shrink-0" />}
                    </div>
                    <div className="text-[12px] text-gray-400 truncate">{u.handle}</div>
                    <div className="text-[12px] text-gray-400 truncate">{u.followers}</div>
                  </div>
                </div>
                <button className="shrink-0 px-4 py-1.5 rounded-full border border-white/20 text-[13px] font-bold hover:bg-white/10 transition-colors cursor-pointer">Theo dõi</button>
              </div>
            ))}
          </div>
        </div>

        {/* Âm thanh Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold">Âm thanh</h3>
            <button className="text-[13px] text-gray-400 hover:text-white transition-colors cursor-pointer">Xem tất cả</button>
          </div>
          <div className="space-y-4">
            {MOCK_AUDIO.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-4 cursor-pointer group">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={a.image} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-[14px] font-bold mb-0.5 truncate">
                      {a.title}
                      {a.verified && <CheckCircle2 size={12} className="text-blue-500 shrink-0" />}
                    </div>
                    <div className="text-[12px] text-gray-400 truncate">
                      {a.author} • {a.duration} • {a.videos}
                    </div>
                  </div>
                </div>
                <button className="shrink-0 w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
                  <Play size={14} className="ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Hashtag Section */}
        <div>
          <h3 className="text-[15px] font-bold mb-4">Hashtag</h3>
          <div className="flex flex-wrap gap-2">
            {MOCK_HASHTAGS.map((h, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl py-2 px-3 cursor-pointer hover:bg-white/10 transition-colors">
                <div className="text-[16px] font-bold text-gray-400">#</div>
                <div>
                  <div className="text-[13px] font-bold">{h.name}</div>
                  <div className="text-[11px] text-gray-400">{h.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
