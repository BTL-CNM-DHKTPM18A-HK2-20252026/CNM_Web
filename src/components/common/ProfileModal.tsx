'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { useRef } from 'react';

const XIcon = ({ size = 20 }: { size?: number }) => (

  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const CameraIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
  </svg>
);

const PencilIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const ChevronLeftIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronDownIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0068FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const GlobeIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function ProfileModal({ isOpen, onClose, onUpdate }: ProfileModalProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState("");

  const [gender, setGender] = useState("");

  // Custom Dropdown State
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [education, setEducation] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [coverPhotoPreview, setCoverPhotoPreview] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isSystemAvatarPickerOpen, setIsSystemAvatarPickerOpen] = useState(false);
  const [isCoverMenuOpen, setIsCoverMenuOpen] = useState(false);
  const [isSystemBgPickerOpen, setIsSystemBgPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [initialUserData, setInitialUserData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          const response = await apiClient.get('/users/me');

          // Handle both wrapped and unwrapped response for backward compatibility
          // although our current apiClient already unwraps successful data
          const data = (response && response.success && response.data) ? response.data : response;

          if (data && (data.full_name || data.id || data.phone_number)) {
            console.log("Profile data loaded:", data);
            setUserName(data.full_name || "");
            setUserId(data.id || "");
            setAvatarUrl(data.avatar_url || "");
            setCoverPhotoUrl(data.cover_photo_url || "");
            setCoverPhotoPreview("");
            setGender(data.gender || "Nam");
            setPhoneNumber(data.phone_number || "");
            setBio(data.bio || "");
            setAddress(data.address || "");
            setCity(data.city || "");
            setEducation(data.education || "");
            setWorkplace(data.workplace || "");

            if (data.dob) {
              const date = new Date(data.dob);
              const d = date.getDate().toString().padStart(2, '0');
              const m = (date.getMonth() + 1).toString().padStart(2, '0');
              const y = date.getFullYear().toString();
              setDay(d);
              setMonth(m);
              setYear(y);
              setInitialUserData({
                userName: data.full_name || "",
                gender: data.gender || "Nam",
                day: d,
                month: m,
                year: y,
                bio: data.bio || "",
                address: data.address || "",
                city: data.city || "",
                education: data.education || "",
                workplace: data.workplace || ""
              });
            } else {
              setDay("01");
              setMonth("01");
              setYear("2000");
              setInitialUserData({
                userName: data.full_name || "",
                gender: data.gender || "Nam",
                day: "01",
                month: "01",
                year: "2000"
              });
            }
          } else {
            console.error("User data not found in response:", response);
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasChanged = initialUserData ? (
    userName !== initialUserData.userName ||
    gender !== initialUserData.gender ||
    day !== initialUserData.day ||
    month !== initialUserData.month ||
    year !== initialUserData.year ||
    bio !== initialUserData.bio ||
    address !== initialUserData.address ||
    city !== initialUserData.city ||
    education !== initialUserData.education ||
    workplace !== initialUserData.workplace
  ) : false;

  const handleUpdate = async () => {
    if (!hasChanged || saving) return;

    setSaving(true);
    try {
      // Create date object from dropdown values (using UTC to be safe)
      const dob = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);

      const response = await apiClient.patch('/users/me', {
        full_name: userName,
        gender: gender,
        dob: dob.toISOString(),
        bio,
        address,
        city,
        education,
        workplace
      });

      if (response && response.success) {
        toast.success("Cập nhật thông tin cá nhân thành công!");
        setInitialUserData({
          userName,
          gender,
          day,
          month,
          year,
          bio,
          address,
          city,
          education,
          workplace
        });
        setIsEditing(false);
        onUpdate?.();
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Cập nhật thất bại. Vui lòng thử lại sau.");
    } finally {
      setSaving(false);
    }
  };

  const handleSystemAvatarSelect = async (img: string) => {
    try {
      setAvatarUrl(img);
      await apiClient.patch('/users/me/avatar', { avatar_url: img });
      toast.success("Đã cập nhật ảnh đại diện");
      setIsSystemAvatarPickerOpen(false);
      setIsAvatarMenuOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to update system avatar:", error);
      toast.error("Không thể lưu ảnh đại diện");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you'd upload to Cloudinary here
      // For now, we'll use a local preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    setIsAvatarMenuOpen(false);
  };

  const SYSTEM_BACKGROUNDS = [
    '/background/image1.jpg',
    '/background/image2.jpg',
    '/background/image3.jpg',
  ];

  const handleSystemBgSelect = async (url: string) => {
    setCoverPhotoPreview(url); // instant preview
    try {
      await apiClient.patch('/users/me/cover-photo', { cover_photo_url: url });
      setCoverPhotoUrl(url);
      setCoverPhotoPreview('');
      toast.success('Đã cập nhật ảnh nền');
      onUpdate?.();
    } catch (err) {
      console.error('System bg select failed:', err);
      setCoverPhotoPreview('');
      toast.error('Không thể lưu ảnh nền');
    } finally {
      setIsSystemBgPickerOpen(false);
      setIsCoverMenuOpen(false);
    }
  };

  /** Upload cover photo: validate → preview → presigned S3 PUT → PATCH /me/cover-photo */
  const validateAndUploadCover = async (file: File) => {
    // Validation
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      toast.error('Chỉ chấp nhận file JPG hoặc PNG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ảnh nền không được vượt quá 2MB');
      return;
    }

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setCoverPhotoPreview(localUrl);
    setIsUploadingCover(true);

    try {
      // 1. Get presigned URL from backend
      const presignedRes: any = await apiClient.get(
        `/users/me/presigned-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`
      );
      const presignedUrl: string = presignedRes?.data ?? presignedRes;

      // 2. PUT file directly to S3
      await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      // 3. Derive the public S3 URL (strip query params from presigned URL)
      const publicUrl = presignedUrl.split('?')[0];

      // 4. Persist to backend
      await apiClient.patch('/users/me/cover-photo', { cover_photo_url: publicUrl });

      setCoverPhotoUrl(publicUrl);
      setCoverPhotoPreview('');
      toast.success('Đã cập nhật ảnh nền');
      onUpdate?.();
    } catch (err) {
      console.error('Cover photo upload failed:', err);
      // Roll back preview on failure
      setCoverPhotoPreview('');
      toast.error('Tải ảnh nền thất bại. Vui lòng thử lại.');
    } finally {
      setIsUploadingCover(false);
      URL.revokeObjectURL(localUrl);
      // Reset input so same file can be re-selected
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setOpenDropdown(null);
    onClose();
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const years = Array.from({ length: 100 }, (_, i) => (2024 - i).toString());

  const DropdownMenu = ({ options, current, onSelect }: { options: string[], current: string, onSelect: (val: string) => void }) => (
    <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-md shadow-lg z-[110] max-h-[220px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
      {options.map((opt) => (
        <div
          key={opt}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(opt);
          }}
          className={`h-[40px] px-3 flex items-center justify-between cursor-pointer transition-colors ${opt === current ? 'bg-[var(--active-bg)] text-[var(--active-text)]' : 'hover:bg-[var(--hover-bg)] text-[var(--text)]'}`}
        >
          <span className="text-[15px]">{opt}</span>
          {opt === current && <CheckIcon size={18} />}
        </div>
      ))}
    </div>
  );

  // Calculate default avatar based on userId (Case 2 logic)
  const getDefaultAvatar = (uid: string) => {
    if (!uid) return "/avatar.jpg";
    // Sum char codes to handle non-numeric IDs too
    const charCodeSum = uid.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const index = (charCodeSum % 8) + 1;
    return `/default/image${index}.jpg`;
  };

  // Pick a deterministic default background from /background/ when user hasn't set one
  const getDefaultCoverPhoto = (uid: string) => {
    if (!uid) return '/background/image1.jpg';
    const charCodeSum = uid.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const index = (charCodeSum % 3) + 1;
    return `/background/image${index}.jpg`;
  };

  const currentAvatar = avatarUrl || getDefaultAvatar(userId);
  const currentCover = coverPhotoPreview || coverPhotoUrl || getDefaultCoverPhoto(userId);

  if (isEditing) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-300" onClick={handleClose} />

        <div className="w-full max-w-[550px] bg-[var(--card-bg)] rounded-md shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 overflow-visible flex flex-col h-[90vh] max-h-[680px]">
          {/* Header */}
          <div className="h-[48px] border-b border-[var(--border)] flex items-center justify-between px-3 bg-[var(--card-bg)] shrink-0 rounded-t-md">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-[var(--hover-bg)] rounded-full text-[var(--text)] transition-colors cursor-pointer"
              >
                <ChevronLeftIcon size={24} />
              </button>
              <h2 className="text-[17px] font-bold text-[var(--text)]">Cập nhật thông tin cá nhân</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-[var(--text)] hover:bg-[var(--hover-bg)] p-1.5 rounded-full transition-all cursor-pointer"
            >
              <XIcon size={24} />
            </button>
          </div>

          {/* Form Area */}
          <div
            className="p-4 flex flex-col gap-5 overflow-y-auto custom-scrollbar flex-1"
            onClick={() => setOpenDropdown(null)}
          >
            {/* Display Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-bold text-[var(--text)]">Tên hiển thị</label>
              <div className="h-[42px] w-full border border-[var(--border)] rounded-md px-3 flex items-center focus-within:border-[#0068FF] transition-colors text-sm">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-transparent outline-none text-[15px] text-[var(--text)]"
                />
              </div>
            </div>

            {/* Personal Info Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[16px] font-bold text-[var(--text)]">Thông tin cá nhân</h3>

              {/* Gender Radio */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${gender === 'Nam' ? 'border-[#0068FF]' : 'border-[var(--border)]'}`}>
                    {gender === 'Nam' && <div className="w-2.5 h-2.5 rounded-full bg-[#0068FF]" />}
                  </div>
                  <input type="radio" className="hidden" name="gender" checked={gender === 'Nam'} onChange={() => setGender('Nam')} />
                  <span className="text-[15px] text-[var(--text)]">Nam</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${gender === 'Nữ' ? 'border-[#0068FF]' : 'border-[var(--border)]'}`}>
                    {gender === 'Nữ' && <div className="w-2.5 h-2.5 rounded-full bg-[#0068FF]" />}
                  </div>
                  <input type="radio" className="hidden" name="gender" checked={gender === 'Nữ'} onChange={() => setGender('Nữ')} />
                  <span className="text-[15px] text-[var(--text)]">Nữ</span>
                </label>
              </div>
            </div>

            {/* Birthday Dropdowns */}
            <div className="flex flex-col gap-1.5 relative mb-4">
              <label className="text-[15px] font-bold text-[var(--text)]">Ngày sinh</label>
              <div className="grid grid-cols-3 gap-3">
                {/* DAY */}
                <div className="relative">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === 'day' ? null : 'day');
                    }}
                    className={`h-[42px] border rounded-md px-3 flex items-center justify-between cursor-pointer transition-all ${openDropdown === 'day' ? 'border-[#0068FF]' : 'border-[var(--border)] hover:border-gray-400'}`}
                  >
                    <span className="text-[15px] text-[var(--text)]">{day}</span>
                    <ChevronDownIcon size={18} className="text-[var(--sub-text)]" />
                  </div>
                  {openDropdown === 'day' && (
                    <DropdownMenu
                      options={days}
                      current={day}
                      onSelect={(val) => {
                        setDay(val);
                        setOpenDropdown(null);
                      }}
                    />
                  )}
                </div>

                {/* MONTH */}
                <div className="relative">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === 'month' ? null : 'month');
                    }}
                    className={`h-[42px] border rounded-md px-3 flex items-center justify-between cursor-pointer transition-all ${openDropdown === 'month' ? 'border-[#0068FF]' : 'border-[var(--border)] hover:border-gray-400'}`}
                  >
                    <span className="text-[15px] text-[var(--text)]">{month}</span>
                    <ChevronDownIcon size={18} className="text-[var(--sub-text)]" />
                  </div>
                  {openDropdown === 'month' && (
                    <DropdownMenu
                      options={months}
                      current={month}
                      onSelect={(val) => {
                        setMonth(val);
                        setOpenDropdown(null);
                      }}
                    />
                  )}
                </div>

                {/* YEAR */}
                <div className="relative">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === 'year' ? null : 'year');
                    }}
                    className={`h-[42px] border rounded-md px-3 flex items-center justify-between cursor-pointer transition-all ${openDropdown === 'year' ? 'border-[#0068FF]' : 'border-[var(--border)] hover:border-gray-400'}`}
                  >
                    <span className="text-[15px] text-[var(--text)]">{year}</span>
                    <ChevronDownIcon size={18} className="text-[var(--sub-text)]" />
                  </div>
                  {openDropdown === 'year' && (
                    <DropdownMenu
                      options={years}
                      current={year}
                      onSelect={(val) => {
                        setYear(val);
                        setOpenDropdown(null);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Bio Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-bold text-[var(--text)]">Giới thiệu</label>
              <div className="min-h-[80px] w-full border border-[var(--border)] rounded-md px-3 py-2 flex items-start focus-within:border-[#0068FF] transition-colors">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Thêm giới thiệu về bạn..."
                  className="w-full bg-transparent outline-none text-[15px] text-[var(--text)] resize-none h-full"
                />
              </div>
            </div>

            {/* Address & City Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-bold text-[var(--text)]">Địa chỉ</label>
                <div className="h-[42px] w-full border border-[var(--border)] rounded-md px-3 flex items-center focus-within:border-[#0068FF] transition-colors">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Địa chỉ..."
                    className="w-full bg-transparent outline-none text-[15px] text-[var(--text)]"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-bold text-[var(--text)]">Thành phố</label>
                <div className="h-[42px] w-full border border-[var(--border)] rounded-md px-3 flex items-center focus-within:border-[#0068FF] transition-colors">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Thành phố..."
                    className="w-full bg-transparent outline-none text-[15px] text-[var(--text)]"
                  />
                </div>
              </div>
            </div>

            {/* Workplace & Education Row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-bold text-[var(--text)]">Công việc</label>
                <div className="h-[42px] w-full border border-[var(--border)] rounded-md px-3 flex items-center focus-within:border-[#0068FF] transition-colors">
                  <input
                    type="text"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    placeholder="Nhà phân tích, bác sĩ..."
                    className="w-full bg-transparent outline-none text-[15px] text-[var(--text)]"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-bold text-[var(--text)]">Học vấn</label>
                <div className="h-[42px] w-full border border-[var(--border)] rounded-md px-3 flex items-center focus-within:border-[#0068FF] transition-colors">
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="Đại học Công nghiệp..."
                    className="w-full bg-transparent outline-none text-[15px] text-[var(--text)]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-3 shrink-0 rounded-b-md">
            <button
              onClick={() => setIsEditing(false)}
              className="px-5 py-1.5 bg-[var(--hover-bg)] hover:opacity-80 text-[var(--text)] font-bold rounded-[3px] text-[15px] transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleUpdate}
              disabled={!hasChanged || saving}
              className={`px-5 py-1.5 font-bold rounded-[3px] text-[15px] transition-all flex items-center gap-2 ${hasChanged && !saving
                ? 'bg-[#0068FF] text-white hover:bg-[#0057d1] cursor-pointer'
                : 'bg-[#0068FF]/30 text-white/50 cursor-default'
                }`}
            >
              {saving ? 'Đang lưu...' : 'Cập nhật'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 animate-in fade-in duration-300" onClick={handleClose} />

      <div className="w-full max-w-[550px] bg-[var(--card-bg)] rounded-md shadow-2xl relative z-[101] animate-in zoom-in-95 duration-200 overflow-visible flex flex-col">
        {/* Header */}
        <div className="h-[48px] border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--card-bg)] shrink-0 rounded-t-md">
          <h2 className="text-[17px] font-bold text-[var(--text)]">Thông tin tài khoản</h2>
          <button onClick={handleClose} className="text-[var(--text)] hover:bg-[var(--hover-bg)] p-1 rounded-full transition-all cursor-pointer">
            <XIcon size={24} />
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden custom-scrollbar bg-[var(--card-bg)]">
          <div className="h-[180px] w-full relative group/cover overflow-hidden bg-gray-200 dark:bg-gray-700">
            {/* Cover photo: preview > saved > default system background */}
            <Image
              src={currentCover}
              alt="Cover"
              fill
              className="object-cover transition-opacity duration-300"
              sizes="(max-width: 550px) 100vw, 550px"
              unoptimized={!!coverPhotoPreview}
            />

            {/* Uploading overlay */}
            {isUploadingCover && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-white">
                  <svg className="animate-spin w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  <span className="text-[13px] font-medium">Đang tải lên...</span>
                </div>
              </div>
            )}

            {/* Change Cover Button + dropdown menu — visible on hover */}
            {!isUploadingCover && (
              <div className="absolute bottom-3 right-3 opacity-0 group-hover/cover:opacity-100 transition-all">
                <button
                  onClick={() => setIsCoverMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-[13px] font-medium rounded-md cursor-pointer"
                >
                  <CameraIcon size={14} />
                  Thay đổi ảnh nền
                </button>

                {isCoverMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-52 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-150 z-20">
                    <button
                      onClick={() => { setIsSystemBgPickerOpen(true); setIsCoverMenuOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-[13px] hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <GlobeIcon size={15} />
                      Ảnh nền hệ thống
                    </button>
                    <button
                      onClick={() => { coverFileInputRef.current?.click(); setIsCoverMenuOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-[13px] hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      Tải ảnh từ máy
                    </button>
                  </div>
                )}
              </div>
            )}
            <input
              type="file"
              ref={coverFileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/jpg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) validateAndUploadCover(file);
              }}
            />
          </div>

          <div className="relative px-4 pb-4 border-b-8 border-[var(--background)]">
            <div className="flex items-center gap-4">
              <div className="relative -mt-8 mb-2">
                <div className="w-[80px] h-[80px] rounded-full border-[3px] border-[var(--card-bg)] overflow-hidden bg-[var(--card-bg)] shadow-md relative">
                  <Image src={currentAvatar} fill alt="Avatar" className="object-cover" sizes="80px" />
                </div>
                <button
                  onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
                  className="absolute bottom-0 right-0 w-[30px] h-[30px] bg-[var(--hover-bg)] rounded-full flex items-center justify-center text-[var(--sub-text)] border border-[var(--card-bg)] hover:opacity-80 transition-colors cursor-pointer shadow-sm z-10"
                >
                  <CameraIcon size={16} />
                </button>

                {/* Avatar Action Menu */}
                {isAvatarMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={() => setIsSystemAvatarPickerOpen(true)}
                      className="w-full px-4 py-2.5 text-left text-[14px] hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <GlobeIcon size={16} />
                      Avatar hệ thống
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-2.5 text-left text-[14px] hover:bg-[var(--hover-bg)] transition-colors text-[var(--text)] font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      Avatar từ máy
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 pt-2">
                <h1 className="text-[18px] font-bold text-[var(--text)]">{userName}</h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[var(--hover-bg)] rounded-full text-[var(--text)] opacity-70 transition-colors cursor-pointer ml-1"
                >
                  <PencilIcon size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-5">
            <h3 className="text-[16px] font-bold text-[var(--text)] mb-5">Thông tin cá nhân</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="w-[100px] text-[15px] text-[var(--sub-text)] shrink-0">Giới tính</span>
                <span className="text-[15px] text-[var(--text)]">{gender}</span>
              </div>
              <div className="flex items-start">
                <span className="w-[100px] text-[15px] text-[var(--sub-text)] shrink-0">Ngày sinh</span>
                <span className="text-[15px] text-[var(--text)]">{day} tháng {month}, {year}</span>
              </div>
              <div className="flex items-start">
                <span className="w-[100px] text-[15px] text-[var(--sub-text)] shrink-0">Điện thoại</span>
                <span className="text-[15px] text-[var(--text)]">{phoneNumber}</span>
              </div>
            </div>
            <div className="mt-8">
              <p className="text-[13px] text-[var(--sub-text)] leading-relaxed">
                Chỉ bạn bè có lưu số của bạn trong danh bạ máy xem được số này
              </p>
            </div>

            {/* Added Update Button at bottom like first screenshot showed earlier, 
                  but I'll also allow clicking the pencil. 
                  Wait, if the user only showed the second screen for updating, I'll stick to that. */}
            <div className="mt-6 pt-2">
              <button
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--hover-bg)] hover:opacity-80 border border-[var(--border)] rounded-md transition-all text-[var(--text)] font-bold text-[15px] cursor-pointer"
              >
                <PencilIcon size={18} />
                Cập nhật thông tin
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* System Avatar Picker Modal */}
      {isSystemAvatarPickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] w-[400px] rounded-xl shadow-2xl overflow-hidden border border-[var(--border)]">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--text)]">Chọn avatar hệ thống</h3>
              <button
                onClick={() => setIsSystemAvatarPickerOpen(false)}
                className="p-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors cursor-pointer text-[var(--sub-text)]"
              >
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-4 gap-3 bg-[var(--background)]">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <button
                  key={i}
                  onClick={() => handleSystemAvatarSelect(`/default/image${i}.jpg`)}
                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[#0068FF] transition-all cursor-pointer group shadow-sm bg-white dark:bg-gray-800"
                >
                  <Image src={`/default/image${i}.jpg`} fill alt={`Default ${i}`} className="object-cover group-hover:scale-110 transition-transform" />
                  {currentAvatar === `/default/image${i}.jpg` && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <div className="bg-white rounded-full p-0.5">
                        <CheckIcon size={14} />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Background Picker Modal */}
      {isSystemBgPickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] w-[480px] rounded-xl shadow-2xl overflow-hidden border border-[var(--border)]">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--text)]">Chọn ảnh nền hệ thống</h3>
              <button
                onClick={() => setIsSystemBgPickerOpen(false)}
                className="p-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors cursor-pointer text-[var(--sub-text)]"
              >
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3 bg-[var(--background)]">
              {SYSTEM_BACKGROUNDS.map((src, idx) => {
                const isActive = currentCover === src;
                return (
                  <button
                    key={src}
                    onClick={() => handleSystemBgSelect(src)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer group shadow-sm ${isActive ? 'border-[#0068FF] scale-[0.97]' : 'border-transparent hover:border-[#0068FF]'}`}
                    style={{ aspectRatio: '16/9' }}
                  >
                    <Image
                      src={src}
                      fill
                      alt={`Ảnh nền ${idx + 1}`}
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="140px"
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <div className="bg-white rounded-full p-1 shadow">
                          <CheckIcon size={14} />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-[12px] text-[var(--sub-text)] pb-3">
              Bấm vào ảnh để áp dụng ngay
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
