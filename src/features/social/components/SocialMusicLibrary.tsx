import React, { useState } from 'react';
import {
  Search,
  Upload,
  ChevronRight,
  Play,
  MoreHorizontal,
  Bookmark,
  ChevronDown,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Music2,
  X,
  ArrowLeft,
  PanelRightClose,
  PanelRightOpen,
  Minimize2,
  Maximize2,
  LayoutGrid
} from 'lucide-react';
import Image from 'next/image';

const CATEGORIES = [
  'Dành cho bạn', 'Hot', 'Chill', 'Happy', 'Sad', 'Workout', 'Focus', 'Aesthetic', 'Du lịch', 'Lofi', 'EDM', 'Acoustic'
];

const FEATURED_PLAYLISTS = [
  { id: 1, title: 'Chill Vibes', desc: 'Nhẹ nhàng, thư giãn', videos: '1.2M video', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=400' },
  { id: 2, title: 'Sunset Lovers', desc: 'Hoàng hôn lãng mạn', videos: '856K video', image: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&q=80&w=400' },
  { id: 3, title: 'Morning Boost', desc: 'Năng lượng cho ngày mới', videos: '642K video', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=400' },
  { id: 4, title: 'Lo-fi Study', desc: 'Tập trung học tập', videos: '1.8M video', image: 'https://images.unsplash.com/photo-1516339901600-2e1a62986307?auto=format&fit=crop&q=80&w=400' },
  { id: 5, title: 'Good Vibes', desc: 'Tích cực, vui vẻ', videos: '1.1M video', image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=400' },
];

const SONGS = [
  { id: 1, title: 'Chill Vibes', artist: 'Lo-fi Chillhop', genre: 'Lo-fi • Chill', duration: '02:34', trending: true, image: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&q=80&w=100' },
  { id: 2, title: 'Sunset Drive', artist: 'Oatmello', genre: 'Chill • Sunset', duration: '03:12', trending: false, image: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&q=80&w=100' },
  { id: 3, title: 'Bloom', artist: 'Rook1e', genre: 'Indie • Acoustic', duration: '02:58', trending: false, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=100' },
  { id: 4, title: 'Ocean Eyes', artist: 'Waves Collective', genre: 'Ambient • Chill', duration: '03:45', trending: false, image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=100' },
  { id: 5, title: 'Better Days', artist: 'LAKEY INSPIRED', genre: 'Hip Hop • Chill', duration: '03:16', trending: false, image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=100' },
  { id: 6, title: 'Home', artist: 'Phillip E Morris', genre: 'Acoustic • Chill', duration: '02:20', trending: false, image: 'https://images.unsplash.com/photo-1516339901600-2e1a62986307?auto=format&fit=crop&q=80&w=100' },
];

export const SocialMusicLibrary: React.FC<{
  isDark: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onSongSelect?: (song: any) => void;
}> = ({ isDark, onClose, onMinimize, onSongSelect }) => {
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [selectedSong, setSelectedSong] = useState(SONGS[0]);
  const [isPlayerVisible, setIsPlayerVisible] = useState(true);

  const handleSongClick = (song: any) => {
    setSelectedSong(song);
    if (onSongSelect) onSongSelect(song);
  };

  return (
    <div className={`w-full h-full flex flex-row overflow-hidden ${isDark ? 'bg-black text-white' : 'bg-white text-black'}`}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto px-10 py-10 custom-scrollbar relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full z-50">
            <X size={24} />
          </button>
        )}

        {/* Header Section (Search & Upload) */}
        <div className="flex flex-col gap-8 mb-10">
          <div className="flex items-center justify-between">
            <div className={`flex-1 max-w-xl flex items-center gap-3 px-5 py-3 rounded-xl border transition-all ${isDark ? 'bg-white/5 border-white/10 focus-within:border-white/30' : 'bg-gray-100 border-gray-200'
              }`}>
              <Search size={20} className="text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm nhạc, nghệ sĩ, mood..."
                className="bg-transparent border-none outline-none w-full text-[15px]"
              />
            </div>

            <div className="flex items-center gap-4">
              {/* Compact Mini Player in Header (Visible when side panel is hidden) */}
              {!isPlayerVisible && (
                <div className={`flex items-center gap-4 px-4 py-1.5 rounded-2xl border transition-all animate-in fade-in slide-in-from-right-4 duration-500 ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'
                }`}>
                  <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-lg">
                      <Image src={selectedSong.image} fill alt={selectedSong.title} className="object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[13px] truncate max-w-[100px]">{selectedSong.title}</span>
                      <span className="text-[11px] text-gray-500 truncate max-w-[100px]">{selectedSong.artist}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button className="text-gray-400 hover:text-white transition-colors cursor-pointer"><SkipBack size={16} fill="currentColor" /></button>
                    <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-all shadow-lg cursor-pointer">
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    </button>
                    <button className="text-gray-400 hover:text-white transition-colors cursor-pointer"><SkipForward size={16} fill="currentColor" /></button>
                    
                    <button 
                      onClick={() => setIsPlayerVisible(true)}
                      className="ml-2 p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                      title="Mở rộng"
                    >
                      <LayoutGrid size={18} />
                    </button>
                  </div>
                </div>
              )}

              <button className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer text-[14px] font-medium ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black text-white hover:bg-black/90'
                }`}>
                <Upload size={18} />
                Tải nhạc lên
              </button>
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight">Thư viện nhạc</h1>
        </div>

        {/* Categories Scroll */}
        <div className="flex items-center gap-3 mb-12 overflow-x-auto no-scrollbar pb-2 shrink-0">
          {CATEGORIES.map((cat, idx) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-[13px] font-medium transition-all cursor-pointer ${idx === 0
                ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                : (isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200')
                }`}
            >
              {idx === 0 && '✦ '}
              {cat}
            </button>
          ))}
          <button className="p-2 bg-white/5 rounded-full shrink-0">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Featured Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Danh sách nổi bật</h2>
            <button className="text-[13px] text-gray-500 hover:text-white transition-colors">Xem tất cả</button>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {FEATURED_PLAYLISTS.map((p) => (
              <div key={p.id} className="group cursor-pointer">
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-3">
                  <Image src={p.image} fill alt={p.title} className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black">
                      <Play size={24} fill="currentColor" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white flex items-center gap-1">
                      <Play size={10} fill="currentColor" /> {p.videos}
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-[15px] mb-1 truncate">{p.title}</h3>
                <p className="text-[13px] text-gray-500 truncate">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Song List Tabs */}
        <div className="flex items-center gap-8 border-b border-white/10 mb-6">
          {['Tất cả', 'Bài hát', 'Nghệ sĩ', 'Album'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[14px] font-medium relative transition-colors cursor-pointer ${activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[40px_60px_1fr_1fr_1fr_100px_120px_100px] gap-4 px-4 py-3 text-[12px] font-medium text-gray-500 uppercase tracking-wider border-b border-white/5">
          <span>#</span>
          <span></span>
          <span>Tên bài hát</span>
          <span>Nghệ sĩ</span>
          <span>Thể loại</span>
          <span>Thời lượng</span>
          <span>Phổ biến</span>
          <span></span>
        </div>

        {/* Songs List */}
        <div className="flex flex-col">
          {SONGS.map((song, idx) => (
            <div
              key={song.id}
              onClick={() => handleSongClick(song)}
              className={`grid grid-cols-[40px_60px_1fr_1fr_1fr_100px_120px_100px] gap-4 px-4 py-3 items-center hover:bg-white/5 cursor-pointer transition-colors group ${selectedSong.id === song.id ? 'bg-white/5' : ''
                }`}
            >
              <span className="text-[13px] text-gray-500 group-hover:hidden">{idx + 1}</span>
              <div className="hidden group-hover:flex items-center justify-center text-white">
                <Play size={16} fill="currentColor" />
              </div>
              <div className="relative w-10 h-10 rounded-md overflow-hidden">
                <Image src={song.image} fill alt={song.title} className="object-cover" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-[14px] truncate">{song.title}</span>
                {song.trending && (
                  <span className="bg-orange-500/20 text-orange-500 text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                    🔥 Đang thịnh hành
                  </span>
                )}
              </div>
              <span className="text-[13px] text-gray-400 truncate">{song.artist}</span>
              <span className="text-[13px] text-gray-400 truncate">{song.genre}</span>
              <span className="text-[13px] text-gray-400">{song.duration}</span>
              <div className="flex items-end gap-[2px] h-4">
                {[4, 7, 5, 8, 6, 9, 7, 5, 6, 4].map((h, i) => (
                  <div key={i} className="w-[2px] bg-white/20 rounded-full" style={{ height: `${h * 1.5}px` }} />
                ))}
              </div>
              <div className="flex items-center justify-end gap-4">
                <Bookmark size={18} className="text-gray-500 hover:text-white" />
                <MoreHorizontal size={18} className="text-gray-500 hover:text-white" />
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="flex justify-center mt-10 mb-20">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-full text-[13px] font-medium transition-all cursor-pointer">
            Xem thêm
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Right Side Player Detail */}
      <div className={`${isPlayerVisible ? 'w-[450px] border-l p-8 opacity-100' : 'w-0 border-l-0 p-0 opacity-0'} shrink-0 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${isDark ? 'bg-[#0A0A0A] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-end mb-8">
          <button 
            onClick={() => setIsPlayerVisible(false)}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
            title="Thu gọn"
          >
            <LayoutGrid size={20} className="text-gray-400" />
          </button>
        </div>

        {isPlayerVisible ? (
          <>

        {/* Album Art */}
        <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl mb-8 group">
          <Image src={selectedSong.image.replace('100', '600')} fill alt={selectedSong.title} className="object-cover" />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
        </div>

        {/* Info */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-2">{selectedSong.title}</h2>
          <p className="text-blue-500 font-medium flex items-center justify-center gap-1">
            {selectedSong.artist}
            <span className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-[6px] text-white">✓</span>
          </p>
        </div>

        {/* Player Controls */}
        <div className="flex items-center justify-between mb-8 px-4">
          <button className="text-gray-500 hover:text-white cursor-pointer"><Repeat size={20} /></button>
          <button className="text-white hover:scale-110 transition-transform cursor-pointer"><SkipBack size={28} fill="currentColor" /></button>
          <button className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-all shadow-lg cursor-pointer">
            <Play size={32} fill="currentColor" className="ml-1" />
          </button>
          <button className="text-white hover:scale-110 transition-transform cursor-pointer"><SkipForward size={28} fill="currentColor" /></button>
          <button className="text-gray-500 hover:text-white cursor-pointer"><Shuffle size={20} /></button>
        </div>

        {/* Waveform Progress */}
        <div className="mb-6 px-2">
          <div className="flex items-end gap-[3px] h-12 mb-4">
            {Array.from({ length: 40 }).map((_, i) => {
              const isActive = i < 15;
              const height = 15 + Math.random() * 25;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full ${isActive ? 'bg-white' : 'bg-white/20'}`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[12px] text-gray-500 font-medium">
            <span>01:02</span>
            <span>{selectedSong.duration}</span>
          </div>
        </div>

        {/* Action Button */}
        <button className="w-full py-4 bg-[#4A6FFF] hover:bg-[#3A5FEF] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 mb-10 transition-all active:scale-[0.98]">
          <Music2 size={20} />
          Sử dụng âm thanh
        </button>

        {/* Details List */}
        <div className="space-y-6">
          <h3 className="font-bold text-lg">Thông tin</h3>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {['#chill', '#lofi', '#relax', '#study'].map(tag => (
              <span key={tag} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[13px] text-gray-400 cursor-pointer transition-colors">
                {tag}
              </span>
            ))}
            <button className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-gray-400">
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-[14px]">
              <span className="text-gray-500">Thể loại</span>
              <span className="font-medium">{selectedSong.genre}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-gray-500">Mood</span>
              <span className="font-medium">Thư giãn, Tập trung</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-gray-500">Phát hành</span>
              <span className="font-medium">12 thg 5, 2023</span>
            </div>
          </div>
        </div>
      </>
      ) : null}
    </div>
  </div>
  );
};
