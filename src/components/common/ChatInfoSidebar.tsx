import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDownIcon,
  ClockIcon,
} from '@/components/ui/Icons';
import Image from 'next/image';
import { apiClient } from '@/services/api';
import { friendService } from '@/services/friendService';
import { toast } from 'sonner';
import { websocketService } from '@/services/websocketService';

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
}

export function ChatInfoSidebar({ onClose, onOpenDataModal, conversationId, isGroup, isCloud, isAi, conversationName, conversationAvatar, currentUser, onClearChat }: ChatInfoSidebarProps) {
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
  const [showMedia, setShowMedia] = React.useState(true);
  const [showFiles, setShowFiles] = React.useState(true);
  const [stats, setStats] = useState<any>(null);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [fileItems, setFileItems] = useState<any[]>([]);
  const [linkItems, setLinkItems] = useState<any[]>([]);
  const [showLinks, setShowLinks] = React.useState(true);

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
  }, [conversationId, isAi]);

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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState<'transfer' | 'leave'>('transfer');

  const currentUserRole = members.find(m => m.userId === currentUser?.id)?.role;
  const isAdmin = currentUserRole === 'ADMIN';
  const isDeputy = currentUserRole === 'DEPUTY';
  const canAddMembers = isAdmin || isDeputy;

  // Fetch group members
  useEffect(() => {
    if (isGroup && conversationId) {
      fetchMembers();
    }
  }, [isGroup, conversationId]);

  const fetchMembers = async () => {
    try {
      const res: any = await apiClient.get(`/conversations/${conversationId}/members`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setMembers(list);
    } catch (e) {
      console.error('Failed to fetch members:', e);
    }
  };

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

  const openAddMemberPanel = async () => {
    setShowAddMember(true);
    try {
      const friends = await friendService.getFriends();
      const list = Array.isArray(friends) ? friends : [];
      // Filter out existing members
      const existingIds = members.map(m => m.userId);
      setFriendsList(list.filter((f: any) => !existingIds.includes(f.user_id || f.id)));
    } catch (e) {
      setFriendsList([]);
    }
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
  }, [conversationId]);

  const fetchMedia = async () => {
    try {
      const res: any = await apiClient.get(`/messages/conversation/${conversationId}/media`);
      const items = Array.isArray(res) ? res : (res?.data || []);

      const imagesAndVideos = items.filter((m: any) => m.messageType === 'IMAGE' || m.messageType === 'VIDEO');
      const files = items.filter((m: any) => m.messageType === 'MEDIA');

      setMediaItems(imagesAndVideos);
      setFileItems(files);

      // Fetch links from common message list or specific endpoint
      try {
        const linksRes: any = await apiClient.get(`/messages/conversation/${conversationId}/links`);
        const links = Array.isArray(linksRes) ? linksRes : (linksRes?.data || []);
        setLinkItems(links);
      } catch (e) {
        console.log("No specific links endpoint found, showing empty links");
      }
    } catch (error) {
      console.error("Failed to fetch media:", error);
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
  const isSelectedVideo = selectedImage ? /\.(mp4|webm|ogg)(\?|#|$)/i.test(selectedImage) : false;

  const imagePercentage = stats?.imageSize ? (stats.imageSize / stats.totalSize) * usagePercentage : 0;
  const videoPercentage = stats?.videoSize ? (stats.videoSize / stats.totalSize) * usagePercentage : 0;
  const filePercentage = stats?.fileSize ? (stats.fileSize / stats.totalSize) * usagePercentage : 0;
  const voicePercentage = stats?.voiceSize ? (stats.voiceSize / stats.totalSize) * usagePercentage : 0;

  return (
    <div className="w-[350px] bg-[var(--card-bg)] border-l border-[var(--border)] flex flex-col h-full animate-in slide-in-from-right duration-300 transition-colors duration-200">
      {/* Lightbox / Image Zoom */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute top-6 right-6 flex gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div
            className="relative w-[90vw] h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isSelectedVideo ? (
              <video
                src={selectedImage}
                controls
                autoPlay
                className="max-w-full max-h-full transition-all duration-300 animate-in zoom-in-95"
              />
            ) : (
              <Image
                src={selectedImage}
                alt="Zoomed Media"
                width={1200}
                height={1200}
                className="object-contain max-w-full max-h-full transition-all duration-300 animate-in zoom-in-95"
              />
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-[64px] border-b border-[var(--border)] flex items-center justify-center relative flex-shrink-0 transition-colors duration-200">
        <h2 className="text-[17px] font-bold text-[var(--text)]">{t('info.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Profile Section */}
        <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-[var(--border)] transition-colors duration-200">
          {isAi ? (
            <>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg mb-4">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                </svg>
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
                  <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-6c-2.33 0-4.5 1.17-4.5 2.5V14h9v-1.5c0-1.33-2.17-2.5-4.5-2.5z" />
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
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-lg mb-4">
                {conversationAvatar ? (
                  <img src={conversationAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[26px] font-bold">{(conversationName || '?').charAt(0)}</span>
                )}
              </div>
              <h3 className="text-[18px] font-bold text-[var(--text)] mb-1 text-center">
                {conversationName || t('info.title')}
              </h3>
              {isGroup && (
                <p className="text-[12px] text-[var(--sub-text)]">{members.length} {t('info.members')}</p>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--sub-text)]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                <span className="text-[14px] font-bold text-[var(--text)]">{t('group.members.title')} ({members.length})</span>
              </div>
              <span className={`text-[var(--sub-text)] transition-transform duration-200 ${!showMembers ? '-rotate-90' : ''}`}>
                <ChevronDownIcon size={16} />
              </span>
            </div>

            {showMembers && (
              <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Add member button */}
                {canAddMembers && !showAddMember && (
                  <button
                    onClick={openAddMemberPanel}
                    className="w-full mb-3 py-2 flex items-center justify-center gap-2 text-[13px] font-bold text-[#0068FF] bg-[#0068FF]/10 hover:bg-[#0068FF]/20 rounded-md transition-colors cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    {t('group.members.add')}
                  </button>
                )}

                {/* Add member panel */}
                {showAddMember && (
                  <div className="mb-3 p-3 border border-[var(--border)] rounded-lg bg-[var(--hover-bg)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-bold text-[var(--text)]">{t('group.members.select_friends')}</span>
                      <button onClick={() => { setShowAddMember(false); setSelectedNewMembers([]); }} className="text-[var(--sub-text)] hover:text-[var(--text)] cursor-pointer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
                      {friendsList.length === 0 ? (
                        <p className="text-[12px] text-[var(--sub-text)] text-center py-2">{t('group.members.no_friends')}</p>
                      ) : friendsList.map((f: any) => {
                        const fId = f.user_id || f.id;
                        const fName = f.display_name || f.full_name || f.name || 'Unknown';
                        const fAvatar = f.avatar_url || f.avatar;
                        const isSelected = selectedNewMembers.includes(fId);
                        return (
                          <label key={fId} className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-[var(--card-bg)] cursor-pointer select-none">
                            <input type="checkbox" checked={isSelected} onChange={() => setSelectedNewMembers(prev => isSelected ? prev.filter(id => id !== fId) : [...prev, fId])} className="accent-[#0068FF]" />
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 shrink-0">
                              {fAvatar ? <img src={fAvatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-white bg-blue-500">{fName.charAt(0)}</div>}
                            </div>
                            <span className="text-[13px] text-[var(--text)] truncate">{fName}</span>
                          </label>
                        );
                      })}
                    </div>
                    {selectedNewMembers.length > 0 && (
                      <button
                        onClick={handleAddMembers}
                        disabled={addingMembers}
                        className="w-full mt-2 py-1.5 bg-[#0068FF] text-white text-[13px] font-bold rounded-md hover:bg-[#0057d1] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {addingMembers ? t('group.members.adding') : t('group.members.add_count', { count: selectedNewMembers.length })}
                      </button>
                    )}
                  </div>
                )}

                {/* Members list / Danh sách thành viên */}
                <div className="space-y-1">
                  {members.map((m: any) => {
                    const mName = m.displayName || m.userName || 'Unknown';
                    const mAvatar = m.avatarUrl || m.avatar;
                    const mRole = m.role;
                    const isMe = m.userId === currentUser?.id;
                    const menuOpen = openMenuId === m.userId;

                    return (
                      <div key={m.userId} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[var(--hover-bg)] group/member transition-colors relative">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 shrink-0">
                          {mAvatar ? <img src={mAvatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[13px] font-bold text-white bg-gradient-to-br from-blue-400 to-blue-600">{mName.charAt(0)}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-medium text-[var(--text)] truncate">{mName}{isMe ? ` (${t('common.you')})` : ''}</span>
                            {mRole === 'ADMIN' && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded-full shrink-0">{t('group.role.admin_title')}</span>}
                            {mRole === 'DEPUTY' && <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-full shrink-0">{t('group.role.deputy_title')}</span>}
                          </div>
                        </div>
                        {/* 3-dot menu (Admin only, not self) */}
                        {isAdmin && !isMe && (
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(menuOpen ? null : m.userId)}
                              className="opacity-0 group-hover/member:opacity-100 text-[var(--sub-text)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)] p-1 rounded-full transition-all cursor-pointer"
                              title={t('group.member.manage_role')}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
                            </button>
                            {menuOpen && (
                              <>
                                <div className="fixed inset-0 z-[49]" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 top-8 z-[50] w-[200px] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-150">
                                  {mRole !== 'DEPUTY' && (
                                    <button
                                      onClick={() => handleChangeRole(m.userId, mName, 'DEPUTY')}
                                      className="w-full px-3 py-2 text-left text-[13px] text-[var(--text)] hover:bg-[var(--hover-bg)] flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                      {t('group.role.promote_deputy')}
                                    </button>
                                  )}
                                  {mRole === 'DEPUTY' && (
                                    <button
                                      onClick={() => handleChangeRole(m.userId, mName, 'MEMBER')}
                                      className="w-full px-3 py-2 text-left text-[13px] text-[var(--text)] hover:bg-[var(--hover-bg)] flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                      {t('group.role.demote_member')}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { setOpenMenuId(null); setTransferReason('transfer'); setShowTransferModal(false); handleTransferOwnership(m.userId, mName); }}
                                    className="w-full px-3 py-2 text-left text-[13px] text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>
                                    {t('group.transfer.title')}
                                  </button>
                                  <div className="border-t border-[var(--border)] my-1" />
                                  <button
                                    onClick={() => { setOpenMenuId(null); handleRemoveMember(m.userId, mName); }}
                                    className="w-full px-3 py-2 text-left text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    {t('group.member.remove')}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Leave group button / Nút rời nhóm */}
                <button
                  onClick={handleLeaveGroup}
                  className="w-full mt-4 py-2 flex items-center justify-center gap-2 text-[13px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  {isAdmin ? t('group.leave.transfer_and_leave') : t('group.leave.title')}
                </button>

                {/* Dissolve group button / Nút giải tán nhóm — Admin only */}
                {isAdmin && (
                  <button
                    onClick={handleDissolveGroup}
                    className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-[13px] font-bold text-red-600 bg-red-100 dark:bg-red-600/15 hover:bg-red-200 dark:hover:bg-red-600/25 rounded-md transition-colors cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    {t('group.disband.title')}
                  </button>
                )}

                {/* Transfer Ownership Modal / Modal chuyển quyền Trưởng nhóm */}
                {showTransferModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-200" onClick={() => setShowTransferModal(false)} />
                    <div className="w-full max-w-[400px] bg-[var(--card-bg)] rounded-lg shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-[var(--border)]">
                        <h3 className="text-[16px] font-bold text-[var(--text)]">
                          {transferReason === 'leave' ? t('group.transfer.select_successor') : t('group.transfer.title')}
                        </h3>
                        <p className="text-[12px] text-[var(--sub-text)] mt-1">
                          {transferReason === 'leave'
                            ? t('group.transfer.select_successor_desc')
                            : t('group.transfer.select_member_desc')}
                        </p>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-3 space-y-1">
                        {members.filter(m => m.userId !== currentUser?.id).map((m: any) => {
                          const mName = m.displayName || m.userName || 'Unknown';
                          const mAvatar = m.avatarUrl || m.avatar;
                          return (
                            <button
                              key={m.userId}
                              onClick={() => handleTransferOwnership(m.userId, mName)}
                              className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-[var(--hover-bg)] transition-colors cursor-pointer text-left"
                            >
                              <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 shrink-0">
                                {mAvatar ? <img src={mAvatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[13px] font-bold text-white bg-gradient-to-br from-blue-400 to-blue-600">{mName.charAt(0)}</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[13px] font-medium text-[var(--text)] truncate block">{mName}</span>
                                {m.role === 'DEPUTY' && <span className="text-[10px] text-blue-500">{t('group.role.deputy_title')}</span>}
                              </div>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--sub-text)] shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                          );
                        })}
                      </div>
                      <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end">
                        <button
                          onClick={() => setShowTransferModal(false)}
                          className="px-4 py-1.5 text-[13px] font-bold text-[var(--text)] bg-[var(--hover-bg)] hover:bg-[var(--border)] rounded-md transition-colors cursor-pointer"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                <span className="w-8 h-8 rounded-full bg-[#0068FF]/10 flex items-center justify-center shrink-0 group-hover:bg-[#0068FF]/15 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" /></svg>
                </span>
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
                        {pin.messageType !== 'TEXT' ? `[${pin.messageType}]` : (pin.content?.length > 50 ? pin.content.slice(0, 50) + '...' : pin.content)}
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

          {!isAi && <SectionItem icon={<ClockIcon size={18} />} title={t('info.sections.reminders')} />}

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
                <div className="grid grid-cols-4 gap-1 mb-4">
                  {mediaItems.slice(0, 8).map((m, i) => (
                    <div
                      key={m.id || i}
                      onClick={() => setSelectedImage(m.content)}
                      className="aspect-square bg-gray-100 dark:bg-gray-800 rounded overflow-hidden relative group cursor-pointer border border-[var(--border)]"
                    >
                      {m.messageType === 'IMAGE' ? (
                        <img
                          src={m.content}
                          alt="Gallery Image"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 opacity-50"><path d="M8 5v14l11-7z" /></svg>
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
                    <div className="col-span-4 py-4 text-center text-[12px] text-[var(--sub-text)] opacity-60">
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
                  const rawName = f.content.split('/').pop()?.split('_').slice(1).join('_') || t('info.sections.file_attachment');
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
      {(hasChevron || !icon) && <span className="text-[var(--sub-text)] group-hover:translate-y-0.5 transition-transform"><ChevronDownIcon size={16} /></span>}
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
