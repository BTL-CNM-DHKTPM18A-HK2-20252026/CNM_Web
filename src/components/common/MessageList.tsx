import { useState } from 'react';
import { ImageModal } from './ImageModal';

type MessageItem = {
  id: string;
  type: 'TEXT' | 'IMAGE';
  text: string;
};

interface MessageListProps {
  messages: MessageItem[];
}

export function MessageList({ messages }: MessageListProps) {
  const [openedImageSrc, setOpenedImageSrc] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-col gap-3">
        {messages.map((msg) => (
          <div key={msg.id} className="flex">
            {msg.type === 'IMAGE' ? (
              <button
                type="button"
                className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                onClick={() => setOpenedImageSrc(msg.text)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={msg.text}
                  alt="Message image"
                  className="h-50 w-50 cursor-zoom-in object-cover"
                />
              </button>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                {msg.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {openedImageSrc && (
        <ImageModal src={openedImageSrc} onClose={() => setOpenedImageSrc(null)} />
      )}
    </>
  );
}
