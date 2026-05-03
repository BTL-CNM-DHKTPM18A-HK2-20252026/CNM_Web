'use client';

import { useEffect } from 'react';
import { websocketService } from '@/lib/realtime/websocketService';
import { useNotifications } from '../store/NotificationContext';
import type { NotificationDTO } from '../types';

/**
 * Subscribe vào /topic/notifications/{userId} để nhận realtime notification.
 * Khi nhận message → push vào NotificationContext.
 */
export const useNotificationSocket = (userId: string | undefined | null) => {
  const { pushRealtime } = useNotifications();

  useEffect(() => {
    if (!userId) return;

    const sub = websocketService.subscribe(
      `/topic/notifications/${userId}`,
      (message) => {
        try {
          const payload = JSON.parse(message.body) as NotificationDTO;
          pushRealtime(payload);
        } catch (err) {
          console.warn('[Notif WS] parse failed', err);
        }
      }
    );

    return () => {
      try {
        sub?.unsubscribe();
      } catch (e) {
        // best effort
        console.debug('[Notif WS] unsubscribe error', e);
      }
    };
  }, [userId, pushRealtime]);
};
