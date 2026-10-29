export type InteractionSeverity = 'สูง' | 'ปานกลาง' | 'ต่ำ' | 'ไม่มีข้อมูล';
export type InteractionSeverityCode = 'HIGH' | 'MODERATE' | 'LOW' | 'UNCLEAR';

export interface HerbDrugInteraction {
  interaction_id: string;
  case_reference?: string;
  herb_code_24: string;
  herb_thai_name: string;
  herb_generic_name: string;
  drug_id: string;
  drug_generic_name: string;
  atc_code: string;
  severity: InteractionSeverity;
  severity_code: InteractionSeverityCode;
  mechanism: string;
  clinical_effects: string;
  recommendation: string;
  /** 'ไม่ระบุ' for imported records that carry no graded evidence level */
  evidence_level: 'A' | 'B' | 'C' | 'D' | 'ไม่ระบุ';
  sources: string;
  reviewer: string;
  review_date: string;
  version: string;
  data_disclaimer: string;
  /** link to the source article (imported records) */
  source_url?: string;
  /** which database the record came from; absent = the project's reviewed table */
  source_db?: 'MEDPLANT';
}

export interface MatchedInteractionResult {
  interaction: HerbDrugInteraction;
  herb_name: string;
  drug_name: string;
  patient_active_dose?: string;
}
