import type { FeelingTag, VoiceMeasures, VoiceSample, WellnessCheckin, YaiState } from './models';
import { addDays } from './wellness';

// Voice features for the holistic check-in, kept deliberately modest:
//  - feelings (tired / refreshed / worried / calm) are ASKED, never inferred from the voice;
//  - the voice numbers (speaking pace, pauses, pitch, loudness) are measured on the device and compared only with
//    the same person's own usual values once there are enough samples. They are labelled experimental and are
//    never turned into an emotion, a diagnosis or a score.
// There is no validated model for detecting tiredness or worry from Thai speech, so the app does not claim one.

export const FEELINGS: { tag: FeelingTag; label: string; emoji: string }[] = [
  { tag: 'TIRED', label: 'เหนื่อยล้า', emoji: '😴' },
  { tag: 'REFRESHED', label: 'สดชื่น', emoji: '🌿' },
  { tag: 'WORRIED', label: 'กังวล', emoji: '😟' },
  { tag: 'CALM', label: 'สบายใจ', emoji: '🙂' },
];
export const FEELING_LABEL = Object.fromEntries(FEELINGS.map((f) => [f.tag, f.label])) as Record<FeelingTag, string>;

// ---------- frame analysis (pure) ----------

export interface VoiceFrame {
  /** root-mean-square amplitude of the frame, 0–1 */
  rms: number;
  /** detected pitch in Hz, null when the frame has no clear pitch */
  pitch: number | null;
}

/** Autocorrelation pitch for one frame; null when unvoiced or unclear. Searches 70–400 Hz (adult speech). */
export function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  const n = buf.length;
  let energy = 0;
  for (let i = 0; i < n; i++) energy += buf[i] * buf[i];
  if (energy / n < 1e-5) return null;
  const minLag = Math.floor(sampleRate / 400);
  const maxLag = Math.min(Math.floor(sampleRate / 70), n - 1);
  let bestLag = -1;
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    for (let i = 0; i < n - lag; i++) c += buf[i] * buf[i + lag];
    c /= energy;
    if (c > best) {
      best = c;
      bestLag = lag;
    }
  }
  return best > 0.5 && bestLag > 0 ? sampleRate / bestLag : null;
}

export const frameRms = (buf: Float32Array) => {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
};

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const sd = (xs: number[]) => {
  if (xs.length < 2) return NaN;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

/** Minimum voiced frames before pitch and loudness are reported */
export const MIN_VOICED_FRAMES = 20;

/**
 * Summarise frames into voice measures. The noise floor is the quiet end of this recording, so a noisy room raises
 * the threshold instead of counting noise as voice.
 */
export function summariseFrames(frames: VoiceFrame[], frameSec: number): VoiceMeasures {
  const durationSec = round(frames.length * frameSec);
  if (!frames.length) return { durationSec: 0, voicedSec: 0, pauseRatio: 0, pitchHz: null, pitchSpreadSt: null, loudnessDb: null };
  const sorted = frames.map((f) => f.rms).sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.2)];
  const threshold = Math.max(floor * 3, 0.01);
  const voiced = frames.map((f) => f.rms >= threshold);
  const first = voiced.indexOf(true);
  const last = voiced.lastIndexOf(true);
  const span = first < 0 ? 0 : last - first + 1;
  const voicedCount = voiced.filter(Boolean).length;
  const pauseRatio = span ? round((span - voicedCount) / span, 2) : 0;
  const vf = frames.filter((_, i) => voiced[i]);
  const pitches = vf.map((f) => f.pitch).filter((p): p is number => p !== null);
  const enough = vf.length >= MIN_VOICED_FRAMES;
  const med = median(pitches);
  return {
    durationSec,
    voicedSec: round(voicedCount * frameSec),
    pauseRatio,
    pitchHz: enough && pitches.length >= MIN_VOICED_FRAMES / 2 ? Math.round(med) : null,
    pitchSpreadSt: enough && pitches.length >= MIN_VOICED_FRAMES / 2 ? round(sd(pitches.map((p) => 12 * Math.log2(p / med)))) : null,
    loudnessDb: enough ? round(20 * Math.log10(median(vf.map((f) => f.rms)))) : null,
  };
}

/** Thai characters (spaces and punctuation removed) per voiced second; a rough speaking-pace number */
export function charsPerSec(text: string, voicedSec: number): number | null {
  const chars = text.replace(/[\s.,!?'"()-]/g, '').length;
  if (!chars || voicedSec < 2) return null;
  return round(chars / voicedSec);
}

// ---------- personal baseline (pure) ----------

export const VOICE_BASELINE_MIN = 10;
export type VoiceMetric = 'charsPerSec' | 'pauseRatio' | 'pitchHz' | 'loudnessDb';

const METRIC_WORDS: Record<VoiceMetric, { label: string; up: string; down: string }> = {
  charsPerSec: { label: 'ความเร็วในการพูด', up: 'พูดเร็วกว่าปกติของคุณ', down: 'พูดช้ากว่าปกติของคุณ' },
  pauseRatio: { label: 'ช่วงหยุดระหว่างพูด', up: 'หยุดเว้นระหว่างพูดมากกว่าปกติของคุณ', down: 'หยุดเว้นระหว่างพูดน้อยกว่าปกติของคุณ' },
  pitchHz: { label: 'ระดับเสียง', up: 'เสียงสูงกว่าปกติของคุณ', down: 'เสียงต่ำกว่าปกติของคุณ' },
  loudnessDb: { label: 'ความดังของเสียง', up: 'เสียงดังกว่าปกติของคุณ', down: 'เสียงเบากว่าปกติของคุณ' },
};

export interface VoiceBaseline {
  samples: number;
  /** null until there are VOICE_BASELINE_MIN samples */
  stats: Record<VoiceMetric, { mean: number; sd: number } | null> | null;
}

/** Usual values from the 28 days before `today` (today's samples excluded) */
export function voiceBaseline(samples: VoiceSample[], today: string): VoiceBaseline {
  const from = addDays(today, -28);
  const prior = samples.filter((x) => x.date >= from && x.date < today);
  if (prior.length < VOICE_BASELINE_MIN) return { samples: prior.length, stats: null };
  const stat = (k: VoiceMetric) => {
    const xs = prior.map((x) => x[k]).filter((v): v is number => typeof v === 'number');
    if (xs.length < VOICE_BASELINE_MIN) return null;
    return { mean: xs.reduce((a, b) => a + b, 0) / xs.length, sd: sd(xs) };
  };
  return { samples: prior.length, stats: { charsPerSec: stat('charsPerSec'), pauseRatio: stat('pauseRatio'), pitchHz: stat('pitchHz'), loudnessDb: stat('loudnessDb') } };
}

export interface VoiceObservation {
  metric: VoiceMetric;
  words: string;
}

/** Differences of at least 1.5 standard deviations from the person's own usual value; neutral wording only */
export function voiceObservations(sample: VoiceSample, base: VoiceBaseline): VoiceObservation[] {
  if (!base.stats) return [];
  const out: VoiceObservation[] = [];
  for (const k of Object.keys(METRIC_WORDS) as VoiceMetric[]) {
    const st = base.stats[k];
    const v = sample[k];
    if (!st || typeof v !== 'number' || !(st.sd > 0)) continue;
    const z = (v - st.mean) / st.sd;
    if (Math.abs(z) >= 1.5) out.push({ metric: k, words: z > 0 ? METRIC_WORDS[k].up : METRIC_WORDS[k].down });
  }
  return out;
}

export const voiceMetricLabel = (k: VoiceMetric) => METRIC_WORDS[k].label;

// ---------- feelings over time (pure) ----------

export function feelingCounts(checkins: WellnessCheckin[], today: string, days: number): { tag: FeelingTag; days: number }[] {
  const from = addDays(today, -(days - 1));
  const inRange = checkins.filter((c) => c.date >= from && c.date <= today);
  return FEELINGS.map((f) => ({ tag: f.tag, days: inRange.filter((c) => c.feelings?.includes(f.tag)).length }));
}

export const latestVoiceSample = (s: YaiState, date: string) => (s.voiceSamples ?? []).find((v) => v.date === date);
