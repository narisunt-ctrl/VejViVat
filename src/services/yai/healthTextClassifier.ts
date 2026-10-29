import type { JournalCategory, SuggestedSegment } from '../../domain/yai/journal';

// Conservative draft splitter for the daily journal: Thai keyword rules, no language model.
// It only suggests a category for each part of what the patient said; she reviews and can change or remove each one.
// It never names a disease, a medicine identity, a dose or a time, and anything it cannot place stays "OTHER".

export const CLASSIFIER_NAME = 'กฎคำสำคัญภาษาไทย (ไม่ใช่ AI วินิจฉัย)';

// "ยา" but not "ยาย" (grandmother)
const MEDICINE_RE = /(ยา(?!ย)|สมุนไพร|แคปซูล|เม็ด|ลูกกลอน|ยาหม่อง|ยาดม|วิตามิน|อาหารเสริม|ฉีด)/;
const SYMPTOM_RE =
  /(ปวด|เจ็บ|เมื่อย|ไอ|ไข้|เวียนหัว|เวียนศีรษะ|มึน|คลื่นไส้|อาเจียน|ท้องอืด|ท้องเฟ้อ|จุกเสียด|แน่นท้อง|ท้องผูก|ท้องเสีย|ถ่ายเหลว|เหนื่อย|อ่อนเพลีย|บวม|คัน|ผื่น|เหน็บชา|มือชา|เท้าชา|ชาตาม|หายใจไม่อิ่ม|ใจสั่น|เจ็บหน้าอก|แสบ|ร้อนใน|ขัด|ตึง|ตาพร่า|หูอื้อ|ไม่สบาย|ไม่ค่อยดี)/;
const MOOD_RE = /(เครียด|เหงา|กังวล|เศร้า|ดีใจ|สบายใจ|มีความสุข|หงุดหงิด|ท้อ|กลัว|ใจไม่ดี|คิดมาก|อารมณ์)/;
const SLEEP_RE = /(นอน|หลับ|ตื่นกลางดึก|ตื่นเช้า|งีบ)/;
const ACTIVITY_RE = /(เดินเล่น|เดินออกกำลัง|ออกกำลัง|รำไม้พลอง|รำ|ทำสวน|กายบริหาร|ยืดเส้น|ปั่นจักรยาน|ว่ายน้ำ|โยคะ|ไทเก็ก)/;
const LIFE_RE = /(หลาน|ลูก|เพื่อน|ญาติ|ไปวัด|ทำบุญ|อยู่คนเดียว|คุยกับ|ชมรม|ผู้ดูแล|ครอบครัว)/;
const FOOD_RE =
  /(ข้าว|อาหาร|กับข้าว|แกง|ผัด|ต้มจืด|ต้มยำ|ผัก|ผลไม้|ขนม|นม|กาแฟ|น้ำชา|ชาเขียว|ดื่มชา|น้ำเต้าหู้|โจ๊ก|ก๋วยเตี๋ยว|ปลา|หมู|ไก่|ไข่|ส้ม|กล้วย|มะละกอ|ดื่มน้ำ|น้ำผลไม้|ขนมปัง|บะหมี่|ส้มตำ)/;

// split on spaces, punctuation and Thai connectors; then before an eating/drinking verb that starts a new action
const CONNECTOR_RE = /\s+|[,，、;]|แล้วก็|แล้ว|และ|ส่วน|แต่|จากนั้น/;
const ACTION_START_RE = /(?<!รับประ)(?<!ประ)(?=(?:กิน|ทาน|ดื่ม))/;

function classify(text: string): { category: JournalCategory; confidence: number } {
  // medicine first: "กินยาหลังอาหาร" mentions food words but is a statement about medicine use
  if (MEDICINE_RE.test(text)) return { category: 'MEDICINE_USE_REPORT', confidence: 0.8 };
  if (SYMPTOM_RE.test(text)) return { category: 'SYMPTOM', confidence: 0.8 };
  if (MOOD_RE.test(text)) return { category: 'MOOD', confidence: 0.7 };
  if (SLEEP_RE.test(text)) return { category: 'SLEEP', confidence: 0.7 };
  if (FOOD_RE.test(text)) return { category: 'FOOD_CONSUMED', confidence: 0.7 };
  if (ACTIVITY_RE.test(text)) return { category: 'ACTIVITY', confidence: 0.6 };
  if (LIFE_RE.test(text)) return { category: 'LIFE_CONTEXT', confidence: 0.6 };
  return { category: 'OTHER', confidence: 0 };
}

let counter = 0;
const segId = () => `seg-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** Split free text into suggested segments, each linked back to its position in the original text */
export function suggestSegments(original: string): SuggestedSegment[] {
  const text = original.trim();
  if (!text) return [];
  const pieces = text
    .split(CONNECTOR_RE)
    .flatMap((p) => (p ? p.split(ACTION_START_RE) : []))
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const segments: SuggestedSegment[] = [];
  let cursor = 0;
  for (const piece of pieces) {
    const start = original.indexOf(piece, cursor);
    const end = start >= 0 ? start + piece.length : undefined;
    if (start >= 0) cursor = start + piece.length;
    const { category, confidence } = classify(piece);
    const prev = segments[segments.length - 1];
    // keep words like "วันนี้" or "ยาย" with the statement that follows instead of making an empty "other"
    if (prev && prev.category === 'OTHER' && prev.text.length <= 8 && category !== 'OTHER') {
      prev.text = `${prev.text} ${piece}`;
      prev.category = category;
      prev.confidence = confidence;
      prev.sourceEnd = end;
      continue;
    }
    if (prev && category === 'OTHER' && piece.length <= 3) {
      prev.text = `${prev.text} ${piece}`;
      prev.sourceEnd = end;
      continue;
    }
    segments.push({ id: segId(), category, text: piece, sourceStart: start >= 0 ? start : undefined, sourceEnd: end, confidence, correctedByUser: false });
  }
  return segments;
}
