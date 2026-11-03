import type { GameEventType } from './engine';

// Music and sound effects made with WebAudio (no sound files). The tune is a cheerful pentatonic loop with a
// plucked, ระนาด-like voice. Nothing plays until the player starts the game (browsers require a tap first).

type Note = [number, number]; // semitones from A4 (null rest = NaN), length in eighths

const MELODY: Note[] = [
  [3, 1], [5, 1], [7, 1], [10, 1], [12, 2], [10, 1], [7, 1],
  [5, 1], [7, 1], [10, 2], [7, 1], [5, 1], [3, 2],
  [0, 1], [3, 1], [5, 1], [7, 1], [10, 1], [7, 1], [5, 1], [3, 1],
  [5, 2], [3, 1], [0, 1], [3, 4],
];
const BASS: Note[] = [
  [-21, 4], [-14, 4], [-16, 4], [-9, 4],
  [-21, 4], [-14, 4], [-16, 4], [-21, 4],
];

const hz = (semi: number) => 440 * Math.pow(2, semi / 12);

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private mi = 0;
  private bi = 0;
  private bassTime = 0;
  on = true;

  /** call from a user gesture */
  start() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.6 : 0;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.master);
    }
    void this.ctx.resume();
  }

  setOn(on: boolean) {
    this.on = on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0.6 : 0, this.ctx.currentTime, 0.05);
  }

  playMusic() {
    if (!this.ctx || this.timer !== null) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.bassTime = this.nextTime;
    const eighth = 0.19;
    this.timer = window.setInterval(() => {
      const c = this.ctx!;
      while (this.nextTime < c.currentTime + 0.4) {
        const [n, len] = MELODY[this.mi++ % MELODY.length];
        if (!Number.isNaN(n)) this.pluck(hz(n), this.nextTime, eighth * len * 0.9, this.musicGain!, 'triangle', 0.5);
        this.nextTime += eighth * len;
      }
      while (this.bassTime < c.currentTime + 0.4) {
        const [n, len] = BASS[this.bi++ % BASS.length];
        this.pluck(hz(n), this.bassTime, eighth * len * 0.8, this.musicGain!, 'sine', 0.55);
        this.bassTime += eighth * len;
      }
    }, 100);
  }

  stopMusic() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private pluck(f: number, at: number, dur: number, out: AudioNode, type: OscillatorType, vol: number) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.08, dur));
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  private sweep(f0: number, f1: number, dur: number, type: OscillatorType = 'square', vol = 0.18) {
    const c = this.ctx!;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private notes(semis: number[], step = 0.08, type: OscillatorType = 'triangle', vol = 0.3) {
    const t = this.ctx!.currentTime;
    semis.forEach((s, i) => this.pluck(hz(s), t + i * step, step * 2, this.master!, type, vol));
  }

  private thump() {
    const c = this.ctx!;
    const t = c.currentTime;
    const buf = c.createBuffer(1, c.sampleRate * 0.15, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
    const src = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.gain.value = 0.5;
    src.buffer = buf;
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
  }

  sfx(type: GameEventType) {
    if (!this.ctx || !this.on) return;
    switch (type) {
      case 'jump':
        return this.sweep(300, 620, 0.16, 'square', 0.08);
      case 'seed':
        return this.notes([15, 22], 0.05, 'triangle', 0.22);
      case 'herb':
      case 'bump':
        return this.notes([12, 16, 19, 24], 0.06, 'triangle', 0.28);
      case 'lotus':
      case 'chest':
        return this.notes([12, 16, 19, 24, 28, 31], 0.07, 'triangle', 0.3);
      case 'power':
        return this.notes([7, 12, 16, 19, 24, 19, 24], 0.05, 'square', 0.12);
      case 'stomp':
        this.thump();
        return this.sweep(500, 160, 0.12, 'square', 0.12);
      case 'bossHit':
        this.thump();
        return this.sweep(220, 60, 0.35, 'sawtooth', 0.18);
      case 'bossDown':
        return this.notes([0, 4, 7, 12, 7, 12, 16, 19, 24], 0.09, 'triangle', 0.32);
      case 'hurt':
      case 'fall':
        return this.sweep(520, 110, 0.4, 'sawtooth', 0.14);
      case 'shield':
        return this.sweep(900, 300, 0.25, 'triangle', 0.2);
      case 'spring':
        return this.sweep(200, 900, 0.3, 'sine', 0.3);
      case 'checkpoint':
        return this.notes([7, 12, 16], 0.09, 'triangle', 0.28);
      case 'locked':
        return this.notes([-5, -8], 0.12, 'square', 0.1);
      case 'win':
        return this.notes([0, 4, 7, 12, 16, 19, 24, 28], 0.1, 'triangle', 0.32);
      case 'over':
        return this.notes([7, 4, 0, -5], 0.18, 'triangle', 0.3);
    }
  }

  close() {
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }
}
