import data from '../../data/hdi/medplant-interactions.json';
import type { HerbDrugInteraction } from '../types/hdi';

// Herb–drug interaction records imported from the medplant database (Faculty of Pharmacy, Mahidol University;
// see scripts/importMedplant.cjs). Every record links to its source article. The records are an automated import
// waiting for pharmacist / Thai traditional medicine review: they flag pairs to check, never say a pair is safe,
// and "no effect reported" rows are kept apart from cautions instead of being shown as reassurance.

export type MedplantSeverity = 'HIGH' | 'MODERATE' | 'LOW' | 'UNSPECIFIED';
export type MedplantEffectKind = 'CAUTION' | 'CONFLICTING' | 'NO_EFFECT_REPORTED' | 'REDUCES_SIDE_EFFECT';

export interface MedplantRow {
  id: string;
  herbId: string;
  herbName: string;
  drugId: string;
  drugName: string;
  drugIsClass: boolean;
  effect: string;
  effectKind: MedplantEffectKind;
  preclinicalHint: boolean;
  severity: MedplantSeverity;
  severityRaw: string;
  recommendation: string;
  articleId: string;
  url: string;
}

export interface MedplantHerb {
  id: string;
  name: string;
  scientificName: string;
  synonyms: string[];
}

interface MedplantDoc {
  source: { name: string; url: string; importedFrom: string; importedAt: string; reviewStatus: string; permission: string };
  herbs: Record<string, Omit<MedplantHerb, 'id'>>;
  rows: MedplantRow[];
}

const DOC = data as MedplantDoc;
export const MEDPLANT_SOURCE = DOC.source;
export const MEDPLANT_ROWS: MedplantRow[] = DOC.rows;
export const MEDPLANT_HERBS: MedplantHerb[] = Object.entries(DOC.herbs).map(([id, h]) => ({ id, ...h }));

export const MEDPLANT_SEVERITY_TH: Record<MedplantSeverity, string> = { HIGH: 'มาก', MODERATE: 'ปานกลาง', LOW: 'น้อย', UNSPECIFIED: 'ไม่ระบุ' };
export const EFFECT_KIND_TH: Record<MedplantEffectKind, string> = {
  CAUTION: 'มีผลต่อยา ควรระวัง',
  CONFLICTING: 'ผลการศึกษายังขัดแย้ง/สรุปไม่ได้',
  NO_EFFECT_REPORTED: 'รายงานว่าไม่พบผลต่อยา (ในการศึกษานั้น)',
  REDUCES_SIDE_EFFECT: 'รายงานว่าช่วยลดผลข้างเคียง/พิษของยา',
};
const SEVERITY_ORDER: Record<MedplantSeverity, number> = { HIGH: 0, MODERATE: 1, LOW: 2, UNSPECIFIED: 3 };

/** "Curcuma longa L." → "curcuma longa"; "Brassica spp." → null (genus only is too broad to match) */
export function binomial(scientific: string): string | null {
  const m = scientific.trim().match(/^([A-Z][a-z]+)\s+([a-z][a-z-]+)/);
  if (!m || m[2] === 'spp' || m[2] === 'sp') return null;
  return `${m[1]} ${m[2]}`.toLowerCase();
}

/**
 * Medplant herb for a product: by botanical binomial first; by Thai name only when medplant has no scientific
 * name (e.g. the Triphala formula), so "ขมิ้นอ้อย" (Curcuma zedoaria) never stands in for ขมิ้นชัน (Curcuma longa).
 */
export function medplantHerbFor(thaiName: string, scientificName: string): MedplantHerb | null {
  const b = binomial(scientificName);
  if (b) {
    const hit = MEDPLANT_HERBS.find((h) => binomial(h.scientificName) === b);
    if (hit) return hit;
  }
  return MEDPLANT_HERBS.find((h) => !binomial(h.scientificName) && h.name.length >= 3 && thaiName.includes(h.name)) ?? null;
}

export function rowsForHerb(herbId: string): MedplantRow[] {
  return MEDPLANT_ROWS.filter((r) => r.herbId === herbId).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.drugName.localeCompare(b.drugName));
}

/** "Warfarin" → "warfarin"; "Penicillin G" → "penicillin"; drug classes have no key */
export function medplantDrugKey(r: Pick<MedplantRow, 'drugName' | 'drugIsClass'>): string | null {
  if (r.drugIsClass) return null;
  const k = r.drugName.split(/[\s(,/]/)[0].toLowerCase();
  return k.length >= 4 ? k : null;
}

/** Cautions and conflicting findings: the rows that should prompt a check with a professional */
export const isCautionRow = (r: MedplantRow) => r.effectKind === 'CAUTION' || r.effectKind === 'CONFLICTING';

/** Medplant cautions whose drug appears in the given medicine names (recorded names only; nothing guessed) */
export function medplantMatchesForNames(rows: MedplantRow[], names: string[]): { row: MedplantRow; name: string }[] {
  const lower = names.filter(Boolean).map((n) => ({ n, l: n.toLowerCase() }));
  const out: { row: MedplantRow; name: string }[] = [];
  for (const row of rows) {
    if (!isCautionRow(row)) continue;
    const key = medplantDrugKey(row);
    if (!key) continue;
    const hit = lower.find((x) => x.l.includes(key));
    if (hit) out.push({ row, name: hit.n });
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/**
 * Medplant cautions of moderate or high severity, shaped as screening rules for the existing CareBridge matchers.
 * Left out: drug classes, herb names shorter than 3 letters (e.g. "งา" would match "งาน"), and pairs the
 * reviewed project table already covers (that table stays the primary record).
 */
export function medplantScreeningRules(existing: HerbDrugInteraction[]): HerbDrugInteraction[] {
  const covered = existing.flatMap((e) =>
    e.herb_thai_name.split('/').map((h) => ({ herb: norm(h).replace(/^(ยาน้ำมัน|ครีม|ยา)/, '').replace(/สกัด$/, ''), drug: norm(e.drug_generic_name.split(/[\s(]/)[0]) }))
  );
  const isCovered = (herb: string, drug: string) => covered.some((c) => c.drug === drug && (c.herb.includes(herb) || herb.includes(c.herb)));
  const herbs = Object.fromEntries(MEDPLANT_HERBS.map((h) => [h.id, h]));
  const seen = new Set<string>();
  const out: HerbDrugInteraction[] = [];
  for (const r of MEDPLANT_ROWS) {
    if (!isCautionRow(r) || (r.severity !== 'HIGH' && r.severity !== 'MODERATE')) continue;
    const key = medplantDrugKey(r);
    if (!key || r.herbName.length < 3) continue;
    if (isCovered(norm(r.herbName), key)) continue;
    // one rule per herb–drug pair: keep the most severe article
    const pair = `${r.herbId}|${key}`;
    if (seen.has(pair)) continue;
    seen.add(pair);
    const strongest = MEDPLANT_ROWS.filter((x) => x.herbId === r.herbId && medplantDrugKey(x) === key && isCautionRow(x)).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])[0];
    out.push({
      interaction_id: strongest.id,
      herb_code_24: '',
      herb_thai_name: r.herbName,
      herb_generic_name: herbs[r.herbId]?.scientificName ?? '',
      drug_id: r.drugId,
      drug_generic_name: r.drugName,
      atc_code: '',
      severity: strongest.severity === 'HIGH' ? 'สูง' : 'ปานกลาง',
      severity_code: strongest.severity === 'HIGH' ? 'HIGH' : 'MODERATE',
      mechanism: strongest.effect,
      clinical_effects: strongest.effect,
      recommendation: strongest.recommendation || 'ปรึกษาแพทย์หรือเภสัชกร',
      evidence_level: 'ไม่ระบุ',
      sources: 'medplant.mahidol.ac.th (Herb-Drug)',
      reviewer: MEDPLANT_SOURCE.reviewStatus,
      review_date: MEDPLANT_SOURCE.importedAt,
      version: 'medplant-import',
      data_disclaimer: MEDPLANT_SOURCE.permission,
      source_url: strongest.url,
      source_db: 'MEDPLANT',
    });
  }
  return out;
}
