import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { ChatInfoSidebar } from './ChatInfoSidebar';
import { SettingsModal } from './SettingsModal';
import { ProfileModal } from './ProfileModal';
import { ContactList } from './ContactList';
import { ContactsContent } from './ContactsContent';

interface ChatDashboardProps {
  onLogout: () => void;
}

export function ChatDashboard({ onLogout }: ChatDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('chat');
  const [contactCategory, setContactCategory] = useState('friends');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showInfoSidebar, setShowInfoSidebar] = useState(true);

  const conversations = [
    {
      id: 5,
      name: t('chat.self_cloud'),
      lastMsg: 'Bạn: [Hình ảnh]',
      time: '11 giờ',
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
      {activeTab === 'chat' ? (
        <ConversationList conversations={conversations} />
      ) : activeTab === 'contacts' ? (
        <ContactList selectedCategory={contactCategory} onSelectCategory={setContactCategory} />
      ) : (
        <div className="w-[340px] border-r border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-center text-gray-400">
          {t('common.coming_soon')}
        </div>
      )}

      {/* 3. MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'chat' ? (
          <>
            <ChatWindow
              onToggleInfo={() => setShowInfoSidebar(!showInfoSidebar)}
              showInfo={showInfoSidebar}
            />
            {showInfoSidebar && (
              <ChatInfoSidebar onClose={() => setShowInfoSidebar(false)} />
            )}
          </>
        ) : activeTab === 'contacts' ? (
          <ContactsContent category={contactCategory} />
        ) : (
           <div className="flex-1 bg-[var(--background)] flex items-center justify-center text-[var(--sub-text)]">
             {t('common.coming_soon')}
           </div>
        )}
      </div>
    </div>
  );
}
