import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SearchIcon, SparklesIcon } from '@/components/ui/Icons';
import { StatusIndicator } from '@/features/user';
import { webrtcService } from '@/lib/realtime/webrtcService';
import { apiClient } from '@/lib/http/apiClient';
import type { ChatHeaderProps } from '@/features/chat/components/ChatWindow/types';

const DEFAULT_GROUP_AVATARS = Array.from({ length: 8 }, (_, idx) => `/default/image${idx + 1}.jpg`);

export function ChatHeader({ vm }: ChatHeaderProps) {
  const {
    t,
    selectedChat,
    nickname,
    activeSidebar,
    onToggleSidebar,
    onUpdateConversationMeta,
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
  const [isGroupInfoModalOpen, setIsGroupInfoModalOpen] = useState(false);
  const [groupModalView, setGroupModalView] = useState<'info' | 'avatar' | 'rename' | 'members'>('info');
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [groupNameOverride, setGroupNameOverride] = useState('');
  const [groupAvatarOverride, setGroupAvatarOverride] = useState<string | undefined>(undefined);
  const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false);

  useEffect(() => {
    if (!selectedChat.isGroup) {
      setGroupModalView('info');
      setGroupNameDraft('');
      setGroupNameOverride('');
      setGroupAvatarOverride(undefined);
      return;
    }

    setGroupNameDraft(selectedChat.name || '');
    setGroupNameOverride(selectedChat.name || '');
    setGroupAvatarOverride(selectedChat.avatar);
    setGroupModalView('info');
  }, [selectedChat.id, selectedChat.isGroup, selectedChat.name, selectedChat.avatar]);

  const displayGroupName = selectedChat.isGroup ? (groupNameOverride || selectedChat.name) : selectedChat.name;
  const displayGroupAvatar = selectedChat.isGroup ? (groupAvatarOverride || selectedChat.avatar) : selectedChat.avatar;

  const handleVideoCall = useCallback(() => {
    const peerId = selectedChat.otherUserId;
    if (!peerId || !currentUser?.id) {
      console.error('[VideoCall] Cannot start call — missing data:',
        { peerId, currentUserId: currentUser?.id, selectedChatId: selectedChat.id });
      return;
    }

    console.log('[VideoCall] Starting call to:', peerId, 'from:', currentUser.id);
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

  const closeGroupModal = useCallback(() => {
    setIsGroupInfoModalOpen(false);
    setGroupModalView('info');
  }, []);

  const updateGroupInfo = useCallback(async (
    payload: { conversationName?: string; conversationAvatarUrl?: string }
  ): Promise<boolean> => {
    if (!selectedChat.isGroup || !selectedChat.id) return false;

    setIsSavingGroupInfo(true);
    try {
      await apiClient.patch(`/conversations/${selectedChat.id}`, payload);

      const updates: { name?: string; avatar?: string } = {};

      if (typeof payload.conversationName === 'string') {
        const normalizedName = payload.conversationName.trim();
        setGroupNameOverride(normalizedName);
        setGroupNameDraft(normalizedName);
        updates.name = normalizedName;
      }
      if (typeof payload.conversationAvatarUrl === 'string') {
        setGroupAvatarOverride(payload.conversationAvatarUrl);
        updates.avatar = payload.conversationAvatarUrl;
      }

      if (Object.keys(updates).length > 0) {
        onUpdateConversationMeta?.(selectedChat.id, updates);
      }

      return true;
    } catch {
      toast.error('Không thể cập nhật thông tin nhóm. Vui lòng thử lại.');
      return false;
    } finally {
      setIsSavingGroupInfo(false);
    }
  }, [onUpdateConversationMeta, selectedChat.id, selectedChat.isGroup]);

  const shouldShowGroupAvatarFallback = Boolean(selectedChat.isGroup && !displayGroupAvatar);
  const groupAvatarTiles = [
    selectedChat.groupAvatarUrls?.[0],
    selectedChat.groupAvatarUrls?.[1],
    selectedChat.groupAvatarUrls?.[2],
  ];
  const openGroupInfoModal = useCallback(() => {
    if (selectedChat.isGroup) {
      setGroupModalView('info');
      setIsGroupInfoModalOpen(true);
    }
  }, [selectedChat.isGroup]);
  const openGroupAvatarPanel = useCallback(() => {
    setGroupModalView('avatar');
  }, []);
  const openGroupMembersPanel = useCallback(() => {
    setGroupModalView('members');
  }, []);
  const openRenameGroupPanel = useCallback(() => {
    setGroupNameDraft(displayGroupName || '');
    setGroupModalView('rename');
  }, [displayGroupName]);
  const handleEditConversationName = useCallback(() => {
    if (selectedChat.isGroup) {
      setGroupNameDraft(displayGroupName || '');
      setGroupModalView('rename');
      setIsGroupInfoModalOpen(true);
      return;
    }

    setIsNicknameModalOpen(true);
  }, [displayGroupName, selectedChat.isGroup, setIsNicknameModalOpen]);
  const handleSelectDefaultAvatar = useCallback(async (avatarUrl: string) => {
    const ok = await updateGroupInfo({ conversationAvatarUrl: avatarUrl });
    if (!ok) return;
    toast.success('Đã cập nhật ảnh đại diện nhóm.');
    setGroupModalView('info');
  }, [updateGroupInfo]);
  const handleConfirmRenameGroup = useCallback(async () => {
    const nextName = groupNameDraft.trim();
    if (!nextName) {
      toast.error('Tên nhóm không được để trống.');
      return;
    }

    if (nextName === displayGroupName) {
      setGroupModalView('info');
      return;
    }

    const ok = await updateGroupInfo({ conversationName: nextName });
    if (!ok) return;
    toast.success('Đổi tên nhóm thành công.');
    setGroupModalView('info');
  }, [groupNameDraft, displayGroupName, updateGroupInfo]);
  const memberPreviewAvatars = [
    ...groupAvatarTiles.filter((url): url is string => Boolean(url)),
    ...(displayGroupAvatar ? [displayGroupAvatar] : []),
  ].slice(0, 4);

  const [mediaPreviewItems, setMediaPreviewItems] = useState<string[]>([]);
  useEffect(() => {
    if (selectedChat.id) {
      apiClient.get(`/messages/conversation/${selectedChat.id}/media`)
        .then((res: any) => {
          const items = Array.isArray(res) ? res : (res?.data || []);
          const imagesAndVideos = items.filter((m: any) => m.messageType === 'IMAGE' || m.messageType === 'VIDEO');
          setMediaPreviewItems(imagesAndVideos.map((m: any) => m.content).slice(0, 4));
        })
        .catch(() => {});
    }
  }, [selectedChat.id]);
  const groupJoinLink = `https://zalo.me/g/${String(selectedChat.id || 'qoiwgj852')}`;

  const handleCopyGroupLink = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(groupJoinLink).catch(() => {
      // Ignore clipboard errors to keep interaction smooth.
    });
  }, [groupJoinLink]);

  const handleOpenGroupLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.open(groupJoinLink, '_blank', 'noopener,noreferrer');
  }, [groupJoinLink]);

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
        ) : shouldShowGroupAvatarFallback ? (
          <button
            type="button"
            onClick={openGroupInfoModal}
            className="h-12 w-12 rounded-full overflow-hidden shrink-0 grid grid-cols-2 grid-rows-2 border border-black/10 dark:border-white/10 cursor-pointer"
            aria-label="Mở thông tin nhóm"
          >
            <div className="relative bg-gray-200 dark:bg-gray-700">
              {groupAvatarTiles[0] ? <img src={groupAvatarTiles[0]} alt={selectedChat.name} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="relative bg-gray-200 dark:bg-gray-700">
              {groupAvatarTiles[1] ? <img src={groupAvatarTiles[1]} alt={selectedChat.name} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="relative bg-gray-200 dark:bg-gray-700">
              {groupAvatarTiles[2] ? <img src={groupAvatarTiles[2]} alt={selectedChat.name} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="flex items-center justify-center bg-[#E9EEF7] text-[#5B6576] text-[10px] font-bold">
              {selectedChat.memberCount || 0}
            </div>
          </button>
        ) : displayGroupAvatar ? (
          selectedChat.isGroup ? (
            <button
              type="button"
              onClick={openGroupInfoModal}
              className="h-12 w-12 rounded-full overflow-hidden shrink-0 relative cursor-pointer"
              aria-label="Mở thông tin nhóm"
            >
              <img src={displayGroupAvatar} alt={displayGroupName} className="w-full h-full object-cover" />
              {selectedChat.otherUserId && (
                <StatusIndicator userId={selectedChat.otherUserId} dotOnly dotSize={12} className="absolute bottom-0 right-0" />
              )}
            </button>
          ) : (
            <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 relative">
              <img src={displayGroupAvatar} alt={selectedChat.name} className="w-full h-full object-cover" />
              {selectedChat.otherUserId && (
                <StatusIndicator userId={selectedChat.otherUserId} dotOnly dotSize={12} className="absolute bottom-0 right-0" />
              )}
            </div>
          )
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
              {selectedChat.isGroup ? displayGroupName : (nickname || selectedChat.name)}
              <button
                onClick={handleEditConversationName}
                type="button"
                title={selectedChat.isGroup ? 'Đổi tên nhóm' : 'Đặt biệt danh'}
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
                : (selectedChat.isGroup ? `${t('chat.header.group_prefix')} · ${displayGroupName}` : '')}
            </p>
            {!selectedChat.isCloud && !selectedChat.isAi && selectedChat.otherUserId && (
              <StatusIndicator userId={selectedChat.otherUserId} />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-[var(--sub-text)] pr-2 shrink-0">
        {!selectedChat.isCloud && !selectedChat.isAi && !selectedChat.isGroup && (
          <button onClick={handleVideoCall} className="cursor-pointer transition-all p-1.5 rounded-md hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70" title={t('chat.header.video_call')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
          </button>
        )}

        {!selectedChat.isCloud && !selectedChat.isAi && (
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

      {isGroupInfoModalOpen && selectedChat.isGroup && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/45" onClick={closeGroupModal} />
          <div className="relative z-[131] w-full max-w-[460px] bg-[#F3F4F6] rounded-md overflow-hidden border border-[#D8DADF] shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="h-[54px] px-4 bg-white border-b border-[#D8DADF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {groupModalView !== 'info' && (
                  <button
                    type="button"
                    onClick={() => setGroupModalView('info')}
                    className="w-8 h-8 rounded-full hover:bg-[#EEF1F5] flex items-center justify-center cursor-pointer text-[#13233F]"
                    aria-label="Quay lại thông tin nhóm"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                )}
                <h3 className="text-[15px] leading-none font-semibold text-[#13233F]">
                  {groupModalView === 'avatar' ? 'Cập nhật ảnh đại diện' : groupModalView === 'rename' ? 'Đổi tên nhóm' : groupModalView === 'members' ? 'Thành viên nhóm' : 'Thông tin nhóm'}
                </h3>
              </div>

              <button type="button" onClick={closeGroupModal} className="w-8 h-8 rounded-full hover:bg-[#EEF1F5] flex items-center justify-center cursor-pointer text-[#13233F]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {groupModalView === 'avatar' ? (
              <div className="bg-[#F3F4F6] p-4 pb-5">
                <button
                  type="button"
                  onClick={() => toast.info('Tải ảnh từ máy sẽ được cập nhật trong bản tiếp theo.')}
                  className="w-full h-12 rounded bg-[#D6E6FF] hover:bg-[#C7DDFF] text-[#0A55C2] text-[16px] leading-none font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                  <span>Tải lên từ máy tính</span>
                </button>

                <div className="mt-5 text-[16px] font-semibold text-[#13233F]">Bộ sưu tập</div>

                <div className="mt-4 grid grid-cols-4 gap-4">
                  {DEFAULT_GROUP_AVATARS.map((avatarUrl, idx) => {
                    const isSelected = displayGroupAvatar === avatarUrl;

                    return (
                      <button
                        key={avatarUrl}
                        type="button"
                        onClick={() => handleSelectDefaultAvatar(avatarUrl)}
                        disabled={isSavingGroupInfo}
                        className={`relative aspect-square rounded-full overflow-hidden border transition-all cursor-pointer ${isSelected ? 'border-[#0F69FF] ring-2 ring-[#9CC0FF]' : 'border-[#BFC8D7] hover:border-[#93A4BE]'} ${isSavingGroupInfo ? 'opacity-60 cursor-not-allowed' : ''}`}
                        aria-label={`Chọn ảnh đại diện mẫu ${idx + 1}`}
                      >
                        <img src={avatarUrl} alt={`Avatar mẫu ${idx + 1}`} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#0F69FF]/20 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-white text-[#0F69FF] flex items-center justify-center">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : groupModalView === 'members' ? (
              <div className="bg-[#F3F4F6] p-4 pb-5 max-h-[420px] overflow-y-auto">
                <p className="text-[13px] text-[#5A667A] mb-3">
                  {selectedChat.memberCount || 0} thành viên
                </p>
                <div className="space-y-3">
                  {memberPreviewAvatars.map((url, idx) => (
                    <div key={`member-list-${url}-${idx}`} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border border-[#D0D6DF] shrink-0">
                        <img src={url} alt={`Thành viên ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[13px] font-medium text-[#13233F]">Thành viên {idx + 1}</span>
                    </div>
                  ))}
                  {(selectedChat.memberCount || 0) > memberPreviewAvatars.length && (
                    <p className="text-[12px] text-[#5A667A] text-center pt-1">
                      và {(selectedChat.memberCount || 0) - memberPreviewAvatars.length} thành viên khác
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setIsGroupInfoModalOpen(false); onToggleSidebar('info'); }}
                  className="mt-4 w-full h-9 bg-[#DADDE3] hover:bg-[#CFD5DE] rounded text-[13px] leading-none font-semibold text-[#13233F] cursor-pointer transition-colors"
                >
                  Xem tất cả thành viên
                </button>
              </div>
            ) : groupModalView === 'rename' ? (
              <div className="bg-[#F3F4F6] p-4 pb-5">
                <label className="text-[13px] text-[#5A667A] font-medium">Tên nhóm mới</label>
                <input
                  type="text"
                  value={groupNameDraft}
                  onChange={(e) => setGroupNameDraft(e.target.value)}
                  placeholder="Nhập tên nhóm"
                  className="mt-2 w-full h-10 rounded border border-[#CBD3DF] px-3 text-[14px] text-[#13233F] bg-white outline-none focus:border-[#0F69FF]"
                  maxLength={60}
                />

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupModalView('info')}
                    className="h-9 px-4 rounded bg-[#DFE3EA] hover:bg-[#D4DAE4] text-[#2D3B52] text-[13px] font-medium transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRenameGroup}
                    disabled={isSavingGroupInfo}
                    className="h-9 px-4 rounded bg-[#0F69FF] hover:bg-[#0B5CE3] text-white text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-4 bg-[#F3F4F6]">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border border-[#C7CED9]">
                        {displayGroupAvatar ? (
                          <img src={displayGroupAvatar} alt={displayGroupName} className="w-full h-full object-cover" />
                        ) : memberPreviewAvatars.length > 0 ? (
                          <div className="w-full h-full relative bg-[#E8ECF2]">
                            <div className="absolute left-1.5 top-1.5 w-8 h-8 rounded-full overflow-hidden border border-[#D0D6DF] bg-gray-200">
                              {memberPreviewAvatars[0] ? <img src={memberPreviewAvatars[0]} alt={displayGroupName} className="w-full h-full object-cover" /> : null}
                            </div>
                            <div className="absolute right-1.5 top-1.5 w-8 h-8 rounded-full overflow-hidden border border-[#D0D6DF] bg-gray-200">
                              {memberPreviewAvatars[1] ? <img src={memberPreviewAvatars[1]} alt={displayGroupName} className="w-full h-full object-cover" /> : null}
                            </div>
                            <div className="absolute left-1.5 bottom-1.5 w-8 h-8 rounded-full overflow-hidden border border-[#D0D6DF] bg-gray-200">
                              {memberPreviewAvatars[2] ? <img src={memberPreviewAvatars[2]} alt={displayGroupName} className="w-full h-full object-cover" /> : null}
                            </div>
                            <div className="absolute right-1.5 bottom-1.5 w-8 h-8 rounded-full border border-[#D0D6DF] bg-[#D8DEE8] text-[#5B6576] text-[10px] font-bold flex items-center justify-center">
                              {selectedChat.memberCount || 0}
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[28px] font-bold text-[#5B6576]">
                            {displayGroupName?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={openGroupAvatarPanel}
                        className="absolute -bottom-1 -right-1 z-10 w-8 h-8 rounded-full border border-[#BBC4D1] bg-[#DDE2E9] text-[#22324D] hover:bg-[#D2D9E3] flex items-center justify-center cursor-pointer"
                        aria-label="Cập nhật ảnh đại diện"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h3l2-2h6l2 2h3v12H4z" /><circle cx="12" cy="13" r="3.2" /></svg>
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] leading-tight font-semibold text-[#13233F] truncate flex items-center gap-2">
                        {displayGroupName}
                        <button
                          type="button"
                          onClick={openRenameGroupPanel}
                          className="w-6 h-6 rounded-full hover:bg-[#E7EBF2] text-[#22324D] flex items-center justify-center cursor-pointer"
                          aria-label="Đổi tên nhóm"
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeGroupModal}
                    className="mt-3.5 w-full h-9 bg-[#DADDE3] hover:bg-[#CFD5DE] rounded text-[16px] leading-none font-semibold text-[#13233F] cursor-pointer transition-colors"
                  >
                    Nhắn tin
                  </button>
                </div>

                <div className="h-2 bg-[#E0E3E8]" />

                <div className="px-4 py-3.5 bg-[#F3F4F6] border-b border-[#D8DADF]">
                  <div className="text-[13px] leading-none font-semibold text-[#13233F]">Thành viên ({selectedChat.memberCount || 0})</div>
                  <div className="mt-4 flex items-center">
                    {memberPreviewAvatars.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className={`w-9 h-9 rounded-full overflow-hidden border-2 border-[#F3F4F6] bg-gray-300 ${idx > 0 ? '-ml-2' : ''}`}
                      >
                        <img src={url} alt={`Member ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={openGroupMembersPanel}
                      className="w-9 h-9 -ml-2 rounded-full border-2 border-[#F3F4F6] bg-[#D5D8DE] text-[#23324A] text-[18px] leading-none font-semibold flex items-center justify-center hover:bg-[#C8CCD6] transition-colors cursor-pointer"
                      aria-label="Xem danh sách thành viên"
                    >...</button>
                  </div>
                </div>

                <div className="h-2 bg-[#E0E3E8]" />

                <div className="px-4 py-3.5 bg-[#F3F4F6] border-b border-[#D8DADF]">
                  <div className="text-[13px] leading-none font-semibold text-[#13233F]">Ảnh/Video</div>
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="aspect-[1.1/1] rounded overflow-hidden bg-[#E2E6ED] border border-[#D0D6E0]">
                        {mediaPreviewItems[idx] ? (
                          <img src={mediaPreviewItems[idx]} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#7B8494] text-[10px]">Ảnh</div>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => onToggleSidebar('info')} className="aspect-[1.1/1] rounded bg-[#D6DFEE] text-[#0F69FF] flex items-center justify-center hover:bg-[#C2D1E8] transition-colors cursor-pointer">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </button>
                  </div>
                </div>

                <div className="h-2 bg-[#E0E3E8]" />

                <div className="px-4 py-3.5 bg-[#F3F4F6] space-y-3.5">
                  <div className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 -mx-1.5 transition-colors hover:bg-[#E7EBF2]">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="pt-1 text-[#5A667A]">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l2.1-2.1a5 5 0 0 0-7.07-7.07l-1.21 1.21" /><path d="M14 11a5 5 0 0 0-7.54-.54l-2.1 2.1a5 5 0 0 0 7.07 7.07l1.21-1.21" /></svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] leading-none font-medium text-[#13233F]">Link tham gia nhóm</div>
                        <button type="button" onClick={handleOpenGroupLink} className="mt-1 text-[12px] leading-tight text-[#0F69FF] hover:underline break-all text-left">{groupJoinLink}</button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button type="button" onClick={handleCopyGroupLink} className="w-11 h-11 rounded-full bg-[#D9DDE4] hover:bg-[#CFD4DC] text-[#3A4658] flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                      </button>
                      <button type="button" onClick={handleOpenGroupLink} className="w-11 h-11 rounded-full bg-[#D9DDE4] hover:bg-[#CFD4DC] text-[#3A4658] flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h4" /></svg>
                      </button>
                    </div>
                  </div>

                  <button type="button" onClick={() => { setIsGroupInfoModalOpen(false); onToggleSidebar('info'); }} className="w-full flex items-center gap-3 text-left cursor-pointer text-[#13233F] rounded-md px-2 py-1.5 -mx-1.5 transition-colors hover:bg-[#E7EBF2]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01A1.65 1.65 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                    <span className="text-[13px] leading-none font-medium">Quản lý nhóm</span>
                  </button>

                  <button type="button" onClick={() => { setIsGroupInfoModalOpen(false); onToggleSidebar('info'); }} className="w-full flex items-center gap-3 text-left cursor-pointer text-[#D22929] rounded-md px-2 py-1.5 -mx-1.5 transition-colors hover:bg-[#FBEAEC]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    <span className="text-[13px] leading-none font-medium">Rời nhóm</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
