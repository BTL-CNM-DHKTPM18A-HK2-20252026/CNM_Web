import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { FruviaChatbotAvatar } from '@/components/ui/FruviaChatbotAvatar';
import { ChevronDownIcon, ChevronRightIcon, MessageBubbleIcon, MoreHorizontalIcon, SparklesIcon } from '@/components/ui/Icons';
import { AI_TYPING_USER_ID } from '@/features/chat/components/ChatWindow/types';
import type { ChatMessage, ChatMessageListProps } from '@/features/chat/components/ChatWindow/types';
import { usePresence } from '@/features/user';
import { apiClient } from '@/lib/http/apiClient';
import emojiPack from '@/data/emoji-pack.json';
import { getMessageHtml, getPlainTextFromMessage } from '@/utils/tiptapRenderer';

// Initialize emoji lookup map
const emojiMap: Record<string, string> = {};
const _emojiS3Base = process.env.NEXT_PUBLIC_S3_BASE_URL ?? '';
emojiPack.categories.forEach((cat: any) => {
  cat.icons.forEach((icon: any) => {
    emojiMap[icon.shortcode] = `${_emojiS3Base}${icon.src.replace('/fruvia_emoji', '')}`;
  });
});

const zaloEmojiRegex = /(:zalo_\d+_\d+:)/g;

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ── Call History Message ────────────────────────────────────────────────────
function formatCallDuration(seconds: number, t: (key: string, opts?: Record<string, string | number>) => string): string {
  if (seconds < 60) return t('chat.call.seconds_only', { count: seconds });
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return t('chat.call.minutes_only', { count: m });
  return t('chat.call.minutes_seconds', { minutes: m, seconds: s });
}

function CallHistoryMessage({
  msg,
  currentUserId,
  t,
  onVideoCall,
}: {
  msg: ChatMessage;
  currentUserId?: string;
  t: (key: string, opts?: Record<string, string | number>) => string;
  onVideoCall?: () => void;
}) {
  const isCaller = String(msg.senderId ?? '') === String(currentUserId ?? '') || msg.sender === 'Me';
  const isEnded = msg.type === 'CALL_ENDED';
  const cardTitle = isEnded
    ? (isCaller ? t('chat.call.outgoing_video_call') : t('chat.call.incoming_video_call'))
    : (isCaller ? t('chat.call.recipient_busy') : t('chat.call.missed'));

  const detailText = isEnded
    ? formatCallDuration(Number.isNaN(Number(msg.text)) ? 0 : Number(msg.text), t)
    : t('chat.call.video_call');

  const statusColor = isEnded ? 'text-emerald-500' : 'text-red-400';

  return (
    <div className="flex flex-col gap-0.5 min-w-[140px] max-w-[170px]">
      <h4 className="text-[13px] font-bold leading-tight text-[#1f2f46] dark:text-white">{cardTitle}</h4>

      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#586b82] dark:text-[#8ea3b8]">
        <span className="relative flex h-[18px] w-[18px] items-center justify-center">
          <svg width="18" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="text-[#6b7d90] dark:text-[#8ea3b8]">
            <rect x="2.5" y="7" width="12" height="10" rx="2" />
            <path d="M15 10.5 21 7v10l-6-3.5" />
          </svg>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`absolute -top-1 -right-1 ${statusColor}`}>
            {isCaller
              ? <><path d="M7 17L17 7" /><path d="M9 7h8v8" /></>
              : <><path d="M17 7L7 17" /><path d="M15 17H7V9" /></>
            }
          </svg>
        </span>
        <span className="font-medium">{detailText}</span>
      </div>

      <div className="mx-auto my-1.5 h-px w-[78%] border-t-2 border-dashed border-[#c2cfdf] dark:border-white/20" />

      <button
        type="button"
        onClick={onVideoCall}
        className="w-full cursor-pointer text-center text-[13px] font-semibold text-[#0068FF] transition-colors hover:text-[#0052cc]"
      >
        {t('chat.call.redial')}
      </button>
    </div>
  );
}

function GroupCallCard({
  msg,
  currentUserId,
  selectedChat,
  t,
}: {
  msg: ChatMessage;
  currentUserId?: string;
  selectedChat: ChatMessageListProps['vm']['selectedChat'];
  t: (key: string) => string;
}) {
  const isMe = msg.senderId === currentUserId || msg.sender === 'Me';
  const senderName = isMe ? 'Bạn' : (msg.senderName || msg.sender || 'Thành viên');

  return (
    <div className={`flex items-end gap-2 my-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-[#DBDFE6] dark:border-white/10 shadow-sm flex items-center justify-center bg-blue-50">
          {msg.avatar ? (
            <img src={msg.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-blue-600 font-bold text-sm">{(msg.senderName || selectedChat.name)?.charAt(0) || '?'}</span>
          )}
        </div>
      )}
      <div className="w-[260px] rounded-2xl border border-[#c5d5e7] bg-white dark:bg-[#1E1E1E] overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-[#0068FF] to-[#0095FF] p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 10V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3l4 3V7l-4 3Z" />
                <path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M14 13a3 3 0 0 0-4 0" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-bold">Cuộc gọi video nhóm</div>
              <div className="text-[12px] opacity-90">{senderName} đã bắt đầu</div>
            </div>
          </div>
        </div>
        <div className="p-2.5 bg-white dark:bg-[#1E1E1E]">
          <button
            onClick={() => toast.info('Tham gia cuộc gọi nhóm đang được kết nối...')}
            className="w-full py-2 bg-[#0068FF] hover:bg-[#0052CC] text-white text-[14px] font-bold rounded-lg transition-colors cursor-pointer"
          >
            Tham gia
          </button>
        </div>
      </div>
    </div>
  );
}

const parseDate = (dateStr: any) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  let s = String(dateStr);
  if (!s.endsWith('Z') && !s.includes('+') && !s.includes('-') && s.includes('T')) {
    s = s + 'Z';
  } else if (!s.endsWith('Z') && !s.includes('+') && !s.includes('-') && s.includes(' ')) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(dateStr) : d;
};

interface AddedOption {
  tempId: string;
  text: string;
  isSelected: boolean;
}

function PollModal({
  isOpen,
  onClose,
  poll,
  msg,
  currentUserId,
  selectedChat,
  t,
  submitVote,
  isSubmittingVote,
  getVoterInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  poll: any;
  msg: ChatMessage;
  currentUserId?: string;
  selectedChat: any;
  t: any;
  submitVote: (optionIds: string[]) => Promise<void>;
  isSubmittingVote: boolean;
  getVoterInfo: (voterId: string) => { displayName: string; avatarUrl: string | null };
}) {
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);
  const [addedOptions, setAddedOptions] = useState<AddedOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVotersList, setShowVotersList] = useState(false);

  const userVotes = poll?.options
    ?.filter((opt: any) => opt.voterIds?.includes(currentUserId))
    .map((opt: any) => opt.optionId) || [];

  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds(userVotes);
      setAddedOptions([]);
    }
  }, [isOpen, poll, currentUserId]);

  if (!isOpen) return null;

  const handleOptionClick = (optionId: string) => {
    if (poll.deadline && new Date(poll.deadline).getTime() < Date.now()) {
      toast.error('Bình chọn này đã kết thúc!');
      return;
    }

    if (poll.multipleChoices) {
      setLocalSelectedIds(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      );
    } else {
      setLocalSelectedIds([optionId]);
      setAddedOptions(prev => prev.map(item => ({ ...item, isSelected: false })));
    }
  };

  const handleAddNewOptionField = () => {
    const tempId = Math.random().toString();
    setAddedOptions(prev => [
      ...prev,
      {
        tempId,
        text: '',
        isSelected: false
      }
    ]);
  };

  const handleAddedOptionTextChange = (tempId: string, text: string) => {
    setAddedOptions(prev => prev.map(item => 
      item.tempId === tempId ? { ...item, text } : item
    ));
  };

  const handleRemoveAddedOption = (tempId: string) => {
    setAddedOptions(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleAddedOptionToggle = (tempId: string) => {
    if (poll.deadline && new Date(poll.deadline).getTime() < Date.now()) {
      toast.error('Bình chọn này đã kết thúc!');
      return;
    }
    setAddedOptions(prev => {
      if (poll.multipleChoices) {
        return prev.map(item => 
          item.tempId === tempId ? { ...item, isSelected: !item.isSelected } : item
        );
      } else {
        setLocalSelectedIds([]);
        return prev.map(item => ({
          ...item,
          isSelected: item.tempId === tempId
        }));
      }
    });
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const nonNewOptions = addedOptions.filter(opt => opt.text.trim());
      const newlyCreatedOptionIds: string[] = [];
      
      for (const opt of nonNewOptions) {
        const text = opt.text.trim();
        const updatedPoll = await apiClient.post<any>(`/polls/${poll.pollId}/options`, { content: text });
        const newOpt = updatedPoll.options?.find((o: any) => o.content === text);
        if (newOpt && opt.isSelected) {
          newlyCreatedOptionIds.push(newOpt.optionId);
        }
      }
      
      const finalOptionIds = [...localSelectedIds, ...newlyCreatedOptionIds];
      await submitVote(finalOptionIds);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thực hiện bình chọn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const creatorName = msg.senderName || (msg.sender === 'Me' ? 'Tôi' : '') || getVoterInfo(msg.senderId || '').displayName || 'Thành viên';
  
  const getPollTimeText = () => {
    if (!msg.rawDate) return 'Hôm nay';
    const date = parseDate(msg.rawDate);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    if (isToday) return `${timeStr} Hôm nay`;
    if (isYesterday) return `${timeStr} Hôm qua`;

    // Format as HH:mm DD/MM/YYYY
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${timeStr} ${d}/${m}/${y}`;
  };

  const uniqueVoters = new Set<string>();
  poll.options?.forEach((opt: any) => {
    opt.voterIds?.forEach((v: string) => uniqueVoters.add(v));
  });
  const totalUniqueVoters = uniqueVoters.size;
  const totalVotesCast = poll.options?.reduce((sum: number, opt: any) => sum + (opt.voterIds?.length || 0), 0) || 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00000073] backdrop-blur-[1px] p-4 select-none">
      <div 
        className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl border border-gray-100 dark:border-[#303030] w-[440px] max-w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#303030]">
          <span className="text-[17px] font-bold text-gray-900 dark:text-white">Bình chọn</span>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[55vh] custom-scrollbar">
          {/* Question & Creator */}
          <div>
            <h2 className="text-[18px] font-bold text-gray-900 dark:text-white leading-tight break-words">{poll.question}</h2>
            <p className="text-[13px] text-[#586b82] dark:text-[#8ea3b8] mt-1.5">
              Tạo bởi {creatorName} - {getPollTimeText()}
            </p>
          </div>

          {/* Properties */}
          <div className="flex items-center gap-2 text-[14px] text-gray-600 dark:text-gray-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>{poll.multipleChoices ? 'Chọn nhiều phương án' : 'Chọn một phương án'}</span>
          </div>

          <hr className="border-gray-100 dark:border-[#303030]" />

          {/* Statistics */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowVotersList(!showVotersList)}
              className="text-[13.5px] font-semibold text-[#0068FF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{totalUniqueVoters} người bình chọn, {totalVotesCast} lượt bình chọn</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`mt-0.5 transition-transform ${showVotersList ? 'rotate-90' : ''}`}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Voter details list if open */}
          {showVotersList && totalUniqueVoters > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-black/15 rounded-lg space-y-2 border border-gray-100 dark:border-[#2a2a2a] max-h-[150px] overflow-y-auto custom-scrollbar">
              {Array.from(uniqueVoters).map(vId => {
                const info = getVoterInfo(vId);
                return (
                  <div key={vId} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0 border border-white dark:border-[#303030]">
                      {info.avatarUrl ? (
                        <img src={info.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-blue-600">{info.displayName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">{info.displayName}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            {poll.options?.map((opt: any) => {
              const isSelected = localSelectedIds.includes(opt.optionId);
              const optVotes = opt.voterIds?.length || 0;
              const percent = totalUniqueVoters > 0 ? Math.round((optVotes / totalUniqueVoters) * 100) : 0;

              return (
                <div key={opt.optionId} className="flex items-center gap-3 w-full">
                  {/* Circle Check on the left */}
                  <div 
                    onClick={() => handleOptionClick(opt.optionId)}
                    className="shrink-0 cursor-pointer p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    {isSelected ? (
                      <div className="w-[20px] h-[20px] rounded-full bg-[#0068FF] text-white flex items-center justify-center shadow-sm">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-[20px] h-[20px] rounded-full border-2 border-gray-300 dark:border-gray-600 bg-transparent" />
                    )}
                  </div>

                  {/* Option box */}
                  <div 
                    onClick={() => handleOptionClick(opt.optionId)}
                    className={`flex-1 relative flex items-center justify-between p-3.5 rounded-lg border transition-all cursor-pointer overflow-hidden ${
                      isSelected 
                        ? 'bg-[#E1EDFF] border-transparent text-[#0068FF] dark:bg-[#0068FF]/15 dark:text-[#58a6ff]' 
                        : 'bg-[#F0F2F5] border-transparent text-[#081C36] dark:bg-[#2a2a2a] dark:text-white'
                    }`}
                  >
                    {/* Background Progress Bar */}
                    {percent > 0 && (
                      <div 
                        className={`absolute left-0 top-0 bottom-0 transition-all duration-500 rounded-l-lg ${
                          isSelected 
                            ? 'bg-[#D2E4FC] dark:bg-[#0068FF]/20' 
                            : 'bg-[#E2E5E8] dark:bg-[#3a3a3a]'
                        }`} 
                        style={{ width: `${percent}%`, zIndex: 0 }}
                      />
                    )}

                    <span className="relative z-10 text-[14.5px] font-semibold break-words leading-tight flex-1 pr-4">
                      {opt.content}
                    </span>

                    {/* Stacked voter avatars inside the option box */}
                    {opt.voterIds && opt.voterIds.length > 0 && (
                      <div className="relative z-10 flex -space-x-1.5 overflow-hidden shrink-0">
                        {opt.voterIds.slice(0, 3).map((vId: string) => {
                          const vInfo = getVoterInfo(vId);
                          return (
                            <div key={vId} className="w-[18px] h-[18px] rounded-full overflow-hidden border border-white dark:border-[#1E1E1E] bg-blue-50 flex items-center justify-center shrink-0" title={vInfo.displayName}>
                              {vInfo.avatarUrl ? (
                                <img src={vInfo.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[7px] font-bold text-blue-600">{vInfo.displayName.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                          );
                        })}
                        {opt.voterIds.length > 3 && (
                          <div className="w-[18px] h-[18px] rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-600 dark:text-gray-300 border border-white dark:border-[#1E1E1E] shrink-0">
                            +{opt.voterIds.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vote Count on the right */}
                  <span className="shrink-0 text-[14px] text-gray-600 dark:text-gray-400 font-bold min-w-[12px] text-right pr-1">
                    {optVotes}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Added Options (newly typed in the modal) */}
          {addedOptions.map((addedOpt) => (
            <div key={addedOpt.tempId} className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Circle/Checkbox on the left */}
              <div 
                onClick={() => handleAddedOptionToggle(addedOpt.tempId)}
                className="shrink-0 cursor-pointer p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                {addedOpt.isSelected ? (
                  <div className="w-[20px] h-[20px] rounded-full bg-[#0068FF] text-white flex items-center justify-center shadow-sm">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-[20px] h-[20px] rounded-full border border-gray-300 dark:border-gray-600 bg-transparent" />
                )}
              </div>

              {/* Input box */}
              <div className="flex-1 relative flex items-center bg-white dark:bg-[#1E1E1E] rounded-md border border-[#0068FF] shadow-sm transition-all focus-within:ring-1 focus-within:ring-[#0068FF]/50 pr-8">
                <input
                  type="text"
                  placeholder="Nhập phương án mới..."
                  value={addedOpt.text}
                  onChange={e => handleAddedOptionTextChange(addedOpt.tempId, e.target.value)}
                  className="flex-1 h-9 px-3 bg-transparent border-none outline-none text-[14.5px] text-gray-900 dark:text-white placeholder-gray-400 font-semibold"
                  autoFocus={addedOpt.text === ''}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAddedOption(addedOpt.tempId)}
                  className="absolute right-1.5 h-6 w-6 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              {/* Dummy spacing to align with existing options vote count */}
              <div className="w-[12px] shrink-0" />
            </div>
          ))}

          {/* Add Option button */}
          {poll.allowAddOptions && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddNewOptionField}
                className="flex items-center gap-1.5 text-[#0068FF] hover:text-[#005AE0] text-[14.5px] font-bold py-1 px-1 cursor-pointer transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Thêm lựa chọn
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-[#303030] bg-gray-50/50 dark:bg-black/10">
          {/* Settings gear on the left */}
          <button 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center"
            title="Cài đặt bình chọn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Action buttons on the right */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 h-10 rounded-md bg-[#E4E6EB] hover:bg-[#D8DADF] dark:bg-white/10 dark:hover:bg-white/15 text-[14.5px] font-bold text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || isSubmittingVote}
              className="px-5 h-10 rounded-md bg-[#A0C4FF] hover:bg-[#0068FF] text-white text-[14.5px] font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-75 flex items-center justify-center min-w-[90px]"
            >
              {isSubmitting || isSubmittingVote ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Xác nhận'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PollCard({
  msg,
  currentUserId,
  selectedChat,
  t,
}: {
  msg: ChatMessage;
  currentUserId?: string;
  selectedChat: any;
  t: any;
}) {
  const poll = msg.poll;
  const [newOptionText, setNewOptionText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ⚠️ ALL hooks must be before any early return (React rule of hooks)
  const userVotes = poll?.options
    ?.filter((opt: any) => opt.voterIds?.includes(currentUserId))
    .map((opt: any) => opt.optionId) || [];
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(userVotes);

  useEffect(() => {
    if (poll) setSelectedOptionIds(userVotes);
  }, [msg.poll, currentUserId]);

  if (!poll) {
    return (
      <div className="p-4 bg-white dark:bg-[#1E1E1E] rounded-xl border border-[var(--border)] shadow-sm flex items-center justify-center min-w-[280px]">
        <div className="w-5 h-5 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin mr-2" />
        <span className="text-[13px] text-[var(--sub-text)]">Đang tải bình chọn...</span>
      </div>
    );
  }

  // Calculate unique voters
  const uniqueVoters = new Set<string>();
  poll.options?.forEach((opt: any) => {
    opt.voterIds?.forEach((v: string) => uniqueVoters.add(v));
  });
  const totalUniqueVoters = uniqueVoters.size;
  const totalVotesCast = poll.options?.reduce((sum: number, opt: any) => sum + (opt.voterIds?.length || 0), 0) || 0;
  const hasVoted = uniqueVoters.has(currentUserId || '');
  const showResults = !poll.hideResultsBeforeVote || hasVoted;

  const [isEditingChoice, setIsEditingChoice] = useState(!hasVoted);

  useEffect(() => {
    setIsEditingChoice(!hasVoted);
  }, [hasVoted]);

  const handleEditClick = () => {
    setIsModalOpen(true);
  };

  const handleCancelEdit = () => {
    setSelectedOptionIds(userVotes);
    setIsEditingChoice(false);
  };

  const handleOptionClick = (optionId: string) => {
    if (poll.deadline && new Date(poll.deadline).getTime() < Date.now()) {
      toast.error('Bình chọn này đã kết thúc!');
      return;
    }

    if (hasVoted && !isEditingChoice) {
      setIsEditingChoice(true);
    }

    if (poll.multipleChoices) {
      setSelectedOptionIds(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      );
    } else {
      submitVote([optionId]);
    }
  };

  const submitVote = async (optionIds: string[]) => {
    setIsSubmittingVote(true);
    try {
      await apiClient.post(`/polls/${poll.pollId}/vote`, { optionIds });
      setIsEditingChoice(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể thực hiện bình chọn');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleAddOptionSubmit = async () => {
    if (!newOptionText.trim()) return;
    setIsAddingOption(true);
    try {
      await apiClient.post(`/polls/${poll.pollId}/options`, { content: newOptionText.trim() });
      setNewOptionText('');
      setIsAdding(false);
      toast.success('Thêm phương án thành công!');
    } catch (err: any) {
      const msg = err?.message || err?.response?.data?.message || 'Không thể thêm phương án';
      toast.error(msg);
    } finally {
      setIsAddingOption(false);
    }
  };

  const getVoterInfo = (voterId: string) => {
    const member = selectedChat?.members?.find((m: any) => (m.userId || m.user_id) === voterId);
    if (member) {
      return {
        displayName: member.displayName || member.display_name || member.name || voterId,
        avatarUrl: member.avatarUrl || member.avatar_url || member.avatar || null
      };
    }
    return {
      displayName: voterId === currentUserId ? 'Bạn' : 'Thành viên',
      avatarUrl: null
    };
  };

  const hasChanges =
    selectedOptionIds.length !== userVotes.length ||
    !selectedOptionIds.every(id => userVotes.includes(id));

  return (
    <div className="w-[320px] sm:w-[360px] rounded-xl border border-[#e4e6eb] bg-white dark:bg-[#1E1E1E] dark:border-[#303030] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 pb-2">
        <h3 className="text-[16px] font-bold text-[#081C36] dark:text-white leading-tight">{poll.question}</h3>
        <p className="text-[13px] text-[#586b82] dark:text-[#8ea3b8] mt-1.5">
          {poll.multipleChoices ? 'Chọn nhiều phương án' : 'Chọn một phương án'}
        </p>
        
        {/* Statistics link */}
        {showResults && (
          <div className="mt-2.5">
            <div 
              onClick={() => setIsModalOpen(true)}
              className="text-[13px] font-semibold text-[#0068FF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{totalUniqueVoters} người bình chọn</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline-block mt-0.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Body: Options */}
      <div className="px-4 py-2.5 space-y-3">
        {(() => {
          const opts = poll.options || [];

          return opts.map((opt: any, i: number) => {
            const optVotes = opt.voterIds?.length || 0;
            const percent = totalUniqueVoters > 0 ? Math.round((optVotes / totalUniqueVoters) * 100) : 0;
            const isSelected = isEditingChoice
              ? selectedOptionIds.includes(opt.optionId)
              : opt.voterIds?.includes(currentUserId);

            return (
              <div key={opt.optionId} className="flex items-center gap-3 w-full">
                {/* The main option box */}
                <div 
                  onClick={() => handleOptionClick(opt.optionId)}
                  className={`flex-1 relative flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer overflow-hidden ${
                    isSelected 
                      ? 'bg-[#E1EDFF] border-transparent text-[#0068FF] dark:bg-[#0068FF]/15 dark:text-[#58a6ff]' 
                      : 'bg-[#F0F2F5] border-transparent text-[#081C36] dark:bg-[#2a2a2a] dark:text-white'
                  }`}
                >
                  {/* Background Progress Bar */}
                  {!isEditingChoice && showResults && percent > 0 && (
                    <div 
                      className={`absolute left-0 top-0 bottom-0 transition-all duration-500 rounded-l-lg ${
                        isSelected 
                          ? 'bg-[#D2E4FC] dark:bg-[#0068FF]/20' 
                          : 'bg-[#E2E5E8] dark:bg-[#3a3a3a]'
                      }`} 
                      style={{ width: `${percent}%`, zIndex: 0 }}
                    />
                  )}

                  {/* Option content and checkmark */}
                  <span className="relative z-10 text-[14.5px] font-semibold break-words leading-tight flex-1 pr-4">
                    {opt.content}
                  </span>

                  {/* Checkmark circle or edit state checkbox */}
                  <div className="relative z-10 shrink-0 flex items-center gap-2">
                    {/* Voter Avatars */}
                    {!isEditingChoice && !poll.hideVoters && showResults && opt.voterIds && opt.voterIds.length > 0 && (
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {opt.voterIds.slice(0, 3).map((vId: string) => {
                          const vInfo = getVoterInfo(vId);
                          return (
                            <div key={vId} className="w-[18px] h-[18px] rounded-full overflow-hidden border border-white dark:border-[#1E1E1E] bg-blue-50 flex items-center justify-center shrink-0" title={vInfo.displayName}>
                              {vInfo.avatarUrl ? (
                                <img src={vInfo.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[7px] font-bold text-blue-600">{vInfo.displayName.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                          );
                        })}
                        {opt.voterIds.length > 3 && (
                          <div className="w-[18px] h-[18px] rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-600 dark:text-gray-300 border border-white dark:border-[#1E1E1E] shrink-0">
                            +{opt.voterIds.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Checkmark circle */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#0068FF] text-white flex items-center justify-center shrink-0 shadow-sm animate-in zoom-in-75 duration-150">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vote Count */}
                {!isEditingChoice && (
                  <span className="shrink-0 text-[14px] text-[#586b82] dark:text-[#8ea3b8] font-bold min-w-[12px] text-right">
                    {optVotes}
                  </span>
                )}
              </div>
            );
          });
        })()}
      </div>

      {/* Action Bar */}
      <div className="px-4 pb-4 pt-1">
        {isEditingChoice ? (
          poll.multipleChoices ? (
            hasVoted ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 h-10 rounded-lg border border-[#dcdfe6] dark:border-[#303030] text-[14px] font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => submitVote(selectedOptionIds)}
                  disabled={isSubmittingVote}
                  className="flex-1 h-10 rounded-lg bg-[#0068FF] hover:bg-[#0052cc] text-white text-[14px] font-bold shadow transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                >
                  {isSubmittingVote ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Xác nhận'
                  )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => submitVote(selectedOptionIds)}
                disabled={isSubmittingVote}
                className="w-full h-10 rounded-lg bg-[#0068FF] hover:bg-[#0052cc] text-white text-[14px] font-bold shadow transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
              >
                {isSubmittingVote ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Bình chọn'
                )}
              </button>
            )
          ) : (
            hasVoted && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full h-10 rounded-lg border border-[#dcdfe6] dark:border-[#303030] text-[14px] font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center"
              >
                Hủy
              </button>
            )
          )
        ) : (
          hasVoted && (
            <button
              type="button"
              onClick={handleEditClick}
              className="w-full h-10 rounded-lg border border-[#0068FF] bg-white hover:bg-blue-50/50 dark:bg-transparent dark:hover:bg-blue-500/10 text-[#0068FF] text-[14px] font-bold transition-all cursor-pointer flex items-center justify-center"
            >
              Đổi lựa chọn
            </button>
          )
        )}
      </div>

      {/* Footer Actions: Add Option */}
      {poll.allowAddOptions && isEditingChoice && (
        <div className="border-t border-[var(--border)] p-3 bg-gray-50/50 dark:bg-black/5">
          {isAdding ? (
            <div className="relative flex items-center gap-2 p-1 bg-white dark:bg-[#1E1E1E] rounded-md border border-[#0068FF] shadow-sm transition-all focus-within:ring-1 focus-within:ring-[#0068FF]/50">
              <input
                type="text"
                placeholder="Nhập phương án mới..."
                value={newOptionText}
                onChange={e => setNewOptionText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddOptionSubmit();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewOptionText('');
                  }
                }}
                className="flex-1 h-8 px-2.5 bg-transparent border-none outline-none text-[13.5px] text-[var(--text)] placeholder-gray-400"
                autoFocus
              />
              <button
                onClick={handleAddOptionSubmit}
                disabled={!newOptionText.trim() || isAddingOption}
                className="h-8 px-3 rounded-md bg-[#0068FF] hover:bg-[#0052CC] text-white text-[12.5px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {isAddingOption ? '...' : 'Thêm'}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewOptionText('');
                }}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 cursor-pointer shrink-0"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-1.5 text-[#0068FF] hover:text-[#005AE0] text-[13px] font-bold w-full py-1.5 rounded-lg border border-dashed border-[#0068FF]/30 hover:border-[#0068FF]/50 bg-blue-50/10 hover:bg-blue-50/20 dark:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Thêm phương án
            </button>
          )}
        </div>
      )}
      <PollModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        poll={poll}
        msg={msg}
        currentUserId={currentUserId}
        selectedChat={selectedChat}
        t={t}
        submitVote={submitVote}
        isSubmittingVote={isSubmittingVote}
        getVoterInfo={getVoterInfo}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────

const getFileNameFromUrl = (url: string) => {
  try {
    const normalizedPath = (() => {
      try {
        return new URL(url).pathname;
      } catch {
        return url.split('?')[0] || url;
      }
    })();
    const parts = normalizedPath.split('/');
    const lastPart = parts[parts.length - 1];
    const filename = lastPart.includes('_') ? lastPart.split('_').slice(1).join('_') : lastPart;
    return decodeURIComponent(filename);
  } catch {
    return 'File';
  }
};

const getMediaDownloadName = (url: string, mediaType: 'IMAGE' | 'VIDEO') => {
  const base = getFileNameFromUrl(url);
  if (/\.[a-z0-9]+$/i.test(base)) {
    return base;
  }
  return `${base}.${mediaType === 'IMAGE' ? 'jpg' : 'mp4'}`;
};

const getFileExtension = (url: string) => {
  const filename = getFileNameFromUrl(url);
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
};

const isOfficeDoc = (url: string) => {
  const ext = getFileExtension(url).toLowerCase();
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
};

const getPreviewUrl = (url: string) => {
  if (isOfficeDoc(url)) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }
  return url;
};

/** Returns true only if caption has actual visible text (not just empty HTML like <p></p>) */
const hasVisibleCaption = (caption?: string | null): boolean => {
  if (!caption) return false;
  return caption.replace(/<[^>]*>/g, '').trim().length > 0;
};

/**
 * Render caption nội dung: xử lý JSON TipTap, HTML, và text thuần.
 * Backend có thể gửi caption dạng JSON {"type":"doc",...} (TipTap format).
 */
const renderCaptionContent = (caption: string) => {
  const isHtml = /<[a-z][\s\S]*>/i.test(caption);
  const isJson = caption.trim().startsWith('{');
  if (isHtml) {
    return (
      <div className="tiptap-content" dangerouslySetInnerHTML={{ __html: replaceEmojiWithHtml(caption) }} />
    );
  }
  if (isJson) {
    // Parse TipTap JSON → HTML, rồi render
    const html = getMessageHtml(caption);
    return (
      <div className="tiptap-content" dangerouslySetInnerHTML={{ __html: replaceEmojiWithHtml(html) }} />
    );
  }
  return <>{caption}</>;
};

const isDifferentDay = (d1?: Date, d2?: Date) => {
  if (!d1 || !d2) return true;
  return d1.toDateString() !== d2.toDateString();
};

const formatDateSeparator = (date: Date | undefined, t: (key: string) => string) => {
  if (!date) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = today.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('chat.date.today');
  if (diffDays === 1) return t('chat.date.yesterday');
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const resolveImageAspectRatio = (message: ChatMessage) => {
  const width = Number(message?.width || 0);
  const height = Number(message?.height || 0);
  if (width > 0 && height > 0) {
    return `${width} / ${height}`;
  }
  return '4 / 3';
};

const renderText = (text: string, mentions?: string[]) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|fruvia\.chat\/g\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, idx) => {
    if (part.match(urlRegex)) {
      // Display shorter version for fruvia.chat links
      const displayUrl = part.startsWith('http') ? part : part;
      const cleanDisplay = displayUrl.replace(/^https?:\/\//, '');

      return (
        <a
          key={`url-${idx}`}
          href={part.startsWith('http') ? part : `https://${part}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0068FF] hover:underline break-all cursor-pointer font-medium"
          onClick={(e) => {
            e.stopPropagation();
            // If it's a join link, we let the card handle the modal, but if they click the link directly...
            // We could also open the modal here if we want.
          }}
        >
          {cleanDisplay}
        </a>
      );
    }
    // Highlight @mentions (e.g. "@Alice") in blue
    if (mentions && mentions.length > 0) {
      const mentionRegex = /(@\S+)/g;
      const subParts = part.split(mentionRegex);
      return subParts.map((sub, subIdx) => {
        if (sub.startsWith('@')) {
          return (
            <span key={`mention-${idx}-${subIdx}`} className="text-[#0068FF] font-semibold">
              {sub}
            </span>
          );
        }
        return sub;
      });
    }
    // 4. Zalo Emoji
    if (part.match(zaloEmojiRegex)) {
      const src = emojiMap[part];
      if (src) {
        return (
          <img
            key={`emoji-${idx}`}
            src={src}
            alt={part}
            className="inline-block w-6 h-6 mx-0.5 align-text-bottom"
            style={{ display: 'inline-block', verticalAlign: 'text-bottom' }}
            title={part}
          />
        );
      }
    }

    // 5. Regular text
    return part;
  });
};

const replaceEmojiWithHtml = (text: string) => {
  if (!text) return '';
  // First convert Tiptap JSON -> HTML (backwards compatible with plain text/HTML)
  const html = getMessageHtml(text);
  // Then replace zalo emoji shortcodes
  return html.replace(/:zalo_\d+_\d+:/g, (match, offset, fullText) => {
    const prevChar = fullText.slice(Math.max(0, offset - 5), offset);
    if (prevChar.includes('="') || prevChar.includes('alt=') || prevChar.includes('title=')) {
      return match;
    }
    const src = emojiMap[match];
    return src ? `<img src="${src}" alt="${match}" class="inline-block w-6 h-6 mx-0.5 align-text-bottom" style="width: 24px; height: 24px; display: inline-block; margin: 0 2px; vertical-align: text-bottom;" title="${match}" />` : match;
  });
};

const getDisplayText = (msg: ChatMessage, isAiConversation: boolean): string => {
  const text = msg.text ?? '';
  const isAiMessage = isAiConversation
    || msg.senderId === AI_TYPING_USER_ID
    || (msg.sender || '').trim().toLowerCase() === 'Fruvia Chatbot';

  if (!isAiMessage) return text;

  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*\*/g, '');
};

function LinkPreview({ url, title, description, thumbnail }: { url: string; title?: string; description?: string; thumbnail?: string }) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    return (
      <div
        className="mt-2 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border)] overflow-hidden flex flex-col cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          window.open(url, '_blank');
        }}
      >
        {thumbnail && (
          <div className="w-full h-32 overflow-hidden bg-gray-100 dark:bg-gray-800 border-b border-[var(--border)]">
            <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-2.5 flex flex-col gap-1">
          <div className="text-[13px] font-bold text-[var(--text)] line-clamp-2 leading-snug">
            {title || (url.length > 60 ? `${url.substring(0, 60)}...` : url)}
          </div>
          {description && (
            <div className="text-[12px] text-[var(--sub-text)] line-clamp-2 leading-snug">{description}</div>
          )}
          <div className="text-[11px] text-[#0068FF] font-medium flex items-center gap-1.5 overflow-hidden">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            <span className="truncate">{domain}</span>
          </div>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}

function GroupJoinLinkPreview({ url, onSelectConversation }: { url: string; onSelectConversation?: (id: string | number) => void }) {
  const [groupInfo, setGroupInfo] = useState<{ name: string; avatar: string; memberCount: number; memberAvatars: string[]; isMember?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const id = url.split('/g/')[1];
        if (id) {
          const res = await apiClient.get<any>(`/conversations/join/${id}/preview`);
          setGroupInfo(res);
        }
      } catch (e) {
        console.error('Failed to fetch group preview', e);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [url]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const id = url.split('/g/')[1];
      await apiClient.post(`/conversations/join/${id}`, {});
      toast.success('Tham gia nhóm thành công');
      setShowJoinModal(false);

      if (onSelectConversation) {
        onSelectConversation(id);
      } else {
        window.location.href = `/?chatId=${id}`;
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể tham gia nhóm');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="mt-2.5 p-3.5 rounded-2xl bg-white/50 dark:bg-white/5 border border-[var(--border)] flex items-center gap-4 opacity-70">
      <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-gray-700/50" />
      <div className="flex-1 space-y-2.5">
        <div className="h-4 bg-gray-200 dark:bg-gray-700/50 rounded-full w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700/50 rounded-full w-1/2" />
      </div>
    </div>
  );

  if (!groupInfo) return <LinkPreview url={url} />;

  return (
    <>
      <div
        className="mt-2 rounded-lg bg-white dark:bg-[#1E1E1E] border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-colors duration-200 cursor-pointer group/join-card w-full"
        onClick={(e) => {
          e.stopPropagation();
          if (groupInfo?.isMember) {
            const id = url.split('/g/')[1];
            if (onSelectConversation) {
              onSelectConversation(id);
            } else {
              window.location.href = `/?chatId=${id}`;
            }
          } else {
            setShowJoinModal(true);
          }
        }}
      >
        {/* Banner Section */}
        <div className="relative h-[160px] w-full bg-gradient-to-br from-[#0095FF] to-[#0068FF] flex items-center px-5 gap-4 overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full border-[20px] border-white/10 pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full border-[30px] border-white/5 pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-[70px] h-[70px] rounded-xl overflow-hidden border-2 border-white/40 bg-white/20 flex items-center justify-center shrink-0 shadow-lg">
              {groupInfo.avatar ? (
                <img src={groupInfo.avatar} alt={groupInfo.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/30 text-white font-bold text-2xl">
                  {groupInfo.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-white/80 text-[13px] font-medium mb-1">Nhóm</div>
              <div className="text-white text-[18px] font-bold truncate drop-shadow-sm leading-tight">
                {groupInfo.name}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#1E1E1E]">
          <div className="text-[15px] font-bold text-[var(--text)] mb-1 truncate">
            {groupInfo.name}
          </div>
          <div className="text-[15px] text-[var(--sub-text)] mb-2 line-clamp-1">
            Bấm vào đây để tham gia nhóm trên Fruvia Chat
          </div>
          <div className="text-[14px] text-[#0068FF] font-medium flex items-center gap-1">
            Fruvia Chat
          </div>
        </div>
      </div>

      {/* Join Confirmation Modal */}
      {showJoinModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { e.stopPropagation(); setShowJoinModal(false); }}
        >
          <div
            className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-[340px] rounded-lg shadow-2xl overflow-hidden animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 text-center">
              <div className="w-[80px] h-[80px] rounded-full mx-auto mb-4 border border-[#0068FF]/20 overflow-hidden shadow-sm p-0.5 bg-white dark:bg-gray-800">
                <div className="w-full h-full rounded-full overflow-hidden">
                  {groupInfo.avatar ? (
                    <img src={groupInfo.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0095FF] to-[#0068FF] text-white font-medium text-2xl">
                      {groupInfo.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <h3 className="text-[17px] font-semibold text-[var(--text)] mb-1.5">Tham gia nhóm?</h3>
              <p className="text-[13px] text-[var(--sub-text)] mb-7 px-4 leading-relaxed">
                Bạn có chắc chắn muốn tham gia vào nhóm <br />
                <span className="font-medium text-[var(--text)]">"{groupInfo.name}"</span> không?
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2 text-[14px] text-[var(--text)] bg-[var(--hover-bg)] hover:bg-[var(--border)] font-medium rounded-md transition-all active:scale-[0.97] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  disabled={joining}
                  onClick={handleJoin}
                  className="flex-1 py-2 text-[14px] bg-[#0068FF] hover:bg-[#0052CC] text-white font-medium rounded-md transition-all shadow-sm active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                >
                  {joining ? '...' : 'Xác nhận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function VoicePlayer({ url, duration, isMe }: { url: string; duration?: number; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`flex items-center gap-3 py-1.5 px-1 min-w-[200px] ${isMe ? 'text-[var(--message-me-text)]' : 'text-[var(--text)]'}`}>
      <audio ref={audioRef} src={url} className="hidden" />
      <button onClick={togglePlay} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${isMe ? 'bg-[#0068FF]/15 text-[#0068FF] hover:bg-[#0068FF]/25' : 'bg-[#0068FF]/10 text-[#0068FF] hover:bg-[#0068FF]/20'} cursor-pointer`}>
        {isPlaying ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" transform="translate(1, 0)"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className={`h-1 rounded-full relative ${isMe ? 'bg-[#0068FF]/15' : 'bg-black/10 dark:bg-white/10'}`}>
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 bg-[#0068FF]`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] opacity-80 font-medium">
          <span>{formatDuration(audioRef.current?.currentTime || 0)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
      <div className="shrink-0 scale-x-[-1] opacity-60">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
      </div>
    </div>
  );
}

// ── Message Block Grouping ──────────────────────────────────────────────────
const BLOCK_GAP_MS = 5 * 60 * 1000; // 5 minutes
const BLOCK_MSG_TYPES = new Set(['TEXT', 'IMAGE', 'VIDEO', 'MEDIA', 'VOICE', 'LINK']);

// Rich content types that need more spacing even within a block
const RICH_MSG_TYPES = new Set(['IMAGE', 'VIDEO', 'MEDIA', 'SHARE_CONTACT']);

const LINK_PLACEHOLDER_REGEX = /^\s*\[?LINK\]?\s*$/i;

const getPinnedPreviewText = (pin: { messageType?: string; content?: string; linkUrl?: string }) => {
  const messageType = String(pin.messageType || '').toUpperCase();
  if (messageType !== 'LINK') {
    if (messageType !== 'TEXT') return `[${pin.messageType}]`;
    // Với TEXT, thử parse JSON (TipTap format) để lấy plain text
    const content = String(pin.content || '');
    if (content.trim().startsWith('{')) {
      try {
        const json = JSON.parse(content);
        if (json && typeof json === 'object') {
          // TipTap doc → extract text
          const extract = (node: any): string => {
            if (!node) return '';
            if (node.type === 'text') return node.text ?? '';
            if (Array.isArray(node.content)) {
              return node.content.map(extract).join(' ');
            }
            return '';
          };
          const extracted = extract(json).trim();
          if (extracted) return extracted;
        }
      } catch { /* ignore */ }
    }
    return content;
  }

  const content = String(pin.content || '').trim();
  const explicitUrl = String(pin.linkUrl || '').trim();
  const extractedUrl = content.match(/(https?:\/\/[^\s]+)/)?.[0] || '';

  if (explicitUrl) return explicitUrl;
  if (extractedUrl) return extractedUrl;
  if (!LINK_PLACEHOLDER_REGEX.test(content) && content) return content;
  return '[Link]';
};

function getBlockSenderId(msg: ChatMessage): string | null {
  if (!BLOCK_MSG_TYPES.has(msg.type)) return null;
  return msg.senderId || msg.sender;
}

function shouldShowTimestamp(msg: ChatMessage, nextMsg: ChatMessage | undefined): boolean {
  if (!nextMsg) return true;
  const cur = getBlockSenderId(msg);
  const nxt = getBlockSenderId(nextMsg);
  if (!cur || !nxt || cur !== nxt) return true;
  if (msg.rawDate && nextMsg.rawDate) {
    return new Date(nextMsg.rawDate).getTime() - new Date(msg.rawDate).getTime() > BLOCK_GAP_MS;
  }
  return true;
}

function isFirstInBlock(msg: ChatMessage, prevMsg: ChatMessage | undefined): boolean {
  if (!prevMsg) return true;
  const cur = getBlockSenderId(msg);
  const prv = getBlockSenderId(prevMsg);
  if (!cur || !prv || cur !== prv) return true;
  if (msg.rawDate && prevMsg.rawDate) {
    return new Date(msg.rawDate).getTime() - new Date(prevMsg.rawDate).getTime() > BLOCK_GAP_MS;
  }
  return true;
}

function ChatMessageListImpl({ vm }: ChatMessageListProps) {
  const { refreshUserStatus } = usePresence();
  if (!vm || !vm.selectedChat) return null;

  const {
    t,
    selectedChat,
    currentUser,
    messages,
    hasMore,
    isLoadingMore,
    isInitialLoading,
    loadMoreRef,
    scrollContainerRef,
    messagesEndRef,
    typingUsers,
    friendRequestStatus,
    friendActionLoading,
    pinnedMessages,
    showPinnedList,
    setShowPinnedList,
    openContextMenu,
    setContextMenu,
    editingMessageId,
    setEditContent,
    editContent,
    setEditingMessageId,
    handleEditMessage,
    handleDownloadFile,
    setOpenedImageSrc,
    setReactionModalMessageId,
    setForwardingMsg,
    onOpenProfile,
    handlePinMessage,
    handleUnpinMessage,
    readReceipts,
    deliveredReceipts,
    handleAcceptFriendRequest,
    handleSendFriendRequest,
  } = vm;
  const isAiConversation = Boolean(selectedChat?.isAi);
  const openSenderProfile = (msg: ChatMessage) => {
    const userId = msg.senderId;
    if (!userId || userId === currentUser?.id || userId === 'SYSTEM' || userId === AI_TYPING_USER_ID) return;
    onOpenProfile?.(userId);
  };

  // Fetch trạng thái online của người nhận khi mở hội thoại mới
  useEffect(() => {
    const peerId = selectedChat.otherUserId || selectedChat.recipientId;
    if (peerId && !selectedChat.isGroup && !selectedChat.isCloud && !selectedChat.isAi) {
      refreshUserStatus(peerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat.otherUserId, selectedChat.recipientId]);



  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {showPinnedList && (
        <div className="absolute inset-0 z-40 bg-black/45" onClick={() => setShowPinnedList(false)} />
      )}

      {false && !selectedChat.isCloud && !selectedChat.isAi && !selectedChat.isGroup && (selectedChat.otherUserId || selectedChat.recipientId) && friendRequestStatus !== 'friend' && friendRequestStatus !== 'loading' && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span className="text-[13px] text-amber-800 dark:text-amber-200">
              {t('chat.stranger_warning')}
            </span>
          </div>
          <div className="shrink-0">
            {friendRequestStatus === 'received' ? (
              <button
                disabled={friendActionLoading}
                onClick={handleAcceptFriendRequest}
                className="px-3 py-1.5 bg-[#0068FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {t('chat.friend.accept_btn')}
              </button>
            ) : friendRequestStatus === 'sent' ? (
              <span className="text-[12px] text-amber-700 dark:text-amber-300 italic whitespace-nowrap">{t('chat.friend.sent_label')}</span>
            ) : (
              <button
                disabled={friendActionLoading}
                onClick={handleSendFriendRequest}
                className="px-3 py-1.5 bg-[#0068FF] hover:bg-[#0052CC] text-white text-[13px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {t('chat.friend.add_btn')}
              </button>
            )}
          </div>
        </div>
      )}

      {pinnedMessages.length > 0 && (
        <div className={`relative ${showPinnedList ? 'z-[60]' : 'z-20'}`}>
          {!showPinnedList && (
            <div className="bg-[var(--card-bg)] border-b border-[var(--border)] flex items-center justify-between gap-3 px-3 py-2 select-none">
              <div
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                onClick={() => {
                  const pin = pinnedMessages[0];
                  const el = document.getElementById(`msg-${pin.messageId}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlight-msg');
                    setTimeout(() => el.classList.remove('highlight-msg'), 2000);
                  }
                }}
              >
                <div className="shrink-0 w-7 h-7 rounded-full border border-[#0B63F6]/30 text-[#0B63F6] flex items-center justify-center bg-[#F1F6FF]">
                  <MessageBubbleIcon size={14} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-[var(--text)] leading-tight">Tin nhắn</div>
                  <div className="text-[13px] text-[var(--sub-text)] truncate leading-snug mt-0.5">
                    <span className="font-medium text-[var(--text)]">{pinnedMessages[0].senderName}: </span>
                    {(getPinnedPreviewText(pinnedMessages[0]).length > 120
                      ? `${getPinnedPreviewText(pinnedMessages[0]).slice(0, 120)}...`
                      : getPinnedPreviewText(pinnedMessages[0]))}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1">
                <button
                  onClick={() => setShowPinnedList(true)}
                  className="h-8 px-2.5 rounded-md border border-[#C7CFDB] text-[#1F2D49] text-[11px] font-semibold hover:bg-[#EEF2F7] transition-colors cursor-pointer inline-flex items-center gap-1"
                  aria-label="Xem tất cả tin nhắn ghim"
                >
                  <span>+{pinnedMessages.length} ghim</span>
                  <ChevronDownIcon size={12} />
                </button>

                <button
                  onClick={() => setShowPinnedList(true)}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-[var(--sub-text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                  aria-label="Mở menu tin nhắn ghim"
                >
                  <MoreHorizontalIcon size={16} />
                </button>
              </div>
            </div>
          )}

          {showPinnedList && (
            <>
              <div className="absolute left-0 right-0 top-full z-50">
                <div className="bg-white border border-[#D7DCE4] rounded-none shadow-[0_6px_28px_rgba(0,0,0,0.18)] overflow-hidden">
                  <div className="h-10 px-4 bg-[#EEF1F6] border-b border-[#D7DCE4] flex items-center justify-between">
                    <div className="text-[13px] font-semibold text-[#1F2D49] leading-none">
                      Danh sách ghim ({pinnedMessages.length})
                    </div>
                    <button
                      onClick={() => setShowPinnedList(false)}
                      className="text-[13px] text-[#1F2D49] hover:text-[#0f172a] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Thu gọn</span>
                      <span className="rotate-180 inline-flex"><ChevronDownIcon size={13} /></span>
                    </button>
                  </div>

                  <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                    {pinnedMessages.map((pin, idx) => (
                      <div
                        key={pin.id}
                        className={`px-4 py-2 flex items-center gap-2.5 cursor-pointer hover:bg-[#F8FAFD] transition-colors ${idx < pinnedMessages.length - 1 ? 'border-b border-[#E6EAF0]' : ''}`}
                        onClick={() => {
                          const el = document.getElementById(`msg-${pin.messageId}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el.classList.add('highlight-msg');
                            setTimeout(() => el.classList.remove('highlight-msg'), 2000);
                          }
                          setShowPinnedList(false);
                        }}
                      >
                        <div className="shrink-0 text-[#0B63F6]">
                          <MessageBubbleIcon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[#0f172a] leading-none">Tin nhắn</div>
                          <div className="text-[12px] text-[#1F2D49] truncate mt-0.5 leading-snug">
                            <span className="font-medium">{pin.senderName}: </span>
                            {getPinnedPreviewText(pin)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnpinMessage(pin.messageId);
                          }}
                          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[#374151] hover:bg-[#EEF2F7] cursor-pointer"
                          title={t('chat.ctx_menu.unpin')}
                        >
                          <MoreHorizontalIcon size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    className="w-full h-8 border-t border-[#D7DCE4] text-[12px] text-[#1F2D49] hover:bg-[#F8FAFD] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    onClick={() => setShowPinnedList(false)}
                  >
                    <span>Xem tất cả ở bảng tin nhóm</span>
                    <ChevronRightIcon size={12} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar chat-message-scrollbar px-4 pt-4 pb-2 bg-[var(--chat-bg)]" onScroll={() => setContextMenu(null)}>
        {isInitialLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {hasMore && <div ref={loadMoreRef} className="h-4 opacity-0" />}
            {isLoadingMore && <div className="flex justify-center p-2"><div className="w-5 h-5 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" /></div>}

            <div>
              {messages.map((msg, index) => {
                const prevMsg = messages[index - 1];
                const nextMsg = messages[index + 1];
                const showDateSeparator = !prevMsg || isDifferentDay(msg.rawDate, prevMsg.rawDate);
                const showTimestamp = shouldShowTimestamp(msg, nextMsg);
                const effectivePrev = showDateSeparator ? undefined : prevMsg;
                const showAvatarAndName = isFirstInBlock(msg, effectivePrev);
                const hasReactions = msg.reactions && msg.reactions.length > 0;
                const isSticker = msg.type === 'STICKER' || (msg.type === 'IMAGE' && Boolean(msg.text?.includes('/stickers/')));
                const paddingClass = showTimestamp
                  ? 'pb-4'
                  : hasReactions
                    ? 'pb-5'
                    : 'pb-1';
                const displayText = getDisplayText(msg, Boolean(selectedChat.isAi));

                return (
                  <div
                    key={`row-${msg.id}-${index}`}
                    className={paddingClass}
                  >
                    {showDateSeparator && (
                      <div className="flex justify-center my-2">
                        <span className="bg-black/5 dark:bg-white/10 px-4 py-1.5 rounded-full text-[12px] font-bold text-[var(--sub-text)] opacity-60">{formatDateSeparator(msg.rawDate, t)}</span>
                      </div>
                    )}

                    {msg.type === 'MESSAGE_PIN' || msg.type === 'MESSAGE_UNPIN' ? (
                      <div className="flex justify-center my-1">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 max-w-[85%]">
                          {msg.type === 'MESSAGE_PIN' ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                              <path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                              <path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
                              <line x1="3" y1="3" x2="21" y2="21" stroke="#f97316" strokeWidth="2.5" />
                            </svg>
                          )}
                          <span className="text-[12px] leading-snug" style={{ color: msg.type === 'MESSAGE_PIN' ? '#0068FF' : '#f97316' }}>
                            <span className="font-medium">{msg.sender === 'Me' ? 'Bạn' : msg.sender}</span>
                            {msg.type === 'MESSAGE_PIN' ? ' đã ghim tin nhắn' : ' đã bỏ ghim tin nhắn'}
                            {msg.text ? (
                              <>
                                <span>: </span>
                                <span className="font-medium">
                                  "{(getPlainTextFromMessage(msg.text).length > 45 ? `${getPlainTextFromMessage(msg.text).slice(0, 45)}...` : getPlainTextFromMessage(msg.text))}"
                                </span>
                              </>
                            ) : (
                              <span>.</span>
                            )}
                            {msg.type === 'MESSAGE_PIN' && msg.replyToMessageId && (
                              <span
                                className="text-[#0068FF] cursor-pointer ml-1 font-medium hover:underline"
                                onClick={() => {
                                  const el = document.getElementById(`msg-${msg.replyToMessageId}`);
                                  if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    el.classList.add('highlight-msg');
                                    setTimeout(() => el.classList.remove('highlight-msg'), 2000);
                                  }
                                }}
                              >. Xem</span>
                            )}
                          </span>
                        </div>
                      </div>
                    ) : msg.type === 'SYSTEM' ? (() => {
                      const sysText = msg.text || '';
                      
                      // Check if it is a poll-related system message
                      const isPollSysMsg = sysText.toLowerCase().includes('bình chọn') || sysText.toLowerCase().includes('poll');
                      
                      if (isPollSysMsg) {
                        const handleXemClick = () => {
                          const parts = sysText.split(':');
                          const questionName = parts[1]?.trim();
                          
                          // Find the poll message in the list
                          const pollMsg = messages.find(m => 
                            m.type === 'POLL' && 
                            (m.poll?.question === questionName || (questionName && m.poll?.question?.includes(questionName)))
                          );
                          
                          const targetId = pollMsg?.id;
                          if (targetId) {
                            const el = document.getElementById(`msg-${targetId}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.classList.add('highlight-msg');
                              setTimeout(() => el.classList.remove('highlight-msg'), 2000);
                            }
                          }
                        };

                        return (
                          <div className="flex justify-center my-1.5">
                            <div className="flex items-center gap-2 bg-white border border-[#E4E6EB] dark:bg-[#1E1E1E] dark:border-[#303030] px-4 py-1.5 rounded-full max-w-[90%] shadow-sm transition-all hover:shadow-md">
                              {/* Green Bar Chart Icon */}
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <line x1="18" y1="20" x2="18" y2="4" />
                                <line x1="12" y1="20" x2="12" y2="10" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                              </svg>
                              <span className="text-[13px] font-medium text-[#081C36] dark:text-white leading-none truncate max-w-[220px] sm:max-w-[280px]">
                                {sysText}
                              </span>
                              <button
                                onClick={handleXemClick}
                                className="text-[13px] font-bold text-[#0068FF] hover:underline cursor-pointer shrink-0 ml-1 leading-none"
                              >
                                Xem
                              </button>
                            </div>
                          </div>
                        );
                      }

                      const isAdd = sysText.includes('đã thêm') || sysText.includes('đã tham gia');
                      const isRemove = sysText.includes('đã rời') || sysText.includes('đã xóa');
                      const sysColor = isAdd ? '#22c55e' : isRemove ? '#ef4444' : '#6b7280';
                      return (
                      <div className="flex justify-center my-1.5">
                        <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-3.5 py-1.5 rounded-2xl max-w-[85%] shadow-sm">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" style={{ color: sysColor }} aria-hidden="true">
                            <path d="M12 2.75a6.25 6.25 0 0 0-6.25 6.25v3.41c0 .58-.23 1.13-.64 1.54l-1.3 1.3A1 1 0 0 0 4.52 17h14.96a1 1 0 0 0 .71-1.71l-1.3-1.3a2.18 2.18 0 0 1-.64-1.54V9A6.25 6.25 0 0 0 12 2.75Z" />
                            <circle cx="12" cy="18.25" r="1.75" />
                          </svg>
                          <span className="text-[12px] leading-snug break-words" style={{ color: sysColor }}>{msg.text}</span>
                        </div>
                      </div>
                      );
                    })() : msg.type === 'CALL_MISSED' || msg.type === 'CALL_REJECTED' || msg.type === 'CALL_ENDED' ? (
                      <div
                        id={`msg-${msg.id}`}
                        className={`flex ${msg.type === 'POLL' ? 'justify-center' : String(msg.senderId ?? '') === String(currentUser?.id ?? '') || msg.sender === 'Me' ? 'justify-end pr-1' : 'justify-start'} -mx-4 px-4 rounded-none transition-colors duration-300 [&.highlight-msg]:bg-[#C6D4E4]`}
                      >
                        <div className={`flex gap-1.5 ${msg.type === 'POLL' ? '' : 'max-w-[64%]'} group relative ${msg.type === 'POLL' ? '' : String(msg.senderId ?? '') === String(currentUser?.id ?? '') || msg.sender === 'Me' ? 'flex-row-reverse' : ''} items-start`}>
                          {msg.sender !== 'Me' && (
                            showAvatarAndName ? (
                              <button
                                type="button"
                                onClick={() => openSenderProfile(msg)}
                                className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 border-[1px] border-[#DBDFE6] dark:border-white/10 shadow-sm flex items-center justify-center bg-blue-50 cursor-pointer"
                                aria-label={`Xem hồ sơ ${msg.sender || selectedChat.name}`}
                              >
                                {(msg as any).avatar ? (
                                  <img src={(msg as any).avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : selectedChat.isAi || (msg as any).senderId === AI_TYPING_USER_ID ? (
                                  <FruviaChatbotAvatar className="w-full h-full" imageClassName="w-full h-full object-cover" />
                                ) : selectedChat.avatar ? (
                                  <img src={selectedChat.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-blue-600 font-bold text-sm">{(msg.sender && msg.sender !== 'Me' ? msg.sender : selectedChat.name)?.charAt(0) || '?'}</span>
                                )}
                              </button>
                            ) : (
                              <div className="w-10 shrink-0" />
                            )
                          )}

                          <div className={`flex flex-col ${msg.type === 'POLL' ? 'items-center' : String(msg.senderId ?? '') === String(currentUser?.id ?? '') || msg.sender === 'Me' ? 'items-end' : 'items-start'} relative group/msg-container`}>
                            {msg.sender !== 'Me' && selectedChat.isGroup && showAvatarAndName && (
                              <span className="text-[12px] font-semibold text-[var(--sub-text)] mb-0.5 ml-1">{msg.sender}</span>
                            )}

                            <div
                              className={`relative group w-fit min-w-[92px] px-2.5 pt-1.5 pb-1.5 rounded-md shadow-sm text-[14px] border ${String(msg.senderId ?? '') === String(currentUser?.id ?? '') || msg.sender === 'Me'
                                ? 'bg-[var(--message-me-bg)] text-[var(--message-me-text)] border-[var(--message-me-border)]'
                                : 'bg-[var(--message-other-bg)] text-[var(--message-other-text)] border-[var(--message-other-border)]'
                              }`}
                              onContextMenu={(e) => openContextMenu(e, msg)}
                            >
                              <CallHistoryMessage msg={msg} currentUserId={currentUser?.id} t={t} onVideoCall={vm.handleVideoCall} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : msg.type === 'CALL_GROUP_START' ? (
                      <GroupCallCard msg={msg} currentUserId={currentUser?.id} selectedChat={selectedChat} t={t} />
                    ) : (
                      <div id={`msg-${msg.id}`} className={`flex ${msg.type === 'POLL' ? 'justify-center' : msg.sender === 'Me' ? 'justify-end pr-1' : 'justify-start'} -mx-4 px-4 rounded-none transition-colors duration-300 [&.highlight-msg]:bg-[#C6D4E4]`}>
                        <div className={`flex gap-1.5 ${msg.type === 'POLL' ? '' : 'max-w-[72%]'} group relative ${msg.type === 'POLL' ? '' : msg.sender === 'Me' ? 'flex-row-reverse' : ''} items-start`}>
                          {msg.sender !== 'Me' && msg.type !== 'POLL' && (
                            showAvatarAndName ? (
                              <button
                                type="button"
                                onClick={() => openSenderProfile(msg)}
                                className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 border-[1px] border-[#DBDFE6] dark:border-white/10 shadow-sm flex items-center justify-center bg-blue-50 cursor-pointer"
                                aria-label={`Xem hồ sơ ${msg.sender || selectedChat.name}`}
                              >
                                {(msg as any).avatar ? (
                                  <img src={(msg as any).avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : selectedChat.isAi || (msg as any).senderId === AI_TYPING_USER_ID ? (
                                  <FruviaChatbotAvatar className="w-full h-full" imageClassName="w-full h-full object-cover" />
                                ) : selectedChat.avatar ? (
                                  <img src={selectedChat.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-blue-600 font-bold text-sm">{(msg.sender && msg.sender !== 'Me' ? msg.sender : selectedChat.name)?.charAt(0) || '?'}</span>
                                )}
                              </button>
                            ) : (
                              <div className="w-10 shrink-0" />
                            )
                          )}

                          <div className={`flex flex-col ${msg.type === 'POLL' ? 'items-center' : msg.sender === 'Me' ? 'items-end' : 'items-start'} relative group/msg-container min-w-0 max-w-full`}>
                            {msg.sender !== 'Me' && selectedChat.isGroup && showAvatarAndName && msg.type !== 'POLL' && (
                              <span className="text-[12px] font-semibold text-[var(--sub-text)] mb-0.5 ml-1">{msg.sender}</span>
                            )}

                            {msg.replyToMessageId && (() => {
                              const repliedMsg = messages.find(m => m.id === msg.replyToMessageId);
                              if (!repliedMsg) return null;

                              const plainText = getPlainTextFromMessage(repliedMsg.text || '');
                              const replySnippet = repliedMsg.isRecalled
                                ? t('chat.message.recalled')
                                : repliedMsg.type === 'IMAGE'
                                  ? `📷 ${t('chat.snippet.image')}`
                                : repliedMsg.type === 'IMAGE_GROUP'
                                  ? `📷 ${t('chat.snippet.image_group')}`
                                : repliedMsg.type === 'VIDEO'
                                  ? `🎬 ${t('chat.snippet.video')}`
                                  : repliedMsg.type === 'VOICE'
                                    ? `🎤 ${t('chat.snippet.voice')}`
                                    : repliedMsg.type === 'MEDIA'
                                      ? `📎 ${t('chat.snippet.file')}`
                                      : repliedMsg.type === 'SHARE_CONTACT'
                                        ? (() => { try { const c = JSON.parse(repliedMsg.text || '{}'); return `📇 ${c.fullName || t('share_contact.snippet')}`; } catch { return `📇 ${t('share_contact.snippet')}`; } })()
                                        : plainText.length > 80
                                          ? `${plainText.slice(0, 80)}...`
                                          : plainText;

                              return (
                                <div
                                  onClick={() => {
                                    const el = document.getElementById(`msg-${repliedMsg.id}`);
                                    if (el) {
                                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      el.classList.add('highlight-msg');
                                      setTimeout(() => el.classList.remove('highlight-msg'), 1500);
                                    }
                                  }}
                                  className={`mb-1 px-2.5 py-1.5 rounded-md border-l-[3px] cursor-pointer transition-colors text-[12px] leading-snug ${msg.sender === 'Me'
                                    ? 'bg-black/5 dark:bg-white/5 border-white/40 dark:border-white/30 hover:bg-black/10 dark:hover:bg-white/10'
                                    : 'bg-black/5 dark:bg-white/5 border-[#0068FF]/40 hover:bg-black/10 dark:hover:bg-white/10'
                                    }`}
                                >
                                  <div className="font-bold text-[11px] text-[#0068FF] mb-0.5">{repliedMsg.sender === 'Me' ? t('common.you') : repliedMsg.sender}</div>
                                  <div className="text-[var(--sub-text)] truncate max-w-[280px]">{replySnippet}</div>
                                </div>
                              );
                            })()}

                            <div
                              className={`relative group w-fit min-w-[100px] max-w-full ${msg.isRecalled
                                ? `px-3 pt-2 pb-2 rounded-md shadow-sm text-[15px] border border-dashed ${msg.sender === 'Me' ? 'border-gray-300 dark:border-gray-600' : 'border-gray-300 dark:border-gray-600'}`
                                : msg.type === 'MEDIA' || msg.type === 'IMAGE' || msg.type === 'IMAGE_GROUP' || msg.type === 'VIDEO' || msg.type === 'SHARE_CONTACT' || msg.type === 'POLL'
                                  ? ''
                                  : `px-3 pt-2 pb-2 rounded-md shadow-sm text-[15px] border ${msg.sender === 'Me'
                                    ? 'bg-[var(--message-me-bg)] text-[var(--message-me-text)] border-[var(--message-me-border)]'
                                    : 'bg-[var(--message-other-bg)] text-[var(--message-other-text)] border-[var(--message-other-border)]'
                                  }`
                                }`}
                              onContextMenu={(e) => openContextMenu(e, msg)}
                            >
                              <div className="leading-relaxed">
                                {msg.forwardedFromSenderName && !msg.isRecalled && (
                                  <div className="flex items-center gap-1 mb-1 text-[11px] text-[var(--sub-text)] italic">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l5-5 5 5M8 6v8a4 4 0 004 4h9" /></svg>
                                    <span>{t('chat.forward.forwarded_from', { name: msg.forwardedFromSenderName })}</span>
                                  </div>
                                )}

                                {msg.isRecalled ? (
                                  <div className="flex items-center gap-2 py-1 text-[var(--sub-text)] italic opacity-70">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                    <span className="text-[14px]">{t('chat.message.recalled')}</span>
                                  </div>
                                ) : editingMessageId === msg.id ? (
                                  <div className="flex flex-col gap-1.5 min-w-[280px]">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                      <span className="text-[11px] font-semibold text-[#0068FF]">{t('chat.confirm.edit_save')}</span>
                                    </div>
                                    <input
                                      type="text"
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleEditMessage(msg.id);
                                        if (e.key === 'Escape') {
                                          setEditingMessageId(null);
                                          setEditContent('');
                                        }
                                      }}
                                      className="w-full bg-[var(--hover-bg)] outline-none border border-[#0068FF]/30 focus:border-[#0068FF] rounded-md text-[15px] px-3 py-1.5 text-[var(--text)] transition-colors"
                                      autoFocus
                                    />
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <span className="text-[11px] text-[var(--sub-text)] mr-auto">Esc {t('chat.confirm.edit_cancel').toLowerCase()}</span>
                                      <button onClick={() => { setEditingMessageId(null); setEditContent(''); }} className="text-[12px] text-[var(--sub-text)] hover:text-[var(--text)] px-3 py-1 rounded-md hover:bg-[var(--hover-bg)] cursor-pointer transition-colors">{t('chat.confirm.edit_cancel')}</button>
                                      <button onClick={() => handleEditMessage(msg.id)} className="text-[12px] text-white bg-[#0068FF] hover:bg-[#0052CC] px-4 py-1 rounded-md font-semibold cursor-pointer shadow-sm transition-colors">{t('chat.confirm.edit_save')}</button>
                                    </div>
                                  </div>
                                ) : isSticker ? (
                                  /* STICKER: large centered image, no bubble */
                                  <div className="flex justify-center my-2">
                                    <img
                                      src={msg.text}
                                      alt="Sticker"
                                      className="w-[120px] h-[120px] object-contain cursor-pointer hover:scale-110 transition-transform"
                                      onClick={() => setOpenedImageSrc(msg.text)}
                                    />
                                  </div>
                                ) : msg.type === 'IMAGE' || msg.type === 'VIDEO' ? (
                                  <div className="relative group/media-content w-fit max-w-full">
                                    {msg.type === 'IMAGE' ? (
                                      <div
                                        className={`relative w-full max-w-[320px] overflow-hidden bg-slate-100 shadow-sm ${hasVisibleCaption(msg.caption) ? 'rounded-t-md' : 'rounded-md'}`}
                                        style={{ aspectRatio: resolveImageAspectRatio(msg) }}
                                      >
                                        <img
                                          src={msg.text}
                                          alt="Shared"
                                          className={`h-full w-full cursor-pointer object-cover transition-all hover:opacity-90 ${msg.isUploading ? 'blur-[2px] brightness-75' : ''}`}

                                          onClick={() => !msg.isUploading && setOpenedImageSrc(msg.text)}
                                        />
                                        <div className="absolute bottom-2 left-2 text-white/80 drop-shadow-md">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>
                                        </div>
                                        {msg.isUploading && (
                                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-md gap-2">
                                            <div className="relative w-12 h-12">
                                              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                                <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="3" />
                                                <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
                                                  strokeDasharray={`${2 * Math.PI * 20}`}
                                                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - (msg.uploadProgress ?? 0) / 100)}`}
                                                  className="transition-all duration-300"
                                                />
                                              </svg>
                                              <span className="absolute inset-0 flex items-center justify-center text-white text-[11px] font-semibold drop-shadow">
                                                {msg.uploadProgress ?? 0}%
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <video src={msg.text} controls className="max-w-[320px] max-h-[360px] rounded-md shadow-sm object-contain" />
                                    )}
                                    {hasVisibleCaption(msg.caption) && (
                                      <div className={`px-2.5 py-1.5 text-[14px] leading-snug break-words rounded-b-md max-w-[320px] shadow-sm ${msg.sender === 'Me'
                                          ? 'bg-[var(--message-me-bg)] text-[var(--message-me-text)]'
                                          : 'bg-[var(--message-other-bg)] text-[var(--message-other-text)]'
                                        }`}>
                                        {renderCaptionContent(msg.caption!)}
                                      </div>
                                    )}

                                    {!msg.isUploading && !isSticker && (
                                      <button
                                        onClick={(e) => handleDownloadFile(e, msg.text, getMediaDownloadName(msg.text, msg.type === 'IMAGE' ? 'IMAGE' : 'VIDEO'))}
                                        className="absolute top-2 right-2 h-8 w-8 rounded-lg flex items-center justify-center border border-black/10 bg-white/80 text-[#1f2937] backdrop-blur-sm transition-all cursor-pointer opacity-0 group-hover/media-content:opacity-100 hover:bg-white hover:scale-110 active:scale-95"
                                        title="Tải xuống"
                                        aria-label="Download media"
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                          <polyline points="7 10 12 15 17 10" />
                                          <line x1="12" x2="12" y1="15" y2="3" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                ) : msg.type === 'IMAGE_GROUP' && msg.attachments && msg.attachments.length > 0 ? (
                                  <div className="relative group/media-content w-fit max-w-full">
                                    {(() => {
                                      const imgs = msg.attachments!;
                                      const count = imgs.length;
                                      const blurClass = msg.isUploading ? 'blur-[1px] brightness-75' : '';
                                      if (count === 1) {
                                        return (
                                          <div className="relative max-w-[320px] overflow-hidden bg-slate-100 shadow-sm rounded-md" style={{ aspectRatio: '4/3' }}>
                                            <img src={imgs[0].url} alt="Shared" className={`h-full w-full cursor-pointer object-cover hover:opacity-90 ${blurClass}`} onClick={() => !msg.isUploading && setOpenedImageSrc(imgs[0].url)} />
                                          </div>
                                        );
                                      }
                                      if (count === 2) {
                                        return (
                                          <div className={`grid grid-cols-2 gap-0.5 w-[300px] rounded-md overflow-hidden shadow-sm ${blurClass}`}>
                                            {imgs.map((att, i) => (
                                              <div key={i} className="relative aspect-square bg-slate-100 overflow-hidden">
                                                <img src={att.url} alt="Shared" className="h-full w-full cursor-pointer object-cover hover:opacity-90" onClick={() => !msg.isUploading && setOpenedImageSrc(att.url)} />
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      }
                                      if (count === 3) {
                                        return (
                                          <div className={`grid grid-cols-2 gap-0.5 w-[300px] rounded-md overflow-hidden shadow-sm ${blurClass}`} style={{ gridTemplateRows: '1fr 1fr' }}>
                                            <div className="row-span-2 relative bg-slate-100 overflow-hidden">
                                              <img src={imgs[0].url} alt="Shared" className="h-full w-full cursor-pointer object-cover hover:opacity-90" onClick={() => !msg.isUploading && setOpenedImageSrc(imgs[0].url)} />
                                            </div>
                                            <div className="relative aspect-square bg-slate-100 overflow-hidden">
                                              <img src={imgs[1].url} alt="Shared" className="h-full w-full cursor-pointer object-cover hover:opacity-90" onClick={() => !msg.isUploading && setOpenedImageSrc(imgs[1].url)} />
                                            </div>
                                            <div className="relative aspect-square bg-slate-100 overflow-hidden">
                                              <img src={imgs[2].url} alt="Shared" className="h-full w-full cursor-pointer object-cover hover:opacity-90" onClick={() => !msg.isUploading && setOpenedImageSrc(imgs[2].url)} />
                                            </div>
                                          </div>
                                        );
                                      }
                                      // 4+ images: dynamic rows (Zalo-style, shows ALL images)
                                      const numRows = Math.ceil(count / 3);
                                      const rows: typeof imgs[number][][] = [];
                                      let startIdx = 0;
                                      let rem = count;
                                      for (let r = 0; r < numRows; r++) {
                                        const rowsLeft = numRows - r;
                                        const perRow = Math.floor(rem / rowsLeft);
                                        rows.push(imgs.slice(startIdx, startIdx + perRow));
                                        startIdx += perRow;
                                        rem -= perRow;
                                      }
                                      return (
                                        <div className={`flex flex-col gap-0.5 w-[300px] rounded-md overflow-hidden shadow-sm ${blurClass}`}>
                                          {rows.map((row, ri) => (
                                            <div key={ri} className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}>
                                              {row.map((att, ci) => (
                                                <div key={ci} className="relative aspect-square overflow-hidden">
                                                  <img src={att.url} alt="Shared" className="h-full w-full cursor-pointer object-cover hover:opacity-90" onClick={() => !msg.isUploading && setOpenedImageSrc(att.url)} />
                                                </div>
                                              ))}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                    {msg.isUploading && (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-md gap-2 z-10">
                                        <div className="relative w-12 h-12">
                                          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                            <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="3" />
                                            <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
                                              strokeDasharray={`${2 * Math.PI * 20}`}
                                              strokeDashoffset={`${2 * Math.PI * 20 * (1 - (msg.uploadProgress ?? 0) / 100)}`}
                                              className="transition-all duration-300"
                                            />
                                          </svg>
                                          <span className="absolute inset-0 flex items-center justify-center text-white text-[11px] font-semibold drop-shadow">
                                            {msg.uploadProgress ?? 0}%
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {hasVisibleCaption(msg.caption) && (
                                      <div className={`px-2.5 py-1.5 text-[14px] leading-snug break-words rounded-b-md max-w-[320px] shadow-sm ${msg.sender === 'Me'
                                          ? 'bg-[var(--message-me-bg)] text-[var(--message-me-text)]'
                                          : 'bg-[var(--message-other-bg)] text-[var(--message-other-text)]'
                                        }`}>
                                        {renderCaptionContent(msg.caption!)}
                                      </div>
                                    )}
                                    {!msg.isUploading && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          msg.attachments?.forEach((att, idx) => {
                                            const fileName = getFileNameFromUrl(att.url) || `image_${idx}.png`;
                                            handleDownloadFile(e, att.url, fileName);
                                          });
                                        }}
                                        className="absolute top-2 right-2 h-8 w-8 rounded-lg flex items-center justify-center border border-black/10 bg-white/80 text-[#1f2937] backdrop-blur-sm transition-all cursor-pointer opacity-0 group-hover/media-content:opacity-100 hover:bg-white hover:scale-110 active:scale-95"
                                        title="Tải xuống tất cả"
                                        aria-label="Download all media"
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                          <polyline points="7 10 12 15 17 10" />
                                          <line x1="12" x2="12" y1="15" y2="3" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                ) : msg.type === 'SHARE_CONTACT' ? (() => {
                                  let contact: any = {};
                                  try {
                                    contact = JSON.parse(msg.text || '{}');
                                  } catch {
                                    contact = {};
                                  }

                                  return (
                                    <div className="w-[286px] rounded-md overflow-hidden border border-[var(--border)] shadow-sm">
                                      <div className="relative bg-[#0068FF] px-4 pt-3.5 pb-4.5 min-h-[96px] overflow-hidden">
                                        <div className="absolute right-14 top-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-[22px] border-white/10 pointer-events-none" />
                                        <div className="flex items-center gap-2.5 pr-24">
                                          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white/30 bg-white/20 flex items-center justify-center">
                                            {contact.avatar ? (
                                              <img src={contact.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <span className="text-white font-bold text-xl">{(contact.fullName || '?').charAt(0)}</span>
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-bold text-[14px] text-white break-words leading-tight">{contact.fullName || t('common.unknown_user')}</div>
                                            {contact.phoneNumber && (
                                              <div className="text-[12px] text-white/80 mt-0.5">{contact.phoneNumber}</div>
                                            )}
                                          </div>
                                        </div>
                                        {contact.userId && (
                                          <div className="absolute bottom-2.5 right-3.5 bg-white rounded-md p-0.5 w-16 h-16 flex items-center justify-center">
                                            <img
                                              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(contact.phoneNumber || contact.userId)}`}
                                              alt="QR"
                                              className="w-[58px] h-[58px] object-contain"
                                            />
                                          </div>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 border-t border-[var(--border)] bg-[var(--card-bg)]">
                                        <button
                                          className="py-2.5 text-[14px] font-semibold text-[#0068FF] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer border-r border-[var(--border)]"
                                          onClick={() => {
                                            if (contact.userId) {
                                              toast.info(`${contact.fullName}${contact.phoneNumber ? ': ' + contact.phoneNumber : ''}`);
                                            }
                                          }}
                                        >
                                          {t('share_contact.message_btn')}
                                        </button>
                                        <button
                                          className="py-2.5 text-[14px] font-semibold text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (contact.userId) {
                                              onOpenProfile?.(contact.userId);
                                            }
                                          }}
                                        >
                                          Xem hồ sơ
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })() : msg.type === 'MEDIA' ? (() => {
                                  // For optimistic messages (isUploading), use msg.fileName; after upload use URL
                                  const displayName = msg.fileName || getFileNameFromUrl(msg.text);
                                  const extSource = msg.fileName || msg.text;
                                  const ext = getFileExtension(extSource).toUpperCase();
                                  const isPDF = ext === 'PDF';
                                  const isWord = ['DOC', 'DOCX'].includes(ext);
                                  const isExcel = ['XLS', 'XLSX'].includes(ext);

                                  return (
                                    <>
                                    <div className={`border rounded-xl p-3 flex items-center gap-3 min-w-[280px] max-w-[380px] hover:shadow-lg transition-all group/file relative ${msg.isUploading ? 'cursor-default opacity-80' : 'cursor-pointer'} ${msg.sender === 'Me' ? 'bg-[#EBF5FF] border-[#D0E7FF]' : 'bg-[#F0F7FF] border-[#E0EFFF]'}`} onClick={() => !msg.isUploading && window.open(getPreviewUrl(msg.text), '_blank')}>
                                      <div className={`h-12 w-10 rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-sm shrink-0 ${isPDF ? 'bg-[#FF5C5C]' : isWord ? 'bg-[#2B7CF6]' : isExcel ? 'bg-[#1D6F42]' : 'bg-gray-400'}`}>
                                        {msg.isUploading ? (
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                        ) : isWord ? (
                                          <span className="text-[14px]">W</span>
                                        ) : isPDF ? (
                                          <span className="text-[8px]">PDF</span>
                                        ) : (
                                          <span className="text-[8px]">{ext.slice(0, 3)}</span>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-[13px] font-semibold text-[#1f2329] truncate mb-0.5">{displayName}</h4>
                                        <div className="flex items-center gap-2 text-[10px] text-[#647081] opacity-90">
                                          {msg.fileSize && <span>{formatFileSize(msg.fileSize)}</span>}
                                          <div className="flex items-center gap-1">
                                            {msg.isUploading ? (
                                              <span className="italic">{t('chat.upload.uploading')} {msg.uploadProgress != null ? `${msg.uploadProgress}%` : ''}</span>
                                            ) : (
                                              <>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><path d="M17.5 11.5c.34-.33.74-.5 1.14-.5a1.88 1.88 0 1 1 0 3.75h-10a3.13 3.13 0 1 1 0-6.25c.34 0 .66.05.97.15A4.38 4.38 0 1 1 17.5 11.5Z" /></svg>
                                                <span>{t('chat.status.on_cloud')}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {!msg.isUploading && (
                                        <button
                                          onClick={(e) => handleDownloadFile(e, msg.text, displayName)}
                                          className="h-8 w-8 rounded-md flex items-center justify-center border border-[#D0E7FF] group-hover/file:bg-white transition-all shrink-0 cursor-pointer hover:scale-110 active:scale-95 shadow-sm bg-white/50"
                                          title="Tải xuống"
                                        >
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#1f2329]">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" x2="12" y1="15" y2="3" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                    {hasVisibleCaption(msg.caption) && (
                                      <div className={`px-3 py-2 text-[13.5px] leading-snug break-words rounded-b-xl max-w-[380px] border border-t-0 ${
                                        msg.sender === 'Me'
                                          ? 'bg-[#dceeff] border-[#D0E7FF] text-[#1a3a5c]'
                                          : 'bg-[#e8f3ff] border-[#E0EFFF] text-[#1a3a5c]'
                                      }`}>
                                        {renderCaptionContent(msg.caption!)}
                                      </div>
                                    )}
                                    </>
                                  );
                                })() : msg.type === 'POLL' ? (
                                  <PollCard msg={msg} currentUserId={currentUser?.id} selectedChat={selectedChat} t={t} />
                                ) : (
                                  <div className={`${showTimestamp || msg.isEdited ? 'pb-5' : 'pb-1'} relative min-h-[48px] flex flex-col justify-between`}>
                                    <div className="block break-words whitespace-pre-wrap leading-normal text-[15px]">
                                      {msg.type === 'VOICE' ? (
                                        <VoicePlayer url={msg.text} duration={msg.voiceDuration} isMe={msg.sender === 'Me'} />
                                      ) : (
                                        <>
                                          {(() => {
                                            // Only extract URLs from plain text, not HTML content (avoids matching src/href attributes from emoji <img> tags)
                                            const plainDisplayText = getPlainTextFromMessage(displayText);
                                            const isJsonOrHtml = /[a-z][\s\S]*>/i.test(replaceEmojiWithHtml(getMessageHtml(displayText))) || displayText.trim().startsWith('{');
                                            const urlMatch = !isJsonOrHtml ? plainDisplayText.match(/(https?:\/\/[^\s]+|fruvia\.chat\/g\/[^\s]+)/) : null;
                                            const url = msg.type === 'LINK' ? plainDisplayText : (urlMatch ? urlMatch[0] : null);

                                            if (url && url.includes('/g/')) {
                                              // If it's a group join link, hide the raw link text if it's the only content
                                              const cleanText = displayText.replace(url, '').trim();
                                              return (
                                                <>
                                                  {cleanText && (/<[a-z][\s\S]*>/i.test(cleanText) ? (
                                                    <div className="tiptap-content" dangerouslySetInnerHTML={{ __html: replaceEmojiWithHtml(cleanText) }} />
                                                  ) : (
                                                    renderText(cleanText, msg.mentions)
                                                  ))}
                                                  <GroupJoinLinkPreview url={url} onSelectConversation={vm.onSelectConversation} />
                                                </>
                                              );
                                            }

                                            return (
                                              <>
                                                {isJsonOrHtml ? (
                                                  <div className="tiptap-content" dangerouslySetInnerHTML={{ __html: replaceEmojiWithHtml(displayText) }} />
                                                ) : (
                                                  renderText(displayText, msg.mentions)
                                                )}
                                                {url && (
                                                  <LinkPreview
                                                    url={url}
                                                    title={msg.linkTitle}
                                                    description={msg.linkDescription}
                                                    thumbnail={msg.linkThumbnail}
                                                  />
                                                )}
                                              </>
                                            );
                                          })()}
                                        </>
                                      )}
                                    </div>
                                    {(showTimestamp || msg.isEdited) && (
                                      <div className="absolute bottom-1.5 right-0 text-[11px] text-[var(--sub-text)] opacity-75 font-normal leading-none flex items-center gap-1">
                                        {msg.isEdited && <span className="italic opacity-70">{t('chat.status.edited')}</span>}
                                        {showTimestamp && msg.time}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className={`absolute flex items-center gap-1 z-20 ${msg.sender === 'Me' ? (msg.type === 'IMAGE' || msg.type === 'IMAGE_GROUP' || msg.type === 'VIDEO' ? 'bottom-0 left-2 translate-y-[50%]' : 'bottom-0 left-0 translate-y-[50%]') : (msg.type === 'IMAGE' || msg.type === 'IMAGE_GROUP' || msg.type === 'VIDEO' ? 'bottom-0 right-2 translate-y-[50%]' : 'bottom-0 right-0 translate-y-[50%]')}`}>
                                {msg.reactions && msg.reactions.length > 0 && (
                                  <div onClick={(e) => { e.stopPropagation(); setReactionModalMessageId(msg.id); }} className="flex items-center cursor-pointer shadow-md rounded-full bg-[var(--card-bg)] border border-[var(--border)] px-1.5 py-0.5 h-[22px] hover:scale-105 transition-transform">
                                    <div className="flex -space-x-0.5 mr-1">
                                      {(() => {
                                        const counts: Record<string, number> = {};
                                        msg.reactions.forEach((reaction: any) => {
                                          counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
                                        });
                                        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([emoji], idx) => (
                                          <div key={`emoji-${idx}`} className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[12px] bg-[var(--card-bg)]">{emoji}</div>
                                        ));
                                      })()}
                                    </div>
                                    <span className="text-[12px] font-bold text-[var(--text)] leading-none">{msg.reactions.length}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {(() => {
                              const isLastMyMsg = msg.sender === 'Me' && (() => {
                                for (let k = index + 1; k < messages.length; k += 1) {
                                  if (messages[k].sender === 'Me') return false;
                                }
                                return true;
                              })();
                              const showReadStatus = msg.sender === 'Me' && isLastMyMsg
                                && !selectedChat.isCloud && !selectedChat.isAi;

                              const readersForThisMsg = showReadStatus
                                ? Object.values(readReceipts).filter(readReceipt => {
                                  const readerIdx = messages.findIndex(item => item.id === readReceipt.messageId);
                                  return readerIdx >= index;
                                })
                                : [];

                              // "Đã nhận": có delivery receipt từ người kia
                              const otherUserId = selectedChat.otherUserId || selectedChat.recipientId;
                              const isDelivered = showReadStatus && otherUserId
                                ? (() => {
                                    const receipt = deliveredReceipts[String(otherUserId)];
                                    if (!receipt) return false;
                                    const deliveredIdx = messages.findIndex(item => item.id === receipt.messageId);
                                    return deliveredIdx >= index;
                                  })()
                                : false;

                              const showSection = msg.type !== 'TEXT' || showReadStatus;
                              if (!showSection) return null;

                              return (
                                <div className={`mt-2 flex items-center gap-2 ${msg.sender === 'Me' ? 'justify-end' : 'justify-start'}`}>
                                  {msg.type !== 'TEXT' && msg.type !== 'LINK' && showTimestamp && (
                                    <span className="text-[11px] text-[var(--sub-text)] opacity-100 font-medium">{msg.time}</span>
                                  )}
                                  {showReadStatus && (() => {
                                    // 1. Đã xem — có read receipt
                                    if (readersForThisMsg.length > 0) {
                                      return (
                                        <div className="flex items-center gap-1">
                                          {readersForThisMsg.slice(0, 3).map((reader, idx) => (
                                            <div key={`reader-${idx}`} className="w-4 h-4 rounded-full overflow-hidden border border-white">
                                              {reader.avatarUrl ? (
                                                <img src={reader.avatarUrl} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold">{reader.displayName?.charAt(0)}</div>
                                              )}
                                            </div>
                                          ))}
                                          <div className="bg-blue-500/10 rounded-full px-2 py-0.5 flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /><polyline points="14 6 3 17" /></svg>
                                            <span>{t('chat.status.seen')}</span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    // Group: đã xem nếu có bất kỳ readReceipt nào
                                    if (selectedChat.isGroup && Object.keys(readReceipts).length > 0) {
                                      return (
                                        <div className="bg-blue-500/10 rounded-full px-2 py-0.5 flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /><polyline points="14 6 3 17" /></svg>
                                          <span>{t('chat.status.seen')}</span>
                                        </div>
                                      );
                                    }

                                    // 2. Đã nhận — có delivery ACK từ người nhận
                                    if (isDelivered) {
                                      return (
                                        <div className="bg-green-500/10 rounded-full px-2 py-0.5 flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /><polyline points="14 6 3 17" /></svg>
                                          <span>{t('chat.status.received')}</span>
                                        </div>
                                      );
                                    }

                                    // 3. Đã gửi — chưa có delivery ACK
                                    return (
                                      <div className="bg-black/5 dark:bg-white/10 rounded-full px-2 py-0.5 flex items-center gap-1 text-[11px] text-[var(--sub-text)] font-medium">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--sub-text)] opacity-70"><polyline points="20 6 9 17 4 12" /></svg>
                                        <span>{t('chat.status.sent')}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              );
                            })()}
                          </div>

                          {!msg.isRecalled && (
                            <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity h-fit ${msg.sender === 'Me' ? 'mr-0.5 flex-row-reverse self-center' : 'ml-0.5 self-center'}`}>
                              {!isSticker && !isAiConversation && (
                              <div className="relative group/react">
                                <div className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer text-[13px] select-none leading-none">😊</div>
                                <div className={`absolute ${msg.sender === 'Me' ? 'right-0' : 'left-0'} bottom-full opacity-0 invisible group-hover/react:opacity-100 group-hover/react:visible transition-all duration-150 flex items-center gap-0.5 bg-[var(--card-bg)] rounded-full px-2 py-1 shadow-xl border border-[var(--border)] z-50 whitespace-nowrap`}>
                                  {(['👍', '❤️', '😂', '😲', '😭', '😡'] as const).map((emoji) => (
                                    <button key={emoji} onClick={(e) => { e.stopPropagation(); vm.handleReactMessage(String(msg.id), emoji); }} className="w-7 h-7 text-[20px] hover:scale-125 transition-transform cursor-pointer flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)]">{emoji}</button>
                                  ))}
                                </div>
                              </div>
                              )}

                              {!isSticker && !isAiConversation && (
                              <button title={t('chat.actions.forward')} onClick={() => setForwardingMsg({ id: msg.id, text: msg.text, type: msg.type, sender: msg.sender, caption: msg.caption || (msg.type !== 'TEXT' ? msg.text : undefined) })} className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 10l5-5 5 5M8 6v8a4 4 0 004 4h9" /></svg></button>
                              )}
                              <button title={t('chat.actions.more')} onClick={(e) => openContextMenu(e, msg)} className="w-6 h-6 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] border border-[var(--border)]/10 shadow-sm transition-all cursor-pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg></button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {typingUsers.length > 0 && (
        <div className="flex flex-col gap-1 px-4 py-2 bg-[var(--chat-bg)] border-t border-[var(--border)]/20 flex-shrink-0">
          {typingUsers.map((user) => (
            <div key={user.userId} className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-[var(--border)] flex items-center justify-center bg-blue-50">
                {user.userId === AI_TYPING_USER_ID ? (
                  <FruviaChatbotAvatar className="w-full h-full" imageClassName="w-full h-full object-cover" />
                ) : user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-blue-600 font-bold text-[10px]">{user.displayName?.charAt(0)?.toUpperCase() || '?'}</span>
                )}
              </div>
              <span className="text-[13px] italic text-[var(--sub-text)] opacity-80 select-none">
                {user.displayName} {t('chat.typing.suffix_one')}...
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const ChatMessageList = React.memo(ChatMessageListImpl);
