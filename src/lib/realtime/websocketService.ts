import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Backend context path is /api/v1, so WebSocket is at /api/v1/ws
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
const WS_BASE = API_BASE.replace('http', 'ws');

// Unique tab ID — persists per browser tab
const TAB_ID = typeof window !== 'undefined'
  ? (sessionStorage.getItem('fruvia_tab_id') || (() => {
      const id = crypto.randomUUID();
      sessionStorage.setItem('fruvia_tab_id', id);
      return id;
    })())
  : 'ssr';

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, ((message: IMessage) => void)[]> = new Map();
  private connected: boolean = false;
  private onSessionKickCallback: (() => void) | null = null;

  /** Đăng ký callback khi bị kick phiên (Zalo-style) */
  onSessionKick(callback: () => void) {
    this.onSessionKickCallback = callback;
  }

  connect(token: string) {
    if (this.client?.active) {
      console.log('[WS-DEBUG] Connection already active/starting. Skipping.');
      return;
    }

    console.log('[WS-DEBUG] Starting connection for URL:', WS_BASE + '/ws-native');
    console.log('[WS-DEBUG] Tab ID:', TAB_ID);
    
    this.client = new Client({
      // Connect to ws://localhost:8080/api/v1/ws-native
      brokerURL: WS_BASE + '/ws-native', 

      connectHeaders: {
        Authorization: `Bearer ${token}`,
        'X-Tab-Id': TAB_ID,
      },
      debug: (msg) => {
        if (msg.includes('ERROR') || msg.includes('RECEIVE')) {
           console.log('[WS-DEBUG] [STOMP]:', msg);
        }
      },
      onConnect: () => {
        console.log('%c[WS-DEBUG] WebSocket connected successfully!', 'background: #222; color: #bada55; font-size: 14px');
        this.connected = true;

        // Subscribe to session-kick channel (Zalo-style kick-out)
        this.client?.subscribe('/user/queue/session-kick', (message) => {
          console.warn('[WS-DEBUG] SESSION KICKED:', message.body);
          if (this.onSessionKickCallback) {
            this.onSessionKickCallback();
          }
          // Disconnect immediately — user must click "Kích hoạt" to reconnect
          this.client?.deactivate();
          this.connected = false;
          this.stompSubscriptions.clear();
        });

        // Re-subscribe ALL topics in our list
        this.subscriptions.forEach((callbacks, topic) => {
          if (!this.stompSubscriptions.has(topic)) {
            console.log(`[WS-DEBUG] Re-subscribing to: ${topic}`);
            const sub = this.client?.subscribe(topic, (message) => {
              const currentCallbacks = this.subscriptions.get(topic);
              if (currentCallbacks) {
                currentCallbacks.forEach(cb => cb(message));
              }
            });
            this.stompSubscriptions.set(topic, sub);
          }
        });
      },
      onStompError: (frame) => {
        console.error('[WS-DEBUG] STOMP Error:', frame.headers['message']);
        console.error('[WS-DEBUG] STOMP Details:', frame.body);
      },
      onWebSocketError: (event) => {
        console.error('[WS-DEBUG] WebSocket Error (Network issue?):', event);
      },
      onWebSocketClose: (event) => {
        console.log('[WS-DEBUG] WebSocket Closed. Code:', event.code, 'Reason:', event.reason);
        this.connected = false;
        this.stompSubscriptions.clear();
      },
      onDisconnect: () => {
        console.log('[WS-DEBUG] Disconnected from STOMP');
        this.connected = false;
      },
    });

    this.client.activate();
  }

  disconnect() {
    console.log('[WS-DEBUG] Disconnecting WebSocket...');
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connected = false;
      this.subscriptions.clear();
      this.stompSubscriptions.clear();
    }
  }

  private stompSubscriptions: Map<string, any> = new Map();

  subscribe(topic: string, callback: (message: IMessage) => void) {
    console.log(`[WS-DEBUG] Component is requesting subscription to: ${topic}`);
    // Add callback to the lists for this topic
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic)?.push(callback);

    // If already connected and no active STOMP subscription for this topic, create one
    if (this.client && this.connected && !this.stompSubscriptions.has(topic)) {
      console.log(`[WS-DEBUG] [ALREADY-CONNECTED] Initiating STOMP subscription to: ${topic}`);
      const sub = this.client.subscribe(topic, (message) => {
        console.log(`[WS-DEBUG] RECEIVED MESSAGE from ${topic}:`, message.body);
        const callbacks = this.subscriptions.get(topic);
        if (callbacks) {
          callbacks.forEach(cb => cb(message));
        }
      });
      this.stompSubscriptions.set(topic, sub);
    } else if (!this.connected) {
      console.log(`[WS-DEBUG] [QUEUED] Connection not ready. Subscription to ${topic} will happen onConnect.`);
    }

    // Return an unsubscribe function
    return {
      unsubscribe: () => {
        console.log(`[WS-DEBUG] Unsubscribing from: ${topic}`);
        const callbacks = this.subscriptions.get(topic);
        if (callbacks) {
          const index = callbacks.indexOf(callback);
          if (index > -1) callbacks.splice(index, 1);
          
          if (callbacks.length === 0) {
            const stompSub = this.stompSubscriptions.get(topic);
            if (stompSub) {
              stompSub.unsubscribe();
              this.stompSubscriptions.delete(topic);
            }
            this.subscriptions.delete(topic);
          }
        }
      }
    };
  }

  // Subscribe to user-specific friend events
  subscribeToFriendEvents(userId: string, callback: (message: IMessage) => void) {
    if (!userId) {
      console.error('[WS-DEBUG] Cannot subscribeToFriendEvents: userId is null/undefined!');
      return null;
    }
    return this.subscribe(`/topic/friend-events/${userId}`, callback);
  }

  /**
   * Send a message to a STOMP destination (e.g., /app/chat/{id}/typing)
   */
  send(destination: string, body: any) {
    if (this.client && this.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
    }
  }
}

export const websocketService = new WebSocketService();
if (typeof window !== 'undefined') {
  (window as any).websocketService = websocketService;
}
