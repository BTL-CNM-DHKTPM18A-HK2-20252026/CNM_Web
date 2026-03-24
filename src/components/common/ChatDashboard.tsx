import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
import { apiClient } from '@/services/api';
import { websocketService } from '@/services/websocketService';
import { friendService } from '@/services/friendService';

interface ChatDashboardProps {
  onLogout: () => void;
  userName?: string;
}

export function ChatDashboard({ onLogout, userName }: ChatDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('chat');
  const [contactCategory, setContactCategory] = useState('friends');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<'info' | 'search' | null>('info');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const hasToasted = React.useRef(false);

  const fetchUserProfile = async () => {
    console.log('[WS-DEBUG] Dashboard: fetchUserProfile starting...');
    try {
      const response = await apiClient.get('/users/me');
      console.log('[WS-DEBUG] Dashboard: /users/me response:', response);

      const data = (response && response.success && response.data) ? response.data : response;
      console.log('[WS-DEBUG] Dashboard: CurrentUser data after parse:', data);

      if (data && (data.id || data.full_name || data.phone_number)) {
        setCurrentUser(data);
        console.log('[WS-DEBUG] Dashboard: User set, checking token...');
        
        const token = localStorage.getItem('accessToken');
        if (token) {
          console.log('[WS-DEBUG] Dashboard: Token present, calling connect()...');
          websocketService.connect(token);
        } else {
          console.warn('[WS-DEBUG] Dashboard: MISSING ACCESS TOKEN');
        }
      } else {
        console.warn('[WS-DEBUG] Dashboard: Missing mandatory user fields in /me response');
      }
    } catch (error: any) {
      console.error("[WS-DEBUG] Dashboard: Profile fetch error:", error);
      if (error.message?.includes("Không tìm thấy người dùng")) {
        onLogout();
      }
    }
  };

  useEffect(() => {
    fetchUserProfile();
    
    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    // Only show toast when we have the real full name from the database (Method 2)
    // This prevents showing the phone number on page reload
    if (!hasToasted.current && currentUser?.full_name) {
      toast(`Chào mừng bạn trở lại Fruvia Chat, ${currentUser.full_name}!`, {
        description: 'Chúc bạn có một ngày làm việc tuyệt vời. 👋',
        icon: <span className="text-xl">✨</span>,
        duration: 5000,
      });
      hasToasted.current = true;
    }
  }, [currentUser]);

  const conversations: any[] = [];

  const [selectedChatId, setSelectedChatId] = useState<number>(5);
  const selectedChat = conversations.find(c => c.id === selectedChatId) || conversations[0];
  const [invitationCount, setInvitationCount] = useState(0);

  const fetchInvitationCount = async () => {
    try {
      // Use friendService to get received requests
      const requests = await friendService.getReceivedRequests();
      setInvitationCount(requests.length);
    } catch (error) {
      console.error("Failed to fetch invitation count:", error);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchInvitationCount();
      
      const subEvents = websocketService.subscribeToFriendEvents(currentUser.id, (msg) => {
        console.log('[WS-DEBUG] ChatDashboard: Received friend event:', msg.body);
        fetchInvitationCount();
        if (msg.body === "RECEIVED") {
          toast.info("Bạn có lời mời kết bạn mới!", {
            duration: 3000,
          });
        }
      });

      return () => {
        subEvents?.unsubscribe();
      };
    }
  }, [currentUser?.id]);

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
        onUpdate={fetchUserProfile}
      />

      <AddFriendModal
        isOpen={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
        currentUserName={currentUser?.full_name || userName}
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
        user={currentUser}
        invitationCount={invitationCount}
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
        <ContactList
          selectedCategory={contactCategory}
          onSelectCategory={setContactCategory}
          onAddFriend={() => setIsAddFriendModalOpen(true)}
          onCreateGroup={() => setIsCreateGroupModalOpen(true)}
        />
      ) : (
        <div className="w-[340px] border-r border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-center text-gray-400">
          {t('common.coming_soon')}
        </div>
      )}

      {/* 3. MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'chat' ? (
          selectedChat ? (
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
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[var(--background)] px-10 text-center select-none">
              <div className="max-w-[500px] flex flex-col items-center gap-6">
                <div className="w-[380px] h-[160px] relative mb-4 opacity-80">
                  <div className="absolute inset-0 bg-blue-50 rounded-full blur-3xl opacity-20 dark:bg-blue-900/10"></div>
                  <img src="/welcome_chat.png" alt="Welcome" className="w-full h-full object-contain relative z-10" />
                </div>
                <h2 className="text-[22px] font-bold text-[var(--text)]">
                  Chào mừng đến với <span className="text-[#0068FF]">Fruvia Chat</span>!
                </h2>
                <p className="text-[16px] text-[var(--sub-text)] leading-relaxed">
                  Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hóa cho trải nghiệm của bạn.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-4 w-full">
                  <div className="p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl flex flex-col items-center gap-2 group hover:shadow-md transition-all cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-[#0068FF]">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                    <span className="text-[14px] font-bold">Kết nối bạn bè</span>
                  </div>
                  <div className="p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl flex flex-col items-center gap-2 group hover:shadow-md transition-all cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <span className="text-[14px] font-bold">Trò chuyện nhóm</span>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : activeTab === 'contacts' ? (
          <ContactsContent category={contactCategory} currentUser={currentUser} />
        ) : (
          <div className="flex-1 bg-[var(--background)] flex items-center justify-center text-[var(--sub-text)]">
            {t('common.coming_soon')}
          </div>
        )}
      </div>
    </div>
  );
}
