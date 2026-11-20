import { MusicProviderStatus, MusicSource, PlaylistItemPreview } from '../types/museum';

export interface PlaylistServiceOptions {
  getEnv?: (key: string) => string | undefined;
  fetchFn?: typeof fetch;
}

interface OAuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  accountName?: string;
  accountId?: string;
}

function isRealSecret(val: string | undefined): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.length >= 4 && !trimmed.startsWith('MY_');
}

function parseSpotifyPlaylistId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  const uriMatch = trimmed.match(/^spotify:playlist:([a-zA-Z0-9]+)$/);
  if (uriMatch) return uriMatch[1];

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes('spotify.com')) return null;
    const match = parsed.pathname.match(/\/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function parseYouTubePlaylistId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('youtube.com') && !host.includes('youtu.be')) {
      return null;
    }
    const listId = parsed.searchParams.get('list');
    if (listId && /^[a-zA-Z0-9_-]{8,}$/.test(listId)) {
      return listId;
    }
    return null;
  } catch {
    return null;
  }
}

export class PlaylistIntegrationService {
  private readonly getEnv: (key: string) => string | undefined;
  private readonly fetchFn: typeof fetch;
  private readonly sessions: Partial<Record<'spotify' | 'youtube', OAuthSession>> = {};
  private readonly lastErrors: Partial<Record<'spotify' | 'youtube', string>> = {};

  constructor(options: PlaylistServiceOptions = {}) {
    this.getEnv = options.getEnv ?? ((key) => process.env[key]);
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public getCallbackUrl(origin?: string): string {
    const appUrl = this.getEnv('APP_URL');
    const base =
      origin && origin.trim()
        ? origin.trim()
        : isRealSecret(appUrl)
          ? appUrl.trim()
          : 'http://localhost:3000';
    return `${base.replace(/\/+$/, '')}/auth/callback`;
  }

  private isSpotifyOAuthConfigured(): boolean {
    return (
      isRealSecret(this.getEnv('SPOTIFY_CLIENT_ID')) &&
      isRealSecret(this.getEnv('SPOTIFY_CLIENT_SECRET'))
    );
  }

  private isYouTubeOAuthConfigured(): boolean {
    return (
      isRealSecret(this.getEnv('YOUTUBE_CLIENT_ID')) &&
      isRealSecret(this.getEnv('YOUTUBE_CLIENT_SECRET'))
    );
  }

  private isYouTubeApiKeyConfigured(): boolean {
    return isRealSecret(this.getEnv('YOUTUBE_API_KEY'));
  }

  public getProvidersStatus(origin?: string): MusicProviderStatus[] {
    const callbackUrl = this.getCallbackUrl(origin);
    const spConfigured = this.isSpotifyOAuthConfigured();
    const spSession = this.sessions.spotify;
    const spConnected = Boolean(spSession && spSession.accessToken);

    const ytOAuthConfigured = this.isYouTubeOAuthConfigured();
    const ytApiKeyConfigured = this.isYouTubeApiKeyConfigured();
    const ytConfigured = ytOAuthConfigured || ytApiKeyConfigured;
    const ytSession = this.sessions.youtube;
    const ytConnected = Boolean(ytSession && ytSession.accessToken);

    return [
      {
        id: 'spotify',
        name: 'Spotify',
        connected: spConnected,
        connectionState: spConnected
          ? 'connected'
          : spConfigured
            ? 'disconnected'
            : 'setup_required',
        connectionMode: spConnected ? 'oauth' : 'disconnected',
        accountName: spSession?.accountName,
        configuredOnServer: spConfigured,
        oauthConfiguredOnServer: spConfigured,
        credentialEnvVars: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
        requiredScopes: [
          'playlist-read-private',
          'playlist-read-collaborative',
          'user-read-private',
        ],
        callbackUrl,
        capabilities: {
          userPlaylists: spConnected,
          publicPlaylistSearch: spConnected,
          playlistItems: spConnected,
          embeddedPlayer: true,
          fullNativeCatalogPlayback: false,
        },
        playbackRestrictionNote:
          'Public Spotify playlists play via the official Spotify embedded player. Full account library import requires Spotify OAuth credentials.',
        setupInstructions:
          'Configure SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your server environment and register the callback URL in the Spotify Developer Dashboard.',
        lastError: this.lastErrors.spotify,
      },
      {
        id: 'youtube',
        name: 'YouTube',
        connected: ytConnected,
        connectionState: ytConnected
          ? 'connected'
          : ytConfigured
            ? 'disconnected'
            : 'setup_required',
        connectionMode: ytConnected
          ? 'oauth'
          : ytApiKeyConfigured
            ? 'api_key'
            : 'disconnected',
        accountName: ytSession?.accountName,
        configuredOnServer: ytConfigured,
        oauthConfiguredOnServer: ytOAuthConfigured,
        credentialEnvVars: [
          'YOUTUBE_CLIENT_ID',
          'YOUTUBE_CLIENT_SECRET',
          'YOUTUBE_API_KEY',
        ],
        requiredScopes: ['https://www.googleapis.com/auth/youtube.readonly'],
        callbackUrl,
        capabilities: {
          userPlaylists: ytConnected,
          publicPlaylistSearch: ytConnected || ytApiKeyConfigured,
          playlistItems: ytConnected || ytApiKeyConfigured,
          embeddedPlayer: true,
          fullNativeCatalogPlayback: false,
        },
        playbackRestrictionNote:
          'Public YouTube playlists play via the official YouTube embedded player. Account playlist sync requires YouTube OAuth credentials.',
        setupInstructions:
          'Configure YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET (or YOUTUBE_API_KEY for public search) in your server environment.',
        lastError: this.lastErrors.youtube,
      },
    ];
  }

  public getAuthorizationUrl(
    provider: 'spotify' | 'youtube',
    redirectUri?: string,
  ): { ok: boolean; url?: string; code?: string; error?: string } {
    const resolvedRedirect = redirectUri || this.getCallbackUrl();

    if (provider === 'spotify') {
      const clientId = this.getEnv('SPOTIFY_CLIENT_ID');
      const clientSecret = this.getEnv('SPOTIFY_CLIENT_SECRET');
      if (!isRealSecret(clientId) || !isRealSecret(clientSecret)) {
        return {
          ok: false,
          code: 'MISSING_CREDENTIALS',
          error:
            'Spotify OAuth requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to be configured on the server.',
        };
      }
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId.trim(),
        scope: 'playlist-read-private playlist-read-collaborative user-read-private',
        redirect_uri: resolvedRedirect,
        state: 'spotify',
        show_dialog: 'true',
      });
      return {
        ok: true,
        url: `https://accounts.spotify.com/authorize?${params.toString()}`,
      };
    }

    const ytClientId = this.getEnv('YOUTUBE_CLIENT_ID');
    const ytClientSecret = this.getEnv('YOUTUBE_CLIENT_SECRET');
    if (!isRealSecret(ytClientId) || !isRealSecret(ytClientSecret)) {
      return {
        ok: false,
        code: 'MISSING_CREDENTIALS',
        error:
          'YouTube OAuth requires YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to be configured on the server.',
      };
    }
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: ytClientId.trim(),
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      redirect_uri: resolvedRedirect,
      access_type: 'offline',
      prompt: 'consent',
      state: 'youtube',
    });
    return {
      ok: true,
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    };
  }

  public async handleOAuthCallback(
    provider: 'spotify' | 'youtube',
    code: string,
    redirectUri: string,
    errorParam?: string,
  ): Promise<{ ok: boolean; message: string }> {
    if (errorParam) {
      const msg = `${provider === 'spotify' ? 'Spotify' : 'YouTube'} authorization declined: ${errorParam}`;
      this.lastErrors[provider] = msg;
      return { ok: false, message: msg };
    }
    if (!code) {
      const msg = 'Missing authorization code in OAuth callback.';
      this.lastErrors[provider] = msg;
      return { ok: false, message: msg };
    }

    try {
      if (provider === 'spotify') {
        const clientId = this.getEnv('SPOTIFY_CLIENT_ID');
        const clientSecret = this.getEnv('SPOTIFY_CLIENT_SECRET');
        if (!isRealSecret(clientId) || !isRealSecret(clientSecret)) {
          return {
            ok: false,
            message:
              'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not configured on the server.',
          };
        }

        const basicAuth = Buffer.from(
          `${clientId.trim()}:${clientSecret.trim()}`,
        ).toString('base64');

        const tokenRes = await this.fetchFn(
          'https://accounts.spotify.com/api/token',
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${basicAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: redirectUri,
            }).toString(),
          },
        );

        if (!tokenRes.ok) {
          const msg = `Spotify token exchange failed (HTTP ${tokenRes.status}).`;
          this.lastErrors.spotify = msg;
          return { ok: false, message: msg };
        }

        const tokenJson: any = await tokenRes.json();
        const accessToken = String(tokenJson?.access_token || '');
        if (!accessToken) {
          return {
            ok: false,
            message: 'Spotify did not return a valid access token.',
          };
        }

        let accountName = 'Spotify Curator';
        let accountId: string | undefined;
        try {
          const meRes = await this.fetchFn('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (meRes.ok) {
            const meJson: any = await meRes.json();
            accountName = meJson?.display_name || meJson?.id || accountName;
            accountId = meJson?.id;
          }
        } catch {
          // keep fallback account name
        }

        this.sessions.spotify = {
          accessToken,
          refreshToken: tokenJson?.refresh_token,
          expiresAt: Date.now() + Number(tokenJson?.expires_in || 3600) * 1000,
          accountName,
          accountId,
        };
        delete this.lastErrors.spotify;
        return {
          ok: true,
          message: `Connected to Spotify as ${accountName}.`,
        };
      }

      // YouTube OAuth
      const ytClientId = this.getEnv('YOUTUBE_CLIENT_ID');
      const ytClientSecret = this.getEnv('YOUTUBE_CLIENT_SECRET');
      if (!isRealSecret(ytClientId) || !isRealSecret(ytClientSecret)) {
        return {
          ok: false,
          message:
            'YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET are not configured on the server.',
        };
      }

      const tokenRes = await this.fetchFn('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: ytClientId.trim(),
          client_secret: ytClientSecret.trim(),
        }).toString(),
      });

      if (!tokenRes.ok) {
        const msg = `YouTube token exchange failed (HTTP ${tokenRes.status}).`;
        this.lastErrors.youtube = msg;
        return { ok: false, message: msg };
      }

      const tokenJson: any = await tokenRes.json();
      const accessToken = String(tokenJson?.access_token || '');
      if (!accessToken) {
        return {
          ok: false,
          message: 'YouTube did not return a valid access token.',
        };
      }

      let accountName = 'YouTube Curator';
      try {
        const chRes = await this.fetchFn(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (chRes.ok) {
          const chJson: any = await chRes.json();
          accountName = chJson?.items?.[0]?.snippet?.title || accountName;
        }
      } catch {
        // ignore profile fetch failure
      }

      this.sessions.youtube = {
        accessToken,
        refreshToken: tokenJson?.refresh_token,
        expiresAt: Date.now() + Number(tokenJson?.expires_in || 3600) * 1000,
        accountName,
      };
      delete this.lastErrors.youtube;
      return {
        ok: true,
        message: `Connected to YouTube as ${accountName}.`,
      };
    } catch (err: any) {
      const msg = `OAuth exchange error: ${String(err?.message || err)}`;
      this.lastErrors[provider] = msg;
      return { ok: false, message: msg };
    }
  }

  public disconnectProvider(provider: 'spotify' | 'youtube'): void {
    delete this.sessions[provider];
    delete this.lastErrors[provider];
  }

  private mapSpotifyPlaylist(item: any): MusicSource {
    const id = String(item?.id || '');
    const externalUrl =
      item?.external_urls?.spotify || `https://open.spotify.com/playlist/${id}`;
    const embedUrl = `https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`;
    const trackCount =
      typeof item?.tracks?.total === 'number' ? item.tracks.total : null;

    return {
      id: `spotify_playlist_${id}`,
      provider: 'spotify',
      externalPlaylistId: id,
      title: String(item?.name || 'Spotify Playlist'),
      subtitle:
        String(item?.description || '').replace(/<[^>]+>/g, '').trim() ||
        'Spotify Playlist',
      ownerName: item?.owner?.display_name || item?.owner?.id || 'Spotify',
      trackCount,
      artworkColor: '#1DB954',
      artworkUrl: item?.images?.[0]?.url,
      sourceType: 'embedded_playlist',
      externalUrl,
      externalServiceUrl: externalUrl,
      embedUrl,
      spotifyEmbedUrl: embedUrl,
      embedAllowed: true,
      durationLabel: trackCount !== null ? `${trackCount} tracks` : 'Playlist',
      availabilityStatus: 'embed_only',
    };
  }

  private mapYouTubePlaylist(item: any): MusicSource {
    const id = String(
      typeof item?.id === 'string' ? item.id : item?.id?.playlistId || '',
    );
    const snippet = item?.snippet || {};
    const externalUrl = `https://www.youtube.com/playlist?list=${id}`;
    const embedUrl = `https://www.youtube.com/embed/videoseries?list=${id}`;
    const trackCount =
      typeof item?.contentDetails?.itemCount === 'number'
        ? item.contentDetails.itemCount
        : null;

    return {
      id: `youtube_playlist_${id}`,
      provider: 'youtube',
      externalPlaylistId: id,
      title: String(snippet.title || 'YouTube Playlist'),
      subtitle: String(snippet.description || '').trim() || 'YouTube Playlist',
      ownerName: snippet.channelTitle || 'YouTube',
      trackCount,
      artworkColor: '#CC2B2B',
      artworkUrl:
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url,
      sourceType: 'embedded_playlist',
      externalUrl,
      externalServiceUrl: externalUrl,
      embedUrl,
      embedAllowed: true,
      durationLabel: trackCount !== null ? `${trackCount} videos` : 'Playlist',
      availabilityStatus: 'embed_only',
    };
  }

  public async getSpotifyPlaylists(query = ''): Promise<{
    ok: boolean;
    code?: string;
    message?: string;
    playlists: MusicSource[];
  }> {
    const session = this.sessions.spotify;
    if (!session?.accessToken) {
      return {
        ok: false,
        code: this.isSpotifyOAuthConfigured() ? 'NOT_CONNECTED' : 'SETUP_REQUIRED',
        message: this.isSpotifyOAuthConfigured()
          ? 'Connect your Spotify account to browse your playlists, or paste any public Spotify playlist URL.'
          : 'Spotify OAuth credentials are not configured on the server. You can still paste any public Spotify playlist URL.',
        playlists: [],
      };
    }

    try {
      const trimmedQ = query.trim();
      const endpoint = trimmedQ
        ? `https://api.spotify.com/v1/search?type=playlist&limit=20&q=${encodeURIComponent(trimmedQ)}`
        : 'https://api.spotify.com/v1/me/playlists?limit=30';
      const res = await this.fetchFn(endpoint, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) {
        return {
          ok: false,
          code: 'PROVIDER_API_ERROR',
          message: `Spotify API returned HTTP ${res.status}.`,
          playlists: [],
        };
      }
      const data: any = await res.json();
      const rawItems = trimmedQ
        ? data?.playlists?.items || []
        : data?.items || [];
      const playlists = rawItems
        .filter((item: any) => Boolean(item && item.id))
        .map((item: any) => this.mapSpotifyPlaylist(item));
      return { ok: true, playlists };
    } catch (err: any) {
      return {
        ok: false,
        code: 'NETWORK_ERROR',
        message: `Failed to reach Spotify API: ${String(err?.message || err)}`,
        playlists: [],
      };
    }
  }

  public async getYouTubePlaylists(query = ''): Promise<{
    ok: boolean;
    code?: string;
    message?: string;
    playlists: MusicSource[];
  }> {
    const session = this.sessions.youtube;
    const apiKey = this.getEnv('YOUTUBE_API_KEY');
    const trimmedQ = query.trim();

    if (!session?.accessToken && !isRealSecret(apiKey)) {
      return {
        ok: false,
        code: this.isYouTubeOAuthConfigured() ? 'NOT_CONNECTED' : 'SETUP_REQUIRED',
        message: this.isYouTubeOAuthConfigured()
          ? 'Connect your YouTube account to list your playlists, or paste a public YouTube playlist URL.'
          : 'YouTube API credentials are not configured on the server. You can still paste any public YouTube playlist URL.',
        playlists: [],
      };
    }

    try {
      let endpoint = '';
      const headers: Record<string, string> = {};
      if (trimmedQ) {
        const params = new URLSearchParams({
          part: 'snippet',
          type: 'playlist',
          maxResults: '18',
          q: trimmedQ,
        });
        if (session?.accessToken) {
          headers.Authorization = `Bearer ${session.accessToken}`;
        } else if (isRealSecret(apiKey)) {
          params.set('key', apiKey.trim());
        }
        endpoint = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
      } else if (session?.accessToken) {
        headers.Authorization = `Bearer ${session.accessToken}`;
        endpoint =
          'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=25';
      } else {
        return {
          ok: true,
          playlists: [],
          message: 'Enter a search query or connect YouTube OAuth to browse playlists.',
        };
      }

      const res = await this.fetchFn(endpoint, { headers });
      if (!res.ok) {
        return {
          ok: false,
          code: 'PROVIDER_API_ERROR',
          message: `YouTube API returned HTTP ${res.status}.`,
          playlists: [],
        };
      }
      const data: any = await res.json();
      const playlists = (data?.items || [])
        .map((item: any) => this.mapYouTubePlaylist(item))
        .filter((p: MusicSource) => Boolean(p.externalPlaylistId));
      return { ok: true, playlists };
    } catch (err: any) {
      return {
        ok: false,
        code: 'NETWORK_ERROR',
        message: `Failed to reach YouTube API: ${String(err?.message || err)}`,
        playlists: [],
      };
    }
  }

  public async getSpotifyPlaylistDetails(playlistId: string): Promise<{
    ok: boolean;
    code?: string;
    message?: string;
    playlist?: MusicSource;
  }> {
    const cleanId = String(playlistId || '').trim();
    if (!cleanId) {
      return { ok: false, code: 'INVALID_ID', message: 'Missing Spotify playlist ID.' };
    }

    const session = this.sessions.spotify;
    if (session?.accessToken) {
      try {
        const res = await this.fetchFn(
          `https://api.spotify.com/v1/playlists/${encodeURIComponent(cleanId)}`,
          { headers: { Authorization: `Bearer ${session.accessToken}` } },
        );
        if (res.ok) {
          const item: any = await res.json();
          const mapped = this.mapSpotifyPlaylist(item);
          const rawTracks = item?.tracks?.items || [];
          const itemsPreview: PlaylistItemPreview[] = rawTracks
            .slice(0, 12)
            .map((entry: any) => {
              const track = entry?.track;
              if (!track) return null;
              const artists = Array.isArray(track.artists)
                ? track.artists.map((a: any) => a?.name).filter(Boolean).join(', ')
                : 'Artist';
              const ms = Number(track.duration_ms || 0);
              const mins = Math.floor(ms / 60000);
              const secs = Math.floor((ms % 60000) / 1000)
                .toString()
                .padStart(2, '0');
              return {
                id: String(track.id || track.name || Math.random()),
                title: String(track.name || 'Track'),
                artistOrChannel: artists || 'Spotify',
                durationLabel: ms > 0 ? `${mins}:${secs}` : undefined,
                externalUrl: track.external_urls?.spotify,
                thumbnailUrl: track.album?.images?.[0]?.url,
              } as PlaylistItemPreview;
            })
            .filter(Boolean) as PlaylistItemPreview[];
          mapped.itemsPreview = itemsPreview;
          return { ok: true, playlist: mapped };
        }
      } catch {
        // Fall through to URL resolution
      }
    }

    return this.resolvePlaylistByUrl(
      `https://open.spotify.com/playlist/${encodeURIComponent(cleanId)}`,
    );
  }

  public async getYouTubePlaylistDetails(playlistId: string): Promise<{
    ok: boolean;
    code?: string;
    message?: string;
    playlist?: MusicSource;
  }> {
    const cleanId = String(playlistId || '').trim();
    if (!cleanId) {
      return { ok: false, code: 'INVALID_ID', message: 'Missing YouTube playlist ID.' };
    }

    const session = this.sessions.youtube;
    const apiKey = this.getEnv('YOUTUBE_API_KEY');
    if (session?.accessToken || isRealSecret(apiKey)) {
      try {
        const headers: Record<string, string> = {};
        const params = new URLSearchParams({
          part: 'snippet,contentDetails',
          id: cleanId,
        });
        if (session?.accessToken) {
          headers.Authorization = `Bearer ${session.accessToken}`;
        } else if (isRealSecret(apiKey)) {
          params.set('key', apiKey.trim());
        }
        const res = await this.fetchFn(
          `https://www.googleapis.com/youtube/v3/playlists?${params.toString()}`,
          { headers },
        );
        if (res.ok) {
          const data: any = await res.json();
          const item = data?.items?.[0];
          if (item) {
            return { ok: true, playlist: this.mapYouTubePlaylist(item) };
          }
        }
      } catch {
        // Fall through to URL resolution
      }
    }

    return this.resolvePlaylistByUrl(
      `https://www.youtube.com/playlist?list=${encodeURIComponent(cleanId)}`,
    );
  }

  public async resolvePlaylistByUrl(
    rawUrl: unknown,
    customTitle?: unknown,
  ): Promise<{
    ok: boolean;
    code?: string;
    message?: string;
    playlist?: MusicSource;
  }> {
    const urlStr = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    const titleOverride =
      typeof customTitle === 'string' && customTitle.trim()
        ? customTitle.trim()
        : undefined;

    if (!urlStr) {
      return {
        ok: false,
        code: 'INVALID_PLAYLIST_URL',
        message: 'Please provide a valid Spotify or YouTube playlist URL.',
      };
    }

    const spotifyId = parseSpotifyPlaylistId(urlStr);
    if (spotifyId) {
      const canonicalUrl = `https://open.spotify.com/playlist/${spotifyId}`;
      const embedUrl = `https://open.spotify.com/embed/playlist/${spotifyId}?utm_source=generator&theme=0`;
      let title = titleOverride || 'Spotify Playlist';
      let artworkUrl: string | undefined;
      let ownerName = 'Spotify';

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const oembedRes = await this.fetchFn(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(canonicalUrl)}`,
          { signal: controller.signal },
        );
        clearTimeout(timer);
        if (oembedRes.ok) {
          const oembed: any = await oembedRes.json();
          if (!titleOverride && typeof oembed?.title === 'string' && oembed.title.trim()) {
            title = oembed.title.trim();
          }
          if (typeof oembed?.thumbnail_url === 'string' && oembed.thumbnail_url) {
            artworkUrl = oembed.thumbnail_url;
          }
          if (typeof oembed?.provider_name === 'string' && oembed.provider_name) {
            ownerName = oembed.provider_name;
          }
        }
      } catch {
        // Keep clean canonical metadata if oEmbed is unreachable
      }

      const playlist: MusicSource = {
        id: `spotify_playlist_${spotifyId}`,
        provider: 'spotify',
        externalPlaylistId: spotifyId,
        title,
        subtitle: 'Spotify Official Embed Playlist',
        ownerName,
        trackCount: null,
        artworkColor: '#1DB954',
        artworkUrl,
        sourceType: 'embedded_playlist',
        externalUrl: canonicalUrl,
        externalServiceUrl: canonicalUrl,
        embedUrl,
        spotifyEmbedUrl: embedUrl,
        embedAllowed: true,
        durationLabel: 'Spotify Playlist',
        availabilityStatus: 'embed_only',
      };

      return { ok: true, playlist };
    }

    const youtubeId = parseYouTubePlaylistId(urlStr);
    if (youtubeId) {
      const canonicalUrl = `https://www.youtube.com/playlist?list=${youtubeId}`;
      const embedUrl = `https://www.youtube.com/embed/videoseries?list=${youtubeId}`;
      let title = titleOverride || 'YouTube Playlist';
      let artworkUrl: string | undefined;
      let ownerName = 'YouTube';

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const oembedRes = await this.fetchFn(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
          { signal: controller.signal },
        );
        clearTimeout(timer);
        if (oembedRes.ok) {
          const oembed: any = await oembedRes.json();
          if (!titleOverride && typeof oembed?.title === 'string' && oembed.title.trim()) {
            title = oembed.title.trim();
          }
          if (typeof oembed?.thumbnail_url === 'string' && oembed.thumbnail_url) {
            artworkUrl = oembed.thumbnail_url;
          }
          if (typeof oembed?.author_name === 'string' && oembed.author_name) {
            ownerName = oembed.author_name;
          }
        }
      } catch {
        // Keep canonical metadata if oEmbed is unreachable
      }

      const playlist: MusicSource = {
        id: `youtube_playlist_${youtubeId}`,
        provider: 'youtube',
        externalPlaylistId: youtubeId,
        title,
        subtitle: 'YouTube Official Embed Playlist',
        ownerName,
        trackCount: null,
        artworkColor: '#CC2B2B',
        artworkUrl,
        sourceType: 'embedded_playlist',
        externalUrl: canonicalUrl,
        externalServiceUrl: canonicalUrl,
        embedUrl,
        embedAllowed: true,
        durationLabel: 'YouTube Playlist',
        availabilityStatus: 'embed_only',
      };

      return { ok: true, playlist };
    }

    return {
      ok: false,
      code: 'UNSUPPORTED_PLAYLIST_URL',
      message:
        'Unrecognized playlist link. Please paste an official Spotify (open.spotify.com/playlist/...) or YouTube (youtube.com/playlist?list=...) URL.',
    };
  }

  public async resolvePlaylistUrl(rawUrl: string, customTitle?: string) {
    return this.resolvePlaylistByUrl(rawUrl, customTitle);
  }
}
