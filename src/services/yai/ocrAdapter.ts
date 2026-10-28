import { MedicationPassport } from '../../domain/yai/models';
import { field } from '../../data/yai/fixtures';

// OCR seam. No real Thai OCR is configured in this prototype, so the only adapter returns a
// fixed sample label. Its result never depends on the captured pixels and is always flagged synthetic.

export interface OCRExtractionResult {
  engine: string;
  isSynthetic: boolean;
  extractedText: string;
  fields: {
    displayName: string | null;
    ingredient: string | null;
    strength: string | null;
    directions: string | null;
    form: MedicationPassport['form']['value'];
    confidence: number;
  };
}

export interface OCRAdapter {
  readonly isReal: boolean;
  extract(photoId: string): Promise<OCRExtractionResult>;
}

export const SAMPLE_LABELS: OCRExtractionResult['fields'][] = [
  {
    displayName: 'ยาแคปซูลฟ้าทะลายโจร (ตัวอย่าง)',
    ingredient: 'ฟ้าทะลายโจร (Andrographis paniculata) ส่วนเหนือดิน',
    strength: '400 mg / แคปซูล',
    directions: 'ครั้งละ 2 แคปซูล วันละ 4 ครั้ง',
    form: 'CAPSULE',
    confidence: 0.62,
  },
  {
    displayName: 'Amlodipine (ยาตัวอย่าง)',
    ingredient: 'amlodipine besylate',
    strength: null,
    directions: 'วันละ 1 ครั้ง หลังอาหารเช้า',
    form: 'TABLET',
    confidence: 0.55,
  },
];

export class MockOCRAdapter implements OCRAdapter {
  readonly isReal = false;
  private next = 0;

  async extract(): Promise<OCRExtractionResult> {
    await new Promise((r) => setTimeout(r, 600));
    const fields = SAMPLE_LABELS[this.next % SAMPLE_LABELS.length];
    this.next += 1;
    return {
      engine: 'mock-ocr-fixture',
      isSynthetic: true,
      extractedText: [fields.displayName, fields.ingredient, fields.strength, fields.directions].filter(Boolean).join('\n'),
      fields,
    };
  }
}

export const ocrAdapter: OCRAdapter = new MockOCRAdapter();

/** Turn a (synthetic) OCR result into a draft passport. Nothing here is confirmed or scheduled. */
export function draftFromOcr(result: OCRExtractionResult, patientId: string, photoIds: string[], nowIso: string, id: string): MedicationPassport {
  const extra = { isSynthetic: result.isSynthetic, extractionConfidence: result.fields.confidence, evidencePhotoIds: photoIds, capturedAt: nowIso };
  return {
    id,
    patientId,
    version: 1,
    kind: result.fields.form === 'CAPSULE' && result.fields.ingredient?.match(/[ก-๙]/) ? 'HERBAL_FORMULA' : 'CONVENTIONAL',
    form: field(result.fields.form ?? 'UNKNOWN', 'PHOTO_LABEL', extra),
    displayName: field(result.fields.displayName, 'PHOTO_LABEL', extra),
    ingredients: result.fields.ingredient ? [field(result.fields.ingredient, 'PHOTO_LABEL', extra)] : [],
    labelStrength: field(result.fields.strength, 'PHOTO_LABEL', extra),
    labelDirections: field(result.fields.directions, 'PHOTO_LABEL', extra),
    useReports: [],
    registrationNumber: field(null, 'PHOTO_LABEL', extra),
    photoIds,
    status: 'DRAFT',
    pendingIdentification: false,
    unresolvedQuestions: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
