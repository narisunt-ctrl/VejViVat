import type { Worker } from 'tesseract.js';
import { OcrLine } from './labelParser';
import { adaptiveBinarize, boxBlur3, despeckle, grayToRgba, invertIfMostlyInk, ocrScore, stretchContrast, toGray } from './imageEnhance';

// On-device Thai + English OCR with Tesseract.js. Images never leave the browser; the first use
// downloads the OCR engine and the Thai language model from the jsDelivr CDN, then they are cached.
// Pass 1 reads a contrast-enhanced grayscale copy as a page; if that reads poorly (or a thorough
// read is requested), pass 2 reads an adaptively thresholded copy as sparse text, and the better
// result wins.

export interface OcrResult {
  text: string;
  lines: OcrLine[];
  /** mean confidence 0..100 */
  confidence: number;
  engine: string;
}

export const OCR_ENGINE = 'tesseract.js 5.1.1 (tha+eng)';
const TARGET_LONG_SIDE = 2000;
const MAX_LONG_SIDE = 2400;
/** the binarised pass runs smaller: sparse-text mode gets slow on large noisy images */
const BINARY_LONG_SIDE = 1600;
/** never keep an elderly user waiting on the second pass; fall back to the first result */
const SECOND_PASS_TIMEOUT_MS = 30_000;

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Resize so small label text gets enough pixels, then build the enhanced or binarised copy */
function prepare(img: HTMLImageElement, mode: 'enhanced' | 'binary'): HTMLCanvasElement {
  const long = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = mode === 'binary' ? BINARY_LONG_SIDE / long : long < TARGET_LONG_SIDE ? TARGET_LONG_SIDE / long : Math.min(1, MAX_LONG_SIDE / long);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const gray = stretchContrast(toGray(data.data, w, h));
  const out =
    mode === 'enhanced'
      ? gray
      : invertIfMostlyInk(despeckle(adaptiveBinarize(boxBlur3(gray, w, h), w, h, Math.max(25, Math.round(Math.min(w, h) / 40) | 1), 15), w, h));
  data.data.set(grayToRgba(out));
  ctx.putImageData(data, 0, 0);
  return canvas;
}

async function readOnce(worker: Worker, canvas: HTMLCanvasElement, psm: '3' | '11', label: string): Promise<OcrResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await worker.setParameters({ tessedit_pageseg_mode: psm as any, preserve_interword_spaces: '1' });
  const { data } = await worker.recognize(canvas);
  const lines: OcrLine[] = (data.lines ?? []).map((l) => ({ text: l.text.trim(), confidence: l.confidence })).filter((l) => l.text.length > 0);
  return { text: data.text, lines, confidence: data.confidence, engine: `${OCR_ENGINE} · ${label}` };
}

/** Recognize one image. Jobs run one at a time so progress reporting stays meaningful. */
export function recognizeThai(image: string, onProgress?: (p: number, status: string) => void, opts: { thorough?: boolean } = {}): Promise<OcrResult> {
  const job = queue.then(async () => {
    progressListener = onProgress ?? null;
    try {
      const worker = await getWorker();
      const img = await loadImage(image);
      const first = await readOnce(worker, prepare(img, 'enhanced'), '3', 'ภาพปรับคอนทราสต์');
      if (!opts.thorough && first.confidence >= 70 && ocrScore(first.confidence, first.text) >= 60) return first;
      let timer = 0;
      const timeout = new Promise<null>((resolve) => {
        timer = window.setTimeout(() => resolve(null), SECOND_PASS_TIMEOUT_MS);
      });
      const second = await Promise.race([readOnce(worker, prepare(img, 'binary'), '11', 'ภาพขาวดำแบบละเอียด'), timeout]);
      window.clearTimeout(timer);
      if (!second) {
        // The only way to stop a running Tesseract job is to end the worker; the next read starts a fresh one
        workerPromise = null;
        void worker.terminate();
        return first;
      }
      return ocrScore(second.confidence, second.text) > ocrScore(first.confidence, first.text) ? second : first;
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
