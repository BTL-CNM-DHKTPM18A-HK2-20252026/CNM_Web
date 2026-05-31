'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { websocketService } from '@/lib/realtime/websocketService';
import { apiClient } from '@/lib/http/apiClient';
import { useTranslation } from 'react-i18next';

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

export interface UserStatus {
    userId: string;
    online: boolean;
    /** ISO string hoặc null (chỉ có khi offline) */
    lastSeen: string | null;
}

interface PresenceContextValue {
    /** Map<userId, UserStatus> — source of truth cho toàn bộ app */
    statuses: Map<string, UserStatus>;
    /** Kiểm tra nhanh 1 user có online không */
    isOnline: (userId: string) => boolean;
    /** Lấy lastSeen string (ISO) */
    getLastSeen: (userId: string) => string | null;
    /** Format "Hoạt động … trước" / "Đang hoạt động" */
    getTimeAgo: (userId: string) => string;
    /** Fetch trạng thái của 1 user cụ thể và cập nhật map (dùng khi mở chat) */
    refreshUserStatus: (userId: string) => Promise<void>;
}

const PresenceContext = createContext<PresenceContextValue>({
    statuses: new Map(),
    isOnline: () => false,
    getLastSeen: () => null,
    getTimeAgo: () => '',
    refreshUserStatus: async () => {},
});

// ──────────────────────────────────────────────────────────────
//  Provider — đặt trong layout.tsx chung hoặc ChatDashboard
// ──────────────────────────────────────────────────────────────

/** Khoảng thời gian gửi heartbeat (ms) — nên nhỏ hơn TTL Redis (60s) */
const HEARTBEAT_INTERVAL = 25_000;

interface PresenceProviderProps {
    children: React.ReactNode;
    /** userId hiện tại — cần để subscribe đúng topic */
    currentUserId: string | null;
}

export function PresenceProvider({ children, currentUserId }: PresenceProviderProps) {
    const { t } = useTranslation();
    const [statuses, setStatuses] = useState<Map<string, UserStatus>>(new Map());
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Fetch initial friends status qua REST ─────────────
    useEffect(() => {
        if (!currentUserId) return;

        const fetchInitial = async () => {
            try {
                const res: any = await apiClient.get('/presence/friends');
                const list: UserStatus[] = Array.isArray(res) ? res : (res?.data || []);

                setStatuses((prev) => {
                    const next = new Map(prev);
                    list.forEach((s) => next.set(s.userId, s));
                    return next;
                });
            } catch (e) {
                console.error('[Presence] Failed to fetch initial statuses:', e);
            }
        };

        fetchInitial();
    }, [currentUserId]);

    // ─── Subscribe STOMP topic /topic/presence/{currentUserId} ─
    useEffect(() => {
        if (!currentUserId) return;

        const sub = websocketService.subscribe(
            `/topic/presence/${currentUserId}`,
            (message) => {
                try {
                    const payload: UserStatus = JSON.parse(message.body);
                    setStatuses((prev) => {
                        const next = new Map(prev);
                        next.set(payload.userId, payload);
                        return next;
                    });
                } catch (e) {
                    console.error('[Presence] Bad payload:', e);
                }
            }
        );

        return () => {
            sub?.unsubscribe();
        };
    }, [currentUserId]);

    // ─── Heartbeat: gửi /app/presence/heartbeat mỗi 25s ───
    useEffect(() => {
        if (!currentUserId) return;

        heartbeatRef.current = setInterval(() => {
            websocketService.send('/app/presence/heartbeat', {});
        }, HEARTBEAT_INTERVAL);

        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        };
    }, [currentUserId]);

    // ─── Poll refresh: re-fetch presence mỗi 15s để đảm bảo UI luôn cập nhật ───
    useEffect(() => {
        if (!currentUserId) return;

        const pollInterval = setInterval(async () => {
            try {
                const res: any = await apiClient.get('/presence/friends');
                const list: UserStatus[] = Array.isArray(res) ? res : (res?.data || []);
                setStatuses((prev) => {
                    const next = new Map(prev);
                    list.forEach((s) => next.set(s.userId, s));
                    return next;
                });
            } catch {
                // silent
            }
        }, 15_000);

        return () => clearInterval(pollInterval);
    }, [currentUserId]);

    // ─── Helper functions ──────────────────────────────────
    const isOnline = useCallback(
        (userId: string) => statuses.get(userId)?.online ?? false,
        [statuses]
    );

    const getLastSeen = useCallback(
        (userId: string) => statuses.get(userId)?.lastSeen ?? null,
        [statuses]
    );

    const getTimeAgo = useCallback(
        (userId: string) => {
            const status = statuses.get(userId);
            if (!status) return '';
            if (status.online) return t('presence.online');
            if (!status.lastSeen) return '';
            return formatTimeAgo(status.lastSeen, t);
        },
        [statuses, t]
    );

    /**
     * Fetch trạng thái của 1 user cụ thể qua REST và cập nhật statuses map.
     * Dùng khi mở hội thoại với ai đó để đảm bảo status chính xác,
     * kể cả khi user đó không nằm trong danh sách bạn bè (initial fetch).
     */
    const refreshUserStatus = useCallback(async (userId: string) => {
        if (!userId || !currentUserId) return;
        try {
            const res: any = await apiClient.get(`/presence/${userId}`);
            const data = res?.data ?? res;
            if (data?.userId) {
                setStatuses((prev) => {
                    const next = new Map(prev);
                    next.set(data.userId, {
                        userId: data.userId,
                        online: data.online ?? false,
                        lastSeen: data.lastSeen ?? null,
                    });
                    return next;
                });
            }
        } catch (e) {
            console.error('[Presence] Failed to refresh user status:', e);
        }
    }, [currentUserId]);

    return (
        <PresenceContext.Provider value={{ statuses, isOnline, getLastSeen, getTimeAgo, refreshUserStatus }}>
            {children}
        </PresenceContext.Provider>
    );
}

// ──────────────────────────────────────────────────────────────
//  Custom hook
// ──────────────────────────────────────────────────────────────

/**
 * Hook để truy cập presence data ở bất kỳ component con nào.
 *
 * @example
 * ```tsx
 * const { isOnline, getTimeAgo } = usePresence();
 * return <span>{isOnline(userId) ? '🟢' : getTimeAgo(userId)}</span>;
 * ```
 */
export function usePresence() {
    return useContext(PresenceContext);
}

// ──────────────────────────────────────────────────────────────
//  Time-Ago formatter (client-side)
// ──────────────────────────────────────────────────────────────

/**
 * Chuyển đổi ISO timestamp thành chuỗi "thời gian trước" thân thiện.
 *
 * Ví dụ:
 *  - "Vừa xong"               (< 1 phút)
 *  - "Hoạt động 5 phút trước" (1-59 phút)
 *  - "Hoạt động 2 giờ trước"  (1-23 giờ)
 *  - "Hoạt động 3 ngày trước" (1-6 ngày)
 *  - "Hoạt động 2 tuần trước" (7-29 ngày)
 *  - "Hoạt động 15/03/2026"   (> 30 ngày)
 */
export function formatTimeAgo(isoString: string, t?: (key: string, options?: Record<string, unknown>) => string): string {
    const then = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = now - then;

    if (diffMs < 0) return t ? t('presence.just_now') : 'Vừa xong';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (minutes < 1) return t ? t('presence.just_now') : 'Vừa xong';
    if (minutes < 60) return t ? t('presence.minutes_ago', { count: minutes }) : `Hoạt động ${minutes} phút trước`;
    if (hours < 24) return t ? t('presence.hours_ago', { count: hours }) : `Hoạt động ${hours} giờ trước`;
    if (days < 7) return t ? t('presence.days_ago', { count: days }) : `Hoạt động ${days} ngày trước`;
    if (days < 30) return t ? t('presence.weeks_ago', { count: weeks }) : `Hoạt động ${weeks} tuần trước`;

    // Hơn 30 ngày → hiển thị ngày cụ thể
    const date = new Date(isoString);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return t ? t('presence.active_on_date', { date: `${dd}/${mm}/${yyyy}` }) : `Hoạt động ${dd}/${mm}/${yyyy}`;
}
