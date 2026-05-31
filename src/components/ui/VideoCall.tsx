'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { webrtcService, type CallState, type CallInfo } from '@/lib/realtime/webrtcService';
import { userService } from '@/features/user';

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
      <div className="relative bg-white dark:bg-[#2A2E45] rounded-2xl px-10 py-10 w-full max-w-xs text-center shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
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

        <p className="text-green-600 dark:text-green-400 text-xs font-semibold uppercase tracking-widest mb-1">Cuộc gọi video đến</p>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-8">{callInfo.peerName}</h2>

        {/* Actions */}
        <div className="flex justify-center gap-14">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onReject}
              className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-red-500/40 transition-all cursor-pointer"
              title="Từ chối"
            >
              <PhoneOffIcon />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Từ chối</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAccept}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-400 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-green-500/40 transition-all cursor-pointer"
              title="Chấp nhận"
            >
              <PhoneIcon />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">Chấp nhận</span>
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

  const attachStream = useCallback((videoEl: HTMLVideoElement | null, stream: MediaStream, isLocal: boolean) => {
    if (!videoEl || !stream) return;
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
    videoEl.muted = isLocal;
    const playPromise = videoEl.play();
    if (playPromise) {
      playPromise.catch(err => {
        if (err.name === 'NotAllowedError' && !isLocal) {
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        }
        console.warn('[VideoCallScreen] play() blocked:', err.name);
      });
    }
  }, []);

  useEffect(() => {
    webrtcService.onLocalStream((stream) => {
      attachStream(localVideoRef.current, stream, true);
    });
    webrtcService.onRemoteStream((stream) => {
      attachStream(remoteVideoRef.current, stream, false);
    });
    webrtcService.onMediaError((error) => {
      setMediaError(error);
    });
    const localStream = webrtcService.getLocalStream();
    if (localStream) attachStream(localVideoRef.current, localStream, true);
    const remoteStream = webrtcService.getRemoteStream();
    if (remoteStream) attachStream(remoteVideoRef.current, remoteStream, false);
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
    <div className="fixed inset-0 z-9999 bg-[#F8FAFC] dark:bg-[#090714] flex flex-col select-none overflow-hidden font-sans">
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
            <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/60 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-black/80 to-transparent pointer-events-none z-10" />
          </>
        )}

        {/* Waiting / calling overlay */}
        {callState !== 'connected' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#EBF1FF] via-[#F6F5FC] to-[#F1EEFE] dark:from-[#0d0f26] dark:via-[#110e20] dark:to-[#090714]">
            {/* Background elements */}
            <div className="absolute top-10 left-10 w-24 h-24 grid grid-cols-5 gap-2 opacity-25 dark:opacity-10 pointer-events-none">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              ))}
            </div>
            <div className="absolute bottom-10 right-10 w-24 h-24 grid grid-cols-5 gap-2 opacity-25 dark:opacity-10 pointer-events-none">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              ))}
            </div>
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-indigo-200/40 dark:border-indigo-500/10 pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#93c5fd]/20 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/4 left-1/4 text-indigo-400 opacity-40 dark:opacity-20 pointer-events-none text-xl">✦</div>
            <div className="absolute bottom-1/4 right-1/4 text-indigo-400 opacity-40 dark:opacity-20 pointer-events-none text-xl">✦</div>

            <div className="relative z-10 flex flex-col items-center text-center px-6">
              <div className="relative flex items-center justify-center mb-8">
                {isCalling && (
                  <>
                    <span
                      className="absolute w-44 h-44 rounded-full bg-indigo-500/10 dark:bg-indigo-400/5 animate-ping"
                      style={{ animationDuration: '2.5s' }}
                    />
                    <span
                      className="absolute w-36 h-36 rounded-full bg-indigo-500/15 dark:bg-indigo-400/10 animate-ping"
                      style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}
                    />
                  </>
                )}
                {callInfo.peerAvatar ? (
                  <img
                    src={callInfo.peerAvatar}
                    alt={callInfo.peerName}
                    className="relative w-28 h-28 rounded-full object-cover border-4 border-white dark:border-white/10 shadow-xl shadow-indigo-100 dark:shadow-none z-10"
                  />
                ) : (
                  <div className="relative w-28 h-28 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-5xl font-bold border-4 border-white dark:border-white/10 shadow-xl z-10">
                    {callInfo.peerName?.charAt(0) || '?'}
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight mb-2">{callInfo.peerName}</h2>
              <p className="text-slate-400 dark:text-gray-400 text-sm font-medium mb-6">
                {callState === 'requesting' ? 'Đang gọi...' : 'Đang kết nối...'}
              </p>
              {isCalling && (
                <div className="flex gap-2 justify-center mb-12">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-2.5 h-2.5 bg-indigo-500/60 dark:bg-indigo-400/60 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 bg-white/70 dark:bg-[#1E2337]/50 backdrop-blur-md px-5 py-3 rounded-2xl border border-[#E0E7FF]/60 dark:border-white/5 shadow-xs max-w-sm">
                <svg className="w-5 h-5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Cuộc gọi được mã hóa đầu cuối</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Thông tin của bạn luôn được bảo mật.</p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Top bar (name + timer) when connected */}
        {callState === 'connected' && (
          <div className={`absolute top-0 inset-x-0 flex flex-col items-center pt-6 transition-opacity duration-500 z-20 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-white font-semibold text-lg drop-shadow">{callInfo.peerName}</p>
            <p className="text-green-400 text-sm font-mono mt-0.5 drop-shadow">{formatTime(elapsed)}</p>
          </div>
        )}

        {/* Media error */}
        {mediaError && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-amber-500/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg z-30">
            <p className="text-white text-xs font-medium">⚠️ {mediaError}</p>
          </div>
        )}

        {/* Local video PiP */}
        <div
          className={`absolute bottom-8 right-8 w-44 h-28 rounded-2xl overflow-hidden shadow-2xl border-2 border-white dark:border-white/10 bg-slate-100 dark:bg-[#1a1a2e] transition-all duration-500 z-20 ${callState === 'connected' && !showControls ? 'opacity-40' : 'opacity-100 hover:scale-105'}`}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity ${cameraOff ? 'opacity-0' : 'opacity-100'}`}
          />
          {cameraOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-[#1a1a2e] gap-1">
              <VideoOffIcon />
              <span className="text-[10px] font-medium">Camera tắt</span>
            </div>
          )}
          {/* Tag "You" inside PiP */}
          <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-xs text-white text-[9px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
            Bạn
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center gap-8 bg-white/75 dark:bg-[#1C1F37]/85 backdrop-blur-xl border border-white/50 dark:border-white/10 px-10 py-5 rounded-[32px] shadow-xl shadow-indigo-100/40 dark:shadow-none transition-all duration-500 z-20 ${callState === 'connected' && !showControls ? 'opacity-0 pointer-events-none translate-y-5' : 'opacity-100 translate-y-0'}`}
      >
        {/* Mic */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={handleToggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md ${
              muted
                ? 'bg-red-500 text-white shadow-red-500/30'
                : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20'
            }`}
            title={muted ? 'Bật mic' : 'Tắt mic'}
          >
            {muted ? <MicOffIcon /> : <MicIcon />}
          </button>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{muted ? 'Bật mic' : 'Tắt mic'}</span>
        </div>

        {/* End call */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={onEnd}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-red-500/40 transition-all cursor-pointer"
            title="Kết thúc"
          >
            <PhoneOffIcon />
          </button>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Kết thúc</span>
        </div>

        {/* Camera */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={handleToggleCamera}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md ${
              cameraOff
                ? 'bg-red-500 text-white shadow-red-500/30'
                : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20'
            }`}
            title={cameraOff ? 'Bật camera' : 'Tắt camera'}
          >
            {cameraOff ? <VideoOffIcon /> : <VideoIcon />}
          </button>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{cameraOff ? 'Bật cam' : 'Tắt cam'}</span>
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
  const [callState, setCallState] = useState<CallState>(webrtcService.getCallState());
  const [callInfo, setCallInfo] = useState<CallInfo | null>(webrtcService.getCallInfo());
  const [resolvedPeerName, setResolvedPeerName] = useState<string>('');
  const [resolvedPeerAvatar, setResolvedPeerAvatar] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    if (!callInfo) {
      setResolvedPeerName('');
      setResolvedPeerAvatar(undefined);
      return () => {
        cancelled = true;
      };
    }

    const initialName = callInfo.peerName?.trim() || '';
    const initialAvatar = callInfo.peerAvatar?.trim() || undefined;

    setResolvedPeerName(initialName);
    setResolvedPeerAvatar(initialAvatar);

    const fallbackPeerId = callInfo.peerId?.trim();
    if (!fallbackPeerId || (initialName && initialAvatar)) {
      return () => {
        cancelled = true;
      };
    }

    userService.getUserById(fallbackPeerId)
      .then((user: any) => {
        if (cancelled || !user) return;

        const fetchedName = (user.display_name || user.displayName || '').trim();
        const fetchedAvatar = user.avatar_url || user.avatarUrl || undefined;

        setResolvedPeerName((prev) => prev || fetchedName || fallbackPeerId);
        setResolvedPeerAvatar((prev) => prev || fetchedAvatar);
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedPeerName((prev) => prev || fallbackPeerId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [callInfo?.peerId, callInfo?.peerName, callInfo?.peerAvatar]);

  useEffect(() => {
    console.log('[VideoCallOverlay] Mounted / resync state', {
      currentUserId,
      callState: webrtcService.getCallState(),
      callInfo: webrtcService.getCallInfo(),
    });
    const unsub = webrtcService.onStateChange((state) => {
      console.log('[VideoCallOverlay] onStateChange', {
        state,
        callInfo: webrtcService.getCallInfo()
      });
      setCallState(state);
      setCallInfo(webrtcService.getCallInfo());
    });
    setCallState(webrtcService.getCallState());
    setCallInfo(webrtcService.getCallInfo());
    return unsub;
  }, []);

  const handleAccept = useCallback(() => {
    webrtcService.acceptCall();
  }, []);

  const handleReject = useCallback(() => {
    webrtcService.rejectCall();
  }, []);

  const handleEnd = useCallback(() => {
    webrtcService.endCall();
  }, []);

  if (callState === 'incoming' && callInfo) {
    return (
      <IncomingCallModal
        callInfo={{
          ...callInfo,
          peerName: resolvedPeerName || callInfo.peerName,
          peerAvatar: resolvedPeerAvatar || callInfo.peerAvatar,
        }}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    );
  }

  if ((callState === 'requesting' || callState === 'connecting' || callState === 'connected') && callInfo) {
    return (
      <VideoCallScreen
        currentUserId={currentUserId}
        callInfo={{
          ...callInfo,
          peerName: resolvedPeerName || callInfo.peerName,
          peerAvatar: resolvedPeerAvatar || callInfo.peerAvatar,
        }}
        callState={callState}
        onEnd={handleEnd}
      />
    );
  }

  return null;
}

