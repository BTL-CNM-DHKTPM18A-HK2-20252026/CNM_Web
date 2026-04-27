import React, { useEffect, useState } from 'react';
import { socialApi } from '../api';
import { PostResponse } from '../types';
import { LikeIcon, MessageBubbleIcon, ShareIcon, MoreHorizontalIcon } from '@/components/ui/Icons';
import Image from 'next/image';

export const VideoFeed: React.FC = () => {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        // In a real app, we'd have a specific /videos endpoint
        // For now, we fetch the feed and filter for posts with videos
        const response = await socialApi.getFeed();
        // Since we might not have many videos in mock data, let's just show some posts
        // but styling them as "Video Cards"
        setPosts(response.content || []);
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 bg-black p-4 flex flex-col gap-6 overflow-y-auto">
        {[1, 2].map(i => (
          <div key={i} className="aspect-[9/16] w-full max-w-[400px] mx-auto bg-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[var(--main-bg)] overflow-y-auto custom-scrollbar snap-y snap-mandatory h-full">
      <div className="max-w-[500px] mx-auto py-8 px-4 flex flex-col gap-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-[var(--text)]">Khám phá Video</h2>
          <div className="flex gap-4 text-sm font-semibold">
            <span className="text-[#0068FF] border-b-2 border-[#0068FF] pb-1 cursor-pointer">Dành cho bạn</span>
            <span className="text-[var(--sub-text)] hover:text-[var(--text)] cursor-pointer">Đang theo dõi</span>
          </div>
        </div>

        {posts.map((post, idx) => (
          <div key={post.postId} className="relative aspect-[9/16] w-full bg-black rounded-3xl overflow-hidden shadow-2xl snap-start group">
            {/* Mock Video Placeholder / Thumbnail */}
            <Image
              src={post.mediaList?.[0]?.url || `https://picsum.photos/seed/${idx + 50}/720/1280`}
              fill
              alt="Video content"
              className="object-cover opacity-80"
            />

            {/* Video Overlay Info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-6 flex flex-col justify-end">
              <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full border-2 border-white overflow-hidden relative">
                      <Image src={post.authorAvatar || "/avatar.jpg"} fill alt="Author" className="object-cover" />
                    </div>
                    <span className="font-bold text-white text-[15px] shadow-sm">{post.authorName}</span>
                    <button className="bg-[#0068FF] text-white text-[12px] px-3 py-1 rounded-full font-bold hover:bg-blue-600 transition-colors">Theo dõi</button>
                  </div>
                  <p className="text-white text-[14px] line-clamp-2 mb-2 leading-relaxed">{post.content}</p>
                  <div className="flex items-center gap-2 text-white/80 text-[13px]">
                    <span className="animate-pulse">♫</span>
                    <span className="truncate italic">Âm thanh gốc - {post.authorName}</span>
                  </div>
                </div>

                {/* Vertical Actions */}
                <div className="flex flex-col items-center gap-5 mb-2">
                  <div className="flex flex-col items-center gap-1">
                    <button className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-all group-hover:scale-110">
                      <LikeIcon size={24} className={post.isLiked ? "text-red-500" : "text-white"} />
                    </button>
                    <span className="text-white text-[12px] font-bold">{post.likeCount}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <button className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-blue-500 transition-all">
                      <MessageBubbleIcon size={24} />
                    </button>
                    <span className="text-white text-[12px] font-bold">{post.commentCount}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <button className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-green-500 transition-all">
                      <ShareIcon size={24} />
                    </button>
                    <span className="text-white text-[12px] font-bold">Chia sẻ</span>
                  </div>
                  <button className="h-10 w-10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                    <MoreHorizontalIcon size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
