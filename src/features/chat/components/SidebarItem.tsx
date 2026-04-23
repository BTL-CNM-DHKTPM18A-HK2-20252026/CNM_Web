import type { MouseEvent, ReactNode } from 'react';
import Image from 'next/image';
import { PinIcon, SparklesIcon } from '@/components/ui/Icons';
import { StatusIndicator } from '@/features/user';

interface SidebarItemProps {
  id: string | number;
  name: string;
  nickname?: string;
  lastMsg: string;
  subtitle?: ReactNode;
  time: string;
  active?: boolean;
  pinned?: boolean;
  avatar?: string;
  isGroup?: boolean;
  groupAvatarUrls?: string[];
  memberCount?: number;
  isCloud?: boolean;
  isAi?: boolean;
  unreadCount?: number;
  otherUserId?: string;
  conversationTagColor?: string;
  mutedUntil?: string | null;
  isMarkedUnread?: boolean;
  onClick: (id: string | number) => void;
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
  onMoreClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function SidebarItem({
  id,
  name,
  nickname,
  lastMsg,
  subtitle,
  time,
  active,
  pinned,
  avatar,
  isGroup,
  groupAvatarUrls,
  memberCount,
  isCloud,
  isAi,
  unreadCount,
  otherUserId,
  conversationTagColor,
  mutedUntil,
  isMarkedUnread,
  onClick,
  onContextMenu,
  onMoreClick,
}: SidebarItemProps) {
  const shouldRenderGroupFallback = Boolean(isGroup && !avatar);
  const fallbackAvatars = [
    groupAvatarUrls?.[0],
    groupAvatarUrls?.[1],
    groupAvatarUrls?.[2],
  ].filter((url): url is string => Boolean(url));

  return (
    <div
      onClick={() => onClick(id)}
      onMouseDown={(event) => {
        if (event.button === 0) {
          event.preventDefault();
        }
      }}
      onContextMenu={onContextMenu}
      className={`relative group flex w-full items-center px-4 py-3 gap-3 cursor-pointer transition-colors select-none caret-transparent !rounded-none !mx-0 ${active
          ? 'bg-[var(--active-bg)]'
          : 'hover:bg-[var(--hover-bg)]'
        }`}
      style={{ width: '100%', borderRadius: 0, margin: 0 }}
    >
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#0068FF] z-10" />
      )}
      <div
        className={`h-12 w-12 rounded-full border-[1px] border-black/[0.06] dark:border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative ${isAi
            ? 'bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 text-white'
            : isCloud
              ? 'bg-[#0068FF]'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}
      >
        {isAi ? (
          <SparklesIcon size={24} />
        ) : isCloud ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-6c-2.33 0-4.5 1.17-4.5 2.5V14h9v-1.5c0-1.33-2.17-2.5-4.5-2.5z" />
          </svg>
        ) : avatar ? (
          <Image src={avatar} alt={name} width={48} height={48} className="object-cover" unoptimized />
        ) : shouldRenderGroupFallback ? (
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
            <div className="relative bg-gray-200 dark:bg-gray-700">
              {fallbackAvatars[0] ? (
                <Image src={fallbackAvatars[0]} alt={name} fill className="object-cover" unoptimized />
              ) : null}
            </div>
            <div className="relative bg-gray-200 dark:bg-gray-700">
              {fallbackAvatars[1] ? (
                <Image src={fallbackAvatars[1]} alt={name} fill className="object-cover" unoptimized />
              ) : null}
            </div>
            <div className="relative bg-gray-200 dark:bg-gray-700">
              {fallbackAvatars[2] ? (
                <Image src={fallbackAvatars[2]} alt={name} fill className="object-cover" unoptimized />
              ) : null}
            </div>
            <div className="flex items-center justify-center bg-[#E9EEF7] text-[#5B6576] text-[11px] font-bold">
              {memberCount || 0}
            </div>
          </div>
        ) : (
          <div className="text-[var(--primary)] font-bold text-lg">{name.charAt(0)}</div>
        )}

        {otherUserId && (
          <StatusIndicator
            userId={otherUserId}
            dotOnly
            dotSize={12}
            className="absolute bottom-0 right-0"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            {conversationTagColor ? (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: conversationTagColor }} />
            ) : null}
            <h4 className="text-[15px] font-medium truncate text-[var(--text)] max-w-[220px] sm:max-w-[240px]">{nickname || name}</h4>
          </div>
          <div className="flex items-center gap-1 shrink-0 min-w-[58px] justify-end">
            {onMoreClick ? (
              <button
                onClick={onMoreClick}
                className="hidden group-hover:inline-flex opacity-60 hover:opacity-100 p-0.5 hover:bg-black/5 rounded transition-all text-gray-500 mr-1 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
              </button>
            ) : null}
            <span className={`text-[12px] text-[#708090] font-medium mr-1 whitespace-nowrap leading-none tabular-nums ${onMoreClick ? 'group-hover:hidden' : ''}`}>{time}</span>
            {pinned && (
              <div className="text-[#708090] opacity-80 shrink-0 mr-1">
                <PinIcon size={12} />
              </div>
            )}
            {mutedUntil ? (
              <div className="text-[#708090] opacity-80 shrink-0 mr-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex justify-between items-center h-5">
          <div
            className={`text-[13px] flex items-center gap-1.5 truncate min-w-0 pr-2 ${unreadCount && unreadCount > 0
                ? 'text-[var(--text)] font-semibold'
                : 'text-[#708090]'
              }`}
          >
            <span className="truncate max-w-[190px] sm:max-w-[210px] lg:max-w-[230px]">{subtitle ?? lastMsg}</span>
          </div>

          {unreadCount ? (
            <div className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 bg-[#EF4444]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          ) : isMarkedUnread ? (
            <div className="w-[10px] h-[10px] rounded-full bg-[#0068FF] shrink-0" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
