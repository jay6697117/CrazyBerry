import { ACTION_SOUND_TYPES } from '../utils/Constants.js';

const ACTION_LIST = Object.values(ACTION_SOUND_TYPES);

export class AudioSystem {
  constructor({ enabled = true, basePath = 'assets/sounds' } = {}) {
    this.enabled = enabled;
    this.basePath = basePath;
    this.samples = new Map();
    this.ready = false;
    this.audioContext = null;
  }

  async init() {
    if (!this.enabled) return false;
    if (typeof Audio === 'undefined') return false;

    for (const action of ACTION_LIST) {
      const clip = new Audio(`${this.basePath}/${action}.wav`);
      clip.preload = 'auto';
      clip.volume = 0.8;
      this.samples.set(action, clip);
    }

    this.ready = true;
    return true;
  }

  play(name) {
    this.playAction(name);
  }

  playAction(type) {
    if (!this.enabled) return;
    this.lastPlayed = type;

    const sample = this.samples.get(type);
    if (!sample) {
      this.playSynth(type);
      return;
    }

    try {
      const clip = sample.cloneNode();
      const playResult = clip.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {
          this.playSynth(type);
        });
      }
    } catch {
      this.playSynth(type);
    }
  }

  playSynth(type) {
    const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextCtor) return;

    if (!this.audioContext) {
      this.audioContext = new AudioContextCtor();
    }

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const profile = {
      water: { freq: 560, shape: 'sine', dur: 0.14 },
      harvest: { freq: 880, shape: 'triangle', dur: 0.18 },
      till: { freq: 180, shape: 'square', dur: 0.1 },
      plant: { freq: 420, shape: 'triangle', dur: 0.11 }
    };

    const config = profile[type] ?? { freq: 360, shape: 'sine', dur: 0.1 };

    osc.type = config.shape;
    osc.frequency.setValueAtTime(config.freq, now);
    osc.frequency.exponentialRampToValueAtTime(config.freq * 1.08, now + config.dur);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.065, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + config.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + config.dur);
  }
}
