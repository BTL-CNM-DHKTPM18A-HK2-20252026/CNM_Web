import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Strike } from '@tiptap/extension-strike';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { InputRule, Extension } from '@tiptap/core';
import emojiPack from '@/data/emoji-pack.json';

// Mapping for input rules
const shortcodeToSrc: Record<string, string> = {};
emojiPack.categories.forEach(cat => {
  cat.icons.forEach(icon => {
    shortcodeToSrc[icon.shortcode] = icon.src;
  });
});

const ZaloStickerInputRule = Extension.create({
  name: 'zaloStickerInputRule',
  addInputRules() {
    return [
      new InputRule({
        find: /(:zalo_\d+_\d+:)\s$/, // Triggers when you type shortcode followed by a space
        handler: ({ range, match, chain }) => {
          const shortcode = match[1];
          const src = shortcodeToSrc[shortcode];
          if (!src) return null;

          chain()
            .insertContentAt(range, {
              type: 'image',
              attrs: {
                src: src,
                alt: shortcode,
                title: shortcode,
              },
            })
            .run();
        },
      }),
    ];
  },
});

import { EmojiIcon, LikeIcon, SendIcon } from '@/components/ui/Icons';

interface PendingAttachment {
  file: File;
  previewUrl: string | null;
}

interface ChatInputProps {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  isEmojiOpen?: boolean;
  showSendButton?: boolean;
  isFormattingActive?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendLike: () => void;
  onToggleEmoji?: () => void;
  onEditorReady?: (editor: any) => void;
  onPaste?: (e: ClipboardEvent) => void;
  pendingAttachment?: PendingAttachment | null;
  onClearAttachment?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function ChatInput({
  value,
  placeholder,
  disabled,
  isEmojiOpen,
  showSendButton,
  isFormattingActive,
  onChange,
  onSend,
  onSendLike,
  onToggleEmoji,
  onEditorReady,
  onPaste,
  pendingAttachment,
  onClearAttachment,
  onKeyDown,
}: ChatInputProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Strike,
      Highlight,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'What’s the title?';
          }
          return placeholder || '';
        },
      }),
      TiptapImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'inline-block w-6 h-6 mx-0.5 align-text-bottom',
        },
      }),
      ZaloStickerInputRule,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'outline-none text-[15px] py-0 text-[var(--text)] min-h-[20px] max-h-[120px] overflow-y-auto break-words [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:text-[var(--sub-text)] [&_.is-editor-empty:first-child::before]:opacity-50 [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0 [&_img]:inline-block [&_img]:w-6 [&_img]:h-6 [&_img]:mx-0.5 [&_img]:align-text-bottom',
      },
      handlePaste(_view, event) {
        if (!onPaste) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        const hasImage = Array.from(items).some(it => it.type.startsWith('image/'));
        if (!hasImage) return false;
        onPaste(event);
        return true; // block TipTap from processing the image paste
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Sync value from outside (e.g. when cleared)
  useEffect(() => {
    if (editor && value !== editor.getHTML() && value === '') {
      editor.commands.setContent('');
    }
  }, [value, editor]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
    if (e.defaultPrevented) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  if (!mounted) return <div className="flex items-end px-4 py-3 gap-3 min-h-[52px]" />;

  return (
    <div className="flex items-end px-4 py-3 gap-3 min-h-[52px]">
      <div className="flex-1 pb-1 relative min-w-0">
        {pendingAttachment && (() => {
          const name = pendingAttachment.file.name.toLowerCase();
          const isVideo = pendingAttachment.file.type.startsWith('video/');
          const isPdf = name.endsWith('.pdf');
          const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
          const chipCls = isPdf
            ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
            : isExcel
            ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'
            : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20';
          const textCls = isPdf
            ? 'text-red-700 dark:text-red-400'
            : isExcel
            ? 'text-green-700 dark:text-green-400'
            : 'text-blue-700 dark:text-blue-400';
          const xCls = isPdf
            ? 'text-red-400'
            : isExcel
            ? 'text-green-400'
            : 'text-blue-400';
          const iconColor = isPdf ? '#DC2626' : isExcel ? '#16A34A' : '#2563EB';
          return (
            <div className={`flex items-center gap-2.5 mb-2 w-fit max-w-[420px] ${chipCls} border rounded-xl px-4 py-2.5 group`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                {isVideo
                  ? <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>
                  : <><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></>}
              </svg>
              <span className={`text-[15px] font-medium ${textCls} truncate leading-none`}>
                {pendingAttachment.file.name}
              </span>
              <button
                type="button"
                onClick={onClearAttachment}
                className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${xCls} hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer ml-1`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          );
        })()}
        <div onKeyDown={handleKeyDown}>
          <EditorContent editor={editor} />
        </div>
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
