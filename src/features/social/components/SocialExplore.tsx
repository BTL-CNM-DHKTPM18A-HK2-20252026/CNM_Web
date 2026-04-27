import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { 
  HeartIcon, 
  MessageCircleIcon, 
  VideoPickerIcon as PlayIcon,
  EyeOffIcon,
  SearchIcon 
} from '@/components/ui/Icons';
import { SocialPostModal } from './layout/SocialPostModal';

interface ExploreItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  likes: string;
  comments: string;
  isSensitive?: boolean;
}

const MOCK_EXPLORE: ExploreItem[] = [
  { id: '1', type: 'IMAGE', url: '/default/image1.jpg', likes: '20.5K', comments: '87' },
  { id: '2', type: 'VIDEO', url: '/default/image2.jpg', likes: '15K', comments: '120' },
  { id: '3', type: 'IMAGE', url: '/default/image3.jpg', likes: '32K', comments: '450' },
  { id: '4', type: 'VIDEO', url: '/default/image4.jpg', likes: '8K', comments: '24', isSensitive: true },
  { id: '5', type: 'IMAGE', url: '/default/image5.jpg', likes: '12.4K', comments: '112' },
  { id: '6', type: 'IMAGE', url: '/default/image6.jpg', likes: '45K', comments: '890' },
  { id: '7', type: 'VIDEO', url: '/default/image7.jpg', likes: '11K', comments: '56' },
  { id: '8', type: 'IMAGE', url: '/default/image8.jpg', likes: '7.2K', comments: '12' },
  { id: '9', type: 'IMAGE', url: '/default/image9.jpg', likes: '19K', comments: '234' },
  { id: '10', type: 'IMAGE', url: '/default/image10.jpg', likes: '22K', comments: '156' },
  { id: '11', type: 'VIDEO', url: '/default/image11.jpg', likes: '4.5K', comments: '33' },
  { id: '12', type: 'IMAGE', url: '/default/image12.jpg', likes: '50K', comments: '1.2K' },
];

export const SocialExplore: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<ExploreItem | null>(null);

  const handleNext = () => {
    if (!selectedPost) return;
    const currentIndex = MOCK_EXPLORE.findIndex(p => p.id === selectedPost.id);
    const nextIndex = (currentIndex + 1) % MOCK_EXPLORE.length;
    setSelectedPost(MOCK_EXPLORE[nextIndex]);
  };

  const handlePrev = () => {
    if (!selectedPost) return;
    const currentIndex = MOCK_EXPLORE.findIndex(p => p.id === selectedPost.id);
    const prevIndex = (currentIndex - 1 + MOCK_EXPLORE.length) % MOCK_EXPLORE.length;
    setSelectedPost(MOCK_EXPLORE[prevIndex]);
  };

  return (
    <div className="w-full flex flex-col pt-4 animate-in fade-in duration-500">
      {/* Search Bar (Top) */}
      <div className="max-w-[600px] mx-auto w-full mb-8 px-4 md:px-0">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0095F6] transition-colors">
            <SearchIcon size={18} />
          </div>
          <input 
            type="text"
            placeholder={t('social.messenger.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#EFEFEF] dark:bg-[#262626] border-none outline-none rounded-xl py-3 pl-12 pr-4 text-[15px] focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 transition-all"
          />
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-3 gap-1 md:gap-4 px-1 md:px-0">
        {MOCK_EXPLORE.map((item) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedPost(item)}
            className="relative aspect-square overflow-hidden group cursor-pointer bg-gray-100 dark:bg-[#121212]"
          >
            {/* Image/Thumbnail */}
            <Image 
              src={item.url} 
              fill 
              alt="Explore" 
              className={`object-cover transition-transform duration-500 group-hover:scale-110 ${item.isSensitive ? 'blur-2xl scale-125' : ''}`} 
            />

            {/* Video Icon Indicator */}
            {item.type === 'VIDEO' && (
              <div className="absolute top-3 right-3 text-white drop-shadow-md">
                <PlayIcon size={20} fill="currentColor" />
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold text-lg">
              <div className="flex items-center gap-2">
                <HeartIcon size={24} fill="currentColor" />
                <span>{item.likes}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircleIcon size={24} fill="currentColor" />
                <span>{item.comments}</span>
              </div>
            </div>

            {/* Sensitive Content Overlay */}
            {item.isSensitive && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white">
                <EyeOffIcon size={40} className="mb-3 opacity-80" />
                <h4 className="font-bold text-[16px] mb-1">Sensitive Content</h4>
                <p className="text-[12px] opacity-70 leading-tight">
                  This post contains sensitive content which some people may find offensive or disturbing.
                </p>
                <button className="mt-4 text-[13px] font-bold hover:opacity-80">
                  See Post
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Post Modal */}
      {selectedPost && (
        <SocialPostModal 
          post={selectedPost} 
          onClose={() => setSelectedPost(null)} 
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
    </div>
  );
};
