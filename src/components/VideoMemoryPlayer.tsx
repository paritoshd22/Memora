import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Film,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface VideoMemoryPlayerProps {
  src: string;
  poster?: string;
  title: string;
  variant?: 'card' | 'detail';
  defaultMuted?: boolean;
  hoverPreview?: boolean;
  aspectClassName?: string;
  onLoadedData?: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSec = Math.floor(seconds);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const VideoMemoryPlayer: React.FC<VideoMemoryPlayerProps> = ({
  src,
  poster,
  title,
  variant = 'detail',
  defaultMuted = variant === 'card',
  hoverPreview = variant === 'card',
  aspectClassName = 'aspect-16/10',
  onLoadedData,
  onPlayStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(defaultMuted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userInitiatedPlay, setUserInitiatedPlay] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(Boolean(src));
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync mute state and safely pause/clean up media resources on unmount or src change
  useEffect(() => {
    const videoEl = videoRef.current;
    setIsMuted(defaultMuted);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setUserInitiatedPlay(false);
    setIsVideoLoading(Boolean(src));
    setVideoError(null);
    onPlayStateChange?.(false);

    if (!videoEl) return;
    videoEl.muted = defaultMuted;

    return () => {
      try {
        videoEl.pause();
      } catch {
        // ignore
      }
    };
  }, [src, defaultMuted]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!isMountedRef.current) return;
      const fsElem = document.fullscreenElement;
      setIsFullscreen(
        Boolean(fsElem && containerRef.current && containerRef.current.contains(fsElem)),
      );
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePlay = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl || !src) return;

    if (videoEl.paused || videoEl.ended) {
      setUserInitiatedPlay(true);
      const p = videoEl.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          if (isMountedRef.current) {
            setIsPlaying(false);
            onPlayStateChange?.(false);
          }
        });
      }
    } else {
      setUserInitiatedPlay(false);
      videoEl.pause();
    }
  };

  const toggleMute = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const nextMuted = !videoEl.muted;
    videoEl.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl || !Number.isFinite(duration) || duration <= 0) return;
    const nextTime = Math.max(0, Math.min(duration, Number(e.target.value)));
    videoEl.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const toggleFullscreen = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    const targetEl = containerRef.current || videoRef.current;
    if (!targetEl) return;

    if (!document.fullscreenElement) {
      targetEl.requestFullscreen?.().catch(() => {
        // Fallback if fullscreen is restricted by iframe permissions
      });
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (e.key === ' ' || e.key.toLowerCase() === 'k') {
      e.preventDefault();
      togglePlay(e);
    } else if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleMute(e);
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFullscreen(e);
    } else if (e.key === 'ArrowRight' && duration > 0) {
      e.preventDefault();
      const next = Math.min(duration, videoEl.currentTime + 5);
      videoEl.currentTime = next;
      setCurrentTime(next);
    } else if (e.key === 'ArrowLeft' && duration > 0) {
      e.preventDefault();
      const next = Math.max(0, videoEl.currentTime - 5);
      videoEl.currentTime = next;
      setCurrentTime(next);
    }
  };

  const handleMouseEnter = () => {
    if (!hoverPreview || userInitiatedPlay) return;
    const videoEl = videoRef.current;
    if (!videoEl || !src) return;
    videoEl.muted = true;
    setIsMuted(true);
    const p = videoEl.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (!hoverPreview || userInitiatedPlay) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;
    try {
      videoEl.pause();
    } catch {
      // ignore
    }
  };

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label={`Video player for ${title}`}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full ${aspectClassName} bg-[#18110B] rounded-xl overflow-hidden group/video select-none border border-[#D6A15D]/30 shadow-inner focus-visible:ring-2 focus-visible:ring-[#D6A15D]`}
    >
      {/* Loading Shimmer / Spinner */}
      {isVideoLoading && !videoError && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#18110B]/70 backdrop-blur-xs museum-fade-in"
        >
          <Loader2 className="w-6 h-6 text-[#D6A15D] animate-spin" />
          <span className="text-[11px] font-mono-tabular uppercase tracking-widest text-[#E9D4B1]/90">
            Loading Film Reel…
          </span>
        </div>
      )}

      {/* Video Error Graceful Fallback */}
      {videoError && (
        <div
          role="status"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#18110B]/95 p-4 text-center"
        >
          <AlertCircle className="w-6 h-6 text-[#D6A15D]" />
          <p className="font-serif-display text-sm font-semibold text-[#FFE2B5]">
            {title}
          </p>
          <p className="text-[11px] text-[#E8DED0]/80 max-w-xs">
            {videoError}
          </p>
        </div>
      )}

      {/* Archival Poster Backdrop when no poster image is provided */}
      {!poster && !isPlaying && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#27231F] via-[#1C150F] to-[#120D09] opacity-60"
        />
      )}

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={isMuted}
        playsInline
        preload="metadata"
        aria-label={`Video memory: ${title}`}
        onLoadedMetadata={(e) => {
          if (!isMountedRef.current) return;
          const d = e.currentTarget?.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
          setIsVideoLoading(false);
          onLoadedData?.();
        }}
        onLoadedData={() => {
          if (!isMountedRef.current) return;
          setIsVideoLoading(false);
          onLoadedData?.();
        }}
        onCanPlay={() => {
          if (!isMountedRef.current) return;
          setIsVideoLoading(false);
        }}
        onError={() => {
          if (!isMountedRef.current) return;
          setIsVideoLoading(false);
          setVideoError('Unable to decode video stream in this browser session.');
        }}
        onTimeUpdate={(e) => {
          if (!isMountedRef.current) return;
          setCurrentTime(e.currentTarget?.currentTime || 0);
        }}
        onPlay={() => {
          if (!isMountedRef.current) return;
          setIsPlaying(true);
          onPlayStateChange?.(true);
        }}
        onPause={() => {
          if (!isMountedRef.current) return;
          setIsPlaying(false);
          onPlayStateChange?.(false);
        }}
        onEnded={() => {
          if (!isMountedRef.current) return;
          setIsPlaying(false);
          setUserInitiatedPlay(false);
          onPlayStateChange?.(false);
        }}
        onClick={(e) => {
          if (variant === 'detail') {
            togglePlay(e);
          }
        }}
        className={`w-full h-full transition-opacity duration-300 ${
          isVideoLoading ? 'opacity-70' : 'opacity-100'
        } ${
          variant === 'detail' ? 'object-contain bg-[#120D09]' : 'object-cover'
        }`}
      />

      {/* Top-Left Archival Film Badge */}
      <div className="pointer-events-none absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-md bg-[#27231F]/90 text-[#E9D4B1] text-[10px] font-semibold flex items-center gap-1.5 border border-[#D6A15D]/50 shadow-xs">
        <Film className="w-3 h-3 text-[#D6A15D]" />
        <span>{variant === 'card' ? 'VIDEO EXHIBIT' : 'MOTION PICTURE ARCHIVE'}</span>
      </div>

      {/* Center Play Overlay Button when Paused */}
      {!isPlaying && !videoError && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={`Play video: ${title}`}
          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#27231F]/90 hover:bg-[#3A2B20] active:scale-95 text-[#FFFCF6] border border-[#D6A15D] shadow-xl flex items-center justify-center transition-all duration-150 hover:scale-105 cursor-pointer z-20 focus-visible:ring-2 focus-visible:ring-[#FFE2B5]"
        >
          <Play className="w-4 h-4 fill-[#D6A15D] text-[#D6A15D] ml-0.5" />
        </button>
      )}

      {/* Bottom Interactive Video Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#18110B]/96 via-[#18110B]/82 to-transparent px-3 pt-4 pb-2.5 flex flex-col gap-1.5 transition-opacity duration-200 ${
          variant === 'card'
            ? isPlaying
              ? 'opacity-100'
              : 'opacity-0 group-hover/video:opacity-100 focus-within:opacity-100'
            : 'opacity-100'
        }`}
      >
        {/* Interactive Progress Bar */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 100}
            step={0.1}
            value={duration > 0 ? currentTime : 0}
            onChange={handleSeekChange}
            aria-label={`Seek video progress for ${title}`}
            style={{
              background: `linear-gradient(to right, #D6A15D ${progressPercent}%, rgba(233, 212, 177, 0.28) ${progressPercent}%)`,
            }}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#D6A15D]"
          />
        </div>

        {/* Controls Row: Play/Pause, Mute/Unmute, Timecode, Fullscreen */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-[#FFFCF6]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              className="p-1.5 rounded-lg bg-[#27231F]/90 hover:bg-[#493629] active:scale-95 text-[#E9D4B1] border border-[#D6A15D]/40 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D6A15D]"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 text-[#D6A15D]" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-[#D6A15D] text-[#D6A15D]" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute video audio' : 'Mute video audio'}
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              className="p-1.5 rounded-lg bg-[#27231F]/90 hover:bg-[#493629] active:scale-95 text-[#E9D4B1] border border-[#D6A15D]/40 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D6A15D]"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#C98D87]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#D6A15D]" />
              )}
            </button>

            <span className="font-mono-tabular text-[10px] text-[#E9D4B1] pl-1">
              {formatMediaTime(currentTime)}
              {duration > 0 ? ` / ${formatMediaTime(duration)}` : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen video'}
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            className="p-1.5 rounded-lg bg-[#27231F]/90 hover:bg-[#493629] active:scale-95 text-[#E9D4B1] border border-[#D6A15D]/40 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D6A15D]"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-[#D6A15D]" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-[#D6A15D]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

