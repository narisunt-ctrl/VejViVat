// Daily health journal (สมุดบันทึกสุขภาพรายวัน) for ยายพร้อม.
// A journal entry records what the patient said, typed or photographed, split into suggested categories that she
// confirms. It is a patient statement: never a diagnosis, never a medication order, never a reminder schedule.

import type { PatientId } from './models';

export type JournalInputSource = 'VOICE_TRANSCRIPT' | 'MANUAL_TEXT' | 'PHOTO_OCR' | 'CAREGIVER_TEXT';
export type JournalCategory = 'SYMPTOM' | 'MEDICINE_USE_REPORT' | 'FOOD_CONSUMED' | 'OTHER';
export type JournalReviewStatus = 'DRAFT' | 'PATIENT_CONFIRMED' | 'CAREGIVER_CONFIRMED';
/** What a photo in the journal shows, tagged by the user after taking it (never detected from the image) */
export type JournalPhotoTag = 'MEDICINE_LABEL' | 'UNLABELED_MEDICINE' | 'FOOD' | 'OTHER';

export interface SuggestedSegment {
  id: string;
  category: JournalCategory;
  /** the patient's own wording, never a medical diagnosis */
  text: string;
  sourceStart?: number;
  sourceEnd?: number;
  /** keyword-rule match strength (0..1); says nothing about clinical correctness */
  confidence?: number;
  correctedByUser: boolean;
  /** patient said she does not know this detail (e.g. the medicine's name) */
  unknown?: boolean;
}

export interface JournalRevision {
  revision: number;
  reviewedText: string;
  segments: SuggestedSegment[];
  editedAt: string;
}

export interface JournalEntry {
  id: string;
  patientId: PatientId;
  /** exactly what was heard, typed or read from the photo; never rewritten */
  originalText: string;
  reviewedText: string;
  inputSource: JournalInputSource;
  /** ISO timestamp (UTC) of capture */
  capturedAt: string;
  /** YYYY-MM-DD in Asia/Bangkok at capture */
  recordedLocalDate: string;
  reviewedAt: string | null;
  status: JournalReviewStatus;
  segments: SuggestedSegment[];
  photoIds: string[];
  photoTags?: JournalPhotoTag[];
  /** OCR engine that read the photo text, for PHOTO_OCR entries */
  ocrEngine?: string;
  /** medicine records created from this entry (e.g. an unlabeled capsule saved as pending identification) */
  linkedMedicineIds?: string[];
  /** the patient pressed "มีแค่นี้": she has nothing more to add */
  patientSaidComplete?: boolean;
  revision: number;
  /** earlier versions; the original text and photos are never overwritten */
  history?: JournalRevision[];
  isSynthetic: boolean;
}

export const TIME_ZONE = 'Asia/Bangkok';

/** YYYY-MM-DD of an instant in Asia/Bangkok (not the UTC date) */
export function bangkokDate(at: Date | string): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Only confirmed entries count; a draft or a cancelled review never shows on the calendar */
export function isConfirmed(e: JournalEntry): boolean {
  return e.status === 'PATIENT_CONFIRMED' || e.status === 'CAREGIVER_CONFIRMED';
}

/** Number of confirmed entries per Bangkok date */
export function entriesPerDay(entries: JournalEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of entries) if (isConfirmed(e)) counts.set(e.recordedLocalDate, (counts.get(e.recordedLocalDate) ?? 0) + 1);
  return counts;
}

/** Distinct days with at least one confirmed entry in the month "YYYY-MM" (several entries on one day = 1 day) */
export function recordedDaysInMonth(entries: JournalEntry[], yearMonth: string): number {
  return [...entriesPerDay(entries).keys()].filter((d) => d.startsWith(`${yearMonth}-`)).length;
}

export interface HeatmapCell {
  /** YYYY-MM-DD, or null for the blank cells before the 1st */
  date: string | null;
  day: number | null;
  count: number;
  /** 0 = none, 1 = one entry, 2 = two, 3 = three or more; shows how much was recorded, not how healthy */
  level: 0 | 1 | 2 | 3;
  isToday: boolean;
  isFuture: boolean;
}

/**
 * Month grid with 7 columns starting on Sunday (อา.). The weekday of the 1st is computed from the calendar date
 * itself (UTC noon of that date), so it does not depend on the device time zone.
 */
export function buildMonthGrid(yearMonth: string, entries: JournalEntry[], today: string): HeatmapCell[] {
  const [y, m] = yearMonth.split('-').map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1, 12)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0, 12)).getUTCDate();
  const counts = entriesPerDay(entries);
  const cells: HeatmapCell[] = Array.from({ length: firstWeekday }, () => ({ date: null, day: null, count: 0, level: 0, isToday: false, isFuture: false }));
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${yearMonth}-${String(day).padStart(2, '0')}`;
    const count = counts.get(date) ?? 0;
    cells.push({ date, day, count, level: count >= 3 ? 3 : (count as 0 | 1 | 2), isToday: date === today, isFuture: date > today });
  }
  return cells;
}

export function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1, 12));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

/** "ตุลาคม 2569": Buddhist-era display only; storage stays ISO */
export function thaiMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
}

export function thaiDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

export const CATEGORY_LABEL: Record<JournalCategory, string> = {
  SYMPTOM: 'อาการ',
  MEDICINE_USE_REPORT: 'ยา/สมุนไพร',
  FOOD_CONSUMED: 'อาหารที่กิน',
  OTHER: 'เรื่องอื่น ๆ',
};

export const SOURCE_LABEL: Record<JournalInputSource, string> = {
  VOICE_TRANSCRIPT: 'ยายเล่า',
  MANUAL_TEXT: 'พิมพ์เอง',
  PHOTO_OCR: 'OCR จากรูป',
  CAREGIVER_TEXT: 'ผู้ดูแลให้ข้อมูล',
};

export const PHOTO_TAG_LABEL: Record<JournalPhotoTag, string> = {
  MEDICINE_LABEL: 'ฉลากยา',
  UNLABELED_MEDICINE: 'ยาไม่มีฉลาก',
  FOOD: 'อาหาร',
  OTHER: 'อื่น ๆ',
};
