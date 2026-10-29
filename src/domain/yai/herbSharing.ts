import type { HerbReview, YaiState } from './models';
import { isConfirmed } from './journal';
import { HERB_CARDS } from './herbDiscovery';

// Herb data sharing from ยายพร้อม to CareBridge, two separate purposes:
// - CARE: the clinic the user consented to (scope HERB_DATA) sees which herbs she uses, from where, with dates.
// - RESEARCH: only with the separate research consent; a de-identified record (pseudonymous id, age band, herb,
//   duration, rating, side-effect level, month) with no name, no free text and no exact dates.
// Research signals are shown only for groups of at least K_MIN users, and are hypotheses for researchers, not
// evidence that a herb works.

export const RESEARCH_NOTICE_VERSION = '1.0';
export const K_MIN = 5;

/** Herb names known to the app, longest first ("ขมิ้นชัน" before "ขมิ้น") */
const HERB_KEYS = [...new Set(HERB_CARDS.map((c) => c.herbKey).filter((k) => k.length >= 2))].sort((a, b) => b.length - a.length);

export function herbsIn(text: string | null | undefined): string[] {
  if (!text) return [];
  let rest = text.replace(/\s+/g, '');
  const out: string[] = [];
  for (const k of HERB_KEYS) {
    if (rest.includes(k)) {
      out.push(k);
      rest = rest.split(k).join('·');
    }
  }
  return out;
}

export interface HerbUse {
  herb: string;
  source: 'MEDICINE_LIST' | 'JOURNAL' | 'REVIEW';
  detail: string;
  date: string;
}

/** What the user's own records say about herb use (for the CARE view and the preview) */
export function herbUseRecords(s: YaiState): HerbUse[] {
  const out: HerbUse[] = [];
  for (const m of s.medicines) {
    for (const herb of herbsIn([m.displayName.value, ...m.ingredients.map((i) => i.value)].join(' '))) {
      out.push({ herb, source: 'MEDICINE_LIST', detail: m.displayName.value ?? herb, date: m.updatedAt.slice(0, 10) });
    }
  }
  for (const e of s.journal ?? []) {
    if (!isConfirmed(e)) continue;
    for (const seg of e.segments) {
      if (seg.category !== 'MEDICINE_USE_REPORT' && seg.category !== 'FOOD_CONSUMED') continue;
      for (const herb of herbsIn(seg.text)) out.push({ herb, source: 'JOURNAL', detail: seg.text, date: e.recordedLocalDate });
    }
  }
  for (const r of (s.herbReviews ?? []).filter((x) => x.isSelf)) {
    out.push({ herb: r.herbName, source: 'REVIEW', detail: `รีวิว ${r.rating} ดาว · ใช้ ${r.weeksUsed} สัปดาห์`, date: r.at.slice(0, 10) });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export interface ResearchHerbEntry {
  herb: string;
  weeksUsed: number | null;
  rating: HerbReview['rating'] | null;
  sideEffects: HerbReview['sideEffects'] | null;
  wouldRecommend: boolean | null;
  /** YYYY-MM only */
  month: string;
}

export interface ResearchRecord {
  pseudoId: string;
  ageBand: string;
  herbs: ResearchHerbEntry[];
  contactable: boolean;
  isSynthetic: boolean;
}

/** FNV-1a; a stable pseudonym, not reversible to a name in this record (real use: keyed hash held by the platform) */
function pseudo(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `P-${h.toString(16).padStart(8, '0')}`;
}

export const ageBand = (age: number) => `${Math.floor(age / 10) * 10}–${Math.floor(age / 10) * 10 + 9} ปี`;

/** The de-identified record that would be shared for research; null without the research consent */
export function researchRecord(s: YaiState): ResearchRecord | null {
  if (!s.settings.herbResearch?.research) return null;
  const byHerb = new Map<string, ResearchHerbEntry>();
  for (const u of herbUseRecords(s)) {
    const review = (s.herbReviews ?? []).find((r) => r.isSelf && r.herbName === u.herb);
    const prev = byHerb.get(u.herb);
    if (prev && prev.rating !== null) continue;
    byHerb.set(u.herb, {
      herb: u.herb,
      weeksUsed: review?.weeksUsed ?? null,
      rating: review?.rating ?? null,
      sideEffects: review?.sideEffects ?? null,
      wouldRecommend: review?.wouldRecommend ?? null,
      month: u.date.slice(0, 7),
    });
  }
  return { pseudoId: pseudo(s.patient.id), ageBand: ageBand(s.patient.age), herbs: [...byHerb.values()], contactable: !!s.settings.herbResearch.contact, isSynthetic: true }; // the prototype store holds synthetic data only
}

// ---------- synthetic research cohort (deterministic, labelled) ----------

const COHORT_HERBS = ['ขมิ้นชัน', 'ฟ้าทะลายโจร', 'ขิง', 'ไพล', 'เถาวัลย์เปรียง', 'บัวบก', 'มะขามป้อม', 'กระชายดำ'];

export function syntheticCohort(size = 160): ResearchRecord[] {
  const rows: ResearchRecord[] = [];
  for (let i = 0; i < size; i++) {
    const n = (i * 37 + 11) % 101;
    const herbs: ResearchHerbEntry[] = [];
    const count = 1 + (n % 3);
    for (let j = 0; j < count; j++) {
      const herb = COHORT_HERBS[(i + j * 3) % (i % 7 === 0 ? 8 : 6)];
      if (herbs.some((h) => h.herb === herb)) continue;
      const k = (n + j * 13) % 10;
      herbs.push({
        herb,
        weeksUsed: 2 + (k % 8),
        rating: ([3, 4, 4, 5, 3, 4, 2, 5, 4, 3] as const)[k],
        sideEffects: k === 6 ? 'BOTHERSOME' : k % 4 === 0 ? 'MILD' : 'NONE',
        wouldRecommend: k !== 6 && k !== 4,
        month: `2026-${String(1 + (n % 9)).padStart(2, '0')}`,
      });
    }
    rows.push({ pseudoId: `S-${String(i + 1).padStart(4, '0')}`, ageBand: ageBand(40 + (n % 36)), herbs, contactable: n % 3 === 0, isSynthetic: true });
  }
  return rows;
}

export interface HerbSignal {
  herb: string;
  users: number;
  suppressed: boolean;
  avgRating: number | null;
  adverseShare: number | null;
  bothersomeShare: number | null;
  recommendShare: number | null;
  medianWeeks: number | null;
  contactable: number | null;
}

/** Per-herb signals; groups smaller than K_MIN are suppressed so no individual stands out */
export function herbSignals(records: ResearchRecord[], k = K_MIN): HerbSignal[] {
  const by = new Map<string, { entries: ResearchHerbEntry[]; contactable: number }>();
  for (const r of records) {
    for (const h of r.herbs) {
      const g = by.get(h.herb) ?? { entries: [], contactable: 0 };
      g.entries.push(h);
      if (r.contactable) g.contactable++;
      by.set(h.herb, g);
    }
  }
  const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const share = (xs: boolean[]) => (xs.length ? Math.round((xs.filter(Boolean).length / xs.length) * 100) : null);
  return [...by.entries()]
    .map(([herb, g]) => {
      const users = g.entries.length;
      if (users < k) return { herb, users, suppressed: true, avgRating: null, adverseShare: null, bothersomeShare: null, recommendShare: null, medianWeeks: null, contactable: null };
      const rated = g.entries.filter((e) => e.rating !== null);
      const weeks = g.entries.map((e) => e.weeksUsed).filter((w): w is number => w !== null).sort((a, b) => a - b);
      const se = g.entries.filter((e) => e.sideEffects !== null);
      return {
        herb,
        users,
        suppressed: false,
        avgRating: mean(rated.map((e) => e.rating!)),
        adverseShare: share(se.map((e) => e.sideEffects !== 'NONE')),
        bothersomeShare: share(se.map((e) => e.sideEffects === 'BOTHERSOME')),
        recommendShare: share(g.entries.filter((e) => e.wouldRecommend !== null).map((e) => !!e.wouldRecommend)),
        medianWeeks: weeks.length ? weeks[Math.floor(weeks.length / 2)] : null,
        contactable: g.contactable < k ? null : g.contactable,
      };
    })
    .sort((a, b) => b.users - a.users);
}
