import { Pt, Quad, acceptQuad, orderCorners, quadArea, warpSize } from './quadGeometry';

// Label outline detection and perspective correction in plain TypeScript, written for this app.
// OpenCV.js was tried first but its ~11 MB runtime froze the page for minutes while starting up
// in the browser, so this uses a small pipeline that runs in a few milliseconds on a 320px frame:
// grayscale → Otsu threshold → largest label-like blob (not the background) → corner extremes.
// It works best for a box or flat label on a contrasting surface and returns null otherwise.

export interface FrameData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Detection {
  quad: Quad;
  /** true when the blob does not fill its outline well (curved bottle, soft pack) */
  approximate: boolean;
  ms: number;
}

function otsu(gray: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Find the most likely label/box outline. Returns null instead of guessing. */
export function detectQuad(frame: FrameData): Detection | null {
  const t0 = performance.now();
  const { data, width: w, height: h } = frame;
  const n = w * h;
  const gray = new Uint8Array(n);
  for (let i = 0; i < n; i++) gray[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000;

  const t = otsu(gray);
  const bin = new Uint8Array(n);
  for (let i = 0; i < n; i++) bin[i] = gray[i] > t ? 1 : 0;

  // The background is whatever dominates the frame border; the label is the other class
  let borderOn = 0;
  let borderCount = 0;
  for (let x = 0; x < w; x++) {
    borderOn += bin[x] + bin[(h - 1) * w + x];
    borderCount += 2;
  }
  for (let y = 0; y < h; y++) {
    borderOn += bin[y * w] + bin[y * w + w - 1];
    borderCount += 2;
  }
  const fg = borderOn / borderCount > 0.5 ? 0 : 1;

  // Largest 4-connected foreground blob
  const label = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  let bestId = -1;
  let bestSize = 0;
  let id = 0;
  for (let start = 0; start < n; start++) {
    if (bin[start] !== fg || label[start] !== -1) continue;
    let top = 0;
    stack[top++] = start;
    label[start] = id;
    let size = 0;
    while (top > 0) {
      const p = stack[--top];
      size++;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0 && bin[p - 1] === fg && label[p - 1] === -1) (label[p - 1] = id), (stack[top++] = p - 1);
      if (x < w - 1 && bin[p + 1] === fg && label[p + 1] === -1) (label[p + 1] = id), (stack[top++] = p + 1);
      if (y > 0 && bin[p - w] === fg && label[p - w] === -1) (label[p - w] = id), (stack[top++] = p - w);
      if (y < h - 1 && bin[p + w] === fg && label[p + w] === -1) (label[p + w] = id), (stack[top++] = p + w);
    }
    if (size > bestSize) {
      bestSize = size;
      bestId = id;
    }
    id++;
  }
  if (bestId < 0 || bestSize < 0.08 * n) return null;

  // Corner candidates from two sets of extremes: diagonal (x±y) suits mild rotation,
  // axis-aligned (min/max x, y) suits rotation near 45°. Row spans give a hole-free area.
  let minSum = Infinity, maxSum = -Infinity, minDiff = Infinity, maxDiff = -Infinity;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const d: Record<string, Pt> = {};
  let spanArea = 0;
  for (let y = 0; y < h; y++) {
    let rowMin = -1;
    let rowMax = -1;
    for (let x = 0; x < w; x++) {
      if (label[y * w + x] !== bestId) continue;
      if (rowMin < 0) rowMin = x;
      rowMax = x;
      const s = x + y;
      const df = x - y;
      if (s < minSum) (minSum = s), (d.tl = { x, y });
      if (s > maxSum) (maxSum = s), (d.br = { x, y });
      if (df > maxDiff) (maxDiff = df), (d.tr = { x, y });
      if (df < minDiff) (minDiff = df), (d.bl = { x, y });
      if (x < minX) (minX = x), (d.l = { x, y });
      if (x > maxX) (maxX = x), (d.r = { x, y });
      if (y < minY) (minY = y), (d.t = { x, y });
      if (y > maxY) (maxY = y), (d.b = { x, y });
    }
    if (rowMin >= 0) spanArea += rowMax - rowMin + 1;
  }

  // A blob touching all four edges is the background or a full-frame close-up, not an outline
  if (minX <= 1 && minY <= 1 && maxX >= w - 2 && maxY >= h - 2) return null;

  const candidates = [orderCorners([d.tl, d.tr, d.br, d.bl]), orderCorners([d.t, d.r, d.b, d.l])].filter((q) => acceptQuad(q, w, h));
  if (candidates.length === 0) return null;
  const quad = candidates.reduce((a, b) => (quadArea(b) > quadArea(a) ? b : a));
  const fill = spanArea / quadArea(quad);
  if (fill < 0.6 || fill > 1.4) return null;
  return { quad, approximate: fill < 0.88 || fill > 1.12, ms: performance.now() - t0 };
}

/** Homography mapping the unit output rectangle (0..W, 0..H) to the source quad. */
export function homography(quad: Quad, W: number, H: number): number[] {
  const dst = [
    [0, 0],
    [W, 0],
    [W, H],
    [0, H],
  ];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = dst[i];
    const { x, y } = quad[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }
  // Gaussian elimination with partial pivoting
  for (let c = 0; c < 8; c++) {
    let piv = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    [b[c], b[piv]] = [b[piv], b[c]];
    for (let r = c + 1; r < 8; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const hv = new Array(8).fill(0);
  for (let r = 7; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < 8; k++) s -= A[r][k] * hv[k];
    hv[r] = s / A[r][r];
  }
  return [...hv, 1];
}

export function applyHomography(H: number[], u: number, v: number): Pt {
  const z = H[6] * u + H[7] * v + H[8];
  return { x: (H[0] * u + H[1] * v + H[2]) / z, y: (H[3] * u + H[4] * v + H[5]) / z };
}

/** Flatten the outlined region of a full-resolution canvas into a new canvas (bilinear sampling) */
export function warpToCanvas(source: HTMLCanvasElement, quad: Quad, maxSide = 1600): HTMLCanvasElement {
  const size = warpSize(quad);
  const scale = Math.min(1, maxSide / Math.max(size.width, size.height));
  const W = Math.max(1, Math.round(size.width * scale));
  const Hh = Math.max(1, Math.round(size.height * scale));
  const sctx = source.getContext('2d', { willReadFrequently: true })!;
  const src = sctx.getImageData(0, 0, source.width, source.height);
  const out = document.createElement('canvas');
  out.width = W;
  out.height = Hh;
  const octx = out.getContext('2d')!;
  const dst = octx.createImageData(W, Hh);
  const Hm = homography(quad, W, Hh);
  const sw = src.width;
  const sh = src.height;
  const s = src.data;
  const o = dst.data;
  for (let v = 0; v < Hh; v++) {
    for (let u = 0; u < W; u++) {
      const p = applyHomography(Hm, u + 0.5, v + 0.5);
      const x = Math.min(sw - 1.001, Math.max(0, p.x - 0.5));
      const y = Math.min(sh - 1.001, Math.max(0, p.y - 0.5));
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = x - x0;
      const fy = y - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + sw * 4;
      const i11 = i01 + 4;
      const oi = (v * W + u) * 4;
      for (let c = 0; c < 3; c++) {
        o[oi + c] = (s[i00 + c] * (1 - fx) + s[i10 + c] * fx) * (1 - fy) + (s[i01 + c] * (1 - fx) + s[i11 + c] * fx) * fy;
      }
      o[oi + 3] = 255;
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}
