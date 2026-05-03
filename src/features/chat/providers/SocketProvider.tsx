'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AUTH_TOKEN_CHANGED_EVENT, getAccessToken, isTabAuthenticated } from '@/features/auth';
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
  // Ref để tránh stale closure trong session kick handler
  const currentUserIdRef = useRef<string | null>(null);
  currentUserIdRef.current = currentUserId;

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
      // Session bị kick → chỉ xử lý khi user đang authenticated
      const userId = currentUserIdRef.current;
      if (!userId) {
        // Chưa login (hoặc đang ở màn hình Login) → bỏ qua kick, không hiện modal
        console.log('[SocketProvider] Session kick ignored — no authenticated user on this tab');
        return;
      }
      webrtcService.endCall(userId);
      setKicked(true);
    });

    const syncSocketWithToken = () => {
      const token = getAccessToken();
      // Chỉ kết nối WebSocket khi tab này ĐÃ chủ động đăng nhập (không phải inherited session).
      // window.name = 'fruvia-session-active' chỉ được set khi gọi setAccessToken().
      // window.name KHÔNG bị copy sang tab mới (khác với sessionStorage),
      // nên Ctrl+Click mở tab mới sẽ KHÔNG tự kết nối và không kick tab cũ.
      if (token && isTabAuthenticated()) {
        const userId = getUserIdFromToken(token);
        setCurrentUserId(userId);
        websocketService.connect(token);
      } else {
        setCurrentUserId(null);
        websocketService.disconnect();
        webrtcService.unsubscribeSignaling();
        setKicked(false);
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

  // Subscribe to call signaling once connected — chỉ subscribe 1 lần khi có userId
  useEffect(() => {
    if (!currentUserId) return;

    // Nếu đang trong cuộc gọi, KHÔNG unsubscribe/re-subscribe để tránh mất signal
    const callState = webrtcService.getCallState();
    if (callState !== 'idle') {
      console.log('[SocketProvider] Skipping re-subscribe — call in progress (state:', callState, ')');
      return;
    }

    console.log('[SocketProvider] currentUserId:', currentUserId, '→ subscribing call signaling');
    webrtcService.unsubscribeSignaling();
    webrtcService.subscribeSignaling();

    return () => {
      // Chỉ unsubscribe nếu KHÔNG đang trong cuộc gọi
      if (webrtcService.getCallState() === 'idle') {
        webrtcService.unsubscribeSignaling();
      }
    };
  }, [currentUserId]);

  return (
    <>
      {children}
      {/* Chỉ hiện SessionKickModal khi user đang authenticated (currentUserId != null) */}
      <SessionKickModal isOpen={kicked && !!currentUserId} onReactivate={handleReactivate} />
      {currentUserId && <VideoCallOverlay currentUserId={currentUserId} />}
    </>
  );
}
