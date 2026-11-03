import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameAudio } from './audio';
import { drawHerb, drawPreview, makeArt, render, type Art, type Camera } from './draw';
import { createWorld, levelCounts, NO_INPUT, starsOf, step, type Input, type World } from './engine';
import { HERB_NAME, LEVELS, ROWS, TILE, type HerbKind, type ThemeId } from './levels';

// "ยายพร้อม ตะลุยเก็บสมุนไพร": a side-scrolling platformer. ยายพร้อม runs and jumps through five Thai landscapes
// collecting herbs, golden seeds and golden lotuses, bopping garden pests. Self-contained (React only, its own
// styles) so the same files work in both ยายพร้อม apps. Progress is kept in this browser.

const STORE = 'herb-adventure-v1';
const STEP = 1 / 120;
const LEVEL_H = ROWS * TILE;

interface Saved {
  unlocked: number;
  best: Record<string, { score: number; stars: number }>;
  sound: boolean;
  herbs: Partial<Record<HerbKind, number>>;
}
const EMPTY: Saved = { unlocked: 1, best: {}, sound: true, herbs: {} };
function load(): Saved {
  try {
    return { ...EMPTY, ...(JSON.parse(localStorage.getItem(STORE) ?? '{}') as Partial<Saved>) };
  } catch {
    return EMPTY;
  }
}
function save(s: Saved) {
  try {
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    // storage blocked: progress lasts for this visit
  }
}

export interface FinishResult {
  levelId: string;
  levelName: string;
  stars: 1 | 2 | 3;
  score: number;
  herbs: Partial<Record<HerbKind, number>>;
}

type Screen = 'title' | 'select' | 'play' | 'won' | 'over';
interface Hud {
  hearts: number;
  score: number;
  seeds: number;
  herbs: number;
  lotus: number;
  time: number;
  shield: boolean;
  power: string;
  locked: boolean;
}

const CSS = `
.ha-root{position:relative;width:100%;color:#fff;font-family:inherit;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.ha-stage{position:relative;width:100%;overflow:hidden;border-radius:24px;background:#0c1d18;box-shadow:0 18px 50px -20px rgba(0,0,0,.6);touch-action:none}
.ha-stage canvas{display:block;width:100%;height:100%}
.ha-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center}
.ha-dim{background:radial-gradient(ellipse at center,rgba(8,22,18,.35),rgba(8,22,18,.78))}
.ha-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:56px;padding:0 26px;border-radius:999px;border:0;font:inherit;font-size:20px;font-weight:700;cursor:pointer;transition:transform .15s ease,filter .15s ease}
.ha-btn:hover{transform:translateY(-2px);filter:brightness(1.05)}
.ha-btn:active{transform:scale(.97)}
.ha-btn:focus-visible{outline:3px solid #fff;outline-offset:3px}
.ha-primary{background:linear-gradient(180deg,#FFE27A,#F5A623);color:#3A2408;box-shadow:0 6px 0 #B86E10,0 12px 24px -8px rgba(0,0,0,.5)}
.ha-ghost{background:rgba(255,255,255,.14);color:#fff;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35)}
.ha-logo{font-weight:800;line-height:1.05;letter-spacing:-.01em;filter:drop-shadow(0 4px 0 #6B3D0E) drop-shadow(0 10px 18px rgba(0,0,0,.45))}
.ha-logo b{display:block;font-size:clamp(34px,8vw,64px);background:linear-gradient(180deg,#FFF7C2 10%,#FFD24A 55%,#F08A1C 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1.5px #7A4410}
.ha-logo span{display:block;font-size:clamp(18px,4.4vw,30px);color:#E9FFD9;-webkit-text-stroke:0;margin-bottom:4px}
.ha-hud{position:absolute;left:0;right:0;top:0;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px;pointer-events:none}
.ha-chip{display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 11px;border-radius:999px;background:rgba(10,30,25,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-weight:700;font-size:16px;font-variant-numeric:tabular-nums;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.ha-icon-btn{pointer-events:auto;width:44px;height:44px;border-radius:999px;border:0;background:rgba(10,30,25,.6);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
.ha-pad{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 4px 4px}
.ha-pad.ha-over{position:absolute;left:0;right:0;bottom:0;padding:12px 16px;pointer-events:none}
.ha-pad button{pointer-events:auto;touch-action:none;border:0;border-radius:999px;color:#fff;font:inherit;font-weight:800;display:flex;align-items:center;justify-content:center;background:rgba(10,30,25,.55);box-shadow:inset 0 0 0 2px rgba(255,255,255,.3),0 6px 16px -6px rgba(0,0,0,.6)}
.ha-pad .ha-dir{width:76px;height:76px}
.ha-pad .ha-jump{width:104px;height:104px;font-size:20px;background:linear-gradient(180deg,rgba(255,226,122,.95),rgba(245,166,35,.95));color:#3A2408;box-shadow:0 6px 0 #B86E10,0 10px 20px -6px rgba(0,0,0,.6)}
.ha-pad button[data-on="1"]{transform:scale(.94);filter:brightness(1.15)}
.ha-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;width:100%;max-width:980px;flex-shrink:0;padding:4px 4px 16px}
.ha-card{position:relative;border:0;padding:0;border-radius:18px;overflow:hidden;background:rgba(255,255,255,.08);color:#fff;font:inherit;text-align:left;cursor:pointer;box-shadow:inset 0 0 0 2px rgba(255,255,255,.18);transition:transform .15s ease}
.ha-card:hover{transform:translateY(-3px)}
.ha-card:disabled{cursor:default;filter:grayscale(.8) brightness(.6)}
.ha-card canvas{display:block;width:100%;height:96px}
.ha-card div{padding:8px 12px 12px}
.ha-stars{display:inline-flex;gap:4px}
.ha-panel{background:rgba(10,30,25,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:28px;padding:22px 20px;max-width:440px;width:100%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 24px 50px -20px rgba(0,0,0,.7)}
@keyframes ha-pop{0%{transform:scale(0) rotate(-30deg);opacity:0}70%{transform:scale(1.25) rotate(8deg);opacity:1}100%{transform:scale(1) rotate(0)}}
.ha-star-pop{animation:ha-pop .55s cubic-bezier(.2,1.4,.4,1) both}
@keyframes ha-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.ha-float{animation:ha-float 3s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.ha-star-pop,.ha-float{animation:none}}
`;

const Star: React.FC<{ on: boolean; size?: number; delay?: number; pop?: boolean }> = ({ on, size = 22, delay = 0, pop }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={pop ? 'ha-star-pop' : undefined} style={{ animationDelay: `${delay}s` }}>
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" fill={on ? '#FFD24A' : 'rgba(255,255,255,.18)'} stroke={on ? '#B86E10' : 'rgba(255,255,255,.35)'} strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
const Heart: React.FC<{ on: boolean }> = ({ on }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21s-7.5-4.6-9.5-9.4C1.2 8.3 3.4 4.5 7 4.5c2 0 3.5 1.2 5 3 1.5-1.8 3-3 5-3 3.6 0 5.8 3.8 4.5 7.1C19.5 16.4 12 21 12 21z" fill={on ? '#FF5C7A' : 'rgba(255,255,255,.2)'} stroke={on ? '#9C1F3C' : 'rgba(255,255,255,.35)'} strokeWidth="1.5" />
  </svg>
);
const SeedIcon = () => (
  <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true">
    <path d="M8 1C13 5 13 13 8 17 3 13 3 5 8 1z" fill="#FFC93C" stroke="#8A5410" strokeWidth="1.4" />
  </svg>
);
const LeafIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20C4 9 11 4 21 3c-1 10-6 17-17 17z" fill="#7CC24A" stroke="#2F6B1F" strokeWidth="1.6" />
    <path d="M4 20L14 10" stroke="#2F6B1F" strokeWidth="1.6" />
  </svg>
);
const LotusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3c3 4 3 9 0 14-3-5-3-10 0-14z" fill="#FFB3D1" stroke="#C2477A" strokeWidth="1.3" />
    <path d="M4 9c4 0 7 4 8 8-4 0-8-3-8-8zM20 9c-4 0-7 4-8 8 4 0 8-3 8-8z" fill="#FF9EC4" stroke="#C2477A" strokeWidth="1.3" />
  </svg>
);
const IconSvg: React.FC<{ d: string }> = ({ d }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const PAUSE = 'M8 5v14M16 5v14';
const SOUND_ON = 'M4 9v6h4l5 4V5L8 9H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12';
const SOUND_OFF = 'M4 9v6h4l5 4V5L8 9H4zM17 9l5 5M22 9l-5 5';
const ARROW_L = 'M15 5l-7 7 7 7';
const ARROW_R = 'M9 5l7 7-7 7';

/** fireworks behind the win screen */
const Fireworks: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const c = cv.getContext('2d')!;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = performance.now();
    let next = 0;
    const parts: { x: number; y: number; vx: number; vy: number; life: number; col: string }[] = [];
    const cols = ['#FFD24A', '#FF7FA8', '#7FE3FF', '#B8F27C', '#FFFFFF'];
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = (cv.width = cv.clientWidth);
      const h = (cv.height = cv.clientHeight);
      next -= dt;
      if (next <= 0 && !reduce) {
        next = 0.45;
        const x = w * (0.15 + Math.random() * 0.7);
        const y = h * (0.15 + Math.random() * 0.35);
        const col = cols[Math.floor(Math.random() * cols.length)];
        for (let i = 0; i < 46; i++) {
          const a = (i / 46) * Math.PI * 2;
          const s = 90 + Math.random() * 120;
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.2, col });
        }
      }
      c.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.life -= dt;
        p.vy += 90 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        c.globalAlpha = Math.max(0, p.life);
        c.fillStyle = p.col;
        c.beginPath();
        c.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        c.fill();
      }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true" />;
};

const Preview: React.FC<{ index: number }> = ({ index }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.clientWidth * dpr;
    cv.height = cv.clientHeight * dpr;
    const c = cv.getContext('2d')!;
    c.scale(dpr, dpr);
    const def = LEVELS[index];
    const w = createWorld(def);
    for (let i = 0; i < 30; i++) step(w, NO_INPUT, STEP);
    drawPreview(c, w, makeArt(def.theme, 0.5), cv.clientWidth, cv.clientHeight, 1);
  }, [index]);
  return <canvas ref={ref} aria-hidden="true" />;
};

const HerbPic: React.FC<{ kind: HerbKind }> = ({ kind }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = 40 * dpr;
    cv.height = 40 * dpr;
    const c = cv.getContext('2d')!;
    c.scale(dpr, dpr);
    drawHerb(c, kind, 20, 21, 1.2);
  }, [kind]);
  return <canvas ref={ref} style={{ width: 40, height: 40 }} aria-hidden="true" />;
};

export const HerbAdventure: React.FC<{
  /** called when a level is finished (for the app's own streaks and goals) */
  onFinish?: (r: FinishResult) => void;
  /** a link or button the app shows on the title screen (e.g. back to the games page) */
  exit?: React.ReactNode;
}> = ({ onFinish, exit }) => {
  const [saved, setSaved] = useState<Saved>(load);
  const [screen, setScreen] = useState<Screen>('title');
  const [level, setLevel] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<Hud | null>(null);
  const [result, setResult] = useState<{ stars: 1 | 2 | 3; world: World; best: boolean } | null>(null);
  const [touch] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
  const [size, setSize] = useState({ w: 360, h: 360, s: 0.75, portrait: true });

  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const art = useRef<Map<ThemeId, Art>>(new Map());
  const cam = useRef<Camera>({ x: 0, y: 0 });
  const input = useRef<Input>({ ...NO_INPUT });
  const audio = useRef<GameAudio | null>(null);
  const screenRef = useRef(screen);
  const pausedRef = useRef(paused);
  const hudKey = useRef('');
  const [pressed, setPressed] = useState({ l: false, r: false, j: false });
  const savedRef = useRef(saved);
  const onFinishRef = useRef(onFinish);
  screenRef.current = screen;
  pausedRef.current = paused;
  savedRef.current = saved;
  onFinishRef.current = onFinish;

  // ---------- size ----------
  useEffect(() => {
    const fit = () => {
      const el = stage.current?.parentElement;
      const cw = el?.clientWidth ?? 360;
      const vh = window.innerHeight;
      const portrait = vh > cw * 1.15;
      const s = Math.max(0.74, Math.min(1.6, cw / (portrait ? 400 : 520)));
      const room = portrait && touch ? vh - 220 : vh - 120;
      const h = Math.max(260, Math.min(LEVEL_H * s, room));
      setSize({ w: cw, h, s, portrait });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [touch]);

  // ---------- audio ----------
  useEffect(() => {
    audio.current = new GameAudio();
    audio.current.on = saved.sound;
    return () => audio.current?.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setSound = (on: boolean) => {
    audio.current?.setOn(on);
    const next = { ...savedRef.current, sound: on };
    setSaved(next);
    save(next);
  };

  const artFor = useCallback((theme: ThemeId) => {
    const res = Math.min(2, (window.devicePixelRatio || 1) * size.s);
    let a = art.current.get(theme);
    if (!a || Math.abs(a.res - res) > 0.01) {
      a = makeArt(theme, res);
      art.current.set(theme, a);
    }
    return a;
  }, [size.s]);

  const startLevel = (i: number) => {
    audio.current?.start();
    audio.current?.playMusic();
    world.current = createWorld(LEVELS[i]);
    cam.current = { x: 0, y: LEVEL_H - size.h / size.s };
    input.current = { ...NO_INPUT };
    hudKey.current = '';
    setLevel(i);
    setPaused(false);
    setResult(null);
    setScreen('play');
  };

  // ---------- the loop ----------
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    cv.width = Math.round(size.w * dpr);
    cv.height = Math.round(size.h * dpr);
    const c = cv.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let t = 0;
    if (screenRef.current === 'title' && !world.current) world.current = createWorld(LEVELS[0]);
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const w = world.current;
      const viewW = size.w / size.s;
      const viewH = size.h / size.s;
      if (w) {
        const playing = screenRef.current === 'play' && !pausedRef.current;
        if (playing || screenRef.current === 'title' || screenRef.current === 'won' || screenRef.current === 'over') {
          acc += dt;
          while (acc >= STEP) {
            acc -= STEP;
            const ev = step(w, playing ? input.current : NO_INPUT, STEP);
            for (const e of ev) audio.current?.sfx(e.type);
            if (playing && ev.some((e) => e.type === 'win')) finish(w);
            if (playing && ev.some((e) => e.type === 'over')) {
              audio.current?.stopMusic();
              setScreen('over');
            }
          }
        }
        // camera
        const h = w.hero;
        let tx = h.x + h.w / 2 - viewW * 0.42 + h.face * 40;
        if (screenRef.current === 'title') tx = Math.sin(t * 0.15) * 260 + 260;
        tx = Math.max(0, Math.min(w.width - viewW, tx));
        cam.current.x += (tx - cam.current.x) * Math.min(1, dt * 5);
        if (viewH >= LEVEL_H) cam.current.y = LEVEL_H - viewH;
        else {
          const ty = Math.max(0, Math.min(LEVEL_H - viewH, h.y - viewH * 0.55));
          cam.current.y += (ty - cam.current.y) * Math.min(1, dt * 5);
        }
        const shake = w.shake > 0 ? w.shake * 14 : 0;
        const view = { x: cam.current.x + (Math.random() - 0.5) * shake, y: cam.current.y + (Math.random() - 0.5) * shake };
        c.setTransform(dpr * size.s, 0, 0, dpr * size.s, 0, 0);
        render(c, w, view, viewW, viewH, artFor(w.def.theme), t);
        // heads-up display, updated only when something changed
        const hud: Hud = {
          hearts: h.hearts,
          score: w.score,
          seeds: w.seeds,
          herbs: w.herbTotal,
          lotus: w.lotus,
          time: Math.floor(w.time),
          shield: h.shield,
          power: h.speedT > 0 ? `วิ่งไว ${Math.ceil(h.speedT)}` : h.kiteT > 0 ? `ว่าว ${Math.ceil(h.kiteT)}` : '',
          locked: w.lockedHintT > 0,
        };
        const key = JSON.stringify(hud);
        if (key !== hudKey.current) {
          hudKey.current = key;
          setHud(hud);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size, artFor]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (w: World) => {
    const saved = savedRef.current;
    audio.current?.stopMusic();
    const stars = starsOf(w.lotus);
    const def = w.def;
    const prev = saved.best[def.id];
    const herbs = { ...saved.herbs };
    for (const [k, n] of Object.entries(w.herbs)) herbs[k as HerbKind] = (herbs[k as HerbKind] ?? 0) + (n ?? 0);
    const next: Saved = {
      ...saved,
      unlocked: Math.max(saved.unlocked, LEVELS.findIndex((l) => l.id === def.id) + 2),
      best: { ...saved.best, [def.id]: { score: Math.max(prev?.score ?? 0, w.score), stars: Math.max(prev?.stars ?? 0, stars) } },
      herbs,
    };
    setSaved(next);
    save(next);
    setResult({ stars, world: w, best: !prev || w.score > prev.score });
    setScreen('won');
    onFinishRef.current?.({ levelId: def.id, levelName: def.name, stars, score: w.score, herbs: w.herbs });
  };

  // ---------- keyboard ----------
  useEffect(() => {
    const set = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      const i = input.current;
      if (k === 'arrowleft' || k === 'a') i.left = down;
      else if (k === 'arrowright' || k === 'd') i.right = down;
      else if (k === ' ' || k === 'arrowup' || k === 'w') i.jump = down;
      else if ((k === 'escape' || k === 'p') && down && screenRef.current === 'play') setPaused((p) => !p);
      else return;
      if (screenRef.current === 'play') e.preventDefault();
    };
    const dn = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    const hide = () => {
      if (document.hidden && screenRef.current === 'play') setPaused(true);
    };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);

  useEffect(() => {
    if (screen !== 'play') return;
    if (paused) audio.current?.stopMusic();
    else audio.current?.playMusic();
  }, [paused, screen]);

  // ---------- touch pad ----------
  const hold = (k: 'left' | 'right' | 'jump', key: 'l' | 'r' | 'j') => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      input.current[k] = true;
      setPressed((p) => ({ ...p, [key]: true }));
    },
    onPointerUp: () => {
      input.current[k] = false;
      setPressed((p) => ({ ...p, [key]: false }));
    },
    onPointerCancel: () => {
      input.current[k] = false;
      setPressed((p) => ({ ...p, [key]: false }));
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const pad = touch && screen === 'play' && !paused && (
    <div className={`ha-pad ${size.portrait ? '' : 'ha-over'}`}>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="ha-dir" aria-label="เดินซ้าย" data-on={pressed.l ? 1 : 0} {...hold('left', 'l')}>
          <IconSvg d={ARROW_L} />
        </button>
        <button className="ha-dir" aria-label="เดินขวา" data-on={pressed.r ? 1 : 0} {...hold('right', 'r')}>
          <IconSvg d={ARROW_R} />
        </button>
      </div>
      <button className="ha-jump" aria-label="กระโดด" data-on={pressed.j ? 1 : 0} {...hold('jump', 'j')}>
        กระโดด
      </button>
    </div>
  );

  const def = LEVELS[level];
  const totalStars = LEVELS.reduce((n, l) => n + (saved.best[l.id]?.stars ?? 0), 0);
  const counts = useMemo(() => (result ? levelCounts(result.world) : null), [result]);

  return (
    <div className="ha-root">
      <style>{CSS}</style>
      <div ref={stage} className="ha-stage" style={{ height: size.h }}>
        <canvas ref={canvas} aria-label="ฉากเกม ยายพร้อมตะลุยเก็บสมุนไพร" role="img" />

        {screen === 'play' && hud && (
          <div className="ha-hud">
            <span className="ha-chip" aria-label={`หัวใจ ${hud.hearts}`}>
              {[1, 2, 3].map((k) => (
                <Heart key={k} on={k <= hud.hearts} />
              ))}
              {hud.shield && <span style={{ fontSize: 13 }}>+งอบ</span>}
            </span>
            <span className="ha-chip" aria-label={`คะแนน ${hud.score}`}>
              {hud.score.toLocaleString('th-TH')}
            </span>
            <span className="ha-chip" aria-label={`เมล็ดทอง ${hud.seeds}`}>
              <SeedIcon /> {hud.seeds}
            </span>
            <span className="ha-chip" aria-label={`สมุนไพร ${hud.herbs}`}>
              <LeafIcon /> {hud.herbs}
            </span>
            <span className="ha-chip" aria-label={`ดอกบัวทอง ${hud.lotus} จาก 3`}>
              <LotusIcon /> {hud.lotus}/3
            </span>
            <span className="ha-chip" aria-label={`เวลา ${hud.time} วินาที`}>
              {Math.floor(hud.time / 60)}:{String(hud.time % 60).padStart(2, '0')}
            </span>
            {hud.power && <span className="ha-chip">{hud.power}</span>}
            <span style={{ flex: 1 }} />
            <button className="ha-icon-btn" onClick={() => setSound(!saved.sound)} aria-label={saved.sound ? 'ปิดเสียง' : 'เปิดเสียง'}>
              <IconSvg d={saved.sound ? SOUND_ON : SOUND_OFF} />
            </button>
            <button className="ha-icon-btn" onClick={() => setPaused(true)} aria-label="หยุดเกมชั่วคราว">
              <IconSvg d={PAUSE} />
            </button>
          </div>
        )}
        {screen === 'play' && hud?.locked && (
          <div className="ha-overlay" style={{ pointerEvents: 'none', justifyContent: 'flex-start', paddingTop: 70 }}>
            <span className="ha-chip" style={{ height: 'auto', padding: '8px 14px' }}>
              ประตูยังปิด ปราบด้วงยักษ์ก่อนนะ
            </span>
          </div>
        )}

        {screen === 'title' && (
          <div className="ha-overlay ha-dim">
            <div className="ha-logo ha-float">
              <span>ยายพร้อม</span>
              <b>ตะลุยเก็บสมุนไพร</b>
            </div>
            <p style={{ margin: '14px 0 20px', fontSize: 18, color: 'rgba(255,255,255,.85)', maxWidth: 420 }}>
              วิ่ง กระโดด เก็บสมุนไพรไทย เมล็ดทอง และดอกบัวทอง ผ่าน 5 ดินแดน
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <button
                className="ha-btn ha-primary"
                onClick={() => {
                  audio.current?.start();
                  setScreen('select');
                }}
              >
                เริ่มเล่น
              </button>
              <button className="ha-btn ha-ghost" onClick={() => setSound(!saved.sound)} aria-label={saved.sound ? 'ปิดเสียง' : 'เปิดเสียง'}>
                <IconSvg d={saved.sound ? SOUND_ON : SOUND_OFF} /> {saved.sound ? 'เสียงเปิด' : 'เสียงปิด'}
              </button>
            </div>
            <p style={{ marginTop: 16, fontSize: 14, color: 'rgba(255,255,255,.7)' }}>
              {touch ? 'ปุ่มซ้าย ขวา เดิน · ปุ่มใหญ่ กระโดด (กดค้างกระโดดสูง)' : '← → หรือ A D เดิน · Space กระโดด (กดค้างกระโดดสูง) · P หยุด'}
            </p>
            {exit && <div style={{ marginTop: 10 }}>{exit}</div>}
          </div>
        )}

        {screen === 'select' && (
          <div className="ha-overlay ha-dim" style={{ justifyContent: 'flex-start', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 980, marginBottom: 10 }}>
              <button className="ha-icon-btn" onClick={() => setScreen('title')} aria-label="กลับหน้าแรกของเกม">
                <IconSvg d={ARROW_L} />
              </button>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, flex: 1, textAlign: 'left' }}>เลือกด่าน</h2>
              <span className="ha-chip">
                <Star on size={18} /> {totalStars}/{LEVELS.length * 3}
              </span>
            </div>
            <div className="ha-cards">
              {LEVELS.map((l, i) => {
                const open = i < saved.unlocked;
                const best = saved.best[l.id];
                return (
                  <button key={l.id} className="ha-card" disabled={!open} onClick={() => startLevel(i)} aria-label={`${l.name}${open ? '' : ' ยังล็อกอยู่'}`}>
                    <Preview index={i} />
                    <div>
                      <span style={{ fontSize: 13, opacity: 0.8 }}>{l.sub}</span>
                      <strong style={{ display: 'block', fontSize: 18 }}>{l.name}</strong>
                      <span className="ha-stars">
                        {[1, 2, 3].map((k) => (
                          <Star key={k} on={k <= (best?.stars ?? 0)} size={18} />
                        ))}
                      </span>
                      {best && <span style={{ marginLeft: 8, fontSize: 13, opacity: 0.8 }}>สูงสุด {best.score.toLocaleString('th-TH')}</span>}
                      {!open && <span style={{ display: 'block', fontSize: 13, opacity: 0.85 }}>ผ่านด่านก่อนหน้าเพื่อปลดล็อก</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {screen === 'play' && paused && (
          <div className="ha-overlay ha-dim">
            <div className="ha-panel">
              <h2 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800 }}>พักก่อน</h2>
              <p style={{ margin: '0 0 18px', opacity: 0.8 }}>{def.name}</p>
              <div style={{ display: 'grid', gap: 10 }}>
                <button className="ha-btn ha-primary" onClick={() => setPaused(false)}>
                  เล่นต่อ
                </button>
                <button className="ha-btn ha-ghost" onClick={() => startLevel(level)}>
                  เริ่มด่านนี้ใหม่
                </button>
                <button className="ha-btn ha-ghost" onClick={() => setSound(!saved.sound)}>
                  <IconSvg d={saved.sound ? SOUND_ON : SOUND_OFF} /> {saved.sound ? 'ปิดเสียง' : 'เปิดเสียง'}
                </button>
                <button
                  className="ha-btn ha-ghost"
                  onClick={() => {
                    audio.current?.stopMusic();
                    setScreen('select');
                  }}
                >
                  เลือกด่าน
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'won' && result && (
          <div className="ha-overlay ha-dim" style={{ overflow: 'auto' }}>
            <Fireworks />
            <div className="ha-panel" style={{ position: 'relative' }}>
              <p style={{ margin: 0, opacity: 0.85 }}>{result.world.def.name}</p>
              <h2 style={{ margin: '2px 0 8px', fontSize: 30, fontWeight: 800 }}>ผ่านด่านแล้ว!</h2>
              <div className="ha-stars" style={{ gap: 10, marginBottom: 8 }}>
                {[1, 2, 3].map((k) => (
                  <Star key={k} on={k <= result.stars} size={52} pop delay={0.25 + k * 0.25} />
                ))}
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.8 }}>ดาวมาจากดอกบัวทอง: เก็บ 2 ดอกได้ 2 ดาว ครบ 3 ดอกได้ 3 ดาว</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', textAlign: 'left', fontSize: 17 }}>
                <span>ดอกบัวทอง</span>
                <b>
                  {result.world.lotus}/{counts?.lotus ?? 3}
                </b>
                <span>สมุนไพร</span>
                <b>{result.world.herbTotal}</b>
                <span>เมล็ดทอง</span>
                <b>{result.world.seeds}</b>
                <span>โบนัสเวลา</span>
                <b>+{result.world.timeBonus.toLocaleString('th-TH')}</b>
                <span style={{ fontSize: 20, fontWeight: 800 }}>คะแนน</span>
                <b style={{ fontSize: 20 }}>
                  {result.world.score.toLocaleString('th-TH')}
                  {result.best ? ' · สถิติใหม่' : ''}
                </b>
              </div>
              {Object.keys(result.world.herbs).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 700 }}>สมุนไพรในตะกร้า</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {(Object.entries(result.world.herbs) as [HerbKind, number][]).map(([k, n]) => (
                      <span key={k} className="ha-chip" style={{ height: 48, paddingLeft: 4 }}>
                        <HerbPic kind={k} /> {HERB_NAME[k]} ×{n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                {level + 1 < LEVELS.length && (
                  <button className="ha-btn ha-primary" onClick={() => startLevel(level + 1)}>
                    ด่านต่อไป
                  </button>
                )}
                {level + 1 >= LEVELS.length && <p style={{ margin: 0, fontWeight: 700 }}>ครบทั้ง 5 ดินแดนแล้ว เก่งมาก!</p>}
                <button className="ha-btn ha-ghost" onClick={() => startLevel(level)}>
                  เล่นด่านนี้อีกครั้ง
                </button>
                <button className="ha-btn ha-ghost" onClick={() => setScreen('select')}>
                  เลือกด่าน
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'over' && (
          <div className="ha-overlay ha-dim">
            <div className="ha-panel">
              <h2 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 800 }}>หัวใจหมดแล้ว</h2>
              <p style={{ margin: '0 0 16px', opacity: 0.85 }}>ไม่เป็นไรนะ ลองใหม่อีกครั้ง ค่อย ๆ กระโดดก็ได้</p>
              <div style={{ display: 'grid', gap: 10 }}>
                <button className="ha-btn ha-primary" onClick={() => startLevel(level)}>
                  เล่นอีกครั้ง
                </button>
                <button className="ha-btn ha-ghost" onClick={() => setScreen('select')}>
                  เลือกด่าน
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {pad}
    </div>
  );
};

export default HerbAdventure;
