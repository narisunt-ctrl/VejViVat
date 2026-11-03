// Levels for "ยายพร้อม ตะลุยเก็บสมุนไพร". Each level is built from small pieces (flat run, gap, steps, floating
// planks, hidden baskets, spring, bridge, raft, checkpoint, boss arena) so every jump is reachable by construction:
// gaps are at most 3 tiles and rises at most 2 tiles (a normal jump clears about 4.5 tiles across and 3.5 up).
//
// Tile characters
//   .  empty            #  ground          B  wooden block      ?  hidden basket block (bump from below)
//   =  one-way plank    ^  thorns          ~  water (pit)
// Spawns (turned into entities by the engine)
//   @  start   K  checkpoint   G  goal   o  golden seed   h  herb   *  golden lotus   C  herb basket (chest)
//   z  speed sandals   k  kite (high jump)   g  งอบ hat (shield)   S  spring leaf   M  moving raft
//   e  snail   b  beetle   f  grasshopper   X  boss

export const ROWS = 15;
export const TILE = 32;

export type ThemeId = 'garden' | 'ricefield' | 'waterfall' | 'cave' | 'summit';
export type HerbKind = 'kaprao' | 'takrai' | 'khing' | 'khamin' | 'makrut' | 'anchan' | 'toei' | 'manao';

export const HERB_NAME: Record<HerbKind, string> = {
  kaprao: 'กะเพรา',
  takrai: 'ตะไคร้',
  khing: 'ขิง',
  khamin: 'ขมิ้น',
  makrut: 'มะกรูด',
  anchan: 'อัญชัน',
  toei: 'ใบเตย',
  manao: 'มะนาว',
};

export interface LevelDef {
  id: string;
  name: string;
  sub: string;
  theme: ThemeId;
  /** herbs that grow in this level, handed out in turn to each 'h' */
  herbs: HerbKind[];
  /** seconds for the full time bonus */
  par: number;
  boss?: boolean;
  build: (b: Builder) => void;
}

/** A 15-row grid filled left to right by pieces; `top` is the row of the ground surface under the next piece */
export class Builder {
  cols: string[][] = [];
  top = 12;
  private lotus = 0;
  get x() {
    return this.cols.length;
  }
  private col() {
    const c = Array<string>(ROWS).fill('.');
    this.cols.push(c);
    return c;
  }
  set(x: number, y: number, ch: string) {
    if (x >= 0 && x < this.cols.length && y >= 0 && y < ROWS) this.cols[x][y] = ch;
  }
  get(x: number, y: number) {
    return this.cols[x]?.[y] ?? '.';
  }
  /** ground columns at the current height */
  ground(w: number) {
    for (let i = 0; i < w; i++) {
      const c = this.col();
      for (let y = this.top; y < ROWS; y++) c[y] = '#';
    }
    return this;
  }
  /** a lotus; each level must place exactly three */
  lotusAt(x: number, y: number) {
    this.set(x, y, '*');
    this.lotus++;
  }
  get lotusCount() {
    return this.lotus;
  }
  rows(): string[] {
    return Array.from({ length: ROWS }, (_, y) => this.cols.map((c) => c[y]).join(''));
  }

  // ---------- pieces ----------
  start() {
    this.ground(8);
    this.set(this.x - 6, this.top - 1, '@');
    return this;
  }
  /** flat run with an arc of seeds and optional things on the ground */
  flat(w: number, opts: { seeds?: boolean; herb?: boolean; enemy?: 'e' | 'b' | 'f'; power?: 'z' | 'k' | 'g' } = {}) {
    const x0 = this.x;
    this.ground(w);
    if (opts.seeds !== false) for (let i = 2; i < w - 2; i += 1) this.set(x0 + i, this.top - (i % 3 === 0 ? 3 : 2), 'o');
    if (opts.herb) this.set(x0 + Math.floor(w / 2), this.top - 1, 'h');
    if (opts.enemy) this.set(x0 + w - 3, this.top - 1, opts.enemy);
    if (opts.power) this.set(x0 + 2, this.top - 1, opts.power);
    return this;
  }
  /** a pit of water `n` (1–3) tiles wide with seeds over it */
  gap(n: 1 | 2 | 3) {
    const x0 = this.x;
    for (let i = 0; i < n; i++) {
      const c = this.col();
      c[ROWS - 1] = '~';
    }
    for (let i = 0; i < n; i++) this.set(x0 + i, this.top - 4, 'o');
    return this;
  }
  /** raise (positive) or lower the ground; rises are at most 2 per step */
  step(dy: -3 | -2 | -1 | 1 | 2, w = 5, herb = false) {
    this.top = Math.max(7, Math.min(12, this.top - dy));
    const x0 = this.x;
    this.ground(w);
    if (herb) this.set(x0 + 2, this.top - 1, 'h');
    return this;
  }
  /** floating planks over a wide pit; the middle plank carries a herb */
  planks(lotus = false) {
    const y = this.top - 3;
    const x0 = this.x;
    for (let i = 0; i < 11; i++) {
      const c = this.col();
      c[ROWS - 1] = '~';
    }
    for (const [dx, len] of [
      [1, 3],
      [5, 3],
      [9, 2],
    ] as const)
      for (let i = 0; i < len; i++) this.set(x0 + dx + i, y - (dx === 5 ? 1 : 0), '=');
    this.set(x0 + 6, y - 2, 'h');
    if (lotus) this.lotusAt(x0 + 6, y - 5);
    else this.set(x0 + 6, y - 5, 'o');
    return this;
  }
  /** hidden basket blocks in a row; a lotus waits on top for a careful climber */
  hidden(lotus = false) {
    const x0 = this.x;
    this.ground(9);
    const y = this.top - 3;
    this.set(x0 + 2, y, 'B');
    this.set(x0 + 3, y, '?');
    this.set(x0 + 4, y, 'B');
    this.set(x0 + 5, y, '?');
    this.set(x0 + 6, y, 'B');
    if (lotus) this.lotusAt(x0 + 4, y - 2);
    else this.set(x0 + 4, y - 1, 'h');
    return this;
  }
  /** a spring leaf that throws you up to a high ledge with a herb basket */
  spring(lotus = false) {
    const x0 = this.x;
    this.ground(12);
    this.set(x0 + 2, this.top - 1, 'S');
    const ly = Math.max(2, this.top - 8);
    for (let i = 4; i < 10; i++) this.set(x0 + i, ly, '=');
    this.set(x0 + 6, ly - 1, 'C');
    this.set(x0 + 8, ly - 1, 'h');
    if (lotus) this.lotusAt(x0 + 5, ly - 1);
    return this;
  }
  /** a bamboo bridge over water; enemies may walk it */
  bridge(enemy?: 'e' | 'b') {
    const x0 = this.x;
    const y = this.top;
    for (let i = 0; i < 9; i++) {
      const c = this.col();
      c[ROWS - 1] = '~';
      c[y] = '=';
    }
    for (let i = 1; i < 8; i += 2) this.set(x0 + i, y - 2, 'o');
    if (enemy) this.set(x0 + 5, y - 1, enemy);
    return this;
  }
  /** wide water crossed on a moving raft */
  raft() {
    const x0 = this.x;
    for (let i = 0; i < 12; i++) {
      const c = this.col();
      c[ROWS - 1] = '~';
    }
    this.set(x0 + 1, this.top, 'M');
    this.set(x0 + 6, this.top - 3, 'h');
    return this;
  }
  /** thorns on the ground with planks above them */
  thorns() {
    const x0 = this.x;
    this.ground(10);
    for (let i = 2; i < 8; i++) this.set(x0 + i, this.top - 1, '^');
    for (let i = 3; i < 7; i++) this.set(x0 + i, this.top - 3, '=');
    this.set(x0 + 5, this.top - 4, 'h');
    return this;
  }
  /** a hidden stair of blocks up to a secret ledge with a basket and a lotus */
  secret(lotus = true) {
    const x0 = this.x;
    this.ground(14);
    const t = this.top;
    for (let i = 0; i < 3; i++) for (let h = 0; h <= i; h++) this.set(x0 + 2 + i, t - 1 - h, 'B');
    for (let i = 6; i < 12; i++) this.set(x0 + i, t - 6, '=');
    this.set(x0 + 7, t - 7, 'C');
    if (lotus) this.lotusAt(x0 + 10, t - 7);
    else this.set(x0 + 10, t - 7, 'h');
    this.set(x0 + 9, t - 1, 'b');
    return this;
  }
  checkpoint() {
    const x0 = this.x;
    this.ground(5);
    this.set(x0 + 2, this.top - 1, 'K');
    return this;
  }
  /** boss arena: a flat floor walled at the far end, the boss in the middle */
  arena() {
    const x0 = this.x;
    this.top = 12;
    this.ground(26);
    this.set(x0 + 16, this.top - 2, 'X');
    for (const dx of [5, 20]) for (let i = 0; i < 3; i++) this.set(x0 + dx + i, this.top - 3, '=');
    return this;
  }
  goal() {
    const x0 = this.x;
    this.ground(10);
    this.set(x0 + 5, this.top - 1, 'G');
    return this;
  }
}

export const LEVELS: LevelDef[] = [
  {
    id: 'garden',
    name: 'สวนสมุนไพรหลังบ้าน',
    sub: 'ด่าน 1 · เริ่มต้นสบาย ๆ',
    theme: 'garden',
    herbs: ['kaprao', 'takrai', 'manao', 'toei'],
    par: 90,
    build: (b) =>
      b
        .start()
        .flat(12, { herb: true })
        .gap(2)
        .flat(10, { enemy: 'e' })
        .hidden(true)
        .flat(6, { power: 'z' })
        .step(1, 6, true)
        .gap(2)
        .step(-1, 8)
        .checkpoint()
        .planks(true)
        .flat(10, { enemy: 'e', herb: true })
        .spring(true)
        .flat(8, { enemy: 'b' })
        .gap(1)
        .goal(),
  },
  {
    id: 'ricefield',
    name: 'ทุ่งนาริมคลอง',
    sub: 'ด่าน 2 · สะพานไม้ไผ่และแพลอยน้ำ',
    theme: 'ricefield',
    herbs: ['takrai', 'khamin', 'anchan', 'manao'],
    par: 110,
    build: (b) =>
      b
        .start()
        .flat(10, { enemy: 'e' })
        .bridge('e')
        .flat(8, { herb: true, power: 'k' })
        .hidden(true)
        .gap(3)
        .flat(8, { enemy: 'f' })
        .checkpoint()
        .raft()
        .flat(10, { enemy: 'b', herb: true })
        .step(2, 6, true)
        .gap(2)
        .step(-2, 6)
        .spring(true)
        .bridge('b')
        .secret(true)
        .flat(6, { enemy: 'f' })
        .goal(),
  },
  {
    id: 'waterfall',
    name: 'ป่าน้ำตกบนดอย',
    sub: 'ด่าน 3 · หินลื่น หนามแหลม',
    theme: 'waterfall',
    herbs: ['khing', 'toei', 'kaprao', 'anchan'],
    par: 130,
    build: (b) =>
      b
        .start()
        .flat(8, { power: 'g' })
        .step(1, 5, true)
        .step(2, 5)
        .gap(2)
        .step(-1, 6, true)
        .thorns()
        .flat(8, { enemy: 'b' })
        .planks(true)
        .checkpoint()
        .raft()
        .flat(8, { enemy: 'f', herb: true })
        .hidden(true)
        .gap(3)
        .flat(6, { enemy: 'e' })
        .spring(true)
        .step(-2, 6)
        .bridge('b')
        .goal(),
  },
  {
    id: 'cave',
    name: 'ถ้ำหินงอกคริสตัล',
    sub: 'ด่าน 4 · มืด ลึก และระยิบระยับ',
    theme: 'cave',
    herbs: ['khamin', 'khing', 'makrut', 'toei'],
    par: 150,
    build: (b) =>
      b
        .start()
        .flat(8, { enemy: 'b' })
        .thorns()
        .gap(2)
        .flat(8, { enemy: 'f', power: 'k' })
        .secret(true)
        .planks()
        .checkpoint()
        .step(2, 5, true)
        .gap(3)
        .flat(8, { enemy: 'b' })
        .step(-2, 5)
        .hidden(true)
        .thorns()
        .raft()
        .flat(8, { enemy: 'f', herb: true })
        .spring(true)
        .gap(2)
        .goal(),
  },
  {
    id: 'summit',
    name: 'ยอดดอยหมอก',
    sub: 'ด่าน 5 · ด้วงยักษ์เฝ้าสวน',
    theme: 'summit',
    herbs: ['makrut', 'anchan', 'khing', 'kaprao'],
    par: 170,
    boss: true,
    build: (b) =>
      b
        .start()
        .flat(8, { power: 'g' })
        .step(1, 5, true)
        .gap(3)
        .flat(8, { enemy: 'b' })
        .thorns()
        .hidden(true)
        .planks(true)
        .checkpoint()
        .raft()
        .flat(8, { enemy: 'f', herb: true })
        .secret(true)
        .bridge('b')
        .checkpoint()
        .arena()
        .goal(),
  },
];

/** the finished map rows for a level */
export function buildLevel(def: LevelDef): string[] {
  const b = new Builder();
  def.build(b);
  return b.rows();
}
