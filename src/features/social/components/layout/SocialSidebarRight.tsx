import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

interface SocialSidebarRightProps {
  user: any;
  conversations: any[];
  onSelectContact: (conversation: any) => void;
}

export const SocialSidebarRight: React.FC<SocialSidebarRightProps> = ({ user, conversations, onSelectContact }) => {
  const { t } = useTranslation();
  
  const suggestions = [
    { name: 'truongngoctrinh', fullName: 'Trương Ngọc Trinh', followedBy: 'hwlocc.0210 + 1' },
    { name: 'nguyenuyen_02', fullName: 'Nguyễn Uyên', followedBy: 'susan_0708 + 1' },
    { name: 'khanhlinh.social', fullName: 'Khánh Linh', followedBy: 'iamphg24' },
    { name: 'tuyettrinh_99', fullName: 'Tuyết Trinh', followedBy: 'iamphg24' },
    { name: 'mynhungan', fullName: 'Mỹ Nhung', followedBy: 'kmi29.4' },
  ];

  return (
    <div className="w-full h-full bg-white dark:bg-black flex flex-col pt-4 overflow-y-auto scrollbar-hide">
      {/* Current User Section */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full overflow-hidden relative border border-gray-100 dark:border-gray-900 shadow-sm">
            <Image 
              src={user?.avatar_url || "/avatar.jpg"} 
              fill 
              alt="User" 
              className="object-cover"
            />
          </div>
          <div className="flex flex-col">
            <p className="font-semibold text-[14px] text-black dark:text-white leading-tight hover:underline cursor-pointer">
              {user?.username || 'huy.nguyen.16'}
            </p>
            <p className="text-[14px] text-gray-500 font-normal">
              {user?.full_name || 'Huy Nguyễn'}
            </p>
          </div>
        </div>
        <button className="text-[12px] font-semibold text-[#0095F6] hover:text-[#00376B] transition-colors">
          Switch
        </button>
      </div>

      {/* Suggestions Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-semibold text-[14px] text-gray-500">
          {t('social.suggestions.title')}
        </h3>
        <button className="text-[12px] font-semibold text-black dark:text-white hover:text-gray-500 transition-colors">
          {t('social.suggestions.see_all')}
        </button>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3 mb-8 px-1">
        {suggestions.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden relative border border-gray-100 dark:border-gray-900">
                <Image 
                  src={`/default/image${idx + 5}.jpg`} 
                  fill 
                  alt="Suggestion" 
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col">
                <p className="font-semibold text-[14px] text-black dark:text-white leading-tight hover:underline cursor-pointer">
                  {item.name}
                </p>
                <p className="text-[12px] text-gray-500 truncate w-32">
                  {t('social.suggestions.title')}
                </p>
              </div>
            </div>
            <button className="text-[12px] font-semibold text-[#0095F6] hover:text-[#00376B] transition-colors">
              {t('social.suggestions.follow')}
            </button>
          </div>
        ))}
      </div>

      {/* Simplified Footer Navigation */}
      <div className="text-[12px] text-[#C7C7C7] px-1 space-y-4">
        <nav className="flex flex-wrap gap-x-2 gap-y-1">
          {['About', 'Help', 'Press', 'API', 'Jobs', 'Privacy', 'Terms', 'Locations', 'Language', 'Meta Verified'].map(link => (
            <span key={link} className="cursor-pointer hover:underline">{link}</span>
          ))}
        </nav>
        <p className="font-medium tracking-tight">© 2026 INSTAGRAM FROM FRUVIA</p>
      </div>
    </div>
  );
};
