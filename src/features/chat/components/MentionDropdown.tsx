import React from 'react';
import type { MentionMember } from '@/features/chat/components/ChatWindow/types';

interface MentionDropdownProps {
  members: MentionMember[];
  query: string;
  onSelect: (member: MentionMember) => void;
}

export function MentionDropdown({ members, query, onSelect }: MentionDropdownProps) {
  const filtered = query
    ? members.filter(m =>
        m.displayName.toLowerCase().includes(query.toLowerCase())
      )
    : members;

  if (!filtered.length) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-1 mx-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-[220px] overflow-y-auto">
      <div className="px-3 py-1.5 text-[11px] font-semibold text-[var(--sub-text)] border-b border-[var(--border)] uppercase tracking-wide">
        Nhắc đến
      </div>
      {filtered.map(member => (
        <button
          key={member.userId}
          type="button"
          onClick={() => onSelect(member)}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--hover-bg)] transition-colors text-left cursor-pointer"
        >
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={member.displayName}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#0068FF] flex items-center justify-center text-white text-[13px] font-bold shrink-0">
              {member.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-[14px] text-[var(--text)] font-medium">@{member.displayName}</span>
        </button>
      ))}
    </div>
  );
}
