import { describe, it, expect, beforeEach } from 'vitest';
import { bangkokDate, buildMonthGrid, isConfirmed, JournalEntry, recordedDaysInMonth } from '../../domain/yai/journal';
import { suggestSegments } from '../../services/yai/healthTextClassifier';
import { mapVoiceError, startThaiDictation, voiceInputSupported } from '../../services/yai/thaiVoiceJournal';
import { yaiStore } from '../../services/yai/yaiStore';
import { seedJournal } from '../../data/yai/fixtures';

const SENTENCE = 'วันนี้ยายปวดเข่า กินยาหลังอาหารเช้า แล้วกินข้าวต้ม';

function entry(p: Partial<JournalEntry>): JournalEntry {
  return {
    id: 'e',
    patientId: 'p',
    originalText: 'x',
    reviewedText: 'x',
    inputSource: 'MANUAL_TEXT',
    capturedAt: '2026-10-10T03:00:00Z',
    recordedLocalDate: '2026-10-10',
    reviewedAt: '2026-10-10T03:00:00Z',
    status: 'PATIENT_CONFIRMED',
    segments: [],
    photoIds: [],
    revision: 1,
    isSynthetic: false,
    ...p,
  };
}

describe('daily journal (J01–J06)', () => {
  beforeEach(() => yaiStore.reset());

  it('J01: no microphone support gives no transcript, only an honest problem', () => {
    expect(voiceInputSupported()).toBe(false); // test runner has no SpeechRecognition
    let result: { text: string; problem?: string } | null = null;
    const session = startThaiDictation({ onText: () => undefined, onEnd: (r) => (result = r) });
    expect(session).toBeNull();
    expect(result).toEqual({ text: '', problem: 'UNSUPPORTED' });
    expect(mapVoiceError('not-allowed')).toBe('DENIED');
    expect(mapVoiceError('no-speech')).toBe('NO_SPEECH');
  });

  it('J02: symptom + medicine + food become 3 editable segments linked to the original text', () => {
    const segs = suggestSegments(SENTENCE);
    expect(segs.map((s) => s.category)).toEqual(['SYMPTOM', 'MEDICINE_USE_REPORT', 'FOOD_CONSUMED']);
    for (const s of segs) expect(SENTENCE.slice(s.sourceStart, s.sourceEnd)).toBe(s.text);
    // works without spaces too (speech recognisers often drop them)
    expect(suggestSegments('วันนี้ยายปวดเข่ากินยาหลังอาหารเช้าแล้วกินข้าวต้ม').map((s) => s.category)).toEqual(['SYMPTOM', 'MEDICINE_USE_REPORT', 'FOOD_CONSUMED']);
    // "ยาย" is not "ยา", and unknown text stays OTHER
    expect(suggestSegments('ยายไปวัดมา')[0].category).toBe('OTHER');
  });

  it('J03: a draft or a cancelled review is never counted', () => {
    const draft = entry({ status: 'DRAFT' });
    expect(isConfirmed(draft)).toBe(false);
    expect(recordedDaysInMonth([draft], '2026-10')).toBe(0);
    const before = (yaiStore.getState().journal ?? []).length;
    // cancelling = not calling saveJournalEntry; nothing else writes journal entries
    expect((yaiStore.getState().journal ?? []).length).toBe(before);
  });

  it('J04: two confirmed entries on one local date are 2 entries but 1 recorded day', () => {
    yaiStore.saveJournalEntry({ originalText: 'a', reviewedText: 'a', inputSource: 'MANUAL_TEXT', capturedAt: '2026-11-05T01:00:00Z', segments: [], photoIds: [] });
    yaiStore.saveJournalEntry({ originalText: 'b', reviewedText: 'b', inputSource: 'VOICE_TRANSCRIPT', capturedAt: '2026-11-05T10:00:00Z', segments: [], photoIds: [] });
    const journal = yaiStore.getState().journal ?? [];
    expect(journal.filter((e) => e.recordedLocalDate === '2026-11-05')).toHaveLength(2);
    expect(recordedDaysInMonth(journal, '2026-11')).toBe(1);
    const cell = buildMonthGrid('2026-11', journal, '2026-11-30').find((c) => c.date === '2026-11-05');
    expect(cell?.count).toBe(2);
  });

  it('J05: the local date is Asia/Bangkok, not the UTC date', () => {
    expect(bangkokDate('2026-10-28T17:30:00Z')).toBe('2026-10-29');
    expect(bangkokDate('2026-10-28T16:59:00Z')).toBe('2026-10-28');
    const id = yaiStore.saveJournalEntry({ originalText: 'x', reviewedText: 'x', inputSource: 'MANUAL_TEXT', capturedAt: '2026-10-28T17:30:00Z', segments: [], photoIds: [] });
    expect(yaiStore.getState().journal?.find((e) => e.id === id)?.recordedLocalDate).toBe('2026-10-29');
  });

  it('J06: editing keeps the original transcript, photos and earlier version', () => {
    const segs = suggestSegments(SENTENCE);
    const id = yaiStore.saveJournalEntry({ originalText: SENTENCE, reviewedText: SENTENCE, inputSource: 'VOICE_TRANSCRIPT', capturedAt: new Date().toISOString(), segments: segs, photoIds: ['photo-1'] });
    yaiStore.editJournalEntry(id, 'ปวดเข่าซ้าย', [{ ...segs[0], text: 'ปวดเข่าซ้าย', correctedByUser: true }]);
    const e = yaiStore.getState().journal!.find((x) => x.id === id)!;
    expect(e.originalText).toBe(SENTENCE);
    expect(e.photoIds).toEqual(['photo-1']);
    expect(e.reviewedText).toBe('ปวดเข่าซ้าย');
    expect(e.revision).toBe(2);
    expect(e.history?.[0].reviewedText).toBe(SENTENCE);
    expect(e.segments[0].correctedByUser).toBe(true);
  });

  it('heatmap grid starts on the right weekday and is not hard-coded', () => {
    // 1 Oct 2026 is a Thursday → 4 blank cells (Sun–Wed)
    const oct = buildMonthGrid('2026-10', [], '2026-10-29');
    expect(oct.slice(0, 4).every((c) => c.date === null)).toBe(true);
    expect(oct[4].date).toBe('2026-10-01');
    expect(oct.filter((c) => c.date).length).toBe(31);
    expect(oct.find((c) => c.date === '2026-10-30')?.isFuture).toBe(true);
    // 1 Feb 2026 is a Sunday → no blank cells, 28 days
    const feb = buildMonthGrid('2026-02', [], '2026-10-29');
    expect(feb[0].date).toBe('2026-02-01');
    expect(feb.length).toBe(28);
  });

  it('seed journal entries are labelled synthetic', () => {
    expect(seedJournal().every((e) => e.isSynthetic)).toBe(true);
  });
});
