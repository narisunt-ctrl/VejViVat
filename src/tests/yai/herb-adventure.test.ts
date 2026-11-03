import { describe, it, expect } from 'vitest';
import { buildLevel, LEVELS, ROWS, TILE, type LevelDef } from '../../games/herb-adventure/levels';
import { createWorld, NO_INPUT, PHYS, starsOf, step, type Input, type World } from '../../games/herb-adventure/engine';

const DT = 1 / 120;
const run = (w: World, input: Input, seconds: number) => {
  const events: string[] = [];
  for (let i = 0; i < seconds / DT; i++) events.push(...step(w, input, DT).map((e) => e.type));
  return events;
};
/** a tiny test level from rows (15 rows; the rest filled with ground) */
const testDef: LevelDef = { id: 't', name: 't', sub: '', theme: 'garden', herbs: ['kaprao', 'khing'], par: 60, build: () => undefined };
const rowsOf = (top: string[]) => {
  const width = top[0].length;
  const pad = Array.from({ length: ROWS - top.length - 3 }, () => '.'.repeat(width));
  return [...pad, ...top, '#'.repeat(width), '#'.repeat(width), '#'.repeat(width)];
};

describe('levels', () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))('%s is well formed', (_, def) => {
    const rows = buildLevel(def);
    expect(rows).toHaveLength(ROWS);
    expect(new Set(rows.map((r) => r.length)).size).toBe(1);
    const all = rows.join('');
    expect(all.split('@').length - 1).toBe(1);
    expect(all.split('G').length - 1).toBe(1);
    expect(all.split('*').length - 1).toBe(3);
    expect(all.split('K').length - 1).toBeGreaterThanOrEqual(1);
    expect(all.includes('X')).toBe(!!def.boss);
    // the start and the goal stand on ground
    for (const ch of ['@', 'G']) {
      const y = rows.findIndex((r) => r.includes(ch));
      const x = rows[y].indexOf(ch);
      expect(rows[y + 1][x], `${def.id} ${ch}`).toBe('#');
    }
  });

  it('never leaves a pit wider than 3 tiles without a plank, bridge or raft over it', () => {
    for (const def of LEVELS) {
      const rows = buildLevel(def);
      let open = 0;
      for (let x = 0; x < rows[0].length; x++) {
        const column = rows.map((r) => r[x]);
        const floor = column.some((c) => c === '#' || c === '=' || c === 'M' || c === 'B');
        open = floor ? 0 : open + 1;
        // raft crossings are bridged by the raft itself, which sits in the column where it starts
        const raftNear = rows.some((r) => r.slice(Math.max(0, x - 11), x + 1).includes('M'));
        if (!raftNear) expect(open, `${def.id} column ${x}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('gets harder: later levels are longer and have more enemies', () => {
    const size = LEVELS.map((d) => {
      const r = buildLevel(d).join('');
      return { len: buildLevel(d)[0].length, enemies: (r.match(/[ebfX]/g) ?? []).length };
    });
    expect(size[4].len).toBeGreaterThan(size[0].len);
    expect(size[4].enemies).toBeGreaterThan(size[0].enemies);
  });
});

describe('physics', () => {
  it('falls onto the ground and stays there', () => {
    const w = createWorld(testDef, rowsOf(['.@..........']));
    run(w, NO_INPUT, 1);
    expect(w.hero.onGround).toBe(true);
    expect(w.hero.y + w.hero.h).toBe(12 * TILE);
  });

  it('a held jump rises about 3.6 tiles; a tapped jump rises less', () => {
    const peak = (hold: number) => {
      const w = createWorld(testDef, rowsOf(['.@..........']));
      run(w, NO_INPUT, 0.5);
      const ground = w.hero.y;
      let top = ground;
      for (let i = 0; i < 120; i++) {
        step(w, { ...NO_INPUT, jump: i * DT < hold }, DT);
        top = Math.min(top, w.hero.y);
      }
      return ground - top;
    };
    const full = peak(1);
    expect(full).toBeGreaterThan(3.4 * TILE);
    expect(full).toBeLessThan(3.8 * TILE);
    expect(peak(0.05)).toBeLessThan(full * 0.6);
  });

  it('runs right and stops at a wall', () => {
    const w = createWorld(testDef, rowsOf(['.@.......#..']));
    run(w, { ...NO_INPUT, right: true }, 2);
    expect(w.hero.x + w.hero.w).toBe(9 * TILE);
  });

  it('collects seeds and herbs', () => {
    const w = createWorld(testDef, rowsOf(['.@.o.h......']));
    const ev = run(w, { ...NO_INPUT, right: true }, 1);
    expect(w.seeds).toBe(1);
    expect(w.herbs.kaprao).toBe(1);
    expect(ev).toContain('herb');
  });

  it('bumping a hidden basket from below gives a herb and uses it up', () => {
    const w = createWorld(testDef, ['.'.repeat(12), '.'.repeat(12), '.'.repeat(12), '.'.repeat(12), '.'.repeat(12), '.'.repeat(12), '.'.repeat(12), '.'.repeat(12), '.?..........', '.'.repeat(12), '.@..........', '.'.repeat(12), '#'.repeat(12), '#'.repeat(12), '#'.repeat(12)]);
    run(w, NO_INPUT, 0.5);
    const ev = run(w, { ...NO_INPUT, jump: true }, 0.6);
    expect(ev).toContain('bump');
    expect(w.map[8][1]).toBe('U');
    expect(w.herbTotal).toBe(1);
  });

  it('stomping a snail defeats it and bounces; walking into it hurts', () => {
    const stompWorld = createWorld(testDef, rowsOf(['.@.e........']));
    stompWorld.hero.y -= 3 * TILE; // start above the snail
    stompWorld.hero.x = stompWorld.enemies[0].x + 4;
    const ev = run(stompWorld, NO_INPUT, 0.6);
    expect(ev).toContain('stomp');
    expect(stompWorld.enemies[0].alive).toBe(false);
    expect(stompWorld.hero.hearts).toBe(3);

    const walkWorld = createWorld(testDef, rowsOf(['.@...e......']));
    const ev2 = run(walkWorld, { ...NO_INPUT, right: true }, 1.5);
    expect(ev2).toContain('hurt');
    expect(walkWorld.hero.hearts).toBe(2);
  });

  it('the งอบ hat takes one hit instead of a heart', () => {
    const w = createWorld(testDef, rowsOf(['.@g..e......']));
    const ev = run(w, { ...NO_INPUT, right: true }, 1.5);
    expect(ev).toContain('shield');
    expect(w.hero.hearts).toBe(3);
    expect(w.hero.shield).toBe(false);
  });

  it('falling into water costs a heart and returns to the last checkpoint', () => {
    const rows = rowsOf(['.@.K....' + '.'.repeat(4)]);
    for (let y = 12; y < 15; y++) rows[y] = '#####' + '...' + '####';
    rows[14] = '#####~~~####';
    const w = createWorld(testDef, rows);
    const seen: string[] = [];
    for (let i = 0; i < 240 && !seen.includes('fall'); i++) seen.push(...step(w, { ...NO_INPUT, right: true }, DT).map((e) => e.type));
    expect(seen).toContain('checkpoint');
    expect(seen).toContain('fall');
    expect(w.hero.hearts).toBe(2);
    expect(w.hero.x).toBe(3 * TILE + 6);
  });

  it('three hits end the game', () => {
    const w = createWorld(testDef, rowsOf(['.@..........']));
    for (let i = 0; i < 3; i++) {
      w.hero.invuln = 0;
      w.hero.y = 20 * TILE; // below the level
      step(w, NO_INPUT, DT);
    }
    expect(w.state).toBe('over');
  });

  it('reaching the goal wins, with a time bonus', () => {
    const w = createWorld(testDef, rowsOf(['.@......G...']));
    const ev = run(w, { ...NO_INPUT, right: true }, 3);
    expect(ev).toContain('win');
    expect(w.state).toBe('won');
    expect(w.timeBonus).toBeGreaterThan(0);
  });

  it('a boss level stays locked until the boss is down', () => {
    const w = createWorld({ ...testDef, boss: true }, rowsOf(['.@......G...']));
    const ev = run(w, { ...NO_INPUT, right: true }, 3);
    expect(ev).toContain('locked');
    expect(w.state).toBe('play');
    w.bossDown = true;
    w.hero.x = w.goal.x + 4;
    run(w, NO_INPUT, 0.1);
    expect(w.state).toBe('won');
  });

  it('the boss takes three stomps', () => {
    const w = createWorld({ ...testDef, boss: true }, rowsOf(['.@...X......']));
    w.enemies[0].y = 12 * TILE - w.enemies[0].h; // standing on the ground
    for (let i = 0; i < 3; i++) {
      const b = w.enemies[0];
      b.hurtT = 0;
      w.hero.x = b.x + 20;
      w.hero.y = b.y - w.hero.h + 3;
      w.hero.vy = 200;
      step(w, NO_INPUT, DT);
    }
    expect(w.bossDown).toBe(true);
  });

  it('a spring throws higher than a jump', () => {
    const w = createWorld(testDef, rowsOf(['.@S.........']));
    run(w, NO_INPUT, 0.3);
    w.hero.x = 2 * TILE + 6;
    w.hero.y = 9 * TILE;
    let top = w.hero.y;
    for (let i = 0; i < 120; i++) {
      step(w, { ...NO_INPUT, jump: true }, DT);
      top = Math.min(top, w.hero.y);
    }
    expect(12 * TILE - (top + w.hero.h)).toBeGreaterThan(PHYS.jump ** 2 / (2 * PHYS.gravity) * 2);
  });

  it('stars come from golden lotuses: finish 1, two lotuses 2, all three 3', () => {
    expect(starsOf(0)).toBe(1);
    expect(starsOf(2)).toBe(2);
    expect(starsOf(3)).toBe(3);
  });

  it('every level can be created', () => {
    for (const def of LEVELS) {
      const w = createWorld(def);
      expect(w.items.filter((i) => i.kind === 'lotus')).toHaveLength(3);
      expect(w.hero).toBeTruthy();
      run(w, NO_INPUT, 0.5);
      expect(w.hero.onGround).toBe(true);
    }
  });
});
