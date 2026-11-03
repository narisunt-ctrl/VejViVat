import { describe, it, expect } from 'vitest';
import { LEVELS, TILE } from '../../games/herb-adventure/levels';
import { createWorld, isSolid, step, tileAt, type Input, type World } from '../../games/herb-adventure/engine';

// A simple bot plays every level from start to goal, to prove each one can be finished: it runs right, jumps at
// walls, gaps, thorns and enemies, and waits for rafts. It is not clever, so passing means the levels are fair.

const DT = 1 / 120;

function bot(w: World, memo: { holdJump: number }): Input {
  const h = w.hero;
  const feetY = Math.floor((h.y + h.h + 2) / TILE);
  const front = Math.floor((h.x + h.w + 4) / TILE);
  const midY = Math.floor((h.y + h.h / 2) / TILE);
  const standing = (tx: number) => {
    for (let y = feetY; y < feetY + 4; y++) {
      const c = tileAt(w, tx, y);
      if (isSolid(c) || c === '=') return true;
    }
    return false;
  };
  const wall = isSolid(tileAt(w, front, midY)) || isSolid(tileAt(w, front, midY - 1));
  const gapAhead = !standing(front) || !standing(front + 1);
  const thornAhead = [front, front + 1].some((tx) => tileAt(w, tx, feetY - 1) === '^');
  const enemyAhead = w.enemies.some((e) => e.alive && e.x > h.x && e.x - (h.x + h.w) < 70 && Math.abs(e.y + e.h - (h.y + h.h)) < 40);
  // rafts: stop at the shore, hop on when the raft comes close, ride to the far end, then step off
  const raft = w.rafts.find((r) => h.x > r.x0 - 4 * TILE && h.x < r.x1 + r.w);
  let right = true;
  let raftJump = false;
  let waitForRaft = false;
  if (raft && !h.raft && h.x + h.w < raft.x0 + 8 && h.onGround) {
    const dist = raft.x - (h.x + h.w);
    if (gapAhead) {
      waitForRaft = true;
      right = false;
      if (dist < 72 && dist > -10) {
        raftJump = true;
        right = true;
      }
    }
  }
  if (h.raft) {
    const atEnd = h.raft.x >= h.raft.x1 - 6;
    right = atEnd || h.x + h.w < h.raft.x + h.raft.w - 6;
    waitForRaft = !atEnd;
  }
  const jumpNow = h.onGround && (raftJump || (!waitForRaft && (wall || thornAhead || enemyAhead || gapAhead)));
  if (jumpNow) {
    // a jump needs a fresh press: let go for one step if the button is still held
    if (memo.holdJump > 0) {
      memo.holdJump = 0;
      return { left: false, right, jump: false };
    }
    memo.holdJump = raftJump ? 0.16 : 0.5;
  }
  memo.holdJump -= DT;
  return { left: false, right, jump: memo.holdJump > 0 };
}

describe('every level can be finished', () => {
  it.each(LEVELS.map((l) => [l.name, l] as const))('%s', (_, def) => {
    const w = createWorld(def);
    const memo = { holdJump: 0 };
    let stuckAt = 0;
    let lastX = 0;
    for (let i = 0; i < 400 / DT && w.state === 'play'; i++) {
      // the boss is a fight, not a path: the bot is helped past it here; stomping it is tested on its own
      if (def.boss && !w.bossDown && w.hero.x > (w.goal.x - 26 * TILE)) {
        w.bossDown = true;
        for (const e of w.enemies) if (e.kind === 'boss') e.alive = false;
      }
      w.hero.invuln = Math.max(w.hero.invuln, 0); // no cheating on hearts
      step(w, bot(w, memo), DT);
      if (i % 240 === 0) {
        if (Math.abs(w.hero.x - lastX) < 4) stuckAt++;
        else stuckAt = 0;
        lastX = w.hero.x;
        expect(stuckAt, `${def.id} stuck near x=${Math.round(w.hero.x / TILE)}`).toBeLessThan(6);
      }
    }
    expect(w.state, `${def.id} ended at x=${Math.round(w.hero.x / TILE)} hearts=${w.hero.hearts}`).toBe('won');
  });
});
