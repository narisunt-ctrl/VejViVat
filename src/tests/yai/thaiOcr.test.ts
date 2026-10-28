import { describe, it, expect } from 'vitest';
import { parseLabel, normalizeLine } from '../../services/yai/labelParser';
import { scanGuidance, draftFromParsed, parsePhotos } from '../../services/yai/scanGuidance';

const L = (text: string, confidence = 85) => ({ text, confidence });

describe('Thai label parser', () => {
  it('normalizes Thai digits and spaces inserted between Thai letters', () => {
    expect(normalizeLine('ขมิ้น ชัน  ๕๐๐ มก.')).toBe('ขมิ้นชัน 500 มก.');
    expect(normalizeLine('บริษัท ตัวอย่าง จํากัด')).toBe('บริษัทตัวอย่างจำกัด');
  });

  it('finds candidate fields with their source line', () => {
    const p = parseLabel([
      L('ขมิ้นชันแคปซูล', 80),
      L('Turmeric Capsule 500 mg / แคปซูล', 90),
      L('ส่วนประกอบ: ผงเหง้าขมิ้นชัน 500 มก.', 70),
      L('รับประทานครั้งละ 2 แคปซูล วันละ 3 ครั้ง หลังอาหาร', 75),
      L('เลขทะเบียน G 123/45', 88),
      L('ผลิตโดย บริษัทสมุนไพรตัวอย่าง จำกัด', 65),
    ]);
    expect(p.displayName?.value).toBe('ขมิ้นชันแคปซูล');
    expect(p.displayName!.confidence).toBeLessThanOrEqual(0.6);
    expect(p.strength?.value).toMatch(/^500 mg/);
    expect(p.ingredients?.value).toContain('ผงเหง้าขมิ้นชัน');
    expect(p.directions?.value).toContain('วันละ 3 ครั้ง');
    expect(p.registration?.value).toBe('G 123/45');
    expect(p.manufacturer?.value).toContain('บริษัทสมุนไพรตัวอย่าง');
    expect(p.form).toBe('CAPSULE');
  });

  it('leaves fields null instead of guessing when text is missing', () => {
    const p = parseLabel([L('ยาสมุนไพร')]);
    expect(p.strength).toBeNull();
    expect(p.registration).toBeNull();
    expect(p.form).toBe('UNKNOWN');
  });

  it('real OCR drafts are not synthetic, stay unconfirmed and keep the source line', () => {
    const p = parseLabel([L('ยาแก้ไอ 10 ml'), L('วันละ 3 ครั้ง')]);
    const d = draftFromParsed(p, 'p', ['ph1'], new Date().toISOString(), 'd1');
    expect(d.status).toBe('DRAFT');
    expect(d.labelStrength.isSynthetic).toBe(false);
    expect(d.labelStrength.rawText).toBe('ยาแก้ไอ 10 ml');
    expect(d.registrationNumber.value).toBeNull();
  });
});

describe('scan guidance', () => {
  it('starts with the front, then asks for the side that holds a missing field', () => {
    expect(scanGuidance([], null).side).toBe('FRONT');
    const frontOnly = parseLabel([L('ยาแก้ปวด'), L('500 mg')]);
    const g = scanGuidance(['FRONT'], frontOnly);
    expect(g.tone).toBe('go');
    expect(g.side).toBe('BACK');
  });

  it('asks for a retake when a side was photographed but its field was not read', () => {
    const g = scanGuidance(['FRONT', 'BACK', 'DIRECTIONS'], parseLabel([L('ยาแก้ปวด'), L('500 mg'), L('ส่วนประกอบ: พาราเซตามอล')]));
    expect(g.tone).toBe('retry');
    expect(g.side).toBe('DIRECTIONS');
  });

  it('says done once the key fields are found', () => {
    const p = parseLabel([L('ยาแก้ปวด'), L('500 mg'), L('ส่วนประกอบ: พาราเซตามอล'), L('วันละ 3 ครั้ง'), L('เลขทะเบียน 1A 12/60')]);
    expect(scanGuidance(['FRONT', 'BACK'], p).tone).toBe('done');
  });
});

describe('parsePhotos', () => {
  it('reads the front photo first even if it was taken last', () => {
    const p = parsePhotos([
      { side: 'BACK', ocr: { confidence: 80, lines: [L('ส่วนประกอบ: ผงขมิ้นชัน 250 มก.')] } },
      { side: 'FRONT', ocr: { confidence: 80, lines: [L('ขมิ้นชันแคปซูล'), L('500 mg / แคปซูล')] } },
    ]);
    expect(p?.strength?.value).toMatch(/^500 mg/);
    expect(p?.displayName?.value).toBe('ขมิ้นชันแคปซูล');
  });
});

describe('checked text', () => {
  it('uses the corrected text instead of raw OCR and marks fields as patient-checked', () => {
    const parsed = parsePhotos([
      { side: 'FRONT', ocr: { confidence: 40, lines: [L('ขมินซั้นแคปซูล', 40)], editedText: 'ขมิ้นชันแคปซูล\n500 mg', verified: true } },
    ]);
    expect(parsed?.displayName?.value).toBe('ขมิ้นชันแคปซูล');
    const d = draftFromParsed(parsed!, 'p', [], new Date().toISOString(), 'd');
    expect(d.displayName.verification).toBe('PATIENT_REPORTED');
    expect(d.displayName.extractionConfidence).toBeUndefined();
  });

  it('keeps unchecked OCR text unverified with its OCR confidence', () => {
    const d = draftFromParsed(parsePhotos([{ side: 'FRONT', ocr: { confidence: 70, lines: [L('ยาแก้ไอ', 70), L('10 ml', 70)] } }])!, 'p', [], new Date().toISOString(), 'd');
    expect(d.labelStrength.verification).toBe('UNVERIFIED');
    expect(d.labelStrength.extractionConfidence).toBeCloseTo(0.7);
  });
});

describe('real-photo OCR slips', () => {
  it('finds ingredients despite a misspelled keyword and strips stray edge marks', () => {
    const p = parseLabel([
      L('ฟ้าทะลายโจร แคปซูล'),
      L('ส่วนประกถอบ: ผงฟ้าทะลายโจร 400 มก.'),
      L('| รับประทานครั้งละ 2 แคปซูล วันละ 4 ครั้ง'),
      L('07 @ผลิตโดย บริษัทสมุนไพรไทย จำกัด el'),
    ]);
    expect(p.ingredients?.value).toContain('ผงฟ้าทะลายโจร');
    expect(p.directions?.value.startsWith('รับประทาน')).toBe(true);
  });
});
