/**
 * Lightweight procedural Web Audio sound effects for MEMORA Childhood Bedroom interactions.
 * - Unlocked strictly on explicit user gesture (never autoplays).
 * - Persists user mute preference in localStorage.
 * - Zero external audio file fetches or npm dependencies.
 */

const SFX_MUTE_STORAGE_KEY = 'memora_bedroom_sfx_muted';

export type BedroomSfxId =
  | 'click'
  | 'wood_creak'
  | 'drawer_slide'
  | 'page_flip'
  | 'flashlight_toggle'
  | 'crt_boot'
  | 'fabric_rustle'
  | 'radio_dial'
  | 'projector_click'
  | 'cricket_hit'
  | 'clock_chime';

class BedroomSfxController {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;
  private listeners: Set<(muted: boolean) => void> = new Set();

  constructor() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.muted = window.localStorage.getItem(SFX_MUTE_STORAGE_KEY) === 'true';
      }
    } catch {
      this.muted = false;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(nextMuted: boolean): void {
    this.muted = nextMuted;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SFX_MUTE_STORAGE_KEY, nextMuted ? 'true' : 'false');
      }
    } catch {
      // ignore storage quota/privacy errors
    }
    this.listeners.forEach((cb) => cb(this.muted));
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public subscribe(cb: (muted: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx || this.ctx.state === 'closed') {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 0.45);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  public play(id: BedroomSfxId): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    try {
      switch (id) {
        case 'click':
        case 'flashlight_toggle': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(id === 'flashlight_toggle' ? 1180 : 860, now);
          osc.frequency.exponentialRampToValueAtTime(220, now + 0.045);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.055);
          break;
        }
        case 'wood_creak': {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(145, now);
          osc.frequency.linearRampToValueAtTime(112, now + 0.14);
          osc.frequency.linearRampToValueAtTime(168, now + 0.28);
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(340, now);
          filter.Q.setValueAtTime(4.5, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.32);
          break;
        }
        case 'drawer_slide':
        case 'page_flip':
        case 'fabric_rustle': {
          const src = ctx.createBufferSource();
          src.buffer = this.getNoiseBuffer(ctx);
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          filter.type = 'bandpass';
          if (id === 'drawer_slide') {
            filter.frequency.setValueAtTime(420, now);
            filter.frequency.linearRampToValueAtTime(260, now + 0.22);
            filter.Q.setValueAtTime(1.8, now);
          } else if (id === 'page_flip') {
            filter.frequency.setValueAtTime(1750, now);
            filter.frequency.exponentialRampToValueAtTime(920, now + 0.14);
            filter.Q.setValueAtTime(2.2, now);
          } else {
            filter.frequency.setValueAtTime(980, now);
            filter.frequency.linearRampToValueAtTime(640, now + 0.2);
            filter.Q.setValueAtTime(1.2, now);
          }
          const dur = id === 'page_flip' ? 0.15 : 0.24;
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(id === 'page_flip' ? 0.055 : 0.045, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          src.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          src.start(now);
          src.stop(now + dur + 0.02);
          break;
        }
        case 'crt_boot': {
          const freqs = [330, 440, 659.25];
          freqs.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const t = now + idx * 0.075;
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.045, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.26);
          });
          break;
        }
        case 'radio_dial':
        case 'projector_click': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(id === 'projector_click' ? 620 : 940, now);
          osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }
        case 'cricket_hit': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(290, now);
          osc.frequency.exponentialRampToValueAtTime(95, now + 0.08);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }
        case 'clock_chime': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.04, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.45);
          break;
        }
      }
    } catch {
      // ignore transient audio errors
    }
  }

  public dispose(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.noiseBuffer = null;
  }
}

export const bedroomSfx = new BedroomSfxController();
