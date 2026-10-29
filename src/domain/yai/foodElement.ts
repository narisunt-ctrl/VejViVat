import type { YaiState } from './models';
import type { ElementSummary } from '../../services/yai/elementSummaryAdapter';
import { isConfirmed } from './journal';
import { tastesIn, Taste } from './herbElement';
import { addDays } from './wellness';
import { foodsIn, THAI_FOODS, ThaiFood } from '../../data/yai/thaiFoodTastes';
import { MEDPLANT_HERBS, medplantMatchesForNames, rowsForHerb } from '../medplant';

// Food by element for ยายพร้อม. Uses what the user said she ate (confirmed journal entries), the tastes the
// Smutthan assessment of the clinic-linked case gives for today's element (unchanged formula), and a food→taste
// table awaiting expert review. Chronic conditions and medicines always come before the element: they hide or
// annotate menu ideas. Nothing here is a diet prescription; there is no calorie count and no treatment claim.

export interface EatenFood {
  date: string;
  text: string;
  foods: ThaiFood[];
  synthetic: boolean;
}

/** Food statements from confirmed journal entries in the last `days` days, with the dishes recognised in them */
export function eatenFoods(s: YaiState, today: string, days = 7): EatenFood[] {
  const since = addDays(today, -(days - 1));
  return (s.journal ?? [])
    .filter((e) => isConfirmed(e) && e.recordedLocalDate >= since && e.recordedLocalDate <= today)
    .flatMap((e) => e.segments.filter((x) => x.category === 'FOOD_CONSUMED').map((x) => ({ date: e.recordedLocalDate, text: x.text, foods: foodsIn(x.text), synthetic: e.isSynthetic })))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface TasteBalance {
  taste: Taste;
  count: number;
  recommended: boolean;
}

/** How often each taste appeared in recognised dishes this week; an observation, not a score */
export function tasteBalance(eaten: EatenFood[], recommendedTastes: Taste[]): { rows: TasteBalance[]; recognised: number; unrecognised: number } {
  const counts = new Map<Taste, number>();
  let recognised = 0;
  let unrecognised = 0;
  for (const e of eaten) {
    if (e.foods.length === 0) unrecognised++;
    for (const f of e.foods) {
      recognised++;
      for (const t of f.tastes) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const tastes = [...new Set<Taste>([...recommendedTastes, ...counts.keys()])];
  return {
    rows: tastes.map((taste) => ({ taste, count: counts.get(taste) ?? 0, recommended: recommendedTastes.includes(taste) })).sort((a, b) => Number(b.recommended) - Number(a.recommended) || b.count - a.count),
    recognised,
    unrecognised,
  };
}

export interface DietContext {
  hypertension: boolean;
  diabetes: boolean;
  kidney: boolean;
  onWarfarin: boolean;
  conditions: string[];
}

export function dietContext(summary: ElementSummary, s: YaiState): DietContext {
  const conditions = summary.status === 'AVAILABLE' ? summary.dietReviewNeeded : [];
  const has = (re: RegExp) => conditions.some((d) => re.test(d));
  const medNames = s.medicines.flatMap((m) => [m.displayName.value, ...m.ingredients.map((i) => i.value)]).filter((x): x is string => !!x);
  return {
    hypertension: has(/hypertension|ความดัน/i),
    diabetes: has(/diabet|เบาหวาน/i),
    kidney: has(/kidney|renal|ไต|CKD/i),
    onWarfarin: medNames.some((n) => /warfarin|วาร์ฟาริน/i.test(n)),
    conditions,
  };
}

export interface MenuIdea {
  food: ThaiFood;
  matchedTastes: Taste[];
  notes: string[];
}

/**
 * Menu ideas whose tastes match today's recommended tastes. Hidden: salty dishes with hypertension or kidney
 * disease, sweet dishes with diabetes. Annotated: leafy greens for people on warfarin (keep the amount steady),
 * oily dishes, and dishes containing a herb that has a caution with the user's medicines.
 */
export function menuIdeas(summary: ElementSummary, s: YaiState, limit = 6): MenuIdea[] {
  if (summary.status !== 'AVAILABLE') return [];
  const recommended = [...new Set(summary.dynamic.recommendedTaste.flatMap(tastesIn))];
  const ctx = dietContext(summary, s);
  const medNames = s.medicines.flatMap((m) => [m.displayName.value, ...m.ingredients.map((i) => i.value)]).filter((x): x is string => !!x);
  return THAI_FOODS.filter((f) => f.tastes.some((t) => recommended.includes(t)))
    .filter((f) => !(f.salty && (ctx.hypertension || ctx.kidney)) && !(f.sweet && ctx.diabetes))
    .map((food) => {
      const notes: string[] = [];
      if (food.vitaminKGreens && ctx.onWarfarin) notes.push('ผักใบเขียว: ผู้ใช้ยาวาร์ฟารินกินได้ แต่ควรกินปริมาณใกล้เคียงกันทุกสัปดาห์ ไม่เพิ่มหรือลดฮวบฮาบ');
      if (food.oily) notes.push('ของทอด/มัน: กินแต่น้อย');
      for (const herb of food.herbs ?? []) {
        const mp = MEDPLANT_HERBS.find((h) => h.name === herb);
        if (!mp) continue;
        const hits = medplantMatchesForNames(rowsForHerb(mp.id), medNames);
        if (hits.length) notes.push(`มี${herb}: ฐานข้อมูลมหิดลมีข้อควรระวังกับ ${[...new Set(hits.map((h) => h.row.drugName))].join(', ')} ปริมาณในอาหารมักน้อย แต่ควรถามเภสัชกร`);
      }
      return { food, matchedTastes: food.tastes.filter((t) => recommended.includes(t)), notes };
    })
    .sort((a, b) => b.matchedTastes.length - a.matchedTastes.length || a.notes.length - b.notes.length)
    .slice(0, limit);
}

