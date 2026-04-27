import React, { useState, useRef } from 'react';
import { Button, Input } from 'antd';
import {
  XIcon,
  ImagePlusIcon,
  TypeIcon,
  SmileIcon,
  ChevronLeftIcon,
  CheckIcon
} from '@/components/ui/Icons';
import { SocialUser } from '../../types';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { useTheme } from '@/themes';

interface CreateStoryModalProps {
  user: SocialUser | null;
  onClose: () => void;
  onShare: (data: { type: 'IMAGE' | 'VIDEO' | 'TEXT', content: string | File, background?: string }) => Promise<void>;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ user, onClose, onShare }) => {
  const { t } = useTranslation();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  const [step, setStep] = useState<'SELECT' | 'EDIT'>('SELECT');
  const [storyType, setStoryType] = useState<'IMAGE' | 'VIDEO' | 'TEXT' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState('');
  const [background, setBackground] = useState('linear-gradient(to bottom, #FFD600, #FF0069)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setStoryType(selectedFile.type.startsWith('video/') ? 'VIDEO' : 'IMAGE');
      setStep('EDIT');
    }
  };

  const handleShare = async () => {
    setIsSubmitting(true);
    try {
      await onShare({
        type: storyType || 'TEXT',
        content: storyType === 'TEXT' ? textContent : file!,
        background: storyType === 'TEXT' ? background : undefined
      });
      onClose();
    } catch (error) {
      console.error('Failed to share story:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer" onClick={onClose} />

      {/* Main Container */}
      <div className={`relative ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'} rounded-xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${
        step === 'SELECT' ? 'w-full max-w-[420px] h-[500px]' : 'w-full max-w-[1000px] h-[90vh] max-h-[800px]'
      }`}>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50 pointer-events-none">
          <div className="w-8" />
          <h2 className={`${isDark || step === 'EDIT' ? 'text-white' : 'text-black'} font-bold shadow-sm`} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            {t('social.stories.create_title', 'Tạo tin mới')}
          </h2>
          <button
            onClick={step === 'EDIT' ? () => setStep('SELECT') : onClose}
            className={`w-10 h-10 rounded-full ${isDark ? 'bg-black/50 text-white hover:bg-black/80' : 'bg-gray-100 text-black hover:bg-gray-200'} flex items-center justify-center transition-colors cursor-pointer pointer-events-auto shadow-lg border border-white/10`}
          >
            <XIcon size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {step === 'SELECT' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 p-10">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#FFD600] via-[#FF7A00] to-[#FF0069] flex items-center justify-center shadow-2xl">
                <ImagePlusIcon size={40} className="text-white" />
              </div>
              <div className="text-center space-y-2">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>{t('social.stories.select_desc', 'Chọn ảnh hoặc video để bắt đầu')}</h3>
                <p className="text-zinc-500 text-sm">{t('social.stories.select_subdesc', 'Tin của bạn sẽ hiển thị trong 24 giờ')}</p>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
                <Button
                  type="primary"
                  size="large"
                  className="bg-[#0095F6] hover:bg-[#18a4f9] border-none font-bold h-12"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('social.stories.upload_btn', 'Tải lên từ máy tính')}
                </Button>
                <Button
                  ghost
                  size="large"
                  className={`${isDark ? 'border-zinc-700 text-white hover:border-white' : 'border-gray-300 text-black hover:border-black'} font-bold h-12`}
                  onClick={() => {
                    setStoryType('TEXT');
                    setStep('EDIT');
                  }}
                >
                  <TypeIcon size={18} className="mr-2" />
                  {t('social.stories.text_btn', 'Bắt đầu với văn bản')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row">
              {/* Preview Area */}
              <div
                className="flex-1 flex items-center justify-center relative overflow-hidden bg-black border-r border-zinc-800"
              >
                <div className="w-full h-full flex items-center justify-center relative z-10">
                  {storyType === 'IMAGE' && previewUrl && (
                    <Image src={previewUrl} fill alt="Preview" className="object-cover" />
                  )}
                  {storyType === 'VIDEO' && previewUrl && (
                    <video src={previewUrl} className="w-full h-full object-cover" autoPlay muted loop />
                  )}
                  {storyType === 'TEXT' && (
                    <div className="w-full h-full flex items-center justify-center" style={{ background }}>
                      <div className="p-12 text-center w-full">
                        <p
                          className="text-white font-bold text-5xl break-all whitespace-pre-wrap"
                          style={{ textShadow: '0 4px 20px rgba(0,0,0,0.6)' }}
                        >
                          {textContent || t('social.stories.text_placeholder', 'Bắt đầu nhập...')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Overlays - Positioned within the full area */}
                  <div className="absolute top-8 left-8 flex items-center gap-3 z-20">
                    <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-lg">
                      <Image src={user?.avatar_url || '/avatar.jpg'} width={40} height={40} alt="User" />
                    </div>
                    <span className="text-white text-[14px] font-bold shadow-sm" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      {user?.display_name || 'Your Story'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sidebar Controls */}
              <div className={`w-full md:w-[350px] flex flex-col p-6 gap-6 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-black'}`}>{t('social.stories.edit_settings', 'Cài đặt tin')}</h3>

                {storyType === 'TEXT' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-zinc-500 text-[12px] font-bold uppercase">{t('social.stories.text_content', 'Nội dung')}</label>
                      <Input.TextArea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder={t('social.stories.text_placeholder', 'Bắt đầu nhập...')}
                        rows={4}
                        className={`${isDark ? 'bg-zinc-800 border-none text-white' : 'bg-gray-50 border-gray-200 text-black'} focus:ring-0 custom-story-textarea`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-zinc-500 text-[12px] font-bold uppercase">{t('social.stories.background', 'Phông nền')}</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          'linear-gradient(to bottom, #FFD600, #FF0069)',
                          'linear-gradient(to bottom, #7928CA, #FF0080)',
                          'linear-gradient(to bottom, #00DFD8, #007CF0)',
                          'linear-gradient(to bottom, #FF4D4D, #F9CB28)',
                          '#1a1a1a'
                        ].map((bg) => (
                          <button
                            key={bg}
                            onClick={() => setBackground(bg)}
                            className={`aspect-square rounded-full border-2 transition-transform ${background === bg ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ background: bg }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-zinc-400 text-sm">{t('social.stories.media_ready', 'Tệp của bạn đã sẵn sàng để chia sẻ.')}</p>
                  </div>
                )}

                <div className={`mt-auto pt-6 border-t ${isDark ? 'border-zinc-800' : 'border-gray-100'} space-y-3`}>
                  <div className="flex items-center gap-2 text-zinc-500 text-sm mb-4">
                    <CheckIcon size={16} className="text-green-500" />
                    <span>{t('social.stories.visibility_notice', 'Công khai với mọi người trong 24h')}</span>
                  </div>
                  <Button
                    type="primary"
                    block
                    size="large"
                    onClick={handleShare}
                    loading={isSubmitting}
                    className="bg-[#0095F6] hover:bg-[#18a4f9] border-none font-bold h-12"
                  >
                    {t('social.stories.share_btn', 'Chia sẻ lên tin')}
                  </Button>
                  <Button
                    block
                    size="large"
                    onClick={() => setStep('SELECT')}
                    className={`bg-transparent ${isDark ? 'border-zinc-700 text-white hover:border-white' : 'border-gray-300 text-black hover:border-black'} h-12`}
                  >
                    {t('social.common.cancel', 'Hủy')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-story-textarea {
          background: ${isDark ? '#262626' : '#f9f9f9'} !important;
          color: ${isDark ? 'white' : 'black'} !important;
          border: ${isDark ? 'none' : '1px solid #eee'} !important;
          border-radius: 8px !important;
          padding: 12px !important;
        }
        .custom-story-textarea:focus {
          box-shadow: none !important;
          background: ${isDark ? '#333' : '#fff'} !important;
        }
      ` }} />
    </div>
  );
};
