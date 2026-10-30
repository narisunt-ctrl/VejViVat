import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Volume2, X } from 'lucide-react';
import { demoNow, useYai, yaiStore } from '../../services/yai/yaiStore';
import { speakThai, stopSpeaking } from '../../services/yai/thaiVoiceJournal';
import { LxCard, LxNotice, LxPageHeader, ProgressBar, SourceTag, btnPrimary, btnSecondary } from '../../components/yai/lx/ui';
import { bangkokDate } from '../../domain/yai/journal';
import { herbShortName, makeQuiz, QuizLevel, roundWords } from '../../domain/yai/herbQuiz';

// เกมทายสมุนไพร: 5 clues per round from the national herbal formulary, read aloud, big answer buttons, gentle
// feedback with a link to the herb page. Finishing a round earns the daily quiz points whatever the score.
// Narration: if public/audio/herb-quiz/manifest.json lists a pre-recorded file for the clue (made offline, e.g.
// with a Thai TTS studio), that file plays; otherwise the browser's Thai voice reads the clue.

type Manifest = Record<string, string>;
let manifestPromise: Promise<Manifest> | null = null;
function loadManifest(): Promise<Manifest> {
  manifestPromise ??= fetch(`${import.meta.env.BASE_URL}audio/herb-quiz/manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : {}))
    .catch(() => ({}));
  return manifestPromise;
}

export const HerbQuizPage: React.FC = () => {
  const state = useYai((s) => s);
  const today = bangkokDate(demoNow(state));
  const playedToday = (state.quizResults ?? []).filter((q) => q.date === today);
  const [level, setLevel] = useState<QuizLevel>('EASY');
  const [round, setRound] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [manifest, setManifest] = useState<Manifest>({});
  const audio = useRef<HTMLAudioElement | null>(null);
  const questions = useMemo(() => (round === null ? [] : makeQuiz(today, round, level)), [today, round, level]);
  const q = questions[step];
  const done = round !== null && step >= questions.length;

  useEffect(() => {
    loadManifest().then(setManifest);
    return () => {
      audio.current?.pause();
      stopSpeaking();
    };
  }, []);

  const say = (text: string, key?: string) => {
    audio.current?.pause();
    stopSpeaking();
    const file = key ? manifest[key] : undefined;
    if (file) {
      audio.current = new Audio(`${import.meta.env.BASE_URL}audio/herb-quiz/${file}`);
      audio.current.play().catch(() => speakThai(text));
    } else speakThai(text);
  };

  const start = () => {
    setRound(playedToday.length);
    setStep(0);
    setPicked(null);
    setCorrect(0);
  };

  const pick = (id: string) => {
    if (picked || !q) return;
    setPicked(id);
    const right = id === q.answer.id;
    if (right) setCorrect((c) => c + 1);
    say(`${right ? 'ถูกต้อง' : 'คำตอบคือ'} ${herbShortName(q.answer)}`);
  };

  const next = () => {
    const last = step + 1 >= questions.length;
    if (last) {
      yaiStore.saveQuizResult({ level, correct, total: questions.length });
      say(roundWords(correct, questions.length));
    }
    setPicked(null);
    setStep(step + 1);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <LxPageHeader back="/yai/discover" eyebrow="Herb Quiz" title="เกมทายสมุนไพร" subtitle="ฟังคำใบ้ แล้วเลือกสมุนไพรที่ใช่ เล่นเพลิน ๆ ได้ความรู้" />

      {round === null && (
        <LxCard>
          <h2 className="text-lg font-semibold text-lx-ink">เลือกระดับ</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="ระดับ">
            {(
              [
                ['EASY', 'ง่าย', 'คำใบ้รส + สรรพคุณตามบัญชียา · 3 ตัวเลือก'],
                ['HARD', 'ท้าทาย', 'คำใบ้รส + ธาตุตามตำรา · 4 ตัวเลือก'],
              ] as const
            ).map(([v, t, sub]) => (
              <button
                key={v}
                role="radio"
                aria-checked={level === v}
                onClick={() => setLevel(v)}
                className={`min-h-[64px] rounded-2xl border p-4 text-left transition ${level === v ? 'border-lx-accent bg-lx-accent/10' : 'border-lx-line bg-lx-surface2'}`}
              >
                <span className="block text-lg font-semibold text-lx-ink">{t}</span>
                <span className="block text-sm text-lx-muted">{sub}</span>
              </button>
            ))}
          </div>
          <button className={`${btnPrimary} mt-4 w-full`} onClick={start}>
            เริ่มเล่น 5 ข้อ
          </button>
          <p className="mt-3 text-sm text-lx-muted">
            {playedToday.length ? `วันนี้เล่นไปแล้ว ${playedToday.length} รอบ ได้แต้มเกมของวันนี้แล้ว เล่นต่อได้ด้วยคำถามชุดใหม่` : 'เล่นจบ 1 รอบ ได้ 3 แต้มต่อวัน ตอบถูกกี่ข้อก็ได้เท่ากัน'}
          </p>
        </LxCard>
      )}

      {q && (
        <LxCard>
          <ProgressBar value={step + 1} max={questions.length} label={`ข้อ ${step + 1} จาก ${questions.length}`} />
          <div className="mt-4 flex items-start gap-3">
            <p className="min-w-0 flex-1 break-words text-lg font-semibold leading-relaxed text-lx-ink" aria-live="polite">
              {q.clue}
            </p>
            <button
              className={`${btnSecondary} shrink-0 px-4`}
              onClick={() => say(q.clue, `${level}-${q.answer.id}`)}
              aria-label="ฟังคำใบ้"
            >
              <Volume2 className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {q.options.map((o) => {
              const isAnswer = o.id === q.answer.id;
              const look = !picked ? 'border-lx-line bg-lx-surface2' : isAnswer ? 'border-2 border-lx-accent bg-lx-accent/15' : o.id === picked ? 'border-2 border-lx-alert bg-lx-alert/10' : 'border-lx-line bg-lx-surface2 opacity-60';
              return (
                <button
                  key={o.id}
                  onClick={() => pick(o.id)}
                  disabled={!!picked}
                  className={`flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border px-5 text-left text-xl font-semibold text-lx-ink transition disabled:cursor-default ${look}`}
                >
                  <span className="min-w-0 break-words">{herbShortName(o)}</span>
                  {picked && isAnswer && <Check className="h-6 w-6 shrink-0 text-lx-accent" aria-label="คำตอบที่ถูก" />}
                  {picked && !isAnswer && o.id === picked && <X className="h-6 w-6 shrink-0 text-lx-alert" aria-label="ยังไม่ใช่" />}
                </button>
              );
            })}
          </div>
          {picked && (
            <div className="mt-4 space-y-3" aria-live="polite">
              <p className="text-lg font-semibold text-lx-ink">{picked === q.answer.id ? 'ถูกต้อง เก่งมาก' : `ยังไม่ใช่ คำตอบคือ ${herbShortName(q.answer)}`}</p>
              <p className="break-words text-sm text-lx-muted">{q.explain}</p>
              <div className="flex flex-wrap items-center gap-3">
                <SourceTag kind="VERIFIED" text={q.answer.source} />
                <Link to={`/yai/discover/${q.answer.id}`} className="text-sm font-semibold text-lx-accent underline">
                  ดูข้อมูลสมุนไพรนี้
                </Link>
              </div>
              <button className={`${btnPrimary} w-full`} onClick={next}>
                {step + 1 >= questions.length ? 'ดูผล' : 'ข้อต่อไป'}
              </button>
            </div>
          )}
        </LxCard>
      )}

      {done && (
        <LxCard>
          <p className="text-sm text-lx-muted">จบรอบแล้ว</p>
          <p className="num mt-1 text-4xl font-semibold text-lx-ink">
            {correct} / {questions.length}
          </p>
          <p className="mt-2 text-lg text-lx-ink">{roundWords(correct, questions.length)}</p>
          <p className="mt-1 text-sm text-lx-muted">{playedToday.length > 1 ? 'แต้มเกมของวันนี้ได้ไปแล้ว' : 'ได้ 3 แต้มจากการเล่นจบรอบวันนี้'}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button className={btnPrimary} onClick={start}>
              เล่นอีกรอบ
            </button>
            <button className={btnSecondary} onClick={() => setRound(null)}>
              เปลี่ยนระดับ
            </button>
          </div>
        </LxCard>
      )}

      <LxNotice title="เกมนี้เพื่อความเพลิดเพลินและการเรียนรู้">
        คำใบ้มาจากข้อมูลในบัญชียาหลักแห่งชาติด้านสมุนไพร ไม่ใช่คำแนะนำให้ใช้ยาและไม่ใช่การรักษา ก่อนใช้สมุนไพร โดยเฉพาะถ้ากินยาประจำ ปรึกษาแพทย์หรือเภสัชกร
      </LxNotice>
    </div>
  );
};

export default HerbQuizPage;
