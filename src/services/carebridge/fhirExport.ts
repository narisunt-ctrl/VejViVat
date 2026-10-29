import type { ThaiHerbFormularyItem } from '../../types/drug';
import { GuidelineDraft, ROLE_TH } from './evidenceReviews';

// Export a clinician-reviewed guideline as a FHIR R4 PlanDefinition, so Thai evidence work can be exchanged with
// hospital systems and shared internationally in a standard format. Every PubMed article becomes a citation
// (relatedArtifact), and the resource is tagged as test data while this remains a demo.

export interface FhirPlanDefinition {
  resourceType: 'PlanDefinition';
  id: string;
  meta: { tag: { system: string; code: string; display: string }[] };
  version: string;
  name: string;
  title: string;
  type: { coding: { system: string; code: string }[] };
  status: 'draft' | 'active';
  experimental: true;
  date: string;
  approvalDate?: string;
  publisher: string;
  description: string;
  topic: { text: string }[];
  author: { name: string }[];
  endorser: { name: string }[];
  relatedArtifact: { type: 'citation' | 'documentation'; display: string; url: string }[];
  action: { title: string; description: string }[];
}

const asUrl = (s: string) => (s.trim().startsWith('10.') ? `https://doi.org/${s.trim()}` : s.trim());

export function toFhirPlanDefinition(g: GuidelineDraft, item: ThaiHerbFormularyItem | null): FhirPlanDefinition {
  const lastApproval = g.approvals.map((a) => a.at).sort().pop();
  const related: FhirPlanDefinition['relatedArtifact'] = g.evidencePmids.map((pmid) => ({ type: 'citation', display: `PMID ${pmid}`, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` }));
  if (g.modern.citation) related.push({ type: 'documentation', display: 'แผนปัจจุบัน', url: asUrl(g.modern.citation) });
  if (g.chinese.citation) related.push({ type: 'documentation', display: 'แผนจีน', url: asUrl(g.chinese.citation) });
  const actions: FhirPlanDefinition['action'] = [{ title: 'ข้อแนะนำของคณะผู้ทบทวน', description: g.recommendation }];
  if (item) {
    const d = item.standard_dosing.adult;
    actions.push({
      title: `แผนไทย: ${item.thai_name}`,
      description: `ขนาดมาตรฐานผู้ใหญ่ ครั้งละ ${d.dose_per_admin} ${d.dose_unit} วันละ ${d.frequency_per_day} ครั้ง ${d.timing} · ข้อห้าม: ${item.contraindications.join('; ')} · ที่มา: ${item.source_reference}`,
    });
  }
  if (g.modern.text) actions.push({ title: 'แผนปัจจุบัน', description: g.modern.text });
  if (g.chinese.text) actions.push({ title: 'แผนจีน', description: g.chinese.text });
  return {
    resourceType: 'PlanDefinition',
    id: g.id,
    meta: { tag: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason', code: 'HTEST', display: 'test health data' }] },
    version: String(g.version),
    name: `ThaiHerbGuideline_${g.herbId}_${(g.condition || 'all').replace(/\W+/g, '_')}`,
    title: `${g.herbThai} สำหรับ ${g.condition || 'ทุกภาวะ'}`,
    type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/plan-definition-type', code: 'clinical-protocol' }] },
    status: g.status === 'APPROVED' ? 'active' : 'draft',
    experimental: true,
    date: g.updatedAt,
    ...(g.status === 'APPROVED' && lastApproval ? { approvalDate: lastApproval.slice(0, 10) } : {}),
    publisher: 'VejViVat CareBridge (demo)',
    description: g.recommendation,
    topic: [{ text: g.condition || 'all conditions' }],
    author: g.authors.map((a) => ({ name: `${a.name} (${ROLE_TH[a.role]})` })),
    endorser: g.approvals.map((a) => ({ name: `${a.name} (${ROLE_TH[a.role]})` })),
    relatedArtifact: related,
    action: actions,
  };
}
