'use client';

import { websocketService } from './websocketService';

export type CallState = 'idle' | 'requesting' | 'incoming' | 'connecting' | 'connected';

export interface CallInfo {
  callId: string;
  peerId: string;
  peerName: string;
  peerAvatar?: string;
  isCaller: boolean;
  conversationId?: string;
}

export interface CallSignal {
  type: 'CALL_REQUEST' | 'CALL_ACCEPTED' | 'CALL_REJECTED' | 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE' | 'END_CALL' | 'PEER_BUSY';
  senderId: string;
  receiverId: string;
  callId: string;
  payload?: any;
  // Metadata for better UI
  callerName?: string;
  callerAvatar?: string;
  conversationId?: string;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Own TURN server on api.fruvia.id.vn
  {
    urls: 'turn:api.fruvia.id.vn:3478',
    username: 'fruvia',
    credential: 'FrUV!aTURN2026_',
  },
  {
    urls: 'turn:api.fruvia.id.vn:3478?transport=tcp',
    username: 'fruvia',
    credential: 'FrUV!aTURN2026_',
  },
];

class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callState: CallState = 'idle';
  private callInfo: CallInfo | null = null;

  // Callbacks
  private onStateChangeCallback: ((state: CallState, callId?: string, peerId?: string, isCaller?: boolean) => void) | null = null;
  private onLocalStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onMediaErrorCallback: ((error: string) => void) | null = null;

  private pendingCandidates: RTCIceCandidateInit[] = [];
  private pendingOffer: CallSignal | null = null;
  private subscriptions: { userQueue: any; fallbackTopic: any } | null = null;
  private currentUserId: string | null = null;
  private callerName: string | null = null;
  private callerAvatar: string | undefined = undefined;

  // Deduplication
  private recentSignalKeys = new Set<string>();

  // Timeouts & Safety
  private connectingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private incomingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private disconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private acceptedRetryId: ReturnType<typeof setTimeout> | null = null;
  private isCleaningUp: boolean = false;

  constructor() {
    // Luôn lắng nghe reconnect để gửi lại signal nếu cần
    websocketService.onReconnect(() => {
      this.handleWebSocketReconnect();
    });
  }

  // ── State Management ───────────────────────────────

  private setState(state: CallState) {
    if (this.callState === state) return;
    console.log(`[WebRTC] State ${this.callState} -> ${state}`, {
      callId: this.callInfo?.callId,
      peerId: this.callInfo?.peerId,
    });
    this.callState = state;
    this.onStateChangeCallback?.(
      state,
      this.callInfo?.callId,
      this.callInfo?.peerId,
      this.callInfo?.isCaller
    );
  }

  getCallState() { return this.callState; }
  getCallInfo() { return this.callInfo; }
  getLocalStream() { return this.localStream; }
  getRemoteStream() { return this.remoteStream; }

  onStateChange(cb: (state: CallState, callId?: string, peerId?: string, isCaller?: boolean) => void) {
    this.onStateChangeCallback = cb;
  }
  onLocalStream(cb: (stream: MediaStream) => void) { this.onLocalStreamCallback = cb; }
  onRemoteStream(cb: (stream: MediaStream) => void) { this.onRemoteStreamCallback = cb; }
  onMediaError(cb: (error: string) => void) { this.onMediaErrorCallback = cb; }

  // ── Connection Recovery ───────────────────────────

  private handleWebSocketReconnect() {
    if (this.callState === 'idle') return;

    console.log('[WebRTC] WebSocket reconnected — checking if signal needs resend', {
      state: this.callState,
      isCaller: this.callInfo?.isCaller,
    });

    if (this.callInfo?.isCaller && (this.callState === 'requesting' || this.callState === 'connecting')) {
      console.log('[WebRTC] Resending CALL_REQUEST after reconnect');
      this.sendSignal({
        type: 'CALL_REQUEST',
        receiverId: this.callInfo.peerId,
        callId: this.callInfo.callId,
        callerName: this.callerName || undefined,
        callerAvatar: this.callerAvatar,
        conversationId: this.callInfo.conversationId,
      });
    } else if (!this.callInfo?.isCaller && this.callState === 'connecting') {
      console.log('[WebRTC] Resending CALL_ACCEPTED after reconnect');
      this.sendSignal({
        type: 'CALL_ACCEPTED',
        receiverId: this.callInfo.peerId,
        callId: this.callInfo.callId,
      });
    }
  }

  // ── Subscription Lifecycle ────────────────────────

  subscribeSignaling(userId: string) {
    if (this.currentUserId === userId && this.subscriptions) {
      console.log('[WebRTC] Signaling already subscribed for', userId);
      return;
    }
    this.unsubscribeSignaling();
    this.currentUserId = userId;

    // Listen on both user-private queue and a fallback topic (in case of relay)
    const userQueuePath = '/user/queue/call-signal';
    const fallbackTopicPath = `/topic/call-signal/${userId}`;

    const subQueue = websocketService.subscribe(userQueuePath, (msg) => this.processSignal(msg.body));
    const subTopic = websocketService.subscribe(fallbackTopicPath, (msg) => this.processSignal(msg.body));

    this.subscriptions = { userQueue: subQueue, fallbackTopic: subTopic };
    console.log('[WebRTC] Subscribed to call signaling channels', { userQueue: userQueuePath, fallbackTopic: fallbackTopicPath });
  }

  unsubscribeSignaling() {
    if (this.subscriptions) {
      console.log('[WebRTC] Unsubscribing signaling channels');
      this.subscriptions.userQueue.unsubscribe();
      this.subscriptions.fallbackTopic.unsubscribe();
      this.subscriptions = null;
    }
    this.currentUserId = null;
  }

  // ── Signal Processing ──────────────────────────────

  private processSignal(messageBody: string) {
    try {
      const signal: CallSignal = JSON.parse(messageBody);
      // Deduplicate signals using a composite key
      const signalKey = `${signal.type}:${signal.callId}:${signal.senderId}`;
      if (this.recentSignalKeys.has(signalKey)) return;
      this.recentSignalKeys.add(signalKey);
      setTimeout(() => this.recentSignalKeys.delete(signalKey), 5000);

      // Ignore our own broadcasted signals if they leak into public topics
      if (this.currentUserId && signal.senderId === this.currentUserId) return;

      console.log(`[WebRTC] RECEIVED SIGNAL: ${signal.type}`, { from: signal.senderId, callId: signal.callId });

      switch (signal.type) {
        case 'CALL_REQUEST': this.handleIncomingCall(signal); break;
        case 'CALL_ACCEPTED': this.handleCallAccepted(signal); break;
        case 'CALL_REJECTED': this.handleCallRejected(); break;
        case 'PEER_BUSY': this.handleCallRejected(); break;
        case 'OFFER': this.handleOffer(signal); break;
        case 'ANSWER': this.handleAnswer(signal); break;
        case 'ICE_CANDIDATE': this.handleIceCandidate(signal); break;
        case 'END_CALL':
        case 'CALL_END': this.handleRemoteEnd(); break;
      }
    } catch (err) {
      console.error('[WebRTC] Failed to parse signal:', err);
    }
  }

  // ── Call Actions ───────────────────────────────────

  startCall(peerId: string, peerName: string, peerAvatar?: string, conversationId?: string, currentUserName?: string, currentUserAvatar?: string) {
    if (this.callState !== 'idle') {
      console.warn('[WebRTC] ❌ Cannot start call — not in idle state!');
      return;
    }
    if (!websocketService.isConnected()) {
      console.error('[WebRTC] ❌ Cannot start call — WebSocket not connected!');
      return;
    }

    const callId = crypto.randomUUID();
    this.callInfo = { callId, peerId, peerName, peerAvatar, conversationId, isCaller: true };
    this.callerName = currentUserName || null;
    this.callerAvatar = currentUserAvatar;

    console.log('[WebRTC] Starting call â†’ peer:', peerName, '(', peerId, ') callId:', callId, { conversationId, callerId: this.currentUserId, peerAvatar });
    this.setState('requesting');
    
    // Auto-cleanup if no one answers within 30s
    this.clearRequestingTimeout();
    this.connectingTimeoutId = setTimeout(() => {
      if (this.callState === 'requesting' || this.callState === 'connecting') {
        console.warn('[WebRTC] Call timeout — no response or connection failed');
        this.endCall();
      }
    }, 60_000);

    this.sendSignal({
      type: 'CALL_REQUEST',
      receiverId: peerId,
      callId,
      callerName: currentUserName,
      callerAvatar: currentUserAvatar,
      conversationId,
    });
  }

  private clearRequestingTimeout() {
    if (this.connectingTimeoutId) {
      clearTimeout(this.connectingTimeoutId);
      this.connectingTimeoutId = null;
    }
  }

  private clearIncomingTimeout() {
    if (this.incomingTimeoutId) {
      clearTimeout(this.incomingTimeoutId);
      this.incomingTimeoutId = null;
    }
  }

  /**
   * Callee accepts call.
   */
  async acceptCall() {
    if (!this.callInfo || this.callState !== 'incoming') return;
    
    this.clearIncomingTimeout();
    console.log('[WebRTC] Accepting call...', this.callInfo.callId);
    this.setState('connecting');

    // Acquire media first before signaling back
    await this.acquireMedia();

    // Send acceptance signal
    this.sendSignal({
      type: 'CALL_ACCEPTED',
      receiverId: this.callInfo.peerId,
      callId: this.callInfo.callId,
    });

    // Start retry mechanism for CALL_ACCEPTED (it's critical for Caller to start handshake)
    this.startAcceptedCallRetry();
  }

  /**
   * Retry logic for CALL_ACCEPTED signal.
   * Callee sends this and then expects an OFFER from Caller.
   * If OFFER doesn't arrive in 5s, resend CALL_ACCEPTED.
   */
  private startAcceptedCallRetry() {
    this.clearAcceptedRetry();
    let retries = 0;
    const MAX_RETRIES = 3;

    const retry = () => {
      if (this.callState !== 'connecting' || !this.callInfo || this.callInfo.isCaller) return;
      if (retries >= MAX_RETRIES) {
        console.error('[WebRTC] CALL_ACCEPTED retry limit reached — ending call');
        this.endCall();
        return;
      }

      retries++;
      console.log(`[WebRTC] OFFER not received yet — resending CALL_ACCEPTED (retry ${retries}/${MAX_RETRIES})`);
      this.sendSignal({
        type: 'CALL_ACCEPTED',
        receiverId: this.callInfo!.peerId,
        callId: this.callInfo!.callId,
      });
      this.acceptedRetryId = setTimeout(retry, 5000);
    };

    this.acceptedRetryId = setTimeout(retry, 5000);
  }

  private clearAcceptedRetry() {
    if (this.acceptedRetryId) {
      clearTimeout(this.acceptedRetryId);
      this.acceptedRetryId = null;
    }
  }

  rejectCall() {
    if (!this.callInfo) return;
    console.log('[WebRTC] Rejecting call', this.callInfo.callId);
    this.sendSignal({
      type: 'CALL_REJECTED',
      receiverId: this.callInfo.peerId,
      callId: this.callInfo.callId,
    });
    this.cleanup();
  }

  endCall() {
    if (!this.callInfo) {
      this.cleanup();
      return;
    }
    console.log('[WebRTC] Ending call', this.callInfo.callId);
    this.sendSignal({
      type: 'END_CALL',
      receiverId: this.callInfo.peerId,
      callId: this.callInfo.callId,
    });
    this.cleanup();
  }

  // ── Signal Handlers ────────────────────────────────

  /**
   * Nhận CALL_REQUEST → hiện Incoming Call UI.
   */
  private handleIncomingCall(signal: CallSignal) {
    if (this.callState !== 'idle') {
      // Đang bận → tự động reject
      console.warn('[WebRTC] Busy — auto-rejecting incoming call');
      this.sendSignal({
        type: 'CALL_REJECTED',
        senderId: signal.receiverId,
        receiverId: signal.senderId,
        callId: signal.callId,
      });
      return;
    }

    this.callInfo = {
      callId: signal.callId,
      peerId: signal.senderId,
      peerName: signal.callerName || 'Unknown',
      peerAvatar: signal.callerAvatar,
      conversationId: signal.conversationId || '',
      isCaller: false,
    };

    console.log('[WebRTC] Incoming call prepared', {
      callId: this.callInfo.callId,
      peerId: this.callInfo.peerId,
      peerName: this.callInfo.peerName,
      conversationId: this.callInfo.conversationId,
      senderId: signal.senderId,
      currentState: this.callState,
    });
    this.setState('incoming');
  }

  /**
   * Caller nhận CALL_ACCEPTED → lấy media → tạo offer.
   */
  private async handleCallAccepted(_signal: CallSignal) {
    if (!this.callInfo || !this.callInfo.isCaller) {
      console.warn('[WebRTC] Ignoring CALL_ACCEPTED because caller state is missing', {
        hasCallInfo: !!this.callInfo,
        isCaller: this.callInfo?.isCaller,
        currentState: this.callState,
        signalCallId: _signal.callId,
        signalSenderId: _signal.senderId,
      });
      return;
    }
    if (this.callState === 'idle') {
      console.warn('[WebRTC] CALL_ACCEPTED received while idle — recovering caller state from callInfo');
    }

    console.log('[WebRTC] Call accepted — starting WebRTC handshake', {
      callId: this.callInfo.callId,
      peerId: this.callInfo.peerId,
      peerName: this.callInfo.peerName,
      currentState: this.callState,
    });
    this.setState('connecting');

    await this.acquireMedia();

    console.log('[WebRTC] Caller media ready', {
      callId: this.callInfo.callId,
      hasLocalStream: !!this.localStream,
      tracks: this.localStream?.getTracks().map(t => `${t.kind}:${t.enabled ? 'on' : 'off'}`),
    });
    this.createPeerConnection();
    await this.createAndSendOffer();
  }

  private handleCallRejected() {
    console.log('[WebRTC] Call rejected by peer');
    this.cleanup();
  }

  /**
   * Callee nhận OFFER → buffer nếu chưa có media, hoặc xử lý ngay.
   */
  private async handleOffer(signal: CallSignal) {
    // OFFER nhận được → dừng retry CALL_ACCEPTED (caller đã nhận được tín hiệu)
    this.clearAcceptedRetry();
    if (!this.callInfo) {
      console.warn('[WebRTC] Ignoring OFFER because callInfo is missing', {
        signalCallId: signal.callId,
        senderId: signal.senderId,
        currentState: this.callState,
      });
      return;
    }

    // Nếu localStream chưa sẵn sàng (acquireMedia đang chạy), buffer OFFER
    if (!this.localStream) {
      console.log('[WebRTC] OFFER received before media ready — buffering', {
        callId: signal.callId,
        senderId: signal.senderId,
        currentState: this.callState,
      });
      this.pendingOffer = signal;
      return;
    }

    console.log('[WebRTC] OFFER received — setting remote description', {
      callId: signal.callId,
      senderId: signal.senderId,
      signalingState: this.pc?.signalingState,
    });

    this.createPeerConnection();
    await this.pc!.setRemoteDescription(new RTCSessionDescription(signal.payload));
    
    // Xử lý các ICE candidates đã buffer
    await this.flushPendingCandidates();

    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);

    this.sendSignal({
      type: 'ANSWER',
      receiverId: signal.senderId,
      callId: signal.callId,
      payload: answer,
    });
  }

  private async handleAnswer(signal: CallSignal) {
    if (!this.pc) return;
    console.log('[WebRTC] ANSWER received — setting remote description', {
      callId: signal.callId,
      senderId: signal.senderId,
      signalingState: this.pc.signalingState,
    });
    await this.pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
    await this.flushPendingCandidates();
  }

  private async handleIceCandidate(signal: CallSignal) {
    const candidate = signal.payload;
    if (this.pc && this.pc.remoteDescription) {
      console.log('[WebRTC] Adding ICE candidate directly');
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      console.log('[WebRTC] Buffering ICE candidate — remoteDescription not set yet', {
        senderId: signal.senderId,
        receiverId: signal.receiverId,
        hasPc: !!this.pc,
        hasRemoteDescription: !!this.pc?.remoteDescription,
      });
      this.pendingCandidates.push(candidate);
    }
  }

  private handleRemoteEnd() {
    console.log('[WebRTC] Remote peer ended call');
    this.cleanup();
  }

  // ── WebRTC Core ────────────────────────────────────

  private async acquireMedia() {
    // Kiểm tra secure context (getUserMedia chỉ hoạt động trên HTTPS hoặc localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Camera/Mic không khả dụng — cần HTTPS hoặc localhost';
      console.error(`[WebRTC] ❌ ${msg}`);
      this.onMediaErrorCallback?.(msg);
      this.localStream = new MediaStream();
      this.onLocalStreamCallback?.(this.localStream);
      return;
    }

    // Đôi khi cần một chút delay để browser ổn định sau permission prompt hoặc tab switch
    await new Promise(resolve => setTimeout(resolve, 200));

    // Thử lần lượt các bộ constraints thông minh hơn
    const attempts: Array<{ 
      constraints: MediaStreamConstraints; 
      label: string 
    }> = [
      { 
        constraints: { 
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, 
          audio: true 
        }, 
        label: 'video (HD) + audio' 
      },
      { 
        constraints: { video: true, audio: true }, 
        label: 'video + audio (basic)' 
      },
      { 
        constraints: { video: false, audio: true }, 
        label: 'audio only' 
      },
      { 
        constraints: { video: true, audio: false }, 
        label: 'video only' 
      },
    ];

    let lastError: string = '';
    for (const attempt of attempts) {
      try {
        console.log(`[WebRTC] Requesting media: ${attempt.label}...`, attempt.constraints);
        
        const streamPromise = navigator.mediaDevices.getUserMedia(attempt.constraints);
        
        // Bọc getUserMedia với timeout 10s
        this.localStream = await Promise.race([
          streamPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('getUserMedia timeout (10s)')), 10_000)
          ),
        ]);

        console.log('[WebRTC] Local media acquired (%s) — tracks:', attempt.label,
          this.localStream.getTracks().map(t => `${t.kind}:${t.label}`));

        if (attempt.label.includes('audio only')) {
          this.onMediaErrorCallback?.('Chỉ lấy được audio (Camera lỗi hoặc bị chiếm)');
        }
        this.onLocalStreamCallback?.(this.localStream);
        return;
      } catch (err) {
        const error = err as any;
        lastError = `${error.name}: ${error.message}`;
        console.warn(`[WebRTC] Failed to acquire ${attempt.label}:`, lastError);
        
        // Nếu user từ chối (NotAllowedError) -> dừng hẳn vì user đã bấm block
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          console.error('[WebRTC] User denied media permissions.');
          break; 
        }
      }
    }

    // Tất cả đều fail → tạo empty stream để call vẫn hoạt động (receive-only)
    console.warn('[WebRTC] No media devices available — proceeding with receive-only mode');
    this.onMediaErrorCallback?.(`Không thể mở camera/mic: ${lastError}`);
    this.localStream = new MediaStream();
    this.onLocalStreamCallback?.(this.localStream);
  }

  private createPeerConnection() {
    if (this.pc) return;

    console.log('[WebRTC] Creating RTCPeerConnection with ICE servers:', ICE_SERVERS.map(s => s.urls));
    console.log('[WebRTC] PeerConnection context', {
      callId: this.callInfo?.callId,
      peerId: this.callInfo?.peerId,
      hasLocalStream: !!this.localStream,
      currentState: this.callState,
    });

    this.pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 2,
      iceTransportPolicy: 'all',
    });
    this.remoteStream = new MediaStream();

    // Thêm local tracks vào peer connection
    if (this.localStream) {
      const tracks = this.localStream.getTracks();
      const hasAudio = tracks.some(t => t.kind === 'audio');
      const hasVideo = tracks.some(t => t.kind === 'video');

      // Thêm các local tracks có sẵn
      tracks.forEach(track => {
        console.log(`[WebRTC] Adding local track: ${track.kind}`);
        this.pc!.addTrack(track, this.localStream!);
      });

      // QUAN TRỌNG: Luôn thêm recvonly transceiver cho media type bị thiếu
      // để SDP negotiation vẫn bao gồm audio/video m= lines
      // → cho phép nhận media từ remote ngay cả khi local không có
      if (!hasAudio) {
        console.log('[WebRTC] No local audio — adding recvonly audio transceiver');
        this.pc!.addTransceiver('audio', { direction: 'recvonly' });
      }
      if (!hasVideo) {
        console.log('[WebRTC] No local video — adding recvonly video transceiver');
        this.pc!.addTransceiver('video', { direction: 'recvonly' });
      }
    } else {
      // Không có stream nào → recvonly cho cả hai
      console.log('[WebRTC] No local stream — adding recvonly transceivers');
      this.pc!.addTransceiver('audio', { direction: 'recvonly' });
      this.pc!.addTransceiver('video', { direction: 'recvonly' });
    }

    // Nhận remote tracks — dùng event.track trực tiếp (event.streams có thể rỗng với recvonly)
    this.pc.ontrack = (event) => {
      console.log(`[WebRTC] Remote track received: ${event.track.kind}`);
      this.remoteStream!.addTrack(event.track);
      this.onRemoteStreamCallback?.(this.remoteStream!);
    };

    // ICE candidates → gửi cho peer
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.callInfo) {
        console.log('[WebRTC] ICE Candidate sent:', event.candidate.candidate.substring(0, 50) + '...');
        this.sendSignal({
          type: 'ICE_CANDIDATE',
          senderId: '', // server sẽ override
          receiverId: this.callInfo.peerId,
          callId: this.callInfo.callId,
          payload: event.candidate.toJSON(),
        });
      }
    };

    // Connection state tracking
    this.pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection State Changed â†’ ${this.pc?.connectionState}`);
      switch (this.pc?.connectionState) {
        case 'connected':
          this.clearDisconnectTimeout();
          this.setState('connected');
          break;
        case 'failed':
          // Chỉ cleanup khi connection thực sự fail (không phục hồi được)
          console.warn('[WebRTC] Connection failed — cleaning up');
          this.cleanup();
          break;
        case 'disconnected':
          // disconnected là trạng thái TẠM THỜI — có thể tự phục hồi
          // Chỉ cleanup nếu không phục hồi sau 10s
          console.warn('[WebRTC] Connection disconnected — waiting for recovery...');
          this.startDisconnectTimeout();
          break;
        case 'closed':
          this.cleanup();
          break;
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE Connection State â†’ ${this.pc?.iceConnectionState}`);
    };

    this.pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE Gathering State â†’ ${this.pc?.iceGatheringState}`);
    };
  }

  private async createAndSendOffer() {
    if (!this.pc || !this.callInfo) return;

    console.log('[WebRTC] Generating Offer...', {
      callId: this.callInfo.callId,
      peerId: this.callInfo.peerId,
      signalingState: this.pc.signalingState,
    });
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    console.log('[WebRTC] Local description set (offer)', {
      callId: this.callInfo.callId,
      signalingState: this.pc.signalingState,
    });

    this.sendSignal({
      type: 'OFFER',
      senderId: '',
      receiverId: this.callInfo.peerId,
      callId: this.callInfo.callId,
      payload: offer,
    });
    console.log('[WebRTC] Offer sent to peer', {
      callId: this.callInfo.callId,
      receiverId: this.callInfo.peerId,
    });
  }

  private async flushPendingCandidates() {
    if (this.pendingCandidates.length > 0) {
      console.log(`[WebRTC] Flushing ${this.pendingCandidates.length} pending ICE candidates`);
      for (const c of this.pendingCandidates) {
        await this.pc!.addIceCandidate(new RTCIceCandidate(c));
      }
      this.pendingCandidates = [];
    }
  }

  // ── Media Controls ─────────────────────────────────

  toggleMute(): boolean {
    if (!this.localStream) return false;
    const audio = this.localStream.getAudioTracks()[0];
    if (audio) {
      audio.enabled = !audio.enabled;
      console.log(`[WebRTC] Mic ${audio.enabled ? 'unmuted' : 'muted'}`);
      return !audio.enabled; // true = muted
    }
    return false;
  }

  toggleCamera(): boolean {
    if (!this.localStream) return false;
    const video = this.localStream.getVideoTracks()[0];
    if (video) {
      video.enabled = !video.enabled;
      console.log(`[WebRTC] Camera ${video.enabled ? 'on' : 'off'}`);
      return !video.enabled; // true = camera off
    }
    return false;
  }

  // ── Send Signal via STOMP ──────────────────────────

  private sendSignal(signal: Partial<CallSignal>) {
    console.log('[WebRTC] Sending signal', {
      type: signal.type,
      callId: signal.callId,
      receiverId: signal.receiverId,
      currentState: this.callState,
      hasCallInfo: !!this.callInfo,
      websocketConnected: websocketService.isConnected(),
    });
    const sent = websocketService.send('/app/call/signal', signal);
    if (!sent) {
      console.error('[WebRTC] Failed to send signal:', signal.type, '— WebSocket not connected');
      // Nếu chưa bắt đầu gọi được thì cleanup
      if (signal.type === 'CALL_REQUEST') {
        this.cleanup();
      }
    }
  }

  // ── Cleanup ────────────────────────────────────────

  /**
   * Hủy timeout disconnect recovery (gọi khi connection phục hồi hoặc cleanup).
   */
  private clearDisconnectTimeout() {
    if (this.disconnectTimeoutId) {
      clearTimeout(this.disconnectTimeoutId);
      this.disconnectTimeoutId = null;
    }
  }

  /**
   * Bắt đầu timeout cho disconnected state — nếu không phục hồi trong 10s thì cleanup.
   */
  private startDisconnectTimeout() {
    this.clearDisconnectTimeout();
    this.disconnectTimeoutId = setTimeout(() => {
      if (this.pc?.connectionState === 'disconnected') {
        console.warn('[WebRTC] Connection did not recover from disconnected — cleaning up');
        this.cleanup();
      }
    }, 30_000);
  }

  cleanup() {
    // Chống re-entrancy: nếu đang cleanup thì bỏ qua
    if (this.isCleaningUp) return;
    if (this.callState === 'idle' && !this.pc && !this.localStream) return;

    this.isCleaningUp = true;
    console.log('[WebRTC] Cleanup — releasing resources (current state:', this.callState, ')', {
      callId: this.callInfo?.callId,
      peerId: this.callInfo?.peerId,
      hasPc: !!this.pc,
      hasLocalStream: !!this.localStream,
      hasRemoteStream: !!this.remoteStream,
    });
    if (this.callState !== 'idle') {
      console.trace('[WebRTC] cleanup called from non-idle state:');
    }

    this.clearDisconnectTimeout();
    this.clearRequestingTimeout();
    this.clearIncomingTimeout();

    // Close peer connection
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onicegatheringstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    this.remoteStream = null;
    this.pendingCandidates = [];
    this.pendingOffer = null;
    this.recentSignalKeys.clear();
    this.callInfo = null;
    this.currentUserId = null;
    this.callerName = null;
    this.callerAvatar = undefined;
    this.clearAcceptedRetry();
    this.onLocalStreamCallback = null;
    this.onRemoteStreamCallback = null;
    this.onMediaErrorCallback = null;
    this.setState('idle');
    this.isCleaningUp = false;
  }
}

// HMR-safe singleton: preserve across hot reloads in development
type WebRTCServiceWindow = Window & {
  __webrtcServiceInstance?: WebRTCService;
};

let _rtcInstance: WebRTCService;
if (typeof window !== 'undefined') {
  const rtcWindow = window as WebRTCServiceWindow;
  if (!rtcWindow.__webrtcServiceInstance) {
    rtcWindow.__webrtcServiceInstance = new WebRTCService();
  }
  _rtcInstance = rtcWindow.__webrtcServiceInstance;
} else {
  _rtcInstance = new WebRTCService();
}

export const webrtcService = _rtcInstance;
