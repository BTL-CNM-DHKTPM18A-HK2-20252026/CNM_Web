import React, { useCallback } from 'react';
import { SearchIcon, SparklesIcon } from '@/components/ui/Icons';
import { StatusIndicator } from '@/features/user';
import { webrtcService } from '@/lib/realtime/webrtcService';
import type { ChatHeaderProps } from '@/features/chat/components/ChatWindow/types';

export function ChatHeader({ vm }: ChatHeaderProps) {
  const {
    t,
    selectedChat,
    nickname,
    activeSidebar,
    onToggleSidebar,
    setIsNicknameModalOpen,
    currentUser,
    // Summary
    summaryText,
    summaryLoading,
    summaryMessageCount,
    isSummaryOpen,
    setIsSummaryOpen,
    fetchSummary,
  } = vm;

  const handleVideoCall = useCallback(() => {
    const peerId = selectedChat.otherUserId;
    if (!peerId || !currentUser?.id) return;

    webrtcService.startCall(
      currentUser.id,
      peerId,
      selectedChat.name,
      selectedChat.avatar,
      selectedChat.id.toString(),
      currentUser.full_name || currentUser.display_name || 'User',
      currentUser.avatar_url,
    );
  }, [selectedChat, currentUser]);

  return (
    <div className="relative h-[76px] bg-[var(--card-bg)] border-b border-[var(--border)] px-5 flex items-center justify-between shadow-sm flex-shrink-0 transition-colors duration-200">
      <div className="flex items-center gap-4">
        {selectedChat.isAi ? (
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
            <SparklesIcon size={24} />
          </div>
        ) : selectedChat.isCloud ? (
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-[#0068FF] font-bold shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L10 13.17l7.59-7.59L19 7l-8 9z" /></svg>
          </div>
        ) : selectedChat.avatar ? (
          <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 relative">
            <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" />
            {selectedChat.otherUserId && (
              <StatusIndicator userId={selectedChat.otherUserId} dotOnly dotSize={12} className="absolute bottom-0 right-0" />
            )}
          </div>
        ) : (
          <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 relative">
            <span className="text-[#0068FF] font-bold text-lg">{selectedChat.name?.charAt(0) || '?'}</span>
            {selectedChat.otherUserId && (
              <StatusIndicator userId={selectedChat.otherUserId} dotOnly dotSize={12} className="absolute bottom-0 right-0" />
            )}
          </div>
        )}

        <div className="min-w-0 group/info cursor-pointer flex items-center gap-2">
          <div>
            <h3 className="text-[18px] font-bold leading-none mb-1.5 text-[var(--text)] truncate flex items-center gap-1.5">
              {nickname || selectedChat.name}
              <button
                onClick={() => setIsNicknameModalOpen(true)}
                className="p-1 hover:bg-[var(--hover-bg)] rounded-md opacity-0 group-hover/info:opacity-100 transition-all text-gray-400 hover:text-[var(--text)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
            </h3>
            <p className="text-[13px] text-[var(--sub-text)] truncate">
              {selectedChat.isAi
                ? t('chat.ai_subheading')
                : selectedChat.isCloud
                ? t('chat.cloud_subheading')
                : selectedChat.otherUserId
                ? undefined
                : (selectedChat.isGroup ? `${t('chat.header.group_prefix')} · ${selectedChat.name}` : '')}
            </p>
            {!selectedChat.isCloud && !selectedChat.isAi && selectedChat.otherUserId && (
              <StatusIndicator userId={selectedChat.otherUserId} />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-[var(--sub-text)] pr-2 shrink-0">
        {!selectedChat.isCloud && !selectedChat.isAi && (
          <>
            <button className="cursor-pointer transition-all p-1.5 rounded-md hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70" title={t('chat.header.add_to_group')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
            </button>
            {!selectedChat.isGroup && (
              <button onClick={handleVideoCall} className="cursor-pointer transition-all p-1.5 rounded-md hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70" title={t('chat.header.video_call')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
              </button>
            )}
          </>
        )}

        {!selectedChat.isCloud && !selectedChat.isAid && !selectedChat.isAi && (
          <button
            onClick={fetchSummary}
            disabled={summaryLoading}
            className={`cursor-pointer transition-all p-1.5 rounded-md ${isSummaryOpen ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}
            title="Tóm tắt cuộc trò chuyện"
          >
            {summaryLoading ? (
              <div className="w-[22px] h-[22px] flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            )}
          </button>
        )}

        <button
          onClick={() => onToggleSidebar('search')}
          className={`cursor-pointer transition-all p-1.5 rounded-md ${activeSidebar === 'search' ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}
        >
          <SearchIcon size={24} />
        </button>

        <button
          onClick={() => onToggleSidebar('info')}
          className={`cursor-pointer transition-all p-1.5 rounded-md ${activeSidebar === 'info' ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
        </button>
      </div>

      {/* Summary Modal */}
      {isSummaryOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsSummaryOpen(false)} />
          <div className="absolute top-full right-4 mt-2 w-[440px] max-h-[500px] bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-gradient-to-r from-[#0068FF]/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0068FF]/10 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div>
                  <span className="text-[14px] font-semibold text-[var(--text)]">Tóm tắt cuộc trò chuyện</span>
                  {!summaryLoading && summaryMessageCount > 0 && (
                    <div className="text-[11px] text-[var(--sub-text)]">{summaryMessageCount} tin nhắn gần nhất</div>
                  )}
                </div>
              </div>
              <button onClick={() => setIsSummaryOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)] text-[var(--sub-text)] cursor-pointer transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            {/* Body */}
            <div className="p-4 overflow-y-auto max-h-[430px]">
              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-[3px] border-[#0068FF] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[13px] text-[var(--sub-text)]">AI đang tóm tắt 100 tin nhắn gần nhất...</span>
                </div>
              ) : (
                <div
                  className="text-[13px] text-[var(--text)] leading-[1.7] whitespace-pre-wrap [&>strong]:text-[#0068FF] [&>strong]:font-semibold"
                  dangerouslySetInnerHTML={{
                    __html: (summaryText || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
