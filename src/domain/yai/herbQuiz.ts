import { FORMULARY_CARDS, HerbCard } from './herbDiscovery';

// Herb quiz for ยายพร้อม: "guess the herb" from clues read aloud. A learning game built only from the national
// herbal formulary entries already in the app (listed use, taste, element). Clues say "ตามบัญชียาหลัก" so they
// are read as listed information, not as a promise that a herb works. It is for enjoyment and learning; the app
// does not claim it prevents memory loss. Questions are deterministic per date and round so a demo is repeatable.

export type QuizLevel = 'EASY' | 'HARD';

export interface QuizQuestion {
  id: string;
  answer: HerbCard;
  options: HerbCard[];
  /** what is shown and read aloud */
  clue: string;
  /** shown after answering */
  explain: string;
}

/** "ยาแคปซูลขิง" → "ขิง"; formulas keep their name ("หอมนวโกฐ") */
export const herbShortName = (c: HerbCard) =>
  c.thaiName.replace(/^ยา(แคปซูล|น้ำ)?/, '').replace(/\s*\/.*$/, '').replace(/\s*\(.*?\)\s*/g, '').trim();

const sameHerb = (a: HerbCard, b: HerbCard) => a.scientificName === b.scientificName || herbShortName(a) === herbShortName(b);

/** Formulary herbs with enough information to make a fair clue */
export const QUIZ_HERBS: HerbCard[] = FORMULARY_CARDS.filter((c) => c.taste && c.listedIndications.length > 0)
  // one card per plant (two Andrographis products would make two right answers)
  .filter((c, i, all) => all.findIndex((x) => sameHerb(x, c)) === i);

/** Small seeded generator (mulberry32) so a date + round always gives the same questions */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], r: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** First listed use, cut to its first phrase so the clue stays short ("บรรเทาอาการไข้หวัด (Common Cold) เช่น…" → "บรรเทาอาการไข้หวัด") */
export function firstUse(c: HerbCard): string {
  const words = c.listedIndications[0].split(/[,;(]/)[0].trim().split(/\s+/);
  let out = '';
  for (const w of words) {
    out = out ? `${out} ${w}` : w;
    if (out.length >= 12) break;
  }
  return out;
}

function clueFor(c: HerbCard, level: QuizLevel): string {
  if (level === 'EASY') return `สมุนไพรรส${c.taste} ตามบัญชียาหลักใช้${firstUse(c).replace(/^ใช้/, '')} คือสมุนไพรอะไร`;
  return `สมุนไพรรส${c.taste}${c.element ? ` ตำราจัดเข้ากับ${c.element}` : ''} คือสมุนไพรอะไร`;
}

export function makeQuiz(date: string, round = 0, level: QuizLevel = 'EASY', count = 5, pool: HerbCard[] = QUIZ_HERBS): QuizQuestion[] {
  const seed = Number(date.replace(/-/g, '')) * 31 + round * 7919 + (level === 'HARD' ? 101 : 0);
  const r = rng(seed);
  const answers = shuffle(pool, r).slice(0, Math.min(count, pool.length));
  const nOptions = level === 'EASY' ? 3 : 4;
  return answers.map((answer, i) => {
    // distractors: different short name and, where possible, a different taste so the clue can be answered
    const others = shuffle(
      pool.filter((c) => !sameHerb(c, answer)),
      r
    ).sort((a, b) => Number(a.taste === answer.taste) - Number(b.taste === answer.taste));
    const options = shuffle([answer, ...others.slice(0, nOptions - 1)], r);
    return {
      id: `${date}-${round}-${level}-${i}`,
      answer,
      options,
      clue: clueFor(answer, level),
      explain: `${herbShortName(answer)} (${answer.scientificName}) · รส${answer.taste} · ตามบัญชียาหลัก: ${answer.listedIndications[0]}`,
    };
  });
}

/** Gentle words for the end of a round; never "failed" */
export function roundWords(correct: number, total: number): string {
  if (correct === total) return 'เก่งมาก ตอบถูกทุกข้อ';
  if (correct >= Math.ceil(total / 2)) return 'ดีมาก ได้รู้จักสมุนไพรเพิ่มขึ้นแล้ว';
  return 'ไม่เป็นไร เล่นใหม่ได้ ได้ฟังข้อมูลสมุนไพรครบทุกข้อแล้ว';
}
