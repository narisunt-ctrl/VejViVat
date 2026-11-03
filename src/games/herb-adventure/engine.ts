import { buildLevel, HERB_NAME, ROWS, TILE, type HerbKind, type LevelDef } from './levels';

// The game world and its physics, with no drawing or browser APIs so it can be tested. Positions are in pixels,
// times in seconds; the caller steps it at a fixed rate. Collisions are box-against-tile, one axis at a time.

export const PHYS = {
  gravity: 2200,
  maxFall: 900,
  glideFall: 170,
  accel: 2600,
  airAccel: 1900,
  friction: 2600,
  maxRun: 220,
  fastRun: 320,
  jump: 720,
  highJump: 900,
  /** releasing jump early caps the rise at this speed (variable jump height) */
  jumpCut: 260,
  coyote: 0.1,
  buffer: 0.12,
  stompBounce: 460,
  stompBounceHeld: 680,
  spring: 1150,
};

export interface Input {
  left: boolean;
  right: boolean;
  /** held state; a press is detected inside the world */
  jump: boolean;
}
export const NO_INPUT: Input = { left: false, right: false, jump: false };

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
}
export interface Hero extends Box {
  face: 1 | -1;
  coyote: number;
  buffer: number;
  prevJump: boolean;
  invuln: number;
  hearts: number;
  shield: boolean;
  speedT: number;
  kiteT: number;
  /** distance run, drives the leg cycle */
  stride: number;
  /** landing squash timer */
  land: number;
  raft: Raft | null;
}
export type EnemyKind = 'snail' | 'beetle' | 'hopper' | 'boss';
export interface Enemy extends Box {
  id: number;
  kind: EnemyKind;
  dir: 1 | -1;
  alive: boolean;
  /** after being stomped: floats away until this runs out */
  bonkT: number;
  hp: number;
  hurtT: number;
  hopT: number;
}
export type ItemKind = 'seed' | 'herb' | 'lotus' | 'chest' | 'speed' | 'kite' | 'hat';
export interface Item {
  id: number;
  kind: ItemKind;
  herb?: HerbKind;
  /** centre */
  x: number;
  y: number;
  taken: boolean;
}
export interface Spring {
  x: number;
  y: number;
  squash: number;
}
export interface Raft {
  x: number;
  y: number;
  w: number;
  x0: number;
  x1: number;
  vx: number;
  dx: number;
}
export interface Flag {
  x: number;
  /** ground level under it */
  base: number;
  on: boolean;
}
export interface Particle {
  kind: 'dust' | 'spark' | 'text' | 'ring';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  text?: string;
}
export type GameEventType =
  | 'jump'
  | 'seed'
  | 'herb'
  | 'lotus'
  | 'chest'
  | 'power'
  | 'stomp'
  | 'hurt'
  | 'shield'
  | 'fall'
  | 'spring'
  | 'bump'
  | 'checkpoint'
  | 'bossHit'
  | 'bossDown'
  | 'locked'
  | 'win'
  | 'over';
export interface GameEvent {
  type: GameEventType;
  herb?: HerbKind;
}

export interface World {
  def: LevelDef;
  /** tile rows, mutable (hidden blocks turn used) */
  map: string[][];
  cols: number;
  width: number;
  height: number;
  hero: Hero;
  enemies: Enemy[];
  items: Item[];
  springs: Spring[];
  rafts: Raft[];
  checkpoints: Flag[];
  goal: Flag;
  respawn: { x: number; y: number };
  particles: Particle[];
  score: number;
  seeds: number;
  herbs: Partial<Record<HerbKind, number>>;
  herbTotal: number;
  lotus: number;
  time: number;
  timeBonus: number;
  state: 'play' | 'won' | 'over';
  shake: number;
  bossDown: boolean;
  lockedHintT: number;
  herbTurn: number;
  nextId: number;
}

const HERO_W = 20;
const HERO_H = 28;
const ENEMY_SIZE: Record<EnemyKind, [number, number]> = { snail: [28, 20], beetle: [28, 22], hopper: [24, 22], boss: [72, 56] };
const ENEMY_SPEED: Record<EnemyKind, number> = { snail: 35, beetle: 75, hopper: 0, boss: 80 };

export const isSolid = (c: string) => c === '#' || c === 'B' || c === '?' || c === 'U';

export function createWorld(def: LevelDef, rows: string[] = buildLevel(def)): World {
  const cols = rows[0].length;
  const map = rows.map((r) => r.split(''));
  const w: World = {
    def,
    map,
    cols,
    width: cols * TILE,
    height: ROWS * TILE,
    hero: null as unknown as Hero,
    enemies: [],
    items: [],
    springs: [],
    rafts: [],
    checkpoints: [],
    goal: { x: (cols + 50) * TILE, base: 12 * TILE, on: false }, // replaced by the G tile; off the map if there is none
    respawn: { x: 64, y: 0 },
    particles: [],
    score: 0,
    seeds: 0,
    herbs: {},
    herbTotal: 0,
    lotus: 0,
    time: 0,
    timeBonus: 0,
    state: 'play',
    shake: 0,
    bossDown: !def.boss,
    lockedHintT: 0,
    herbTurn: 0,
    nextId: 1,
  };
  const item = (kind: ItemKind, cx: number, cy: number, herb?: HerbKind) => w.items.push({ id: w.nextId++, kind, herb, x: cx * TILE + 16, y: cy * TILE + 16, taken: false });
  const enemy = (kind: EnemyKind, cx: number, bottom: number) => {
    const [ew, eh] = ENEMY_SIZE[kind];
    w.enemies.push({ id: w.nextId++, kind, x: cx * TILE + 16 - ew / 2, y: bottom - eh, w: ew, h: eh, vx: 0, vy: 0, onGround: false, dir: -1, alive: true, bonkT: 0, hp: kind === 'boss' ? 3 : 1, hurtT: 0, hopT: 1 });
  };
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < cols; x++) {
      const c = map[y][x];
      const base = (y + 1) * TILE;
      let keep = false;
      switch (c) {
        case '@':
          w.hero = newHero(x * TILE + 6, base - HERO_H);
          w.respawn = { x: x * TILE + 6, y: base - HERO_H };
          break;
        case 'K':
          w.checkpoints.push({ x: x * TILE, base, on: false });
          break;
        case 'G':
          w.goal = { x: x * TILE, base, on: false };
          break;
        case 'o':
          item('seed', x, y);
          break;
        case 'h':
          item('herb', x, y, def.herbs[w.herbTurn++ % def.herbs.length]);
          break;
        case '*':
          item('lotus', x, y);
          break;
        case 'C':
          item('chest', x, y);
          break;
        case 'z':
          item('speed', x, y);
          break;
        case 'k':
          item('kite', x, y);
          break;
        case 'g':
          item('hat', x, y);
          break;
        case 'S':
          w.springs.push({ x: x * TILE, y: base - 14, squash: 0 });
          break;
        case 'M':
          w.rafts.push({ x: x * TILE, y: y * TILE, w: 96, x0: x * TILE, x1: (x + 8) * TILE, vx: 70, dx: 0 });
          break;
        case 'e':
          enemy('snail', x, base);
          break;
        case 'b':
          enemy('beetle', x, base);
          break;
        case 'f':
          enemy('hopper', x, base);
          break;
        case 'X':
          enemy('boss', x, base + TILE);
          break;
        default:
          keep = true;
      }
      if (!keep) map[y][x] = '.';
    }
  if (!w.hero) w.hero = newHero(64, 11 * TILE - HERO_H);
  return w;
}

function newHero(x: number, y: number): Hero {
  return { x, y, w: HERO_W, h: HERO_H, vx: 0, vy: 0, onGround: false, face: 1, coyote: 0, buffer: 0, prevJump: false, invuln: 0, hearts: 3, shield: false, speedT: 0, kiteT: 0, stride: 0, land: 0, raft: null };
}

export function tileAt(w: World, tx: number, ty: number): string {
  if (tx < 0 || tx >= w.cols) return '#'; // the level edges are walls
  if (ty < 0 || ty >= ROWS) return '.';
  return w.map[ty][tx];
}

const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** move along x and stop at solid tiles; returns true when a wall was hit */
function moveX(w: World, b: Box, dx: number): boolean {
  b.x += dx;
  const y0 = Math.floor(b.y / TILE);
  const y1 = Math.floor((b.y + b.h - 0.01) / TILE);
  if (dx > 0) {
    const tx = Math.floor((b.x + b.w) / TILE);
    for (let ty = y0; ty <= y1; ty++)
      if (isSolid(tileAt(w, tx, ty))) {
        b.x = tx * TILE - b.w;
        b.vx = 0;
        return true;
      }
  } else if (dx < 0) {
    const tx = Math.floor(b.x / TILE);
    for (let ty = y0; ty <= y1; ty++)
      if (isSolid(tileAt(w, tx, ty))) {
        b.x = (tx + 1) * TILE;
        b.vx = 0;
        return true;
      }
  }
  return false;
}

/** move along y; lands on solid tiles and on one-way planks from above; returns the tile hit by the head */
function moveY(w: World, b: Box, dy: number): { tx: number; ty: number } | null {
  const prevBottom = b.y + b.h;
  b.y += dy;
  b.onGround = false;
  const x0 = Math.floor(b.x / TILE);
  const x1 = Math.floor((b.x + b.w - 0.01) / TILE);
  if (dy > 0) {
    const ty = Math.floor((b.y + b.h) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      const c = tileAt(w, tx, ty);
      if (isSolid(c) || (c === '=' && prevBottom <= ty * TILE + 0.5)) {
        b.y = ty * TILE - b.h;
        b.vy = 0;
        b.onGround = true;
        return null;
      }
    }
  } else if (dy < 0) {
    const ty = Math.floor(b.y / TILE);
    let hit: { tx: number; ty: number } | null = null;
    const centre = b.x + b.w / 2;
    for (let tx = x0; tx <= x1; tx++)
      if (isSolid(tileAt(w, tx, ty)) && (!hit || Math.abs(tx * TILE + 16 - centre) < Math.abs(hit.tx * TILE + 16 - centre))) hit = { tx, ty };
    if (hit) {
      b.y = (ty + 1) * TILE;
      b.vy = 0;
      return hit;
    }
  }
  return null;
}

function burst(w: World, x: number, y: number, color: string, n: number, kind: Particle['kind'] = 'spark') {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const s = 80 + Math.random() * 140;
    w.particles.push({ kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.6, max: 0.6, color, size: 2 + Math.random() * 2.5 });
  }
}
function floatText(w: World, x: number, y: number, text: string, color = '#FFF6C9') {
  w.particles.push({ kind: 'text', x, y, vx: 0, vy: -55, life: 1.1, max: 1.1, color, size: 18, text });
}
function dust(w: World, x: number, y: number, n = 4) {
  for (let i = 0; i < n; i++) w.particles.push({ kind: 'dust', x: x + (Math.random() - 0.5) * 14, y, vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 30, life: 0.45, max: 0.45, color: 'rgba(235,225,200,0.75)', size: 3 + Math.random() * 3 });
}

function collectHerb(w: World, kind: HerbKind, x: number, y: number, ev: GameEvent[]) {
  w.herbs[kind] = (w.herbs[kind] ?? 0) + 1;
  w.herbTotal++;
  w.score += 100;
  floatText(w, x, y - 10, HERB_NAME[kind]);
  burst(w, x, y, '#B8F27C', 10);
  ev.push({ type: 'herb', herb: kind });
}

function hurt(w: World, ev: GameEvent[]) {
  const h = w.hero;
  if (h.invuln > 0 || w.state !== 'play') return;
  if (h.shield) {
    h.shield = false;
    h.invuln = 1.2;
    h.vy = -380;
    burst(w, h.x + h.w / 2, h.y, '#F4D27A', 12);
    ev.push({ type: 'shield' });
    return;
  }
  h.hearts--;
  h.invuln = 1.6;
  h.vy = -380;
  h.vx = -h.face * 170;
  w.shake = Math.max(w.shake, 0.25);
  ev.push({ type: 'hurt' });
  if (h.hearts <= 0) {
    w.state = 'over';
    ev.push({ type: 'over' });
  }
}

function fall(w: World, ev: GameEvent[]) {
  const h = w.hero;
  h.hearts--;
  ev.push({ type: 'fall' });
  if (h.hearts <= 0) {
    w.state = 'over';
    ev.push({ type: 'over' });
    return;
  }
  Object.assign(h, { x: w.respawn.x, y: w.respawn.y, vx: 0, vy: 0, invuln: 1.6, raft: null, onGround: false });
}

export function starsOf(lotus: number): 1 | 2 | 3 {
  return lotus >= 3 ? 3 : lotus >= 2 ? 2 : 1;
}

/** advance the world by dt seconds (call with a fixed small step, e.g. 1/120) */
export function step(w: World, input: Input, dt: number): GameEvent[] {
  const ev: GameEvent[] = [];
  updateParticles(w, dt);
  w.shake = Math.max(0, w.shake - dt);
  w.lockedHintT = Math.max(0, w.lockedHintT - dt);
  for (const s of w.springs) s.squash = Math.max(0, s.squash - dt);
  if (w.state !== 'play') {
    updateEnemies(w, dt, ev); // let stomped enemies float away
    return ev;
  }
  w.time += dt;
  const h = w.hero;

  // rafts move first and carry whoever stands on them
  for (const r of w.rafts) {
    const nx = r.x + r.vx * dt;
    if (nx < r.x0 || nx > r.x1) r.vx = -r.vx;
    r.dx = Math.max(r.x0, Math.min(r.x1, nx)) - r.x;
    r.x += r.dx;
  }
  if (h.raft) moveX(w, h, h.raft.dx);

  // run
  const top = h.speedT > 0 ? PHYS.fastRun : PHYS.maxRun;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir) {
    h.vx += dir * (h.onGround ? PHYS.accel : PHYS.airAccel) * dt;
    h.vx = Math.max(-top, Math.min(top, h.vx));
    h.face = dir as 1 | -1;
  } else if (h.onGround) {
    const f = PHYS.friction * dt;
    h.vx = Math.abs(h.vx) <= f ? 0 : h.vx - Math.sign(h.vx) * f;
  }

  // jump: buffered press, coyote time, variable height
  const pressed = input.jump && !h.prevJump;
  h.prevJump = input.jump;
  if (pressed) h.buffer = PHYS.buffer;
  else h.buffer = Math.max(0, h.buffer - dt);
  h.coyote = h.onGround ? PHYS.coyote : Math.max(0, h.coyote - dt);
  if (h.buffer > 0 && h.coyote > 0) {
    h.vy = -(h.kiteT > 0 ? PHYS.highJump : PHYS.jump);
    h.buffer = 0;
    h.coyote = 0;
    h.onGround = false;
    h.raft = null;
    dust(w, h.x + h.w / 2, h.y + h.h, 5);
    ev.push({ type: 'jump' });
  }
  if (!input.jump && h.vy < -PHYS.jumpCut) h.vy = -PHYS.jumpCut;
  h.vy += PHYS.gravity * dt;
  const maxFall = h.kiteT > 0 && input.jump && h.vy > 0 ? PHYS.glideFall : PHYS.maxFall;
  h.vy = Math.min(h.vy, maxFall);

  const wasGround = h.onGround;
  const fallSpeed = h.vy;
  const prevBottom = h.y + h.h;
  moveX(w, h, h.vx * dt);
  const head = moveY(w, h, h.vy * dt);
  if (head) {
    const c = tileAt(w, head.tx, head.ty);
    if (c === '?') {
      w.map[head.ty][head.tx] = 'U';
      collectHerb(w, w.def.herbs[w.herbTurn++ % w.def.herbs.length], head.tx * TILE + 16, head.ty * TILE - 8, ev);
      ev.push({ type: 'bump' });
    }
  }
  // rafts as platforms
  h.raft = null;
  if (h.vy >= 0)
    for (const r of w.rafts)
      if (prevBottom <= r.y + 1 && h.y + h.h >= r.y && h.x + h.w > r.x && h.x < r.x + r.w) {
        h.y = r.y - h.h;
        h.vy = 0;
        h.onGround = true;
        h.raft = r;
      }
  if (h.onGround && !wasGround && fallSpeed > 320) {
    h.land = 0.16;
    dust(w, h.x + h.w / 2, h.y + h.h, 6);
  }
  h.land = Math.max(0, h.land - dt);
  if (h.onGround) h.stride += Math.abs(h.vx) * dt;
  if (h.onGround && Math.abs(h.vx) > 150 && Math.random() < dt * 9) dust(w, h.x + h.w / 2 - h.face * 8, h.y + h.h, 1);
  h.invuln = Math.max(0, h.invuln - dt);
  h.speedT = Math.max(0, h.speedT - dt);
  h.kiteT = Math.max(0, h.kiteT - dt);

  // springs
  for (const s of w.springs)
    if (h.vy >= 0 && prevBottom <= s.y + 6 && h.y + h.h >= s.y && h.x + h.w > s.x + 2 && h.x < s.x + 30) {
      h.y = s.y - h.h;
      h.vy = -PHYS.spring;
      h.onGround = false;
      s.squash = 0.25;
      burst(w, s.x + 16, s.y, '#9BE37A', 8);
      ev.push({ type: 'spring' });
    }

  // thorns and water
  const x0 = Math.floor(h.x / TILE);
  const x1 = Math.floor((h.x + h.w - 0.01) / TILE);
  const y0 = Math.floor(h.y / TILE);
  const y1 = Math.floor((h.y + h.h - 0.01) / TILE);
  let thorn = false;
  let water = false;
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      const c = tileAt(w, tx, ty);
      if (c === '^' && h.y + h.h > ty * TILE + 14) thorn = true;
      if (c === '~') water = true;
    }
  if (water || h.y > w.height + 40) {
    fall(w, ev);
    if (w.state !== 'play') return ev;
  } else if (thorn) hurt(w, ev);

  updateEnemies(w, dt, ev, prevBottom, input.jump);
  if (w.state !== 'play') return ev;

  // items
  const hb = { x: h.x, y: h.y, w: h.w, h: h.h };
  for (const it of w.items) {
    if (it.taken) continue;
    if (!overlap(hb, { x: it.x - 12, y: it.y - 12, w: 24, h: 24 })) continue;
    if (it.kind === 'chest') {
      it.taken = true;
      w.score += 500;
      w.seeds += 5;
      collectHerb(w, w.def.herbs[w.herbTurn++ % w.def.herbs.length], it.x, it.y - 12, ev);
      burst(w, it.x, it.y, '#FFD66B', 18);
      w.particles.push({ kind: 'ring', x: it.x, y: it.y, vx: 0, vy: 0, life: 0.5, max: 0.5, color: '#FFE9A8', size: 40 });
      ev.push({ type: 'chest' });
      continue;
    }
    it.taken = true;
    if (it.kind === 'seed') {
      w.seeds++;
      w.score += 10;
      burst(w, it.x, it.y, '#FFE07A', 6);
      ev.push({ type: 'seed' });
    } else if (it.kind === 'herb') collectHerb(w, it.herb!, it.x, it.y, ev);
    else if (it.kind === 'lotus') {
      w.lotus++;
      w.score += 1000;
      floatText(w, it.x, it.y - 12, `ดอกบัวทอง ${w.lotus}/3`, '#FFE9A8');
      burst(w, it.x, it.y, '#FFD1E8', 16);
      w.particles.push({ kind: 'ring', x: it.x, y: it.y, vx: 0, vy: 0, life: 0.55, max: 0.55, color: '#FFE9A8', size: 46 });
      ev.push({ type: 'lotus' });
    } else {
      if (it.kind === 'speed') h.speedT = 10;
      if (it.kind === 'kite') h.kiteT = 12;
      if (it.kind === 'hat') h.shield = true;
      floatText(w, it.x, it.y - 12, it.kind === 'speed' ? 'รองเท้าวิ่งไว' : it.kind === 'kite' ? 'ว่าวกระโดดสูง' : 'งอบกันภัย', '#BFF0FF');
      burst(w, it.x, it.y, '#BFF0FF', 14);
      ev.push({ type: 'power' });
    }
  }

  // checkpoints and goal
  for (const c of w.checkpoints)
    if (!c.on && overlap(hb, { x: c.x, y: c.base - 64, w: 32, h: 64 })) {
      c.on = true;
      w.respawn = { x: c.x + 6, y: c.base - h.h };
      floatText(w, c.x + 16, c.base - 70, 'จุดพักแล้ว', '#C8F7DC');
      ev.push({ type: 'checkpoint' });
    }
  if (overlap(hb, { x: w.goal.x, y: w.goal.base - 96, w: 40, h: 96 })) {
    if (!w.bossDown) {
      if (w.lockedHintT === 0) ev.push({ type: 'locked' });
      w.lockedHintT = 2;
    } else {
      w.state = 'won';
      w.goal.on = true;
      w.timeBonus = Math.max(0, Math.round(w.def.par - w.time)) * 10;
      w.score += w.timeBonus;
      ev.push({ type: 'win' });
    }
  }
  return ev;
}

function updateEnemies(w: World, dt: number, ev: GameEvent[], heroPrevBottom = Infinity, jumpHeld = false) {
  const h = w.hero;
  for (const e of w.enemies) {
    if (!e.alive) {
      if (e.bonkT > 0) {
        e.bonkT -= dt;
        e.vy += PHYS.gravity * 0.5 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
      continue;
    }
    if (Math.abs(e.x - h.x) > 900 || w.state !== 'play') continue; // parked until the hero is near
    e.hurtT = Math.max(0, e.hurtT - dt);
    if (e.kind === 'hopper' || e.kind === 'boss') {
      e.hopT -= dt;
      if (e.onGround) {
        if (e.kind === 'hopper') e.vx = 0;
        if (e.hopT <= 0 && Math.abs(e.x - h.x) < 340) {
          e.dir = h.x < e.x ? -1 : 1;
          e.vy = e.kind === 'boss' ? -620 : -520;
          e.vx = e.dir * (e.kind === 'boss' ? 150 : 110);
          e.hopT = e.kind === 'boss' ? 2.4 - (3 - e.hp) * 0.4 : 1.4;
        }
      }
    }
    if (e.kind === 'snail' || e.kind === 'beetle' || (e.kind === 'boss' && e.onGround && e.hopT > 0.3)) e.vx = e.dir * (ENEMY_SPEED[e.kind] + (e.kind === 'boss' ? (3 - e.hp) * 35 : 0));
    e.vy = Math.min(PHYS.maxFall, e.vy + PHYS.gravity * dt);
    if (moveX(w, e, e.vx * dt)) e.dir = -e.dir as 1 | -1;
    moveY(w, e, e.vy * dt);
    if (e.onGround && e.kind !== 'hopper') {
      // turn at ledges so walkers stay on their ground
      const ahead = e.dir > 0 ? Math.floor((e.x + e.w + 2) / TILE) : Math.floor((e.x - 2) / TILE);
      const below = tileAt(w, ahead, Math.floor((e.y + e.h + 2) / TILE));
      if (!isSolid(below) && below !== '=') e.dir = -e.dir as 1 | -1;
    }
    if (e.y > w.height + 60) e.alive = false;

    if (w.state !== 'play' || !overlap(h, e)) continue;
    const stomp = h.vy > 0 && heroPrevBottom <= e.y + 12;
    if (stomp) {
      h.vy = -(jumpHeld ? PHYS.stompBounceHeld : PHYS.stompBounce);
      h.y = e.y - h.h;
      if (e.kind === 'boss') {
        if (e.hurtT > 0) continue;
        e.hp--;
        e.hurtT = 1;
        w.shake = 0.45;
        burst(w, e.x + e.w / 2, e.y, '#FFE07A', 16);
        ev.push({ type: 'bossHit' });
        if (e.hp > 0) continue;
        w.bossDown = true;
        w.score += 5000;
        floatText(w, e.x + e.w / 2, e.y - 20, 'ปราบด้วงยักษ์แล้ว!', '#FFE9A8');
        ev.push({ type: 'bossDown' });
      } else {
        w.score += 200;
        w.shake = Math.max(w.shake, 0.12);
        ev.push({ type: 'stomp' });
      }
      e.alive = false;
      e.bonkT = 1.2;
      e.vy = -300;
      e.vx = h.face * 60;
      burst(w, e.x + e.w / 2, e.y, '#FFF2B0', 8);
    } else if (!(e.kind === 'boss' && e.hurtT > 0.6)) hurt(w, ev);
  }
}

function updateParticles(w: World, dt: number) {
  for (const p of w.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'spark') p.vy += 420 * dt;
    if (p.kind === 'dust') {
      p.vx *= 1 - 3 * dt;
      p.size += 6 * dt;
    }
  }
  if (w.particles.length > 260) w.particles.splice(0, w.particles.length - 260);
  w.particles = w.particles.filter((p) => p.life > 0);
}

/** total things to find in a level, for the summary */
export function levelCounts(w: World) {
  return {
    herbs: w.items.filter((i) => i.kind === 'herb').length + w.items.filter((i) => i.kind === 'chest').length + w.map.flat().filter((c) => c === '?' || c === 'U').length,
    lotus: w.items.filter((i) => i.kind === 'lotus').length,
  };
}
