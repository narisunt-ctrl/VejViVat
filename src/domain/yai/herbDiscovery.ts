import formulary from '../../../data/formulary/thai-formulary.json';
import hdi from '../../../data/hdi/herb-drug-interactions.json';

// Thai herbal knowledge cards for YaiPrompt Discover, built only from the project's own data files:
// - the national herbal formulary entries (listed indications, contraindications, precautions, source reference);
// - the herb–drug interaction table (severity, evidence level, sources, review status).
// Research evidence is not stored here: the detail page searches PubMed live and shows the study types found.
// Dosing is intentionally not shown to consumers: they are directed to a Thai traditional medicine doctor or pharmacist.

interface FormularyRow {
  drug_code_24: string;
  thai_name: string;
  common_name: string;
  scientific_name: string;
  herb_type: string;
  dosage_form: string;
  taste?: string;
  primary_element?: string;
  indications: string[];
  contraindications: string[];
  precautions: Record<string, string>;
  nlem_status?: string;
  nlem_category?: string;
  verification_status?: string;
  source_reference?: string;
}

interface HdiRow {
  interaction_id: string;
  herb_thai_name: string;
  drug_generic_name: string;
  severity: string;
  severity_code: 'HIGH' | 'MODERATE' | 'LOW' | 'UNCLEAR';
  clinical_effects: string;
  recommendation: string;
  evidence_level: string;
  sources: string;
  reviewer: string;
  data_disclaimer: string;
}

export interface HerbInteraction {
  id: string;
  drug: string;
  severity: HdiRow['severity_code'];
  severityTh: string;
  effect: string;
  advice: string;
  evidenceLevel: string;
  sources: string;
  reviewStatus: string;
}

export interface HerbCard {
  id: string;
  thaiName: string;
  /** base herb name used to match interactions and reviews, e.g. "ขิง" from "ยาแคปซูลขิง" */
  herbKey: string;
  commonName: string;
  scientificName: string;
  type: string;
  form: string;
  taste?: string;
  element?: string;
  listedIndications: string[];
  contraindications: string[];
  precautions: { label: string; text: string }[];
  interactions: HerbInteraction[];
  inNationalList: boolean;
  listCategory?: string;
  reviewStatus: string;
  sourceReference: string;
}

const PRECAUTION_LABEL: Record<string, string> = {
  pregnancy_lactation: 'หญิงตั้งครรภ์และให้นมบุตร',
  pediatric: 'เด็ก',
  elderly: 'ผู้สูงอายุ',
  hepatic_renal: 'ผู้มีโรคตับหรือไต',
  drug_interactions: 'การใช้ร่วมกับยาอื่น',
};

// Herb names that appear inside product names; longest first so "ขมิ้นชัน" wins over shorter matches
const HERB_KEYS = [...new Set((hdi as HdiRow[]).flatMap((r) => r.herb_thai_name.split('/').map((x) => x.trim())))].sort((a, b) => b.length - a.length);

function herbKeyOf(name: string): string {
  return HERB_KEYS.find((k) => name.includes(k)) ?? name.replace(/^ยา(แคปซูล|ชง|ผง|เม็ด)?/, '').replace(/\s*\(.*\)$/, '').trim();
}

const SEVERITY_TH: Record<HdiRow['severity_code'], string> = { HIGH: 'ควรหลีกเลี่ยง/ปรึกษาก่อน (สูง)', MODERATE: 'ต้องระวัง (ปานกลาง)', LOW: 'ระวังเล็กน้อย (ต่ำ)', UNCLEAR: 'ข้อมูลยังไม่ชัด' };

export const HERB_CARDS: HerbCard[] = (formulary as FormularyRow[]).map((f) => {
  const herbKey = herbKeyOf(f.thai_name);
  const interactions = (hdi as HdiRow[])
    .filter((r) => r.herb_thai_name.split('/').some((n) => f.thai_name.includes(n.trim())))
    .map((r) => ({
      id: r.interaction_id,
      drug: r.drug_generic_name,
      severity: r.severity_code,
      severityTh: SEVERITY_TH[r.severity_code],
      effect: r.clinical_effects,
      advice: r.recommendation,
      evidenceLevel: r.evidence_level,
      sources: r.sources,
      reviewStatus: r.reviewer,
    }));
  return {
    id: f.drug_code_24,
    thaiName: f.thai_name,
    herbKey,
    commonName: f.common_name,
    scientificName: f.scientific_name,
    type: f.herb_type,
    form: f.dosage_form,
    taste: f.taste,
    element: f.primary_element,
    listedIndications: f.indications ?? [],
    contraindications: f.contraindications ?? [],
    precautions: Object.entries(f.precautions ?? {}).map(([k, text]) => ({ label: PRECAUTION_LABEL[k] ?? k, text })),
    interactions,
    inNationalList: f.nlem_status === 'ใช่',
    listCategory: f.nlem_category,
    reviewStatus: f.verification_status ?? 'ยังไม่ระบุสถานะการตรวจสอบ',
    sourceReference: f.source_reference ?? '',
  };
});

/** Search Thai, common and scientific names (case-insensitive, ignores spaces) */
export function searchHerbs(q: string, cards: HerbCard[] = HERB_CARDS): HerbCard[] {
  const n = q.replace(/\s+/g, '').toLowerCase();
  if (!n) return cards;
  return cards.filter((c) => [c.thaiName, c.commonName, c.scientificName, c.herbKey].some((x) => x.replace(/\s+/g, '').toLowerCase().includes(n)));
}

/** Featured card rotates by date only */
export function herbOfTheDay(date: string, cards: HerbCard[] = HERB_CARDS): HerbCard {
  return cards[Number(date.replace(/-/g, '')) % cards.length];
}

/** Words a consumer page must never use about a herb (checked by tests on all generated text) */
export const FORBIDDEN_CLAIMS = /รักษาได้แน่นอน|หายขาด|รักษาได้ทุกโรค|ปลอดภัย 100|ไม่มีผลข้างเคียง|แทนยา/;

/**
 * Interactions whose drug name appears in the user's own medicine list (name or ingredient as recorded).
 * Medicines with no recorded name are skipped; nothing is guessed.
 */
export function interactionsWithMyMedicines(card: HerbCard, medicines: { displayName: { value: string | null }; ingredients: { value: string | null }[] }[]): { interaction: HerbInteraction; medicine: string }[] {
  const out: { interaction: HerbInteraction; medicine: string }[] = [];
  for (const i of card.interactions) {
    const key = i.drug.split(/[\s(]/)[0].toLowerCase();
    if (key.length < 4) continue;
    for (const m of medicines) {
      const names = [m.displayName.value, ...m.ingredients.map((x) => x.value)].filter((x): x is string => !!x);
      if (names.some((n) => n.toLowerCase().includes(key))) out.push({ interaction: i, medicine: m.displayName.value ?? names[0] });
    }
  }
  return out;
}
