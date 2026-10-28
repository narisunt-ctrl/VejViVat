import { preprocessForOcr } from './cvPreprocess';
import { recognizeThai } from './thaiOcr';
import { OCR_API_URL, dataUrlToBlob, remoteOcr } from './remoteOcr';

// One entry point for reading a label, with a fixed fallback order:
//   1. OCR server (PaddleOCR PP-OCRv5 Thai; Typhoon OCR 1.5 when confidence is low or a thorough read
//      is requested), only if a server is configured AND the user agreed to send photos;
//   2. on-device: OpenCV.js CLAHE preprocessing (JS fallback) + Tesseract.js Thai.
// The result says which engine produced it and why a fallback happened, for field-level provenance.
// It returns text only; nothing here creates medication instructions or schedules.

export interface PipelineResult {
  text: string;
  lines: { text: string; confidence: number | null }[];
  confidence: number | null;
  provider: 'server' | 'on-device';
  engine: string;
  model: string;
  preprocess: string;
  fallbackReason?: string;
  imageSha256?: string;
}

export const cloudOcrAvailable = () => !!OCR_API_URL;

export async function readLabel(
  source: string,
  opts: { thorough: boolean; allowCloud: boolean; onProgress?: (p: number, status: string) => void }
): Promise<PipelineResult> {
  let fallbackReason: string | undefined;
  if (OCR_API_URL && opts.allowCloud) {
    try {
      const r = await remoteOcr(await dataUrlToBlob(source), opts.thorough ? 'accurate' : 'auto');
      return {
        text: r.text,
        lines: r.lines,
        confidence: r.confidence,
        provider: 'server',
        engine: r.engine,
        model: r.model,
        preprocess: `server ${r.preprocess}`,
        fallbackReason: r.fallbackReason ?? undefined,
        imageSha256: r.imageSha256,
      };
    } catch (err) {
      fallbackReason = `เซิร์ฟเวอร์อ่านไม่สำเร็จ (${(err as Error).message}) จึงอ่านในเครื่องแทน`;
    }
  } else if (OCR_API_URL && !opts.allowCloud) {
    fallbackReason = 'ไม่ได้อนุญาตให้ส่งรูป จึงอ่านในเครื่อง';
  }
  const pre = await preprocessForOcr(source);
  const r = await recognizeThai(pre.dataUrl, opts.onProgress, { thorough: opts.thorough });
  return {
    text: r.text,
    lines: r.lines,
    confidence: r.confidence,
    provider: 'on-device',
    engine: 'tesseract.js',
    model: r.engine,
    preprocess: pre.method === 'opencv-clahe' ? 'OpenCV.js CLAHE' : 'JS contrast stretch',
    fallbackReason,
  };
}
