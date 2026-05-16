'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { webrtcService, type CallState, type CallInfo } from '@/lib/realtime/webrtcService';

// â”€â”€â”€ Icons (inline SVG) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MicIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicOffIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const VideoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const VideoOffIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" /><line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const PhoneOffIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2z" />
  </svg>
);

// â”€â”€â”€ Incoming Call Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface IncomingCallModalProps {
  callInfo: CallInfo;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({ callInfo, onAccept, onReject }: IncomingCallModalProps) {
  return (
    <div className="fixed inset-0 z-9998 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="relative bg-linear-to-b from-[#1c1f3a] to-[#111327] rounded-3xl px-10 py-10 w-full max-w-xs text-center shadow-2xl border border-white/10 overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Pulsing rings */}
        <div className="relative flex items-center justify-center mb-6">
          <span className="absolute w-32 h-32 rounded-full border-2 border-green-400/30 animate-ping" style={{ animationDuration: '1.5s' }} />
          <span className="absolute w-24 h-24 rounded-full border-2 border-green-400/50 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
          {callInfo.peerAvatar ? (
            <img
              src={callInfo.peerAvatar}
              alt={callInfo.peerName}
              className="relative w-20 h-20 rounded-full object-cover border-4 border-green-400/80 shadow-lg shadow-green-500/30 z-10"
            />
          ) : (
            <div className="relative w-20 h-20 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-green-400/80 shadow-lg shadow-green-500/30 z-10">
              {callInfo.peerName?.charAt(0) || '?'}
            </div>
          )}
        </div>

        <p className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-1">Cuộc gọi video đến</p>
        <h2 className="text-xl font-bold text-white mb-8">{callInfo.peerName}</h2>

        {/* Actions */}
        <div className="flex justify-center gap-14">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onReject}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-red-500/40 transition-all cursor-pointer"
              title="Từ chối"
            >
              <PhoneOffIcon />
            </button>
            <span className="text-xs text-gray-400">Từ chối</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAccept}
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-green-500/40 transition-all cursor-pointer"
              title="Chấp nhận"
            >
              <PhoneIcon />
            </button>
            <span className="text-xs text-gray-400">Chấp nhận</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Video Call Screen (Full-screen overlay) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide controls after 4s when connected
  useEffect(() => {
    if (callState !== 'connected') {
      setShowControls(true);
      return;
    }
    const reset = () => {
      setShowControls(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
    };
    reset();
    window.addEventListener('mousemove', reset);
    window.addEventListener('touchstart', reset);
    return () => {
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('touchstart', reset);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [callState]);

  const attachStream = useCallback((videoEl: HTMLVideoElement | null, stream: MediaStream) => {
    if (!videoEl) return;
    videoEl.srcObject = stream;
    videoEl.play().catch(err => {
      console.warn('[VideoCallScreen] play() blocked:', err.name, err.message);
    });
  }, []);

  useEffect(() => {
    webrtcService.onLocalStream((stream) => {
      attachStream(localVideoRef.current, stream);
    });
    webrtcService.onRemoteStream((stream) => {
      attachStream(remoteVideoRef.current, stream);
    });
    webrtcService.onMediaError((error) => {
      setMediaError(error);
    });
    const localStream = webrtcService.getLocalStream();
    if (localStream) attachStream(localVideoRef.current, localStream);
    const remoteStream = webrtcService.getRemoteStream();
    if (remoteStream) attachStream(remoteVideoRef.current, remoteStream);
  }, [attachStream]);

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

  const isCalling = callState === 'requesting' || callState === 'connecting';

  return (
    <div className="fixed inset-0 z-9999 bg-[#0a0c1a] flex flex-col select-none">
      {/* Remote video (fullscreen) */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Gradient overlay (top + bottom) */}
        {callState === 'connected' && (
          <>
            <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-black/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/80 to-transparent pointer-events-none" />
          </>
        )}

        {/* Waiting / calling overlay */}
        {callState !== 'connected' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-to-b from-[#0d1030] via-[#0f1228] to-[#0a0c1a]">
            {/* Animated background blobs */}
            <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -top-24 -left-24 pointer-events-none" />
            <div className="absolute w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -bottom-24 -right-24 pointer-events-none" />

            {/* Pulsing avatar */}
            <div className="relative flex items-center justify-center mb-6">
              {isCalling && (
                <>
                  <span className="absolute w-44 h-44 rounded-full bg-blue-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                  <span className="absolute w-36 h-36 rounded-full bg-blue-500/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
                </>
              )}
              {callInfo.peerAvatar ? (
                <img
                  src={callInfo.peerAvatar}
                  alt={callInfo.peerName}
                  className="relative w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-2xl shadow-blue-900/50 z-10"
                />
              ) : (
                <div className="relative w-28 h-28 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold border-4 border-white/20 shadow-2xl z-10">
                  {callInfo.peerName?.charAt(0) || '?'}
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight mb-1">{callInfo.peerName}</h2>
            <p className="text-gray-400 text-sm mb-4">
              {callState === 'requesting' ? 'Đang gọi...' : 'Đang kết nối...'}
            </p>
            {isCalling && (
              <div className="flex gap-1.5">
                {[0, 150, 300].map((delay) => (
                  <div
                    key={delay}
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Top bar (name + timer) when connected */}
        {callState === 'connected' && (
          <div className={`absolute top-0 inset-x-0 flex flex-col items-center pt-5 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-white font-semibold text-base drop-shadow">{callInfo.peerName}</p>
            <p className="text-green-400 text-sm font-mono mt-0.5 drop-shadow">{formatTime(elapsed)}</p>
          </div>
        )}

        {/* Media error */}
        {mediaError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-500/90 px-4 py-2 rounded-xl shadow-lg">
            <p className="text-white text-xs font-medium">⚠️ {mediaError}</p>
          </div>
        )}

        {/* Local video PiP */}
        <div
          className={`absolute bottom-28 right-5 w-36 h-48 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-[#1a1a2e] transition-opacity duration-500 ${callState === 'connected' && !showControls ? 'opacity-40' : 'opacity-100'}`}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity ${cameraOff ? 'opacity-0' : 'opacity-100'}`}
          />
          {cameraOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-1">
              <VideoOffIcon />
              <span className="text-[10px]">Đã tắt</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 flex items-center justify-center gap-5 pb-8 pt-4 bg-linear-to-t from-black/90 to-transparent transition-opacity duration-500 ${callState === 'connected' && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        {/* Mic */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={handleToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg ${
              muted
                ? 'bg-red-500/90 text-white shadow-red-500/30'
                : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
            }`}
            title={muted ? 'Bật mic' : 'Tắt mic'}
          >
            {muted ? <MicOffIcon /> : <MicIcon />}
          </button>
          <span className="text-xs text-white/70">{muted ? 'Bật mic' : 'Tắt mic'}</span>
        </div>

        {/* End call */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={onEnd}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center text-white shadow-xl shadow-red-500/50 transition-all cursor-pointer"
            title="Kết thúc"
          >
            <PhoneOffIcon />
          </button>
          <span className="text-xs text-white/70">Kết thúc</span>
        </div>

        {/* Camera */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={handleToggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg ${
              cameraOff
                ? 'bg-red-500/90 text-white shadow-red-500/30'
                : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
            }`}
            title={cameraOff ? 'Bật camera' : 'Tắt camera'}
          >
            {cameraOff ? <VideoOffIcon /> : <VideoIcon />}
          </button>
          <span className="text-xs text-white/70">{cameraOff ? 'Bật cam' : 'Tắt cam'}</span>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ VideoCallOverlay â€” Container quáº£n lÃ½ state â”€â”€â”€â”€â”€â”€

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

  if (callState === 'incoming' && callInfo) {
    return <IncomingCallModal callInfo={callInfo} onAccept={handleAccept} onReject={handleReject} />;
  }

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

