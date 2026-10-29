// Where clinicians look for official guidelines of each medical system. The app only links out; it does not copy
// or paraphrase any guideline. Reviewers cite the exact document they used (link or DOI) in the guideline draft.

export type MedicalSystem = 'THAI' | 'MODERN' | 'CHINESE';

export interface GuidelineSource {
  name: string;
  url: string;
  note: string;
}

export const GUIDELINE_SOURCES: Record<MedicalSystem, GuidelineSource[]> = {
  THAI: [
    { name: 'กรมการแพทย์แผนไทยและการแพทย์ทางเลือก', url: 'https://www.dtam.moph.go.th/', note: 'แนวทางเวชปฏิบัติและตำรับยาแผนไทย' },
    { name: 'สำนักงานคณะกรรมการอาหารและยา (อย.)', url: 'https://www.fda.moph.go.th/', note: 'ทะเบียนและข้อมูลผลิตภัณฑ์สมุนไพร' },
    { name: 'ThaiJO (วารสารวิชาการไทย)', url: 'https://www.tci-thaijo.org/', note: 'งานวิจัยตีพิมพ์ในวารสารไทย' },
    { name: 'Thai Clinical Trials Registry', url: 'https://www.thaiclinicaltrials.org/', note: 'ทะเบียนการทดลองทางคลินิกของไทย' },
  ],
  MODERN: [
    { name: 'NICE guidance (UK)', url: 'https://www.nice.org.uk/guidance', note: 'แนวทางเวชปฏิบัติที่อ้างอิงกันแพร่หลาย' },
    { name: 'WHO guidelines', url: 'https://www.who.int/publications/who-guidelines', note: 'แนวทางขององค์การอนามัยโลก' },
    { name: 'Cochrane Library', url: 'https://www.cochranelibrary.com/', note: 'systematic review มาตรฐานสูง' },
  ],
  CHINESE: [
    { name: 'National Administration of Traditional Chinese Medicine (China)', url: 'http://www.natcm.gov.cn/', note: 'หน่วยงานกำกับการแพทย์แผนจีน' },
    { name: 'WHO: Traditional, complementary and integrative medicine', url: 'https://www.who.int/health-topics/traditional-complementary-and-integrative-medicine', note: 'กรอบขององค์การอนามัยโลก' },
  ],
};

export const SYSTEM_TH: Record<MedicalSystem, string> = { THAI: 'แผนไทย', MODERN: 'แผนปัจจุบัน', CHINESE: 'แผนจีน' };

/** PubMed searches for guidelines/consensus of each system on a condition (newest first) */
export function guidelineSearchUrl(system: MedicalSystem, condition: string, herbTerms: string[] = []): string {
  const cond = condition.trim() ? `"${condition.trim()}"[tiab]` : '';
  const herb = herbTerms.length ? `(${herbTerms.map((t) => `"${t}"[tiab]`).join(' OR ')})` : '';
  const gl = '(practice guideline[pt] OR guideline[pt] OR consensus[tiab])';
  const parts =
    system === 'MODERN'
      ? [cond || 'clinical', gl]
      : system === 'CHINESE'
      ? ['"Medicine, Chinese Traditional"[mh]', cond, gl]
      : [herb || '"Thai traditional medicine"[tiab]', cond, '(Thailand[ad] OR Thai[tiab])'];
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(parts.filter(Boolean).join(' AND '))}&sort=date`;
}
