import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Sliders,
  Search,
  Plus,
  Trash2,
  Link as LinkIcon,
  BookOpen,
  ListMusic,
  LogOut,
  LogIn,
  Copy,
  Check,
} from 'lucide-react';
import {
  MuseumAudioSettings,
  MusicProviderStatus,
  MusicSource,
  Room,
  RoomAudioPolicy,
} from '../types/museum';
import {
  AudioEngineSnapshot,
  museumAudioEngine,
} from '../services/audioEngine';

interface MusicSoundscapesViewProps {
  rooms: Room[];
  audioSettings: MuseumAudioSettings;
  customSources: MusicSource[];
  onUpdateAudioSettings: (next: MuseumAudioSettings) => void;
  onUpdateRoomAudio: (
    roomId: string,
    audioSettings: NonNullable<Room['audioSettings']>,
  ) => void;
  onAddCustomMusicSource: (source: MusicSource) => void;
  onRemoveCustomMusicSource?: (sourceId: string) => void;
  onCloseView: () => void;
}

type PlaylistStudioTab =
  | 'spotify_playlists'
  | 'youtube_playlists'
  | 'my_playlists'
  | 'setup_docs';

export const MusicSoundscapesView: React.FC<MusicSoundscapesViewProps> = ({
  rooms,
  audioSettings,
  customSources,
  onUpdateAudioSettings,
  onUpdateRoomAudio,
  onAddCustomMusicSource,
  onRemoveCustomMusicSource,
  onCloseView,
}) => {
  const [activeTab, setActiveTab] =
    useState<PlaylistStudioTab>('spotify_playlists');
  const [snap, setSnap] = useState<AudioEngineSnapshot>(() =>
    museumAudioEngine.getSnapshot(),
  );
  const [providers, setProviders] = useState<MusicProviderStatus[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providerFeedback, setProviderFeedback] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});

  // Spotify Playlists Tab State
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<MusicSource[]>([]);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyUrlInput, setSpotifyUrlInput] = useState('');
  const [spotifyCustomTitle, setSpotifyCustomTitle] = useState('');

  // YouTube Playlists Tab State
  const [youtubeQuery, setYoutubeQuery] = useState('');
  const [youtubePlaylists, setYoutubePlaylists] = useState<MusicSource[]>([]);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [youtubeCustomTitle, setYoutubeCustomTitle] = useState('');

  // Selected Playlist for Inspector / Preview Drawer
  const [inspectedPlaylist, setInspectedPlaylist] =
    useState<MusicSource | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Room assignment target & status banner
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    () => rooms.find((r) => r.status === 'active')?.id || 'childhood',
  );
  const [statusBanner, setStatusBanner] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);

  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  const allSources = museumAudioEngine.getSources();
  const activeRooms = rooms.filter((r) => r.status === 'active');

  const savedPlaylists = customSources.filter(
    (s) => s.provider === 'spotify' || s.provider === 'youtube',
  );

  useEffect(() => {
    return museumAudioEngine.subscribe(setSnap);
  }, []);

  const fetchMusicProviders = async () => {
    setLoadingProviders(true);
    try {
      const res = await fetch('/api/music/providers');
      const data = await res.json();
      if (Array.isArray(data.providers)) {
        setProviders(data.providers);
      }
    } catch {
      // ignore network error
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    fetchMusicProviders();
    const onMessage = (event: MessageEvent) => {
      if (event.origin && event.origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const prov = event.data.provider as 'spotify' | 'youtube';
        fetchMusicProviders();
        setProviderFeedback((prev) => ({
          ...prev,
          [prov]: {
            ok: true,
            message:
              event.data.message ||
              `${prov === 'spotify' ? 'Spotify' : 'YouTube'} account connected!`,
          },
        }));
        if (prov === 'spotify') {
          handleFetchSpotifyPlaylists('');
        } else if (prov === 'youtube') {
          handleFetchYouTubePlaylists('');
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        const prov = event.data.provider as 'spotify' | 'youtube';
        fetchMusicProviders();
        setProviderFeedback((prev) => ({
          ...prev,
          [prov]: {
            ok: false,
            message:
              event.data.message ||
              `Failed to authorize ${prov === 'spotify' ? 'Spotify' : 'YouTube'}.`,
          },
        }));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Fetch Spotify Playlists from backend when configured
  const handleFetchSpotifyPlaylists = async (queryOverride?: string) => {
    const q = queryOverride !== undefined ? queryOverride : spotifyQuery;
    setSpotifyLoading(true);
    setSpotifyError(null);
    try {
      const res = await fetch(
        `/api/music/playlists/spotify?q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (!data.ok) {
        setSpotifyError(
          data.message || 'Unable to load Spotify playlists from API.',
        );
        setSpotifyPlaylists([]);
      } else {
        setSpotifyPlaylists(data.playlists || []);
        if (data.playlists?.length === 0) {
          setSpotifyError(
            q
              ? `No Spotify playlists matched "${q}".`
              : 'No playlists found in this Spotify account.',
          );
        }
      }
    } catch (err) {
      setSpotifyError(
        err instanceof Error
          ? err.message
          : 'Network error contacting Spotify playlist endpoint.',
      );
    } finally {
      setSpotifyLoading(false);
    }
  };

  // Fetch YouTube Playlists from backend when configured
  const handleFetchYouTubePlaylists = async (queryOverride?: string) => {
    const q = queryOverride !== undefined ? queryOverride : youtubeQuery;
    setYoutubeLoading(true);
    setYoutubeError(null);
    try {
      const res = await fetch(
        `/api/music/playlists/youtube?q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (!data.ok) {
        setYoutubeError(
          data.message || 'Unable to load YouTube playlists from API.',
        );
        setYoutubePlaylists([]);
      } else {
        setYoutubePlaylists(data.playlists || []);
        if (data.playlists?.length === 0) {
          setYoutubeError(
            q
              ? `No YouTube playlists matched "${q}".`
              : 'No playlists found in this YouTube account.',
          );
        }
      }
    } catch (err) {
      setYoutubeError(
        err instanceof Error
          ? err.message
          : 'Network error contacting YouTube playlist endpoint.',
      );
    } finally {
      setYoutubeLoading(false);
    }
  };

  // Inspect single playlist & retrieve its tracks / video items
  const handleInspectPlaylist = async (playlist: MusicSource) => {
    setInspectedPlaylist(playlist);
    setDetailsError(null);

    if (
      (playlist.provider === 'spotify' || playlist.provider === 'youtube') &&
      playlist.externalPlaylistId
    ) {
      setLoadingDetails(true);
      try {
        const res = await fetch(
          `/api/music/playlists/${playlist.provider}/${encodeURIComponent(
            playlist.externalPlaylistId,
          )}`,
        );
        const data = await res.json();
        if (data.ok && data.playlist) {
          setInspectedPlaylist(data.playlist);
        } else if (!data.ok && data.code === 'PLAYLIST_UNAVAILABLE') {
          setDetailsError(data.message);
        }
      } catch {
        // Keep initial playlist summary if item hydration fails
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  // Connect OAuth for Spotify or YouTube
  const handleConnectProvider = async (providerId: 'spotify' | 'youtube') => {
    setProviderFeedback((prev) => {
      const next = { ...prev };
      delete next[providerId];
      return next;
    });

    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await fetch(
        `/api/music/auth-url/${providerId}?redirectUri=${encodeURIComponent(
          redirectUri,
        )}`,
      );
      const data = await res.json();
      if (!res.ok || !data.url) {
        setProviderFeedback((prev) => ({
          ...prev,
          [providerId]: {
            ok: false,
            message:
              data.message ||
              `${providerId === 'spotify' ? 'Spotify' : 'YouTube'} server credentials are required before connecting. See Setup Guide.`,
          },
        }));
        if (Array.isArray(data.providers)) {
          setProviders(data.providers);
        }
        return;
      }
      window.open(data.url, `${providerId}_oauth_popup`, 'width=620,height=720');
    } catch (err) {
      setProviderFeedback((prev) => ({
        ...prev,
        [providerId]: {
          ok: false,
          message:
            err instanceof Error
              ? err.message
              : 'Failed to initiate OAuth connection.',
        },
      }));
    }
  };

  // Disconnect Spotify or YouTube and clear server authorization state
  const handleDisconnectProvider = async (
    providerId: 'spotify' | 'youtube',
  ) => {
    try {
      const res = await fetch(`/api/music/providers/${providerId}/disconnect`, {
        method: 'POST',
      });
      const data = await res.json();
      if (Array.isArray(data.providers)) {
        setProviders(data.providers);
      }
      if (providerId === 'spotify') {
        setSpotifyPlaylists([]);
      } else {
        setYoutubePlaylists([]);
      }
      setProviderFeedback((prev) => ({
        ...prev,
        [providerId]: {
          ok: true,
          message:
            data.message ||
            `${providerId === 'spotify' ? 'Spotify' : 'YouTube'} disconnected.`,
        },
      }));
    } catch {
      // ignore
    }
  };

  // Resolve and verify an official Spotify or YouTube playlist URL
  const handleResolvePlaylistUrl = async (
    e: React.FormEvent,
    expectedProvider: 'spotify' | 'youtube',
  ) => {
    e.preventDefault();
    const rawUrl =
      expectedProvider === 'spotify' ? spotifyUrlInput : youtubeUrlInput;
    const customTitle =
      expectedProvider === 'spotify' ? spotifyCustomTitle : youtubeCustomTitle;

    if (!rawUrl.trim()) return;

    try {
      const res = await fetch('/api/music/playlists/resolve-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl.trim(), customTitle }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.playlist) {
        setStatusBanner({
          ok: false,
          text:
            data.message ||
            'Could not verify playlist URL. Ensure the playlist is public and valid.',
        });
        return;
      }

      const resolved: MusicSource = data.playlist;
      museumAudioEngine.registerCustomSource(resolved);
      onAddCustomMusicSource(resolved);
      setInspectedPlaylist(resolved);

      if (resolved.provider === 'spotify') {
        setSpotifyPlaylists((prev) => [
          resolved,
          ...prev.filter((p) => p.id !== resolved.id),
        ]);
        setSpotifyUrlInput('');
        setSpotifyCustomTitle('');
      } else if (resolved.provider === 'youtube') {
        setYoutubePlaylists((prev) => [
          resolved,
          ...prev.filter((p) => p.id !== resolved.id),
        ]);
        setYoutubeUrlInput('');
        setYoutubeCustomTitle('');
      }

      setStatusBanner({
        ok: true,
        text: `Saved "${resolved.title}" (${resolved.provider.toUpperCase()}) to My Playlists!`,
      });
    } catch (err) {
      setStatusBanner({
        ok: false,
        text:
          err instanceof Error
            ? err.message
            : 'Network error verifying playlist URL.',
      });
    }
  };

  // Save playlist to MEMORA ("My Playlists")
  const handleSavePlaylist = (playlist: MusicSource) => {
    museumAudioEngine.registerCustomSource(playlist);
    onAddCustomMusicSource(playlist);
    setStatusBanner({
      ok: true,
      text: `Saved "${playlist.title}" to My Playlists.`,
    });
  };

  // Assign playlist as Global Museum Soundtrack
  const handleAssignGlobalPlaylist = (playlist: MusicSource) => {
    museumAudioEngine.registerCustomSource(playlist);
    onAddCustomMusicSource(playlist);
    onUpdateAudioSettings({
      ...audioSettings,
      muted: false,
      globalEnabled: true,
      globalSourceType:
        playlist.provider === 'local' ? 'local_file' : 'builtin',
      globalSourceId: playlist.id,
    });
    if (playlist.sourceType !== 'embedded_playlist') {
      museumAudioEngine.play();
    }
    setInspectedPlaylist(playlist);
    setStatusBanner({
      ok: true,
      text: `Assigned "${playlist.title}" as your Global Museum Soundtrack.`,
    });
  };

  // Assign playlist to a specific Museum Room
  const handleAssignPlaylistToRoom = (
    playlist: MusicSource,
    roomId: string,
  ) => {
    museumAudioEngine.registerCustomSource(playlist);
    onAddCustomMusicSource(playlist);
    const targetRoom = rooms.find((r) => r.id === roomId);
    onUpdateRoomAudio(roomId, {
      roomId,
      policy: 'custom',
      sourceType: playlist.provider === 'local' ? 'local_file' : 'builtin',
      sourceId: playlist.id,
      enabled: true,
      volume: 0.8,
      autoplayOnEntry: true,
      transitionPolicy: 'crossfade',
    });
    setInspectedPlaylist(playlist);
    setStatusBanner({
      ok: true,
      text: `Assigned "${playlist.title}" to ${targetRoom?.name || 'Room'} (overrides global soundtrack while inside that room).`,
    });
  };

  // Remove a saved playlist from My Playlists and clear any references
  const handleRemovePlaylist = (sourceId: string) => {
    museumAudioEngine.removeCustomSource(sourceId);
    if (onRemoveCustomMusicSource) {
      onRemoveCustomMusicSource(sourceId);
    }
    if (audioSettings.globalSourceId === sourceId) {
      onUpdateAudioSettings({
        ...audioSettings,
        globalSourceId: 'builtin-calm-museum',
      });
    }
    rooms.forEach((r) => {
      if (r.audioSettings?.sourceId === sourceId) {
        onUpdateRoomAudio(r.id, {
          ...r.audioSettings,
          policy: 'use_global',
          sourceId: 'builtin-warm-piano',
        });
      }
    });
    if (inspectedPlaylist?.id === sourceId) {
      setInspectedPlaylist(null);
    }
    setStatusBanner({
      ok: true,
      text: 'Removed playlist and reverted any assigned rooms to the global soundtrack.',
    });
  };

  // Upload local audio file
  const handleUploadLocalAudio = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const newSource: MusicSource = {
        id: `local-audio-${Date.now()}`,
        provider: 'local',
        title: file.name.replace(/\.[^/.]+$/, ''),
        subtitle: `Local Audio File (${file.type || 'audio'})`,
        artworkColor: '#5F7A61',
        sourceType: 'local_audio',
        localDataUrl: dataUrl,
        durationLabel: 'Local File',
        availabilityStatus: 'available',
      };
      museumAudioEngine.registerCustomSource(newSource);
      onAddCustomMusicSource(newSource);
      onUpdateAudioSettings({
        ...audioSettings,
        muted: false,
        globalSourceType: 'local_file',
        globalSourceId: newSource.id,
      });
      museumAudioEngine.play();
    };
    reader.readAsDataURL(file);
  };

  const spotifyProvider = providers.find((p) => p.id === 'spotify');
  const youtubeProvider = providers.find((p) => p.id === 'youtube');
  const callbackUrl =
    spotifyProvider?.callbackUrl ||
    `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`;

  const renderPlaylistCard = (playlist: MusicSource) => {
    const isGlobal =
      audioSettings.globalEnabled &&
      audioSettings.globalSourceId === playlist.id;
    const isSaved = customSources.some((s) => s.id === playlist.id);
    const isUnavailable =
      playlist.availabilityStatus === 'unavailable' ||
      playlist.embedAllowed === false;

    return (
      <div
        key={playlist.id}
        className={`bg-[#FFFCF6] border rounded-2xl overflow-hidden shadow-xs transition-all flex flex-col justify-between ${
          inspectedPlaylist?.id === playlist.id
            ? 'border-[#854D27] ring-2 ring-[#D6A15D]/40'
            : 'border-[#E8DED0] hover:border-[#854D27]'
        }`}
      >
        <div>
          {/* Cover Artwork & Provider Badge */}
          <div
            onClick={() => handleInspectPlaylist(playlist)}
            className="relative aspect-16/9 bg-[#27231F] overflow-hidden cursor-pointer group"
          >
            {playlist.artworkUrl ? (
              <img
                src={playlist.artworkUrl}
                alt={playlist.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div
                style={{ backgroundColor: playlist.artworkColor || '#493629' }}
                className="w-full h-full flex items-center justify-center text-[#FFFCF6]"
              >
                <ListMusic className="w-10 h-10 opacity-80" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular uppercase font-semibold ${
                    playlist.provider === 'spotify'
                      ? 'bg-[#1DB954] text-[#121212]'
                      : playlist.provider === 'youtube'
                        ? 'bg-[#DC2626] text-white'
                        : 'bg-[#493629] text-[#FFFCF6]'
                  }`}
                >
                  {playlist.provider}
                </span>

                {playlist.trackCount !== undefined &&
                  playlist.trackCount !== null && (
                    <span className="px-2 py-0.5 rounded bg-black/65 text-[#FFFCF6] font-mono-tabular text-[10px]">
                      {playlist.trackCount}{' '}
                      {playlist.provider === 'youtube' ? 'videos' : 'tracks'}
                    </span>
                  )}
              </div>

              <div>
                <h3 className="font-serif-display text-lg font-semibold text-[#FFFCF6] leading-snug line-clamp-1">
                  {playlist.title}
                </h3>
                <p className="text-[11px] text-[#E9D4B1] truncate">
                  {playlist.ownerName || playlist.subtitle}
                </p>
              </div>
            </div>
          </div>

          {isUnavailable && (
            <div className="px-3.5 py-2 bg-[#FEF2F2] border-b border-[#FECACA] text-[11px] text-[#991B1B] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {playlist.unavailableReason || 'Embedding restricted'}
              </span>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-3.5 space-y-2 bg-[#FFFCF6]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleInspectPlaylist(playlist)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#F6F1E8] border border-[#E8DED0] text-[#27231F] hover:bg-[#E9D4B1]/50 cursor-pointer"
            >
              Preview
            </button>

            {!isSaved && (
              <button
                type="button"
                onClick={() => handleSavePlaylist(playlist)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#F6F1E8] border border-[#E8DED0] text-[#493629] hover:bg-[#E9D4B1]/50 cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Save
              </button>
            )}

            <button
              type="button"
              onClick={() => handleAssignGlobalPlaylist(playlist)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                isGlobal
                  ? 'bg-[#27231F] text-[#FFFCF6]'
                  : 'bg-[#D6A15D]/25 text-[#493629] hover:bg-[#D6A15D] hover:text-[#27231F]'
              }`}
            >
              {isGlobal ? '✓ Global Active' : 'Set Global'}
            </button>

            <button
              type="button"
              onClick={() =>
                handleAssignPlaylistToRoom(playlist, selectedRoomId)
              }
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#F6F1E8] border border-[#E8DED0] text-[#493629] hover:border-[#854D27] cursor-pointer"
            >
              Assign Room
            </button>
          </div>

          {playlist.externalServiceUrl && (
            <div className="pt-2 border-t border-[#E8DED0] flex items-center justify-between text-[11px]">
              <a
                href={playlist.externalServiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#854D27] hover:underline inline-flex items-center gap-1 font-medium"
              >
                Open in{' '}
                {playlist.provider === 'spotify' ? 'Spotify' : 'YouTube'}
                <ExternalLink className="w-3 h-3" />
              </a>

              {isSaved && (
                <button
                  type="button"
                  onClick={() => handleRemovePlaylist(playlist.id)}
                  className="text-[#991B1B] hover:underline inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-20 pt-20 pb-8 px-4 md:px-8 overflow-y-auto bg-[#1E140D]/55">
      <div className="max-w-7xl mx-auto bg-[#FFFCF6] border border-[#E8DED0] rounded-2xl shadow-2xl overflow-hidden">
        {/* ===================================================================
            1. HEADER & TWO PROVIDER CARDS (SPOTIFY & YOUTUBE)
           =================================================================== */}
        <div className="p-6 md:p-8 bg-[#F6F1E8] border-b border-[#E8DED0] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={onCloseView}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#854D27] hover:underline mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to 3D Museum Exploration
              </button>
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#493629] text-[#FDE68A] flex items-center justify-center">
                  <Music className="w-4 h-4" />
                </span>
                <h1 className="font-serif-display text-3xl md:text-4xl font-semibold text-[#27231F]">
                  Music & Playlists — Spotify & YouTube
                </h1>
              </div>
              <p className="text-sm text-[#493629] mt-1 max-w-3xl">
                Connect Spotify or YouTube, browse or import playlists, and
                assign playlists as your global museum soundtrack or to
                individual museum rooms.
              </p>
            </div>

            {/* Global Mute Toggle & Target Room Selector */}
            <div className="flex flex-wrap items-center gap-2.5 bg-[#FFFCF6] border border-[#E8DED0] rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#493629]">
                  Assign Target Room:
                </span>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  aria-label="Target room for playlist assignment"
                  className="px-2.5 py-1.5 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-xs font-medium text-[#27231F]"
                >
                  {activeRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.wing})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateAudioSettings({
                    ...audioSettings,
                    muted: !audioSettings.muted,
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                  audioSettings.muted
                    ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]'
                    : 'bg-[#F6F1E8] text-[#493629] border-[#E8DED0]'
                }`}
              >
                {audioSettings.muted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    Global Mute Active
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    Mute Museum Audio
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Two Provider Cards: Spotify and YouTube */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[spotifyProvider, youtubeProvider].filter(Boolean).map((prov) => {
              if (!prov) return null;
              const fb = providerFeedback[prov.id];
              const isConnected = prov.connectionState === 'connected';
              const isSetupRequired = prov.connectionState === 'setup_required';

              return (
                <div
                  key={prov.id}
                  className="bg-[#FFFCF6] border border-[#E8DED0] rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#854D27] font-semibold">
                          OFFICIAL PLAYLIST PROVIDER
                        </span>
                        <h2 className="font-serif-display text-2xl font-semibold text-[#27231F] flex items-center gap-2">
                          <span>{prov.name}</span>
                          {prov.accountName && isConnected && (
                            <span className="text-xs font-sans font-normal text-[#6E5641]">
                              ({prov.accountName})
                            </span>
                          )}
                        </h2>
                      </div>

                      {/* Honest Connection Status Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                          isConnected
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : isSetupRequired
                              ? 'bg-[#FEF3C7] text-[#92400E]'
                              : prov.connectionState === 'error'
                                ? 'bg-[#FEE2E2] text-[#991B1B]'
                                : 'bg-[#F6F1E8] text-[#493629] border border-[#E8DED0]'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isConnected
                              ? 'bg-[#16A34A]'
                              : isSetupRequired
                                ? 'bg-[#D97706]'
                                : prov.connectionState === 'error'
                                  ? 'bg-[#DC2626]'
                                  : 'bg-[#6E5641]'
                          }`}
                        />
                        {isConnected
                          ? 'Connected'
                          : isSetupRequired
                            ? 'Setup Required'
                            : prov.connectionState === 'error'
                              ? 'Auth Error'
                              : 'Disconnected'}
                      </span>
                    </div>

                    <p className="text-xs text-[#493629] leading-relaxed">
                      {prov.playbackRestrictionNote}
                    </p>

                    {isSetupRequired && (
                      <div className="p-3 rounded-xl bg-[#F6F1E8] border border-[#E8DED0] text-[11px] text-[#493629] space-y-1">
                        <p className="font-semibold text-[#27231F]">
                          Server Credentials Not Configured (
                          {prov.credentialEnvVars.join(', ')})
                        </p>
                        <p>
                          Add these environment variables in Settings &gt;
                          Secrets to enable OAuth login & API search, or paste a
                          public {prov.name} playlist link below to verify and
                          embed via official oEmbed.
                        </p>
                      </div>
                    )}

                    {prov.lastError && (
                      <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
                        {prov.lastError}
                      </div>
                    )}

                    {fb && (
                      <div
                        className={`p-2.5 rounded-xl text-xs border ${
                          fb.ok
                            ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]'
                            : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                        }`}
                      >
                        {fb.message}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E8DED0]">
                    <div className="flex items-center gap-2">
                      {!isConnected ? (
                        <button
                          type="button"
                          onClick={() => handleConnectProvider(prov.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5 text-[#D6A15D]" />
                          Connect {prov.name}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDisconnectProvider(prov.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA] cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Disconnect {prov.name}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setActiveTab(
                            prov.id === 'spotify'
                              ? 'spotify_playlists'
                              : 'youtube_playlists',
                          )
                        }
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F6F1E8] border border-[#E8DED0] text-[#493629] hover:bg-[#E9D4B1]/40 cursor-pointer"
                      >
                        Open {prov.name} Playlists
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('setup_docs')}
                      className="text-[11px] font-semibold text-[#854D27] hover:underline cursor-pointer"
                    >
                      Setup Guide →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Primary Playlist Tabs: Spotify Playlists | YouTube Playlists | My Playlists | Setup Guide */}
          <div className="flex items-center gap-2 pt-2 overflow-x-auto">
            {[
              {
                id: 'spotify_playlists',
                label: 'Spotify Playlists',
                icon: ListMusic,
              },
              {
                id: 'youtube_playlists',
                label: 'YouTube Playlists',
                icon: ListMusic,
              },
              {
                id: 'my_playlists',
                label: `My Playlists & Room Audio (${savedPlaylists.length})`,
                icon: Sliders,
              },
              {
                id: 'setup_docs',
                label: 'OAuth & API Setup Guide',
                icon: BookOpen,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab.id as PlaylistStudioTab)
                  }
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-[#27231F] text-[#FFFCF6] shadow-xs'
                      : 'bg-[#FFFCF6] text-[#493629] border border-[#E8DED0] hover:bg-[#E9D4B1]/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#D6A15D]" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Feedback Banner */}
        {statusBanner && (
          <div
            className={`mx-6 md:mx-8 mt-6 p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              statusBanner.ok
                ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]'
                : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusBanner.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-medium">{statusBanner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-[11px] underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ===================================================================
            MAIN CONTENT + PLAYLIST PREVIEW / INSPECTOR DRAWER
           =================================================================== */}
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {/* TAB 1: SPOTIFY PLAYLISTS */}
            {activeTab === 'spotify_playlists' && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                        Spotify Playlists
                      </h2>
                      <p className="text-xs text-[#6E5641]">
                        Search Spotify playlists or load your personal
                        authenticated playlists via the official Spotify Web
                        API.
                      </p>
                    </div>
                    {spotifyProvider?.connected && (
                      <button
                        type="button"
                        onClick={() => {
                          setSpotifyQuery('');
                          handleFetchSpotifyPlaylists('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#27231F] text-[#FFFCF6] text-xs font-semibold hover:bg-[#493629] cursor-pointer"
                      >
                        Load My Spotify Playlists
                      </button>
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleFetchSpotifyPlaylists();
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#856B52] absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={spotifyQuery}
                        onChange={(e) => setSpotifyQuery(e.target.value)}
                        placeholder="Search Spotify playlists (e.g. Peaceful Piano, Classical Museum, Ambient)..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#27231F]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={spotifyLoading}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {spotifyLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5 text-[#D6A15D]" />
                      )}
                      Search Spotify
                    </button>
                  </form>

                  {spotifyError && (
                    <div className="p-3.5 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#493629] flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium text-[#27231F]">
                          {spotifyError}
                        </p>
                        <p className="text-[11px] text-[#6E5641]">
                          You can also paste any public Spotify Playlist URL
                          below to verify it via Spotify’s official oEmbed API
                          and save it to MEMORA.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Import Public Spotify Playlist by URL */}
                <form
                  onSubmit={(e) => handleResolvePlaylistUrl(e, 'spotify')}
                  className="p-5 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-[#15803D]" />
                    <h3 className="font-serif-display text-xl font-semibold text-[#27231F]">
                      Verify & Save Spotify Playlist by Official URL
                    </h3>
                  </div>
                  <p className="text-xs text-[#6E5641]">
                    Paste a Spotify playlist URL (
                    <code className="font-mono">
                      https://open.spotify.com/playlist/...
                    </code>
                    ) to verify its metadata and add it to My Playlists.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={spotifyUrlInput}
                      onChange={(e) => setSpotifyUrlInput(e.target.value)}
                      placeholder="https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO"
                      className="sm:col-span-6 px-3 py-2 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#27231F]"
                    />
                    <input
                      type="text"
                      value={spotifyCustomTitle}
                      onChange={(e) => setSpotifyCustomTitle(e.target.value)}
                      placeholder="Optional custom label"
                      className="sm:col-span-4 px-3 py-2 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#27231F]"
                    />
                    <button
                      type="submit"
                      className="sm:col-span-2 px-3 py-2 rounded-xl bg-[#27231F] text-[#FFFCF6] text-xs font-semibold hover:bg-[#493629] cursor-pointer"
                    >
                      Verify & Save
                    </button>
                  </div>
                </form>

                {/* Spotify Playlist Cards Grid */}
                {spotifyPlaylists.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {spotifyPlaylists.map((pl) => renderPlaylistCard(pl))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: YOUTUBE PLAYLISTS */}
            {activeTab === 'youtube_playlists' && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                        YouTube Playlists
                      </h2>
                      <p className="text-xs text-[#6E5641]">
                        Search public YouTube playlists or retrieve your
                        authenticated account’s playlists via the official
                        YouTube Data API v3.
                      </p>
                    </div>
                    {youtubeProvider?.connected && (
                      <button
                        type="button"
                        onClick={() => {
                          setYoutubeQuery('');
                          handleFetchYouTubePlaylists('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#27231F] text-[#FFFCF6] text-xs font-semibold hover:bg-[#493629] cursor-pointer"
                      >
                        Load My YouTube Playlists
                      </button>
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleFetchYouTubePlaylists();
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#856B52] absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={youtubeQuery}
                        onChange={(e) => setYoutubeQuery(e.target.value)}
                        placeholder="Search public YouTube playlists (e.g. Classical Piano, Ambient Study, Nostalgic)..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#27231F]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={youtubeLoading}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {youtubeLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5 text-[#D6A15D]" />
                      )}
                      Search YouTube
                    </button>
                  </form>

                  {youtubeError && (
                    <div className="p-3.5 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#493629] flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium text-[#27231F]">
                          {youtubeError}
                        </p>
                        <p className="text-[11px] text-[#6E5641]">
                          You can also paste any public YouTube Playlist URL
                          below to verify it via YouTube’s official oEmbed API
                          and save it to MEMORA.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Import Public YouTube Playlist by URL */}
                <form
                  onSubmit={(e) => handleResolvePlaylistUrl(e, 'youtube')}
                  className="p-5 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-[#B91C1C]" />
                    <h3 className="font-serif-display text-xl font-semibold text-[#27231F]">
                      Verify & Save YouTube Playlist by Official URL
                    </h3>
                  </div>
                  <p className="text-xs text-[#6E5641]">
                    Paste a YouTube playlist URL (
                    <code className="font-mono">
                      https://www.youtube.com/playlist?list=...
                    </code>
                    ) to verify embedding permissions and add it to My
                    Playlists.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={youtubeUrlInput}
                      onChange={(e) => setYoutubeUrlInput(e.target.value)}
                      placeholder="https://www.youtube.com/playlist?list=PL..."
                      className="sm:col-span-6 px-3 py-2 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#27231F]"
                    />
                    <input
                      type="text"
                      value={youtubeCustomTitle}
                      onChange={(e) => setYoutubeCustomTitle(e.target.value)}
                      placeholder="Optional custom label"
                      className="sm:col-span-4 px-3 py-2 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#27231F]"
                    />
                    <button
                      type="submit"
                      className="sm:col-span-2 px-3 py-2 rounded-xl bg-[#27231F] text-[#FFFCF6] text-xs font-semibold hover:bg-[#493629] cursor-pointer"
                    >
                      Verify & Save
                    </button>
                  </div>
                </form>

                {/* YouTube Playlist Cards Grid */}
                {youtubePlaylists.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {youtubePlaylists.map((pl) => renderPlaylistCard(pl))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MY PLAYLISTS & ROOM SOUNDTRACK ASSIGNMENTS */}
            {activeTab === 'my_playlists' && (
              <div className="space-y-8">
                {/* 1. Saved Playlists Library */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                        My Saved Spotify & YouTube Playlists
                      </h2>
                      <p className="text-xs text-[#6E5641]">
                        Playlists saved to your museum persist across reloads
                        and can be assigned globally or to specific rooms.
                      </p>
                    </div>
                  </div>

                  {savedPlaylists.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] text-center space-y-3">
                      <ListMusic className="w-8 h-8 text-[#854D27] mx-auto" />
                      <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                        Save a Spotify or YouTube playlist to find it here.
                      </h3>
                      <p className="text-xs text-[#6E5641] max-w-md mx-auto">
                        Connect your account or paste a public playlist link to save playlists for your global museum soundtrack or individual rooms.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('spotify_playlists')}
                        className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#27231F] text-[#FFFCF6] hover:bg-[#493629] transition-colors cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5 text-[#D6A15D]" />
                        Browse Playlists
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {savedPlaylists.map((pl) => renderPlaylistCard(pl))}
                    </div>
                  )}
                </div>

                {/* 2. Global Museum Soundtrack Selection & Removal */}
                <div className="p-5 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                        Global Museum Soundtrack Assignment
                      </h3>
                      <p className="text-xs text-[#6E5641]">
                        Plays across the museum whenever you are not inside a
                        room that overrides global audio.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-semibold text-[#27231F] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={audioSettings.globalEnabled}
                        onChange={(e) =>
                          onUpdateAudioSettings({
                            ...audioSettings,
                            globalEnabled: e.target.checked,
                          })
                        }
                        className="accent-[#854D27]"
                      />
                      <span>Enable Global Soundtrack</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-8">
                      <select
                        value={
                          audioSettings.globalEnabled
                            ? audioSettings.globalSourceId
                            : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            onUpdateAudioSettings({
                              ...audioSettings,
                              globalEnabled: false,
                            });
                            return;
                          }
                          const chosen = allSources.find((s) => s.id === val);
                          onUpdateAudioSettings({
                            ...audioSettings,
                            muted: false,
                            globalEnabled: true,
                            globalSourceType:
                              chosen?.provider === 'local'
                                ? 'local_file'
                                : 'builtin',
                            globalSourceId: val,
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] text-xs font-medium text-[#27231F]"
                      >
                        <option value="">
                          — No Global Playlist Assigned (Silent Default) —
                        </option>
                        {allSources.map((src) => (
                          <option key={src.id} value={src.id}>
                            [{src.provider.toUpperCase()}] {src.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4 flex items-center gap-2">
                      <input
                        ref={audioFileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleUploadLocalAudio(e.target.files)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => audioFileInputRef.current?.click()}
                        className="w-full px-3 py-2 rounded-xl bg-[#27231F] text-[#FFFCF6] text-xs font-semibold hover:bg-[#493629] cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#D6A15D]" />
                        Upload Local Audio
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Room-Specific Playlist Assignments & Override Controls */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-serif-display text-2xl font-semibold text-[#27231F]">
                      Room-Specific Playlist Assignments
                    </h3>
                    <p className="text-xs text-[#6E5641]">
                      Choose whether each room overrides the global soundtrack
                      with its own assigned playlist or continues playing the
                      global soundtrack.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeRooms.map((room) => {
                      const cfg = room.audioSettings || {
                        roomId: room.id,
                        policy: 'use_global' as RoomAudioPolicy,
                        sourceType: 'builtin' as const,
                        sourceId: 'builtin-warm-piano',
                        enabled: true,
                        volume: 0.75,
                        autoplayOnEntry: true,
                        transitionPolicy: 'crossfade' as const,
                      };

                      const assignedSource = allSources.find(
                        (s) => s.id === cfg.sourceId,
                      );

                      return (
                        <div
                          key={room.id}
                          className="p-4 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-mono-tabular uppercase text-[#854D27]">
                                {room.wing} · Slot {room.slotIndex + 1}
                              </span>
                              <h4 className="font-serif-display text-xl font-semibold text-[#27231F]">
                                {room.name}
                              </h4>
                            </div>
                            <span
                              style={{ backgroundColor: room.accentColor }}
                              className="w-3 h-3 rounded-full"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#493629] mb-1">
                              Room Playback Rule
                            </label>
                            <select
                              value={cfg.policy}
                              onChange={(e) =>
                                onUpdateRoomAudio(room.id, {
                                  ...cfg,
                                  policy: e.target.value as RoomAudioPolicy,
                                  enabled: e.target.value !== 'silent',
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFCF6] border border-[#E8DED0] text-xs font-medium text-[#27231F]"
                            >
                              <option value="use_global">
                                Continue Global Museum Soundtrack
                              </option>
                              <option value="custom">
                                Override Global with Dedicated Room Playlist
                              </option>
                              <option value="silent">
                                Mute Audio Inside This Room
                              </option>
                            </select>
                          </div>

                          {cfg.policy === 'custom' && (
                            <div className="space-y-2">
                              <label className="block text-[11px] font-semibold text-[#493629]">
                                Assigned Room Playlist / Soundscape
                              </label>
                              <select
                                value={cfg.sourceId}
                                onChange={(e) =>
                                  onUpdateRoomAudio(room.id, {
                                    ...cfg,
                                    sourceId: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFCF6] border border-[#E8DED0] text-xs text-[#27231F]"
                              >
                                {allSources.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    [{s.provider.toUpperCase()}] {s.title}
                                  </option>
                                ))}
                              </select>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-[#6E5641] truncate">
                                  Active: {assignedSource?.title || 'None'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateRoomAudio(room.id, {
                                      ...cfg,
                                      policy: 'use_global',
                                      enabled: true,
                                    })
                                  }
                                  className="text-[11px] font-semibold text-[#991B1B] hover:underline cursor-pointer"
                                >
                                  Remove Override
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SETUP & CONFIGURATION DOCUMENTATION */}
            {activeTab === 'setup_docs' && (
              <div className="p-6 rounded-2xl bg-[#F6F1E8] border border-[#E8DED0] space-y-6">
                <div>
                  <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#854D27] font-semibold">
                    DEVELOPER & DEPLOYMENT CONFIGURATION
                  </span>
                  <h2 className="font-serif-display text-2xl font-semibold text-[#27231F] mt-0.5">
                    Spotify & YouTube Playlist Setup Documentation
                  </h2>
                  <p className="text-xs text-[#493629] mt-1">
                    All API credentials and OAuth tokens are managed strictly on
                    the server. Client secrets are never exposed in frontend
                    code.
                  </p>
                </div>

                {/* Callback URL Box */}
                <div className="p-4 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#27231F]">
                      Required OAuth Redirect / Callback URI
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(callbackUrl);
                        setCopiedCallback(true);
                        setTimeout(() => setCopiedCallback(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F6F1E8] border border-[#E8DED0] text-[11px] font-semibold text-[#493629] cursor-pointer"
                    >
                      {copiedCallback ? (
                        <>
                          <Check className="w-3 h-3 text-[#166534]" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy URI
                        </>
                      )}
                    </button>
                  </div>
                  <code className="block font-mono text-xs bg-[#F6F1E8] p-2.5 rounded-lg border border-[#E8DED0] text-[#27231F] break-all">
                    {callbackUrl}
                  </code>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] space-y-2.5 text-xs text-[#493629]">
                    <h3 className="font-serif-display text-xl font-semibold text-[#27231F]">
                      1. Spotify Developer Setup
                    </h3>
                    <ol className="list-decimal list-inside space-y-1.5">
                      <li>
                        Visit{' '}
                        <a
                          href="https://developer.spotify.com/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#854D27] underline"
                        >
                          Spotify Developer Dashboard
                        </a>{' '}
                        and create an application.
                      </li>
                      <li>
                        Under <strong>Redirect URIs</strong>, register{' '}
                        <code className="font-mono">{callbackUrl}</code>.
                      </li>
                      <li>
                        Minimal scopes requested:{' '}
                        <code className="font-mono">
                          playlist-read-private playlist-read-collaborative
                        </code>
                        .
                      </li>
                      <li>
                        Set <code className="font-mono">SPOTIFY_CLIENT_ID</code>{' '}
                        and{' '}
                        <code className="font-mono">SPOTIFY_CLIENT_SECRET</code>{' '}
                        in server environment variables.
                      </li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FFFCF6] border border-[#E8DED0] space-y-2.5 text-xs text-[#493629]">
                    <h3 className="font-serif-display text-xl font-semibold text-[#27231F]">
                      2. Google / YouTube Data API v3 Setup
                    </h3>
                    <ol className="list-decimal list-inside space-y-1.5">
                      <li>
                        In{' '}
                        <a
                          href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#854D27] underline"
                        >
                          Google Cloud Console
                        </a>
                        , enable <strong>YouTube Data API v3</strong>.
                      </li>
                      <li>
                        Create an OAuth 2.0 Web Client and register{' '}
                        <code className="font-mono">{callbackUrl}</code> under{' '}
                        <strong>Authorized redirect URIs</strong>.
                      </li>
                      <li>
                        Minimal scope requested:{' '}
                        <code className="font-mono">
                          https://www.googleapis.com/auth/youtube.readonly
                        </code>
                        .
                      </li>
                      <li>
                        Set <code className="font-mono">YOUTUBE_CLIENT_ID</code>
                        ,{' '}
                        <code className="font-mono">YOUTUBE_CLIENT_SECRET</code>
                        , and optionally{' '}
                        <code className="font-mono">YOUTUBE_API_KEY</code> in
                        server environment variables.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* =================================================================
              RIGHT 4 COLUMNS: PLAYLIST PREVIEW & ITEM INSPECTOR
             ================================================================= */}
          <div className="lg:col-span-4 space-y-5">
            <div className="p-5 rounded-2xl bg-[#27231F] text-[#FFFCF6] border border-[#493629] space-y-4 shadow-lg sticky top-6">
              <div>
                <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#D6A15D] font-semibold">
                  PLAYLIST INSPECTOR & EMBED PREVIEW
                </span>
                <h3 className="font-serif-display text-2xl font-semibold mt-0.5">
                  {inspectedPlaylist?.title || 'Select a Playlist'}
                </h3>
                {inspectedPlaylist && (
                  <p className="text-xs text-[#E9D4B1] mt-0.5">
                    {inspectedPlaylist.subtitle}
                  </p>
                )}
              </div>

              {!inspectedPlaylist ? (
                <p className="text-xs text-[#E9D4B1]/80 leading-relaxed">
                  Click <strong>Preview</strong> on any Spotify or YouTube
                  playlist card (or verify a playlist URL) to inspect its tracks
                  and test embedded playback.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Embedded Player when permitted */}
                  {inspectedPlaylist.embedAllowed !== false &&
                  (inspectedPlaylist.embedUrl ||
                    inspectedPlaylist.spotifyEmbedUrl) ? (
                    <div className="rounded-xl overflow-hidden bg-[#121212] border border-white/10">
                      <iframe
                        key={
                          inspectedPlaylist.embedUrl ||
                          inspectedPlaylist.spotifyEmbedUrl
                        }
                        title={`Preview - ${inspectedPlaylist.title}`}
                        src={
                          inspectedPlaylist.embedUrl ||
                          inspectedPlaylist.spotifyEmbedUrl
                        }
                        width="100%"
                        height={
                          inspectedPlaylist.provider === 'youtube'
                            ? '200'
                            : '152'
                        }
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="border-0 block"
                      />
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 text-xs text-[#E9D4B1] space-y-2">
                      <p>
                        {inspectedPlaylist.unavailableReason ||
                          'Embedded playback is unavailable for this playlist.'}
                      </p>
                    </div>
                  )}

                  {detailsError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-400/40 text-xs text-red-200">
                      {detailsError}
                    </div>
                  )}

                  {/* Quick Assignment Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleAssignGlobalPlaylist(inspectedPlaylist)
                      }
                      className="px-3 py-2 rounded-xl bg-[#D6A15D] text-[#27231F] text-xs font-semibold hover:bg-[#E9D4B1] cursor-pointer"
                    >
                      Set as Global
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAssignPlaylistToRoom(
                          inspectedPlaylist,
                          selectedRoomId,
                        )
                      }
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFFCF6] text-xs font-semibold cursor-pointer"
                    >
                      Assign to Room
                    </button>
                  </div>

                  {inspectedPlaylist.externalServiceUrl && (
                    <a
                      href={inspectedPlaylist.externalServiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 rounded-xl border border-white/20 text-xs font-semibold text-[#E9D4B1] hover:bg-white/10 flex items-center justify-center gap-1.5"
                    >
                      <span>
                        Open Playlist in{' '}
                        {inspectedPlaylist.provider === 'spotify'
                          ? 'Spotify'
                          : 'YouTube'}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Playlist Items Preview when available */}
                  {loadingDetails ? (
                    <div className="text-xs text-[#E9D4B1] flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading playlist items...</span>
                    </div>
                  ) : (
                    inspectedPlaylist.itemsPreview &&
                    inspectedPlaylist.itemsPreview.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/15">
                        <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#D6A15D] font-semibold">
                          Playlist Items (
                          {inspectedPlaylist.itemsPreview.length})
                        </span>
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {inspectedPlaylist.itemsPreview.map((item, idx) => (
                            <div
                              key={`${item.id}-${idx}`}
                              className="p-2 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-[#FFFCF6] truncate">
                                  {idx + 1}. {item.title}
                                </p>
                                <p className="text-[10px] text-[#E9D4B1]/75 truncate">
                                  {item.artistOrChannel}
                                  {item.unavailableReason
                                    ? ` · (${item.unavailableReason})`
                                    : ''}
                                </p>
                              </div>
                              {item.durationLabel && (
                                <span className="text-[10px] font-mono-tabular text-[#E9D4B1]/70 shrink-0">
                                  {item.durationLabel}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
