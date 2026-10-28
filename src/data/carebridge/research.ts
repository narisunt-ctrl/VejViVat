// Research shown to clinicians in CareBridge. The teammate-supplied claims (docs/handoff/04, friend_summary_original.txt)
// have NOT been checked against primary sources: they stay RESEARCH_REVIEW_PENDING with no DOI/PMID until a person
// verifies them. New papers are found through the live search links (PubMed etc.), not generated here.

export interface EvidenceRef {
  reference_id: string;
  topic: ResearchTopicId;
  original_claim: string;
  bibliographic_details: string | null;
  doi_or_pmid: string | null;
  full_text_checked: boolean;
  citation_verified: boolean;
  reviewer: string | null;
  clinical_limitations: string;
  date: string;
  display_state: 'RESEARCH_REVIEW_PENDING' | 'VERIFIED';
}

export type ResearchTopicId = 'KNEE_OA' | 'DYSPEPSIA' | 'BACK_PAIN' | 'IMPLEMENTATION';

export interface ResearchTopic {
  id: ResearchTopicId;
  title: string;
  why: string;
  /** English search phrases for the live databases */
  queries: string[];
}

export const RESEARCH_TOPICS: ResearchTopic[] = [
  {
    id: 'KNEE_OA',
    title: 'ข้อเข่าเสื่อม (Knee OA)',
    why: 'กลุ่มเป้าหมายแรกที่เพื่อนร่วมทีมเสนอ: วัดอาการปวดและการใช้งานได้ มีงานวิจัยยาทาสมุนไพรของไทย',
    queries: ['Thai traditional medicine knee osteoarthritis', 'Zingiber cassumunar Plai knee osteoarthritis', 'Sahatsatara osteoarthritis'],
  },
  {
    id: 'DYSPEPSIA',
    title: 'อาหารไม่ย่อยชนิดไม่มีแผล (Functional dyspepsia)',
    why: 'เฉพาะผู้ที่ไม่มีอาการเตือน เพื่อนร่วมทีมเตือนว่าไม่ควรตีความว่าแทนยากลุ่ม PPI ได้ทั่วไป',
    queries: ['curcumin functional dyspepsia randomized', 'Thai herbal medicine dyspepsia'],
  },
  {
    id: 'BACK_PAIN',
    title: 'ปวดหลังเรื้อรัง (Chronic back pain)',
    why: 'อาการเรื้อรังในงานปฐมภูมิที่เพื่อนร่วมทีมระบุว่าอาจเหมาะกับการดูแลร่วม',
    queries: ['Thai traditional massage chronic low back pain', 'Thai herbal compress back pain'],
  },
  {
    id: 'IMPLEMENTATION',
    title: 'การนำการแพทย์แผนไทยมาใช้ในโรงพยาบาล',
    why: 'อุปสรรคและรูปแบบการทำงานร่วมกัน (5C) ไม่ใช่หลักฐานประสิทธิผลของยา',
    queries: ['integration of Thai traditional medicine hospital', 'integrative medicine implementation barriers physicians'],
  },
];

const PENDING = { bibliographic_details: null, doi_or_pmid: null, full_text_checked: false, citation_verified: false, reviewer: null, date: '2026-10-28', display_state: 'RESEARCH_REVIEW_PENDING' as const };

export const TEAM_REFERENCES: EvidenceRef[] = [
  {
    ...PENDING,
    reference_id: 'TEAM-01',
    topic: 'KNEE_OA',
    original_claim: 'ครีมตำรับ Thai Medicinal Plant-4 ทาเข่า 4 สัปดาห์ ผู้เข้าร่วมราว 199 คน ไม่ด้อยกว่า diclofenac ชนิดทา (ตามที่เพื่อนร่วมทีมสรุป)',
    clinical_limitations: 'ต้องตรวจเกณฑ์ไม่ด้อยกว่า ตัวชี้วัด และอาการไม่พึงประสงค์จากต้นฉบับ',
  },
  {
    ...PENDING,
    reference_id: 'TEAM-02',
    topic: 'DYSPEPSIA',
    original_claim: 'การศึกษาปี 2023 (BMJ Evidence-Based Medicine) ผู้เข้าร่วมราว 206 คน เปรียบเทียบขมิ้นชัน omeprazole และการใช้ร่วมกัน (ตามที่เพื่อนร่วมทีมสรุป)',
    clinical_limitations: 'เพื่อนร่วมทีมเตือนเองว่าไม่ควรเรียกว่าเป็นการศึกษาแบบไม่ด้อยกว่าอย่างเป็นทางการ และไม่ควรใช้แทน PPI ทั่วไป',
  },
  {
    ...PENDING,
    reference_id: 'TEAM-03',
    topic: 'KNEE_OA',
    original_claim: 'ยาสหัศธาราแบบไมโครอิมัลชันในข้อเข่าเสื่อม ผู้เข้าร่วมราว 84 คน 28 วัน (ปี 2026 ตามที่เพื่อนร่วมทีมสรุป)',
    clinical_limitations: 'ต้องตรวจรูปแบบการศึกษา กลุ่มเปรียบเทียบ ช่วงความเชื่อมั่น และสถานะทะเบียนตำรับ',
  },
  {
    ...PENDING,
    reference_id: 'TEAM-04',
    topic: 'IMPLEMENTATION',
    original_claim: 'รายงานโรงพยาบาลในไทยปี 2026 ว่ามีการสั่งยาฟ้าทะลายโจรเพิ่มราว 74.64% และสหัศธาราราว 104.39% (ตามที่เพื่อนร่วมทีมสรุป)',
    clinical_limitations: 'เป็นปริมาณการสั่งยา ไม่ใช่ผลการรักษา และไม่บอกความเป็นเหตุเป็นผล',
  },
  {
    ...PENDING,
    reference_id: 'TEAM-05',
    topic: 'IMPLEMENTATION',
    original_claim: 'งานวิจัยเชิงคุณภาพ 6 โรงพยาบาลในไทยปี 2026 ระบุอุปสรรค: หลักฐาน ความปลอดภัย แนวทางเวชปฏิบัติ และขั้นตอนงาน (ตามที่เพื่อนร่วมทีมสรุป)',
    clinical_limitations: 'ต้องตรวจวิธีวิจัยและแหล่งที่มา',
  },
  {
    ...PENDING,
    reference_id: 'TEAM-06',
    topic: 'IMPLEMENTATION',
    original_claim: 'ตัวอย่างนโยบายการแพทย์ผสมผสานของจีน (2021, 2024, 2025) เรื่องการจัดองค์กรและทีมสหวิชาชีพ (ตามที่เพื่อนร่วมทีมสรุป)',
    clinical_limitations: 'เป็นแนวคิดการจัดระบบ ไม่ใช่หลักฐานว่าการรักษาแต่ละแบบได้ผล',
  },
];

export function searchLinks(query: string): { label: string; url: string }[] {
  const q = encodeURIComponent(query);
  const recent = new Date().getFullYear() - 3;
  return [
    { label: 'PubMed (ใหม่สุดก่อน)', url: `https://pubmed.ncbi.nlm.nih.gov/?term=${q}&sort=date` },
    { label: `Google Scholar (ตั้งแต่ ${recent})`, url: `https://scholar.google.com/scholar?q=${q}&as_ylo=${recent}` },
    { label: 'ClinicalTrials.gov', url: `https://clinicaltrials.gov/search?term=${q}` },
  ];
}

/** A paper a clinician has read and recorded in this browser (demo; not shared with anyone) */
export interface ReviewedPaper {
  id: string;
  topic: ResearchTopicId;
  title: string;
  year: string;
  link: string;
  design: string;
  sampleSize: string;
  finding: string;
  limitations: string;
  reviewer: string;
  reviewedAt: string;
}

const KEY = 'carebridge-research-v1';

export const reviewedPapers = {
  list(): ReviewedPaper[] {
    try {
      return JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '[]') as ReviewedPaper[];
    } catch {
      return [];
    }
  },
  add(p: Omit<ReviewedPaper, 'id' | 'reviewedAt'>): ReviewedPaper {
    const paper = { ...p, id: `paper-${Date.now().toString(36)}`, reviewedAt: new Date().toISOString() };
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify([paper, ...this.list()]));
    } catch {
      // ignore
    }
    return paper;
  },
  remove(id: string) {
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(this.list().filter((p) => p.id !== id)));
    } catch {
      // ignore
    }
  },
};

/** A citation link must be a web address or a DOI (10.xxxx/...) so reviewers can open the source */
export function isCitationLink(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim()) || /^10\.\d{4,9}\/\S+$/.test(s.trim());
}
