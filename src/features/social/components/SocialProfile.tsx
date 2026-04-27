import React from 'react';
import { SocialProfileHeader, SocialProfileTabs } from './layout/SocialProfileLayout';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

interface SocialProfileProps {
  user: any;
}

export const SocialProfile: React.FC<SocialProfileProps> = ({ user }) => {
  const { t } = useTranslation();

  // Mock posts for the grid
  const mockPosts = Array.from({ length: 9 }).map((_, i) => ({
    id: `p-${i}`,
    image: `/default/image${(i % 8) + 1}.jpg`,
    likes: Math.floor(Math.random() * 500),
    comments: Math.floor(Math.random() * 50),
  }));

  return (
    <div className="w-full py-8">
      <div className="max-w-[935px] mx-auto">
        <SocialProfileHeader user={user} />
        
        {/* Story Highlights */}
        <div className="flex gap-8 mb-12 px-4 overflow-x-auto scrollbar-hide">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-1 border border-gray-200 dark:border-gray-800 bg-white dark:bg-black transition-transform group-hover:scale-105">
                <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-900 overflow-hidden relative">
                  <Image src={`/default/image${i}.jpg`} fill alt="Highlight" className="object-cover" />
                </div>
              </div>
              <span className="text-xs font-semibold text-black dark:text-white">Kỷ niệm {i}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-gray-200 dark:border-gray-800 flex items-center justify-center bg-white dark:bg-black transition-transform group-hover:scale-105">
              <span className="text-2xl text-gray-400 font-light">+</span>
            </div>
            <span className="text-xs font-semibold text-black dark:text-white">Mới</span>
          </div>
        </div>

        <SocialProfileTabs />

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-1 md:gap-8 mt-1">
          {mockPosts.length > 0 ? (
            mockPosts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-square cursor-pointer group bg-gray-100 dark:bg-gray-900"
              >
                <Image
                  src={post.image}
                  fill
                  alt="Post"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold">
                  <div className="flex items-center gap-1.5">
                    <span>❤️</span> {post.likes}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>💬</span> {post.comments}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-20 flex flex-col items-center justify-center text-gray-500">
              <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center mb-4 text-2xl">
                📷
              </div>
              <p className="text-xl font-bold text-black dark:text-white">No Posts Yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer-ish spacer */}
      <div className="h-20" />
    </div>
  );
};
