import { ROWS, TILE, type HerbKind, type ThemeId } from './levels';
import { isSolid, tileAt, type Enemy, type Hero, type Item, type World } from './engine';

// All game art is drawn in code (no image files): soft gradients, rounded shapes and outlines in one cartoon
// style. Ground tiles are drawn once into cached chunks; the parallax layers are drawn once per level and tiled.

type Ctx = CanvasRenderingContext2D;

export interface Theme {
  sky: [string, string, string];
  sun: string;
  far: [string, string];
  mid: [string, string];
  near: string;
  grass: [string, string];
  dirt: [string, string];
  edge: string;
  block: [string, string];
  plank: [string, string];
  water: [string, string];
  thorn: string;
  dark?: boolean;
  fog?: boolean;
}

export const THEMES: Record<ThemeId, Theme> = {
  garden: {
    sky: ['#6FCBF3', '#B9E9FF', '#FFF3D2'],
    sun: '#FFF1B0',
    far: ['#9FD3B0', '#84C29C'],
    mid: ['#5DAE6B', '#3F8E52'],
    near: '#2F7A45',
    grass: ['#7DD155', '#4E9E36'],
    dirt: ['#B98250', '#8A5A33'],
    edge: '#5E3B1F',
    block: ['#D99A58', '#A86A35'],
    plank: ['#C88A4A', '#8E5A2C'],
    water: ['#49B6E0', '#2A7FB0'],
    thorn: '#2E6B3A',
  },
  ricefield: {
    sky: ['#7FCCF0', '#CBEEFF', '#FFE6B0'],
    sun: '#FFE59A',
    far: ['#B4D3A0', '#9CC48A'],
    mid: ['#A6CF5C', '#7FAF3E'],
    near: '#6B9E32',
    grass: ['#93CF5A', '#5F9B33'],
    dirt: ['#9C6B45', '#6F4A2E'],
    edge: '#4E321D',
    block: ['#D4A15E', '#9F6E38'],
    plank: ['#B5CF62', '#7E9A3A'],
    water: ['#5BBFD8', '#3489A8'],
    thorn: '#4F7A2A',
  },
  waterfall: {
    sky: ['#5DBCD3', '#A3E1E8', '#E6F7F0'],
    sun: '#F2FFE8',
    far: ['#7DB5A5', '#5E9A8A'],
    mid: ['#4F8576', '#386A5C'],
    near: '#265F48',
    grass: ['#66C08A', '#3E8F62'],
    dirt: ['#8C9692', '#5F6B68'],
    edge: '#3A4644',
    block: ['#A3ADA9', '#6E7975'],
    plank: ['#B47B45', '#7E5129'],
    water: ['#5ED0E6', '#2E95B8'],
    thorn: '#24583F',
  },
  cave: {
    sky: ['#140C2B', '#24173F', '#3A2760'],
    sun: '#B9A3FF',
    far: ['#2C2150', '#231A42'],
    mid: ['#3A2C68', '#2B2052'],
    near: '#4B3A86',
    grass: ['#8C7BE0', '#5D4CB0'],
    dirt: ['#4C3D7E', '#33285C'],
    edge: '#1F1840',
    block: ['#6E5FB2', '#4A3D86'],
    plank: ['#8B6A4A', '#5E4430'],
    water: ['#5FA8FF', '#3462C8'],
    thorn: '#9FE7FF',
    dark: true,
  },
  summit: {
    sky: ['#9FBFE6', '#D8E5F3', '#F8EEE4'],
    sun: '#FFF6E2',
    far: ['#A8BCD3', '#8FA6C1'],
    mid: ['#5C8676', '#456C5E'],
    near: '#355A4D',
    grass: ['#8CC487', '#5E9A62'],
    dirt: ['#8E7E6E', '#665849'],
    edge: '#433A30',
    block: ['#B0A08E', '#7E6F60'],
    plank: ['#B98552', '#80552E'],
    water: ['#79C2E2', '#3F87B0'],
    thorn: '#3B5F48',
    fog: true,
  },
};

// ---------- helpers ----------
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const q = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + q, y);
  c.arcTo(x + w, y, x + w, y + h, q);
  c.arcTo(x + w, y + h, x, y + h, q);
  c.arcTo(x, y + h, x, y, q);
  c.arcTo(x, y, x + w, y, q);
  c.closePath();
}
function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, stroke?: string, lw = 2) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.lineWidth = lw;
    c.strokeStyle = stroke;
    c.stroke();
  }
}
function glow(c: Ctx, x: number, y: number, r: number, color: string, alpha = 0.5) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.globalAlpha = alpha;
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
}
const OUTLINE = 'rgba(40,28,20,0.85)';

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}

// ---------- parallax layers ----------
const LAYER_W = 1024;
const H = ROWS * TILE;

function drawFar(c: Ctx, th: Theme, theme: ThemeId) {
  for (let layer = 0; layer < 2; layer++) {
    c.fillStyle = th.far[layer];
    c.beginPath();
    c.moveTo(0, H);
    const base = H * (0.52 + layer * 0.1);
    for (let x = 0; x <= LAYER_W; x += 8) {
      const t = (x / LAYER_W) * Math.PI * 2;
      const y = theme === 'cave' ? H * 0.12 + layer * 30 + Math.abs(Math.sin(t * 6 + layer)) * 40 : base - (Math.sin(t * 2 + layer * 1.7) * 50 + Math.sin(t * 5 + layer) * 22 + Math.sin(t * 11) * 6);
      c.lineTo(x, y);
    }
    if (theme === 'cave') {
      // a cave ceiling hangs from the top instead
      c.lineTo(LAYER_W, 0);
      c.lineTo(0, 0);
    } else {
      c.lineTo(LAYER_W, H);
    }
    c.closePath();
    c.fill();
    if (theme === 'summit' && layer === 0) {
      // snowy caps
      c.fillStyle = 'rgba(255,255,255,0.75)';
      for (let x = 60; x < LAYER_W; x += 256) {
        const t = (x / LAYER_W) * Math.PI * 2;
        const y = base - (Math.sin(t * 2) * 50 + Math.sin(t * 5) * 22 + Math.sin(t * 11) * 6);
        c.beginPath();
        c.moveTo(x - 30, y + 22);
        c.quadraticCurveTo(x, y - 6, x + 30, y + 22);
        c.quadraticCurveTo(x, y + 12, x - 30, y + 22);
        c.fill();
      }
    }
  }
}

function tree(c: Ctx, x: number, y: number, s: number, col: [string, string]) {
  c.fillStyle = '#6B4A2E';
  rr(c, x - 4 * s, y - 30 * s, 8 * s, 30 * s, 3 * s);
  c.fill();
  for (const [dx, dy, r] of [
    [0, -46, 22],
    [-16, -36, 16],
    [16, -36, 16],
    [0, -30, 18],
  ])
    ellipse(c, x + dx * s, y + dy * s, r * s, r * s * 0.92, col[0]);
  ellipse(c, x - 6 * s, y - 54 * s, 9 * s, 7 * s, 'rgba(255,255,255,0.18)');
}

function drawMid(c: Ctx, th: Theme, theme: ThemeId) {
  const ground = H * 0.78;
  if (theme === 'garden') {
    for (let i = 0; i < 9; i++) tree(c, 40 + i * 118 + hash(i, 1) * 40, ground + 10, 0.9 + hash(i, 2) * 0.5, th.mid);
    c.fillStyle = th.mid[1];
    c.fillRect(0, ground, LAYER_W, H - ground);
  } else if (theme === 'ricefield') {
    // terraces of paddies with shimmering water and a sala
    for (let k = 0; k < 4; k++) {
      c.fillStyle = k % 2 ? th.mid[0] : th.mid[1];
      c.fillRect(0, ground - 40 + k * 22, LAYER_W, 22);
      c.strokeStyle = 'rgba(255,255,255,0.25)';
      c.lineWidth = 1;
      for (let x = 0; x < LAYER_W; x += 6) {
        c.beginPath();
        c.moveTo(x, ground - 40 + k * 22 + 20);
        c.lineTo(x + 2, ground - 40 + k * 22 + 10);
        c.stroke();
      }
    }
    for (let i = 0; i < 5; i++) {
      const x = 80 + i * 210;
      c.strokeStyle = '#7A5A38';
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(x, ground - 40);
      c.quadraticCurveTo(x + 10, ground - 110, x + 4, ground - 160);
      c.stroke();
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        c.strokeStyle = '#4F8F34';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(x + 4, ground - 160);
        c.quadraticCurveTo(x + 4 + Math.cos(ang) * 30, ground - 175 + Math.sin(ang) * 10, x + 4 + Math.cos(ang) * 50, ground - 150 + Math.abs(Math.sin(ang)) * 10);
        c.stroke();
      }
    }
    // sala
    const sx = 620;
    c.fillStyle = '#8A5A33';
    c.fillRect(sx, ground - 70, 6, 50);
    c.fillRect(sx + 74, ground - 70, 6, 50);
    c.fillStyle = '#B5482E';
    c.beginPath();
    c.moveTo(sx - 14, ground - 66);
    c.lineTo(sx + 40, ground - 108);
    c.lineTo(sx + 94, ground - 66);
    c.closePath();
    c.fill();
  } else if (theme === 'waterfall') {
    c.fillStyle = th.mid[1];
    for (let i = 0; i < 4; i++) {
      const x = i * 260 + 30;
      rr(c, x, ground - 200 - hash(i, 3) * 60, 150, 260, 30);
      c.fill();
    }
    for (let i = 0; i < 4; i++) {
      const x = i * 260 + 95;
      const g = c.createLinearGradient(0, ground - 210, 0, ground + 20);
      g.addColorStop(0, 'rgba(220,250,255,0.9)');
      g.addColorStop(1, 'rgba(160,230,245,0.5)');
      c.fillStyle = g;
      c.fillRect(x, ground - 210 - hash(i, 3) * 60, 22, 240);
    }
    c.fillStyle = th.mid[0];
    c.fillRect(0, ground, LAYER_W, H - ground);
  } else if (theme === 'cave') {
    for (let i = 0; i < 14; i++) {
      const x = i * 76 + hash(i, 4) * 30;
      const len = 40 + hash(i, 5) * 90;
      c.fillStyle = th.mid[i % 2];
      c.beginPath();
      c.moveTo(x - 18, 0);
      c.lineTo(x, len);
      c.lineTo(x + 18, 0);
      c.fill();
      c.beginPath();
      c.moveTo(x + 20, H);
      c.lineTo(x + 34, H - len * 0.8);
      c.lineTo(x + 48, H);
      c.fill();
    }
    for (let i = 0; i < 10; i++) {
      const x = i * 104 + 40;
      const y = H * 0.6 + hash(i, 6) * 60;
      const col = i % 2 ? '#7FE3FF' : '#D59BFF';
      glow(c, x, y, 40, col, 0.35);
      crystal(c, x, y + 20, 16, col);
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const x = i * 76 + hash(i, 7) * 30;
      const s = 0.8 + hash(i, 8) * 0.6;
      c.fillStyle = th.mid[i % 2];
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.moveTo(x - (22 - k * 5) * s, ground - k * 22 * s);
        c.lineTo(x, ground - (40 + k * 22) * s);
        c.lineTo(x + (22 - k * 5) * s, ground - k * 22 * s);
        c.fill();
      }
    }
    c.fillStyle = th.mid[1];
    c.fillRect(0, ground, LAYER_W, H - ground);
  }
}

function crystal(c: Ctx, x: number, y: number, s: number, col: string) {
  c.fillStyle = col;
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = 1.5;
  for (const [dx, h, w] of [
    [0, 2.2, 0.5],
    [-0.55, 1.4, 0.4],
    [0.55, 1.6, 0.4],
  ]) {
    c.beginPath();
    c.moveTo(x + (dx - w) * s, y);
    c.lineTo(x + dx * s, y - h * s);
    c.lineTo(x + (dx + w) * s, y);
    c.closePath();
    c.fill();
    c.stroke();
  }
}

function drawNear(c: Ctx, th: Theme, theme: ThemeId) {
  for (let i = 0; i < 40; i++) {
    const x = i * 26 + hash(i, 9) * 18;
    const y = H - 8 - hash(i, 10) * 10;
    if (theme === 'cave') crystal(c, x, y, 7 + hash(i, 11) * 6, i % 3 ? '#9C8BEA' : '#7FE3FF');
    else if (theme === 'ricefield') {
      c.strokeStyle = i % 2 ? '#7FB04A' : '#C9B24A';
      c.lineWidth = 2;
      for (let k = -2; k <= 2; k++) {
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x + k * 3, y - 14, x + k * 6, y - 22);
        c.stroke();
      }
    } else {
      c.fillStyle = th.near;
      for (let k = -2; k <= 2; k++) {
        c.beginPath();
        c.moveTo(x - 3, y);
        c.quadraticCurveTo(x + k * 5, y - 18 - Math.abs(k) * -2, x + k * 7, y - 22 + Math.abs(k) * 4);
        c.quadraticCurveTo(x + k * 2, y - 8, x + 3, y);
        c.fill();
      }
      if (theme === 'garden' && i % 4 === 0) ellipse(c, x + 4, y - 20, 3.5, 3.5, i % 8 ? '#FFD166' : '#FF8FAB');
    }
  }
}

export interface Art {
  theme: Theme;
  themeId: ThemeId;
  far: HTMLCanvasElement;
  mid: HTMLCanvasElement;
  near: HTMLCanvasElement;
  res: number;
  chunks: Map<number, HTMLCanvasElement>;
}

/** draw the parallax layers for a level once, at `res` pixels per game pixel */
export function makeArt(themeId: ThemeId, res: number): Art {
  const th = THEMES[themeId];
  const layer = (f: (c: Ctx) => void) => {
    const cv = makeCanvas(LAYER_W * res, H * res);
    const c = cv.getContext('2d')!;
    c.scale(res, res);
    f(c);
    return cv;
  };
  return {
    theme: th,
    themeId,
    far: layer((c) => drawFar(c, th, themeId)),
    mid: layer((c) => drawMid(c, th, themeId)),
    near: layer((c) => drawNear(c, th, themeId)),
    res,
    chunks: new Map(),
  };
}

// ---------- tiles ----------
const CHUNK = 16;

function drawGroundTile(c: Ctx, w: World, th: Theme, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  const topOpen = !isSolid(tileAt(w, tx, ty - 1));
  const leftOpen = !isSolid(tileAt(w, tx - 1, ty));
  const rightOpen = !isSolid(tileAt(w, tx + 1, ty));
  const g = c.createLinearGradient(0, y, 0, y + TILE);
  g.addColorStop(0, th.dirt[0]);
  g.addColorStop(1, th.dirt[1]);
  c.fillStyle = g;
  const rl = leftOpen && topOpen ? 10 : 0;
  const rrr = rightOpen && topOpen ? 10 : 0;
  c.beginPath();
  c.moveTo(x + rl, y);
  c.lineTo(x + TILE - rrr, y);
  c.quadraticCurveTo(x + TILE, y, x + TILE, y + rrr);
  c.lineTo(x + TILE, y + TILE + 0.5);
  c.lineTo(x, y + TILE + 0.5);
  c.lineTo(x, y + rl);
  c.quadraticCurveTo(x, y, x + rl, y);
  c.fill();
  // pebbles and roots
  for (let k = 0; k < 3; k++) {
    const r = hash(tx * 3 + k, ty);
    if (r < 0.55) ellipse(c, x + 4 + hash(tx, ty * 7 + k) * 24, y + 8 + hash(tx * 5 + k, ty) * 20, 2 + r * 2, 1.5 + r * 1.5, 'rgba(0,0,0,0.12)');
  }
  if (leftOpen) {
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(x, y + rl, 3, TILE - rl);
  }
  if (rightOpen) {
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(x + TILE - 3, y + rrr, 3, TILE - rrr);
  }
  if (topOpen) {
    // grass cap with a wavy lower edge and blades
    const gg = c.createLinearGradient(0, y - 4, 0, y + 12);
    gg.addColorStop(0, th.grass[0]);
    gg.addColorStop(1, th.grass[1]);
    c.fillStyle = gg;
    c.beginPath();
    c.moveTo(x + (leftOpen ? 2 : 0), y + 2);
    for (let i = 0; i <= 8; i++) c.lineTo(x + (i * TILE) / 8, y + 9 + Math.sin((tx * 8 + i) * 1.7) * 2.5);
    c.lineTo(x + TILE - (rightOpen ? 2 : 0), y + 2);
    c.quadraticCurveTo(x + TILE / 2, y - 3, x + (leftOpen ? 2 : 0), y + 2);
    c.fill();
    c.strokeStyle = th.grass[0];
    c.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const bx = x + 3 + hash(tx * 9 + i, ty) * 26;
      c.beginPath();
      c.moveTo(bx, y + 2);
      c.lineTo(bx + (hash(i, tx) - 0.5) * 4, y - 3 - hash(tx, i) * 4);
      c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(x + (leftOpen ? 6 : 0), y + 1, TILE - (leftOpen ? 6 : 0) - (rightOpen ? 6 : 0), 2);
    if (hash(tx, ty * 13) < 0.14 && !th.dark) ellipse(c, x + 16, y - 2, 3, 3, hash(ty, tx) < 0.5 ? '#FFD166' : '#FF9EBB');
    if (th.dark && hash(tx, ty * 13) < 0.2) crystal(c, x + 16, y + 2, 5, '#7FE3FF');
  }
}

function drawBlock(c: Ctx, th: Theme, x: number, y: number) {
  const g = c.createLinearGradient(0, y, 0, y + TILE);
  g.addColorStop(0, th.block[0]);
  g.addColorStop(1, th.block[1]);
  c.fillStyle = g;
  rr(c, x + 1, y + 1, TILE - 2, TILE - 2, 6);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2;
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.2)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(x + 4, y + 11);
  c.lineTo(x + TILE - 4, y + 11);
  c.moveTo(x + 4, y + 21);
  c.lineTo(x + TILE - 4, y + 21);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.3)';
  rr(c, x + 4, y + 3, TILE - 8, 4, 2);
  c.fill();
}

function drawPlank(c: Ctx, th: Theme, w: World, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  const bamboo = w.def.theme === 'ricefield';
  const g = c.createLinearGradient(0, y, 0, y + 12);
  g.addColorStop(0, th.plank[0]);
  g.addColorStop(1, th.plank[1]);
  c.fillStyle = g;
  rr(c, x, y, TILE, 11, 4);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 1.5;
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.beginPath();
  if (bamboo) {
    c.moveTo(x + 16, y + 1);
    c.lineTo(x + 16, y + 10);
  } else {
    c.moveTo(x + 2, y + 5.5);
    c.lineTo(x + TILE - 2, y + 5.5);
  }
  c.stroke();
  // bridge posts where the plank sits at ground level over water
  if (tileAt(w, tx, ROWS - 1) === '~' && ty >= 10 && tx % 3 === 0) {
    c.fillStyle = th.plank[1];
    c.fillRect(x + 12, y + 10, 8, (ROWS - 1 - ty) * TILE);
  }
}

function drawThorns(c: Ctx, th: Theme, x: number, y: number) {
  if (th.dark) {
    for (let i = 0; i < 3; i++) crystal(c, x + 6 + i * 10, y + TILE, 9, '#9FE7FF');
    return;
  }
  ellipse(c, x + 16, y + 26, 15, 8, th.thorn);
  c.fillStyle = '#E8E2D0';
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    const bx = x + 16 + Math.cos(a) * 13;
    const by = y + 26 + Math.sin(a) * 7;
    c.beginPath();
    c.moveTo(bx - 3, by);
    c.lineTo(bx + Math.cos(a) * 9, by + Math.sin(a) * 9);
    c.lineTo(bx + 3, by);
    c.fill();
  }
}

/** draw tiles of columns [c0, c1) onto c (used for cached chunks and level previews) */
export function drawTiles(c: Ctx, w: World, th: Theme, c0: number, c1: number) {
  for (let tx = Math.max(0, c0); tx < Math.min(w.cols, c1); tx++)
    for (let ty = 0; ty < ROWS; ty++) {
      const ch = w.map[ty][tx];
      if (ch === '#') drawGroundTile(c, w, th, tx, ty);
      else if (ch === 'B') drawBlock(c, th, tx * TILE, ty * TILE);
      else if (ch === '=') drawPlank(c, th, w, tx, ty);
      else if (ch === '^') drawThorns(c, th, tx * TILE, ty * TILE);
    }
}

function chunk(art: Art, w: World, i: number): HTMLCanvasElement {
  let cv = art.chunks.get(i);
  if (cv) return cv;
  cv = makeCanvas(CHUNK * TILE * art.res + 2, H * art.res);
  const c = cv.getContext('2d')!;
  c.scale(art.res, art.res);
  c.translate(-i * CHUNK * TILE, 0);
  drawTiles(c, w, art.theme, i * CHUNK - 1, (i + 1) * CHUNK + 1);
  art.chunks.set(i, cv);
  if (art.chunks.size > 8) art.chunks.delete(art.chunks.keys().next().value as number);
  return cv;
}

// ---------- things ----------
const HERB_COLOR: Record<HerbKind, string> = {
  kaprao: '#3FA34D',
  takrai: '#9ACD5A',
  khing: '#E2B66A',
  khamin: '#F29E2E',
  makrut: '#5E9E3A',
  anchan: '#3C5BD9',
  toei: '#2E9C5A',
  manao: '#9BD24A',
};

export function drawHerb(c: Ctx, kind: HerbKind, x: number, y: number, s = 1) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.lineJoin = 'round';
  const leaf = (lx: number, ly: number, ang: number, len: number, col: string) => {
    c.save();
    c.translate(lx, ly);
    c.rotate(ang);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(len * 0.5, -len * 0.35, len, 0);
    c.quadraticCurveTo(len * 0.5, len * 0.35, 0, 0);
    c.fillStyle = col;
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.4;
    c.stroke();
    c.restore();
  };
  switch (kind) {
    case 'kaprao':
      c.strokeStyle = '#6B4E71';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, 12);
      c.lineTo(0, -8);
      c.stroke();
      for (const [ly, a] of [
        [6, 0.5],
        [0, 0.4],
        [-6, 0.3],
      ])
        for (const d of [-1, 1]) leaf(0, ly, d < 0 ? Math.PI - a : a, 11, HERB_COLOR.kaprao);
      ellipse(c, 0, -10, 2.5, 4, '#B98AC0');
      break;
    case 'takrai':
      for (const [dx, a] of [
        [-4, -0.18],
        [0, 0],
        [4, 0.18],
      ]) {
        c.save();
        c.translate(dx, 12);
        c.rotate(a);
        rr(c, -2.5, -24, 5, 24, 2.5);
        c.fillStyle = HERB_COLOR.takrai;
        c.fill();
        c.strokeStyle = OUTLINE;
        c.lineWidth = 1.2;
        c.stroke();
        c.fillStyle = '#F2EBC9';
        c.fillRect(-2.5, -6, 5, 6);
        c.restore();
      }
      break;
    case 'khing':
    case 'khamin': {
      const col = HERB_COLOR[kind];
      ellipse(c, -2, 2, 11, 6, col, OUTLINE, 1.6);
      ellipse(c, 8, -3, 6, 4, col, OUTLINE, 1.6);
      ellipse(c, -11, -3, 5, 4, col, OUTLINE, 1.6);
      if (kind === 'khamin') ellipse(c, 8, 6, 5, 5, '#FF8A1F', OUTLINE, 1.4);
      c.strokeStyle = 'rgba(0,0,0,0.25)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-6, -1);
      c.lineTo(-5, 5);
      c.moveTo(2, -1);
      c.lineTo(3, 5);
      c.stroke();
      break;
    }
    case 'makrut':
      ellipse(c, 0, 3, 10, 10, HERB_COLOR.makrut, OUTLINE, 1.6);
      for (let i = 0; i < 6; i++) ellipse(c, -5 + (i % 3) * 5, -1 + Math.floor(i / 3) * 7, 1.6, 1.6, '#86C25A');
      leaf(2, -7, -0.9, 10, '#3F8A3A');
      leaf(5, -11, -0.6, 8, '#3F8A3A');
      break;
    case 'anchan':
      for (let i = 0; i < 4; i++) leaf(0, 0, (i / 4) * Math.PI * 2 + 0.4, 12, HERB_COLOR.anchan);
      ellipse(c, 0, 0, 4, 4, '#FFFFFF', OUTLINE, 1.2);
      ellipse(c, 0, 0, 2, 2, '#FFD166');
      break;
    case 'toei':
      for (const a of [-0.7, -0.35, 0, 0.35, 0.7]) leaf(0, 12, -Math.PI / 2 + a, 24, HERB_COLOR.toei);
      break;
    case 'manao':
      ellipse(c, 0, 2, 11, 9, HERB_COLOR.manao, OUTLINE, 1.6);
      ellipse(c, -4, -2, 3.5, 2, 'rgba(255,255,255,0.45)');
      leaf(6, -6, -0.7, 9, '#3F8A3A');
      break;
  }
  c.restore();
}

function drawSeed(c: Ctx, x: number, y: number, t: number) {
  const sx = Math.abs(Math.cos(t * 3));
  c.save();
  c.translate(x, y);
  c.scale(0.35 + sx * 0.65, 1);
  const g = c.createLinearGradient(0, -9, 0, 9);
  g.addColorStop(0, '#FFF2A8');
  g.addColorStop(0.5, '#FFC93C');
  g.addColorStop(1, '#D98A12');
  c.beginPath();
  c.moveTo(0, -10);
  c.bezierCurveTo(8, -4, 8, 6, 0, 9);
  c.bezierCurveTo(-8, 6, -8, -4, 0, -10);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = 'rgba(120,70,10,0.9)';
  c.lineWidth = 1.5;
  c.stroke();
  ellipse(c, -2, -3, 1.8, 3, 'rgba(255,255,255,0.75)');
  c.restore();
}

function drawLotus(c: Ctx, x: number, y: number, t: number) {
  c.save();
  c.translate(x, y);
  c.rotate(t * 0.8);
  c.strokeStyle = 'rgba(255,233,168,0.55)';
  c.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    c.rotate(Math.PI / 4);
    c.beginPath();
    c.moveTo(0, 14);
    c.lineTo(0, 22);
    c.stroke();
  }
  c.restore();
  glow(c, x, y, 26, '#FFE9A8', 0.6);
  c.save();
  c.translate(x, y + 4);
  for (const [a, col] of [
    [-1.1, '#FFC2DA'],
    [1.1, '#FFC2DA'],
    [-0.55, '#FF9EC4'],
    [0.55, '#FF9EC4'],
    [0, '#FFD5E6'],
  ] as const) {
    c.save();
    c.rotate(a);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-7, -9, 0, -17);
    c.quadraticCurveTo(7, -9, 0, 0);
    c.fillStyle = col;
    c.fill();
    c.strokeStyle = '#C2477A';
    c.lineWidth = 1.3;
    c.stroke();
    c.restore();
  }
  ellipse(c, 0, -2, 4, 2.5, '#FFD166', '#C98A12', 1);
  c.restore();
}

function drawChest(c: Ctx, x: number, y: number, open: boolean, t: number) {
  if (!open) glow(c, x, y, 26, '#FFE07A', 0.35 + Math.sin(t * 4) * 0.1);
  c.save();
  c.translate(x, y + 4);
  const g = c.createLinearGradient(0, -8, 0, 12);
  g.addColorStop(0, '#E2B26A');
  g.addColorStop(1, '#A8722F');
  c.fillStyle = g;
  rr(c, -14, -6, 28, 18, 5);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2;
  c.stroke();
  c.strokeStyle = 'rgba(90,55,20,0.55)';
  c.lineWidth = 1.2;
  for (let i = -12; i < 14; i += 5) {
    c.beginPath();
    c.moveTo(i, -5);
    c.lineTo(i + 4, 11);
    c.moveTo(i + 4, -5);
    c.lineTo(i, 11);
    c.stroke();
  }
  c.save();
  if (open) {
    c.translate(-14, -6);
    c.rotate(-0.9);
    c.translate(14, 6);
  }
  c.fillStyle = '#C98F4A';
  rr(c, -15, -12, 30, 8, 4);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2;
  c.stroke();
  c.restore();
  if (!open) {
    ellipse(c, 0, -4, 3.5, 3.5, '#FFE07A', OUTLINE, 1.2);
  } else {
    drawHerb(c, 'toei', 0, -12, 0.6);
  }
  c.restore();
}

function drawPower(c: Ctx, kind: 'speed' | 'kite' | 'hat', x: number, y: number, t: number) {
  glow(c, x, y, 24, '#BFF0FF', 0.5);
  c.strokeStyle = 'rgba(255,255,255,0.8)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, 15 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2);
  c.stroke();
  c.save();
  c.translate(x, y);
  if (kind === 'speed') {
    for (const dx of [-5, 5]) {
      rr(c, dx - 4, -8, 8, 16, 4);
      c.fillStyle = '#E86A3A';
      c.fill();
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.4;
      c.stroke();
      c.fillStyle = '#FFE07A';
      c.fillRect(dx - 4, -3, 8, 2.5);
    }
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-14, -2);
    c.lineTo(-10, -2);
    c.moveTo(-14, 3);
    c.lineTo(-9, 3);
    c.stroke();
  } else if (kind === 'kite') {
    c.beginPath();
    c.moveTo(0, -12);
    c.lineTo(9, -2);
    c.lineTo(5, 10);
    c.lineTo(-5, 10);
    c.lineTo(-9, -2);
    c.closePath();
    c.fillStyle = '#E8455A';
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.5;
    c.stroke();
    c.strokeStyle = '#FFE07A';
    c.beginPath();
    c.moveTo(0, -12);
    c.lineTo(0, 10);
    c.moveTo(-9, -2);
    c.lineTo(9, -2);
    c.stroke();
  } else {
    drawNgob(c, 0, 4, 1);
  }
  c.restore();
}

/** งอบ, the woven conical farm hat */
function drawNgob(c: Ctx, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  const g = c.createLinearGradient(0, -14, 0, 2);
  g.addColorStop(0, '#F3D58C');
  g.addColorStop(1, '#C99A45');
  c.beginPath();
  c.moveTo(-16, 0);
  c.quadraticCurveTo(0, -20, 16, 0);
  c.quadraticCurveTo(0, 4, -16, 0);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 1.6;
  c.stroke();
  c.strokeStyle = 'rgba(120,80,20,0.5)';
  c.lineWidth = 1;
  for (const k of [-8, 0, 8]) {
    c.beginPath();
    c.moveTo(k * 0.3, -11);
    c.lineTo(k * 1.6, 1);
    c.stroke();
  }
  c.restore();
}

function drawSpringLeaf(c: Ctx, x: number, y: number, squash: number) {
  const k = squash > 0 ? 1 - Math.sin((squash / 0.25) * Math.PI) * 0.5 : 1;
  c.save();
  c.translate(x + 16, y + 14);
  c.scale(1 + (1 - k) * 0.3, k);
  const g = c.createLinearGradient(0, -14, 0, 0);
  g.addColorStop(0, '#9BE37A');
  g.addColorStop(1, '#4E9E36');
  c.beginPath();
  c.moveTo(-17, 0);
  c.quadraticCurveTo(-18, -16, 0, -14);
  c.quadraticCurveTo(18, -16, 17, 0);
  c.closePath();
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 1.8;
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(0, -13);
  c.lineTo(0, -2);
  for (const d of [-1, 1])
    for (let i = 0; i < 3; i++) {
      c.moveTo(0, -11 + i * 3.5);
      c.lineTo(d * (10 - i * 2), -12 + i * 3.5);
    }
  c.stroke();
  c.restore();
}

function drawRaft(c: Ctx, x: number, y: number, wdt: number) {
  for (let i = 0; i < 5; i++) {
    const g = c.createLinearGradient(0, y, 0, y + 12);
    g.addColorStop(0, '#C8D97A');
    g.addColorStop(1, '#7E9A3A');
    c.fillStyle = g;
    rr(c, x, y + i * 0.2, wdt, 12, 6);
    c.fill();
  }
  c.strokeStyle = OUTLINE;
  c.lineWidth = 1.6;
  rr(c, x, y, wdt, 12, 6);
  c.stroke();
  c.strokeStyle = 'rgba(70,60,20,0.5)';
  c.beginPath();
  for (let i = 1; i < 6; i++) {
    c.moveTo(x + (i * wdt) / 6, y + 1);
    c.lineTo(x + (i * wdt) / 6, y + 11);
  }
  c.stroke();
  c.strokeStyle = '#8A5A33';
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(x + 10, y + 6);
  c.lineTo(x + wdt - 10, y + 6);
  c.stroke();
}

function drawFlag(c: Ctx, x: number, base: number, on: boolean, t: number) {
  c.fillStyle = '#7A5530';
  rr(c, x + 13, base - 64, 6, 64, 3);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 1.5;
  c.stroke();
  const fy = on ? base - 62 : base - 26;
  const wave = Math.sin(t * 6) * 3;
  c.beginPath();
  c.moveTo(x + 19, fy);
  c.quadraticCurveTo(x + 32, fy + 4 + wave, x + 44, fy + 2);
  c.lineTo(x + 36, fy + 10);
  c.lineTo(x + 44, fy + 18);
  c.quadraticCurveTo(x + 32, fy + 16 + wave, x + 19, fy + 20);
  c.closePath();
  c.fillStyle = on ? '#3FBF7F' : '#B7B0A3';
  c.fill();
  c.stroke();
  ellipse(c, x + 16, base - 66, 5, 5, on ? '#FFE07A' : '#D8D2C4', OUTLINE, 1.4);
}

/** a golden Thai-style gate; barred until the boss is down */
function drawGoal(c: Ctx, x: number, base: number, locked: boolean, t: number) {
  const gx = x - 14;
  glow(c, gx + 34, base - 60, 70, '#FFE9A8', locked ? 0.15 : 0.35 + Math.sin(t * 3) * 0.08);
  c.fillStyle = '#C0392B';
  for (const px of [gx, gx + 56]) {
    rr(c, px, base - 92, 12, 92, 3);
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.6;
    c.stroke();
  }
  // tiered roof
  for (let k = 0; k < 2; k++) {
    const y = base - 92 - k * 16;
    c.beginPath();
    c.moveTo(gx - 10 + k * 8, y + 4);
    c.quadraticCurveTo(gx + 34, y - 26 + k * 4, gx + 78 - k * 8, y + 4);
    c.lineTo(gx + 66 - k * 8, y + 4);
    c.lineTo(gx + 34, y - 10 + k * 2);
    c.lineTo(gx + 2 + k * 8, y + 4);
    c.closePath();
    c.fillStyle = k ? '#E8B73A' : '#D35400';
    c.fill();
    c.strokeStyle = OUTLINE;
    c.stroke();
  }
  c.strokeStyle = '#E8B73A';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(gx - 10, base - 88);
  c.quadraticCurveTo(gx - 16, base - 98, gx - 8, base - 104);
  c.moveTo(gx + 78, base - 88);
  c.quadraticCurveTo(gx + 84, base - 98, gx + 76, base - 104);
  c.stroke();
  if (locked) {
    c.strokeStyle = '#5E4430';
    c.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(gx + 18 + i * 10, base - 84);
      c.lineTo(gx + 18 + i * 10, base);
      c.stroke();
    }
  }
}

function drawEnemy(c: Ctx, e: Enemy, t: number) {
  const cx = e.x + e.w / 2;
  const by = e.y + e.h;
  c.save();
  c.translate(cx, by);
  if (!e.alive) {
    c.globalAlpha = Math.max(0, Math.min(1, e.bonkT));
    c.rotate(Math.PI);
    c.translate(0, e.h);
  }
  c.scale(e.dir > 0 ? -1 : 1, 1);
  const eye = (x: number, y: number, r: number) => {
    ellipse(c, x, y, r, r * 1.1, '#FFFFFF', OUTLINE, 1.2);
    ellipse(c, x - r * 0.25, y + r * 0.15, r * 0.55, r * 0.65, '#2A1E16');
    ellipse(c, x - r * 0.4, y - r * 0.2, r * 0.22, r * 0.22, '#FFFFFF');
  };
  if (e.kind === 'snail') {
    const wob = Math.sin(t * 6 + e.id) * 1.5;
    c.beginPath();
    c.moveTo(-14, 0);
    c.quadraticCurveTo(-16, -10, -10, -10);
    c.lineTo(12, -6);
    c.quadraticCurveTo(15, -2, 13, 0);
    c.closePath();
    c.fillStyle = '#F1D9B0';
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.6;
    c.stroke();
    c.strokeStyle = OUTLINE;
    c.beginPath();
    c.moveTo(-11, -10);
    c.lineTo(-14, -18 + wob);
    c.moveTo(-8, -10);
    c.lineTo(-8, -19 - wob);
    c.stroke();
    eye(-14, -19 + wob, 2.6);
    eye(-8, -20 - wob, 2.6);
    const g = c.createRadialGradient(3, -14, 2, 3, -12, 12);
    g.addColorStop(0, '#F7B267');
    g.addColorStop(1, '#C0642A');
    ellipse(c, 3, -11, 10, 10, g, OUTLINE, 1.6);
    c.strokeStyle = 'rgba(90,40,10,0.7)';
    c.lineWidth = 1.4;
    c.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.2) {
      const r = 1 + a * 0.65;
      const px = 3 + Math.cos(a) * r;
      const py = -11 + Math.sin(a) * r;
      if (a === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  } else if (e.kind === 'beetle' || e.kind === 'boss') {
    const s = e.kind === 'boss' ? 2.4 : 1;
    const step = Math.sin(t * 14 + e.id) * 2;
    c.scale(s, s);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.6 / s + 0.6;
    for (const lx of [-8, 0, 8]) {
      c.beginPath();
      c.moveTo(lx, -6);
      c.lineTo(lx - 3 + (lx === 0 ? -step : step), 0);
      c.stroke();
    }
    const g = c.createLinearGradient(0, -20, 0, -4);
    g.addColorStop(0, e.kind === 'boss' ? (e.hurtT > 0 && Math.floor(t * 20) % 2 ? '#FFFFFF' : '#7A3F8F') : '#4FA36B');
    g.addColorStop(1, e.kind === 'boss' ? '#3B1E4A' : '#1F5E3A');
    ellipse(c, 2, -11, 13, 9, g, OUTLINE, 1.6 / s + 0.4);
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.moveTo(2, -20);
    c.lineTo(2, -3);
    c.stroke();
    ellipse(c, -2, -15, 4, 2, 'rgba(255,255,255,0.4)');
    ellipse(c, -11, -9, 6, 5.5, e.kind === 'boss' ? '#2B1636' : '#1D3B28', OUTLINE, 1.2);
    if (e.kind === 'boss') {
      c.fillStyle = '#2B1636';
      c.beginPath();
      c.moveTo(-14, -11);
      c.quadraticCurveTo(-24, -18, -20, -27);
      c.quadraticCurveTo(-18, -18, -11, -14);
      c.fill();
      c.stroke();
      c.strokeStyle = '#FFFFFF';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(-15, -14);
      c.lineTo(-11, -12.5);
      c.moveTo(-9, -12.5);
      c.lineTo(-6, -14);
      c.stroke();
    }
    eye(-13, -10, 2.2);
    eye(-8, -10, 2.2);
  } else {
    // grasshopper
    const crouch = e.onGround ? 0 : -4;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.5;
    c.fillStyle = '#7CC24A';
    c.beginPath();
    c.moveTo(4, -8 + crouch);
    c.lineTo(12, -18 + crouch * 2);
    c.lineTo(14, 0);
    c.stroke();
    ellipse(c, 2, -10, 11, 6, '#8BD15A', OUTLINE, 1.5);
    ellipse(c, -9, -12, 6, 6, '#8BD15A', OUTLINE, 1.5);
    c.beginPath();
    c.moveTo(-10, -17);
    c.quadraticCurveTo(-16, -26, -22, -24);
    c.stroke();
    eye(-11, -13, 2.4);
    ellipse(c, 6, -13, 7, 3, 'rgba(255,255,255,0.35)');
  }
  if (!e.alive) {
    c.rotate(t * 6);
    c.fillStyle = '#FFE07A';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      ellipse(c, Math.cos(a) * 12, -e.h - 4 + Math.sin(a) * 4, 2.5, 2.5, '#FFE07A');
    }
  }
  c.restore();
}

/** ยายพร้อม: white bun, round glasses, teal blouse, striped sarong, a basket of herbs on her back */
export function drawHero(c: Ctx, h: Hero, t: number, basket = 0) {
  if (h.invuln > 0 && Math.floor(t * 16) % 2 === 0) return;
  const cx = h.x + h.w / 2;
  const by = h.y + h.h;
  const running = h.onGround && Math.abs(h.vx) > 20;
  const phase = h.stride / 9;
  const air = !h.onGround;
  const squash = h.land > 0 ? 1 - h.land * 1.2 : 1;
  const bob = running ? Math.abs(Math.sin(phase)) * -1.8 : Math.sin(t * 2.5) * 0.6;
  c.save();
  c.translate(cx, by);
  c.scale(h.face * (2 - squash), squash);
  if (h.speedT > 0 && running) {
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-14 - i * 4, -10 - i * 7);
      c.lineTo(-26 - i * 4, -10 - i * 7);
      c.stroke();
    }
  }
  // legs
  const legSwing = running ? Math.sin(phase) * 5 : air ? 3 : 0;
  c.strokeStyle = '#E8B98F';
  c.lineWidth = 3.5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-3, -9);
  c.lineTo(-3 + legSwing, -2);
  c.moveTo(3, -9);
  c.lineTo(3 - legSwing, air ? -4 : -2);
  c.stroke();
  ellipse(c, -3 + legSwing + 1.5, -1.5, 3.5, 2, '#8A4B2A');
  ellipse(c, 3 - legSwing + 1.5, air ? -3.5 : -1.5, 3.5, 2, '#8A4B2A');
  c.translate(0, bob);
  // basket on the back
  c.save();
  c.translate(-9, -20);
  const bg = c.createLinearGradient(0, -8, 0, 8);
  bg.addColorStop(0, '#D9A35C');
  bg.addColorStop(1, '#9C672E');
  c.fillStyle = bg;
  rr(c, -6, -7, 12, 15, 4);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 1.4;
  c.stroke();
  c.strokeStyle = 'rgba(90,55,20,0.6)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-5, -2);
  c.lineTo(5, -2);
  c.moveTo(-5, 3);
  c.lineTo(5, 3);
  c.stroke();
  for (let i = 0; i < Math.min(4, 1 + Math.floor(basket / 3)); i++) {
    c.save();
    c.translate(-3 + i * 2.5, -7);
    c.rotate(-0.5 + i * 0.35);
    ellipse(c, 0, -4, 2.2, 5, i % 2 ? '#3FA34D' : '#7CC24A', OUTLINE, 0.8);
    c.restore();
  }
  c.restore();
  // sarong and blouse
  const sg = c.createLinearGradient(0, -16, 0, -8);
  sg.addColorStop(0, '#6A4FB0');
  sg.addColorStop(1, '#4B3486');
  c.fillStyle = sg;
  c.beginPath();
  c.moveTo(-7, -16);
  c.lineTo(7, -16);
  c.lineTo(8, -8);
  c.lineTo(-8, -8);
  c.closePath();
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 1.4;
  c.stroke();
  c.strokeStyle = '#E8B73A';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-7.5, -11);
  c.lineTo(7.5, -11);
  c.stroke();
  const blouse = c.createLinearGradient(0, -26, 0, -15);
  blouse.addColorStop(0, '#5FD3C0');
  blouse.addColorStop(1, '#2FA894');
  c.fillStyle = blouse;
  rr(c, -7, -26, 14, 11, 4);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.stroke();
  // arms
  const arm = running ? Math.sin(phase + Math.PI) * 4 : air ? -6 : 0;
  c.strokeStyle = '#F2C9A0';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(4, -23);
  c.lineTo(8 + arm * 0.5, air ? -31 : -17 + arm * 0.3);
  c.stroke();
  // head
  const hy = -34;
  ellipse(c, 0, hy, 10.5, 10, '#F2C9A0', OUTLINE, 1.6);
  // hair and bun
  c.fillStyle = '#EDEBE6';
  c.beginPath();
  c.ellipse(-1, hy - 3, 11, 8, 0, Math.PI, Math.PI * 2);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 1.4;
  c.stroke();
  ellipse(c, -7, hy - 10, 5, 5, '#F4F2EE', OUTLINE, 1.4);
  c.strokeStyle = '#FF7FA8';
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(-1, hy - 3, 11, 8, 0, Math.PI * 1.05, Math.PI * 1.6);
  c.stroke();
  // face
  ellipse(c, 4, hy + 1, 2.1, 2.6, '#2A1E16');
  ellipse(c, 3.4, hy, 0.8, 0.8, '#FFFFFF');
  ellipse(c, 6.5, hy + 5, 2.4, 1.6, 'rgba(255,120,120,0.45)');
  c.strokeStyle = 'rgba(160,120,40,0.9)';
  c.lineWidth = 1;
  c.beginPath();
  c.arc(4, hy + 1, 3.6, 0, Math.PI * 2);
  c.moveTo(0.4, hy + 1);
  c.lineTo(-2, hy);
  c.stroke();
  c.strokeStyle = '#8A4B2A';
  c.lineWidth = 1.3;
  c.beginPath();
  c.arc(5, hy + 5, 2.4, 0.2, Math.PI - 0.6);
  c.stroke();
  if (h.shield) {
    glow(c, 0, hy - 8, 20, '#FFE9A8', 0.4);
    drawNgob(c, 0, hy - 6, 1);
  }
  c.restore();
  if (h.kiteT > 0) {
    const kx = cx - h.face * 30;
    const ky = h.y - 28 + Math.sin(t * 3) * 4;
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx, h.y + 6);
    c.quadraticCurveTo(cx - h.face * 18, h.y - 6, kx, ky + 8);
    c.stroke();
    drawPower(c, 'kite', kx, ky, t);
  }
}

// ---------- the frame ----------
export interface Camera {
  x: number;
  y: number;
}

function drawLayer(c: Ctx, img: HTMLCanvasElement, res: number, camX: number, factor: number, viewW: number) {
  const off = -((camX * factor) % LAYER_W);
  for (let x = off - LAYER_W; x < viewW; x += LAYER_W) c.drawImage(img, x, 0, LAYER_W + 0.5, H);
  void res;
}

export function render(c: Ctx, w: World, cam: Camera, viewW: number, viewH: number, art: Art, t: number) {
  const th = art.theme;
  // sky fills the whole view, including above the level on tall screens
  const sky = c.createLinearGradient(0, 0, 0, viewH);
  sky.addColorStop(0, th.sky[0]);
  sky.addColorStop(0.6, th.sky[1]);
  sky.addColorStop(1, th.sky[2]);
  c.fillStyle = sky;
  c.fillRect(0, 0, viewW, viewH);
  glow(c, viewW * 0.78 - cam.x * 0.02, 80 - cam.y, 120, th.sun, th.dark ? 0.35 : 0.8);
  if (!th.dark) {
    c.globalAlpha = 0.85;
    for (let i = 0; i < 6; i++) {
      const x = ((i * 300 + t * 8 - cam.x * 0.12) % (viewW + 300)) - 150;
      const y = 40 + (i % 3) * 38 - cam.y * 0.5;
      const xx = x < -150 ? x + viewW + 300 : x;
      for (const [dx, dy, r] of [
        [0, 0, 22],
        [20, -8, 26],
        [44, 0, 20],
        [22, 6, 22],
      ])
        ellipse(c, xx + dx, y + dy, r, r * 0.7, '#FFFFFF');
    }
    c.globalAlpha = 1;
  }
  c.save();
  c.translate(0, -cam.y);
  drawLayer(c, art.far, art.res, cam.x, 0.2, viewW);
  drawLayer(c, art.mid, art.res, cam.x, 0.45, viewW);
  if (th.fog) {
    const fog = c.createLinearGradient(0, H * 0.45, 0, H * 0.8);
    fog.addColorStop(0, 'rgba(255,255,255,0)');
    fog.addColorStop(1, 'rgba(255,255,255,0.55)');
    c.fillStyle = fog;
    c.fillRect(0, H * 0.45, viewW, H * 0.35);
  }
  drawLayer(c, art.near, art.res, cam.x, 0.75, viewW);
  c.restore();

  c.save();
  c.translate(-Math.round(cam.x * 2) / 2, -Math.round(cam.y * 2) / 2);
  // water, animated
  const left = Math.floor(cam.x / TILE) - 1;
  const right = Math.ceil((cam.x + viewW) / TILE) + 1;
  for (let tx = left; tx < right; tx++) {
    if (tileAt(w, tx, ROWS - 1) !== '~') continue;
    const x = tx * TILE;
    const y = (ROWS - 1) * TILE + 6;
    const g = c.createLinearGradient(0, y, 0, y + TILE);
    g.addColorStop(0, th.water[0]);
    g.addColorStop(1, th.water[1]);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, y + TILE);
    for (let i = 0; i <= 8; i++) c.lineTo(x + i * 4, y + Math.sin(t * 3 + (x + i * 4) * 0.08) * 2.5);
    c.lineTo(x + TILE, y + TILE);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(x + ((t * 20 + tx * 7) % 24), y + 6, 6, 1.5);
  }
  // cached ground chunks
  const ci0 = Math.floor(cam.x / (CHUNK * TILE));
  const ci1 = Math.floor((cam.x + viewW) / (CHUNK * TILE));
  for (let i = ci0; i <= ci1; i++) if (i >= 0 && i * CHUNK < w.cols) c.drawImage(chunk(art, w, i), i * CHUNK * TILE, 0, CHUNK * TILE + 2 / art.res, H);
  // hidden baskets (live, they change)
  for (let tx = left; tx < right; tx++)
    for (let ty = 0; ty < ROWS; ty++) {
      const ch = tileAt(w, tx, ty);
      if (ch !== '?' && ch !== 'U') continue;
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === '?') glow(c, x + 16, y + 16, 26, '#FFE07A', 0.25 + Math.sin(t * 4 + tx) * 0.12);
      const g = c.createLinearGradient(0, y, 0, y + TILE);
      g.addColorStop(0, ch === '?' ? '#F2C66D' : '#A08A6A');
      g.addColorStop(1, ch === '?' ? '#B9802E' : '#6E5B44');
      c.fillStyle = g;
      rr(c, x + 1, y + 1, TILE - 2, TILE - 2, 7);
      c.fill();
      c.strokeStyle = OUTLINE;
      c.lineWidth = 2;
      c.stroke();
      c.strokeStyle = 'rgba(90,55,20,0.45)';
      c.lineWidth = 1.2;
      c.beginPath();
      for (let k = 4; k < TILE - 2; k += 6) {
        c.moveTo(x + k, y + 4);
        c.lineTo(x + k + 4, y + TILE - 4);
        c.moveTo(x + k + 4, y + 4);
        c.lineTo(x + k, y + TILE - 4);
      }
      c.stroke();
      if (ch === '?') drawHerb(c, 'kaprao', x + 16, y + 17 + Math.sin(t * 4) * 1.2, 0.55);
    }
  for (const s of w.springs) drawSpringLeaf(c, s.x, s.y, s.squash);
  for (const r of w.rafts) drawRaft(c, r.x, r.y, r.w);
  for (const f of w.checkpoints) drawFlag(c, f.x, f.base, f.on, t);
  drawGoal(c, w.goal.x, w.goal.base, !w.bossDown, t);
  for (const it of w.items) if (!it.taken || it.kind === 'chest') drawItem(c, it, t);
  for (const e of w.enemies) if (e.alive || e.bonkT > 0) if (e.x + e.w > cam.x - 80 && e.x < cam.x + viewW + 80) drawEnemy(c, e, t);
  drawHero(c, w.hero, t, w.herbTotal);
  for (const p of w.particles) {
    const a = Math.max(0, p.life / p.max);
    c.globalAlpha = a;
    if (p.kind === 'text') {
      c.font = `700 ${p.size}px "IBM Plex Sans Thai Looped", "Noto Sans Thai", sans-serif`;
      c.textAlign = 'center';
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(30,20,10,0.8)';
      c.strokeText(p.text!, p.x, p.y);
      c.fillStyle = p.color;
      c.fillText(p.text!, p.x, p.y);
    } else if (p.kind === 'ring') {
      c.strokeStyle = p.color;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(p.x, p.y, p.size * (1 - a) + 6, 0, Math.PI * 2);
      c.stroke();
    } else if (p.kind === 'spark') {
      c.fillStyle = p.color;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.life * 8);
      c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      c.restore();
    } else ellipse(c, p.x, p.y, p.size, p.size * 0.8, p.color);
  }
  c.globalAlpha = 1;
  c.restore();

  if (th.dark) {
    // the cave is lit around ยายพร้อม
    const hx = w.hero.x + w.hero.w / 2 - cam.x;
    const hy = w.hero.y - cam.y;
    const v = c.createRadialGradient(hx, hy, 80, hx, hy, Math.max(viewW, viewH) * 0.75);
    v.addColorStop(0, 'rgba(10,5,25,0)');
    v.addColorStop(1, 'rgba(10,5,25,0.6)');
    c.fillStyle = v;
    c.fillRect(0, 0, viewW, viewH);
  }
}

function drawItem(c: Ctx, it: Item, t: number) {
  const bob = Math.sin(t * 3 + it.id) * 3;
  if (it.kind === 'seed') drawSeed(c, it.x, it.y + bob * 0.6, t + it.id * 0.3);
  else if (it.kind === 'herb') {
    glow(c, it.x, it.y + bob, 22, '#C8FFB0', 0.45);
    drawHerb(c, it.herb!, it.x, it.y + bob, 1);
  } else if (it.kind === 'lotus') drawLotus(c, it.x, it.y + bob, t);
  else if (it.kind === 'chest') drawChest(c, it.x, it.y, it.taken, t);
  else drawPower(c, it.kind as 'speed' | 'kite' | 'hat', it.x, it.y + bob, t);
}

/** a small picture of a level's start for the level select screen */
export function drawPreview(c: Ctx, w: World, art: Art, viewW: number, viewH: number, t = 0) {
  const scale = viewH / H;
  c.save();
  c.scale(scale, scale);
  render(c, w, { x: 0, y: 0 }, viewW / scale, H, art, t);
  c.restore();
}
