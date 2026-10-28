import { describe, it, expect } from 'vitest';
import { parsePhotos, draftFromParsed } from '../../services/yai/scanGuidance';
import { canCreateReminder } from '../../domain/yai/policies';

describe('OCR provenance and safety', () => {
  it('each field points at the exact photo and engine it was read from', () => {
    const parsed = parsePhotos([
      { id: 'ph-front', side: 'FRONT', ocr: { confidence: 90, model: 'PP-OCRv5 (th)', lines: [{ text: 'พาราเซตามอล', confidence: 90 }, { text: 'Paracetamol 500 mg', confidence: 95 }] } },
      { id: 'ph-back', side: 'BACK', ocr: { confidence: null, model: 'Typhoon OCR 1.5', lines: [{ text: 'วันละ 3 ครั้ง หลังอาหาร', confidence: null }] } },
    ])!;
    const d = draftFromParsed(parsed, 'p', ['ph-front', 'ph-back'], new Date().toISOString(), 'd1');
    expect(d.labelStrength.evidencePhotoIds).toEqual(['ph-front']);
    expect(d.labelStrength.ocrEngine).toBe('PP-OCRv5 (th)');
    expect(d.labelDirections.evidencePhotoIds).toEqual(['ph-back']);
    expect(d.labelDirections.ocrEngine).toBe('Typhoon OCR 1.5');
    // Typhoon reports no confidence: none is invented
    expect(d.labelDirections.extractionConfidence).toBeUndefined();
    expect(d.labelDirections.rawText).toBe('วันละ 3 ครั้ง หลังอาหาร');
  });

  it('never turns OCR directions into a reminder or an instruction', () => {
    const parsed = parsePhotos([{ id: 'x', side: 'FRONT', ocr: { confidence: 99, lines: [{ text: 'ยาตัวอย่าง 10 mg', confidence: 99 }, { text: 'รับประทานวันละ 2 ครั้ง', confidence: 99 }] } }])!;
    const d = draftFromParsed(parsed, 'p', ['x'], new Date().toISOString(), 'd2');
    expect(d.status).toBe('DRAFT');
    expect(d.useReports).toEqual([]);
    expect(d.labelDirections.verification).toBe('UNVERIFIED');
    expect(canCreateReminder(d, 'PATIENT_CONFIRMED').ok).toBe(false);
    expect(canCreateReminder(d, 'CLINICIAN_ORDER').ok).toBe(false);
  });
});
