import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ImageModal } from '@/components/ui/ImageModal';
import { ForwardModal } from '@/features/chat/components/modals/ForwardModal';
import { NicknameModal } from '@/features/chat/components/modals/NicknameModal';
import { ShareContactModal } from '@/features/chat/components/modals/ShareContactModal';
import { GroupMediaViewer } from '@/features/chat/components/ChatWindow/GroupMediaViewer';
import type { ChatModalHostProps } from '@/features/chat/components/ChatWindow/types';

export function ChatModalHost({ vm }: ChatModalHostProps) {
  const {
    t,
    selectedChat,
    currentUser,
    imageQueue,
    captionModalIdx,
    captionDraft,
    setCaptionDraft,
    setCaptionModalIdx,
    setImageQueue,
    openedImageSrc,
    setOpenedImageSrc,
    forwardingMsg,
    setForwardingMsg,
    onUpdateConversation,
    isShareContactOpen,
    setIsShareContactOpen,
    isNicknameModalOpen,
    setIsNicknameModalOpen,
    nickname,
    handleNicknameConfirm,
    contextMenu,
    setContextMenu,
    messages,
    setReplyingTo,
    messageInputRef,
    startEditMessage,
    setConfirmDialog,
    pinnedMessages,
    handleUnpinMessage,
    handlePinMessage,
    confirmDialog,
    handleRecallMessage,
    handleDeleteLocal,
    reactionModalMessageId,
    setReactionModalMessageId,
    reactionModalEmojiTab,
    setReactionModalEmojiTab,
  } = vm;

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenuStyle, setContextMenuStyle] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!contextMenu) {
      setContextMenuStyle(null);
      return;
    }

    const positionContextMenu = () => {
      const menuEl = contextMenuRef.current;
      if (!menuEl || typeof window === 'undefined') return;

      const margin = 12;
      const offsetY = 8;
      const rect = menuEl.getBoundingClientRect();
      const menuWidth = rect.width || 220;
      const menuHeight = rect.height || 260;

      let left = contextMenu.x;
      const minCenterX = margin + menuWidth / 2;
      const maxCenterX = window.innerWidth - margin - menuWidth / 2;
      if (minCenterX <= maxCenterX) {
        left = Math.min(Math.max(left, minCenterX), maxCenterX);
      }

      let top = contextMenu.y - offsetY;
      if (top + menuHeight > window.innerHeight - margin) {
        top = contextMenu.y - menuHeight - offsetY;
      }
      top = Math.max(margin, Math.min(top, window.innerHeight - margin - menuHeight));

      setContextMenuStyle({
        top,
        left,
        transform: 'translateX(-50%)',
      });
    };

    positionContextMenu();
    window.addEventListener('resize', positionContextMenu);
    return () => window.removeEventListener('resize', positionContextMenu);
  }, [contextMenu]);

  // Collect all media items from conversation (IMAGE, VIDEO, IMAGE_GROUP) for viewer navigation
  const allConversationMedia = useMemo(() => {
    const items: any[] = [];
    for (const msg of messages) {
      if (msg.isRecalled) continue;
      if (msg.type === 'IMAGE' || msg.type === 'VIDEO') {
        items.push({
          id: msg.id,
          messageId: msg.id,
          content: msg.text,
          messageType: msg.type,
          senderName: msg.sender === 'Me' ? currentUser?.displayName : msg.sender,
          senderAvatarUrl: msg.avatar,
          createdAt: msg.rawDate?.toISOString(),
          caption: msg.caption || (msg.type !== 'TEXT' && msg.type !== 'IMAGE_GROUP' ? msg.text : undefined),
        });
      } else if (msg.type === 'IMAGE_GROUP' && msg.attachments) {
        for (const att of msg.attachments) {
          items.push({
            id: `${msg.id}-${att.url}`,
            messageId: msg.id,
            content: att.url,
            messageType: 'IMAGE',
            senderName: msg.sender === 'Me' ? currentUser?.displayName : msg.sender,
            senderAvatarUrl: msg.avatar,
            createdAt: msg.rawDate?.toISOString(),
            caption: msg.caption || msg.text,
          });
        }
      }
    }
    return items;
  }, [messages, currentUser?.displayName]);

  const openedImageIndex = useMemo(() => {
    if (!openedImageSrc) return 0;
    return allConversationMedia.findIndex(m => m.content === openedImageSrc);
  }, [openedImageSrc, allConversationMedia]);

  return (
    <>
      {captionModalIdx !== null && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-2xl w-[420px] max-w-[92vw] overflow-hidden">
            <img
              src={imageQueue[captionModalIdx]?.previewUrl}
              alt=""
              className="w-full max-h-[260px] object-contain bg-black/5"
            />
            <div className="px-5 py-4">
              <p className="text-[13px] font-semibold text-[var(--sub-text)] mb-2">Thêm mô tả</p>
              <input
                type="text"
                autoFocus
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const idx = captionModalIdx;
                    setImageQueue(prev => prev.map((item, i) => (i === idx ? { ...item, caption: captionDraft } : item)));
                    setCaptionModalIdx(null);
                  }
                  if (e.key === 'Escape') setCaptionModalIdx(null);
                }}
                placeholder="Nhập mô tả ảnh..."
                className="w-full bg-[var(--hover-bg)] text-[var(--text)] text-[14px] rounded-lg px-3 py-2.5 outline-none border border-[var(--border)] focus:border-[#0068FF] transition-colors"
              />
              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  onClick={() => setCaptionModalIdx(null)}
                  className="px-4 py-2 text-[13px] font-medium text-[var(--sub-text)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    const idx = captionModalIdx;
                    setImageQueue(prev => prev.map((item, i) => (i === idx ? { ...item, caption: captionDraft } : item)));
                    setCaptionModalIdx(null);
                  }}
                  className="px-4 py-2 text-[13px] font-semibold bg-[#0068FF] hover:bg-[#0052CC] text-white rounded-lg transition-colors cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <GroupMediaViewer
        isOpen={!!openedImageSrc}
        onClose={() => setOpenedImageSrc(null)}
        mediaItems={allConversationMedia}
        initialIndex={openedImageIndex}
        groupName={selectedChat.name}
        currentUser={vm.currentUser}
        members={selectedChat.members}
        onForward={(item) => setForwardingMsg({
          id: item.messageId,
          text: item.content,
          type: item.messageType,
          sender: item.senderName || 'Người dùng',
          caption: item.caption,
        })}
      />

      {forwardingMsg && (
        <ForwardModal
          message={forwardingMsg}
          currentConversationId={String(selectedChat.id)}
          currentUserId={currentUser?.id}
          onClose={() => setForwardingMsg(null)}
          onForwarded={(convId) => {
            if (onUpdateConversation) {
              const snippet = forwardingMsg.type === 'IMAGE'
                ? t('chat.snippet.image')
                : forwardingMsg.type === 'VIDEO'
                ? t('chat.snippet.video')
                : forwardingMsg.type === 'MEDIA'
                ? t('chat.snippet.file')
                : forwardingMsg.type === 'VOICE'
                ? t('chat.snippet.voice')
                : forwardingMsg.text;
              onUpdateConversation(convId, snippet, new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }));
            }
          }}
        />
      )}

      {isShareContactOpen && !selectedChat.isNew && (
        <ShareContactModal
          conversationId={String(selectedChat.id)}
          currentUserId={currentUser?.id}
          onClose={() => setIsShareContactOpen(false)}
          onSent={() => {
            if (onUpdateConversation) {
              onUpdateConversation(
                selectedChat.id,
                `📇 ${t('share_contact.snippet')}`,
                new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
              );
            }
          }}
        />
      )}

      {!selectedChat.isGroup && (
        <NicknameModal
          isOpen={isNicknameModalOpen}
          onClose={() => setIsNicknameModalOpen(false)}
          currentName={nickname || selectedChat.name}
          avatar={selectedChat.avatar}
          onConfirm={handleNicknameConfirm}
        />
      )}

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[150]" onClick={() => setContextMenu(null)} />
          <div
            ref={contextMenuRef}
            className="fixed z-[151] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-2xl py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
            style={contextMenuStyle ?? { top: contextMenu.y, left: contextMenu.x, transform: 'translate(-50%, -8px)' }}
          >
            {contextMenu.isMe && contextMenu.type === 'TEXT' && (
              <button
                onClick={() => {
                  const msg = messages.find(m => m.id === contextMenu.msgId);
                  if (msg) startEditMessage(msg);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                {t('chat.ctx_menu.edit')}
              </button>
            )}

            <button
              onClick={() => {
                const msg = messages.find(m => m.id === contextMenu.msgId);
                if (msg) {
                  setReplyingTo({
                    id: msg.id,
                    text: msg.text,
                    sender: msg.sender,
                    type: msg.type,
                  });
                  setTimeout(() => messageInputRef.current?.focus(), 50);
                }
                setContextMenu(null);
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1l-1.2 3.3a.75.75 0 0 0 .95.95l3.3-1.2A10 10 0 1 0 12 2z" /></svg>
              {t('chat.actions.reply')}
            </button>

            {(() => {
              const isPinned = pinnedMessages.some(p => p.messageId === contextMenu.msgId);
              return (
                <button
                  onClick={() => (isPinned ? handleUnpinMessage(contextMenu.msgId) : handlePinMessage(contextMenu.msgId))}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" /></svg>
                  {isPinned ? t('chat.ctx_menu.unpin') : t('chat.ctx_menu.pin')}
                </button>
              );
            })()}

            {contextMenu.isMe && (
              <button
                onClick={() => { setConfirmDialog({ type: 'recall', msgId: contextMenu.msgId }); setContextMenu(null); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                {t('chat.ctx_menu.recall')}
              </button>
            )}

            <button
              onClick={() => { setConfirmDialog({ type: 'delete', msgId: contextMenu.msgId }); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              {t('chat.ctx_menu.delete_local')}
            </button>
          </div>
        </>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="bg-[var(--card-bg)] w-[380px] max-w-[90vw] rounded-lg shadow-2xl overflow-hidden border border-[var(--border)]">
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-[16px] font-bold text-[var(--text)] mb-2">
                {confirmDialog.type === 'recall' ? t('chat.confirm.recall_title') : t('chat.confirm.delete_title')}
              </h3>
              <p className="text-[14px] text-[var(--sub-text)]">
                {confirmDialog.type === 'recall' ? t('chat.confirm.recall_message') : t('chat.confirm.delete_message')}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-[14px] font-medium text-[var(--sub-text)] hover:bg-[var(--hover-bg)] rounded-md transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.type === 'recall') handleRecallMessage(confirmDialog.msgId);
                  else handleDeleteLocal(confirmDialog.msgId);
                }}
                className={`px-4 py-2 text-[14px] font-medium text-white rounded-md transition-colors cursor-pointer ${confirmDialog.type === 'recall' ? 'bg-[#0068FF] hover:bg-[#0052CC]' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {confirmDialog.type === 'recall' ? t('chat.confirm.recall_btn') : t('chat.confirm.delete_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {reactionModalMessageId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="bg-[var(--card-bg)] w-[500px] h-auto max-h-[420px] max-w-[95vw] rounded-lg shadow-2xl flex flex-col overflow-hidden border border-[var(--border)]">
            <div className="h-[50px] border-b border-[var(--border)] flex items-center justify-between pl-4 pr-1.5 shrink-0">
              <h3 className="text-[16px] font-bold text-[var(--text)]">{t('chat.reactions.title')}</h3>
              <button onClick={() => setReactionModalMessageId(null)} className="w-8 h-8 flex items-center justify-center text-[var(--sub-text)] hover:bg-[var(--hover-bg)] rounded-full transition-colors cursor-pointer"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </div>
            <div className="flex-1 flex overflow-hidden min-h-[280px]">
              <div className="w-[85px] bg-[var(--hover-bg)] flex flex-col pt-0.5 shrink-0 overflow-y-auto border-r border-[var(--border)]">
                {(() => {
                  const targetMsg = messages.find(m => m.id === String(reactionModalMessageId));
                  const allReactions = targetMsg?.reactions || [];
                  const counts: Record<string, number> = {};
                  allReactions.forEach((reaction: any) => {
                    counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
                  });
                  return (
                    <div className="flex flex-col">
                      <button onClick={() => setReactionModalEmojiTab('all')} className={`flex items-center justify-between px-2 py-2.5 transition-colors cursor-pointer ${reactionModalEmojiTab === 'all' ? 'bg-[var(--card-bg)] text-[var(--primary)] border-r-2 border-[var(--primary)]' : 'text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5'}`}><span className="text-[13.5px] font-medium">{t('chat.reactions.all')}</span><span className="text-[12px] text-[var(--sub-text)]">{allReactions.length}</span></button>
                      {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([emoji, count]) => (
                        <button key={emoji} onClick={() => setReactionModalEmojiTab(emoji)} className={`flex items-center justify-between px-2 py-2.5 transition-colors cursor-pointer ${reactionModalEmojiTab === emoji ? 'bg-[var(--card-bg)] text-[var(--primary)] border-r-2 border-[var(--primary)]' : 'text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5'}`}><span className="text-[17px] leading-none">{emoji}</span><span className="text-[12px] text-[var(--sub-text)]">{count}</span></button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="flex-1 overflow-y-auto bg-[var(--card-bg)] p-1.5 custom-scrollbar">
                {(() => {
                  const targetMsg = messages.find(m => m.id === String(reactionModalMessageId));
                  let filtered = targetMsg?.reactions || [];
                  if (reactionModalEmojiTab !== 'all') {
                    filtered = filtered.filter((reaction: any) => reaction.emoji === reactionModalEmojiTab);
                  }
                  const userMap: Record<string, any> = {};
                  filtered.forEach((reaction: any) => {
                    if (!userMap[reaction.userId]) {
                      userMap[reaction.userId] = { userId: reaction.userId, name: reaction.userName, avatar: reaction.userAvatar, emojis: [], total: 0 };
                    }
                    userMap[reaction.userId].emojis.push(reaction.emoji);
                    userMap[reaction.userId].total += 1;
                  });
                  return Object.values(userMap).map((user: any, idx) => (
                    <div key={`user-react-${idx}`} className="flex items-center justify-between px-3 py-2.5 hover:bg-[var(--hover-bg)] rounded-md transition-colors mb-0.5 group/user">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-[42px] h-[42px] rounded-full overflow-hidden border border-[var(--border)]"><img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}`} alt="Avatar" className="w-full h-full object-cover" /></div>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-medium text-[14px] text-[var(--text)] truncate group-hover/user:text-[var(--primary)]">{user.name}</span>
                          <div className="flex items-center gap-1">{Array.from(new Set(user.emojis)).map((emoji: any, emojiIdx) => <span key={`u-emoji-${emojiIdx}`} className="text-[14px]">{emoji}</span>)}<span className="text-[12px] text-[var(--sub-text)] ml-1">{user.total}</span></div>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
