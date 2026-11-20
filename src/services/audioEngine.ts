import {
  MuseumAudioSettings,
  MusicSource,
  Room,
} from '../types/museum';
import {
  BUILTIN_MUSIC_SOURCES,
  DEFAULT_SPOTIFY_PLAYLIST_CONFIG,
  INITIAL_AUDIO_SETTINGS,
} from '../data/initialMuseumData';

export interface AudioEngineSnapshot {
  isPlaying: boolean;
  playbackState: 'stopped' | 'playing' | 'paused';
  userGestureUnlocked: boolean;
  activeSource: MusicSource | null;
  activeContextLabel: string; // e.g., "Global Museum Soundtrack" or "Room Soundtrack · Childhood"
  effectiveVolume: number;
  muted: boolean;
  elapsedSeconds: number;
  errorMessage: string | null;
}

type AudioListener = (snapshot: AudioEngineSnapshot) => void;

const CHORD_FREQUENCIES: Record<string, number[]> = {
  calm_museum: [174.61, 220.0, 261.63, 329.63], // Fmaj7 warm drone
  warm_piano: [196.0, 246.94, 293.66, 392.0], // Gmaj gentle triad + melody
  forest_ambience: [164.81, 246.94, 329.63, 369.99], // Em9 woodland resonance
  gentle_rain: [146.83, 220.0, 261.63, 349.23], // Dm7 rain-washed harmonic
  ocean_waves: [130.81, 196.0, 246.94, 293.66], // Cmaj9 deep tide
  evening_atmosphere: [185.0, 233.08, 277.18, 349.23], // F#maj7 twilight
  cinematic_memories: [220.0, 277.18, 329.63, 440.0], // Amaj warm orchestral
};

class MuseumAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeNoiseNode: AudioNode | null = null;
  private melodyInterval: number | null = null;
  private elapsedInterval: number | null = null;
  private htmlAudio: HTMLAudioElement | null = null;

  private sources: MusicSource[] = [...BUILTIN_MUSIC_SOURCES];
  private settings: MuseumAudioSettings = { ...INITIAL_AUDIO_SETTINGS };
  private activeRoom: Room | null = null;

  private currentSourceId: string | null = null;
  private isPlaying = false;
  private playbackState: 'stopped' | 'playing' | 'paused' = 'stopped';
  private userGestureUnlocked = false;
  private elapsedSeconds = 0;
  private errorMessage: string | null = null;
  private hydratedDefaultSpotify = false;
  private listeners = new Set<AudioListener>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.htmlAudio = new Audio();
      this.htmlAudio.loop = true;
      this.htmlAudio.addEventListener('error', () => {
        this.errorMessage =
          'Selected external or local audio asset could not be loaded or played.';
        this.isPlaying = false;
        this.playbackState = 'stopped';
        this.notify();
      });
      this.hydrateDefaultSpotifyMetadata();
    }
  }

  /**
   * Fetches actual playlist title and cover artwork for the default Spotify playlist
   * (https://open.spotify.com/playlist/37i9dQZF1DWZPrKPHbO4OG) via backend or Spotify oEmbed
   * without starting playback.
   */
  public async hydrateDefaultSpotifyMetadata() {
    if (this.hydratedDefaultSpotify || typeof window === 'undefined') return;
    this.hydratedDefaultSpotify = true;
    try {
      const res = await fetch('/api/music/playlists/resolve-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: DEFAULT_SPOTIFY_PLAYLIST_CONFIG.url }),
      });
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      if (data?.ok && data?.playlist) {
        this.updateHydratedSpotifySource(data.playlist);
        return;
      }
    } catch {
      // fallback to direct oEmbed check if backend is unreachable
    }

    try {
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(
          DEFAULT_SPOTIFY_PLAYLIST_CONFIG.url,
        )}`,
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        if (oembed?.title || oembed?.thumbnail_url) {
          this.updateHydratedSpotifySource({
            title: oembed.title,
            artworkUrl: oembed.thumbnail_url,
          });
        }
      }
    } catch {
      // keep default metadata if offline
    }
  }

  private updateHydratedSpotifySource(partial: Partial<MusicSource>) {
    this.sources = this.sources.map((src) => {
      if (src.id !== DEFAULT_SPOTIFY_PLAYLIST_CONFIG.id) return src;
      return {
        ...src,
        title: partial.title || src.title,
        subtitle: partial.subtitle || src.subtitle,
        artworkUrl: partial.artworkUrl || src.artworkUrl,
        ownerName: partial.ownerName || src.ownerName,
        trackCount:
          partial.trackCount !== undefined ? partial.trackCount : src.trackCount,
      };
    });
    this.notify();
  }

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  public getSources(): MusicSource[] {
    return this.sources;
  }

  public registerCustomSource(source: MusicSource) {
    const exists = this.sources.some((s) => s.id === source.id);
    if (exists) {
      this.sources = this.sources.map((s) => (s.id === source.id ? source : s));
    } else {
      this.sources = [source, ...this.sources];
    }
    this.notify();
  }

  public removeCustomSource(sourceId: string) {
    this.sources = this.sources.filter((s) => s.id !== sourceId);
    if (this.currentSourceId === sourceId) {
      this.stopInternalNodes(true);
      this.currentSourceId = null;
    }
    this.notify();
  }

  public syncState(
    settings: MuseumAudioSettings,
    activeRoom: Room | null,
    customSources?: MusicSource[],
  ) {
    if (customSources) {
      const merged = [...BUILTIN_MUSIC_SOURCES];
      customSources.forEach((cs) => {
        const idx = merged.findIndex((m) => m.id === cs.id);
        if (idx >= 0) {
          merged[idx] = cs;
        } else {
          merged.unshift(cs);
        }
      });
      this.sources = merged;
    }

    const prevResolved = this.resolveTargetSource();
    this.settings = settings;
    this.activeRoom = activeRoom;
    const nextResolved = this.resolveTargetSource();

    // Update volume smoothly without restarting if the same source continues across room/floor navigation
    this.applyVolume();

    // Music must NEVER autoplay on application launch, room entry, or floor transition.
    // If already playing, keep playback running seamlessly across room/floor transitions
    // unless the user muted or explicitly selected a different source.
    if (this.isPlaying) {
      if (!nextResolved.source || this.settings.muted) {
        this.stopInternalNodes(false);
      } else if (
        prevResolved.source?.id !== nextResolved.source.id &&
        this.currentSourceId !== nextResolved.source.id
      ) {
        this.startSourcePlayback(nextResolved.source);
      }
    }

    this.notify();
  }

  /**
   * Enforces strict Music Source Priority (Section 11):
   * 1. If muted -> no audio
   * 2. If active room has its own enabled soundtrack -> use it (or silent if room policy is 'silent')
   * 3. Otherwise -> use global museum soundtrack
   * 4. Otherwise -> use enabled ambient soundscape
   * 5. Otherwise -> remain silent
   */
  public resolveTargetSource(): {
    source: MusicSource | null;
    contextLabel: string;
    effectiveVolume: number;
  } {
    if (this.settings.muted) {
      return {
        source: null,
        contextLabel: 'Silent Exploration (Muted)',
        effectiveVolume: 0,
      };
    }

    const roomAudio = this.activeRoom?.audioSettings;
    if (this.activeRoom && roomAudio) {
      if (roomAudio.policy === 'silent' || !roomAudio.enabled) {
        return {
          source: null,
          contextLabel: `${this.activeRoom.name} · Room Audio Disabled`,
          effectiveVolume: 0,
        };
      }
      if (roomAudio.policy === 'custom' || roomAudio.policy === 'ambient') {
        const roomSrc =
          this.sources.find((s) => s.id === roomAudio.sourceId) || null;
        return {
          source: roomSrc,
          contextLabel: `Room Soundtrack · ${this.activeRoom.name}`,
          effectiveVolume: Math.min(
            1,
            Math.max(0, this.settings.masterVolume * (roomAudio.volume ?? 0.8)),
          ),
        };
      }
    }

    if (this.settings.globalEnabled && this.settings.globalSourceId) {
      const globalSrc =
        this.sources.find((s) => s.id === this.settings.globalSourceId) || null;
      return {
        source: globalSrc,
        contextLabel: this.activeRoom
          ? `Global Soundtrack (in ${this.activeRoom.name})`
          : 'Global Museum Soundtrack',
        effectiveVolume: this.settings.masterVolume,
      };
    }

    if (this.settings.ambientEnabled && this.settings.ambientSourceId) {
      const ambSrc =
        this.sources.find((s) => s.id === this.settings.ambientSourceId) || null;
      return {
        source: ambSrc,
        contextLabel: 'Museum Ambient Soundscape',
        effectiveVolume: this.settings.masterVolume * 0.75,
      };
    }

    return {
      source: null,
      contextLabel: 'No Active Soundtrack Configured',
      effectiveVolume: 0,
    };
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.01;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private applyVolume() {
    const resolved = this.resolveTargetSource();
    const targetVol = this.settings.muted ? 0 : resolved.effectiveVolume;

    if (this.masterGain && this.ctx) {
      const fadeSec = Math.max(0.15, this.settings.transitionDuration || 0.8);
      try {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setTargetAtTime(
          targetVol * 0.22,
          this.ctx.currentTime,
          fadeSec * 0.35,
        );
      } catch {
        this.masterGain.gain.value = targetVol * 0.22;
      }
    }

    if (this.htmlAudio) {
      this.htmlAudio.volume = Math.min(1, Math.max(0, targetVol));
      this.htmlAudio.muted = this.settings.muted;
    }
  }

  private stopInternalNodes(resetPlayingFlag = false) {
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    this.activeOscillators = [];

    if (this.activeNoiseNode) {
      try {
        this.activeNoiseNode.disconnect();
      } catch {
        // ignore
      }
      this.activeNoiseNode = null;
    }

    if (this.melodyInterval !== null) {
      if (typeof window !== 'undefined') {
        window.clearInterval(this.melodyInterval);
      }
      this.melodyInterval = null;
    }

    if (this.elapsedInterval !== null) {
      if (typeof window !== 'undefined') {
        window.clearInterval(this.elapsedInterval);
      }
      this.elapsedInterval = null;
    }

    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }

    if (resetPlayingFlag) {
      this.isPlaying = false;
    }
  }

  private startSourcePlayback(source: MusicSource) {
    this.stopInternalNodes(false);
    this.errorMessage = null;

    if (source.availabilityStatus === 'unavailable') {
      this.errorMessage = `Playback unavailable: "${source.title}" requires an authorized external streaming session or valid audio file.`;
      this.isPlaying = false;
      this.notify();
      return;
    }

    this.currentSourceId = source.id;
    this.elapsedSeconds = 0;

    if (typeof window !== 'undefined') {
      this.elapsedInterval = window.setInterval(() => {
        if (this.isPlaying && !this.settings.muted) {
          this.elapsedSeconds += 1;
          this.notify();
        }
      }, 1000);
    }

    // 1. Local uploaded audio file or direct MP3 external preview URL
    if (
      (source.sourceType === 'local_audio' && source.localDataUrl) ||
      (source.sourceType === 'external_preview' && source.externalUrl)
    ) {
      const url = source.localDataUrl || source.externalUrl!;
      if (this.htmlAudio) {
        this.htmlAudio.src = url;
        this.applyVolume();
        this.htmlAudio.play().catch((err) => {
          this.errorMessage = `Audio playback blocked or failed: ${
            err instanceof Error ? err.message : 'Unable to play source'
          }`;
          this.isPlaying = false;
          this.notify();
        });
      }
      this.notify();
      return;
    }

    // 2. Built-in Web Audio API Ambient & Harmonic Synthesizer (also used as warm museum accompaniment for Spotify Embed tracks)
    const ctx = this.ensureAudioContext();
    if (!ctx || !this.masterGain) {
      if (source.sourceType === 'embedded_playlist') {
        this.notify();
        return;
      }
      this.errorMessage = 'Web Audio API is unavailable in this browser.';
      this.isPlaying = false;
      this.notify();
      return;
    }

    const preset = source.synthPreset || 'calm_museum';
    const freqs = CHORD_FREQUENCIES[preset] || CHORD_FREQUENCIES.calm_museum;

    // Warm low-pass filter for acoustic softness
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value =
      preset === 'gentle_rain' || preset === 'ocean_waves' ? 680 : 1050;
    filter.connect(this.masterGain);

    // Create warm harmonic pad oscillators
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (idx - 1.5) * 4;
      oscGain.gain.value = 0.14 / freqs.length;
      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
      this.activeOscillators.push(osc);
    });

    // Optional soft pink-noise texture for rain / ocean / forest presets
    if (
      preset === 'gentle_rain' ||
      preset === 'ocean_waves' ||
      preset === 'forest_ambience'
    ) {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        output[i] = (b0 + b1 + b2) * 0.12;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = preset === 'ocean_waves' ? 0.08 : 0.05;
      whiteNoise.connect(noiseGain);
      noiseGain.connect(filter);
      whiteNoise.start();
      this.activeNoiseNode = whiteNoise;
    }

    // Gentle arpeggiated piano/harp notes every 2.6 seconds
    let noteStep = 0;
    this.melodyInterval = window.setInterval(() => {
      if (!this.isPlaying || this.settings.muted || !this.ctx || !this.masterGain)
        return;
      const now = this.ctx.currentTime;
      const noteOsc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      const baseFreq = freqs[noteStep % freqs.length];
      noteOsc.type = 'sine';
      noteOsc.frequency.value =
        noteStep % 3 === 0 ? baseFreq * 2 : baseFreq * 1.5;

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(0.06, now + 0.18);
      noteGain.gain.exponentialRampToValueAtTime(0.0008, now + 2.2);

      noteOsc.connect(noteGain);
      noteGain.connect(this.masterGain);
      noteOsc.start(now);
      noteOsc.stop(now + 2.25);
      noteStep++;
    }, 2600);

    this.applyVolume();
    this.notify();
  }

  public play() {
    this.userGestureUnlocked = true;
    this.errorMessage = null;
    const resolved = this.resolveTargetSource();
    if (!resolved.source) {
      this.errorMessage =
        this.settings.muted
          ? 'Unmute the museum to start audio playback.'
          : 'Select an active soundtrack to begin playback.';
      this.notify();
      return;
    }
    this.isPlaying = true;
    this.playbackState = 'playing';
    this.startSourcePlayback(resolved.source);
  }

  public pause() {
    this.stopInternalNodes(true);
    this.playbackState = 'paused';
    this.notify();
  }

  public stop() {
    this.stopInternalNodes(true);
    this.elapsedSeconds = 0;
    this.playbackState = 'stopped';
    this.errorMessage = null;
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public cycleTrack(direction: 1 | -1): string | null {
    const available = this.sources.filter(
      (s) => s.availabilityStatus !== 'unavailable',
    );
    if (available.length === 0) return null;
    const resolved = this.resolveTargetSource();
    const currentIdx = available.findIndex(
      (s) => s.id === (resolved.source?.id || this.currentSourceId),
    );
    const nextIdx =
      (currentIdx + direction + available.length) % available.length;
    const nextSource = available[nextIdx];
    if (this.isPlaying) {
      this.startSourcePlayback(nextSource);
    }
    return nextSource.id;
  }

  public getSnapshot(): AudioEngineSnapshot {
    const resolved = this.resolveTargetSource();
    const activePlaying =
      this.isPlaying && !this.settings.muted && Boolean(resolved.source);
    return {
      isPlaying: activePlaying,
      playbackState: activePlaying ? 'playing' : this.playbackState,
      userGestureUnlocked: this.userGestureUnlocked,
      activeSource: resolved.source,
      activeContextLabel: resolved.contextLabel,
      effectiveVolume: resolved.effectiveVolume,
      muted: this.settings.muted,
      elapsedSeconds: this.elapsedSeconds,
      errorMessage: this.errorMessage,
    };
  }
}

export const museumAudioEngine = new MuseumAudioEngine();
