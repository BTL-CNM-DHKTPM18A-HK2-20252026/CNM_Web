import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { SettingsModal } from './SettingsModal';
import { ProfileModal } from './ProfileModal';

interface ChatDashboardProps {
  onLogout: () => void;
}

export function ChatDashboard({ onLogout }: ChatDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('chat');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const conversations = [
    { 
      id: 5, 
      name: t('chat.self_cloud'), 
      lastMsg: 'Bạn: [Hình ảnh]', 
      time: '19 phút', 
      active: true, 
      pinned: true 
    },
  ];

  return (
    <div className="flex h-screen w-full bg-[var(--card-bg)] overflow-hidden text-[var(--text)] transition-colors duration-200">
      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
      
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      {/* 1. LEFT SIDEBAR */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showSettingsMenu={showSettingsMenu}
        setShowSettingsMenu={setShowSettingsMenu}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        setIsProfileModalOpen={setIsProfileModalOpen}
        onLogout={onLogout}
      />

      {/* 2. MIDDLE LIST */}
      <ConversationList conversations={conversations} />

      {/* 3. CHAT CONTENT */}
      <ChatWindow />
    </div>
  );
}
