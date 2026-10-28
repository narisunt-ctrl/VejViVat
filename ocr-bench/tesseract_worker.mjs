// Runs the app's on-device OCR (Tesseract.js tha+eng, src/services/yai/thaiOcr.ts) under Node for the benchmark.
// Same engine version, language data, image enhancement (imageEnhance.ts is imported as is) and two-pass rule;
// only the resize happens in Python (OpenCV) instead of a browser canvas.
// Protocol: one JSON request per stdin line -> one JSON result per stdout line.
//   request:  {"enhanced": {"path", "w", "h"}, "binary": {"path", "w", "h"}, "thorough": false}  (RGBA files)
//   result:   {"text", "lines": [{"text", "confidence"}], "confidence", "pass", "latency_ms"} or {"error"}
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createWorker } from 'tesseract.js';
import {
  adaptiveBinarize,
  boxBlur3,
  despeckle,
  invertIfMostlyInk,
  ocrScore,
  stretchContrast,
  toGray,
} from '../src/services/yai/imageEnhance.ts';

const SECOND_PASS_TIMEOUT_MS = 30_000; // same as thaiOcr.ts
const cachePath = fileURLToPath(new URL('./.tess-cache', import.meta.url));

let worker = null;
const getWorker = async () => (worker ??= await createWorker('tha+eng', 1, { cachePath }));

function pgm(gray, w, h) {
  return Buffer.concat([Buffer.from(`P5\n${w} ${h}\n255\n`, 'ascii'), Buffer.from(gray)]);
}

function prepare({ path, w, h }, mode) {
  const rgba = new Uint8ClampedArray(readFileSync(path));
  const gray = stretchContrast(toGray(rgba, w, h));
  if (mode === 'enhanced') return pgm(gray, w, h);
  const win = Math.max(25, Math.round(Math.min(w, h) / 40) | 1);
  return pgm(invertIfMostlyInk(despeckle(adaptiveBinarize(boxBlur3(gray, w, h), w, h, win, 15), w, h)), w, h);
}

async function readOnce(image, psm, label) {
  const wk = await getWorker();
  await wk.setParameters({ tessedit_pageseg_mode: psm, preserve_interword_spaces: '1' });
  const { data } = await wk.recognize(image);
  const lines = (data.lines ?? []).map((l) => ({ text: l.text.trim(), confidence: l.confidence })).filter((l) => l.text);
  return { text: data.text, lines, confidence: data.confidence, pass: label };
}

async function handle(req) {
  const t0 = performance.now();
  const first = await readOnce(prepare(req.enhanced, 'enhanced'), '3', 'enhanced psm3');
  let best = first;
  if (req.thorough || first.confidence < 70 || ocrScore(first.confidence, first.text) < 60) {
    let timer;
    const timeout = new Promise((resolve) => (timer = setTimeout(() => resolve(null), SECOND_PASS_TIMEOUT_MS)));
    const second = await Promise.race([readOnce(prepare(req.binary, 'binary'), '11', 'binary psm11'), timeout]);
    clearTimeout(timer);
    if (!second) {
      const stuck = worker;
      worker = null; // as in the app: end the stuck worker, the next read starts a fresh one
      void stuck?.terminate();
    } else if (ocrScore(second.confidence, second.text) > ocrScore(first.confidence, first.text)) {
      best = second;
    }
  }
  return { ...best, latency_ms: performance.now() - t0 };
}

const rl = createInterface({ input: process.stdin });
for await (const line of rl) {
  if (!line.trim()) continue;
  let out;
  try {
    out = await handle(JSON.parse(line));
  } catch (err) {
    out = { error: String(err?.message ?? err) };
  }
  process.stdout.write(JSON.stringify(out) + '\n');
}
await worker?.terminate();
