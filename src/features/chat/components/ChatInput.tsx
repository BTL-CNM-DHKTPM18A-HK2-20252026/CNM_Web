import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Strike } from '@tiptap/extension-strike';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { EmojiIcon, LikeIcon, SendIcon } from '@/components/ui/Icons';

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
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'outline-none text-[15px] py-0 text-[var(--text)] min-h-[20px] max-h-[120px] overflow-y-auto [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:text-[var(--sub-text)] [&_.is-editor-empty:first-child::before]:opacity-50 [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0',
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  if (!mounted) return <div className="flex items-end px-4 py-3 gap-3 min-h-[52px]" />;

  return (
    <div className="flex items-end px-4 py-3 gap-3 min-h-[52px]">
      <div className="flex-1 pb-1 relative">
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
