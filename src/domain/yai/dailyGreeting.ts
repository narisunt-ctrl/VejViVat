// Daily greeting card for ยายพร้อม: "สวัสดีวันจันทร์" style blessings in the colour of the day, with a Buddha image
// on Buddhist holy days (วันพระ) and special art on important days. Quotes are original short blessings written for
// this app; "เปลี่ยนคำคม" picks another one, and quotes grandma skipped are not shown again for a while.

export type ArtKind = 'FLOWERS' | 'LOTUS' | 'SUN' | 'BUDDHA' | 'HEART';

export interface DayTheme {
  name: string;
  /** traditional Thai colour of the day */
  color: string;
  light: string;
  flower: string;
}

/** index = JS getDay() (0 = Sunday) */
export const DAY_THEMES: DayTheme[] = [
  { name: 'อาทิตย์', color: '#d93b3b', light: '#fde8e8', flower: 'กุหลาบแดง' },
  { name: 'จันทร์', color: '#e0a800', light: '#fff6d6', flower: 'ดาวเรือง' },
  { name: 'อังคาร', color: '#e05a9a', light: '#fde7f1', flower: 'บัวชมพู' },
  { name: 'พุธ', color: '#2f9e5b', light: '#e3f6ea', flower: 'ใบเตย' },
  { name: 'พฤหัสบดี', color: '#ea7a1a', light: '#fdebdc', flower: 'ดาวเรืองส้ม' },
  { name: 'ศุกร์', color: '#2f74d0', light: '#e3eefc', flower: 'อัญชัน' },
  { name: 'เสาร์', color: '#7a4fc9', light: '#efe8fb', flower: 'กล้วยไม้ม่วง' },
];

export interface Occasion {
  id: string;
  title: string;
  art: ArtKind;
  /** true when computed from the moon's phase, not an official calendar */
  approximate?: boolean;
}

/** Important days with fixed solar dates (MM-DD) */
const FIXED_OCCASIONS: Record<string, Occasion> = {
  '01-01': { id: 'new-year', title: 'สวัสดีปีใหม่', art: 'FLOWERS' },
  '04-13': { id: 'songkran', title: 'สวัสดีวันสงกรานต์ วันผู้สูงอายุ', art: 'LOTUS' },
  '04-14': { id: 'family-day', title: 'สวัสดีวันครอบครัว', art: 'HEART' },
  '04-15': { id: 'songkran-3', title: 'สุขสันต์วันขึ้นปีใหม่ไทย', art: 'LOTUS' },
  '08-12': { id: 'mother-day', title: 'สวัสดีวันแม่แห่งชาติ', art: 'HEART' },
  '12-05': { id: 'father-day', title: 'สวัสดีวันพ่อแห่งชาติ', art: 'SUN' },
  '12-31': { id: 'year-end', title: 'สวัสดีวันส่งท้ายปี', art: 'FLOWERS' },
};

const SYNODIC = 29.530588853;
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const PHASES: { at: number; title: string }[] = [
  { at: 0, title: 'วันพระ (แรม 15 ค่ำ)' },
  { at: SYNODIC / 4, title: 'วันพระ (ขึ้น 8 ค่ำ)' },
  { at: SYNODIC / 2, title: 'วันพระใหญ่ (ขึ้น 15 ค่ำ)' },
  { at: (3 * SYNODIC) / 4, title: 'วันพระ (แรม 8 ค่ำ)' },
];

/**
 * Approximate วันพระ: the Bangkok calendar day on which a new moon, quarter moon or full moon falls.
 * The Thai lunar calendar can differ by a day, so the result is labelled approximate.
 */
export function holyDayOn(date: string): Occasion | null {
  const [y, m, d] = date.split('-').map(Number);
  const startUtc = Date.UTC(y, m - 1, d) - 7 * 3_600_000; // Bangkok midnight
  const endUtc = startUtc + 86_400_000;
  const cycles = Math.floor((startUtc - REF_NEW_MOON) / 86_400_000 / SYNODIC);
  for (let c = cycles - 1; c <= cycles + 1; c++) {
    for (const p of PHASES) {
      const t = REF_NEW_MOON + (c * SYNODIC + p.at) * 86_400_000;
      if (t >= startUtc && t < endUtc) return { id: `holy-${date}`, title: p.title, art: 'BUDDHA', approximate: true };
    }
  }
  return null;
}

export function occasionOn(date: string): Occasion | null {
  return FIXED_OCCASIONS[date.slice(5)] ?? holyDayOn(date);
}

const DAY_QUOTES = [
  'เช้านี้ร่าเริง แจ่มใส ขอให้ทุกท่านโชคดีมีชัย',
  'ขอให้วันนี้สุขภาพแข็งแรง ใจเบิกบาน ยิ้มได้ทั้งวัน',
  'อากาศดี ใจก็ดี ขอให้มีความสุขกับคนที่รัก',
  'ค่อย ๆ ทำทีละนิด สุขภาพดีเริ่มที่ใจเรา',
  'ดื่มน้ำ ยืดเส้นยืดสาย ยิ้มให้กัน วันนี้จะเป็นวันที่ดี',
  'ขอให้สิ่งดี ๆ เข้ามาในชีวิต ทั้งวันนี้และทุกวัน',
  'ใจสบาย กายแข็งแรง ลูกหลานรักใคร่ ขอให้มีแต่ความสุข',
  'เช้าใหม่ วันใหม่ ขอให้ทุกอย่างราบรื่นปลอดภัย',
  'ยิ้มรับแสงแดดยามเช้า ความสุขรออยู่ไม่ไกล',
  'ขอบคุณร่างกายที่ดูแลเรามาทุกวัน วันนี้มาดูแลร่างกายกันนะ',
];

const HOLY_QUOTES = [
  'วันพระนี้ ขอให้จิตใจสงบ ร่มเย็น เป็นสุข',
  'ทำบุญ ตักบาตร สวดมนต์ ขอให้บุญรักษา ปลอดภัยทุกประการ',
  'ขอคุณพระศรีรัตนตรัยคุ้มครอง ให้สุขภาพแข็งแรง อายุยืนยาว',
  'ใจที่สงบคือของขวัญ ขอให้วันพระนี้เต็มไปด้วยความสุข',
  'ละความกังวล วางใจให้เบา ขอให้ได้บุญกุศลและความร่มเย็น',
];

const SPECIAL_QUOTES: Record<string, string[]> = {
  'mother-day': ['ขอบคุณแม่ผู้เป็นที่รัก ขอให้แม่สุขภาพแข็งแรงอยู่กับลูกหลานไปนาน ๆ', 'รักของแม่ยิ่งใหญ่ ขอให้แม่มีความสุขทุกวัน'],
  'father-day': ['ขอบคุณพ่อผู้เป็นร่มโพธิ์ร่มไทร ขอให้พ่อแข็งแรงมีความสุข'],
  songkran: ['สงกรานต์นี้ ขอให้ผู้สูงอายุทุกท่านสุขภาพแข็งแรง ลูกหลานรดน้ำขอพร', 'ขอให้ความชุ่มเย็นของสงกรานต์นำความสุขมาให้ตลอดปี'],
  'family-day': ['ครอบครัวพร้อมหน้า คือความสุขที่ยิ่งใหญ่ที่สุด'],
  'songkran-3': ['ขึ้นปีใหม่ไทย ขอให้สุขภาพดี มีแต่สิ่งดี ๆ'],
  'new-year': ['ปีใหม่นี้ ขอให้สุขภาพแข็งแรง สมหวังทุกประการ'],
  'year-end': ['ขอบคุณปีที่ผ่านมา ขอให้ปีหน้าดียิ่งกว่าเดิม'],
};

export interface Greeting {
  date: string;
  title: string;
  quote: string;
  art: ArtKind;
  theme: DayTheme;
  occasion: Occasion | null;
  /** index into the quote list that was used, so "เปลี่ยนคำคม" can move on */
  quoteIndex: number;
  /** variant of the art (different flower arrangement) */
  artVariant: number;
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/**
 * Greeting for a Bangkok date. `seed` moves to the next quote ("เปลี่ยนคำคม"); `skipped` quotes are avoided.
 * The art follows the quote: a holy day always shows the Buddha image, an ordinary day shows flowers in the day colour.
 */
export function greetingFor(date: string, seed = 0, skipped: string[] = []): Greeting {
  const theme = DAY_THEMES[weekdayOf(date)];
  const occasion = occasionOn(date);
  const pool = occasion?.art === 'BUDDHA' ? HOLY_QUOTES : occasion ? SPECIAL_QUOTES[occasion.id] ?? DAY_QUOTES : DAY_QUOTES;
  const usable = pool.filter((q) => !skipped.includes(q));
  const list = usable.length ? usable : pool;
  const daySeed = Number(date.replace(/-/g, '')) % list.length;
  const quoteIndex = (daySeed + seed) % list.length;
  const art: ArtKind = occasion?.art ?? (['FLOWERS', 'SUN', 'LOTUS', 'FLOWERS'] as ArtKind[])[(daySeed + seed) % 4];
  return {
    date,
    title: occasion && occasion.art !== 'BUDDHA' ? occasion.title : `สวัสดีวัน${theme.name}`,
    quote: list[quoteIndex],
    art,
    theme,
    occasion,
    quoteIndex,
    artVariant: (daySeed + seed) % 3,
  };
}
