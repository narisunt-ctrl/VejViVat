import type { ElementSummary } from '../../services/yai/elementSummaryAdapter';
import type { HerbCard } from './herbDiscovery';
import { interactionsWithMyMedicines, medplantWithMyMedicines } from './herbDiscovery';

// Herbs and the user's element, for learning and for a conversation with a Thai traditional medicine doctor.
// Inputs come only from what already exists: the Smutthan assessment of the clinic-linked case (unchanged formula,
// via elementSummaryAdapter) and each formulary herb's taste and element as written in the formulary.
// This is a comparison of tastes, not a recommendation: it never ranks herbs as "best", never gives a dose, puts
// herbs that have a caution with the user's own medicines in a separate list, and needs an AVAILABLE assessment
// (no assessment → nothing is matched, nothing is guessed).

/** Taste words used in the Smutthan engine's recommended tastes and in the formulary taste field */
const TASTES = ['เผ็ดร้อน', 'สุขุม', 'เปรี้ยว', 'ฝาด', 'หวาน', 'เค็ม', 'มัน', 'ขม', 'เย็น', 'จืด'] as const;
export type Taste = (typeof TASTES)[number];

/** "รสขม (ดับพิษร้อน)" → "ขม"; "รสเผ็ดร้อนเล็กน้อย" → "เผ็ดร้อน"; "รสหวานน้อย" → "หวาน" */
export function tastesIn(text: string): Taste[] {
  return TASTES.filter((t) => text.includes(t));
}

export type MyElement = 'fire' | 'water' | 'wind' | 'earth';
export function elementOf(dominantTh: string): MyElement | null {
  if (dominantTh.includes('ไฟ')) return 'fire';
  if (dominantTh.includes('น้ำ')) return 'water';
  if (dominantTh.includes('ลม')) return 'wind';
  if (dominantTh.includes('ดิน')) return 'earth';
  return null;
}

export interface HerbElementMatch {
  card: HerbCard;
  /** tastes of this herb that are among the tastes the text gives for today's element */
  matchedTastes: Taste[];
  /** the assessment's own advice warns against this kind of herb (e.g. hot remedies when fire dominates) */
  textCaution: string | null;
  /** the herb has a recorded caution with a medicine in the user's list */
  medicineCautions: number;
}

export interface HerbElementResult {
  status: 'AVAILABLE' | 'UNKNOWN';
  recommendedTastes: Taste[];
  element: MyElement | null;
  /** taste matches without a medicine caution */
  matches: HerbElementMatch[];
  /** taste matches that have a caution with the user's medicines: shown apart, never as suggestions */
  withMedicineCaution: HerbElementMatch[];
  /** herbs whose taste the assessment's advice says to avoid today */
  textCautions: HerbElementMatch[];
  missingInputs: string[];
}

type Med = { displayName: { value: string | null }; ingredients: { value: string | null }[] };

export function matchHerbsToElement(summary: ElementSummary, cards: HerbCard[], medicines: Med[]): HerbElementResult {
  if (summary.status !== 'AVAILABLE') {
    return { status: 'UNKNOWN', recommendedTastes: [], element: null, matches: [], withMedicineCaution: [], textCautions: [], missingInputs: summary.missingInputs };
  }
  const recommended = [...new Set(summary.dynamic.recommendedTaste.flatMap(tastesIn))];
  const element = elementOf(summary.dynamic.dominantTh);
  // the engine's lifestyle advice for fire says to avoid hot remedies; no other avoid-rule is stated, so none is invented
  const avoidHot = element === 'fire' && summary.dynamic.lifestyleAdvice.some((a) => a.includes('รสร้อน'));

  const rows: HerbElementMatch[] = cards
    .filter((c) => c.source === 'FORMULARY' && c.taste)
    .map((card) => {
      const herbTastes = tastesIn(card.taste ?? '');
      const hot = /ร้อน/.test(card.taste ?? '');
      return {
        card,
        matchedTastes: herbTastes.filter((t) => recommended.includes(t)),
        textCaution: avoidHot && hot ? 'คำแนะนำของการประเมินวันนี้ (ธาตุไฟเด่น) ให้งดยาตำรับรสร้อนจัด' : null,
        medicineCautions: interactionsWithMyMedicines(card, medicines).length + medplantWithMyMedicines(card, medicines).length,
      };
    });

  const tasteMatch = rows.filter((r) => r.matchedTastes.length > 0 && !r.textCaution);
  const byName = (a: HerbElementMatch, b: HerbElementMatch) => a.card.thaiName.localeCompare(b.card.thaiName, 'th');
  return {
    status: 'AVAILABLE',
    recommendedTastes: recommended,
    element,
    matches: tasteMatch.filter((r) => r.medicineCautions === 0).sort(byName),
    withMedicineCaution: tasteMatch.filter((r) => r.medicineCautions > 0).sort(byName),
    textCautions: rows.filter((r) => r.textCaution).sort(byName),
    missingInputs: [],
  };
}
