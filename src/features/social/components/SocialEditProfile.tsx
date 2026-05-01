import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SocialUser } from '../types';
import { 
  ArrowLeft, 
  Camera, 
  User, 
  Briefcase, 
  MapPin, 
  Globe, 
  Lock,
  Landmark,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface SocialEditProfileProps {
  user: SocialUser | null;
  onUpdate: (data: Partial<SocialUser>) => Promise<void>;
  onBack?: () => void;
}

export const SocialEditProfile: React.FC<SocialEditProfileProps> = ({ user, onUpdate, onBack }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: user?.first_name || user?.firstName || '',
    lastName: user?.last_name || user?.lastName || '',
    gmail: user?.gmail || '',
    website: '',
    bio: user?.bio || '',
    gender: user?.gender || 'Male',
    workplace: user?.workplace || '',
    education: user?.education || '',
    city: user?.city || '',
    address: user?.address || '',
    showAccountSuggestions: true,
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.first_name || user.firstName || '',
        lastName: user.last_name || user.lastName || '',
        gmail: user.gmail || '',
        website: '',
        bio: user.bio || '',
        gender: user.gender || 'Male',
        workplace: user.workplace || '',
        education: user.education || '',
        city: user.city || '',
        address: user.address || '',
        showAccountSuggestions: true,
      });
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onUpdate(formData);
      toast.success(t('social.profile.update_success', 'Đã cập nhật hồ sơ thành công!'));
    } catch (error) {
      toast.error(t('social.profile.update_error', 'Không thể cập nhật hồ sơ.'));
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: Check file size/type
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('social.profile.avatar_too_large', 'Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.'));
      return;
    }

    setIsUploading(true);
    try {
      // Create local preview
      const previewUrl = URL.createObjectURL(file);
      
      // In a real app, you would upload to S3/Cloudinary first
      // For now, we update the profile with the file or mock URL
      // Assuming onUpdate can handle a FormData or we have a separate upload API
      
      // Let's mock the upload result
      await onUpdate({ avatar_url: previewUrl });
      toast.success(t('social.profile.avatar_update_success', 'Đã cập nhật ảnh đại diện!'));
    } catch (error) {
      toast.error(t('social.profile.avatar_update_error', 'Không thể cập nhật ảnh đại diện.'));
    } finally {
      setIsUploading(false);
    }
  };

  const mapGenderToVietnamese = (gender: string) => {
    switch (gender) {
      case 'Male': return 'Nam';
      case 'Female': return 'Nữ';
      case 'Custom': return 'Tùy chỉnh';
      case 'Prefer not to say': return 'Ẩn';
      default: return 'Nam';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#0A0A0A] text-black dark:text-gray-100 animate-in fade-in duration-500 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center p-6 pb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-[18px] font-bold text-black dark:text-white leading-tight">{t('social.profile.edit_title', 'Chỉnh sửa hồ sơ')}</h1>
            <p className="text-[13px] text-gray-500">Cập nhật thông tin để mọi người hiểu rõ hơn về bạn</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden px-6 pb-6 gap-6">
        {/* Left Info Panel */}
        <div className="w-[300px] lg:w-[320px] rounded-xl border border-gray-200 dark:border-zinc-800/60 bg-gray-50 dark:bg-[#121212] overflow-y-auto scrollbar-hide relative flex flex-col shrink-0">
          {/* Top Gradient */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0095F6]/10 to-transparent pointer-events-none rounded-t-xl" />
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center pt-10 pb-6 relative z-10">
            <div className="relative mb-3">
              <div className={`w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-orange-500 relative bg-zinc-800 ${isUploading ? 'opacity-50' : ''}`}>
                <Image 
                  src={user?.avatar_url || user?.avatarUrl || "/avatar.jpg"} 
                  fill 
                  alt="Avatar" 
                  className="object-cover"
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button 
                type="button" 
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="absolute bottom-0 right-0 p-1.5 bg-[#0095F6] text-white rounded-full border-2 border-white dark:border-[#121212] hover:bg-[#1877F2] transition-all cursor-pointer"
              >
                <Camera size={14} />
              </button>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-[16px] font-bold text-black dark:text-white">@{user?.username || user?.user_name || 'username'}</h2>
              <button 
                type="button" 
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="text-[#0095F6] text-[13px] font-medium hover:underline cursor-pointer bg-transparent border-none"
              >
                {t('social.profile.change_avatar', 'Thay đổi ảnh đại diện')}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>

          {/* Highlights */}
          <div className="px-6 space-y-5 pb-6 flex-1 z-10">
            <h3 className="text-[13px] font-bold text-black dark:text-white">Thông tin nổi bật</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Landmark size={18} className="text-gray-400" />
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{formData.education || 'Chưa cập nhật'}</p>
                  <span className="text-[11px] text-gray-500">(Học vấn)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-gray-400" />
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{formData.city || 'Chưa cập nhật'}</p>
                  <span className="text-[11px] text-gray-500">(Địa chỉ)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase size={18} className="text-gray-400" />
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{formData.workplace || 'Chưa cập nhật'}</p>
                  <span className="text-[11px] text-gray-500">(Nơi làm việc)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User size={18} className="text-gray-400" />
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{mapGenderToVietnamese(formData.gender)}</p>
                  <span className="text-[11px] text-gray-500">(Giới tính)</span>
                </div>
              </div>
            </div>

            {/* Security Box */}
            <div className="mt-6 p-4 bg-gray-100 dark:bg-[#1A1A1A] border border-gray-200 dark:border-zinc-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-[13px] font-bold text-black dark:text-white">
                <Lock size={14} className="text-[#0095F6]" />
                <span>Thông tin bảo mật</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Email liên hệ của bạn được sử dụng để đăng nhập và nhận thông báo quan trọng.
              </p>
              <div className="text-[12px] font-bold text-black dark:text-white truncate pt-0.5">
                {formData.gmail || user?.gmail || 'example@gmail.com'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="flex-1 rounded-xl border border-gray-200 dark:border-zinc-800/60 bg-gray-50 dark:bg-[#121212] p-6 overflow-y-auto scrollbar-hide flex flex-col">
          <form onSubmit={handleSubmit} className="w-full flex flex-col min-h-full max-w-4xl mx-auto">
            <div className="flex-1 flex flex-col gap-6">
              
              {/* Section: Basic Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[#0095F6]">
                  <User size={18} />
                  <h3 className="text-[14px] font-bold">Thông tin cơ bản</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-gray-400">Họ</label>
                    <input 
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full bg-transparent border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-[14px] text-black dark:text-white focus:border-[#0095F6] outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-gray-400">Tên</label>
                    <input 
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full bg-transparent border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-[14px] text-black dark:text-white focus:border-[#0095F6] outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-gray-400">Email liên hệ</label>
                    <div className="relative">
                      <input 
                        type="email"
                        value={formData.gmail}
                        onChange={(e) => setFormData({...formData, gmail: e.target.value})}
                        className="w-full bg-transparent border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-2 pr-10 text-[14px] text-black dark:text-white focus:border-[#0095F6] outline-none transition-colors"
                      />
                      <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-gray-400">Giới tính</label>
                    <div className="relative">
                      <select 
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="w-full bg-transparent border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-[14px] text-black dark:text-white focus:border-[#0095F6] outline-none appearance-none cursor-pointer transition-colors"
                      >
                        <option className="dark:bg-[#121212]" value="Male">Nam</option>
                        <option className="dark:bg-[#121212]" value="Female">Nữ</option>
                        <option className="dark:bg-[#121212]" value="Custom">Tùy chỉnh</option>
                        <option className="dark:bg-[#121212]" value="Prefer not to say">Ẩn</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Career */}
              <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 text-[#0095F6]">
                  <Briefcase size={18} />
                  <h3 className="text-[14px] font-bold">Công việc & Học vấn</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-gray-400">Nơi làm việc</label>
                    <input 
                      type="text"
                      value={formData.workplace}
                      onChange={(e) => setFormData({...formData, workplace: e.target.value})}
                      className="w-full bg-transparent border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-[14px] text-black dark:text-white focus:border-[#0095F6] outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-gray-400">Học vấn</label>
                    <input 
                      type="text"
                      value={formData.education}
                      onChange={(e) => setFormData({...formData, education: e.target.value})}
                      className="w-full bg-transparent border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-[14px] text-black dark:text-white focus:border-[#0095F6] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Location */}
              <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 text-[#0095F6]">
                  <MapPin size={18} />
                  <h3 className="text-[14px] font-bold">Địa chỉ</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-gray-400">Thành phố</label>
                    <input 
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full bg-transparent border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-[14px] text-black dark:text-white focus:border-[#0095F6] outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-gray-400">Địa chỉ</label>
                    <input 
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-transparent border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-[14px] text-black dark:text-white focus:border-[#0095F6] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Additional */}
              <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 text-[#0095F6]">
                  <Globe size={18} />
                  <h3 className="text-[14px] font-bold">Thông tin bổ sung</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-gray-400">Trang web</label>
                    <input 
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      placeholder="https://yourwebsite.com"
                      className="w-full bg-transparent border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-[14px] text-black dark:text-white focus:border-[#0095F6] outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-gray-400">Tiểu sử</label>
                    <div className="relative">
                      <textarea 
                        value={formData.bio}
                        maxLength={150}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className="w-full h-[70px] bg-transparent border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-2 text-[14px] text-black dark:text-white focus:border-[#0095F6] outline-none transition-colors resize-none"
                      />
                      <div className="absolute bottom-2 right-2 text-[11px] text-gray-500">{formData.bio.length}/150</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-3">
                  <Lock size={16} className="text-gray-400" />
                  <div>
                    <h4 className="text-[13px] font-bold text-black dark:text-white">Gợi ý tài khoản</h4>
                    <p className="text-[11px] text-gray-500">Hiển thị các tài khoản tương tự với mọi người.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, showAccountSuggestions: !formData.showAccountSuggestions})}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${formData.showAccountSuggestions ? 'bg-[#0095F6]' : 'bg-gray-300 dark:bg-zinc-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.showAccountSuggestions ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>

            </div>

            {/* Bottom Buttons */}
            <div className="flex items-center gap-4 pt-8 mt-auto">
              <button 
                type="button" 
                onClick={onBack}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-800 bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800/50 text-black dark:text-white font-medium text-[14px] transition-colors"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`flex-1 py-2.5 rounded-lg bg-[#0095F6] hover:bg-[#1877F2] text-white font-medium text-[14px] transition-colors ${isSubmitting ? 'opacity-70' : ''}`}
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

