import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiClient } from '@/lib/http/apiClient';

interface ForwardModalProps {
  message: { id: string; text: string; type: string; sender: string; caption?: string };
  currentConversationId: string;
  currentUserId?: string;
  onClose: () => void;
  onForwarded?: (conversationId: string) => void;
}

type TabType = 'recent' | 'group' | 'friends';

export function ForwardModal({ message, currentConversationId, currentUserId, onClose, onForwarded }: ForwardModalProps) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('recent');
  const [note, setNote] = useState('');
  const [attachDesc, setAttachDesc] = useState(!!message.caption);

  useEffect(() => {
    setAttachDesc(!!message.caption);
  }, [message.id, message.caption]);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/conversations');
        const data = (res && res.success && res.data) ? res.data : res;
        if (Array.isArray(data)) {
          const mapped = data
            .map((c: any) => {
              const id = c.conversationId || c.conversation_id;
              const isSelf = c.conversationType === 'SELF' || c.conversation_type === 'SELF';
              let name = c.conversationName || c.conversation_name || '';
              let avatar = c.conversationAvatarUrl || c.conversation_avatar_url || '';

              if ((c.conversationType === 'PRIVATE' || c.conversation_type === 'PRIVATE') && c.members) {
                const other = c.members.find((m: any) => (m.userId || m.user_id) !== currentUserId);
                if (other) {
                  name = other.displayName || other.display_name || name;
                  avatar = other.avatarUrl || other.avatar_url || avatar;
                }
              }

              return {
                id,
                name: isSelf ? t('chat.self_cloud') : name,
                avatar,
                isGroup: c.conversationType === 'GROUP' || c.conversation_type === 'GROUP',
                isSelf,
              };
            })
            .filter((c: any) => c.id !== currentConversationId);
          setConversations(mapped);
        }
      } catch (e) {
        console.error('Failed to fetch conversations for forward:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [currentConversationId, currentUserId, t]);

  const filtered = conversations.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'group') return matchesSearch && c.isGroup;
    if (activeTab === 'friends') return matchesSearch && !c.isGroup && !c.isSelf;
    return matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleForward = async () => {
    if (selected.size === 0) return;
    setSending(true);
    try {
      const promises = Array.from(selected).map(async (convId) => {
        // First send the media
        const payload: any = {
          conversationId: convId,
          content: message.text,
          messageType: message.type,
          forwardedFromMessageId: message.id,
          caption: attachDesc ? message.caption : undefined,
        };
        await apiClient.post('/messages', payload);

        // Then send the note if provided
        if (note.trim()) {
          await apiClient.post('/messages', {
            conversationId: convId,
            content: note.trim(),
            messageType: 'TEXT',
          });
        }
        onForwarded?.(convId);
      });
      await Promise.all(promises);
      toast.success(t('chat.forward.success', { count: selected.size }));
      onClose();
    } catch (e) {
      console.error('Forward failed:', e);
      toast.error(t('chat.forward.error'));
    } finally {
      setSending(false);
    }
  };

  const getSnippet = () => {
    const stripHtml = (html: string) => (html || '').replace(/<[^>]*>?/gm, '');
    switch (message.type) {
      case 'IMAGE': return 'Chia sẻ hình ảnh';
      case 'VIDEO': return 'Chia sẻ video';
      case 'MEDIA': return 'Chia sẻ tệp tin';
      case 'VOICE': return 'Chia sẻ tin nhắn thoại';
      default: {
        const plain = stripHtml(message.text || '');
        return plain.length > 60 ? plain.slice(0, 60) + '...' : plain;
      }
    }
  };

  const isSelected = (id: string) => selected.has(id);

  const renderMessageIcon = () => {
    if (message.type === 'IMAGE' || message.type === 'VIDEO') {
      return (
        <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 bg-white">
          <img src={message.text} alt="" className="w-full h-full object-cover" />
        </div>
      );
    }

    let bgClass = 'bg-gradient-to-br from-blue-500 to-indigo-600';
    let icon = (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    );

    switch (message.type) {
      case 'MEDIA':
        bgClass = 'bg-gradient-to-br from-slate-400 to-slate-500';
        icon = (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        );
        break;
      case 'VOICE':
        bgClass = 'bg-gradient-to-br from-teal-400 to-emerald-500';
        icon = (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        );
        break;
      case 'STICKER':
        bgClass = 'bg-gradient-to-br from-amber-400 to-orange-500';
        icon = (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        );
        break;
      case 'SHARE_CONTACT':
        bgClass = 'bg-gradient-to-br from-indigo-500 to-purple-600';
        icon = (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
        );
        break;
    }

    return (
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white shadow-sm ${bgClass}`}>
        {icon}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white w-[480px] max-w-[95vw] max-h-[680px] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#1A1A1A]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100">
          <h3 className="text-[17px] font-semibold text-[#081C36]">Chia sẻ</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Content Container (Scrollable part) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-4 py-3">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full bg-white border border-gray-300 rounded-[4px] py-[7px] pl-10 pr-4 text-[14px] focus:outline-none focus:border-[#0068FF] transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 flex items-center justify-between border-b border-gray-100 mb-1">
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('recent')}
                className={`pb-2 text-[14px] font-medium transition-colors relative cursor-pointer ${activeTab === 'recent' ? 'text-[#0068FF]' : 'text-gray-600 hover:text-black'}`}
              >
                Gần đây
                {activeTab === 'recent' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0068FF]" />}
              </button>
              <button 
                onClick={() => setActiveTab('group')}
                className={`pb-2 text-[14px] font-medium transition-colors relative cursor-pointer ${activeTab === 'group' ? 'text-[#0068FF]' : 'text-gray-600 hover:text-black'}`}
              >
                Nhóm trò chuyện
                {activeTab === 'group' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0068FF]" />}
              </button>
              <button 
                onClick={() => setActiveTab('friends')}
                className={`pb-2 text-[14px] font-medium transition-colors relative cursor-pointer ${activeTab === 'friends' ? 'text-[#0068FF]' : 'text-gray-600 hover:text-black'}`}
              >
                Bạn bè
                {activeTab === 'friends' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0068FF]" />}
              </button>
            </div>
            <button className="flex items-center gap-1 text-[13px] text-gray-600 hover:text-black cursor-pointer">
              Phân loại <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[180px] max-h-[320px]">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                <p className="text-[14px]">Không tìm thấy kết quả</p>
              </div>
            ) : (
              <div className="py-1">
                {filtered.map((conv) => (
                  <label
                    key={conv.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected(conv.id)}
                        onChange={() => toggleSelect(conv.id)}
                        className="hidden"
                      />
                      <div className={`w-[20px] h-[20px] rounded-[4px] border-2 flex items-center justify-center transition-all ${isSelected(conv.id) ? 'bg-[#0068FF] border-[#0068FF]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                        {isSelected(conv.id) && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </div>
                    </div>
                    <div className="w-[42px] h-[42px] rounded-full overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
                      {conv.avatar ? (
                        <img src={conv.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#0068FF]/10 flex items-center justify-center">
                          <span className="text-[#0068FF] font-bold text-[15px]">{conv.name?.charAt(0) || '?'}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-[15px] font-medium text-[#081C36] truncate">
                        {conv.name}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Note Area */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="bg-[#F1F2F4] rounded-lg p-3 mb-3">
             <div className="flex items-center gap-3">
                {renderMessageIcon()}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[#081C36]">
                    {getSnippet()}
                  </div>
                  {attachDesc && message.caption && (
                    <div className="text-[13px] text-gray-500 truncate mt-0.5">
                      {message.caption}
                    </div>
                  )}
                </div>
             </div>
             <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => setAttachDesc(!attachDesc)}
                    className={`w-9 h-5 rounded-full relative transition-colors duration-200 cursor-pointer ${attachDesc ? 'bg-[#0068FF]' : 'bg-gray-300'}`}
                   >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200 ${attachDesc ? 'left-5' : 'left-1'}`} />
                   </button>
                   <span className="text-[13px] text-gray-700">Đính kèm mô tả</span>
                </div>
             </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="w-full h-10 bg-transparent outline-none text-[14px] resize-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 h-16 border-t border-gray-100 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 text-[14px] font-semibold text-[#081C36] hover:bg-gray-100 rounded-[4px] transition-colors cursor-pointer bg-[#EAEDF0]"
          >
            Hủy
          </button>
          <button
            onClick={handleForward}
            disabled={selected.size === 0 || sending}
            className="px-6 py-2 text-[14px] font-semibold text-white bg-[#A7D5FF] disabled:opacity-100 disabled:bg-[#A7D5FF] enabled:bg-[#0068FF] enabled:hover:bg-[#0052CC] rounded-[4px] transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {sending ? 'Đang gửi...' : 'Chia sẻ'}
          </button>
        </div>
      </div>
    </div>
  );
}

