import type { HerbDrugInteraction } from '../../types/hdi';
import type { MedicationPassport } from './models';
import type { JournalEntry } from './journal';
import type { SyncedOrderRecord } from './prescriptionSync';

// Screening of what the patient takes (medicine list, clinician orders) against what she says she ate or used
// (journal), using the existing herb–drug interaction database (data/hdi). It only flags possible pairs for a
// clinician to look at. It never says "safe": no match means "not among the pairs in this database".

export type InteractionSourceKind = 'MEDICINE_LIST' | 'CLINICIAN_ORDER' | 'JOURNAL';

export interface InteractionSource {
  kind: InteractionSourceKind;
  /** what to show (e.g. the medicine name) */
  text: string;
  /** what to match against, when it is longer than the shown text (name + ingredients) */
  match?: string;
  /** YYYY-MM-DD for journal statements */
  date?: string;
}

export interface InteractionFlag {
  rule: HerbDrugInteraction;
  herbSources: InteractionSource[];
  drugSources: InteractionSource[];
}

export interface InteractionScreen {
  flags: InteractionFlag[];
  rulesChecked: number;
  /** medicines whose identity is unknown: the screen is incomplete while any exist */
  unidentifiedCount: number;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/** "ยาน้ำมันไพล / ครีมไพล" → ["ยาน้ำมันไพล", "ครีมไพล", "ไพล"]; "กระเทียมสกัด" → ["กระเทียมสกัด", "กระเทียม"] */
export function herbAliases(rule: HerbDrugInteraction): string[] {
  const out = new Set<string>();
  for (const part of rule.herb_thai_name.split('/')) {
    const p = norm(part);
    if (!p) continue;
    out.add(p);
    const root = p.replace(/^(ยาน้ำมัน|ครีม|ยา)/, '').replace(/สกัด$/, '');
    if (root.length >= 2) out.add(root);
  }
  return [...out];
}

/** "Warfarin sodium" → "warfarin"; "Aspirin (Acetylsalicylic acid)" → "aspirin" */
export function drugKey(rule: HerbDrugInteraction): string {
  return norm(rule.drug_generic_name.split(/[\s(]/)[0]);
}

export function screenPatientInteractions(
  data: { medicines: MedicationPassport[]; journal: JournalEntry[]; syncedOrders: SyncedOrderRecord[] },
  rules: HerbDrugInteraction[],
  sinceDate: string
): InteractionScreen {
  const items: InteractionSource[] = [];
  for (const m of data.medicines) {
    const match = [m.displayName.value ?? '', ...m.ingredients.map((i) => i.value ?? '')].join(' ').trim();
    if (match) items.push({ kind: m.linkedOrderKey ? 'CLINICIAN_ORDER' : 'MEDICINE_LIST', text: m.displayName.value ?? match, match });
  }
  for (const r of data.syncedOrders) {
    if (r.snapshot.medicineName && r.status !== 'DISCONTINUED') items.push({ kind: 'CLINICIAN_ORDER', text: r.snapshot.medicineName });
  }
  for (const e of data.journal) {
    if (e.recordedLocalDate < sinceDate || e.status === 'DRAFT') continue;
    for (const s of e.segments) {
      if (s.category === 'FOOD_CONSUMED' || s.category === 'MEDICINE_USE_REPORT') items.push({ kind: 'JOURNAL', text: s.text, date: e.recordedLocalDate });
    }
  }

  // the same statement can come from two places (e.g. an order and its medicine record); list it once
  const seen = new Set<string>();
  const unique = items.filter((i) => {
    const k = `${i.kind}|${norm(i.text)}|${i.date ?? ''}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
  items.length = 0;
  items.push(...unique);

  const flags: InteractionFlag[] = [];
  for (const rule of rules) {
    const aliases = herbAliases(rule);
    const dk = drugKey(rule);
    const herbSources = items.filter((i) => aliases.some((a) => norm(i.match ?? i.text).includes(a)));
    const drugSources = items.filter((i) => i.kind !== 'JOURNAL' && norm(i.match ?? i.text).includes(dk));
    // the same item can't be both sides (e.g. a combined product name)
    if (herbSources.length && drugSources.length && herbSources.some((h) => !drugSources.includes(h))) flags.push({ rule, herbSources, drugSources });
  }
  const order = { HIGH: 0, MODERATE: 1, LOW: 2, UNCLEAR: 3 } as const;
  flags.sort((a, b) => order[a.rule.severity_code] - order[b.rule.severity_code]);
  return { flags, rulesChecked: rules.length, unidentifiedCount: data.medicines.filter((m) => m.pendingIdentification).length };
}

export const SEVERITY_TH: Record<HerbDrugInteraction['severity_code'], string> = { HIGH: 'สูง', MODERATE: 'ปานกลาง', LOW: 'ต่ำ', UNCLEAR: 'ยังไม่ชัดเจน' };

/** Neutral starting text for a doctor's message; the doctor edits it and decides whether to send */
export function draftPatientAlert(f: InteractionFlag): string {
  const herb = f.herbSources[0]?.text ?? f.rule.herb_thai_name;
  const drug = f.drugSources[0]?.text ?? f.rule.drug_generic_name;
  return `คุณหมออยากคุยเรื่องที่ยายกิน "${herb}" ร่วมกับ "${drug}" ค่ะ ระหว่างนี้อย่าเพิ่งหยุดหรือเพิ่มยาเอง ถ้ารู้สึกผิดปกติให้ติดต่อคลินิก ฉุกเฉินโทร 1669`;
}
