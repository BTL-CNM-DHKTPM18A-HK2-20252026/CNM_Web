import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { safeRandomUuid } from '@/lib/utils/safeRandomUuid';

// Backend context path is /api/v1, so WebSocket is at /api/v1/ws
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
const WS_BASE = API_BASE.replace('http', 'ws');

// Heartbeat interval — must match or exceed server's 25 000 ms config
const HEARTBEAT_MS = 25_000;
// Interval to verify connection liveness (detect zombie connections)
const HEALTH_CHECK_INTERVAL_MS = 30_000;

// Unique tab ID — mỗi lần page load tạo ID mới.
// KHÔNG lưu sessionStorage vì Duplicate Tab sẽ copy sessionStorage
// → 2 tab cùng tabId → backend không kick phiên cũ (Zalo-style bug).
// F5/reload tạo ID mới → backend ghi đè phiên (phiên cũ đã disconnect nên vô hại).
const TAB_ID = typeof window !== 'undefined' ? safeRandomUuid() : 'ssr';

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, ((message: IMessage) => void)[]> = new Map();
  private connected: boolean = false;
  private onSessionKickCallback: (() => void) | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private currentToken: string | null = null;
  private currentUserId: string | null = null;

  /** Đăng ký callback khi bị kick phiên (Zalo-style) */
  onSessionKick(callback: () => void) {
    this.onSessionKickCallback = callback;
  }

  /** Check if the WebSocket connection is active */
  isConnected(): boolean {
    return this.connected && this.client?.active === true;
  }

  connect(token: string) {
    // Luôn cập nhật token mới nhất (dù đang active) — forceReconnect sẽ dùng token này
    this.currentToken = token;

    // Extract userId từ JWT payload (sub claim)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.currentUserId = payload.sub || null;
    } catch {
      this.currentUserId = null;
    }

    if (this.client?.active) {
      console.log('[WS-DEBUG] Connection already active/starting. Token updated, skipping reconnect.');
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

      // ── Heartbeat — keep connection alive & detect dead sockets ──
      heartbeatIncoming: HEARTBEAT_MS,
      heartbeatOutgoing: HEARTBEAT_MS,

      // ── Auto-reconnect after 3 seconds on disconnect ──
      reconnectDelay: 3_000,

      debug: (msg) => {
        if (msg.includes('ERROR') || msg.includes('RECEIVE')) {
           console.log('[WS-DEBUG] [STOMP]:', msg);
        }
      },
      onConnect: () => {
        console.log('%c[WS-DEBUG] WebSocket connected successfully!', 'background: #222; color: #bada55; font-size: 14px');
        this.connected = true;
        this.startHealthCheck();

        // Subscribe to session-kick topic (Zalo-style kick-out)
        // Dùng /topic/ thay vì /user/queue/ vì không phụ thuộc SimpUserRegistry
        if (this.currentUserId) {
          this.client?.subscribe(`/topic/session-kick/${this.currentUserId}`, (message) => {
            try {
              const payload = JSON.parse(message.body);
              // Chỉ kick nếu tabId trong message khớp với TAB_ID của tab này
              // → tab mới (gửi kick) sẽ KHÔNG bị kick, chỉ tab cũ bị kick
              if (payload.tabId && payload.tabId === TAB_ID) {
                console.warn('[WS-DEBUG] SESSION KICKED (my tabId matched):', message.body);
                if (this.onSessionKickCallback) {
                  this.onSessionKickCallback();
                }
                this.client?.deactivate();
                this.connected = false;
                this.stompSubscriptions.clear();
              } else {
                console.log('[WS-DEBUG] Session kick received but tabId does not match (ignoring):', payload.tabId, 'vs my:', TAB_ID);
              }
            } catch {
              console.error('[WS-DEBUG] Failed to parse session-kick payload:', message.body);
            }
          });
        }

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
        this.stopHealthCheck();
      },
      onDisconnect: () => {
        console.log('[WS-DEBUG] Disconnected from STOMP');
        this.connected = false;
        this.stopHealthCheck();
      },
    });

    this.client.activate();
  }

  disconnect() {
    console.log('[WS-DEBUG] Disconnecting WebSocket...');
    this.stopHealthCheck();
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connected = false;
      this.currentToken = null;
      this.currentUserId = null;
      this.subscriptions.clear();
      this.stompSubscriptions.clear();
    }
  }

  private stompSubscriptions: Map<string, any> = new Map();

  /**
   * Periodic health check: detect zombie connections where the underlying
   * WebSocket is dead but STOMP client still thinks it's connected.
   * If the STOMP client is not truly connected, force a full reconnect.
   */
  private startHealthCheck() {
    this.stopHealthCheck();
    this.healthCheckTimer = setInterval(() => {
      if (!this.client || !this.connected) return;

      // @stomp/stompjs exposes `connected` on the client itself
      const stompAlive = this.client.active && this.client.connected;
      // Also check the underlying WebSocket readyState
      const ws = (this.client as any).webSocket as WebSocket | undefined;
      const wsAlive = ws != null && ws.readyState === WebSocket.OPEN;

      if (!stompAlive || !wsAlive) {
        console.warn('[WS-DEBUG] Health-check FAILED — stompAlive:', stompAlive, 'wsAlive:', wsAlive, '→ forcing reconnect');
        this.forceReconnect();
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Force-disconnect and reconnect using the last token.
   * Existing subscriptions are preserved and re-activated on connect.
   */
  forceReconnect() {
    console.log('[WS-DEBUG] Force reconnecting…');
    this.stopHealthCheck();
    this.connected = false;
    this.stompSubscriptions.clear();

    if (this.client) {
      try { this.client.deactivate(); } catch { /* best-effort */ }
      this.client = null;
    }

    if (this.currentToken) {
      this.connect(this.currentToken);
    }
  }

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

  // Subscribe to story-related events
  subscribeToStoryEvents(userId: string, callback: (message: IMessage) => void) {
    if (!userId) {
      console.error('[WS-DEBUG] Cannot subscribeToStoryEvents: userId is null/undefined!');
      return null;
    }
    // Listen for stories from friends and self
    return this.subscribe(`/topic/stories/${userId}`, callback);
  }

  /**
   * Send a message to a STOMP destination (e.g., /app/chat/{id}/typing)
   * @returns true if sent, false if WebSocket not connected
   */
  send(destination: string, body: any): boolean {
    if (this.client && this.connected) {
      try {
        this.client.publish({
          destination,
          body: JSON.stringify(body),
        });
        return true;
      } catch (err) {
        console.error('[WS-DEBUG] ❌ Error publishing to', destination, err);
        return false;
      }
    }
    console.warn('[WS-DEBUG] ❌ Cannot send — WebSocket not connected. Destination:', destination,
      'connected:', this.connected, 'client:', !!this.client);
    return false;
  }
}

// HMR-safe singleton: preserve across hot reloads in development
let _wsInstance: WebSocketService;
if (typeof window !== 'undefined') {
  if (!(window as any).__websocketServiceInstance) {
    (window as any).__websocketServiceInstance = new WebSocketService();
  }
  _wsInstance = (window as any).__websocketServiceInstance;
} else {
  _wsInstance = new WebSocketService();
}

export const websocketService = _wsInstance;
