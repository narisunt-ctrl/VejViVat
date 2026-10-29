import { describe, it, expect } from 'vitest';
import { elementOf, matchHerbsToElement, tastesIn } from '../../domain/yai/herbElement';
import { HERB_CARDS } from '../../domain/yai/herbDiscovery';
import { getElementSummaryForPatient, ElementSummary } from '../../services/yai/elementSummaryAdapter';
import { createSeedState } from '../../data/yai/fixtures';

const available = (dominantTh: string, recommendedTaste: string[], lifestyleAdvice: string[] = []): ElementSummary => ({
  status: 'AVAILABLE',
  birthElement: null,
  dynamic: { dominantTh, state: 'สมดุล (Normal)', recommendedTaste, lifestyleAdvice },
  assessedAt: '2026-10-29T03:00:00Z',
  ruleVersion: 'test',
  source: 'test',
  dietReviewNeeded: [],
  isSynthetic: true,
});

describe('herbs and the user element', () => {
  it('reads taste words from the engine and the formulary', () => {
    expect(tastesIn('รสขม (ดับพิษร้อน)')).toEqual(['ขม']);
    expect(tastesIn('รสเผ็ดร้อนเล็กน้อย')).toEqual(['เผ็ดร้อน']);
    expect(tastesIn('ขม หวาน เย็น')).toEqual(['หวาน', 'ขม', 'เย็น']);
    expect(elementOf('เตโชธาตุ (ธาตุไฟ)')).toBe('fire');
    expect(elementOf('วาโยธาตุ (ธาตุลม)')).toBe('wind');
  });

  it('matches nothing without an assessment, and says what is missing', () => {
    const r = matchHerbsToElement({ status: 'UNKNOWN', missingInputs: ['สัญญาณชีพ'] }, HERB_CARDS, []);
    expect(r.status).toBe('UNKNOWN');
    expect(r.matches).toHaveLength(0);
    expect(r.missingInputs).toEqual(['สัญญาณชีพ']);
  });

  it('puts herbs with a caution against the user medicines in a separate list', () => {
    const s = createSeedState();
    const r = matchHerbsToElement(getElementSummaryForPatient(s.patient.id), HERB_CARDS, s.medicines);
    expect(r.status).toBe('AVAILABLE');
    expect(r.matches.length).toBeGreaterThan(0);
    expect(r.matches.every((m) => m.medicineCautions === 0 && m.matchedTastes.length > 0 && m.card.source === 'FORMULARY')).toBe(true);
    // the demo patient takes warfarin: turmeric must never appear as a plain match
    expect(r.matches.some((m) => m.card.thaiName.includes('ขมิ้นชัน'))).toBe(false);
    expect(r.withMedicineCaution.some((m) => m.card.thaiName.includes('ขมิ้นชัน'))).toBe(true);
  });

  it('follows the assessment advice to avoid hot remedies when fire dominates, inventing no other rule', () => {
    const fire = available('เตโชธาตุ (ธาตุไฟ)', ['รสขม (ดับพิษร้อน)', 'รสเย็น', 'รสจืด (ถอนพิษไข้)'], ['งดใช้ยาตำรับรสร้อนจัด เช่น ยาสหัศธารา หรือยาขิงขนาดสูง']);
    const r = matchHerbsToElement(fire, HERB_CARDS, []);
    expect(r.textCautions.some((m) => m.card.thaiName.includes('ขิง'))).toBe(true);
    expect(r.matches.some((m) => /ร้อน/.test(m.card.taste ?? ''))).toBe(false);
    expect(r.matches.some((m) => m.card.thaiName.includes('รางจืด'))).toBe(true);
    const wind = matchHerbsToElement(available('วาโยธาตุ (ธาตุลม)', ['รสสุขุม']), HERB_CARDS, []);
    expect(wind.textCautions).toHaveLength(0);
  });
});
