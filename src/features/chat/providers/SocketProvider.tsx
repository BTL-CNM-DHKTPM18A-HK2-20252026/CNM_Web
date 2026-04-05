'use client';

import { useEffect } from 'react';
import { AUTH_TOKEN_CHANGED_EVENT, getAccessToken } from '@/features/auth';
import { websocketService } from '@/lib/realtime/websocketService';

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  useEffect(() => {
    const syncSocketWithToken = () => {
      const token = getAccessToken();
      if (token) {
        websocketService.connect(token);
      } else {
        websocketService.disconnect();
      }
    };

    syncSocketWithToken();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, syncSocketWithToken);

    return () => {
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncSocketWithToken);
      websocketService.disconnect();
    };
  }, []);

  return <>{children}</>;
}
