/**
 * webrtcService.ts — Quản lý kết nối WebRTC peer-to-peer cho Video Call 1-1.
 *
 * Luồng:
 *  1. Caller: createOffer() → gửi SDP offer qua STOMP
 *  2. Callee: handleOffer() → createAnswer() → gửi SDP answer
 *  3. Cả hai: trao đổi ICE candidates qua STOMP
 *  4. ontrack → remote stream → hiển thị video
 *
 * STUN servers: Google free (stun:stun.l.google.com:19302)
 */

import { websocketService } from '@/lib/realtime/websocketService';

// ─── Types ──────────────────────────────────────────────

export type CallState =
  | 'idle'           // Không có cuộc gọi
  | 'requesting'     // Đang gửi yêu cầu gọi
  | 'incoming'       // Đang nhận cuộc gọi đến
  | 'connecting'     // Đang thiết lập kết nối WebRTC
  | 'connected'      // Đang gọi
  | 'ended';         // Cuộc gọi kết thúc

export type SignalType =
  | 'CALL_REQUEST'
  | 'CALL_ACCEPTED'
  | 'CALL_REJECTED'
  | 'OFFER'
  | 'ANSWER'
  | 'ICE_CANDIDATE'
  | 'CALL_END';

export interface CallSignal {
  type: SignalType;
  senderId: string;
  receiverId: string;
  callId: string;
  conversationId?: string;
  callerName?: string;
  callerAvatar?: string;
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
}

export interface CallInfo {
  callId: string;
  peerId: string;
  peerName: string;
  peerAvatar?: string;
  conversationId: string;
  isCaller: boolean;
}

type CallStateListener = (state: CallState, info: CallInfo | null) => void;

// ─── ICE Configuration ──────────────────────────────────

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

// ─── Service ────────────────────────────────────────────

class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  private callState: CallState = 'idle';
  private callInfo: CallInfo | null = null;
  private stateListeners: Set<CallStateListener> = new Set();

  // Pending ICE candidates (nhận trước khi remote description được set)
  private pendingCandidates: RTCIceCandidateInit[] = [];

  // Timeout ID cho disconnected state recovery
  private disconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Flag chống gọi cleanup/endCall trùng lặp
  private isCleaningUp: boolean = false;

  // Pending OFFER (nhận trước khi localStream sẵn sàng ở callee)
  private pendingOffer: CallSignal | null = null;

  // Timestamp khi call state thay đổi → dùng để phát hiện endCall bất thường
  private lastStateChangeTime: number = 0;

  // STOMP subscription ref
  private signalSub: { unsubscribe: () => void } | null = null;

  // Callback refs cho UI
  private onLocalStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;

  // ── State Management ────────────────────────────────

  getCallState(): CallState {
    return this.callState;
  }

  getCallInfo(): CallInfo | null {
    return this.callInfo;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  onStateChange(listener: CallStateListener) {
    this.stateListeners.add(listener);
    return () => { this.stateListeners.delete(listener); };
  }

  onLocalStream(cb: (stream: MediaStream) => void) {
    this.onLocalStreamCallback = cb;
  }

  onRemoteStream(cb: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = cb;
  }

  private setState(state: CallState) {
    this.callState = state;
    this.lastStateChangeTime = Date.now();
    console.log(`%c[WebRTC] State → ${state}`, 'color: #00bcd4; font-weight: bold;',
      this.callInfo ? `peer=${this.callInfo.peerName}` : '');
    this.stateListeners.forEach(l => l(state, this.callInfo));
  }

  // ── Subscribe to signaling channel ─────────────────

  /**
   * Đăng ký nhận tín hiệu call qua STOMP user queue.
   * Gọi 1 lần khi app mount (trong SocketProvider).
   */
  subscribeSignaling() {
    if (this.signalSub) return;

    this.signalSub = websocketService.subscribe(
      '/user/queue/call-signal',
      (message) => {
        try {
          // Backend gửi Map<String, Object> → serialized thành JSON
          const signal: CallSignal = typeof message.body === 'string'
            ? JSON.parse(message.body)
            : message.body;
          console.log('[WebRTC] Signal received:', signal.type, 'from', signal.senderId,
            'callId:', signal.callId);
          this.handleSignal(signal);
        } catch (e) {
          console.error('[WebRTC] Failed to parse signal:', e, 'raw:', message.body);
        }
      }
    );
    console.log('[WebRTC] ✅ Subscribed to /user/queue/call-signal');
  }

  unsubscribeSignaling() {
    this.signalSub?.unsubscribe();
    this.signalSub = null;
  }

  // ── Signal Handler (dispatch) ──────────────────────

  private async handleSignal(signal: CallSignal) {
    try {
      switch (signal.type) {
        case 'CALL_REQUEST':
          this.handleIncomingCall(signal);
          break;
        case 'CALL_ACCEPTED':
          await this.handleCallAccepted(signal);
          break;
        case 'CALL_REJECTED':
          this.handleCallRejected();
          break;
        case 'OFFER':
          await this.handleOffer(signal);
          break;
        case 'ANSWER':
          await this.handleAnswer(signal);
          break;
        case 'ICE_CANDIDATE':
          await this.handleIceCandidate(signal);
          break;
        case 'CALL_END':
          this.handleRemoteEnd();
          break;
      }
    } catch (err) {
      console.error('[WebRTC] Error handling signal:', signal.type, err);
      // Nếu xảy ra lỗi trong quá trình xử lý → cleanup
      this.cleanup();
    }
  }

  // ── Caller Flow ────────────────────────────────────

  /**
   * Bắt đầu cuộc gọi: gửi CALL_REQUEST tới peer.
   */
  async startCall(
    currentUserId: string,
    peerId: string,
    peerName: string,
    peerAvatar: string | undefined,
    conversationId: string,
    callerName: string,
    callerAvatar?: string,
  ) {
    if (this.callState !== 'idle') {
      console.warn('[WebRTC] Cannot start call — state:', this.callState);
      return;
    }

    // Kiểm tra WebSocket connection
    if (!websocketService.isConnected()) {
      console.error('[WebRTC] ❌ Cannot start call — WebSocket not connected!');
      return;
    }

    const callId = crypto.randomUUID();
    this.callInfo = { callId, peerId, peerName, peerAvatar, conversationId, isCaller: true };
    this.setState('requesting');

    console.log('[WebRTC] Starting call → peer:', peerName, '(', peerId, ') callId:', callId);

    this.sendSignal({
      type: 'CALL_REQUEST',
      senderId: currentUserId,
      receiverId: peerId,
      callId,
      conversationId,
      callerName,
      callerAvatar,
    });
  }

  /**
   * Callee chấp nhận cuộc gọi → gửi CALL_ACCEPTED → bắt đầu WebRTC handshake.
   */
  async acceptCall(currentUserId: string) {
    if (this.callState !== 'incoming' || !this.callInfo) return;

    console.log('[WebRTC] Accepting call from:', this.callInfo.peerName);
    this.setState('connecting');

    this.sendSignal({
      type: 'CALL_ACCEPTED',
      senderId: currentUserId,
      receiverId: this.callInfo.peerId,
      callId: this.callInfo.callId,
    });

    // Callee: lấy media trước, sau đó xử lý OFFER (có thể đã buffered)
    await this.acquireMedia();

    // Nếu OFFER đã đến trong lúc đang acquireMedia → xử lý ngay
    if (this.pendingOffer) {
      const offer = this.pendingOffer;
      this.pendingOffer = null;
      await this.processOffer(offer);
    }
  }

  /**
   * Callee từ chối cuộc gọi.
   */
  rejectCall(currentUserId: string) {
    if (this.callState !== 'incoming' || !this.callInfo) return;

    console.log('[WebRTC] Rejecting call from:', this.callInfo.peerName);

    this.sendSignal({
      type: 'CALL_REJECTED',
      senderId: currentUserId,
      receiverId: this.callInfo.peerId,
      callId: this.callInfo.callId,
    });

    this.cleanup();
  }

  /**
   * Kết thúc cuộc gọi (hang up) — gọi từ bất kỳ bên nào.
   */
  endCall(currentUserId: string) {
    if (!this.callInfo || this.isCleaningUp) return;
    if (this.callState === 'idle') return; // Đã kết thúc rồi

    const elapsed = Date.now() - this.lastStateChangeTime;
    console.log('[WebRTC] Ending call — state:', this.callState, '— elapsed since last state change:', elapsed, 'ms');
    console.trace('[WebRTC] endCall stack trace:');

    this.sendSignal({
      type: 'CALL_END',
      senderId: currentUserId,
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

    this.setState('incoming');
  }

  /**
   * Caller nhận CALL_ACCEPTED → lấy media → tạo offer.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleCallAccepted(_signal: CallSignal) {
    if (this.callState !== 'requesting') return;

    console.log('[WebRTC] Call accepted — starting WebRTC handshake');
    this.setState('connecting');

    await this.acquireMedia();

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
    if (!this.callInfo) return;

    // Nếu localStream chưa sẵn sàng (acquireMedia đang chạy), buffer OFFER
    if (!this.localStream) {
      console.log('[WebRTC] OFFER received before media ready — buffering');
      this.pendingOffer = signal;
      return;
    }

    await this.processOffer(signal);
  }

  /**
   * Xử lý OFFER: tạo PeerConnection → set remote desc → tạo answer.
   */
  private async processOffer(signal: CallSignal) {
    console.log('[WebRTC] Processing OFFER — creating answer...');
    this.createPeerConnection();

    const offer = signal.payload as RTCSessionDescriptionInit;
    await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('[WebRTC] Remote description set (offer)');

    // Flush pending ICE candidates
    await this.flushPendingCandidates();

    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    console.log('[WebRTC] Local description set (answer)');

    this.sendSignal({
      type: 'ANSWER',
      senderId: this.callInfo!.peerId, // server sẽ override
      receiverId: this.callInfo!.peerId,
      callId: this.callInfo!.callId,
      payload: answer,
    });
  }

  /**
   * Caller nhận ANSWER → set remote description.
   */
  private async handleAnswer(signal: CallSignal) {
    if (!this.pc) return;

    console.log('[WebRTC] Received ANSWER — setting remote description');
    const answer = signal.payload as RTCSessionDescriptionInit;
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));

    // Flush pending ICE candidates
    await this.flushPendingCandidates();
  }

  /**
   * Nhận ICE candidate → thêm vào PeerConnection.
   */
  private async handleIceCandidate(signal: CallSignal) {
    const candidate = signal.payload as RTCIceCandidateInit;
    if (!candidate) return;

    if (this.pc && this.pc.remoteDescription) {
      console.log('[WebRTC] Adding ICE candidate');
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      console.log('[WebRTC] Queuing ICE candidate (remote desc not set yet)');
      this.pendingCandidates.push(candidate);
    }
  }

  private handleRemoteEnd() {
    console.log('[WebRTC] Remote peer ended call');
    this.cleanup();
  }

  // ── WebRTC Core ────────────────────────────────────

  private async acquireMedia() {
    // Thử lần lượt: video+audio → audio only → video only
    const attempts: Array<{ video: boolean | MediaTrackConstraints; audio: boolean | MediaTrackConstraints; label: string }> = [
      { video: true, audio: true, label: 'video + audio' },
      { video: false, audio: true, label: 'audio only' },
      { video: true, audio: false, label: 'video only' },
    ];

    for (const attempt of attempts) {
      try {
        console.log(`[WebRTC] Requesting media: ${attempt.label}...`);
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: attempt.video,
          audio: attempt.audio,
        });
        console.log('[WebRTC] Local media acquired (%s) — tracks:', attempt.label,
          this.localStream.getTracks().map(t => t.kind));
        this.onLocalStreamCallback?.(this.localStream);
        return;
      } catch (err) {
        console.warn(`[WebRTC] Failed to acquire ${attempt.label}:`, (err as Error).name, (err as Error).message);
      }
    }

    // Tất cả đều fail → tạo empty stream để call vẫn hoạt động (receive-only)
    console.warn('[WebRTC] No media devices available — proceeding with receive-only mode');
    this.localStream = new MediaStream();
    this.onLocalStreamCallback?.(this.localStream);
  }

  private createPeerConnection() {
    if (this.pc) return;

    console.log('[WebRTC] Creating RTCPeerConnection with ICE servers:', ICE_SERVERS.map(s => s.urls));

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.remoteStream = new MediaStream();

    // Thêm local tracks vào peer connection
    if (this.localStream) {
      const tracks = this.localStream.getTracks();
      if (tracks.length > 0) {
        tracks.forEach(track => {
          console.log(`[WebRTC] Adding local track: ${track.kind}`);
          this.pc!.addTrack(track, this.localStream!);
        });
      } else {
        // No local media — add receive-only transceivers so SDP includes audio/video m= lines
        console.log('[WebRTC] No local tracks — adding recvonly transceivers');
        this.pc!.addTransceiver('audio', { direction: 'recvonly' });
        this.pc!.addTransceiver('video', { direction: 'recvonly' });
      }
    }

    // Nhận remote tracks
    this.pc.ontrack = (event) => {
      console.log(`[WebRTC] Remote track received: ${event.track.kind}`);
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream!.addTrack(track);
      });
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
      console.log(`[WebRTC] Connection State Changed → ${this.pc?.connectionState}`);
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
      console.log(`[WebRTC] ICE Connection State → ${this.pc?.iceConnectionState}`);
    };

    this.pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE Gathering State → ${this.pc?.iceGatheringState}`);
    };
  }

  private async createAndSendOffer() {
    if (!this.pc || !this.callInfo) return;

    console.log('[WebRTC] Generating Offer...');
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    console.log('[WebRTC] Local description set (offer)');

    this.sendSignal({
      type: 'OFFER',
      senderId: '',
      receiverId: this.callInfo.peerId,
      callId: this.callInfo.callId,
      payload: offer,
    });
    console.log('[WebRTC] Offer sent to peer');
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
    }, 10_000);
  }

  cleanup() {
    // Chống re-entrancy: nếu đang cleanup thì bỏ qua
    if (this.isCleaningUp) return;
    if (this.callState === 'idle' && !this.pc && !this.localStream) return;

    this.isCleaningUp = true;
    console.log('[WebRTC] Cleanup — releasing resources (current state:', this.callState, ')');
    if (this.callState !== 'idle') {
      console.trace('[WebRTC] cleanup called from non-idle state:');
    }

    this.clearDisconnectTimeout();

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
    this.callInfo = null;
    this.onLocalStreamCallback = null;
    this.onRemoteStreamCallback = null;
    this.setState('idle');
    this.isCleaningUp = false;
  }
}

// HMR-safe singleton: preserve across hot reloads in development
let _rtcInstance: WebRTCService;
if (typeof window !== 'undefined') {
  if (!(window as any).__webrtcServiceInstance) {
    (window as any).__webrtcServiceInstance = new WebRTCService();
  }
  _rtcInstance = (window as any).__webrtcServiceInstance;
} else {
  _rtcInstance = new WebRTCService();
}

export const webrtcService = _rtcInstance;
