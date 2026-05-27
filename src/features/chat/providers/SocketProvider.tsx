'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const raw = atob(base64);
    const escapeRaw = raw.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('');
    const payload = JSON.parse(decodeURIComponent(escapeRaw));
    return payload.sub || null;
  } catch (error) {
    console.error('[SocketProvider] Failed to parse JWT token payload:', error);
    return null;
  }
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [kicked, setKicked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Keep the latest user id for callbacks registered once.
  const currentUserIdRef = useRef<string | null>(null);
  // Debounce / retry timer
  const syncDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const handleReactivate = useCallback(() => {
    setKicked(false);
    const token = getAccessToken();
    if (token) {
      console.log('[SocketProvider] Reactivating websocket connection after kick');
      websocketService.connect(token);
    }
  }, []);

  useEffect(() => {
    // Register the kick handler before connecting.
    websocketService.onSessionKick(() => {
      const userId = currentUserIdRef.current;
      console.log('[SocketProvider] Session kick event received', {
        currentUserId: userId,
        hasToken: !!getAccessToken(),
        callState: webrtcService.getCallState(),
      });
      // QUAN TRỌNG: Luôn cleanup call khi bị kick, kể cả khi userId chưa sẵn sàng.
      // Không cleanup → state bị kẹt ở 'requesting' với WS đã chết.
      webrtcService.cleanup();
      if (!userId) {
        console.log('[SocketProvider] Session kick — call cleaned up but no userId to show modal');
        return;
      }
      setKicked(true);
    });

    // ─── Retry state (closure-local, reset on each new external event) ───────
    let parseRetryCount = 0;
    const MAX_PARSE_RETRIES = 5;
    const RETRY_DELAY_MS = 500;

    /**
     * Core connect logic.
     * Called both from the debounced syncSocketWithToken and from retry timeouts.
     */
    const doSync = () => {
      syncDebounceTimerRef.current = null;
      const token = getAccessToken();

      if (!token) {
        // Logged-out / token expired
        parseRetryCount = 0;
        console.log('[SocketProvider] No active auth token, disconnecting websocket');
        setCurrentUserId(null);
        websocketService.disconnect();
        webrtcService.unsubscribeSignaling();
        setKicked(false);
        return;
      }

      const userId = getUserIdFromToken(token);

      if (!userId) {
        // Token exists but JWT is unreadable — happens during token refresh race.
        // DO NOT set userId=null (would destroy subscriptions & cause STOMP 1002).
        // Retry after a short delay, up to MAX_PARSE_RETRIES times.
        parseRetryCount++;
        if (parseRetryCount <= MAX_PARSE_RETRIES) {
          console.warn(
            `[SocketProvider] Token present but userId unparseable — retry ${parseRetryCount}/${MAX_PARSE_RETRIES} in ${RETRY_DELAY_MS}ms`,
          );
          syncDebounceTimerRef.current = setTimeout(doSync, RETRY_DELAY_MS);
        } else {
          console.error(
            '[SocketProvider] Token userId parse failed after max retries — giving up. Check JWT format.',
          );
          parseRetryCount = 0;
        }
        return;
      }

      // ✅ Successfully parsed userId
      parseRetryCount = 0;
      console.log('[SocketProvider] Auth token detected, connecting websocket', {
        userId,
        hasToken: true,
      });
      setCurrentUserId(userId);
      websocketService.connect(token);
    };

    const syncSocketWithToken = () => {
      // Debounce 200ms — ngăn chặn một chuỗi event liên tiếp gây reconnect loop
      if (syncDebounceTimerRef.current) clearTimeout(syncDebounceTimerRef.current);
      // Reset retry counter when a fresh external event arrives
      parseRetryCount = 0;
      syncDebounceTimerRef.current = setTimeout(doSync, 200);
    };

    syncSocketWithToken();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, syncSocketWithToken);

    return () => {
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncSocketWithToken);
      if (syncDebounceTimerRef.current) clearTimeout(syncDebounceTimerRef.current);
      webrtcService.unsubscribeSignaling();
      webrtcService.cleanup();
      websocketService.disconnect();
    };
  }, []);

  // Subscribe to call signaling once connected.
  useEffect(() => {
    if (!currentUserId) return;

    console.log('[SocketProvider] Subscribing signaling for user', currentUserId, {
      currentCallState: webrtcService.getCallState(),
    });
    // Luôn unsubscribe trước để tránh duplicate subscriptions
    webrtcService.unsubscribeSignaling();
    webrtcService.subscribeSignaling(currentUserId);

    // KHÔNG unsubscribe trong cleanup của effect này.
    // React Strict Mode chạy cleanup → re-run, nhưng nếu cleanup unsubscribe
    // và state userId không đổi, effect không chạy lại → signaling bị mất.
    // Thay vào đó: chỉ unsubscribe khi userId thực sự thay đổi (xử lý trong effect bên trên).
    return () => {
      // Chỉ unsubscribe nếu userId này không còn là user hiện tại
      // (tức là đang logout hoặc đổi tài khoản)
      if (currentUserIdRef.current !== currentUserId) {
        console.log('[SocketProvider] Unsubscribing signaling — userId changed', {
          old: currentUserId,
          new: currentUserIdRef.current,
        });
        webrtcService.unsubscribeSignaling();
      }
    };
  }, [currentUserId]);

  return (
    <>
      {children}
      {/* Show SessionKickModal only for authenticated tabs. */}
      <SessionKickModal isOpen={kicked && !!currentUserId} onReactivate={handleReactivate} />
      {currentUserId && <VideoCallOverlay currentUserId={currentUserId} />}
    </>
  );
}
