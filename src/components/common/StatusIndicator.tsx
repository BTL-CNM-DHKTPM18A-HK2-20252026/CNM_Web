'use client';

import React from 'react';
import { usePresence } from '@/components/providers/PresenceProvider';

// ──────────────────────────────────────────────────────────────
//  StatusIndicator — hiển thị chấm xanh online / text "time ago"
// ──────────────────────────────────────────────────────────────

interface StatusIndicatorProps {
    userId: string;
    /** Chỉ hiển thị chấm xanh (dùng trong avatar) */
    dotOnly?: boolean;
    /** Kích thước chấm (px) — mặc định 10 */
    dotSize?: number;
    className?: string;
}

/**
 * Component hiển thị trạng thái hoạt động của user.
 *
 * @example Chấm xanh trên avatar
 * ```tsx
 * <div className="relative">
 *   <Avatar src={user.avatar} />
 *   <StatusIndicator userId={user.id} dotOnly dotSize={12} className="absolute bottom-0 right-0" />
 * </div>
 * ```
 *
 * @example Text "Hoạt động 5 phút trước"
 * ```tsx
 * <StatusIndicator userId={user.id} />
 * ```
 */
export function StatusIndicator({
    userId,
    dotOnly = false,
    dotSize = 10,
    className = '',
}: StatusIndicatorProps) {
    const { isOnline, getTimeAgo } = usePresence();
    const online = isOnline(userId);
    const timeAgo = getTimeAgo(userId);

    // ─── Dot-only mode : chấm tròn xanh / xám ─────────────
    if (dotOnly) {
        return (
            <span
                className={`inline-block rounded-full border-2 border-white dark:border-gray-800 ${online
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    } ${className}`}
                style={{ width: dotSize, height: dotSize }}
                title={online ? 'Đang hoạt động' : timeAgo || 'Offline'}
            />
        );
    }

    // ─── Full mode : text ──────────────────────────────────
    if (online) {
        return (
            <span className={`flex items-center gap-1.5 text-[12px] text-green-500 ${className}`}>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                Đang hoạt động
            </span>
        );
    }

    if (timeAgo) {
        return (
            <span className={`text-[12px] text-[var(--sub-text)] ${className}`}>
                {timeAgo}
            </span>
        );
    }

    return null;
}
