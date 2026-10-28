import { grayToRgba, stretchContrast, toGray } from './imageEnhance';

// Prepares a photo for on-device OCR: resize to ~2000 px, then OpenCV.js grayscale → CLAHE → 3×3 median
// (the same steps as the OCR server's "clahe" mode). If OpenCV.js cannot load in time, a plain-JS
// contrast stretch is used instead, so OCR always gets an image.
//
// How OpenCV.js is loaded matters (measured in the app's browser, 2026-10-28):
// - bundled through Vite as an ES module, startup never completed and the page froze;
// - in a Web Worker (module or classic), Emscripten's startup never completed;
// - as a plain <script> from public/vendor it was ready in ~0.7 s on a bare page, but froze the app page.
// It is therefore OFF unless VITE_ENABLE_OPENCV=true (for testing on real phones). The OCR benchmark also
// showed CLAHE preprocessing made PaddleOCR worse (CER 0.036 → 0.074), so the default loses no accuracy.
export const OPENCV_ENABLED = import.meta.env.VITE_ENABLE_OPENCV === 'true';

export type PreprocessMethod = 'opencv-clahe' | 'js-stretch';
export interface Preprocessed {
  dataUrl: string;
  method: PreprocessMethod;
  ms: number;
}

const TARGET_LONG_SIDE = 2000;
const MAX_LONG_SIDE = 2400;
const LOAD_TIMEOUT_MS = 20_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CV = any;
let cvPromise: Promise<CV> | null = null;

function loadOpenCv(): Promise<CV> {
  if (!OPENCV_ENABLED) return Promise.reject(new Error('OpenCV.js disabled'));
  if (!cvPromise) {
    cvPromise = new Promise<CV>((resolve, reject) => {
      const w = window as unknown as { cv?: CV };
      const deadline = performance.now() + LOAD_TIMEOUT_MS;
      const poll = () => {
        if (w.cv?.Mat) resolve(w.cv);
        else if (performance.now() > deadline) reject(new Error('opencv timeout'));
        else setTimeout(poll, 50);
      };
      if (w.cv?.Mat) return resolve(w.cv);
      const script = document.createElement('script');
      script.src = new URL(`${import.meta.env.BASE_URL}vendor/opencv-4.12.0.js`, document.baseURI).href;
      script.async = true;
      script.onload = poll;
      script.onerror = () => reject(new Error('opencv download failed'));
      document.head.appendChild(script);
    }).catch((err) => {
      cvPromise = null;
      throw err;
    });
  }
  return cvPromise;
}

/** Start loading OpenCV.js in the background (e.g. when the scan page opens) */
export function warmUpOpenCv() {
  loadOpenCv().catch(() => undefined);
}

function claheWithOpenCv(cv: CV, data: ImageData): ImageData {
  const src = cv.matFromImageData(data);
  const gray = new cv.Mat();
  const eq = new cv.Mat();
  const den = new cv.Mat();
  const rgba = new cv.Mat();
  const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    clahe.apply(gray, eq);
    cv.medianBlur(eq, den, 3);
    cv.cvtColor(den, rgba, cv.COLOR_GRAY2RGBA);
    return new ImageData(new Uint8ClampedArray(rgba.data), data.width, data.height);
  } finally {
    src.delete();
    gray.delete();
    eq.delete();
    den.delete();
    rgba.delete();
    clahe.delete();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function preprocessForOcr(src: string): Promise<Preprocessed> {
  const t0 = performance.now();
  const img = await loadImage(src);
  const long = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = long < TARGET_LONG_SIDE ? TARGET_LONG_SIDE / long : Math.min(1, MAX_LONG_SIDE / long);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let method: PreprocessMethod = 'js-stretch';
  try {
    ctx.putImageData(claheWithOpenCv(await loadOpenCv(), data), 0, 0);
    method = 'opencv-clahe';
  } catch {
    data.data.set(grayToRgba(stretchContrast(toGray(data.data, canvas.width, canvas.height))));
    ctx.putImageData(data, 0, 0);
  }
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), method, ms: performance.now() - t0 };
}
