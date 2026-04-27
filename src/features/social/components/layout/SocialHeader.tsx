import React from 'react';
import Image from 'next/image';
import { 
  FBHomeIcon, 
  FBVideoIcon, 
  FBStoreIcon, 
  FBGroupsIcon, 
  FBGamingIcon, 
  LayoutGridIcon, 
  MessageCircleIcon, 
  BellIcon, 
  SearchIcon
} from '@/components/ui/Icons';

interface SocialHeaderProps {
  user: any;
  onBack?: () => void;
}

export const SocialHeader: React.FC<SocialHeaderProps> = ({ user, onBack }) => {
  return (
    <div className="h-14 w-full bg-white border-b border-gray-200 shadow-sm flex items-center px-4 sticky top-0 z-[100] transition-colors duration-200">
      {/* Left: Logo & Search */}
      <div className="flex items-center gap-2 flex-1">
        <div 
          onClick={onBack}
          className="w-10 h-10 relative cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Image 
            src="/fruvia_logo.png" 
            fill 
            alt="Fruvia Logo" 
            className="object-contain"
          />
        </div>
        <div className="relative ml-2 hidden lg:block">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <SearchIcon size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Tìm kiếm trên Fruvia" 
            className="bg-[#F0F2F5] rounded-full py-2 pl-10 pr-4 w-[240px] text-[15px] focus:outline-none"
          />
        </div>
      </div>

      {/* Center: Main Nav - EXACT MATCH WITH SCREENSHOT */}
      <div className="flex items-center gap-1 h-full flex-[1.5] justify-center">
        {[
          { icon: FBHomeIcon, active: true },
          { icon: FBVideoIcon },
          { icon: FBStoreIcon },
          { icon: FBGroupsIcon },
          { icon: FBGamingIcon }
        ].map((item, idx) => (
          <button 
            key={idx} 
            className={`h-full px-10 border-b-4 transition-all cursor-pointer ${item.active ? 'border-[#1877F2] text-[#1877F2]' : 'border-transparent text-gray-500 hover:bg-gray-100 hover:rounded-lg my-1'}`}
          >
            <item.icon size={28} active={item.active} />
          </button>
        ))}
      </div>

      {/* Right: User & Actions */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <div className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 cursor-pointer text-gray-700">
          <LayoutGridIcon size={20} />
        </div>
        <div className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 cursor-pointer text-gray-700">
          <MessageCircleIcon size={20} />
        </div>
        <div className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 cursor-pointer text-gray-700 relative">
          <BellIcon size={20} />
          <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] font-bold px-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            1
          </div>
        </div>
        <div className="h-10 w-10 rounded-full overflow-hidden ml-1 border border-gray-200 cursor-pointer hover:opacity-90 relative">
          <Image 
            src={user?.avatar_url || "/avatar.jpg"} 
            fill 
            alt="Profile" 
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
};
