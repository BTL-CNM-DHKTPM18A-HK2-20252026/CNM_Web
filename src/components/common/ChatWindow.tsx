import React, { useRef } from 'react';
import {
  SearchIcon,
  StickerIcon,
  ImagePickerIcon,
  FilePickerIcon,
  ScreenShotIcon,
  BusinessCardIcon,
  LightningIcon,
  EmojiIcon,
  LikeIcon,
  SendIcon
} from '@/components/ui/Icons';
import { useTranslation } from 'react-i18next';
import { StickerPicker } from '@/components/common/StickerPicker';
import { NicknameModal } from '@/components/common/NicknameModal';

interface ChatWindowProps {
  onToggleSidebar: (type: 'info' | 'search') => void;
  activeSidebar: 'info' | 'search' | null;
  selectedChat: {
    id: number;
    name: string;
    isCloud?: boolean;
    avatar?: string;
  };
}

export function ChatWindow({ onToggleSidebar, activeSidebar, selectedChat }: ChatWindowProps) {
  const { t } = useTranslation();
  const [message, setMessage] = React.useState("");
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const [pickerTab, setPickerTab] = React.useState<'sticker' | 'emoji' | 'gif'>('sticker');
  const [isNicknameModalOpen, setIsNicknameModalOpen] = React.useState(false);
  const [isFilePopoverOpen, setIsFilePopoverOpen] = React.useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleFileIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFilePopoverOpen(!isFilePopoverOpen);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
    setIsFilePopoverOpen(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Selected image:', file.name);
      import('sonner').then(({ toast }) => {
        toast.success(`Đã chọn ảnh: ${file.name}`);
      });
      // In a real app, you would upload the file here
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Selected file:', file.name);
      import('sonner').then(({ toast }) => {
        toast.success(`Đã chọn file: ${file.name}`);
      });
      // In a real app, you would upload the file here
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessage(""); // Reset input
    }
  };

  const togglePicker = (tab: 'sticker' | 'emoji' | 'gif') => {
    if (isPickerOpen && pickerTab === tab) {
      setIsPickerOpen(false);
    } else {
      setPickerTab(tab);
      setIsPickerOpen(true);
    }
  };

  const onSelectSticker = (sticker: any) => {
    console.log("Selected sticker:", sticker);
    setIsPickerOpen(false);
  };

  const messages = [
    { id: 1, text: "Bạn đã xem qua mô hình DeepSeek R1 và GPT-o3-mini chưa? Thật sự ấn tượng đấy!", sender: "Hiep", time: "15:00", reaction: 1 },
    { id: 2, text: "Rồi bạn, khả năng suy luận (reasoning) của chúng đang thay đổi cách mình lập trình.", sender: "Me", time: "15:05" },
    { id: 3, text: "Đúng thế, đặc biệt là trong việc phát triển các Agentic Workflow cho dự án CNM của tụi mình.", sender: "Hiep", time: "15:10", reaction: 2 },
    { id: 4, text: "Chuẩn luôn! Mình đang tích cực áp dụng các kỹ thuật đó vào chat interface này đây.", sender: "Me", time: "15:12" },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] transition-colors duration-200">
      {/* HEADER */}
      <div className="h-[64px] bg-[var(--card-bg)] border-b border-[var(--border)] px-4 flex items-center justify-between shadow-sm flex-shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-3">
          {selectedChat.isCloud ? (
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-[#0068FF] font-bold shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L10 13.17l7.59-7.59L19 7l-8 9z" /></svg>
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full overflow-hidden shrink-0">
              <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0 group/info cursor-pointer flex items-center gap-2">
            <div>
              <h3 className="text-[15px] font-bold leading-none mb-1 text-[var(--text)] truncate flex items-center gap-1.5">
                {selectedChat.name}
                <button
                  onClick={() => setIsNicknameModalOpen(true)}
                  className="p-1 hover:bg-[var(--hover-bg)] rounded-md opacity-0 group-hover/info:opacity-100 transition-all text-gray-400 hover:text-[var(--text)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
              </h3>
              <p className="text-[11px] text-[var(--sub-text)] truncate">{selectedChat.isCloud ? t('chat.cloud_subheading') : 'Truy cập 2 giờ trước'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[var(--sub-text)] pr-2 shrink-0">
          <button
            onClick={() => onToggleSidebar('search')}
            className={`cursor-pointer transition-all p-1 rounded-md ${activeSidebar === 'search' ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}
          >
            <SearchIcon size={20} />
          </button>
          <button
            onClick={() => onToggleSidebar('info')}
            className={`cursor-pointer transition-all p-1 rounded-md ${activeSidebar === 'info' ? 'text-[#0068FF] bg-[var(--hover-bg)]' : 'hover:text-[#0068FF] hover:bg-[var(--hover-bg)] opacity-70'}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 bg-[var(--chat-bg)]">
        {selectedChat.isCloud ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--sub-text)] opacity-40 italic text-sm">
            {t('chat.cloud_subheading')}
          </div>
        ) : (
          <>
            <div className="flex justify-center my-2">
              <span className="bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full text-[12px] font-bold text-[var(--sub-text)]">
                Hôm nay
              </span>
            </div>

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'Me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[80%] group relative ${msg.sender === 'Me' ? 'flex-row-reverse' : ''}`}>
                  {msg.sender !== 'Me' && (
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 border-[1px] border-[#DBDFE6] dark:border-white/10 shadow-sm">
                      <img src={selectedChat.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className={`flex flex-col ${msg.sender === 'Me' ? 'items-end' : 'items-start'} relative mt-1.5`}>
                    <div className={`px-4 py-2.5 rounded-md shadow-sm text-[15px] relative group border min-w-[120px] ${msg.sender === 'Me'
                      ? 'bg-[var(--message-me-bg)] text-[var(--message-me-text)] border-[var(--message-me-border)]'
                      : 'bg-[var(--message-other-bg)] text-[var(--message-other-text)] border-[var(--message-other-border)]'
                      }`}>
                      <div className="mb-1 leading-relaxed">{msg.text}</div>
                      <div className={`text-[11px] text-[var(--sub-text)] opacity-60 ${msg.sender === 'Me' ? 'text-right' : 'text-left'}`}>
                        {msg.time}
                      </div>

                      {/* Reactions - Absolute positioned at the bottom right/left of the bubble */}
                      {msg.reaction && (
                        <div className={`absolute -bottom-3 ${msg.sender === 'Me' ? 'right-2' : 'left-[calc(100%-40px)]'} flex items-center gap-1 z-10 animate-in fade-in slide-in-from-top-1 duration-200`}>
                          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-sm h-6">
                            <span className="text-[14px]">❤️</span>
                            <span className="text-[11px] font-bold text-[var(--text)]">{msg.reaction}</span>
                          </div>
                        </div>
                      )}

                      {/* Quick Reaction Button (Visible on hover) */}
                      <div className={`absolute -bottom-4 ${msg.sender === 'Me' ? 'left-[-40px]' : 'right-[-40px]'} opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 group/reaction-btn`}>
                        {/* The Pill Menu (Visible when hovering the button) */}
                        <div className="absolute bottom-[24px] left-1/2 -translate-x-1/2 hidden group-hover/reaction-btn:flex items-center gap-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-full px-3 py-1.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 pb-3">
                          {['👍', '❤️', '😂', '😲', '😭', '😡'].map((emoji) => (
                            <button
                              key={emoji}
                              className="text-[20px] hover:scale-125 transition-transform cursor-pointer relative z-50 pt-3"
                              title={emoji}
                            >
                              <span className="block mt-[-12px]">{emoji}</span>
                            </button>
                          ))}
                        </div>

                        {/* The Main Quick Icon Button */}
                        <button className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer text-gray-400 hover:text-[#0068FF]">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons on hover */}
                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity h-fit mt-1.5 ${msg.sender === 'Me' ? 'mr-2 flex-row-reverse' : 'ml-2'}`}>
                    <button className="w-8 h-8 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] shadow-sm transition-all border border-[var(--border)]/20 cursor-pointer">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                    </button>
                    <button className="w-8 h-8 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] shadow-sm transition-all border border-[var(--border)]/20 cursor-pointer">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 10l5-5 5 5M8 6v8a4 4 0 004 4h9" /></svg>
                    </button>
                    <button className="w-8 h-8 rounded-full bg-[var(--card-bg)]/60 flex items-center justify-center hover:bg-[var(--card-bg)] text-[var(--sub-text)] shadow-sm transition-all border border-[var(--border)]/20 cursor-pointer">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* REFINED INPUT BAR (Like the screenshot) */}
      <div className="bg-[var(--card-bg)] border-t border-[var(--border)] flex-shrink-0 transition-colors duration-200">
        {/* Row 1: Actions */}
        <div className="flex items-center px-4 py-1.5 gap-1.5 border-b border-[var(--border)] transition-colors duration-200 relative">
          <button
            onClick={() => togglePicker('sticker')}
            className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-all ${isPickerOpen && pickerTab === 'sticker' ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}
          >
            <StickerIcon size={20} />
          </button>
          <button
            onClick={handleImageClick}
            className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"
          >
            <ImagePickerIcon size={20} />
          </button>
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          <div className="relative">
            <button
              onClick={handleFileIconClick}
              className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-all ${isFilePopoverOpen ? 'bg-[var(--hover-bg)] text-[#0068FF]' : 'text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF]'}`}
            >
              <FilePickerIcon size={20} />
            </button>
            {/* Popover */}
            {isFilePopoverOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFilePopoverOpen(false)} />
                <div className="absolute bottom-[calc(100%+14px)] left-0 bg-[var(--card-bg)] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-[var(--border)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={handleFileClick}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-bg)] rounded-lg transition-colors cursor-pointer whitespace-nowrap min-w-[160px]"
                  >
                    <div className="text-[var(--text)]">
                      <FilePickerIcon size={20} />
                    </div>
                    <span className="text-[16px] font-medium text-[var(--text)]">Chọn File</span>
                  </button>
                  {/* Arrow */}
                  <div className="absolute top-[calc(100%-1px)] left-4 w-4 h-4 overflow-hidden">
                    <div className="w-2.5 h-2.5 bg-[var(--card-bg)] border-b border-r border-[var(--border)] rotate-45 -translate-y-1.5 mx-auto" />
                  </div>
                </div>
              </>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><ScreenShotIcon size={20} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><BusinessCardIcon size={20} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--sub-text)] hover:bg-[var(--hover-bg)] hover:text-[#0068FF] transition-all"><LightningIcon size={20} /></button>

          <StickerPicker
            isOpen={isPickerOpen}
            onClose={() => setIsPickerOpen(false)}
            onSelect={onSelectSticker}
            activeTab={pickerTab}
          />
        </div>

        {/* Row 2: Text Input */}
        <div className="flex items-center px-4 py-3 gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={t('chat.input_placeholder')}
              className="w-full bg-transparent outline-none text-[15px] placeholder:text-[var(--sub-text)] placeholder:opacity-50 py-1 text-[var(--text)]"
            />
          </div>
          <div className="flex items-center gap-2 pr-1 shrink-0">
            <button
              onClick={() => togglePicker('emoji')}
              className={`cursor-pointer transition-colors ${isPickerOpen && pickerTab === 'emoji' ? 'text-[#0068FF]' : 'text-[var(--sub-text)] hover:text-[#0068FF]'}`}
            >
              <EmojiIcon size={22} />
            </button>
            {message.trim() ? (
              <button
                onClick={handleSendMessage}
                className="cursor-pointer text-[#0068FF] transition-all animate-in fade-in zoom-in-50 duration-200 flex items-center justify-center transform translate-y-[-1px]"
              >
                <SendIcon size={24} />
              </button>
            ) : (
              <button className="cursor-pointer text-[#0068FF] transition-transform hover:scale-110 active:scale-90 animate-in fade-in zoom-in-50 duration-200 flex items-center justify-center transform translate-y-[-1.5px]">
                <LikeIcon size={24} />
              </button>
            )}
          </div>
        </div>
      </div>

      <NicknameModal
        isOpen={isNicknameModalOpen}
        onClose={() => setIsNicknameModalOpen(false)}
        currentName={selectedChat.name}
        avatar={selectedChat.avatar}
        onConfirm={(newName) => {
          console.log('Update nickname to:', newName);
          // In a real app, we'd update state/API here.
        }}
      />
    </div>
  );
}
