import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiClient } from '@/lib/http/apiClient';

interface ForwardModalProps {
    message: { id: string; text: string; type: string; sender: string };
    currentConversationId: string;
    currentUserId?: string;
    onClose: () => void;
    onForwarded?: (conversationId: string) => void;
}

export function ForwardModal({ message, currentConversationId, currentUserId, onClose, onForwarded }: ForwardModalProps) {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

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

    const filtered = conversations.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase())
    );

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
                const payload: any = {
                    conversationId: convId,
                    content: message.text,
                    messageType: message.type,
                    forwardedFromMessageId: message.id,
                };
                await apiClient.post('/messages', payload);
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
        switch (message.type) {
            case 'IMAGE': return `📷 ${t('chat.snippet.image')}`;
            case 'VIDEO': return `🎬 ${t('chat.snippet.video')}`;
            case 'MEDIA': return `📎 ${t('chat.snippet.file')}`;
            case 'VOICE': return `🎤 ${t('chat.snippet.voice')}`;
            default: return message.text?.length > 60 ? message.text.slice(0, 60) + '...' : message.text;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[1px]" onClick={onClose}>
            <div
                className="bg-[var(--card-bg)] w-[440px] max-w-[95vw] max-h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[var(--border)] animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                    <h3 className="text-[16px] font-bold text-[var(--text)]">{t('chat.forward.title')}</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--hover-bg)] text-[var(--sub-text)] transition-colors cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                {/* Message Preview */}
                <div className="px-5 py-3 bg-[var(--hover-bg)]/50 border-b border-[var(--border)]">
                    <div className="text-[12px] text-[var(--sub-text)] mb-1">{t('chat.forward.message_preview')}</div>
                    <div className="text-[14px] text-[var(--text)] truncate font-medium">{getSnippet()}</div>
                </div>

                {/* Search */}
                <div className="px-5 py-3 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2 bg-[var(--hover-bg)] rounded-lg px-3 py-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--sub-text)] shrink-0"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('chat.forward.search_placeholder')}
                            className="w-full bg-transparent outline-none text-[14px] text-[var(--text)] placeholder:text-[var(--sub-text)] placeholder:opacity-50"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[340px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="w-6 h-6 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex items-center justify-center py-10 text-[14px] text-[var(--sub-text)]">
                            {t('chat.forward.no_results')}
                        </div>
                    ) : (
                        filtered.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => toggleSelect(conv.id)}
                                className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer ${selected.has(conv.id) ? 'bg-blue-50/50 dark:bg-blue-500/10' : ''}`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected.has(conv.id) ? 'bg-[#0068FF] border-[#0068FF]' : 'border-gray-300 dark:border-gray-600'}`}>
                                    {selected.has(conv.id) && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    )}
                                </div>
                                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    {conv.avatar ? (
                                        <img src={conv.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[#0068FF] font-bold text-sm">{conv.name?.charAt(0) || '?'}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="text-[14px] font-medium text-[var(--text)] truncate flex items-center gap-1.5">
                                        {conv.name}
                                        {conv.isGroup && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--sub-text)] opacity-60 shrink-0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--card-bg)]">
                    <div className="text-[13px] text-[var(--sub-text)]">
                        {selected.size > 0 && t('chat.forward.selected', { count: selected.size })}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-[14px] font-medium text-[var(--sub-text)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors cursor-pointer"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleForward}
                            disabled={selected.size === 0 || sending}
                            className="px-5 py-2 text-[14px] font-bold text-white bg-[#0068FF] hover:bg-[#0052CC] rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {sending ? t('chat.forward.sending') : t('chat.forward.send_btn')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
