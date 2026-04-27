import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

interface NewNoteModalProps {
  user: any;
  onClose: () => void;
  onShare: (note: string) => void;
}

export const NewNoteModal: React.FC<NewNoteModalProps> = ({ user, onClose, onShare }) => {
  const { t } = useTranslation();
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#262626] w-full max-w-[400px] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <button onClick={onClose} className="text-white hover:opacity-70 transition-opacity cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <h2 className="text-white font-bold text-[16px]">New note</h2>
          <button 
            onClick={() => onShare(note)}
            disabled={!note.trim()}
            className={`font-bold text-[14px] ${note.trim() ? 'text-blue-500 cursor-pointer' : 'text-gray-600 cursor-not-allowed'} transition-colors`}
          >
            Share
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center">
          <div className="w-full relative mb-6">
            <textarea
              autoFocus
              placeholder="Share a thought..."
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 60))}
              className="w-full bg-transparent text-white text-center text-lg placeholder:text-gray-500 outline-none resize-none h-20"
            />
            <div className="text-[10px] text-gray-500 text-center mt-2">
              {note.length}/60
            </div>
          </div>

          {/* Avatar with specific shape */}
          <div className="relative w-28 h-28 mb-6">
            <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-gray-700">
              <Image 
                src={user?.avatar_url || "/avatar.jpg"} 
                fill 
                alt="Profile" 
                className="object-cover opacity-80"
              />
            </div>
            {/* Thought bubble icon mockup inside */}
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-700 rounded-full border border-gray-800"></div>
          </div>

          <button className="text-gray-400 hover:text-white transition-colors cursor-pointer">
            <span className="text-xl">😊</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-6 flex flex-col items-center">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs font-semibold cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Shared with <span className="text-white">followers you follow back</span></span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
