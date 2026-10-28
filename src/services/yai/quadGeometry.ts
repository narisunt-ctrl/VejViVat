// Pure geometry for label outlines found by the edge detector. Kept free of OpenCV so it is unit-testable.

export interface Pt {
  x: number;
  y: number;
}
/** Corners in order: top-left, top-right, bottom-right, bottom-left */
export type Quad = [Pt, Pt, Pt, Pt];

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function orderCorners(pts: Pt[]): Quad {
  const bySum = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDiff = [...pts].sort((a, b) => a.y - a.x - (b.y - b.x));
  return [bySum[0], byDiff[0], bySum[bySum.length - 1], byDiff[byDiff.length - 1]];
}

export function quadArea(q: Quad): number {
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function isConvex(q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const c = q[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross === 0) return false;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

/** Largest corner movement between two outlines, as a fraction of the frame diagonal */
export function cornerDrift(a: Quad, b: Quad, frameW: number, frameH: number): number {
  const diag = Math.hypot(frameW, frameH) || 1;
  return Math.max(...a.map((p, i) => dist(p, b[i]))) / diag;
}

export function scaleQuad(q: Quad, sx: number, sy: number): Quad {
  return q.map((p) => ({ x: p.x * sx, y: p.y * sy })) as Quad;
}

/** Output size for the flattened label, preserving its longest edges */
export function warpSize(q: Quad): { width: number; height: number } {
  const [tl, tr, br, bl] = q;
  return {
    width: Math.round(Math.max(dist(tl, tr), dist(bl, br))),
    height: Math.round(Math.max(dist(tl, bl), dist(tr, br))),
  };
}

/** Reject outlines that are too small, not convex or squashed into a sliver */
export function acceptQuad(q: Quad, frameW: number, frameH: number, minAreaFraction = 0.12): boolean {
  if (!isConvex(q)) return false;
  if (quadArea(q) < minAreaFraction * frameW * frameH) return false;
  const { width, height } = warpSize(q);
  const ratio = Math.min(width, height) / Math.max(width, height);
  return ratio > 0.15;
}

export const STABLE_DRIFT = 0.02;
export const STABLE_TICKS = 3;
