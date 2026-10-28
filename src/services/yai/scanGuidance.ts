import { CaptureSide, MedicationPassport } from '../../domain/yai/models';
import { SIDE_INFO, SIDE_ORDER, nextRecommendedSide } from '../../domain/yai/policies';
import { field } from '../../data/yai/fixtures';
import { OcrLine, ParsedKey, ParsedLabel, PARSED_FIELD_LABEL, parseLabel } from './labelParser';
import { OCR_ENGINE } from './thaiOcr';

// Live guidance while scanning: combine the sides the user photographed with the fields
// the OCR actually found, so the phone screen can say what is still missing.

const FIELD_SIDE: Record<ParsedKey, CaptureSide> = {
  displayName: 'FRONT',
  strength: 'FRONT',
  ingredients: 'BACK',
  directions: 'DIRECTIONS',
  registration: 'REGISTRATION',
  manufacturer: 'BACK',
};
/** Fields that matter most for the pre-visit packet; reg. no. and manufacturer are nice to have */
export const KEY_FIELDS: ParsedKey[] = ['displayName', 'strength', 'ingredients', 'directions'];

export interface Guidance {
  tone: 'go' | 'retry' | 'done' | 'start';
  text: string;
  side: CaptureSide | null;
}

export function scanGuidance(captured: CaptureSide[], parsed: ParsedLabel | null): Guidance {
  if (captured.length === 0) return { tone: 'start', text: 'เริ่มจากด้านหน้า ให้เห็นชื่อยาชัดๆ', side: 'FRONT' };
  if (!parsed) {
    const next = nextRecommendedSide(captured);
    return next
      ? { tone: 'go', text: `ต่อไปถ่าย${SIDE_INFO[next].label} ${SIDE_INFO[next].why}`, side: next }
      : { tone: 'done', text: 'ถ่ายครบทุกด้านแล้ว', side: null };
  }
  const missing = KEY_FIELDS.filter((k) => !parsed[k]);
  for (const k of missing) {
    const side = FIELD_SIDE[k];
    if (!captured.includes(side)) return { tone: 'go', text: `ยังไม่พบ${PARSED_FIELD_LABEL[k]} ต่อไปถ่าย${SIDE_INFO[side].label}`, side };
  }
  if (missing.length > 0) {
    const k = missing[0];
    const side = FIELD_SIDE[k];
    return { tone: 'retry', text: `ยังอ่าน${PARSED_FIELD_LABEL[k]}ไม่ออก ลองถ่าย${SIDE_INFO[side].label}ใหม่ ให้ใกล้และนิ่งขึ้น`, side };
  }
  if (!parsed.registration && !captured.includes('REGISTRATION')) {
    return { tone: 'done', text: 'ได้ข้อมูลหลักครบแล้ว ถ้าสะดวกถ่ายเลข อย. เพิ่มได้ หรือไปดูข้อมูลเลย', side: 'REGISTRATION' };
  }
  return { tone: 'done', text: 'ได้ข้อมูลหลักครบแล้ว กด "ไปดูข้อมูล" ได้เลย', side: null };
}

/** Merge OCR lines from several photos into one parse */
export function parsePhotos(
  photos: { id?: string; side?: CaptureSide; ocr?: { lines: OcrLine[]; confidence: number | null; engine?: string; model?: string; editedText?: string; verified?: boolean } }[]
): ParsedLabel | null {
  // Read the front first so name and strength come from the side that is meant to show them
  const rank = (s?: CaptureSide) => (s ? SIDE_ORDER.indexOf(s) : SIDE_ORDER.length);
  // Text the patient checked or corrected replaces the raw OCR lines of that photo
  const linesOf = (p: (typeof photos)[number]): OcrLine[] =>
    p.ocr?.editedText !== undefined
      ? p.ocr.editedText.split('\n').map((text) => ({ text, confidence: p.ocr!.confidence, verified: !!p.ocr!.verified, photoId: p.id, engine: p.ocr!.model ?? p.ocr!.engine }))
      : (p.ocr?.lines ?? []).map((l) => ({ ...l, photoId: p.id, engine: p.ocr!.model ?? p.ocr!.engine }));
  const lines = [...photos].sort((a, b) => rank(a.side) - rank(b.side)).flatMap(linesOf);
  return lines.length ? parseLabel(lines) : null;
}

/** Draft passport from real OCR. Values are proposals from the photo, never confirmed or scheduled. */
export function draftFromParsed(parsed: ParsedLabel, patientId: string, photoIds: string[], nowIso: string, id: string): MedicationPassport {
  const f = (p: ParsedLabel[ParsedKey]) =>
    field<string>(p?.value ?? null, 'PHOTO_LABEL', {
      isSynthetic: false,
      // Checked text is the patient's statement about the label, not an OCR guess
      verification: p?.verified ? 'PATIENT_REPORTED' : 'UNVERIFIED',
      extractionConfidence: p && !p.verified && p.confidence !== null ? p.confidence : undefined,
      rawText: p?.line,
      // Point at the exact photo the value was read from, not just every photo in the session
      evidencePhotoIds: p?.photoId ? [p.photoId] : photoIds,
      ocrEngine: p?.engine,
      capturedAt: nowIso,
    });
  return {
    id,
    patientId,
    version: 1,
    kind: parsed.ingredients?.value.match(/[฀-๿]/) ? 'HERBAL_FORMULA' : 'UNKNOWN',
    form: field(parsed.form ?? 'UNKNOWN', 'PHOTO_LABEL', { isSynthetic: false, capturedAt: nowIso }),
    displayName: f(parsed.displayName),
    ingredients: parsed.ingredients ? [f(parsed.ingredients)] : [],
    labelStrength: f(parsed.strength),
    labelDirections: f(parsed.directions),
    registrationNumber: f(parsed.registration),
    manufacturer: f(parsed.manufacturer),
    useReports: [],
    photoIds,
    status: 'DRAFT',
    pendingIdentification: false,
    unresolvedQuestions: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export { OCR_ENGINE };
