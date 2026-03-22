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
import { AddFriendModal } from './AddFriendModal';
import { CreateGroupModal } from './CreateGroupModal';

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
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<'info' | 'search' | null>('info');

  const conversations = [
    {
      id: 5,
      name: t('chat.self_cloud'),
      lastMsg: 'Bạn: [Hình ảnh]',
      time: '11 giờ',
      pinned: true,
      isCloud: true
    },
    {
      id: 6,
      name: 'Lâm Đức Hiệp',
      lastMsg: 'Hiệp: Chuẩn luôn! Mình đang tích cực áp dụng các kỹ thuật đó...',
      time: '15:12',
      pinned: false,
      avatar: 'https://i.pravatar.cc/150?u=hiep'
    }
  ];

  const [selectedChatId, setSelectedChatId] = useState<number>(5);
  const selectedChat = conversations.find(c => c.id === selectedChatId) || conversations[0];

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

      <AddFriendModal
        isOpen={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
      />

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
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
        <ConversationList
          conversations={conversations.map(c => ({ ...c, active: c.id === selectedChatId }))}
          onAddFriend={() => setIsAddFriendModalOpen(true)}
          onCreateGroup={() => setIsCreateGroupModalOpen(true)}
          onSelectConversation={(id) => setSelectedChatId(id)}
        />
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
              onToggleSidebar={(type) => setActiveSidebar(activeSidebar === type ? null : type)}
              activeSidebar={activeSidebar}
              selectedChat={selectedChat}
            />
            {activeSidebar === 'info' && (
              <ChatInfoSidebar onClose={() => setActiveSidebar(null)} />
            )}
            {activeSidebar === 'search' && (
              <div className="w-[340px] border-l border-[var(--border)] bg-[var(--card-bg)] flex flex-col transition-colors duration-200">
                {/* Search Sidebar UI Header */}
                <div className="h-[64px] border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0">
                  <h3 className="text-[17px] font-bold">{t('chat.search_panel_title') || 'Tìm kiếm trong trò chuyện'}</h3>
                  <button onClick={() => setActiveSidebar(null)} className="p-1 hover:bg-[var(--hover-bg)] rounded-md cursor-pointer opacity-70">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>

                {/* Search Content */}
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="relative mb-4">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Nhập từ khóa để tìm kiếm" 
                      className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#0068FF] transition-all"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex items-center gap-2 mb-4 text-[13px]">
                    <span className="text-[var(--sub-text)] whitespace-nowrap">Lọc theo:</span>
                    <button className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--hover-bg)] rounded-md border border-[var(--border)] flex-1 justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      Người gửi
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <button className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--hover-bg)] rounded-md border border-[var(--border)] flex-1 justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      Ngày gửi
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                  </div>

                  {/* Empty State */}
                  <div className="flex flex-col items-center justify-center pt-12 text-center opacity-60">
                    <div className="w-[180px] h-[180px] mb-6 relative">
                      <div className="absolute inset-0 bg-blue-50 dark:bg-blue-500/10 rounded-full blur-2xl"></div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="1" className="relative z-10 w-full h-full opacity-30">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        <path d="M9 10h4M9 14h6" opacity="0.5" />
                      </svg>
                    </div>
                    <p className="text-[14px] leading-relaxed text-[var(--sub-text)]">
                      Hãy nhập từ khóa để bắt đầu tìm kiếm<br />tin nhắn và file trong trò chuyện
                    </p>
                  </div>
                </div>
              </div>
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
