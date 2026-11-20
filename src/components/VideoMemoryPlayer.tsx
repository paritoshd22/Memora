import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Film,
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
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(defaultMuted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userInitiatedPlay, setUserInitiatedPlay] = useState(false);

  // Sync mute state and safely pause/clean up media resources on unmount or src change
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.muted = defaultMuted;
    setIsMuted(defaultMuted);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setUserInitiatedPlay(false);

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

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (videoEl.paused || videoEl.ended) {
      setUserInitiatedPlay(true);
      const p = videoEl.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          setIsPlaying(false);
        });
      }
    } else {
      setUserInitiatedPlay(false);
      videoEl.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleMouseEnter = () => {
    if (!hoverPreview || userInitiatedPlay) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;
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
    videoEl.pause();
  };

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full ${aspectClassName} bg-[#18110B] rounded-lg overflow-hidden group/video select-none`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={isMuted}
        playsInline
        preload="metadata"
        aria-label={`Video memory: ${title}`}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
          onLoadedData?.();
        }}
        onLoadedData={() => onLoadedData?.()}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setUserInitiatedPlay(false);
        }}
        onClick={(e) => {
          if (variant === 'detail') {
            togglePlay(e);
          }
        }}
        className={`w-full h-full ${
          variant === 'detail' ? 'object-contain bg-[#120D09]' : 'object-cover'
        }`}
      />

      {/* Top-Left Archival Film Badge */}
      <div className="pointer-events-none absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-md bg-[#27231F]/90 text-[#E9D4B1] text-[10px] font-semibold flex items-center gap-1.5 border border-[#D6A15D]/50 shadow-xs">
        <Film className="w-3 h-3 text-[#D6A15D]" />
        <span>{variant === 'card' ? 'VIDEO EXHIBIT' : 'MOTION PICTURE ARCHIVE'}</span>
      </div>

      {/* Center Play Overlay Button when Paused */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={`Play video: ${title}`}
          className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-[#27231F]/88 hover:bg-[#27231F] text-[#FFFCF6] border border-[#D6A15D] shadow-lg flex items-center justify-center transition-transform duration-150 hover:scale-105 cursor-pointer z-20"
        >
          <Play className="w-4 h-4 fill-[#D6A15D] text-[#D6A15D] ml-0.5" />
        </button>
      )}

      {/* Bottom Interactive Video Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#18110B]/95 via-[#18110B]/80 to-transparent px-3 pt-4 pb-2.5 flex flex-col gap-1.5 transition-opacity duration-150 ${
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
              title={isPlaying ? 'Pause' : 'Play'}
              className="p-1.5 rounded-md bg-[#27231F]/90 hover:bg-[#493629] text-[#E9D4B1] border border-[#D6A15D]/40 transition-colors cursor-pointer"
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
              title={isMuted ? 'Unmute' : 'Mute'}
              className="p-1.5 rounded-md bg-[#27231F]/90 hover:bg-[#493629] text-[#E9D4B1] border border-[#D6A15D]/40 transition-colors cursor-pointer"
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
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-md bg-[#27231F]/90 hover:bg-[#493629] text-[#E9D4B1] border border-[#D6A15D]/40 transition-colors cursor-pointer"
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
