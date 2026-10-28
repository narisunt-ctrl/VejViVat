import { ThaiHerbFormularyItem } from '../types/drug';
import { CurrentMedication, SyntheticCase } from '../types/patient';
import { checkHerbDrugInteractions } from './interactionMatcher';
import { MatchedInteractionResult } from '../types/hdi';
import { MockDataService } from './mockDataService';

export interface HerbRecommendationResult {
  herb: ThaiHerbFormularyItem;
  matchScore: number; // 0 - 100
  matchedSymptoms: string[];
  matchedTaste: string;
  matchedElement: string;
  elementRationale: string;
  symptomRationale: string;
  // NO_MATCH_IN_COVERED_PAIRS: no pair found in the limited sample HDI dataset; it is not proof of safety
  hdiRisk: 'HIGH' | 'MODERATE' | 'NO_MATCH_IN_COVERED_PAIRS';
  hdiInteractions: MatchedInteractionResult[];
  hdiSummary: string;
  isTopRecommendation: boolean;
}

export type HerbRecommendation = HerbRecommendationResult;

const SYMPTOM_HERB_MAP: { symptomKeywords: string[]; herbKeywords: string[]; weight: number }[] = [
  // 1. ระบบทางเดินอาหาร (วาโย / ไฟย่อยหย่อน)
  {
    symptomKeywords: ['ท้องอืด', 'แน่นท้อง', 'จุกเสียด', 'เรอบ่อย', 'อาหารไม่ย่อย', 'ลมในท้อง', 'แน่นพุง'],
    herbKeywords: ['ขมิ้นชัน', 'ขิง', 'ธาตุบรรจบ', 'ประสะกานพลู', 'เหลืองปิดสมุทร'],
    weight: 35,
  },
  // 2. ระบบกล้ามเนื้อและกระดูก (ลมปลายปัตฆาต / กษัยเส้น / วาโย)
  {
    symptomKeywords: ['ปวดหลัง', 'ยอกหลัง', 'กษัยเส้น', 'ปวดเมื่อย', 'ตึงคอบ่า', 'ปวดตึง', 'ข้อเข่า', 'ปวดข้อ'],
    herbKeywords: ['ไพล', 'สหัศธารา', 'ธรณีสัณฑะฆาต', 'เถาวัลย์เปรียง', 'น้ำมันไพล'],
    weight: 35,
  },
  // 3. ระบบทางเดินหายใจ (หวัด / เสมหะ / ไอ / ไข้)
  {
    symptomKeywords: ['มีไข้', 'ตัวร้อน', 'ไอ', 'เจ็บคอ', 'มีน้ำมูก', 'เสมหะ', 'สะบัดร้อนสะบัดหนาว', 'คอแห้ง'],
    herbKeywords: ['ฟ้าทะลายโจร', 'ประสะจันทน์แดง', 'ประสะมะแว้ง', 'ตรีผลา', 'เขียวหอม', 'จันทน์ลีลา'],
    weight: 35,
  },
  // 4. ระบบประสาทและศีรษะ (ลมปะกัง / ไมเกรน / นอนไม่หลับ / ใจสั่น)
  {
    symptomKeywords: ['ปวดศีรษะ', 'ปวดหัว', 'ไมเกรน', 'เวียนหัว', 'มึนงง', 'นอนไม่หลับ', 'ใจสั่น', 'ตาพร่า'],
    herbKeywords: ['หอมนวโกฐ', 'บัวบก', 'มะระขี้นก'],
    weight: 30,
  },
  // 5. ผื่นคัน ลมพิษ และน้ำเหลือง
  {
    symptomKeywords: ['ผื่นคัน', 'ลมพิษ', 'ผื่นแดง', 'คันตามตัว'],
    herbKeywords: ['พลูคาว', 'บัวบก', 'ฟ้าทะลายโจร'],
    weight: 30,
  },
];

export class HerbRecommendationService {
  /**
   * Recommend Thai traditional medicines tailored to symptoms, element balance, and active medications.
   */
  public static recommendHerbs(
    formulary: ThaiHerbFormularyItem[],
    symptoms: string[] = [],
    chiefComplaint: string = '',
    dominantElement: string = 'wind',
    recommendedTastes: string[] = [],
    activeMedications: CurrentMedication[] = []
  ): HerbRecommendationResult[] {
    if (!formulary || formulary.length === 0) return [];

    const normalizedDomElem = dominantElement.toLowerCase();
    const allSymptomTexts = [...symptoms, chiefComplaint].join(' ').toLowerCase();

    const results: HerbRecommendationResult[] = formulary.map((herb) => {
      let score = 30; // base score
      const matchedSymptoms: string[] = [];

      // 1. Direct Indication text matching
      const indicationsText = (herb.indications || []).join(' ').toLowerCase();
      const herbNameText = herb.thai_name.toLowerCase();

      for (const sym of symptoms) {
        const s = sym.trim().toLowerCase();
        if (s.length < 2) continue;
        if (indicationsText.includes(s) || herbNameText.includes(s)) {
          score += 18;
          matchedSymptoms.push(sym);
        }
      }

      // Check thematic symptom map
      for (const map of SYMPTOM_HERB_MAP) {
        const hasSymptom = map.symptomKeywords.some((sk) => allSymptomTexts.includes(sk));
        const hasHerb = map.herbKeywords.some((hk) => herbNameText.includes(hk));

        if (hasSymptom && hasHerb) {
          score += map.weight;
          map.symptomKeywords.forEach((sk) => {
            if (allSymptomTexts.includes(sk) && !matchedSymptoms.includes(sk)) {
              matchedSymptoms.push(sk);
            }
          });
        }
      }

      // 2. Element & Taste Matching
      let matchedTaste = herb.taste || 'สุขุม';
      let matchedElement = herb.primary_element || 'วาโย';
      let elementScore = 0;
      let elementRationale = '';

      const herbElem = (herb.primary_element || '').toLowerCase();
      const herbTaste = (herb.taste || '').toLowerCase();

      if (normalizedDomElem.includes('wind') || normalizedDomElem.includes('วาโย')) {
        if (herbElem.includes('วาโย') || herbTaste.includes('ร้อน') || herbTaste.includes('เผ็ด') || herbTaste.includes('สุขุม')) {
          elementScore += 25;
          elementRationale = 'รสร้อนสุขุม ช่วยกระจายลมในเส้น บรรเทาวาโยธาตุกำเริบ';
        }
      } else if (normalizedDomElem.includes('fire') || normalizedDomElem.includes('เตโช')) {
        if (herbElem.includes('เตโช') || herbTaste.includes('ขม') || herbTaste.includes('เย็น') || herbTaste.includes('จืด')) {
          elementScore += 25;
          elementRationale = 'รสขมเย็น ช่วยดับพิษไข้ ถอนพิษร้อน ลดเตโชธาตุกำเริบ';
        }
      } else if (normalizedDomElem.includes('water') || normalizedDomElem.includes('อาโป')) {
        if (herbElem.includes('อาโป') || herbTaste.includes('เปรี้ยว') || herbTaste.includes('เค็ม') || herbTaste.includes('สุขุม')) {
          elementScore += 25;
          elementRationale = 'รสเปรี้ยวสุขุม ช่วยกัดเสมหะ ขับน้ำเหลือง ปรับสมดุลอาโปธาตุ';
        }
      } else if (normalizedDomElem.includes('earth') || normalizedDomElem.includes('ปถวี')) {
        if (herbElem.includes('ปถวี') || herbTaste.includes('ฝาด') || herbTaste.includes('หวาน') || herbTaste.includes('มัน')) {
          elementScore += 25;
          elementRationale = 'รสฝาดมัน ช่วยบำรุงเส้นเอ็นและกล้ามเนื้อ บรรเทาปถวีธาตุแปรปรวน';
        }
      }

      // Check against explicit recommended tastes from Smutthan Engine
      for (const t of recommendedTastes) {
        if (herbTaste.includes(t.toLowerCase())) {
          elementScore += 10;
          if (!elementRationale) {
            elementRationale = `รส${t} ตรงกับรสยาที่แนะนำเพื่อปรับสมดุลธาตุ`;
          }
        }
      }

      score += elementScore;

      // 3. HDI Evaluation (Herb-Drug Interactions)
      const liveHdi = checkHerbDrugInteractions(activeMedications, herb.drug_code_24, herb.thai_name);
      const hasHighHdi = liveHdi.some((h) => h.interaction.severity_code === 'HIGH');
      const hasModHdi = liveHdi.some((h) => h.interaction.severity_code === 'MODERATE');

      let hdiRisk: 'HIGH' | 'MODERATE' | 'NO_MATCH_IN_COVERED_PAIRS' = 'NO_MATCH_IN_COVERED_PAIRS';
      let hdiSummary = '⚪ ไม่พบคู่อันตรกิริยาในฐานข้อมูลตัวอย่าง (ครอบคลุมจำกัด) — ยังยืนยันว่าปลอดภัยไม่ได้ ควรให้เภสัชกรตรวจสอบ';

      if (hasHighHdi) {
        hdiRisk = 'HIGH';
        const offending = liveHdi.filter((h) => h.interaction.severity_code === 'HIGH').map((h) => h.drug_name).join(', ');
        hdiSummary = `🔴 เสี่ยงอันตรกิริยาสูง: ระวังใช้คู่กับ ${offending}`;
        // Slight penalty so dangerous herbs don't blindly dominate without warning, but keep visible with alert
        score = Math.max(score - 10, 40);
      } else if (hasModHdi) {
        hdiRisk = 'MODERATE';
        const offending = liveHdi.map((h) => h.drug_name).join(', ');
        hdiSummary = `🟡 เฝ้าระวังอันตรกิริยา: ตรวจติดตามเมื่อใช้คู่กับ ${offending}`;
      }

      // Final score normalization (capped between 40 - 98)
      const finalScore = Math.min(Math.max(score, 45), 98);

      const symptomRationale =
        matchedSymptoms.length > 0
          ? `สรรพคุณตรงกับอาการ: ${matchedSymptoms.slice(0, 3).join(', ')}`
          : `ข้อบ่งใช้: ${(herb.indications || [])[0] || 'บรรเทาอาการตามศาสตร์แผนไทย'}`;

      return {
        herb,
        matchScore: finalScore,
        matchedSymptoms: Array.from(new Set(matchedSymptoms)),
        matchedTaste,
        matchedElement,
        elementRationale: elementRationale || `รส${matchedTaste} สอดคล้องกับหลักการปรับสมดุลธาตุ`,
        symptomRationale,
        hdiRisk,
        hdiInteractions: liveHdi,
        hdiSummary,
        isTopRecommendation: false,
      };
    });

    // Sort by match score descending
    results.sort((a, b) => b.matchScore - a.matchScore);

    // Mark top 3 as top recommendations
    results.slice(0, 3).forEach((r) => {
      r.isTopRecommendation = true;
    });

    return results;
  }

  /**
   * Recommend Thai traditional medicines for a patient case object.
   */
  public static recommendHerbsForCase(
    patientCase: SyntheticCase,
    dominantElementTh: string = '',
    recommendedTaste: string | string[] = ''
  ): HerbRecommendationResult[] {
    const formulary = MockDataService.getFormulary();
    const tastes = Array.isArray(recommendedTaste)
      ? recommendedTaste
      : typeof recommendedTaste === 'string' && recommendedTaste
      ? [recommendedTaste]
      : [];
    return this.recommendHerbs(
      formulary,
      patientCase.current_encounter?.symptoms || [],
      patientCase.current_encounter?.chief_complaint || '',
      dominantElementTh,
      tastes,
      patientCase.current_medications || []
    );
  }
}
