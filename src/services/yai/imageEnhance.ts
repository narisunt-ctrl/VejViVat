// Pre-processing that helps Tesseract on phone photos of medicine packaging: grayscale,
// contrast stretch, and a local (adaptive) threshold that copes with uneven light,
// coloured boxes and white-on-dark printing. Pure functions over pixel arrays.

export function toGray(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const g = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = (rgba[i * 4] * 299 + rgba[i * 4 + 1] * 587 + rgba[i * 4 + 2] * 114) / 1000;
  return g;
}

/** Map the 2nd–98th percentile to 0–255 so faded or low-light labels gain contrast */
export function stretchContrast(gray: Uint8Array): Uint8Array {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const lowCount = gray.length * 0.02;
  const highCount = gray.length * 0.98;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc <= lowCount) lo = v;
    if (acc <= highCount) hi = v;
  }
  if (hi <= lo + 10) return gray;
  const out = new Uint8Array(gray.length);
  const k = 255 / (hi - lo);
  for (let i = 0; i < gray.length; i++) out[i] = Math.max(0, Math.min(255, (gray[i] - lo) * k));
  return out;
}

/**
 * Pixel is ink when darker than the mean of its window minus c. Uses an integral image,
 * so cost does not grow with the window. Output: 0 = ink, 255 = paper.
 */
export function adaptiveBinarize(gray: Uint8Array, w: number, h: number, win = 31, c = 12): Uint8Array {
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += gray[y * w + x];
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row;
    }
  }
  const r = Math.floor(win / 2);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w, x + r + 1);
      const sum = integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      out[y * w + x] = gray[y * w + x] < mean - c ? 0 : 255;
    }
  }
  return out;
}

/** 3×3 box blur to calm sensor noise and JPEG blocks before thresholding */
export function boxBlur3(gray: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += gray[yy * w + xx];
          n++;
        }
      }
      out[y * w + x] = sum / n;
    }
  }
  return out;
}

/** Drop ink pixels with fewer than two ink neighbours; noise specks make Tesseract very slow */
export function despeckle(bin: Uint8Array, w: number, h: number): Uint8Array {
  const out = bin.slice();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (bin[i] !== 0) continue;
      let ink = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && bin[i + dy * w + dx] === 0) ink++;
      if (ink < 2) out[i] = 255;
    }
  }
  return out;
}

/** Light text on a dark box binarises to mostly ink; flip it so Tesseract sees dark text on light */
export function invertIfMostlyInk(bin: Uint8Array): Uint8Array {
  let ink = 0;
  for (let i = 0; i < bin.length; i++) if (bin[i] === 0) ink++;
  if (ink / bin.length <= 0.5) return bin;
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = 255 - bin[i];
  return out;
}

export function grayToRgba(gray: Uint8Array): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length * 4);
  for (let i = 0; i < gray.length; i++) {
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = gray[i];
    out[i * 4 + 3] = 255;
  }
  return out;
}

/** Score used to pick between OCR passes: confident and actually containing text */
export function ocrScore(confidence: number, text: string): number {
  const chars = text.replace(/\s+/g, '').length;
  return confidence * Math.min(1, chars / 30);
}
