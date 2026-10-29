import { describe, it, expect, beforeEach } from 'vitest';
import { foodsIn } from '../../data/yai/thaiFoodTastes';
import { dietContext, eatenFoods, menuIdeas, tasteBalance } from '../../domain/yai/foodElement';
import { herbSignals, herbsIn, K_MIN, researchRecord, syntheticCohort } from '../../domain/yai/herbSharing';
import { researchRequests } from '../../services/carebridge/researchRequests';
import { createSeedState } from '../../data/yai/fixtures';
import { yaiStore } from '../../services/yai/yaiStore';
import { CAREBRIDGE_RECIPIENT_ID } from '../../data/yai/demoLinks';
import type { ElementSummary } from '../../services/yai/elementSummaryAdapter';
import type { JournalEntry } from '../../domain/yai/journal';

const summary = (recommendedTaste: string[], conditions: string[] = []): ElementSummary => ({
  status: 'AVAILABLE',
  birthElement: null,
  dynamic: { dominantTh: 'วาโยธาตุ (ธาตุลม)', state: 'สมดุล (Normal)', recommendedTaste, lifestyleAdvice: [] },
  assessedAt: '2026-10-29T03:00:00Z',
  ruleVersion: 'test',
  source: 'test',
  dietReviewNeeded: conditions,
  isSynthetic: true,
});

const food = (date: string, text: string): JournalEntry => ({
  id: `j-${date}-${text}`,
  patientId: 'p',
  originalText: text,
  reviewedText: text,
  inputSource: 'MANUAL_TEXT',
  capturedAt: `${date}T03:00:00Z`,
  recordedLocalDate: date,
  reviewedAt: `${date}T03:00:00Z`,
  status: 'PATIENT_CONFIRMED',
  segments: [{ id: 's', category: 'FOOD_CONSUMED', text, correctedByUser: false }],
  photoIds: [],
  revision: 1,
  isSynthetic: false,
});

describe('food by element', () => {
  it('recognises dishes with the longest name first', () => {
    expect(foodsIn('กินแกงจืดตำลึงกับข้าวต้ม').map((f) => f.id)).toEqual(['kaeng-jued-tamlueng', 'khao-tom']);
    expect(foodsIn('กินกล้วยต้ม').map((f) => f.id)).toEqual(['kluai-tom']);
    expect(foodsIn('วันนี้ไม่ได้กินอะไร')).toHaveLength(0);
  });

  it('counts tastes of recognised dishes this week and keeps unrecognised ones apart', () => {
    const s = { ...createSeedState(), journal: [food('2026-10-28', 'กินแกงส้ม'), food('2026-10-27', 'กินขนมจีบ'), food('2026-10-10', 'ต้มยำ')] };
    const eaten = eatenFoods(s, '2026-10-29', 7);
    expect(eaten).toHaveLength(2);
    const b = tasteBalance(eaten, ['เผ็ดร้อน']);
    expect(b.recognised).toBe(1);
    expect(b.unrecognised).toBe(1);
    expect(b.rows.find((r) => r.taste === 'เผ็ดร้อน')).toMatchObject({ count: 1, recommended: true });
  });

  it('puts chronic conditions and medicines before the element', () => {
    const s = createSeedState();
    const plain = menuIdeas(summary(['รสเค็ม', 'รสหวาน', 'รสจืด']), s, 50);
    expect(plain.some((m) => m.food.salty)).toBe(true);
    const htnDm = menuIdeas(summary(['รสเค็ม', 'รสหวาน', 'รสจืด'], ['Hypertension', 'เบาหวาน']), s, 50);
    expect(htnDm.some((m) => m.food.salty)).toBe(false);
    expect(htnDm.some((m) => m.food.sweet)).toBe(false);
    // the demo patient takes warfarin: leafy greens get the "keep it steady" note
    expect(dietContext(summary([]), s).onWarfarin).toBe(true);
    const greens = menuIdeas(summary(['รสจืด']), s, 50).find((m) => m.food.vitaminKGreens);
    expect(greens?.notes.some((n) => n.includes('วาร์ฟาริน'))).toBe(true);
    expect(menuIdeas({ status: 'UNKNOWN', missingInputs: ['x'] }, s)).toHaveLength(0);
  });
});

describe('herb data sharing', () => {
  beforeEach(() => yaiStore.reset());

  it('finds herb names, longest first', () => {
    expect(herbsIn('กินขมิ้นชันหลังอาหาร')).toContain('ขมิ้นชัน');
    expect(herbsIn(null)).toEqual([]);
  });

  it('builds no research record without the separate research consent', () => {
    expect(researchRecord(createSeedState())).toBeNull();
  });

  it('de-identifies the research record: pseudonym, age band, month, no names or free text', () => {
    yaiStore.setHerbResearch({ research: true });
    const rec = yaiStore.readHerbResearchRecord('test')!;
    const s = yaiStore.getState();
    expect(rec.pseudoId).toMatch(/^P-[0-9a-f]{8}$/);
    expect(rec.ageBand).toBe('60–69 ปี');
    const json = JSON.stringify(rec);
    expect(json).not.toContain(s.patient.displayName.replace(/\s*\(.*\)/, ''));
    expect(json).not.toContain(s.patient.id);
    expect(json).not.toMatch(/หลังอาหาร/); // no free text from the journal
    expect(rec.herbs.every((h) => /^\d{4}-\d{2}$/.test(h.month))).toBe(true);
    expect(s.audit[0].action).toBe('RESEARCH_DATA_READ');
  });

  it('turns contact off when research sharing is withdrawn', () => {
    yaiStore.setHerbResearch({ research: true, contact: true });
    yaiStore.setHerbResearch({ research: false });
    expect(yaiStore.getState().settings.herbResearch).toMatchObject({ research: false, contact: false });
    expect(yaiStore.readHerbResearchRecord('test')).toBeNull();
  });

  it('lets the clinic read herb use only with the HERB_DATA consent, auditing both outcomes', () => {
    expect(yaiStore.readHerbUseForClinician(CAREBRIDGE_RECIPIENT_ID).allowed).toBe(false);
    expect(yaiStore.getState().audit[0].action).toBe('HERB_DATA_READ_DENIED');
    yaiStore.grantConsent(CAREBRIDGE_RECIPIENT_ID, 'CareBridge', ['HERB_DATA'], 90);
    const r = yaiStore.readHerbUseForClinician(CAREBRIDGE_RECIPIENT_ID);
    expect(r.allowed).toBe(true);
    expect(r.uses.some((u) => u.herb === 'ขมิ้นชัน')).toBe(true);
    expect(yaiStore.getState().audit[0].action).toBe('HERB_DATA_READ');
  });
});

describe('research hub', () => {
  beforeEach(() => researchRequests.reset());

  it('suppresses herb groups smaller than the minimum size', () => {
    const cohort = syntheticCohort();
    const signals = herbSignals(cohort);
    expect(signals.length).toBeGreaterThan(3);
    for (const s of signals) {
      if (s.users < K_MIN) expect(s).toMatchObject({ suppressed: true, avgRating: null, contactable: null });
      else expect(s.suppressed).toBe(false);
    }
    const tiny = herbSignals(cohort.slice(0, 2));
    expect(tiny.every((s) => s.suppressed)).toBe(true);
  });

  it('cannot approve a request without an ethics reference', () => {
    const r = researchRequests.submit({ researcher: 'ดร.ตัวอย่าง', institution: 'คณะเภสัช (สมมุติ)', herb: 'ขิง', question: 'คำถาม', access: 'AGGREGATE', ethicsRef: '' });
    expect(r.status).toBe('ETHICS_PENDING');
    expect(researchRequests.decide(r.id, true, '').ok).toBe(false);
    researchRequests.addEthicsRef(r.id, 'COA-001');
    expect(researchRequests.all()[0].status).toBe('SUBMITTED');
    expect(researchRequests.decide(r.id, true, 'ok').ok).toBe(true);
    expect(researchRequests.all()[0].status).toBe('APPROVED');
  });
});
