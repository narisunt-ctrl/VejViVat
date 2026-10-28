import { describe, it, expect } from 'vitest';
import { orderCorners, quadArea, isConvex, cornerDrift, warpSize, acceptQuad, scaleQuad, Quad } from '../../services/yai/quadGeometry';

const rect: Quad = [
  { x: 10, y: 10 },
  { x: 110, y: 10 },
  { x: 110, y: 60 },
  { x: 10, y: 60 },
];

describe('quad geometry', () => {
  it('orders shuffled corners as TL, TR, BR, BL', () => {
    expect(orderCorners([rect[2], rect[0], rect[3], rect[1]])).toEqual(rect);
  });

  it('measures area, convexity and output size', () => {
    expect(quadArea(rect)).toBe(5000);
    expect(isConvex(rect)).toBe(true);
    expect(isConvex([rect[0], rect[2], rect[1], rect[3]])).toBe(false);
    expect(warpSize(rect)).toEqual({ width: 100, height: 50 });
  });

  it('accepts a large outline and rejects tiny or sliver ones', () => {
    expect(acceptQuad(rect, 120, 70)).toBe(true);
    expect(acceptQuad(rect, 1000, 1000)).toBe(false);
    const sliver: Quad = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 5 }, { x: 0, y: 5 }];
    expect(acceptQuad(sliver, 100, 30, 0.01)).toBe(false);
  });

  it('reports drift relative to the frame diagonal and scales outlines', () => {
    const moved = rect.map((p) => ({ x: p.x + 3, y: p.y + 4 })) as Quad;
    expect(cornerDrift(rect, moved, 300, 400)).toBeCloseTo(5 / 500);
    expect(scaleQuad(rect, 2, 3)[2]).toEqual({ x: 220, y: 180 });
  });
});

import { detectQuad, homography, applyHomography } from '../../services/yai/edgeDetector';

/** Dark frame with a light, rotated rectangle drawn by point-in-polygon */
function frameWithQuad(w: number, h: number, q: Quad) {
  const data = new Uint8ClampedArray(w * h * 4);
  const inside = (x: number, y: number) => {
    let c = false;
    for (let i = 0, j = 3; i < 4; j = i++) {
      const a = q[i], b = q[j];
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = inside(x + 0.5, y + 0.5) ? 235 : 50;
      data.set([v, v, v, 255], (y * w + x) * 4);
    }
  return { data, width: w, height: h };
}

describe('edge detector', () => {
  const tilted: Quad = [
    { x: 70, y: 80 },
    { x: 250, y: 50 },
    { x: 275, y: 210 },
    { x: 90, y: 250 },
  ];

  it('finds the corners of a tilted light label on a dark surface', () => {
    const det = detectQuad(frameWithQuad(320, 300, tilted));
    expect(det).not.toBeNull();
    det!.quad.forEach((p, i) => {
      expect(Math.abs(p.x - tilted[i].x)).toBeLessThan(6);
      expect(Math.abs(p.y - tilted[i].y)).toBeLessThan(6);
    });
    expect(det!.approximate).toBe(false);
  });

  it('returns null for an empty frame and for a frame filled edge to edge', () => {
    expect(detectQuad(frameWithQuad(120, 100, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]))).toBeNull();
    expect(detectQuad(frameWithQuad(120, 100, [{ x: -5, y: -5 }, { x: 125, y: -5 }, { x: 125, y: 105 }, { x: -5, y: 105 }]))).toBeNull();
  });

  it('homography maps the output rectangle onto the source corners', () => {
    const H = homography(tilted, 200, 150);
    const corners = [applyHomography(H, 0, 0), applyHomography(H, 200, 0), applyHomography(H, 200, 150), applyHomography(H, 0, 150)];
    corners.forEach((p, i) => {
      expect(p.x).toBeCloseTo(tilted[i].x, 6);
      expect(p.y).toBeCloseTo(tilted[i].y, 6);
    });
  });
});
