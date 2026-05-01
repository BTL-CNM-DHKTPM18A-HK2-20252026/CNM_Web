'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiClient } from '@/lib/http/apiClient';
import { NicknameModal } from '@/features/chat/components/modals/NicknameModal';

const S3_BASE = process.env.NEXT_PUBLIC_S3_BASE_URL ?? '';

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const ChevronLeftIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string | null;
  onStartChat?: (user: { user_id: string; display_name: string; avatar_url: string }) => void;
  onAddFriend?: (prefill: any) => void;
  onBack?: () => void;
}

interface UserProfileData {
  full_name?: string;
  display_name?: string;
  id?: string;
  user_id?: string;
  avatar_url?: string;
  cover_photo_url?: string;
  gender?: string;
  gmail?: string;
  phone?: string;
  bio?: string;
  dob?: string;
  friendship_status?: string;
  common_groups_count?: number;
}

export function MemberProfileModal({ isOpen, onClose, targetUserId, onStartChat, onAddFriend, onBack }: MemberProfileModalProps) {
  const { t } = useTranslation();
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  useEffect(() => {
    if (isOpen && targetUserId) {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          const response = await apiClient.get<UserProfileData | { success?: boolean; data?: UserProfileData }>(`/users/${targetUserId}`);
          const data = (response && typeof response === 'object' && 'success' in response && response.data)
            ? response.data
            : (response as UserProfileData);
          setUserData(data);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          toast.error("Không thể tải thông tin người dùng");
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    }
  }, [isOpen, targetUserId]);

  if (!isOpen) return null;

  // Khi đang mở nickname modal → chỉ render nickname modal (ẩn profile)
  if (showNicknameModal) {
    return (
      <NicknameModal
        isOpen={true}
        onClose={() => setShowNicknameModal(false)}
        currentName={userData?.full_name || userData?.display_name || ''}
        avatar={userData?.avatar_url}
        onConfirm={(newName) => toast.success(`Đã lưu tên gợi nhớ: ${newName}`)}
      />
    );
  }

  const getDefaultAvatar = (uid: string) => {
    if (!uid) return "/avatar.jpg";
    const charCodeSum = uid.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const index = (charCodeSum % 8) + 1;
    return `${S3_BASE}/avatar/image${index}.jpg`;
  };

  const getDefaultCoverPhoto = (uid: string) => {
    if (!uid) return `${S3_BASE}/background/image1.jpg`;
    const charCodeSum = uid.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const index = (charCodeSum % 3) + 1;
    return `${S3_BASE}/background/image${index}.jpg`;
  };

  const userId = userData?.id || userData?.user_id || targetUserId || "";
  const userName = userData?.full_name || userData?.display_name || "Người dùng";
  const avatarUrl = userData?.avatar_url || getDefaultAvatar(userId);
  const coverUrl = userData?.cover_photo_url || getDefaultCoverPhoto(userId);
  const gender = userData?.gender || "Chưa cập nhật";
  const friendshipStatus = userData?.friendship_status || 'NONE';

  const dobDisplay = userData?.dob ? new Date(userData.dob).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : "Chưa cập nhật";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-300" onClick={onClose} />

      <div className="w-full max-w-[420px] bg-white rounded-lg shadow-2xl relative z-[151] animate-in zoom-in-95 duration-200 flex flex-col h-[85vh] max-h-[620px] overflow-hidden">
        {/* Header */}
        <div className="h-[48px] border-b border-[#E5E7EB] flex items-center justify-between px-3 shrink-0">
          <h2 className="text-[16px] font-bold text-[#13233F]">Thông tin tài khoản</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide bg-white" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Cover & Avatar */}
          <div className="h-[140px] w-full relative bg-gray-200">
            <Image src={coverUrl} alt="Cover" fill className="object-cover" unoptimized />
          </div>

          <div className="px-5 pb-5 border-b-8 border-[#F4F5F7]">
            <div className="flex items-end gap-4 -mt-10 mb-4 relative z-10">
              <div className="w-[88px] h-[88px] rounded-full border-4 border-white overflow-hidden bg-white shadow-sm">
                <Image src={avatarUrl} width={88} height={88} alt="Avatar" className="w-full h-full object-cover" unoptimized />
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-[20px] font-bold text-[#13233F]">{userName}</h1>
                  <button onClick={() => setShowNicknameModal(true)} className="p-1 hover:bg-gray-100 rounded text-gray-400 cursor-pointer" title="Đặt tên gợi nhớ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onStartChat?.({ user_id: userId, display_name: userName, avatar_url: avatarUrl });
              }}
              className="w-full h-[38px] bg-[#E8F2FF] hover:bg-[#D6E6FF] text-[#0068FF] font-bold text-[15px] rounded transition-colors cursor-pointer"
            >
              Nhắn tin
            </button>
          </div>

          {/* Personal Info */}
          <div className="px-5 py-4 border-b-8 border-[#F4F5F7]">
            <h3 className="text-[15px] font-bold text-[#13233F] mb-4">Thông tin cá nhân</h3>
            <div className="space-y-3.5">
              <div className="flex items-center">
                <span className="w-[90px] text-[14px] text-[#5A667A]">Giới tính</span>
                <span className="text-[14px] text-[#13233F]">{gender}</span>
              </div>
              <div className="flex items-center">
                <span className="w-[90px] text-[14px] text-[#5A667A]">Ngày sinh</span>
                <span className="text-[14px] text-[#13233F]">{dobDisplay}</span>
              </div>
              <div className="flex items-center">
                <span className="w-[90px] text-[14px] text-[#5A667A]">Điện thoại</span>
                <span className="text-[14px] text-[#13233F]">**********</span>
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div className="px-5 py-4 border-b-8 border-[#F4F5F7]">
            <h3 className="text-[15px] font-bold text-[#13233F] mb-6">Hình ảnh</h3>
            <div className="py-8 text-center">
              <p className="text-[14px] text-[#7589A3]">Chưa có ảnh nào được chia sẻ</p>
            </div>
          </div>

          {/* Actions List */}
          <div className="py-2 pb-6">
            <button className="w-full h-12 px-5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="text-[#5A667A]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
                <span className="text-[15px] text-[#13233F]">Nhóm chung ({userData?.common_groups_count || 0})</span>
              </div>
              <ChevronLeftIcon size={18} className="rotate-180 text-gray-300" />
            </button>

            <button className="w-full h-12 px-5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="text-[#5A667A]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="7" y1="16" x2="13" y2="16" /></svg>
                </div>
                <span className="text-[15px] text-[#13233F]">Chia sẻ danh thiếp</span>
              </div>
            </button>

            <button className="w-full h-12 px-5 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="text-[#5A667A]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
              </div>
              <span className="text-[15px] text-[#13233F]">Chặn tin nhắn và cuộc gọi</span>
            </button>

            <button className="w-full h-12 px-5 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="text-[#5A667A]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </div>
              <span className="text-[15px] text-[#13233F]">Báo xấu</span>
            </button>

            {friendshipStatus === 'ACCEPTED' || friendshipStatus === 'FRIEND' ? (
              <button className="w-full h-12 px-5 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer text-red-500">
                <div className="text-red-500">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </div>
                <span className="text-[15px] font-medium">Xóa khỏi danh sách bạn bè</span>
              </button>
            ) : (
              <button
                onClick={() => onAddFriend?.({ user: { user_id: userId, display_name: userName, avatar_url: avatarUrl } })}
                className="w-full h-12 px-5 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer text-[#0068FF]"
              >
                <div className="text-[#0068FF]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                </div>
                <span className="text-[15px] font-medium">Kết bạn</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
