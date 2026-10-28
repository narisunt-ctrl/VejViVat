import type { DemoPatientLink } from '../../domain/yai/prescriptionSync';
import { DEMO_PATIENT_ID } from './fixtures';

// Explicit synthetic identity links between CareBridge clinician cases and ยายพร้อม patients.
// A case is linked only if it is listed here; nothing is matched by name, age, phone or HN.

export const CAREBRIDGE_SOURCE = 'VEJVIVAT_DEMO';
export const CAREBRIDGE_RECIPIENT_ID = 'carebridge-demo';
export const CAREBRIDGE_RECIPIENT_NAME = 'CareBridge คลินิกจำลอง';

export const DEMO_PATIENT_LINKS: DemoPatientLink[] = [
  {
    // synthetic knee-OA case (นางทองใบ, ข้อมูลสังเคราะห์) ↔ the ยายพร้อม demo patient
    clinicianCaseId: 'C11',
    yaiPatientId: DEMO_PATIENT_ID,
    sourceSystem: CAREBRIDGE_SOURCE,
    recipientId: CAREBRIDGE_RECIPIENT_ID,
    recipientName: CAREBRIDGE_RECIPIENT_NAME,
    isSynthetic: true,
  },
];

export const linkForCase = (caseId: string) => DEMO_PATIENT_LINKS.find((l) => l.clinicianCaseId === caseId) ?? null;
export const linkForPatient = (patientId: string) => DEMO_PATIENT_LINKS.find((l) => l.yaiPatientId === patientId) ?? null;
