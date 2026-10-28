import type { JournalInputSource, JournalPhotoTag } from '../../domain/yai/journal';
import type { VoiceProblem } from './thaiVoiceJournal';

// The journal entry being written, handed from the home screen to /yai/journal/process and /yai/journal/review.
// Kept in sessionStorage only: a draft is not a record, it never counts on the calendar until the patient confirms.

export interface JournalDraft {
  /** exactly what was heard, typed or read from photos */
  originalText: string;
  inputSource: JournalInputSource;
  capturedAt: string;
  photoIds: string[];
  photoTags: Record<string, JournalPhotoTag | undefined>;
  ocrEngine?: string;
  /** the text came from the labelled demo sentence, not from the patient */
  isSyntheticSample?: boolean;
  voiceProblem?: VoiceProblem;
}

const KEY = 'yai-journal-draft';

export const journalDraft = {
  get(): JournalDraft | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as JournalDraft) : null;
    } catch {
      return null;
    }
  },
  set(d: JournalDraft) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      // ignore: the draft only lives for this visit anyway
    }
  },
  patch(p: Partial<JournalDraft>) {
    const cur = this.get();
    if (cur) this.set({ ...cur, ...p });
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};

export const SAMPLE_SENTENCE = 'วันนี้ยายปวดเข่า กินยาหลังอาหารเช้า แล้วกินข้าวต้ม';
