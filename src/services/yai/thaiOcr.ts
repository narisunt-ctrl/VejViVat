import type { Worker } from 'tesseract.js';
import { OcrLine } from './labelParser';

// On-device Thai + English OCR with Tesseract.js. Images never leave the browser; the first use
// downloads the OCR engine and the Thai language model from the jsDelivr CDN, then they are cached.

export interface OcrResult {
  text: string;
  lines: OcrLine[];
  /** mean confidence 0..100 */
  confidence: number;
  engine: string;
}

export const OCR_ENGINE = 'tesseract.js 5.1.1 (tha+eng)';

let workerPromise: Promise<Worker> | null = null;
let progressListener: ((p: number, status: string) => void) | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = import('tesseract.js')
      .then(({ createWorker }) =>
        createWorker('tha+eng', 1, {
          logger: (m: { status: string; progress: number }) => progressListener?.(m.progress, m.status),
        })
      )
      .catch((err) => {
        workerPromise = null;
        throw err;
      });
  }
  return workerPromise;
}

/** Recognize one image. Jobs run one at a time so progress reporting stays meaningful. */
export function recognizeThai(image: string, onProgress?: (p: number, status: string) => void): Promise<OcrResult> {
  const job = queue.then(async () => {
    progressListener = onProgress ?? null;
    try {
      const worker = await getWorker();
      const { data } = await worker.recognize(image);
      const lines: OcrLine[] = (data.lines ?? []).map((l) => ({ text: l.text.trim(), confidence: l.confidence }));
      return { text: data.text, lines, confidence: data.confidence, engine: OCR_ENGINE };
    } finally {
      progressListener = null;
    }
  });
  queue = job.catch(() => undefined);
  return job;
}

export const OCR_STATUS_TH: Record<string, string> = {
  'loading tesseract core': 'กำลังโหลดระบบอ่านข้อความ',
  'initializing tesseract': 'กำลังเตรียมระบบอ่านข้อความ',
  'loading language traineddata': 'กำลังโหลดภาษาไทย (ครั้งแรกอาจใช้เวลาสักครู่)',
  'initializing api': 'กำลังเตรียมระบบอ่านข้อความ',
  'recognizing text': 'กำลังอ่านข้อความ',
};
