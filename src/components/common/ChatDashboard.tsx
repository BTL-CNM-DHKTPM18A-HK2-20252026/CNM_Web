import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { SettingsModal } from './SettingsModal';

interface ChatDashboardProps {
  onLogout: () => void;
}

export function ChatDashboard({ onLogout }: ChatDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('chat');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const conversations = [
    { 
      id: 5, 
      name: t('chat.self_cloud'), 
      lastMsg: `${t('chat.you')}: ngrok http 8080`, 
      time: `3 ${t('chat.time_unit')}`, 
      active: true, 
      pinned: true 
    },
  ];

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-[#1e293b]">
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />

      {/* 1. LEFT SIDEBAR */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showSettingsMenu={showSettingsMenu}
        setShowSettingsMenu={setShowSettingsMenu}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        onLogout={onLogout}
      />

      {/* 2. MIDDLE LIST */}
      <ConversationList conversations={conversations} />

      {/* 3. CHAT CONTENT */}
      <ChatWindow />
    </div>
  );
}
