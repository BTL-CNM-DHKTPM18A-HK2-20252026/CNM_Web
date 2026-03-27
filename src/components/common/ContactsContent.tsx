import React, { useState } from 'react';
import Image from 'next/image';
import { UserCircleIcon, MoreHorizontalIcon, SearchIcon, ChevronDownIcon, ChevronRightIcon, FriendsIcon, GroupsIcon, FriendRequestIcon, GroupRequestIcon } from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';
import { UserResponse } from '@/services/userService';
import { friendService, FriendRequestResponse } from '@/services/friendService';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { ConfirmationModal } from './ConfirmationModal';
import { websocketService } from '@/services/websocketService';
import { StatusIndicator } from './StatusIndicator';

interface ContactsContentProps {
  category: string;
  currentUser?: any;
  onSelectUser?: (user: any) => void;
}

export function ContactsContent({ category, currentUser, onSelectUser }: ContactsContentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // States for confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'unfriend' | 'block';
    user: any | null;
  }>({
    isOpen: false,
    type: 'unfriend',
    user: null
  });

  const [receivedInvites, setReceivedInvites] = useState<FriendRequestResponse[]>([]);
  const [sentInvites, setSentInvites] = useState<FriendRequestResponse[]>([]);
  const [friends, setFriends] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const groups: any[] = [];

  const isFriends = category === 'friends';
  const isInvites = category === 'invites';
  const isGroups = category === 'groups';

  const title = isFriends ? 'Danh sách bạn bè' : isGroups ? 'Danh sách nhóm và cộng đồng' : isInvites ? 'Lời mời kết bạn' : 'Lời mời vào nhóm và cộng đồng';
  const countLabel = isFriends ? `Bạn bè (${friends.length})` : isGroups ? `Nhóm và cộng đồng (${groups.length})` : '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Fetch Invitations
   */
  const fetchInvitations = async () => {
    if (category !== 'invites') return;

    setIsLoading(true);
    try {
      const [received, sent] = await Promise.all([
        friendService.getReceivedRequests(),
        friendService.getSentRequests()
      ]);
      setReceivedInvites(received);
      setSentInvites(sent);
    } catch (err) {
      console.error("Failed to fetch invitations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch Friends
   */
  const fetchFriends = async (force = false) => {
    if (!force && category !== 'friends') return;
    setIsLoading(true);
    try {
      const list = await friendService.getFriends();
      setFriends(list);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (category === 'invites') {
      fetchInvitations();
    } else if (category === 'friends') {
      fetchFriends();
    }
  }, [category]);

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!currentUser?.id) return;

    const friendEventsSub = websocketService.subscribeToFriendEvents(currentUser.id, (msg) => {
      console.log(`[WS-DEBUG] ContactsContent: Received event ${msg.body}. Category: ${category}`);
      fetchFriends(true);
      if (category === 'invites') {
        console.log('[WS-DEBUG] ContactsContent: Refreshing invitations list...');
        fetchInvitations();
      }
    });

    return () => {
      friendEventsSub?.unsubscribe();
    };
  }, [currentUser?.id, category]);

  const handleAccept = async (requestId: string, senderInfo?: { senderId: string; senderName: string; senderAvatarUrl?: string }) => {
    try {
      await friendService.acceptRequest(requestId);
      toast.success("Đã chấp nhận lời mời kết bạn");
      fetchInvitations();
      fetchFriends(true);
      // Auto-open chat with the new friend
      if (senderInfo && onSelectUser) {
        onSelectUser({
          user_id: senderInfo.senderId,
          display_name: senderInfo.senderName,
          avatar_url: senderInfo.senderAvatarUrl || '',
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Thao tác thất bại");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await friendService.rejectRequest(requestId);
      toast.success("Đã từ chối lời mời kết bạn");
      fetchInvitations();
    } catch (err: any) {
      toast.error(err.message || "Thao tác thất bại");
    }
  };

  const [showAllSent, setShowAllSent] = useState(false);

  const handleRecall = async (userId: string) => {
    try {
      await friendService.unfriend(userId);
      toast.success("Đã thu hồi lời mời");
      fetchInvitations();
    } catch (err: any) {
      toast.error(err.message || "Thao tác thất bại");
    }
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const handleUnfriend = async (userId: string) => {
    try {
      await friendService.unfriend(userId);
      toast.success("Đã xóa bạn bè");
      fetchFriends();
    } catch (err: any) {
      toast.error(err.message || "Xóa bạn thất bại");
    }
  };

  const handleBlock = async (userId: string) => {
    try {
      await friendService.blockUser(userId);
      toast.success("Đã chặn đối phương");
      fetchFriends();
    } catch (err: any) {
      toast.error(err.message || "Chặn người dùng thất bại");
    }
  };

  const menuActions = (item: any, isTopRecord: boolean = false) => {
    const id = item.user_id || item.id;
    const name = item.display_name || item.full_name || item.name;

    return (
      <div
        className={`absolute right-10 ${isTopRecord ? 'top-[40px]' : 'bottom-[40px]'} w-52 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-gray-200 z-[100] py-1.5 animate-in fade-in zoom-in-95 duration-100`}
        onClick={e => e.stopPropagation()}
      >
        <button className="w-full px-4 py-2 text-left text-[14.5px] hover:bg-gray-50 flex items-center gap-3 text-[#081C36] transition-colors cursor-pointer">
          <span>Xem thông tin</span>
        </button>
        <div className="h-[1px] bg-gray-100 mx-2 my-1"></div>
        <button className="w-full px-4 py-2 text-left text-[14.5px] hover:bg-gray-50 flex items-center justify-between text-[#081C36] transition-colors group cursor-pointer">
          <span>Phân loại</span>
          <ChevronRightIcon size={14} className="text-gray-500" />
        </button>
        <button className="w-full px-4 py-2 text-left text-[14.5px] hover:bg-gray-50 flex items-center gap-3 text-[#081C36] transition-colors cursor-pointer">
          <span>Đặt tên gợi nhớ</span>
        </button>
        <div className="h-[1px] bg-gray-100 mx-2 my-1"></div>
        <button
          onClick={() => {
            setConfirmModal({ isOpen: true, type: 'block', user: item });
            setActiveMenuId(null);
          }}
          className="w-full px-4 py-2 text-left text-[14.5px] hover:bg-gray-50 flex items-center gap-3 text-[#081C36] transition-colors cursor-pointer"
        >
          <span>Chặn người này</span>
        </button>
        <div className="h-[1px] bg-gray-100 mx-2 my-1"></div>
        <button
          onClick={() => {
            setConfirmModal({ isOpen: true, type: 'unfriend', user: item });
            setActiveMenuId(null);
          }}
          className="w-full px-4 py-2 text-left text-[14.5px] hover:bg-red-50 text-red-600 font-semibold flex items-center gap-3 transition-colors cursor-pointer"
        >
          <span>Xóa bạn</span>
        </button>
      </div>
    );
  };

  // Local filtering logic
  const filteredData = (isFriends ? friends : groups).filter((item: any) => {
    const name = (item.display_name || item.full_name || item.name || "").toLowerCase();
    const phone = (item.phone_number || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || phone.includes(search);
  });

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] transition-colors duration-200 overflow-hidden relative">
      {/* HEADER */}
      <div className="h-[64px] bg-[var(--card-bg)] border-b border-[var(--border)] px-6 flex items-center justify-between shadow-sm flex-shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <span className="text-gray-400">
            {category === 'friends' ? (
              <FriendsIcon size={22} />
            ) : category === 'groups' ? (
              <GroupsIcon size={22} />
            ) : category === 'invites' ? (
              <FriendRequestIcon size={22} />
            ) : (
              <GroupRequestIcon size={22} />
            )}
          </span>
          <span className="text-[17px] font-bold text-[var(--text)]">{title}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isInvites ? (
          <div className="p-4 space-y-6 w-full">
            {receivedInvites.length === 0 && sentInvites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-40 h-40 mb-6 relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-blue-50/50 rounded-full blur-2xl opacity-60"></div>
                  <div className="relative z-10 p-6 bg-blue-50/40 rounded-full border border-blue-100/50">
                    <FriendRequestIcon size={48} className="text-blue-500/50" />
                  </div>
                </div>
                <p className="text-[15px] font-bold text-[var(--text)] opacity-40">Không có lời mời nào</p>
                <p className="text-[13px] text-[var(--sub-text)] mt-1 opacity-50 px-8 text-center">Các lời mời kết bạn sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <>
                {receivedInvites.length > 0 && (
                  <section>
                    <h3 className="text-[14px] font-bold text-[var(--text)] mb-3 px-1 flex items-center gap-1.5 opacity-90">
                      Lời mời đã nhận ({receivedInvites.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {receivedInvites.map(req => (
                        <div key={req.requestId} className="bg-[var(--card-bg)] rounded-lg border border-[var(--border)] shadow-sm p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-3">
                              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-black/5 flex items-center justify-center bg-blue-50">
                                {req.senderAvatarUrl ? (
                                  <Image src={req.senderAvatarUrl} alt={req.senderName} width={48} height={48} className="object-cover" />
                                ) : (
                                  <span className="text-blue-600 font-bold text-lg">{req.senderName.charAt(0)}</span>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-[var(--text)]">{req.senderName}</span>
                                <span className="text-[12px] text-[var(--sub-text)] mt-0.5">{new Date(req.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <button className="text-[var(--sub-text)] hover:text-blue-500 p-1 cursor-pointer"><MoreHorizontalIcon size={18} /></button>
                          </div>

                          <div className="bg-[var(--hover-bg)] p-3 rounded-lg text-[13.5px] text-[var(--text)] leading-relaxed italic">
                            {req.message || "Xin chào, kết bạn với mình nhé!"}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                              onClick={() => handleReject(req.requestId)}
                              className="py-2 bg-[var(--hover-bg)] hover:opacity-80 text-[var(--text)] font-bold rounded-md transition-all text-[14px] cursor-pointer"
                            >
                              Từ chối
                            </button>
                            <button
                              onClick={() => handleAccept(req.requestId, { senderId: req.senderId, senderName: req.senderName, senderAvatarUrl: req.senderAvatarUrl })}
                              className="py-2 bg-[#0068FF] hover:bg-[#005AE0] text-white font-bold rounded-md transition-all text-[14px] cursor-pointer"
                            >
                              Đồng ý
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {sentInvites.length > 0 && (
                  <section>
                    <h3 className="text-[14px] font-bold text-[var(--text)] mb-3 px-1 flex items-center gap-1.5 opacity-90">
                      Lời mời đã gửi ({sentInvites.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(showAllSent ? sentInvites : sentInvites.slice(0, 6)).map(req => (
                        <div key={req.requestId} className="bg-[var(--card-bg)] rounded-lg border border-[var(--border)] shadow-sm p-4 flex flex-col gap-4">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-3">
                              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-black/5 flex items-center justify-center bg-gray-50">
                                {req.receiverAvatarUrl ? (
                                  <Image src={req.receiverAvatarUrl} alt={req.receiverName} width={48} height={48} className="object-cover" />
                                ) : (
                                  <span className="text-gray-500 font-bold text-lg">{req.receiverName.charAt(0)}</span>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-[var(--text)]">{req.receiverName}</span>
                                <span className="text-[12px] text-[var(--sub-text)] mt-0.5">Bạn đã gửi lời mời</span>
                                <span className="text-[11px] text-[var(--sub-text)] opacity-60 underline italic">{new Date(req.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <button className="text-[var(--sub-text)] hover:text-blue-500 p-1 cursor-pointer"><MoreHorizontalIcon size={18} /></button>
                          </div>

                          <div className="bg-[var(--hover-bg)] p-3 rounded-lg text-[13.2px] text-[var(--text)] leading-relaxed italic opacity-85">
                            {req.message || "Không có nội dung lời nhắn"}
                          </div>

                          <button
                            onClick={() => handleRecall(req.receiverId)}
                            className="w-full py-2 bg-[var(--hover-bg)] hover:bg-red-50 hover:text-red-500 text-[var(--text)] font-bold rounded-md transition-all text-[14px] cursor-pointer border border-transparent hover:border-red-100"
                          >
                            Thu hồi lời mời
                          </button>
                        </div>
                      ))}
                    </div>

                    {sentInvites.length > 6 && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={() => setShowAllSent(!showAllSent)}
                          className="px-6 py-1.5 bg-[#E9EBED] hover:bg-[#D8DADF] text-[#081C36] font-bold rounded-[4px] text-[13.5px] transition-all cursor-pointer border border-black/5 active:scale-95"
                        >
                          {showAllSent ? 'Thu gọn' : 'Xem thêm'}
                        </button>
                      </div>
                    )}
                  </section>
                )}
              </>
            )}

            <section className="pt-8 pb-4">
              <div className="flex items-center gap-2 px-1 cursor-pointer group opacity-40 hover:opacity-100 transition-opacity">
                <h3 className="text-[14px] font-bold text-[var(--text)]">Gợi ý kết bạn (0)</h3>
                <span className="text-[var(--sub-text)] group-hover:translate-x-1 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6" /></svg>
                </span>
              </div>
            </section>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="bg-[var(--background)] py-4 px-6 flex-shrink-0 border-b border-black/5">
              <span className="text-[var(--text)] font-semibold text-[15.5px]">{countLabel}</span>
            </div>

            <div className="flex-1 flex flex-col bg-[var(--card-bg)] overflow-hidden mx-4 mb-4 rounded-xl border border-[var(--border)] shadow-sm">
              <div className="px-6 py-4 flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    placeholder={isFriends ? "Tìm nhanh danh sách bạn bè" : "Tìm kiếm..."}
                    className="w-full bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] focus:bg-[var(--card-bg)] border border-[var(--border)] rounded-lg py-1.5 pl-9 pr-3 text-[14px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--search-placeholder)] focus:border-[#0068FF] shadow-sm"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sub-text)]"><SearchIcon size={16} /></div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer shadow-sm min-w-[120px] focus:border-[#0068FF] outline-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" /></svg>
                    <span className="font-medium">{isFriends ? 'Tên (A-Z)' : 'Hoạt động (mới — cũ)'}</span>
                    <span className="text-[var(--sub-text)] ml-auto"><ChevronDownIcon size={14} /></span>
                  </button>

                  <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text)] hover:bg-[var(--hover-bg)] transition-all cursor-pointer shadow-sm min-w-[100px] focus:border-[#0068FF] outline-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                    <span className="font-medium">Tất cả</span>
                    <span className="text-[var(--sub-text)] ml-auto"><ChevronDownIcon size={14} /></span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <div className="w-32 h-32 mb-6 relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-blue-50/50 rounded-full blur-2xl opacity-60"></div>
                      <div className="relative z-10 p-5 bg-blue-50/40 rounded-full border border-blue-100/50">
                        {isFriends ? (
                          <UserCircleIcon size={40} className="text-blue-500/50" />
                        ) : (
                          <GroupsIcon size={40} className="text-blue-500/50" />
                        )}
                      </div>
                    </div>
                    <p className="text-[14px] font-bold text-[var(--text)] opacity-40">
                      {searchTerm ? 'Không tìm thấy kết quả' : (isFriends ? 'Chưa có bạn bè' : 'Chưa tham gia nhóm')}
                    </p>
                  </div>
                ) : (
                  filteredData.map((item: any) => {
                    const name = item.display_name || item.full_name || item.name;
                    const avatar = item.avatar_url || item.avatar;
                    const id = item.user_id || item.id;

                    return (
                      <div key={id} onClick={() => onSelectUser?.(item)} className={`mx-2 my-1 rounded-lg flex items-center group py-4 px-4 transition-all cursor-pointer hover:bg-[var(--active-bg)] ${activeMenuId === id ? 'bg-[var(--active-bg)]' : ''}`}>
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 mr-4 border border-black/5 shadow-sm bg-blue-50 flex items-center justify-center relative">
                          {avatar ? (
                            <Image src={avatar} alt={name} width={48} height={48} className="object-cover" />
                          ) : (
                            <span className="text-blue-600 font-bold text-lg">{name?.charAt(0)}</span>
                          )}
                          {/* Online status dot */}
                          {isFriends && id && (
                            <StatusIndicator userId={id} dotOnly dotSize={12} className="absolute bottom-0 right-0" />
                          )}
                        </div>

                        <div className="flex-1 flex flex-col justify-center min-w-0 pr-4">
                          <span className={`text-[15.5px] truncate leading-snug text-[var(--text)] font-semibold`}>{name}</span>
                          {!isFriends && <span className="text-[12.5px] text-[var(--sub-text)] font-medium leading-snug">{item.members}</span>}
                        </div>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === id ? null : id);
                            }}
                            className={`p-2 hover:bg-black/5 rounded-full text-gray-400 hover:text-gray-600 transition-all cursor-pointer ${activeMenuId === id ? 'bg-black/5 text-gray-600' : ''}`}
                          >
                            <MoreHorizontalIcon size={20} />
                          </button>

                          {activeMenuId === id && menuActions(item, (isFriends ? friends : groups).indexOf(item) < 2)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
          const userId = confirmModal.user?.user_id || confirmModal.user?.id;
          if (confirmModal.type === 'unfriend') {
            handleUnfriend(userId);
          } else {
            handleBlock(userId);
          }
        }}
        title={confirmModal.type === 'unfriend' ? 'Xóa bạn bè' : 'Chặn người dùng'}
        message={
          confirmModal.type === 'unfriend'
            ? `Bạn có chắc chắn muốn xóa ${confirmModal.user?.display_name || confirmModal.user?.full_name || 'người này'} khỏi danh sách bạn bè?`
            : `Bạn có chắc chắn muốn chặn ${confirmModal.user?.display_name || confirmModal.user?.full_name || 'người này'}? Họ sẽ không thể gửi tin nhắn hoặc lời mời kết bạn cho bạn.`
        }
        confirmLabel={confirmModal.type === 'unfriend' ? 'Xóa bạn' : 'Chặn'}
        isDanger={true}
      />
    </div>
  );
}
