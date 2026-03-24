import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '/ws') || 'http://localhost:8080/ws';

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, any> = new Map();
  private connected: boolean = false;

  connect(token: string) {
    if (this.client?.active) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        console.log('Connected to WebSocket');
        this.connected = true;
        // Re-subscribe to existing topics if any
        this.subscriptions.forEach((callback, topic) => {
          this.subscribe(topic, callback);
        });
      },
      onStompError: (frame) => {
        console.error('STOMP Error:', frame.headers['message']);
      },
      onDisconnect: () => {
        console.log('Disconnected from WebSocket');
        this.connected = false;
      },
    });

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connected = false;
      this.subscriptions.clear();
    }
  }

  subscribe(topic: string, callback: (message: IMessage) => void) {
    // Always store in map for reconnection
    this.subscriptions.set(topic, callback);

    if (!this.client || !this.connected) {
      return;
    }

    const sub = this.client.subscribe(topic, (message) => {
      callback(message);
    });
    return sub;
  }

  // Subscribe to user-specific friend events
  subscribeToFriendEvents(userId: string, callback: (message: IMessage) => void) {
    return this.subscribe(`/topic/friend-events/${userId}`, callback);
  }
}

export const websocketService = new WebSocketService();
