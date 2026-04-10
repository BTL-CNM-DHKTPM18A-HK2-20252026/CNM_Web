'use client';

import { useEffect, useState, useCallback } from 'react';
import { AUTH_TOKEN_CHANGED_EVENT, getAccessToken } from '@/features/auth';
import { websocketService } from '@/lib/realtime/websocketService';
import { webrtcService } from '@/lib/realtime/webrtcService';
import { SessionKickModal } from '@/components/ui/SessionKickModal';
import { VideoCallOverlay } from '@/components/ui/VideoCall';

interface SocketProviderProps {
  children: React.ReactNode;
}

/** Decode JWT payload to get userId (sub claim). */
function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [kicked, setKicked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const handleReactivate = useCallback(() => {
    setKicked(false);
    const token = getAccessToken();
    if (token) {
      websocketService.connect(token);
    }
  }, []);

  useEffect(() => {
    // Đăng ký callback kick trước khi connect
    websocketService.onSessionKick(() => {
      // Session bị kick → nếu đang gọi video thì kết thúc cuộc gọi
      if (currentUserId) {
        webrtcService.endCall(currentUserId);
      } else {
        webrtcService.cleanup();
      }
      setKicked(true);
    });

    const syncSocketWithToken = () => {
      const token = getAccessToken();
      if (token) {
        const userId = getUserIdFromToken(token);
        setCurrentUserId(userId);
        websocketService.connect(token);
      } else {
        setCurrentUserId(null);
        websocketService.disconnect();
        webrtcService.unsubscribeSignaling();
      }
    };

    syncSocketWithToken();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, syncSocketWithToken);

    return () => {
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncSocketWithToken);
      webrtcService.unsubscribeSignaling();
      webrtcService.cleanup();
      websocketService.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to call signaling once connected
  useEffect(() => {
    if (currentUserId) {
      console.log('[SocketProvider] currentUserId:', currentUserId, '→ subscribing call signaling');
      // Đảm bảo subscribe lại nếu trước đó đã unsubscribe (e.g. HMR, reconnect)
      webrtcService.unsubscribeSignaling();
      webrtcService.subscribeSignaling();
    }
    return () => {
      webrtcService.unsubscribeSignaling();
    };
  }, [currentUserId]);

  return (
    <>
      {children}
      <SessionKickModal isOpen={kicked} onReactivate={handleReactivate} />
      {currentUserId && <VideoCallOverlay currentUserId={currentUserId} />}
    </>
  );
}
