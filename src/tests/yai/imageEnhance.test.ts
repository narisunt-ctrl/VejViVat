import { describe, it, expect } from 'vitest';
import { stretchContrast, adaptiveBinarize, invertIfMostlyInk, ocrScore } from '../../services/yai/imageEnhance';

describe('image enhancement for OCR', () => {
  it('stretches a low-contrast image to the full range', () => {
    const g = new Uint8Array(1000).map((_, i) => 100 + (i % 41));
    const out = stretchContrast(g);
    expect(Math.min(...out)).toBeLessThan(15);
    expect(Math.max(...out)).toBeGreaterThan(240);
  });

  it('finds dark strokes under uneven lighting with a local threshold', () => {
    const w = 60, h = 20;
    // brightness ramps left to right; a dark vertical stroke sits on each side
    const g = new Uint8Array(w * h).map((_, i) => {
      const x = i % w;
      const base = 80 + x * 2.5;
      return x === 10 || x === 50 ? base - 60 : base;
    });
    const bin = adaptiveBinarize(g, w, h, 15, 10);
    expect(bin[5 * w + 10]).toBe(0);
    expect(bin[5 * w + 50]).toBe(0);
    expect(bin[5 * w + 30]).toBe(255);
  });

  it('inverts white-on-dark printing and scores empty reads low', () => {
    expect(invertIfMostlyInk(new Uint8Array([0, 0, 0, 255]))[0]).toBe(255);
    expect(invertIfMostlyInk(new Uint8Array([0, 255, 255, 255]))[0]).toBe(0);
    expect(ocrScore(90, '')).toBe(0);
    expect(ocrScore(90, 'ยาแก้ปวดตัวอย่าง Paracetamol 500 mg')).toBeGreaterThan(ocrScore(90, 'ยา'));
  });
});

import { boxBlur3, despeckle } from '../../services/yai/imageEnhance';

describe('noise cleanup', () => {
  it('removes isolated specks but keeps strokes', () => {
    const w = 7, h = 5;
    const bin = new Uint8Array(w * h).fill(255);
    bin[2 * w + 1] = 0; // lone speck
    for (let y = 1; y < 4; y++) bin[y * w + 4] = 0; // short vertical stroke
    const out = despeckle(bin, w, h);
    expect(out[2 * w + 1]).toBe(255);
    expect(out[2 * w + 4]).toBe(0);
  });

  it('box blur averages neighbours', () => {
    const g = new Uint8Array(9).fill(0);
    g[4] = 90;
    expect(boxBlur3(g, 3, 3)[4]).toBe(10);
  });
});
