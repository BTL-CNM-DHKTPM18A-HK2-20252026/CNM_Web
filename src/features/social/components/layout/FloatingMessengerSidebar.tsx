import React from 'react';
import Image from 'next/image';
import { SendIcon } from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';

interface FloatingMessengerSidebarProps {
  conversations: any[];
  onSelectContact: (conversation: any) => void;
}

const FRUVIA_CHATBOT_AVATAR = `${process.env.NEXT_PUBLIC_S3_BASE_URL ?? ''}/system/fruvia_chatbot.png`;

export const FloatingMessengerSidebar: React.FC<FloatingMessengerSidebarProps> = ({ conversations, onSelectContact }) => {
  const { t } = useTranslation();
  // Display only top 2-3 avatars in the pill
  const displayedAvatars = conversations.slice(0, 2);

  return (
    <div className="fixed right-4 bottom-4 z-[150]">
      <div 
        onClick={() => onSelectContact(null)}
        className="flex items-center gap-3 bg-white dark:bg-[#262626] hover:bg-gray-50 dark:hover:bg-[#333333] text-black dark:text-white px-4 py-2.5 rounded-full shadow-xl cursor-pointer transition-all active:scale-95 border border-gray-200 dark:border-[#333333]"
      >
        {/* Paper Plane Icon */}
        <SendIcon size={20} className="text-[#0095F6]" />
        
        <span className="font-semibold text-[15px] mr-2">{t('social.sidebar.messages')}</span>

        {/* Overlapping Avatars */}
        <div className="flex -space-x-3">
          {displayedAvatars.map((conv, idx) => (
            <div 
              key={conv.id || idx} 
              className="w-7 h-7 rounded-full overflow-hidden border-2 border-white dark:border-[#262626] relative z-[1] flex items-center justify-center bg-gray-100"
              style={{ zIndex: 10 - idx }}
            >
              {conv.isAi ? (
                <Image
                  src={FRUVIA_CHATBOT_AVATAR}
                  fill
                  alt="Fruvia Chatbot"
                  className="object-cover"
                  unoptimized
                />
              ) : conv.isSelf ? (
                <div className="w-full h-full bg-[#0068FF] flex items-center justify-center text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.5 19c3.037 0 5.5-2.463 5.5-5.5 0-2.97-2.354-5.391-5.291-5.492a7 7 0 0 0-13.709 0C1.109 8.109 1 10.53 1 13.5c0 3.037 2.463 5.5 5.5 5.5h11z" />
                  </svg>
                </div>
              ) : (
                <Image 
                  src={conv.avatar || "/avatar.jpg"} 
                  fill 
                  alt="Contact" 
                  className="object-cover" 
                />
              )}
            </div>
          ))}
          {conversations.length > 2 && (
            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#333333] border-2 border-white dark:border-[#262626] flex items-center justify-center text-[10px] font-bold z-[0]">
              +{conversations.length - 2}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
