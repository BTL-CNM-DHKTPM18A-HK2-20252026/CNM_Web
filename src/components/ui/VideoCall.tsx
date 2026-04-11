'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { webrtcService, type CallState, type CallInfo } from '@/lib/realtime/webrtcService';

// ─── Icons (inline SVG) ──────────────────────────────

const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const VideoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const VideoOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" /><line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const PhoneOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2z" />
  </svg>
);

// ─── Incoming Call Modal ──────────────────────────────

interface IncomingCallModalProps {
  callInfo: CallInfo;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({ callInfo, onAccept, onReject }: IncomingCallModalProps) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl animate-pulse-slow">
        {/* Avatar */}
        <div className="mb-4">
          {callInfo.peerAvatar ? (
            <img
              src={callInfo.peerAvatar}
              alt={callInfo.peerName}
              className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-green-400 shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-green-400 shadow-lg">
              {callInfo.peerName?.charAt(0) || '?'}
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold text-white mb-1">{callInfo.peerName}</h2>
        <p className="text-gray-400 text-sm mb-8">Cuộc gọi video đến...</p>

        {/* Actions */}
        <div className="flex justify-center gap-12">
          <button
            onClick={onReject}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all active:scale-95 cursor-pointer"
            title="Từ chối"
          >
            <PhoneOffIcon />
          </button>
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-lg transition-all active:scale-95 animate-bounce cursor-pointer"
            title="Chấp nhận"
          >
            <PhoneIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Video Call Screen (Full-screen overlay) ──────────

interface VideoCallScreenProps {
  currentUserId: string;
  callInfo: CallInfo;
  callState: CallState;
  onEnd: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function VideoCallScreen({ currentUserId, callInfo, callState, onEnd }: VideoCallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Helper: gán stream vào video element + gọi play() tường minh cho desktop browser
  const attachStream = useCallback((videoEl: HTMLVideoElement | null, stream: MediaStream) => {
    if (!videoEl) return;
    videoEl.srcObject = stream;
    videoEl.play().catch(err => {
      console.warn('[VideoCallScreen] play() blocked:', err.name, err.message);
    });
  }, []);

  // Attach streams
  useEffect(() => {
    webrtcService.onLocalStream((stream) => {
      console.log('[VideoCallScreen] Local stream received');
      attachStream(localVideoRef.current, stream);
    });

    webrtcService.onRemoteStream((stream) => {
      console.log('[VideoCallScreen] Remote stream received');
      attachStream(remoteVideoRef.current, stream);
    });

    webrtcService.onMediaError((error) => {
      console.warn('[VideoCallScreen] Media error:', error);
      setMediaError(error);
    });

    // If streams already exist (reconnect scenario)
    const localStream = webrtcService.getLocalStream();
    if (localStream) {
      attachStream(localVideoRef.current, localStream);
    }
    const remoteStream = webrtcService.getRemoteStream();
    if (remoteStream) {
      attachStream(remoteVideoRef.current, remoteStream);
    }
  }, [attachStream]);

  // Timer
  useEffect(() => {
    if (callState !== 'connected') return;
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = useCallback(() => {
    const isMuted = webrtcService.toggleMute();
    setMuted(isMuted);
  }, []);

  const handleToggleCamera = useCallback(() => {
    const isOff = webrtcService.toggleCamera();
    setCameraOff(isOff);
  }, []);

  const statusText = callState === 'connecting' ? 'Đang kết nối...'
    : callState === 'requesting' ? 'Đang gọi...'
    : callState === 'connected' ? formatTime(elapsed)
    : callState === 'ended' ? 'Cuộc gọi đã kết thúc'
    : '';

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f0f23] flex flex-col">
      {/* Remote Video (fullscreen background) */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Status overlay when not connected */}
        {callState !== 'connected' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0f23]/80">
            {callInfo.peerAvatar ? (
              <img
                src={callInfo.peerAvatar}
                alt={callInfo.peerName}
                className="w-28 h-28 rounded-full object-cover mb-4 border-4 border-white/20"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold mb-4 border-4 border-white/20">
                {callInfo.peerName?.charAt(0) || '?'}
              </div>
            )}
            <h2 className="text-2xl font-bold text-white mb-2">{callInfo.peerName}</h2>
            <p className="text-gray-400">{statusText}</p>
            {(callState === 'requesting' || callState === 'connecting') && (
              <div className="mt-4 flex gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        )}

        {/* Call timer when connected */}
        {callState === 'connected' && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-1.5 rounded-full">
            <p className="text-white text-sm font-mono">{statusText}</p>
          </div>
        )}

        {/* Media error banner */}
        {mediaError && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-yellow-600/90 px-4 py-2 rounded-lg max-w-xs text-center">
            <p className="text-white text-xs">⚠️ {mediaError}</p>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-28 right-6 w-40 h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-gray-900">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${cameraOff ? 'hidden' : ''}`}
          />
          {cameraOff && (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <VideoOffIcon />
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="h-24 bg-[#1a1a2e] flex items-center justify-center gap-6 shrink-0">
        <button
          onClick={handleToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            muted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={muted ? 'Bật mic' : 'Tắt mic'}
        >
          {muted ? <MicOffIcon /> : <MicIcon />}
        </button>

        <button
          onClick={handleToggleCamera}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            cameraOff ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={cameraOff ? 'Bật camera' : 'Tắt camera'}
        >
          {cameraOff ? <VideoOffIcon /> : <VideoIcon />}
        </button>

        <button
          onClick={onEnd}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all active:scale-95 cursor-pointer"
          title="Kết thúc cuộc gọi"
        >
          <PhoneOffIcon />
        </button>
      </div>
    </div>
  );
}

// ─── VideoCallOverlay — Container quản lý state ──────

interface VideoCallOverlayProps {
  currentUserId: string;
}

export function VideoCallOverlay({ currentUserId }: VideoCallOverlayProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);

  useEffect(() => {
    const unsub = webrtcService.onStateChange((state, info) => {
      setCallState(state);
      setCallInfo(info);
    });
    return unsub;
  }, []);

  const handleAccept = useCallback(() => {
    webrtcService.acceptCall(currentUserId);
  }, [currentUserId]);

  const handleReject = useCallback(() => {
    webrtcService.rejectCall(currentUserId);
  }, [currentUserId]);

  const handleEnd = useCallback(() => {
    webrtcService.endCall(currentUserId);
  }, [currentUserId]);

  // Incoming call modal
  if (callState === 'incoming' && callInfo) {
    return <IncomingCallModal callInfo={callInfo} onAccept={handleAccept} onReject={handleReject} />;
  }

  // Active call screen (requesting, connecting, connected)
  if ((callState === 'requesting' || callState === 'connecting' || callState === 'connected') && callInfo) {
    return (
      <VideoCallScreen
        currentUserId={currentUserId}
        callInfo={callInfo}
        callState={callState}
        onEnd={handleEnd}
      />
    );
  }

  return null;
}
