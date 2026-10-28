import { MedicationPassport } from '../../domain/yai/models';

// Heuristic parser for OCR text from Thai/English medicine labels. It only proposes candidate
// values with the line they came from; every value still needs the patient or a pharmacist to check it.

export interface OcrLine {
  text: string;
  /** 0..100 from the OCR engine */
  confidence: number;
}

export interface ParsedValue {
  value: string;
  line: string;
  /** 0..1, taken from the OCR line confidence */
  confidence: number;
}

export interface ParsedLabel {
  displayName: ParsedValue | null;
  strength: ParsedValue | null;
  ingredients: ParsedValue | null;
  directions: ParsedValue | null;
  registration: ParsedValue | null;
  manufacturer: ParsedValue | null;
  form: MedicationPassport['form']['value'];
}

export type ParsedKey = Exclude<keyof ParsedLabel, 'form'>;

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';

/** Thai digits to Arabic, remove spaces OCR inserts between Thai letters, tidy whitespace */
export function normalizeLine(s: string): string {
  return s
    .replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)))
    // OCR often splits sara am (ำ) into nikhahit + sara aa
    .replace(/ํา/g, 'ำ')
    .replace(/([฀-๿])\s+(?=[฀-๿])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const STRENGTH = /(\d+(?:[.,]\d+)?)\s*(mg|มก\.?|มิลลิกรัม|mcg|ไมโครกรัม|g\b|กรัม|ml|มล\.?|มิลลิลิตร|iu)(\s*\/\s*[฀-๿a-z]+)?/i;
const REG_LABELLED = /(?:เลขทะเบียน(?:ยา)?|ทะเบียนยา|เลขที่ใบสำคัญ|reg\.?\s*no\.?|เลข\s*อย\.?|อย\.)\s*[:：.]?\s*([A-Z0-9][A-Z0-9 \-/.]{2,24})/i;
const REG_DRUG = /\b(\d{1,2}[A-Z]|[A-Z])\s?\d{1,5}\/\d{2,4}\b/;
const REG_FOOD = /\b\d{2}-\d-\d{5}-\d-\d{4}\b/;
const DIRECTIONS = /(วันละ|ครั้งละ|รับประทาน|หลังอาหาร|ก่อนอาหาร|ก่อนนอน|take\s+\d|times?\s+(a|per)\s+day|daily)/i;
const INGREDIENTS = /(ส่วนประกอบ|ประกอบด้วย|สารสำคัญ|ตัวยาสำคัญ|ingredients?|each\s+(capsule|tablet)\s+contains|composition)/i;
const MANUFACTURER = /(ผลิตโดย|ผู้ผลิต|ผลิตและจัดจำหน่าย|manufactured\s+by|mfd\.?\s+by|บริษัท.+จำกัด|co\.,?\s*ltd)/i;
const FORMS: [RegExp, NonNullable<MedicationPassport['form']['value']>][] = [
  [/แคปซูล|capsule/i, 'CAPSULE'],
  [/ยาเม็ด|เม็ด|tablet/i, 'TABLET'],
  [/ยาต้ม|decoction/i, 'DECOCTION'],
  [/สารสกัด|extract/i, 'EXTRACT'],
  [/ยาผง|ผง|powder/i, 'POWDER'],
  [/ซอง|sachet/i, 'SACHET'],
];

const afterKeyword = (line: string, re: RegExp) => {
  const m = line.match(re);
  if (!m || m.index === undefined) return line;
  const rest = line.slice(m.index + m[0].length).replace(/^[\s:：.\-]+/, '');
  return rest.length >= 3 ? rest : line;
};

export function parseLabel(rawLines: OcrLine[]): ParsedLabel {
  const lines = rawLines
    .map((l) => ({ text: normalizeLine(l.text), confidence: Math.max(0, Math.min(100, l.confidence)) / 100 }))
    .filter((l) => l.text.length >= 2);
  const pick = (test: (t: string) => string | null): ParsedValue | null => {
    for (const l of lines) {
      const v = test(l.text);
      if (v) return { value: v.trim(), line: l.text, confidence: l.confidence };
    }
    return null;
  };

  const strength = pick((t) => {
    const m = t.match(STRENGTH);
    return m ? `${m[1]} ${m[2]}${m[3] ? ` ${m[3].replace(/\s+/g, ' ').trim()}` : ''}` : null;
  });
  const registration = pick((t) => t.match(REG_LABELLED)?.[1] ?? t.match(REG_FOOD)?.[0] ?? t.match(REG_DRUG)?.[0] ?? null);
  const directions = pick((t) => (DIRECTIONS.test(t) ? t : null));
  const ingredients = pick((t) => (INGREDIENTS.test(t) ? afterKeyword(t, INGREDIENTS) : null));
  const manufacturer = pick((t) => (MANUFACTURER.test(t) ? afterKeyword(t, /(ผลิตโดย|ผู้ผลิต|ผลิตและจัดจำหน่าย|manufactured\s+by|mfd\.?\s+by)/i) : null));

  const used = new Set([strength, registration, directions, ingredients, manufacturer].filter(Boolean).map((p) => p!.line));
  // Name: first line with real letters that is not one of the other fields; a guess, flagged by its low confidence
  const displayName = pick((t) => {
    if (used.has(t) || DIRECTIONS.test(t) || INGREDIENTS.test(t) || MANUFACTURER.test(t) || REG_LABELLED.test(t)) return null;
    const letters = t.replace(/[^A-Za-z฀-๿]/g, '');
    return letters.length >= 3 ? t : null;
  });
  if (displayName) displayName.confidence = Math.min(displayName.confidence, 0.6);

  const all = lines.map((l) => l.text).join(' ');
  const form = FORMS.find(([re]) => re.test(all))?.[1] ?? 'UNKNOWN';

  return { displayName, strength, ingredients, directions, registration, manufacturer, form };
}

/** Which fields were found, for the live "ครบหรือยัง" checklist */
export const PARSED_FIELD_LABEL: Record<ParsedKey, string> = {
  displayName: 'ชื่อยา',
  strength: 'ความแรง',
  ingredients: 'ส่วนประกอบ',
  directions: 'วิธีใช้',
  registration: 'เลข อย.',
  manufacturer: 'ผู้ผลิต',
};
export const PARSED_ORDER: ParsedKey[] = ['displayName', 'strength', 'ingredients', 'directions', 'registration', 'manufacturer'];
