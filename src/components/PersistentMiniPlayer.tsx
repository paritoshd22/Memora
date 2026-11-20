import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music,
  Maximize2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  AudioEngineSnapshot,
  museumAudioEngine,
} from '../services/audioEngine';
import { DEFAULT_SPOTIFY_PLAYLIST_CONFIG } from '../data/initialMuseumData';
import { MuseumAudioSettings } from '../types/museum';

interface PersistentMiniPlayerProps {
  isOpen?: boolean;
  onClose?: () => void;
  audioSettings: MuseumAudioSettings;
  onUpdateAudioSettings: (next: MuseumAudioSettings) => void;
  onOpenSoundscapes: () => void;
}

export const PersistentMiniPlayer: React.FC<PersistentMiniPlayerProps> = ({
  isOpen = false,
  onClose,
  audioSettings,
  onUpdateAudioSettings,
  onOpenSoundscapes,
}) => {
  const [snap, setSnap] = useState<AudioEngineSnapshot>(() =>
    museumAudioEngine.getSnapshot(),
  );
  const [showEmbedFrame, setShowEmbedFrame] = useState(true);

  useEffect(() => {
    return museumAudioEngine.subscribe(setSnap);
  }, []);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const allSources = museumAudioEngine.getSources();
  const activeSource = snap.activeSource;
  const isEmbeddedPlaylist = activeSource?.sourceType === 'embedded_playlist';
  const resolvedEmbedUrl =
    activeSource?.embedUrl ||
    activeSource?.spotifyEmbedUrl ||
    DEFAULT_SPOTIFY_PLAYLIST_CONFIG.embedUrl;
  const externalSpotifyUrl =
    activeSource?.externalServiceUrl || DEFAULT_SPOTIFY_PLAYLIST_CONFIG.url;
  const playlistUri = activeSource?.externalPlaylistId
    ? `spotify:playlist:${activeSource.externalPlaylistId}`
    : DEFAULT_SPOTIFY_PLAYLIST_CONFIG.uri;

  // Never mount or autoplay the Spotify embed until the visitor has explicitly clicked Play
  // (or expanded the embed after unlocking playback). Stopping playback unmounts the embed.
  const isActivelyEngaged =
    snap.playbackState === 'playing' || snap.playbackState === 'paused';
  const canRenderEmbed =
    isEmbeddedPlaylist &&
    activeSource?.embedAllowed !== false &&
    Boolean(resolvedEmbedUrl) &&
    !audioSettings.muted &&
    isActivelyEngaged;

  const statusBadgeText = audioSettings.muted
    ? 'Muted'
    : snap.playbackState === 'playing'
      ? `Playing · ${formatElapsed(snap.elapsedSeconds)}`
      : snap.playbackState === 'paused'
        ? 'Paused'
        : 'Stopped (Silent)';

  // Keep the DOM container mounted (hidden via CSS when closed) so an active Spotify iframe
  // never reloads or restarts when the user minimizes the player popover or walks into a room!
  return (
    <div
      aria-label="Museum Music & Spotify Playlist Player"
      aria-hidden={!isOpen}
      className={`fixed top-16 right-4 sm:right-6 z-30 w-80 sm:w-92 bg-[#FFFCF6]/98 border border-[#E8DED0] rounded-2xl shadow-2xl p-3.5 text-[#27231F] transition-all duration-200 ${
        isOpen
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none invisible'
      }`}
    >
      {/* Top Row: Artwork, Playlist Title, Status Badge & Close Button */}
      <div className="flex items-start gap-3">
        <div
          style={{
            backgroundColor: activeSource?.artworkColor || '#493629',
          }}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[#FFFCF6] border border-[#E8DED0] shadow-xs shrink-0 overflow-hidden"
        >
          {activeSource?.artworkUrl ? (
            <img
              src={activeSource.artworkUrl}
              alt={activeSource.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music
              className={`w-5 h-5 text-[#FFE2B5] ${
                snap.isPlaying ? 'animate-pulse' : ''
              }`}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#746B60] truncate">
              {activeSource?.provider === 'spotify'
                ? 'Spotify Background Music'
                : snap.activeContextLabel}
            </span>
            <span
              className={`text-[10px] font-mono-tabular px-1.5 py-0.5 rounded-md font-semibold shrink-0 border ${
                audioSettings.muted
                  ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                  : snap.playbackState === 'playing'
                    ? 'bg-[#F6F1E8] text-[#493629] border-[#C9A66B]'
                    : 'bg-[#F6F1E8] text-[#746B60] border-[#E8DED0]'
              }`}
            >
              {statusBadgeText}
            </span>
          </div>

          <p className="font-serif-display text-base font-semibold leading-snug truncate text-[#27231F] mt-0.5">
            {activeSource?.title || DEFAULT_SPOTIFY_PLAYLIST_CONFIG.title}
          </p>
          <p className="text-[11px] text-[#746B60] truncate font-mono-tabular">
            {activeSource?.provider === 'spotify'
              ? playlistUri
              : activeSource?.subtitle || 'Optional Museum Soundtrack'}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Minimize music player"
            title="Minimize player (music continues)"
            className="p-1 rounded-lg text-[#746B60] hover:text-[#27231F] hover:bg-[#F6F1E8] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Source Selector Dropdown (Switch between Default Spotify Playlist & Museum Soundscapes) */}
      <div className="mt-3 pt-2.5 border-t border-[#E8DED0] flex items-center justify-between gap-2">
        <label
          htmlFor="hud-music-source-select"
          className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#746B60] shrink-0"
        >
          Source
        </label>
        <select
          id="hud-music-source-select"
          aria-label="Select background music source"
          value={
            activeSource?.id ||
            audioSettings.globalSourceId ||
            DEFAULT_SPOTIFY_PLAYLIST_CONFIG.id
          }
          onChange={(e) => {
            const nextId = e.target.value;
            const chosen = allSources.find((s) => s.id === nextId);
            onUpdateAudioSettings({
              ...audioSettings,
              globalEnabled: true,
              globalSourceType:
                chosen?.provider === 'spotify'
                  ? 'spotify'
                  : chosen?.provider === 'youtube'
                    ? 'youtube'
                    : 'builtin',
              globalSourceId: nextId,
            });
          }}
          className="flex-1 min-w-0 bg-[#F6F1E8] border border-[#E8DED0] rounded-lg px-2 py-1 text-xs font-medium text-[#27231F] focus:outline-none focus:border-[#C9A66B] cursor-pointer truncate"
        >
          {allSources.map((src) => (
            <option key={src.id} value={src.id}>
              {src.provider === 'spotify'
                ? `Spotify · ${src.title}`
                : src.provider === 'youtube'
                  ? `YouTube · ${src.title}`
                  : `Soundscape · ${src.title}`}
            </option>
          ))}
        </select>
      </div>

      {/* Primary Transport Controls: Play/Pause, Stop, Track Cycle & Volume */}
      <div className="mt-2.5 pt-2.5 border-t border-[#E8DED0] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous soundtrack"
            title="Previous soundtrack"
            onClick={() => {
              const prevId = museumAudioEngine.cycleTrack(-1);
              if (prevId) {
                onUpdateAudioSettings({
                  ...audioSettings,
                  globalEnabled: true,
                  globalSourceId: prevId,
                });
              }
            }}
            className="p-1.5 rounded-lg hover:bg-[#F6F1E8] text-[#493629] border border-transparent hover:border-[#E8DED0] transition-colors cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause Button */}
          <button
            type="button"
            aria-label={snap.isPlaying ? 'Pause music' : 'Play music'}
            title={snap.isPlaying ? 'Pause music' : 'Start music playback'}
            onClick={() => {
              if (audioSettings.muted) {
                onUpdateAudioSettings({
                  ...audioSettings,
                  muted: false,
                  globalEnabled: true,
                });
              } else if (!audioSettings.globalEnabled) {
                onUpdateAudioSettings({
                  ...audioSettings,
                  globalEnabled: true,
                });
              }
              setShowEmbedFrame(true);
              museumAudioEngine.togglePlay();
            }}
            className="px-3 py-1.5 rounded-xl bg-[#493629] hover:bg-[#27231F] text-[#FFE2B5] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            {snap.isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Stop Button */}
          <button
            type="button"
            aria-label="Stop music"
            title="Stop music playback"
            disabled={snap.playbackState === 'stopped'}
            onClick={() => {
              museumAudioEngine.stop();
            }}
            className="p-1.5 rounded-lg bg-[#F6F1E8] hover:bg-[#E8DED0] text-[#493629] border border-[#E8DED0] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            type="button"
            aria-label="Next soundtrack"
            title="Next soundtrack"
            onClick={() => {
              const nextId = museumAudioEngine.cycleTrack(1);
              if (nextId) {
                onUpdateAudioSettings({
                  ...audioSettings,
                  globalEnabled: true,
                  globalSourceId: nextId,
                });
              }
            }}
            className="p-1.5 rounded-lg hover:bg-[#F6F1E8] text-[#493629] border border-transparent hover:border-[#E8DED0] transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Volume & Mute Controls */}
        <div className="flex items-center gap-1.5 flex-1 justify-end max-w-[125px]">
          <button
            type="button"
            aria-label={
              audioSettings.muted ? 'Unmute museum audio' : 'Mute museum audio'
            }
            title={audioSettings.muted ? 'Unmute' : 'Mute'}
            onClick={() =>
              onUpdateAudioSettings({
                ...audioSettings,
                muted: !audioSettings.muted,
              })
            }
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
              audioSettings.muted
                ? 'bg-[#FEE2E2] text-[#991B1B]'
                : 'hover:bg-[#F6F1E8] text-[#493629]'
            }`}
          >
            {audioSettings.muted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            aria-label="Master Volume"
            value={audioSettings.muted ? 0 : audioSettings.masterVolume}
            onChange={(e) =>
              onUpdateAudioSettings({
                ...audioSettings,
                muted: false,
                masterVolume: parseFloat(e.target.value),
              })
            }
            className="w-full accent-[#C9A66B] h-1.5 cursor-pointer"
          />
        </div>
      </div>

      {/* Embedded Spotify / YouTube Player Drawer (Mounted only after Play is clicked; unmounted when Stopped) */}
      {isEmbeddedPlaylist && activeSource && !audioSettings.muted && (
        <div className="mt-2.5 pt-2.5 border-t border-[#E8DED0]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#746B60] font-semibold">
              {canRenderEmbed
                ? 'Official Spotify Player Active'
                : 'Click Play above to load Spotify player'}
            </span>
            {canRenderEmbed && (
              <button
                type="button"
                onClick={() => setShowEmbedFrame(!showEmbedFrame)}
                className="text-[10px] text-[#493629] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                {showEmbedFrame ? (
                  <>
                    Hide Embed <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Show Embed <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>

          {canRenderEmbed && showEmbedFrame && resolvedEmbedUrl && (
            <div className="rounded-xl overflow-hidden border border-[#E8DED0] bg-[#191414]">
              <iframe
                key={resolvedEmbedUrl}
                title={`${activeSource.provider} Playlist - ${activeSource.title}`}
                src={resolvedEmbedUrl}
                width="100%"
                height={activeSource.provider === 'youtube' ? '152' : '80'}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="border-0 block"
              />
            </div>
          )}
        </div>
      )}

      {snap.errorMessage && (
        <div className="mt-2 p-2 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[11px] text-[#991B1B] flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{snap.errorMessage}</span>
        </div>
      )}

      {/* Footer Actions: Open Playlist in Spotify & Open Full Music Studio */}
      <div className="mt-2.5 pt-2 border-t border-[#E8DED0] flex items-center justify-between gap-2">
        <a
          href={externalSpotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#493629] hover:text-[#27231F] hover:underline"
        >
          <span>
            Open in{' '}
            {activeSource?.provider === 'youtube' ? 'YouTube' : 'Spotify'}
          </span>
          <ExternalLink className="w-3 h-3 text-[#C9A66B]" />
        </a>

        <button
          type="button"
          onClick={() => {
            onClose?.();
            onOpenSoundscapes();
          }}
          title="Open Music & Playlists Studio"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F6F1E8] hover:bg-[#E8DED0] border border-[#E8DED0] text-[#493629] transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3 h-3 text-[#C9A66B]" />
          <span>Manage Playlists</span>
        </button>
      </div>
    </div>
  );
};
