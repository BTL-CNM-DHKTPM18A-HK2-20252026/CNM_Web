'use client';

import { useCallback, useEffect } from 'react';
import type { IMessage } from '@stomp/stompjs';
import { authService } from '@/features/auth';
import { websocketService } from '@/lib/realtime/websocketService';

export function useSocket(autoConnect = false) {
  useEffect(() => {
    if (!autoConnect) return;

    const token = authService.getToken();
    if (token) {
      websocketService.connect(token);
    }
  }, [autoConnect]);

  const connect = useCallback(() => {
    const token = authService.getToken();
    if (token) {
      websocketService.connect(token);
    }
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const subscribe = useCallback(
    (topic: string, callback: (message: IMessage) => void) => {
      return websocketService.subscribe(topic, callback);
    },
    []
  );

  const send = useCallback((destination: string, body: unknown) => {
    websocketService.send(destination, body);
  }, []);

  return {
    connect,
    disconnect,
    subscribe,
    send,
  };
}
