import type { ClipboardEvent, KeyboardEvent, RefObject } from 'react';
import { useEffect, useRef } from 'react';
import { EmojiIcon, LikeIcon, SendIcon } from '@/components/ui/Icons';

interface ChatInputProps {
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  isEmojiOpen?: boolean;
  showSendButton?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendLike: () => void;
  onToggleEmoji?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatInput({
  inputRef,
  value,
  placeholder,
  disabled,
  isEmojiOpen,
  showSendButton,
  onChange,
  onSend,
  onSendLike,
  onToggleEmoji,
  onKeyDown,
  onPaste,
}: ChatInputProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const ref = (inputRef as any) || internalRef;

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = '28px'; // baseline for 1 line
      const scrollHeight = ref.current.scrollHeight;
      ref.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [value, ref]);

  return (
    <div className="flex items-end px-4 py-3 gap-3">
      <div className="flex-1 pb-1">
        <textarea
          ref={ref as any}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent outline-none text-[15px] placeholder:text-[var(--sub-text)] placeholder:opacity-50 py-0 text-[var(--text)] disabled:opacity-50 resize-none overflow-y-auto block leading-[20px]"
        />
      </div>
      <div className="flex items-center gap-2 pr-1 shrink-0">
        <button
          type="button"
          onClick={onToggleEmoji}
          className={`transition-colors cursor-pointer ${
            isEmojiOpen ? 'text-[#0068FF]' : 'text-[var(--sub-text)] hover:text-[var(--text)]'
          }`}
        >
          <EmojiIcon size={22} />
        </button>
        {showSendButton ? (
          <button
            type="button"
            onClick={onSend}
            disabled={disabled}
            className={`flex items-center justify-center transform translate-y-[-1px] ${
              disabled ? 'text-gray-400 cursor-not-allowed' : 'text-[#0068FF] cursor-pointer'
            }`}
          >
            <SendIcon size={22} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSendLike}
            className="text-[#0068FF] hover:scale-110 active:scale-90 flex items-center justify-center transform translate-y-[-1.5px] cursor-pointer"
          >
            <LikeIcon size={22} />
          </button>
        )}
      </div>
    </div>
  );
}
