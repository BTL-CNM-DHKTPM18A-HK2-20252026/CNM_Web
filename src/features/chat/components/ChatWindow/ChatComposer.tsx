import React from 'react';
import {
  FilePickerIcon,
  ImagePickerIcon,
  StickerIcon,
  VideoPickerIcon,
  VoiceIcon,
  MoreHorizontalIcon,
  PollIcon,
  ReminderIcon,
  NoteIcon,
  ImportantIcon,
  UrgentIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeIcon,
  FontSizeIcon,
  TextColorIcon,
  EraserIcon,
  ListIcon,
  NumberListIcon,
  IndentIcon,
  OutdentIcon,
  UndoIcon,
  RedoIcon,
  FullscreenIcon,
} from '@/components/ui/Icons';
import { StickerPicker } from '@/features/chat/components/StickerPicker';
import { ChatImageUpload } from '@/features/chat/components/ChatImageUpload';
import { ChatInput } from '@/features/chat';
import { MentionDropdown } from '@/features/chat/components/MentionDropdown';
import { CreatePollModal } from './CreatePollModal';
import { CreateReminderModal } from './CreateReminderModal';
import { CreateNoteModal } from './CreateNoteModal';
import type { ChatComposerProps } from '@/features/chat/components/ChatWindow/types';

const SMART_REPLY_TOGGLE_STORAGE_KEY = 'cnm_web_smart_reply_enabled';

export function ChatComposer({ vm }: ChatComposerProps) {
  const {
    t,
    selectedChat,
    isSendingAi,
    replyingTo,
    setReplyingTo,
    isRecording,
    recordingTime,
    isInitializingMic,
    stopRecording,
    startRecording,
    isPickerOpen,
    pickerTab,
    togglePicker,
    handleImageClick,
    isChatImageUploadOpen,
    setIsShareContactOpen,
    isMoreActionsOpen,
    setIsMoreActionsOpen,
    isPollModalOpen,
    setIsPollModalOpen,
    isReminderModalOpen,
    setIsReminderModalOpen,
    isNoteModalOpen,
    setIsNoteModalOpen,
    priority,
    setPriority,
    isFormattingActive,
    setIsFormattingActive,
    imageInputRef,
    handleImageChange,
    videoInputRef,
    handleVideoChange,
    isFilePopoverOpen,
    handleFileIconClick,
    handleVideoClick,
    handleFileClick,
    fileInputRef,
    handleFileChange,
    onSelectSticker,
    imageQueue,
    closeImageQueue,
    setCaptionDraft,
    setCaptionModalIdx,
    messageInputRef,
    message,
    sendTypingIndicator,
    handlePaste,
    handleSendImageQueue,
    handleSendMessage,
    setIsChatImageUploadOpen,
    // Link Preview
    pendingLinkPreview,
    linkPreviewDismissed,
    setLinkPreviewDismissed,
    // @Mention
    mentionQuery,
    mentionDropdownOpen,
    setMentionDropdownOpen,
    conversationMembers,
    handleMentionInput,
    handleSelectMention,
    // Smart Reply
    smartReplies,
    smartRepliesLoading,
    dismissSmartReplies,
    editor,
    setEditor,
  } = vm;

  const [isSmartReplyEnabled, setIsSmartReplyEnabled] = React.useState(false);

  React.useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(SMART_REPLY_TOGGLE_STORAGE_KEY);
      if (storedValue === '0') {
        setIsSmartReplyEnabled(false);
      }
    } catch {
      // Ignore storage errors and keep default enabled state.
    }
  }, []);

  const handleToggleSmartReply = React.useCallback(() => {
    setIsSmartReplyEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SMART_REPLY_TOGGLE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Ignore storage errors.
      }
      return next;
    });
  }, []);

  return (
    <>
      {replyingTo && (
        <div className="bg-[var(--card-bg)] border-t border-[var(--border)] px-4 py-2 flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="w-1 h-10 rounded-full bg-[#0068FF] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-[#0068FF]">{t('chat.reply.replying_to')} {replyingTo.sender === 'Me' ? t('common.you') : replyingTo.sender}</div>
            <div className="text-[13px] text-[var(--sub-text)] truncate">
              {replyingTo.type === 'IMAGE' ? `📷 ${t('chat.snippet.image')}` : replyingTo.type === 'VIDEO' ? `🎬 ${t('chat.snippet.video')}` : replyingTo.type === 'VOICE' ? `🎤 ${t('chat.snippet.voice')}` : replyingTo.type === 'MEDIA' ? `📎 ${t('chat.snippet.file')}` : replyingTo.type === 'SHARE_CONTACT' ? (() => { try { const c = JSON.parse(replyingTo.text || '{}'); return `📇 ${c.fullName || t('share_contact.snippet')}`; } catch { return `📇 ${t('share_contact.snippet')}`; } })() : replyingTo.text?.length > 60 ? `${replyingTo.text.slice(0, 60)}...` : replyingTo.text}
            </div>
          </div>
          <button onClick={() => setReplyingTo(null)} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)] text-[var(--sub-text)] transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      {pendingLinkPreview && !linkPreviewDismissed && (
        <div className="bg-[var(--card-bg)] border-t border-[var(--border)] px-4 py-2.5 flex items-start gap-3">
          {pendingLinkPreview.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pendingLinkPreview.thumbnail}
              alt=""
              className="w-14 h-14 object-cover rounded-lg shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            {pendingLinkPreview.title && (
              <div className="text-[13px] font-semibold text-[var(--text)] truncate">{pendingLinkPreview.title}</div>
            )}
            {pendingLinkPreview.description && (
              <div className="text-[11px] text-[var(--sub-text)] line-clamp-2 mt-0.5">{pendingLinkPreview.description}</div>
            )}
            <div className="text-[11px] text-[#0068FF] truncate mt-0.5">{pendingLinkPreview.url}</div>
          </div>
          <button
            onClick={() => setLinkPreviewDismissed(true)}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)] text-[var(--sub-text)] hover:text-red-500 transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      {/* Smart Reply Suggestions */}
      {isSmartReplyEnabled && smartReplies.length > 0 && !message.trim() && (
        <div className="bg-[var(--card-bg)] border-t border-[var(--border)] px-4 py-2 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
            {smartReplies.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => { handleSendMessage(reply); dismissSmartReplies(); }}
                className="shrink-0 px-3 py-1.5 rounded-full border border-[#0068FF]/30 bg-[#0068FF]/5 text-[#0068FF] text-[13px] font-medium hover:bg-[#0068FF]/15 hover:border-[#0068FF]/50 transition-all cursor-pointer whitespace-nowrap"
              >
                {reply}
              </button>
            ))}
          </div>
          <button
            onClick={dismissSmartReplies}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)] text-[var(--sub-text)] transition-colors cursor-pointer"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}
      {isSmartReplyEnabled && smartRepliesLoading && !message.trim() && smartReplies.length === 0 && (
        <div className="bg-[var(--card-bg)] border-t border-[var(--border)] px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] text-[var(--sub-text)]">Đang tạo gợi ý...</span>
        </div>
      )}

      <div className="bg-[var(--card-bg)] border-t border-[var(--border)] flex-shrink-0 transition-colors duration-200">
        <div className="flex items-center px-4 py-1.5 gap-1.5 border-b border-[var(--border)] relative h-[46px]">
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-lg border border-red-100 dark:border-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <div className="flex flex-col leading-none">
                  <span className="text-[13px] font-bold font-mono">
                    {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] opacity-70 font-medium mt-0.5">{t('chat.voice.recording')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => stopRecording(true)}
                  className="text-[13px] font-bold text-[var(--sub-text)] hover:text-red-500 px-3 py-2 cursor-pointer transition-colors"
                >
                  {t('chat.recording_cancel')}
                </button>
                <button
                  onClick={() => stopRecording(false)}
                  className="h-8 px-4 flex items-center gap-2 rounded-md bg-red-500 text-white animate-pulse cursor-pointer shadow-lg shadow-red-500/20"
                >
                  <VoiceIcon size={18} />
                  <span className="text-[13px] font-bold">{t('chat.recording_send')}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => togglePicker('sticker')} className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${isPickerOpen && pickerTab === 'sticker' ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}><StickerIcon size={20} /></button>

              <button
                onClick={handleImageClick}
                className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${isChatImageUploadOpen ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}
              >
                <ImagePickerIcon size={20} />
              </button>

              <button onClick={() => setIsShareContactOpen(true)} title={t('share_contact.toolbar_tooltip')} className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] cursor-pointer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4" /><path d="M4 20c0-2.5 1.8-4 4-4" /><line x1="15" y1="8" x2="21" y2="8" /><line x1="15" y1="12" x2="21" y2="12" /></svg></button>

              <button
                onClick={() => setIsFormattingActive(!isFormattingActive)}
                className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${isFormattingActive ? 'bg-[#E1EDFF] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}
                title="Định dạng tin nhắn"
              >
                <TextColorIcon size={20} />
              </button>

              <input type="file" ref={imageInputRef} onChange={handleImageChange} accept="image/*" multiple className="hidden" />
              <input type="file" ref={videoInputRef} onChange={handleVideoChange} accept="video/*" className="hidden" />

              <div className="relative">
                <button onClick={handleFileIconClick} className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${isFilePopoverOpen ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}><FilePickerIcon size={20} /></button>
                {isFilePopoverOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => vm.setIsFilePopoverOpen(false)} />
                    <div className="absolute bottom-[calc(100%+14px)] left-[-10px] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-0 overflow-hidden min-w-[140px]">
                      <button onClick={handleVideoClick} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--hover-bg)] w-full text-left text-[var(--text)] text-[14px] font-medium cursor-pointer"><VideoPickerIcon size={18} />{t('chat.choose_video')}</button>
                      <button onClick={handleFileClick} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--hover-bg)] w-full text-left text-[var(--text)] text-[14px] font-medium cursor-pointer"><FilePickerIcon size={18} />{t('chat.choose_file')}</button>
                      <div className="absolute top-[calc(100%-1px)] left-4 w-4 h-4 overflow-hidden"><div className="w-2.5 h-2.5 bg-[var(--card-bg)] border-b border-r border-[var(--border)] rotate-45 -translate-y-1.5 mx-auto" /></div>
                    </div>
                  </>
                )}
              </div>

              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (isRecording) stopRecording();
                  else startRecording();
                }}
                disabled={isInitializingMic}
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-all cursor-pointer ${isInitializingMic ? 'opacity-50 cursor-not-allowed' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}
              >
                {isInitializingMic ? (
                  <div className="w-4 h-4 border-2 border-[var(--text)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <VoiceIcon size={20} />
                )}
              </button>

              <button
                onClick={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
                className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-all ${isMoreActionsOpen ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}
                title="Thêm"
              >
                <MoreHorizontalIcon size={20} />
              </button>

              {isMoreActionsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMoreActionsOpen(false)} />
                  <div className="absolute bottom-[calc(100%+14px)] left-[120px] bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-2xl z-50 p-1 overflow-hidden min-w-[240px] animate-in slide-in-from-bottom-2 zoom-in-95 duration-200">
                    <div className="flex flex-col">
                      <button
                        onClick={() => {
                          setIsMoreActionsOpen(false);
                          setIsPollModalOpen(true);
                        }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-bg)] w-full text-left text-[var(--text)] transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                          <PollIcon size={18} />
                        </div>
                        <span className="text-[14px] font-medium">Tạo bình chọn</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsMoreActionsOpen(false);
                          setIsReminderModalOpen(true);
                        }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-bg)] w-full text-left text-[var(--text)] transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                          <ReminderIcon size={18} />
                        </div>
                        <span className="text-[14px] font-medium">Nhắc hẹn</span>
                      </button>

                      <button
                        onClick={() => { setIsNoteModalOpen(true); setIsMoreActionsOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-bg)] w-full text-left text-[var(--text)] transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                          <NoteIcon size={18} />
                        </div>
                        <span className="text-[14px] font-medium">Tạo ghi chú</span>
                      </button>

                      <div className="h-[1px] bg-[var(--border)] my-1 mx-2 opacity-50" />

                      <button
                        onClick={() => { setPriority('important'); setIsMoreActionsOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-bg)] w-full text-left text-[var(--text)] transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                          <ImportantIcon size={18} />
                        </div>
                        <span className="text-[14px] font-medium">Đánh dấu tin quan trọng</span>
                      </button>

                      <button
                        onClick={() => { setPriority('urgent'); setIsMoreActionsOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-bg)] w-full text-left text-[var(--text)] transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-full bg-yellow-50 dark:bg-yellow-500/10 flex items-center justify-center text-yellow-600 group-hover:scale-110 transition-transform">
                          <UrgentIcon size={18} />
                        </div>
                        <span className="text-[14px] font-medium">Đánh dấu tin khẩn cấp</span>
                      </button>
                    </div>
                    <div className="absolute top-[calc(100%-1px)] left-8 w-4 h-4 overflow-hidden">
                      <div className="w-2.5 h-2.5 bg-[var(--card-bg)] border-b border-r border-[var(--border)] rotate-45 -translate-y-1.5 mx-auto" />
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={handleToggleSmartReply}
                className="ml-auto inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium text-[var(--sub-text)] hover:text-[#0068FF] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer whitespace-nowrap"
                title={isSmartReplyEnabled ? 'Tắt gợi ý tin nhắn' : 'Bật gợi ý tin nhắn'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {isSmartReplyEnabled ? (
                    <>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a21.76 21.76 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a21.74 21.74 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  )}
                </svg>
                <span>Bật/tắt gợi ý tin nhắn</span>
              </button>

            </>
          )}

          <StickerPicker isOpen={isPickerOpen} onClose={() => vm.setIsPickerOpen(false)} onSelect={onSelectSticker} activeTab={pickerTab} />
        </div>

        {isChatImageUploadOpen && (
          <div className="border-t border-[var(--border)] px-4 py-3">
            <ChatImageUpload
              className="max-w-[360px]"
              onUploadDone={async (optimisticMsg, metadata) => {
                try {
                  await handleSendMessage(
                    metadata.s3Url,
                    'IMAGE',
                    metadata.originalName,
                    optimisticMsg.fileSize,
                    undefined,
                    undefined,
                    undefined,
                    metadata.width,
                    metadata.height
                  );
                  setIsChatImageUploadOpen(false);
                } catch {
                  // handleSendMessage already handles notifications.
                }
              }}
            />
          </div>
        )}

        {imageQueue.length > 0 && (
          <div className="px-4 pt-3 pb-1 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-[var(--sub-text)]">{imageQueue.length} ảnh</span>
              <button
                onClick={closeImageQueue}
                className="text-[13px] text-[var(--sub-text)] hover:text-red-500 transition-colors cursor-pointer"
              >
                Xoá tất cả
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {imageQueue.map((item, idx) => (
                <div key={`image-${idx}`} className="relative group shrink-0">
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="w-[72px] h-[72px] object-cover rounded-lg border border-[var(--border)] shadow-sm"
                  />
                  {item.caption?.trim() && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 rounded-b-lg px-1 py-0.5">
                      <span className="text-[10px] text-white truncate block">{item.caption}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-lg bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaptionDraft(item.caption);
                        setCaptionModalIdx(idx);
                      }}
                      className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow"
                      title="Thêm mô tả"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.previewUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(item.previewUrl);
                        }
                        vm.setImageQueue((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors cursor-pointer shadow"
                      title="Xoá ảnh"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                </div>
              ))}

              <label className="w-[72px] h-[72px] rounded-lg border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[var(--sub-text)] hover:border-[#0068FF] hover:text-[#0068FF] transition-colors cursor-pointer shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    if (!files.length) return;
                    const newEntries = files.map(file => ({ file, previewUrl: URL.createObjectURL(file), caption: '' }));
                    vm.setImageQueue(prev => [...prev, ...newEntries]);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {priority !== 'normal' && (
          <div className="px-4 py-2 border-t border-[var(--border)] flex items-center bg-white dark:bg-transparent">
            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#F1F2F4] dark:bg-black/20 text-[13px] font-semibold ${priority === 'important' ? 'text-red-600' : 'text-yellow-600'
              }`}>
              <span className="w-4 h-4 flex items-center justify-center">
                {priority === 'important' ? '!' : '⚡'}
              </span>
              <span>{priority === 'important' ? 'Quan trọng' : 'Khẩn cấp'}</span>
              <button
                onClick={() => setPriority('normal')}
                className="ml-1 p-0.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          {mentionDropdownOpen && conversationMembers.length > 0 && (
            <MentionDropdown
              members={conversationMembers}
              query={mentionQuery}
              onSelect={handleSelectMention}
            />
          )}
          <ChatInput
            onEditorReady={setEditor}
            value={message}
            placeholder={isFormattingActive
              ? "Nhấn Ctrl + Shift + X để định dạng tin nhắn"
              : selectedChat.isAi
                ? t('chat.input_placeholder_ai')
                : t('chat.input_placeholder', { name: selectedChat.name })
            }
            onChange={(value) => {
              handleMentionInput(value);
              sendTypingIndicator();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                if (mentionDropdownOpen) { setMentionDropdownOpen(false); return; }
                if (replyingTo) setReplyingTo(null);
              }
              if (event.key === 'Enter' && !event.shiftKey && !(selectedChat.isAi && isSendingAi)) {
                event.preventDefault();
                if (mentionDropdownOpen) { setMentionDropdownOpen(false); return; }
                if (imageQueue.length > 0) {
                  handleSendImageQueue();
                } else {
                  handleSendMessage();
                }
              }
            }}
            onPaste={handlePaste}
            placeholder={selectedChat.isAi && isSendingAi
              ? (t('chat.ai_thinking') || 'AI đang suy nghĩ...')
              : (selectedChat.isAi ? t('chat.ai_input_placeholder') : t('chat.input_placeholder'))}
            disabled={selectedChat.isAi && isSendingAi}
            isEmojiOpen={isPickerOpen && pickerTab === 'emoji'}
            showSendButton={Boolean(message.trim() || imageQueue.length > 0)}
            onToggleEmoji={() => togglePicker('emoji')}
            onSend={() => {
              if (imageQueue.length > 0) {
                handleSendImageQueue();
              } else {
                handleSendMessage();
              }
            }}
            onSendLike={() => handleSendMessage('👍')}
          />
        </div>

        {isFormattingActive && editor && (
          <div className="flex items-center px-4 py-1.5 gap-0.5 border-t border-[var(--border)] animate-in slide-in-from-bottom-1 duration-200 overflow-x-auto no-scrollbar">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors cursor-pointer ${editor.isActive('bold') ? 'bg-[#E1EDFF] text-[#0068FF]' : 'hover:bg-[var(--hover-bg)] text-[var(--text)]'}`}
            >
              <BoldIcon size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors cursor-pointer ${editor.isActive('italic') ? 'bg-[#E1EDFF] text-[#0068FF]' : 'hover:bg-[var(--hover-bg)] text-[var(--text)]'}`}
            >
              <ItalicIcon size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors cursor-pointer ${editor.isActive('underline') ? 'bg-[#E1EDFF] text-[#0068FF]' : 'hover:bg-[var(--hover-bg)] text-[var(--text)]'}`}
            >
              <UnderlineIcon size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors cursor-pointer ${editor.isActive('strike') ? 'bg-[#E1EDFF] text-[#0068FF]' : 'hover:bg-[var(--hover-bg)] text-[var(--text)]'}`}
            >
              <StrikeIcon size={18} />
            </button>
            <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />
            <button
              onClick={() => { }} // Font size placeholder
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--hover-bg)] text-[var(--text)] transition-colors cursor-pointer"
            >
              <FontSizeIcon size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().setColor('#ef4444').run()} // Default red for demo
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--hover-bg)] text-[var(--text)] transition-colors cursor-pointer"
            >
              <TextColorIcon size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().unsetAllMarks().run()}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--hover-bg)] text-[var(--text)] transition-colors cursor-pointer"
            >
              <EraserIcon size={18} />
            </button>
            <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors cursor-pointer ${editor.isActive('bulletList') ? 'bg-[#E1EDFF] text-[#0068FF]' : 'hover:bg-[var(--hover-bg)] text-[var(--text)]'}`}
            >
              <ListIcon size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors cursor-pointer ${editor.isActive('orderedList') ? 'bg-[#E1EDFF] text-[#0068FF]' : 'hover:bg-[var(--hover-bg)] text-[var(--text)]'}`}
            >
              <NumberListIcon size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().lift('listItem').run()}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--hover-bg)] text-[var(--text)] transition-colors cursor-pointer"
            >
              <OutdentIcon size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().sink('listItem').run()}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--hover-bg)] text-[var(--text)] transition-colors cursor-pointer"
            >
              <IndentIcon size={18} />
            </button>
            <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />
            <button
              onClick={() => editor.chain().focus().undo().run()}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--hover-bg)] text-[var(--text)] transition-colors cursor-pointer"
            >
              <UndoIcon size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--hover-bg)] text-[var(--text)] transition-colors cursor-pointer"
            >
              <RedoIcon size={18} />
            </button>
            <div className="w-[1px] h-4 bg-[var(--border)] mx-1" />
            <button
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--hover-bg)] text-[var(--text)] transition-colors cursor-pointer ml-auto"
            >
              <FullscreenIcon size={18} />
            </button>
          </div>
        )}
      </div>

      <CreatePollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onSubmit={(data) => {
          console.log('Poll created:', data);
          setIsPollModalOpen(false);
          toast.success('Đã tạo bình chọn!');
          // Future: Implement actual message sending with POLL type
        }}
      />
      <CreateReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSubmit={(data) => {
          console.log('Reminder created:', data);
          setIsReminderModalOpen(false);
          toast.success('Đã tạo nhắc hẹn!');
        }}
      />
      <CreateNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSubmit={(data) => {
          console.log('Note Created:', data);
          setIsNoteModalOpen(false);
          toast.success('Đã tạo ghi chú mới');
        }}
      />
    </>
  );
}
