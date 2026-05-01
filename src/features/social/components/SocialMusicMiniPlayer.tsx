import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ListMusic, 
  ChevronUp 
} from 'lucide-react';
import Image from 'next/image';

interface MiniPlayerProps {
  song: {
    title: string;
    artist: string;
    image: string;
  };
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExpand: () => void;
  isDark: boolean;
}

export const SocialMusicMiniPlayer: React.FC<MiniPlayerProps> = ({ 
  song, 
  isPlaying, 
  onTogglePlay, 
  onExpand,
  isDark 
}) => {
  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all hover:scale-[1.02] cursor-pointer group ${
      isDark ? 'bg-black/80 border-white/10 text-white' : 'bg-white/80 border-gray-200 text-black'
    }`}>
      {/* Expand Icon */}
      <button onClick={onExpand} className="text-gray-400 hover:text-white transition-colors">
        <ChevronUp size={20} />
      </button>

      {/* Song Info */}
      <div className="flex items-center gap-3 min-w-[180px]">
        <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg">
          <Image src={song.image} fill alt={song.title} className="object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[15px] truncate max-w-[120px]">{song.title}</span>
          <span className="text-[12px] text-gray-500 truncate max-w-[120px]">{song.artist}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-5">
          <button className="text-gray-400 hover:text-white transition-colors cursor-pointer">
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-all shadow-lg cursor-pointer"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </button>
          <button className="text-gray-400 hover:text-white transition-colors cursor-pointer">
            <SkipForward size={18} fill="currentColor" />
          </button>
          
          <button className="ml-2 text-gray-400 hover:text-white transition-colors cursor-pointer">
            <ListMusic size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-[3px] bg-white/10 rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full w-[40%]" />
        </div>
      </div>
    </div>
  );
};
