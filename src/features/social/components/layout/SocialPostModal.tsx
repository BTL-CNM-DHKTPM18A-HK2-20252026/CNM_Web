import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { 
  XIcon, 
  HeartIcon, 
  MessageCircleIcon, 
  ShareIcon, 
  BookmarkIcon,
  MoreHorizontalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SmileIcon
} from '@/components/ui/Icons';

interface SocialPostModalProps {
  post: any;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export const SocialPostModal: React.FC<SocialPostModalProps> = ({ 
  post, 
  onClose,
  onNext,
  onPrev
}) => {
  const { t } = useTranslation();
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);

  // Mock comments
  const comments = [
    { id: '1', user: 'itz_mee_naruto', text: 'She is so beautiful in this series', likes: 1026, time: '2w' },
    { id: '2', user: 'sahar_muhammadi7777', text: 'Please name', likes: 1, time: '2w' },
    { id: '3', user: 'el_homo_de_kazuha', text: 'Anime name ❤️🔥🤘', likes: 12, time: '2w' },
    { id: '4', user: 'lucasrz.1987', text: 'A great reward awaits for those who wait with patience 😂', likes: 362, time: '2w' },
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md cursor-pointer" onClick={onClose} />
      
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:opacity-70 transition-opacity z-[10001] cursor-pointer"
      >
        <XIcon size={32} />
      </button>

      {/* External Navigation Arrows */}
      {onPrev && (
        <button 
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center text-black shadow-lg hover:scale-110 transition-all cursor-pointer z-[10002]"
        >
          <ChevronLeftIcon size={24} />
        </button>
      )}
      {onNext && (
        <button 
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center text-black shadow-lg hover:scale-110 transition-all cursor-pointer z-[10002]"
        >
          <ChevronRightIcon size={24} />
        </button>
      )}

      {/* Main Container */}
      <div className="relative w-full max-w-[1200px] h-full max-h-[900px] bg-white dark:bg-black flex flex-col md:flex-row overflow-hidden shadow-2xl rounded-sm">
        
        {/* Left Column: Media */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[400px]">
          <Image 
            src={post.url || '/avatar.jpg'} 
            fill 
            alt="Post content" 
            className="object-contain"
          />
        </div>

        {/* Right Column: Details & Comments */}
        <div className="w-full md:w-[450px] flex flex-col h-full bg-white dark:bg-black border-l border-gray-100 dark:border-[#262626]">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#262626]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden relative border border-gray-100 dark:border-[#262626]">
                <Image src="/avatar2.jpg" fill alt="User" className="object-cover" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[14px] cursor-pointer hover:underline">animevibz2</span>
                <span className="text-[#0095F6] text-[14px] font-bold cursor-pointer hover:text-[#00376B] transition-colors">• Follow</span>
              </div>
            </div>
            <button className="text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer">
              <MoreHorizontalIcon size={20} />
            </button>
          </div>

          {/* Comments Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
            {/* Caption */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden relative shrink-0">
                <Image src="/avatar2.jpg" fill alt="User" className="object-cover" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[14px] leading-tight">
                  <span className="font-bold mr-2">animevibz2</span>
                  Traveling at the Speed of Sound on Land 🌏
                  Imagine riding a train across Japan at Mach 1 (1,230 km/h). This simulation shows what supersonic ground travel could look like.
                </p>
                <span className="text-[12px] text-gray-500">3w</span>
              </div>
            </div>

            {/* List of comments */}
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden relative">
                   <Image src={`/default/avatar${Number(c.id) + 5}.jpg`} fill alt="User" className="object-cover" />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <p className="text-[14px] leading-tight">
                    <span className="font-bold mr-2">{c.user}</span>
                    {c.text}
                  </p>
                  <div className="flex items-center gap-3 text-[12px] text-gray-500 font-semibold mt-1">
                    <span>{c.time}</span>
                    {c.likes > 0 && <span className="cursor-pointer hover:underline">{c.likes} likes</span>}
                    <button className="hover:opacity-70 cursor-pointer">Reply</button>
                    <button className="hover:opacity-70 cursor-pointer">See translation</button>
                  </div>
                </div>
                <button className="hover:opacity-60 text-gray-400 cursor-pointer">
                  <HeartIcon size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Actions & Input */}
          <div className="border-t border-gray-100 dark:border-[#262626] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className={`hover:opacity-60 transition-all cursor-pointer ${isLiked ? 'text-red-500' : ''}`}
                >
                  <HeartIcon size={24} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
                <button className="hover:opacity-60 transition-all cursor-pointer">
                  <MessageCircleIcon size={24} />
                </button>
                <button className="hover:opacity-60 transition-all cursor-pointer">
                  <ShareIcon size={24} />
                </button>
              </div>
              <button className="hover:opacity-60 transition-all cursor-pointer">
                <BookmarkIcon size={24} />
              </button>
            </div>
            <div className="flex flex-col mb-1">
              <span className="text-[14px] font-bold">{post.likes || '20.5K'} likes</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-tighter mt-1">April 5</span>
            </div>
          </div>

          {/* Comment Input */}
          <div className="p-4 border-t border-gray-100 dark:border-[#262626] flex items-center gap-3">
            <div className="cursor-pointer hover:opacity-70 transition-opacity">
              <SmileIcon size={24} />
            </div>
            <input 
              type="text" 
              placeholder="Add a comment..."
              className="flex-1 bg-transparent border-none outline-none text-[14px]"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button 
              disabled={!comment.trim()}
              className="text-[#0095F6] font-bold text-[14px] disabled:opacity-30 disabled:cursor-default cursor-pointer hover:text-[#00376B] transition-colors"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
