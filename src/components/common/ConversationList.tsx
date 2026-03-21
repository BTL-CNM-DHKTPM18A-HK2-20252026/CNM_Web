import React from 'react';
import { useTranslation } from 'react-i18next'; // Added import for useTranslation
import { SearchIcon, AddUserIcon, PinIcon } from '@/components/ui/Icons';

interface Conversation {
  id: number;
  name: string;
  lastMsg: string;
  time: string;
  active?: boolean;
  pinned?: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
}

export function ConversationList({ conversations }: ConversationListProps) {
  const { t } = useTranslation(); // Added useTranslation hook
  return (
    <div className="w-[340px] border-r border-gray-300 flex flex-col bg-white">
      <div className="p-4 flex gap-2">
        <div className="relative flex-1 flex items-center">
          <input type="text" placeholder={t('chat.search')} className="w-full bg-gray-100 rounded-md py-1.5 pl-8 text-[13px] outline-none" />
          <div className="absolute left-2.5 text-gray-500"><SearchIcon size={16} /></div>
        </div>
        <button className="p-1 cursor-pointer hover:bg-gray-100 rounded transition-colors"><AddUserIcon size={20} /></button>
      </div>

      <div className="flex border-b border-gray-300 px-4 gap-6 text-[13px] font-semibold">
        <button className="py-2 border-b-[3px] border-[#005ae0] text-[#005ae0] cursor-pointer transition-colors">{t('chat.tabs.all')}</button>
        <button className="py-2 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">{t('chat.tabs.unread')}</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <div key={conv.id} className={`flex items-center p-4 gap-3 cursor-pointer transition-colors ${conv.active ? 'bg-[#E5EFFF]' : 'hover:bg-gray-50'}`}>
            <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-blue-100 text-[#0068FF] font-bold">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L10 13.17l7.59-7.59L19 7l-8 9z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h4 className="text-[14px] font-bold truncate text-[#1e293b]">{conv.name}</h4>
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-[10px] text-gray-400 shrink-0">{conv.time}</span>
                  {conv.pinned && <PinIcon size={10} />}
                </div>
              </div>
              <p className="text-[12px] text-gray-500 truncate">{conv.lastMsg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
