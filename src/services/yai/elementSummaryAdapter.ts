import { calculateSmutthan } from '../smutthanEngine';
import { MockDataService } from '../mockDataService';
import type { SyntheticCase } from '../../types/patient';
import { linkForPatient } from '../../data/yai/demoLinks';
import smutthanRules from '../../../data/rules/smutthan-rules.json';

// Read-only adapter from the existing Smutthan engine (calculateSmutthan, unchanged) to ยายพร้อม.
// It only runs for a patient explicitly linked to a CareBridge case and only when every input the engine needs is
// present; otherwise it returns UNKNOWN with the missing inputs. Nothing is defaulted to "normal".

export interface ElementSummaryAvailable {
  status: 'AVAILABLE';
  /** birth element recorded in the linked case: a stable attribute, not today's balance */
  birthElement: string | null;
  /** today's Smutthan assessment from the existing engine: changes with weather, time, age, vitals and symptoms */
  dynamic: { dominantTh: string; state: string; recommendedTaste: string[]; lifestyleAdvice: string[] };
  assessedAt: string;
  ruleVersion: string;
  source: string;
  /** chronic conditions in the linked case that need clinician/nutritionist review before any diet advice */
  dietReviewNeeded: string[];
  isSynthetic: true;
}
export interface ElementSummaryUnknown {
  status: 'UNKNOWN';
  missingInputs: string[];
}
export type ElementSummary = ElementSummaryAvailable | ElementSummaryUnknown;

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** Inputs calculateSmutthan() needs that are missing from a case */
export function missingSmutthanInputs(c: SyntheticCase): string[] {
  const missing: string[] = [];
  const v = c.current_encounter?.vitals;
  if (!v || !['btemp', 'sbp', 'dbp', 'pr', 'rr'].every((k) => num((v as unknown as Record<string, unknown>)[k]) && (v as unknown as Record<string, number>)[k] > 0)) missing.push('สัญญาณชีพ');
  const a = c.current_encounter?.ambient_context;
  if (!a || !num(a.temperature_c) || !num(a.relative_humidity) || !a.kala_period) missing.push('สภาพอากาศและฤดูกาล');
  if (!num(c.patient_info?.age) || c.patient_info.age <= 0) missing.push('อายุ');
  if (!c.current_encounter?.date || !c.current_encounter?.time) missing.push('วันเวลาที่ประเมิน');
  if (!Array.isArray(c.current_encounter?.symptoms) || c.current_encounter.symptoms.length === 0) missing.push('อาการที่บันทึกโดยบุคลากร');
  return missing;
}

export function summarizeCase(c: SyntheticCase): ElementSummary {
  const missingInputs = missingSmutthanInputs(c);
  if (missingInputs.length > 0) return { status: 'UNKNOWN', missingInputs };
  const enc = c.current_encounter;
  const assessedAt = new Date(`${enc.date}T${enc.time.length === 5 ? `${enc.time}:00` : enc.time}+07:00`);
  const r = calculateSmutthan(c.patient_info, enc.vitals, enc.symptoms, enc.ambient_context, assessedAt);
  return {
    status: 'AVAILABLE',
    birthElement: c.patient_info.birth_element?.trim() || null,
    dynamic: { dominantTh: r.dominant_element_th, state: r.status, recommendedTaste: r.recommended_taste, lifestyleAdvice: r.lifestyle_advice },
    assessedAt: assessedAt.toISOString(),
    ruleVersion: `smutthan-rules ${(smutthanRules as { version?: string }).version ?? '?'}`,
    source: `CareBridge เคส ${c.case_id} (ข้อมูลสังเคราะห์)`,
    dietReviewNeeded: (c.chronic_diseases ?? []).map((d) => d.name),
    isSynthetic: true,
  };
}

export function getElementSummaryForPatient(patientId: string, cases: SyntheticCase[] = MockDataService.getCases()): ElementSummary {
  const link = linkForPatient(patientId);
  if (!link) return { status: 'UNKNOWN', missingInputs: ['ยังไม่ได้เชื่อมกับข้อมูลการประเมินของคลินิก'] };
  const c = cases.find((x) => x.case_id === link.clinicianCaseId);
  if (!c) return { status: 'UNKNOWN', missingInputs: ['ไม่พบข้อมูลการประเมินที่เชื่อมไว้'] };
  return summarizeCase(c);
}
