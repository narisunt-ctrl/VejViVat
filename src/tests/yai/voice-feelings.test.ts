import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { yaiStore, demoNow } from '../../services/yai/yaiStore';
import { bangkokDate } from '../../domain/yai/journal';
import { addDays } from '../../domain/yai/wellness';
import {
  charsPerSec,
  detectPitch,
  feelingCounts,
  frameRms,
  summariseFrames,
  voiceBaseline,
  voiceObservations,
  VOICE_BASELINE_MIN,
  VoiceFrame,
} from '../../domain/yai/voiceFeatures';
import type { VoiceMeasures, VoiceSample, WellnessCheckin } from '../../domain/yai/models';

const sine = (hz: number, sr = 16000, n = 2048, amp = 0.3) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / sr));

describe('voice frame analysis', () => {
  it('finds the pitch of a clean tone and ignores silence', () => {
    for (const hz of [110, 180, 250]) expect(Math.abs(detectPitch(sine(hz), 16000)! - hz)).toBeLessThan(hz * 0.03);
    expect(detectPitch(new Float32Array(2048), 16000)).toBeNull();
    expect(frameRms(sine(200, 16000, 2048, 0.5))).toBeCloseTo(0.5 / Math.SQRT2, 2);
  });

  it('separates voice from the room noise and measures pauses inside speech only', () => {
    const quiet: VoiceFrame = { rms: 0.002, pitch: null };
    const voice: VoiceFrame = { rms: 0.1, pitch: 200 };
    // 10 quiet, 30 voice, 10 pause, 30 voice, 20 quiet
    const frames = [...Array(10).fill(quiet), ...Array(30).fill(voice), ...Array(10).fill(quiet), ...Array(30).fill(voice), ...Array(20).fill(quiet)];
    const m = summariseFrames(frames, 0.05);
    expect(m.durationSec).toBe(5);
    expect(m.voicedSec).toBe(3);
    expect(m.pauseRatio).toBeCloseTo(10 / 70, 2); // leading and trailing silence do not count as pauses
    expect(m.pitchHz).toBe(200);
    expect(m.pitchSpreadSt).toBe(0);
    expect(m.loudnessDb).toBe(-20);
  });

  it('reports no pitch or loudness from too little voice', () => {
    const m = summariseFrames([{ rms: 0.1, pitch: 200 }, ...Array(30).fill({ rms: 0.001, pitch: null })], 0.05);
    expect(m.pitchHz).toBeNull();
    expect(m.loudnessDb).toBeNull();
    expect(summariseFrames([], 0.05).voicedSec).toBe(0);
  });

  it('counts Thai characters per voiced second, not spaces', () => {
    expect(charsPerSec('วันนี้ ปวดเข่า', 4)).toBe(3.3); // 13 characters including vowel and tone marks
    expect(charsPerSec('', 4)).toBeNull();
    expect(charsPerSec('สวัสดี', 1)).toBeNull(); // too short to mean anything
  });
});

describe('personal voice baseline', () => {
  const today = '2026-10-30';
  const sample = (i: number, over: Partial<VoiceSample> = {}): VoiceSample => ({
    id: `v${i}`,
    date: addDays(today, -(i + 1)),
    at: '',
    durationSec: 10,
    voicedSec: 6,
    pauseRatio: 0.2 + (i % 2) * 0.02,
    pitchHz: 200 + (i % 3),
    pitchSpreadSt: 2,
    loudnessDb: -20 + (i % 2),
    charsPerSec: 5 + (i % 2) * 0.2,
    isSynthetic: true,
    ...over,
  });

  it('waits for enough samples before comparing', () => {
    const few = Array.from({ length: VOICE_BASELINE_MIN - 1 }, (_, i) => sample(i));
    expect(voiceBaseline(few, today).stats).toBeNull();
    expect(voiceObservations(sample(99, { date: today, charsPerSec: 1 }), voiceBaseline(few, today))).toEqual([]);
  });

  it('describes only clear differences from the person’s own usual voice, in neutral words', () => {
    const base = voiceBaseline(Array.from({ length: 12 }, (_, i) => sample(i)), today);
    expect(base.samples).toBe(12);
    const slow = voiceObservations(sample(99, { date: today, charsPerSec: 3, pauseRatio: 0.45 }), base);
    expect(slow.map((o) => o.metric).sort()).toEqual(['charsPerSec', 'pauseRatio']);
    expect(slow.find((o) => o.metric === 'charsPerSec')!.words).toBe('พูดช้ากว่าปกติของคุณ');
    expect(voiceObservations(sample(99, { date: today }), base)).toEqual([]);
    const text = JSON.stringify(slow);
    expect(text).not.toMatch(/เหนื่อย|กังวล|ซึมเศร้า|เครียด|ป่วย|โรค/); // never an emotion or a diagnosis
  });

  it('ignores samples older than 4 weeks', () => {
    const old = Array.from({ length: 12 }, (_, i) => sample(i, { date: addDays(today, -40 - i) }));
    expect(voiceBaseline(old, today).stats).toBeNull();
  });
});

describe('feelings are asked, not inferred', () => {
  beforeEach(() => yaiStore.reset());

  it('saves picked feelings into today’s check-in without touching other answers', () => {
    yaiStore.saveCheckin({ sleepHours: 7, energy: 4 });
    yaiStore.setFeelings(['TIRED', 'WORRIED', 'TIRED']);
    const today = bangkokDate(demoNow(yaiStore.getState()));
    const c = yaiStore.getState().checkins!.find((x) => x.date === today)!;
    expect(c).toMatchObject({ sleepHours: 7, energy: 4, feelings: ['TIRED', 'WORRIED'], source: 'SELF_REPORTED' });
    expect(yaiStore.getState().audit[0].action).toBe('FEELINGS_SAVED');
  });

  it('counts feelings by day in the chosen window', () => {
    const c = (date: string, feelings: WellnessCheckin['feelings']): WellnessCheckin => ({ id: date, date, at: '', feelings, source: 'SELF_REPORTED', isSynthetic: true });
    const rows = [c('2026-10-30', ['TIRED']), c('2026-10-28', ['TIRED', 'CALM']), c('2026-10-01', ['WORRIED'])];
    const week = Object.fromEntries(feelingCounts(rows, '2026-10-30', 7).map((x) => [x.tag, x.days]));
    expect(week).toEqual({ TIRED: 2, REFRESHED: 0, WORRIED: 0, CALM: 1 });
    expect(feelingCounts(rows, '2026-10-30', 30).find((x) => x.tag === 'WORRIED')!.days).toBe(1);
  });

  it('keeps voice numbers only while the user has voice measures on, and can delete them', () => {
    const m: VoiceMeasures = { durationSec: 8, voicedSec: 5, pauseRatio: 0.2, pitchHz: 190, pitchSpreadSt: 2, loudnessDb: -22 };
    yaiStore.addVoiceSample(m, 5);
    expect(yaiStore.getState().voiceSamples ?? []).toHaveLength(0); // off by default
    yaiStore.setVoiceMeasures(true);
    yaiStore.addVoiceSample(m, 5);
    yaiStore.addVoiceSample({ ...m, voicedSec: 1 }, null); // too little voice
    expect(yaiStore.getState().voiceSamples).toHaveLength(1);
    expect(Object.keys(yaiStore.getState().voiceSamples![0])).not.toContain('audio');
    yaiStore.clearVoiceSamples();
    expect(yaiStore.getState().voiceSamples).toEqual([]);
    expect(yaiStore.getState().audit[0].action).toBe('VOICE_MEASURES_CHANGED');
  });

  it('has no code path that sets feelings from the voice', () => {
    const src = readFileSync('src/domain/yai/voiceFeatures.ts', 'utf8') + readFileSync('src/services/yai/voiceMeter.ts', 'utf8');
    expect(src).not.toMatch(/setFeelings|feelings\s*[:=]/);
  });
});
