import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDownIcon,
  ClockIcon,
} from '@/components/ui/Icons';
import Image from 'next/image';
import { FruviaChatbotAvatar } from '@/components/ui/FruviaChatbotAvatar';
import { GroupMediaViewer } from '@/features/chat/components/ChatWindow/GroupMediaViewer';
import { apiClient } from '@/lib/http/apiClient';
import { friendService } from '@/features/friends';
import { toast } from 'sonner';
import { websocketService } from '@/lib/realtime/websocketService';

interface ChatInfoSidebarProps {
  onClose: () => void;
  onOpenDataModal?: () => void;
  conversationId?: string | number;
  isGroup?: boolean;
  isCloud?: boolean;
  isAi?: boolean;
  conversationName?: string;
  conversationAvatar?: string;
  currentUser?: any;
  onClearChat?: () => void;
  refreshTrigger?: number;
  onForward?: (item: any) => void;
  initialIsPinned?: boolean;
  groupAvatarUrls?: string[];
  onUpdateMeta?: (id: string | number, updates: { name?: string; avatar?: string }) => void;
  onTogglePin?: (id: string | number) => void;
  permissions?: any;
}

const LINK_PLACEHOLDER_REGEX = /^\s*\[?LINK\]?\s*$/i;

const getPinnedPreviewText = (pin: any, linkItems: any[] = []) => {
  const messageType = String(pin?.messageType || '').toUpperCase();
  if (messageType !== 'LINK') {
    if (messageType !== 'TEXT') return `[${pin?.messageType}]`;
    return String(pin?.content || '');
  }

  const matchedLinkItem = linkItems.find((item) => {
    const pinMessageId = String(pin?.messageId || '');
    const itemMessageId = String(item?.messageId || item?.id || '');
    return Boolean(pinMessageId) && pinMessageId === itemMessageId;
  });

  const explicitUrl = String(pin?.linkUrl || pin?.link_url || pin?.url || '').trim();
  const content = String(pin?.content || '').trim();
  const extractedUrl =
    content.match(/(https?:\/\/[^\s]+)/)?.[0]
    || String(matchedLinkItem?.content || '').match(/(https?:\/\/[^\s]+)/)?.[0]
    || '';

  if (explicitUrl) return explicitUrl;
  if (extractedUrl) return extractedUrl;
  if (!LINK_PLACEHOLDER_REGEX.test(content) && content) return content;
  return '[Link]';
};

export function ChatInfoSidebar({ onClose, onOpenDataModal, conversationId, isGroup, isCloud, isAi, conversationName, conversationAvatar, currentUser, onClearChat, refreshTrigger = 0, onForward, initialIsPinned: isPinned = false, groupAvatarUrls = [], onUpdateMeta, onTogglePin, permissions }: ChatInfoSidebarProps) {
  const { t } = useTranslation();
  const aiQuickCommands = [
    { code: t('info.ai.quick_commands_prompt.me_name'), desc: t('info.ai.quick_commands.me_name') },
    { code: t('info.ai.quick_commands_prompt.me_dob'), desc: t('info.ai.quick_commands.me_dob') },
    { code: t('info.ai.quick_commands_prompt.me_profile'), desc: t('info.ai.quick_commands.me_profile') },
    { code: t('info.ai.quick_commands_prompt.files_list'), desc: t('info.ai.quick_commands.files_list') },
    { code: t('info.ai.quick_commands_prompt.files_delete'), desc: t('info.ai.quick_commands.files_delete') },
    { code: t('info.ai.quick_commands_prompt.branch_delete'), desc: t('info.ai.quick_commands.branch_delete') },
    { code: t('info.ai.quick_commands_prompt.image'), desc: t('info.ai.quick_commands.image') },
    { code: t('info.ai.quick_commands_prompt.image_pro'), desc: t('info.ai.quick_commands.image_pro') },
    { code: t('info.ai.quick_commands_prompt.sketch'), desc: t('info.ai.quick_commands.sketch') },
    { code: t('info.ai.quick_commands_prompt.wallpaper'), desc: t('info.ai.quick_commands.wallpaper') },
  ];
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [showMedia, setShowMedia] = React.useState(false);
  const [showFiles, setShowFiles] = React.useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [fileItems, setFileItems] = useState<any[]>([]);
  const [linkItems, setLinkItems] = useState<any[]>([]);
  const [showLinks, setShowLinks] = React.useState(false);

  // Pinned messages
  const [showPinned, setShowPinned] = React.useState(true);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showQuickCommands, setShowQuickCommands] = useState(false);

  useEffect(() => {
    if (conversationId && !isAi) {
      fetchPinnedMessages();
    } else {
      setPinnedMessages([]);
    }
  }, [conversationId, isAi, refreshTrigger]);

  const fetchPinnedMessages = async () => {
    try {
      const res: any = await apiClient.get(`/messages/conversations/${conversationId}/pinned`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setPinnedMessages(list);
    } catch {
      setPinnedMessages([]);
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      await apiClient.delete(`/messages/${messageId}/pin`);
      toast.success(t('chat.pin.unpin_success'));
      fetchPinnedMessages();
    } catch (e: any) {
      toast.error(e?.message || t('chat.pin.unpin_error'));
    }
  };

  const handleClearChat = async () => {
    try {
      await apiClient.delete(`/messages/conversations/${conversationId}/all`);
      toast.success(t('info.ai.clear_chat.success'));
      onClearChat?.();
    } catch (e: any) {
      toast.error(e?.message || t('info.ai.clear_chat.error'));
    } finally {
      setShowClearModal(false);
    }
  };

  // Group member management state
  const [showMembers, setShowMembers] = React.useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState<'transfer' | 'leave'>('transfer');
  const [isMuted, setIsMuted] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [activeView, setActiveView] = useState<'main' | 'group-management'>('main');

  // Group Management Settings State
  const [groupSettings, setGroupSettings] = useState({
    editInfo: true,
    pinContent: true,
    createNotes: true,
    createPolls: true,
    sendMessages: true,
    memberApproval: false,
    highlightAdmin: true,
    newMemberRead: true
  });

  // Sync group settings from permissions prop
  useEffect(() => {
    if (permissions) {
      setGroupSettings({
        editInfo: permissions.canEditInfo ?? true,
        pinContent: permissions.canPinMessages ?? true,
        createNotes: permissions.canCreateNotes ?? true,
        createPolls: permissions.canCreatePolls ?? true,
        sendMessages: permissions.canSendMessages ?? true,
        memberApproval: permissions.isMemberApprovalRequired ?? false,
        highlightAdmin: permissions.isHighlightAdminMessages ?? true,
        newMemberRead: permissions.canNewMembersReadRecentMessages ?? true
      });
    }
  }, [permissions]);

  const toggleGroupSetting = async (key: keyof typeof groupSettings) => {
    const newValue = !groupSettings[key];
    
    // Update local state first for responsiveness
    setGroupSettings(prev => ({ ...prev, [key]: newValue }));

    try {
      // Map frontend key to backend field name
      const backendKeyMap: Record<string, string> = {
        editInfo: 'canEditInfo',
        pinContent: 'canPinMessages',
        createNotes: 'canCreateNotes',
        createPolls: 'canCreatePolls',
        sendMessages: 'canSendMessages',
        memberApproval: 'isMemberApprovalRequired',
        highlightAdmin: 'isHighlightAdminMessages',
        newMemberRead: 'canNewMembersReadRecentMessages'
      };

      const backendField = backendKeyMap[key];
      await apiClient.patch(`/conversations/${conversationId}/permissions`, {
        [backendField]: newValue
      });
      toast.success("Cập nhật thiết lập nhóm thành công");
    } catch (e: any) {
      // Rollback on error
      setGroupSettings(prev => ({ ...prev, [key]: !newValue }));
      toast.error(e?.message || "Không thể cập nhật thiết lập nhóm");
    }
  };

  const openAddMemberPanel = async () => {
    try {
      const friends = await friendService.getFriends();
      const existingMemberIds = members.map(m => m.userId);
      const filtered = friends.filter((f: any) => !existingMemberIds.includes(f.user_id || f.id));
      setFriendsList(filtered);
      setShowAddMember(true);
    } catch (e) {
      toast.error("Không thể tải danh sách bạn bè");
    }
  };

  const handleRenameGroup = async () => {
    if (!newName.trim()) {
      toast.error("Tên nhóm không được để trống");
      return;
    }
    setIsUpdatingName(true);
    try {
      await apiClient.patch(`/conversations/${conversationId}`, {
        conversationName: newName.trim()
      });
      onUpdateMeta?.(conversationId!, { name: newName.trim() });
      setShowRenameModal(false);
    } catch (e: any) {
      toast.error(e?.message || "Không thể đổi tên nhóm");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const meInGroup = members.find(m => String(m.userId) === String(currentUser?.id || currentUser?.user_id));
  const currentUserRole = meInGroup?.role;
  const isAdmin = currentUserRole === 'ADMIN';
  const isDeputy = currentUserRole === 'DEPUTY';
  const canAddMembers = isAdmin || isDeputy;

  const fetchMembers = useCallback(async () => {
    try {
      const res: any = await apiClient.get(`/conversations/${conversationId}/members`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setMembers(list);
    } catch (e) {
      console.error('Failed to fetch members:', e);
    }
  }, [conversationId]);

  // Fetch group members
  useEffect(() => {
    if (isGroup && conversationId) {
      fetchMembers();
    }
  }, [isGroup, conversationId, fetchMembers]);

  // Realtime sync for member tab when group membership changes in other clients.
  useEffect(() => {
    if (!isGroup || !conversationId) return;

    const chatSub = websocketService.subscribe(`/topic/chat/${conversationId}`, (msg) => {
      try {
        const parsed = JSON.parse(msg.body);
        const payload = parsed?.message || parsed;
        const payloadConversationId = String(payload?.conversationId || '');
        const messageType = String(payload?.messageType || payload?.type || '').toUpperCase();

        if (payloadConversationId === String(conversationId) && messageType === 'SYSTEM') {
          fetchMembers();
        }
      } catch (error) {
        console.error('Failed to parse chat realtime event:', error);
      }
    });

    const groupSub = currentUser?.id
      ? websocketService.subscribe(`/topic/group-events/${currentUser.id}`, (msg) => {
        try {
          const event = JSON.parse(msg.body);
          const eventConversationId = String(event?.conversationId || event?.id || '');

          if (eventConversationId && eventConversationId !== String(conversationId)) {
            return;
          }

          if (event?.type === 'REMOVED' || event?.type === 'DISSOLVED') {
            setMembers([]);
            return;
          }

          fetchMembers();
        } catch (error) {
          console.error('Failed to parse group realtime event:', error);
        }
      })
      : null;

    return () => {
      chatSub.unsubscribe();
      groupSub?.unsubscribe();
    };
  }, [isGroup, conversationId, currentUser?.id, fetchMembers]);

  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0 || addingMembers) return;
    setAddingMembers(true);
    try {
      await apiClient.post(`/conversations/${conversationId}/members`, selectedNewMembers);
      toast.success(t('group.member.add_success'));
      setShowAddMember(false);
      setSelectedNewMembers([]);
      fetchMembers();
    } catch (e: any) {
      toast.error(e.message || t('group.member.add_error'));
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    toast(t('group.member.remove_confirm', { name: memberName }), {
      description: t('group.member.remove_desc'),
      duration: 10000,
      action: {
        label: t('common.confirm'),
        onClick: async () => {
          try {
            await apiClient.delete(`/conversations/${conversationId}/members/${memberId}`);
            toast.success(t('group.member.remove_success', { name: memberName }));
            fetchMembers();
          } catch (e: any) {
            toast.error(e.message || t('group.member.remove_error'));
          }
        },
      },
      cancel: {
        label: t('common.cancel'),
        onClick: () => { },
      },
    });
  };

  const handleLeaveGroup = () => {
    if (isAdmin) {
      // Admin must pick a successor — open transfer modal in "leave" mode
      // Admin phải chọn người kế nhiệm — mở modal chuyển quyền ở chế độ "rời nhóm"
      setTransferReason('leave');
      setShowTransferModal(true);
      return;
    }
    toast(t('group.leave.confirm'), {
      description: t('group.leave.desc'),
      duration: 10000,
      action: {
        label: t('common.confirm'),
        onClick: async () => {
          try {
            await apiClient.post(`/conversations/${conversationId}/leave`, {});
            toast.success(t('group.leave.success'));
            window.location.reload();
          } catch (e: any) {
            toast.error(e.message || t('group.leave.error'));
          }
        },
      },
      cancel: {
        label: t('common.cancel'),
        onClick: () => { },
      },
    });
  };

  const handleDissolveGroup = () => {
    toast(t('group.disband.confirm'), {
      description: t('group.disband.desc'),
      duration: 10000,
      action: {
        label: t('common.confirm'),
        onClick: async () => {
          try {
            await apiClient.delete(`/conversations/${conversationId}/dissolve`);
            toast.success(t('group.disband.success'));
            window.location.reload();
          } catch (e: any) {
            toast.error(e.message || t('group.disband.error'));
          }
        },
      },
      cancel: {
        label: t('common.cancel'),
        onClick: () => { },
      },
    });
  };

  // Change member role (promote/demote) — Thay đổi quyền thành viên
  const handleChangeRole = (targetUserId: string, targetName: string, newRole: 'DEPUTY' | 'MEMBER') => {
    const roleLabel = newRole === 'DEPUTY' ? t('group.role.deputy_title') : t('group.role.member_title');
    toast(t('group.role.change_confirm', { name: targetName, role: roleLabel }), {
      duration: 10000,
      action: {
        label: t('common.confirm'),
        onClick: async () => {
          try {
            await apiClient.patch(`/conversations/${conversationId}/members/${targetUserId}/role`, { role: newRole });
            toast.success(t('group.role.change_success', { name: targetName, role: roleLabel }));
            fetchMembers();
          } catch (e: any) {
            toast.error(e.message || t('group.role.change_error'));
          }
        },
      },
      cancel: { label: t('common.cancel'), onClick: () => { } },
    });
    setOpenMenuId(null);
  };

  // Transfer ownership — Chuyển quyền Trưởng nhóm
  const handleTransferOwnership = (newAdminId: string, newAdminName: string) => {
    toast(t('group.transfer.confirm', { name: newAdminName }), {
      description: t('group.transfer.desc'),
      duration: 15000,
      action: {
        label: t('common.confirm'),
        onClick: async () => {
          try {
            if (transferReason === 'leave') {
              // Transfer + leave in one flow
              await apiClient.post(`/conversations/${conversationId}/leave`, { successorId: newAdminId });
              toast.success(t('group.transfer.leave_success', { name: newAdminName }));
              window.location.reload();
            } else {
              await apiClient.post(`/conversations/${conversationId}/transfer`, { newAdminId });
              toast.success(t('group.transfer.success', { name: newAdminName }));
              fetchMembers();
            }
            setShowTransferModal(false);
          } catch (e: any) {
            toast.error(e.message || t('group.transfer.error'));
          }
        },
      },
      cancel: { label: t('common.cancel'), onClick: () => { } },
    });
  };


  useEffect(() => {
    if (isCloud) fetchStats();
  }, [isCloud]);

  // Real-time storage update via WebSocket
  useEffect(() => {
    if (!isCloud || !currentUser?.id) return;
    const topic = `/topic/storage/${currentUser.id}`;
    const sub = websocketService.subscribe(topic, () => {
      fetchStats();
    });
    return () => {
      sub.unsubscribe();
    };
  }, [isCloud, currentUser?.id]);

  useEffect(() => {
    if (conversationId) {
      fetchMedia();
    }
  }, [conversationId, refreshTrigger]);

  const fetchMedia = async () => {
    try {
      const res: any = await apiClient.get(`/messages/conversation/${conversationId}/media`);
      const items = Array.isArray(res) ? res : (res?.data || []);

      const mappedItems = items.map((m: any) => {
        // Try to find sender info from members list
        const member = members.find(mem => String(mem.userId) === String(m.senderId || m.sender_id || m.userId || m.user_id));
        const isMe = String(m.senderId || m.sender_id || m.userId || m.user_id) === String(currentUser?.id || currentUser?.user_id);

        return {
          ...m,
          messageId: m.messageId || m.id,
          senderName: m.senderName || m.sender || m.senderDisplayName || (isMe ? (currentUser?.full_name || currentUser?.displayName) : member?.displayName) || member?.userName,
          senderAvatar: m.senderAvatar || m.senderAvatarUrl || m.avatar || (isMe ? (currentUser?.avatar_url || currentUser?.avatar) : member?.avatarUrl) || member?.avatar,
          caption: m.caption || m.text
        };
      });

      const imagesAndVideos = mappedItems
        .filter((m: any) => m.messageType === 'IMAGE' || m.messageType === 'VIDEO')
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const files = mappedItems
        .filter((m: any) => m.messageType === 'MEDIA')
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setMediaItems(imagesAndVideos);
      setFileItems(files);
      setShowMedia(imagesAndVideos.length > 0);
      setShowFiles(files.length > 0);

      // Fetch links from common message list or specific endpoint
      try {
        const linksRes: any = await apiClient.get(`/messages/conversation/${conversationId}/links`);
        const links = Array.isArray(linksRes) ? linksRes : (linksRes?.data || []);
        setLinkItems(links);
        setShowLinks(links.length > 0);
      } catch (e) {
        console.log("No specific links endpoint found, showing empty links");
        setLinkItems([]);
        setShowLinks(false);
      }
    } catch (error) {
      console.error("Failed to fetch media:", error);
      setMediaItems([]);
      setFileItems([]);
      setLinkItems([]);
      setShowMedia(false);
      setShowFiles(false);
      setShowLinks(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res: any = await apiClient.get('/storage/me');
      if (res) setStats(res);
    } catch (error) {
      console.error("Failed to fetch sidebar stats:", error);
    }
  };

  const totalPossibleSizeMB = 500;
  const currentTotalMB = stats?.totalSize ? (stats.totalSize / (1024 * 1024)) : 0;
  const usagePercentage = Math.min((currentTotalMB / totalPossibleSizeMB) * 100, 100);

  const imagePercentage = stats?.imageSize ? (stats.imageSize / stats.totalSize) * usagePercentage : 0;
  const videoPercentage = stats?.videoSize ? (stats.videoSize / stats.totalSize) * usagePercentage : 0;
  const filePercentage = stats?.fileSize ? (stats.fileSize / stats.totalSize) * usagePercentage : 0;
  const voicePercentage = stats?.voiceSize ? (stats.voiceSize / stats.totalSize) * usagePercentage : 0;

  if (activeView === 'group-management') {
    if (!(isAdmin || isDeputy)) {
      setActiveView('main');
      return null;
    }
    return (
      <div className="w-[340px] flex flex-col h-full bg-[var(--card-bg)] border-l border-[var(--border)] transition-colors duration-200">
        <div className="h-[76px] flex items-center border-b border-[var(--border)] shrink-0 px-4">
          <button
            onClick={() => setActiveView('main')}
            className="w-8 h-8 rounded-full hover:bg-[var(--hover-bg)] flex items-center justify-center text-[var(--sub-text)] cursor-pointer mr-2 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-[17px] font-bold text-[var(--text)] flex-1 text-center pr-8">
            Quản lý nhóm
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Admin Banner */}
          <div className="bg-blue-50/50 dark:bg-blue-500/5 p-4 flex items-center gap-3 border-b border-[var(--border)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#0068FF]">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-[13px] text-[#0068FF] font-semibold">Bạn đang quản lý nhóm với quyền {isAdmin ? 'Trưởng nhóm' : 'Phó nhóm'}</span>
          </div>

          {/* Permissions Section */}
          <div className="p-4 border-b border-[var(--border)] space-y-4">
            <h3 className="text-[14px] font-bold text-[#0068FF]">{t('info.group.permissions_title')}</h3>
            <div className="space-y-4">
              {([
                { labelKey: 'editInfo', id: 'editInfo' as const },
                { labelKey: 'pinContent', id: 'pinContent' as const },
                { labelKey: 'createNotes', id: 'createNotes' as const },
                { labelKey: 'createPolls', id: 'createPolls' as const },
                { labelKey: 'sendMessages', id: 'sendMessages' as const }
              ] as { labelKey: string; id: 'editInfo' | 'pinContent' | 'createNotes' | 'createPolls' | 'sendMessages' }[]).map((item) => (
                <div key={item.id} className="flex items-center justify-between group cursor-pointer" onClick={() => toggleGroupSetting(item.id)}>
                  <span className="text-[14px] text-gray-600 dark:text-gray-300 leading-tight flex-1 pr-4">{t(`info.group.perm.${item.labelKey}`)}</span>
                  <div className={`w-5 h-5 rounded-md border-2 transition-colors flex items-center justify-center ${groupSettings[item.id] ? 'border-[#0068FF] bg-[#0068FF]' : 'border-gray-300 dark:border-gray-600'}`}>
                    {groupSettings[item.id] && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Moderation Section */}
          <div className="py-2">
            {([
              { labelKey: 'memberApproval', id: 'memberApproval' as const, hasHelp: true },
              { labelKey: 'highlightAdmin', id: 'highlightAdmin' as const, hasHelp: true },
              { labelKey: 'newMemberRead', id: 'newMemberRead' as const, hasHelp: true }
            ] as { labelKey: string; id: 'memberApproval' | 'highlightAdmin' | 'newMemberRead'; hasHelp: boolean }[]).map((item, idx) => (
              <div key={idx} className="px-4 py-4 border-b border-[var(--border)] flex items-center justify-between transition-colors hover:bg-[var(--hover-bg)]/30 group cursor-pointer" onClick={() => toggleGroupSetting(item.id)}>
                <div className="flex-1 pr-4 flex items-center gap-1.5">
                  <span className="text-[14px] text-gray-700 dark:text-gray-200 font-medium leading-tight">{t(`info.group.moderation.${item.labelKey}`)}</span>
                  {item.hasHelp && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 opacity-60"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  )}
                </div>
                <div className={`w-[44px] h-[24px] rounded-full p-0.5 transition-all duration-300 ${groupSettings[item.id] ? 'bg-[#0068FF]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-300 ${groupSettings[item.id] ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[340px] flex flex-col h-full bg-[var(--card-bg)] border-l border-[var(--border)] transition-colors duration-200">
      <div className="h-[76px] flex items-center justify-center border-b border-[var(--border)] shrink-0 px-4">
        <h2 className="text-[17px] font-bold text-[var(--text)]">
          {isAi ? t('info.ai.title') : isCloud ? t('info.cloud.title') : isGroup ? t('info.group.title') : t('info.title')}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Profile Section */}
        <div className="flex flex-col items-center pt-5 pb-4 px-6 border-b border-[var(--border)] transition-colors duration-200">
          {isAi ? (
            <>
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg mb-4">
                <FruviaChatbotAvatar className="w-full h-full" imageClassName="w-full h-full object-cover" />
              </div>
              <h3 className="text-[18px] font-bold text-[var(--text)] mb-2 text-center">
                {t('chat.ai_name')}
              </h3>
              <p className="text-[13px] text-[var(--sub-text)] text-center leading-normal">
                {t('info.ai.desc')}
              </p>
            </>
          ) : isCloud ? (
            <>
              <div className="w-16 h-16 rounded-full bg-[#0068FF] flex items-center justify-center text-white shadow-lg mb-4">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.5 19c3.037 0 5.5-2.463 5.5-5.5 0-2.97-2.354-5.391-5.291-5.492a7 7 0 0 0-13.709 0C1.109 8.109 1 10.53 1 13.5c0 3.037 2.463 5.5 5.5 5.5h11z" />
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-[var(--text)] mb-2 flex items-center gap-2">
                {t('chat.self_cloud')}
              </h3>
              <p className="text-[13px] text-[var(--sub-text)] text-center leading-normal">
                {t('info.cloud.desc')}
              </p>
            </>
          ) : (
            <>
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-white shadow-sm border border-gray-100">
                  {conversationAvatar ? (
                    <img src={conversationAvatar} alt="" className="w-full h-full object-cover" />
                  ) : isGroup && (groupAvatarUrls.length > 0 || members.length > 0) ? (
                    <div className="grid grid-cols-2 w-full h-full gap-[2px] p-[2px] bg-white">
                      {(groupAvatarUrls.length > 0 ? groupAvatarUrls : members.map(m => m.avatar).filter(Boolean)).slice(0, 3).map((url, i) => (
                        <div key={i} className="relative w-full h-full rounded-full overflow-hidden bg-gray-50">
                          <img src={url as string} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <div className="w-full h-full rounded-full bg-blue-50 flex items-center justify-center text-[#0068FF] text-[12px] font-bold border border-blue-100">
                        {members.length > 0 ? members.length : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
                      <span className="text-[26px] font-bold">{(conversationName || '?').charAt(0)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 mb-1 group/name">
                <h3 className="text-[19px] font-bold text-[var(--text)] truncate max-w-[240px]">
                  {conversationName || t('info.title')}
                </h3>
                {isGroup && (isAdmin || isDeputy) && (
                  <button
                    onClick={() => {
                      setNewName(conversationName || '');
                      setShowRenameModal(true);
                    }}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[var(--sub-text)] hover:text-[var(--text)] transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title={t('common.edit')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                )}
              </div>

              {isGroup && (
                <div className="flex items-center gap-1 mt-2 w-full justify-between px-4">
                  <div
                    className="flex flex-col items-center gap-1.5 group cursor-pointer w-1/4"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 group-hover:bg-gray-200'}`}>
                      {isMuted ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                      )}
                    </div>
                    <span className={`text-[12px] font-medium text-center leading-tight transition-colors ${isMuted ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {isMuted ? 'Bật thông báo' : 'Tắt thông báo'}
                    </span>
                  </div>

                  <div
                    className="flex flex-col items-center gap-1.5 group cursor-pointer w-1/4"
                    onClick={() => conversationId && onTogglePin?.(conversationId)}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isPinned ? 'bg-[#E5EFFF] text-[#0068FF] hover:bg-[#D6E6FF]' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 group-hover:bg-gray-200'}`}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        {isPinned ? (
                          <path d="M2 2l20 20M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
                        ) : (
                          <>
                            <path d="M12 17v5" />
                            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
                          </>
                        )}
                      </svg>
                    </div>
                    <span className={`text-[12px] font-medium text-center leading-tight transition-colors ${isPinned ? 'text-[#0068FF]' : 'text-gray-700 dark:text-gray-300'}`}>
                      {isPinned ? 'Bỏ ghim hội thoại' : 'Ghim hội thoại'}
                    </span>
                  </div>

                  {(isAdmin || isDeputy) && (
                    <div className="flex flex-col items-center gap-1.5 group cursor-pointer w-1/4" onClick={openAddMemberPanel}>
                      <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 flex items-center justify-center group-hover:bg-gray-200 transition-all">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                      </div>
                      <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">Thêm thành viên</span>
                    </div>
                  )}

                  {(isAdmin || isDeputy) && (
                    <div className="flex flex-col items-center gap-1.5 group cursor-pointer w-1/4" onClick={() => setActiveView('group-management')}>
                      <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 flex items-center justify-center group-hover:bg-gray-200 transition-all">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                      </div>
                      <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">Quản lý nhóm</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {isAi && (
          <div className="p-4 border-b border-[var(--border)] space-y-3 transition-colors duration-200">
            <h4 className="text-[14px] font-bold text-[var(--text)]">{t('info.ai.capabilities_title')}</h4>
            <ul className="text-[13px] text-[var(--sub-text)] space-y-1">
              <li>• {t('info.ai.capability_1')}</li>
              <li>• {t('info.ai.capability_2')}</li>
              <li>• {t('info.ai.capability_3')}</li>
            </ul>
            <div className="pt-1">
              <button
                onClick={() => setShowQuickCommands(prev => !prev)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-[var(--hover-bg)] transition-colors cursor-pointer group"
              >
                <span className="text-[13px] font-bold text-[var(--text)]">{t('info.ai.quick_commands_title')}</span>
                <span className={`text-[var(--sub-text)] transition-transform duration-200 ${showQuickCommands ? '' : '-rotate-90'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
              </button>
              {showQuickCommands && (
                <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {aiQuickCommands.map((item) => (
                    <div key={item.code} className="rounded-md border border-[var(--border)] bg-[var(--hover-bg)] px-2.5 py-2">
                      <div className="text-[12px] font-mono font-semibold text-[#0068FF]">{item.code}</div>
                      <div className="text-[12px] text-[var(--sub-text)] mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-2">
              <button
                onClick={() => setShowClearModal(true)}
                className="w-full py-2 flex items-center justify-center gap-2 text-[13px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
                {t('info.ai.clear_chat.button')}
              </button>
            </div>
          </div>
        )}



        {/* Storage Section — Cloud only */}
        {isCloud && (
          <div className="p-4 border-b border-[var(--border)] space-y-4 transition-colors duration-200">
            <div className="flex justify-between items-center text-[13px]">
              <span className="font-bold text-[var(--text)]">{t('info.cloud.storage.title')}</span>
              <span className="text-[var(--sub-text)]">{stats?.totalSizeFormatted || '0 B'} / 500 MB</span>
            </div>

            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
              <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${imagePercentage}%` }} title={`${t('info.legend.photos')}: ${stats?.imageSizeFormatted || '0 B'}`}></div>
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${videoPercentage}%` }} title={`Video: ${stats?.videoSizeFormatted || '0 B'}`}></div>
              <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${filePercentage}%` }} title={`File: ${stats?.fileSizeFormatted || '0 B'}`}></div>
              <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${voicePercentage}%` }} title={`Voice: ${stats?.voiceSizeFormatted || '0 B'}`}></div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[var(--sub-text)]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span>{t('info.legend.photos')} {stats?.imageSizeFormatted ? `(${stats.imageSizeFormatted})` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>{t('info.legend.videos')} {stats?.videoSizeFormatted ? `(${stats.videoSizeFormatted})` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>{t('info.legend.files')} {stats?.fileSizeFormatted ? `(${stats.fileSizeFormatted})` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                <span>{t('info.legend.voice')} {stats?.voiceSizeFormatted ? `(${stats.voiceSizeFormatted})` : ''}</span>
              </div>
            </div>

            <button
              onClick={onOpenDataModal}
              className="w-full py-2 bg-[var(--hover-bg)] hover:bg-[var(--border)] rounded flex items-center justify-center text-[13px] font-bold text-[var(--text)] transition-colors cursor-pointer active:scale-[0.98]"
            >
              {t('info.cloud.storage.clean_up')}
            </button>
          </div>
        )}

        {/* Group Members Section */}
        {isGroup && (
          <div className="border-b border-[var(--border)] transition-colors duration-200">
            <div
              onClick={() => setShowMembers(!showMembers)}
              className="p-4 flex items-center justify-between hover:bg-[var(--hover-bg)] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[var(--text)]">Thành viên nhóm</span>
              </div>
              <span className={`text-[var(--sub-text)] transition-transform duration-200 ${!showMembers ? '-rotate-90' : ''}`}>
                <ChevronDownIcon size={16} />
              </span>
            </div>

            {showMembers && (
              <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div
                  onClick={() => setShowMembersModal(true)}
                  className="flex items-center gap-3 p-2 hover:bg-[var(--hover-bg)] rounded-md cursor-pointer transition-colors"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text)] opacity-80">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="text-[14px] text-[var(--text)] font-medium">
                    {members.length} {t('info.members') || 'thành viên'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Sections */}
        <div className="divide-y divide-[var(--border)] transition-colors duration-200">
          {/* Pinned Messages Section — Zalo style */}
          {!isAi && <div className="flex flex-col">
            <div
              onClick={() => setShowPinned(!showPinned)}
              className="p-4 flex items-center justify-between hover:bg-[var(--hover-bg)] cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-[var(--text)] leading-tight">{t('info.sections.pinned_messages')}</span>
                  {pinnedMessages.length > 0 && (
                    <span className="text-[11px] text-[var(--sub-text)] leading-tight mt-0.5">{pinnedMessages.length} {t('chat.pin.pinned').toLowerCase()}</span>
                  )}
                </div>
              </div>
              <span className={`text-[var(--sub-text)] transition-transform duration-200 ${!showPinned ? '-rotate-90' : ''}`}>
                <ChevronDownIcon size={16} />
              </span>
            </div>
            {showPinned && (
              <div className="px-3 pb-3 space-y-1">
                {pinnedMessages.length === 0 ? (
                  <div className="py-3 text-center text-[12px] text-[var(--sub-text)] opacity-60">
                    {t('info.sections.no_pinned')}
                  </div>
                ) : pinnedMessages.map((pin: any, idx: number) => (
                  <div key={pin.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer group/pin"
                    onClick={() => {
                      const el = document.getElementById(`msg-${pin.messageId}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('highlight-msg');
                        setTimeout(() => el.classList.remove('highlight-msg'), 2000);
                      }
                    }}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#0068FF]/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-[#0068FF]">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[#0068FF] leading-tight">{pin.senderName}</div>
                      <div className="text-[13px] text-[var(--text)] truncate leading-snug mt-0.5">
                        {(() => {
                          const previewText = getPinnedPreviewText(pin, linkItems);
                          return previewText.length > 50 ? `${previewText.slice(0, 50)}...` : previewText;
                        })()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUnpinMessage(pin.messageId); }}
                      className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover/pin:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 text-[var(--sub-text)] hover:text-red-500 transition-all cursor-pointer"
                      title={t('chat.ctx_menu.unpin')}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>}

          {!isAi && <SectionItem icon={null} title={t('info.sections.reminders')} />}

          <div className="flex flex-col">
            <div
              onClick={() => setShowMedia(!showMedia)}
              className="p-4 flex items-center justify-between hover:bg-[var(--hover-bg)] cursor-pointer transition-colors group"
            >
              <span className="text-[14px] font-bold text-[var(--text)]">{t('info.sections.media')}</span>
              <span className={`text-[var(--sub-text)] transition-transform duration-200 ${!showMedia ? '-rotate-90' : ''}`}>
                <ChevronDownIcon size={16} />
              </span>
            </div>

            {showMedia && (
              <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-5 gap-1 mb-4">
                  {mediaItems.slice(0, 10).map((m, i) => (
                    <div
                      key={m.id || i}
                      onClick={() => {
                        setMediaViewerIndex(i);
                        setIsMediaViewerOpen(true);
                      }}
                      className="aspect-square bg-gray-100 dark:bg-gray-800 rounded overflow-hidden relative group cursor-pointer border border-[var(--border)]"
                    >
                      {m.messageType === 'IMAGE' ? (
                        <Image
                          src={m.content}
                          alt="Gallery Image"
                          fill
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 opacity-50"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      )}
                      {m.messageType === 'VIDEO' && (
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded flex items-center gap-0.5">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                          Video
                        </div>
                      )}
                    </div>
                  ))}
                  {mediaItems.length === 0 && (
                    <div className="col-span-5 py-4 text-center text-[12px] text-[var(--sub-text)] opacity-60">
                      {t('info.sections.no_media')}
                    </div>
                  )}
                </div>
                {mediaItems.length > 0 && (
                  <button
                    onClick={onOpenDataModal}
                    className="w-full py-2 bg-[var(--hover-bg)] hover:bg-[var(--border)] rounded flex items-center justify-center text-[13px] font-bold text-[var(--text)] transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    {t('info.sections.view_all')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div
              onClick={() => setShowFiles(!showFiles)}
              className="p-4 flex items-center justify-between hover:bg-[var(--hover-bg)] cursor-pointer transition-colors group"
            >
              <span className="text-[14px] font-bold text-[var(--text)]">{t('info.sections.files')}</span>
              <span className={`text-[var(--sub-text)] transition-transform duration-200 ${!showFiles ? '-rotate-90' : ''}`}>
                <ChevronDownIcon size={16} />
              </span>
            </div>

            {showFiles && (
              <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200 space-y-2">
                {fileItems.slice(0, 5).map((f, i) => {
                  const rawName = (f.content ?? '').split('/').pop()?.split('_').slice(1).join('_') || t('info.sections.file_attachment');
                  const fileName = decodeURIComponent(rawName);
                  const ext = fileName.split('.').pop()?.toLowerCase() || '';

                  return (
                    <div key={f.id || i} className="flex items-center gap-3 p-2 hover:bg-[var(--hover-bg)] rounded-md cursor-pointer group/file">
                      <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 shadow-sm text-white font-bold text-[10px] ${['pdf'].includes(ext) ? 'bg-[#F40F02]' : ['doc', 'docx'].includes(ext) ? 'bg-[#0068FF]' : ['xls', 'xlsx'].includes(ext) ? 'bg-[#217346]' : 'bg-gray-500'}`}>
                        {ext.toUpperCase().slice(0, 3) || 'FILE'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[var(--text)] truncate group-hover/file:text-[#0068FF] transition-colors" title={fileName}>
                          {fileName}
                        </div>
                        <div className="text-[11px] text-[var(--sub-text)] flex items-center gap-2">
                          <span>{f.fileSize ? formatSize(f.fileSize) : 'N/A'}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span>{t('info.sections.just_now')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {fileItems.length === 0 && (
                  <div className="py-2 text-center text-[12px] text-[var(--sub-text)] opacity-60">
                    {t('info.sections.no_files')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div
              onClick={() => setShowLinks(!showLinks)}
              className="p-4 flex items-center justify-between hover:bg-[var(--hover-bg)] cursor-pointer transition-colors group"
            >
              <span className="text-[14px] font-bold text-[var(--text)]">{t('info.sections.links')}</span>
              <span className={`text-[var(--sub-text)] transition-transform duration-200 ${!showLinks ? '-rotate-90' : ''}`}>
                <ChevronDownIcon size={16} />
              </span>
            </div>

            {showLinks && (
              <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                {linkItems.slice(0, 10).map((l, i) => {
                  const url = l.content || '';
                  const title = l.linkTitle || url;
                  const thumbnail = l.linkThumbnail;
                  let domain = 'link';
                  try { domain = new URL(url).hostname; } catch (e) { }

                  return (
                    <div key={l.id || l.messageId || i} onClick={() => window.open(url, '_blank')} className="flex items-start gap-3 p-2 hover:bg-[var(--hover-bg)] rounded-md cursor-pointer group/link border border-transparent hover:border-[var(--border)] transition-all">
                      <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-[#0068FF] overflow-hidden">
                        {thumbnail ? (
                          <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[var(--text)] line-clamp-2 leading-tight group-hover/link:text-[#0068FF] transition-colors mb-0.5">
                          {title}
                        </div>
                        <div className="text-[11px] text-[var(--sub-text)] opacity-70 truncate uppercase tracking-wider">
                          {domain}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {linkItems.length === 0 && (
                  <div className="py-2 text-center text-[12px] text-[var(--sub-text)] opacity-60">
                    {t('info.sections.no_links')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clear Chat Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-200" onClick={() => setShowClearModal(false)} />
          <div className="w-full max-w-[400px] bg-[var(--card-bg)] rounded-lg shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-[16px] font-bold text-[var(--text)]">{t('info.ai.clear_chat.title')}</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-[var(--sub-text)] leading-relaxed">{t('info.ai.clear_chat.body')}</p>
            </div>
            <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-1.5 text-[13px] font-bold text-[var(--text)] bg-[var(--hover-bg)] hover:bg-[var(--border)] rounded-md transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleClearChat}
                className="px-4 py-1.5 text-[13px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors cursor-pointer"
              >
                {t('info.ai.clear_chat.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Rename Group Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-200" onClick={() => setShowRenameModal(false)} />
          <div className="w-full max-w-[400px] bg-[var(--card-bg)] rounded-lg shadow-2xl relative z-[201] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--text)]">Đổi tên nhóm</h3>
              <button onClick={() => setShowRenameModal(false)} className="w-8 h-8 rounded-full hover:bg-[var(--hover-bg)] flex items-center justify-center text-[var(--sub-text)] cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="px-5 py-6">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-[var(--sub-text)]">Tên nhóm mới</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nhập tên nhóm mới..."
                  className="w-full h-10 px-3 bg-[var(--hover-bg)] border border-[var(--border)] rounded-md outline-none focus:border-[#0068FF] text-[14px]"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameGroup()}
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 text-[13px] font-bold text-[var(--text)] hover:bg-[var(--hover-bg)] rounded-md transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleRenameGroup}
                disabled={isUpdatingName}
                className="px-6 py-2 text-[13px] font-bold text-white bg-[#0068FF] hover:bg-[#005AE0] rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUpdatingName ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-200" onClick={() => setShowAddMember(false)} />
          <div className="w-full max-w-[450px] bg-[var(--card-bg)] rounded-lg shadow-2xl relative z-[201] animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden max-h-[85vh]">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--text)]">Thêm thành viên</h3>
              <button onClick={() => setShowAddMember(false)} className="w-8 h-8 rounded-full hover:bg-[var(--hover-bg)] flex items-center justify-center text-[var(--sub-text)] cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="p-4 border-b border-[var(--border)] bg-[var(--card-bg)]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm tên hoặc số điện thoại..."
                  className="w-full h-10 pl-10 pr-4 bg-[var(--hover-bg)] border border-[var(--border)] rounded-full outline-none focus:border-[#0068FF] text-[14px]"
                />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-[300px]">
              {friendsList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                  <span className="text-[13px]">Không còn bạn bè nào để thêm</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {friendsList.map((friend) => {
                    const isSelected = selectedNewMembers.includes(friend.user_id || friend.id);
                    return (
                      <div
                        key={friend.user_id || friend.id}
                        onClick={() => {
                          const id = friend.user_id || friend.id;
                          setSelectedNewMembers(prev =>
                            isSelected ? prev.filter(mid => mid !== id) : [...prev, id]
                          );
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--hover-bg)] cursor-pointer transition-colors group"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#0068FF] border-[#0068FF]' : 'border-gray-300 dark:border-gray-600'}`}>
                          {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                        <div className="relative w-10 h-10 shrink-0">
                          {friend.avatar_url || friend.avatarUrl ? (
                            <Image src={friend.avatar_url || friend.avatarUrl} alt="" fill className="rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[#0068FF] font-bold">
                              {(friend.display_name || friend.full_name || 'U')[0]}
                            </div>
                          )}
                        </div>
                        <span className="text-[14px] font-medium text-[var(--text)] flex-1">{friend.display_name || friend.full_name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--card-bg)]">
              <button
                onClick={() => setShowAddMember(false)}
                className="px-5 py-2 text-[14px] font-bold text-[var(--text)] hover:bg-[var(--hover-bg)] rounded-md transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedNewMembers.length === 0 || addingMembers}
                className="px-8 py-2 text-[14px] font-bold text-white bg-[#0068FF] hover:bg-[#005AE0] rounded-md transition-all cursor-pointer disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                {addingMembers ? 'Đang thêm...' : `Thêm (${selectedNewMembers.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-200" onClick={() => setShowMembersModal(false)} />
          <div className="w-full max-w-[500px] bg-[var(--card-bg)] rounded-lg shadow-2xl relative z-[201] animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden max-h-[85vh]">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--text)]">Thành viên ({members.length})</h3>
              <button onClick={() => setShowMembersModal(false)} className="w-8 h-8 rounded-full hover:bg-[var(--hover-bg)] flex items-center justify-center text-[var(--sub-text)] cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-[300px]">
              <div className="space-y-1">
                {members.map((member) => {
                  const isMemberAdmin = member.role === 'ADMIN';
                  const isMemberDeputy = member.role === 'DEPUTY';
                  const isMe = String(member.userId) === String(currentUser?.id || currentUser?.user_id);

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--hover-bg)] transition-colors group"
                    >
                      <div className="relative w-11 h-11 shrink-0">
                        {member.avatarUrl || member.avatar ? (
                          <img src={member.avatarUrl || member.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[#0068FF] font-bold text-lg">
                            {(member.displayName || member.userName || 'U')[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold text-[var(--text)] truncate">
                            {member.displayName || member.userName}
                            {isMe && <span className="ml-1 text-gray-400 font-normal">(Bạn)</span>}
                          </span>
                          {isMemberAdmin && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 text-[10px] font-bold uppercase shrink-0">Trưởng nhóm</span>
                          )}
                          {isMemberDeputy && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 text-[10px] font-bold uppercase shrink-0">Phó nhóm</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!isMe && !isMemberAdmin && isAdmin && (
                          <button
                            onClick={() => handleRemoveMember(member.userId, member.displayName || member.userName)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Mời ra khỏi nhóm"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="18" y1="8" x2="23" y2="13" />
                              <line x1="23" y1="8" x2="18" y2="13" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      <GroupMediaViewer
        isOpen={isMediaViewerOpen}
        onClose={() => setIsMediaViewerOpen(false)}
        mediaItems={mediaItems}
        initialIndex={mediaViewerIndex}
        groupName={conversationName || 'Ảnh/Video'}
        currentUser={currentUser}
        members={members}
        onForward={onForward}
      />
    </div>

  );
}

function SectionItem({ icon, title, hasChevron = false }: { icon: React.ReactNode, title: string, hasChevron?: boolean }) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-[var(--hover-bg)] cursor-pointer transition-colors group">
      <div className="flex items-center gap-3">
        {icon && <span className="text-gray-400 group-hover:text-[var(--primary)] transition-colors">{icon}</span>}
        <span className="text-[14px] font-bold text-[var(--text)]">{title}</span>
      </div>
      {(hasChevron || !icon) && <span className="text-[var(--sub-text)] -rotate-90 transition-transform"><ChevronDownIcon size={16} /></span>}
    </div>
  );
}

function getFileIcon(ext: string) {
  const size = 20;
  if (['doc', 'docx'].includes(ext)) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
  }
  if (['xls', 'xlsx'].includes(ext)) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><line x1="12" y1="13" x2="12" y2="17"></line></svg>;
  }
  if (['pdf'].includes(ext)) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15h3a1.5 1.5 0 0 0 0-3H9v3z"></path></svg>;
  }
  if (['zip', 'rar', '7z'].includes(ext)) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M12 12v3"></path><path d="M10 13h4"></path><path d="M10 16h4"></path></svg>;
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>;
}

function getFileIconBg(ext: string) {
  if (['doc', 'docx'].includes(ext)) return 'bg-blue-50 dark:bg-blue-500/10';
  if (['xls', 'xlsx'].includes(ext)) return 'bg-green-50 dark:bg-green-500/10';
  if (['pdf'].includes(ext)) return 'bg-red-50 dark:bg-red-500/10';
  if (['zip', 'rar', '7z'].includes(ext)) return 'bg-orange-50 dark:bg-orange-500/10';
  return 'bg-gray-50 dark:bg-gray-500/10';
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
