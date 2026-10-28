import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { startThaiDictation, VOICE_PROBLEM_TH, VoiceProblem, VoiceSession, voiceInputSupported } from '../../services/yai/thaiVoiceJournal';

/**
 * The home screen's main action: tap, speak Thai, tap again to finish. Shows only what the browser actually
 * recognised. When listening is impossible it says why and offers typing; it never pretends to record.
 */
export const VoiceEntryButton: React.FC<{
  onTranscript: (text: string) => void;
  onFallback: (problem: VoiceProblem) => void;
  label?: string;
}> = ({ onTranscript, onFallback, label = 'กดพูด เล่าให้หนูฟัง' }) => {
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState('');
  const [problem, setProblem] = useState<VoiceProblem | null>(null);
  const session = useRef<VoiceSession | null>(null);
  const supported = voiceInputSupported();

  useEffect(() => () => session.current?.abort(), []);

  const start = () => {
    setProblem(null);
    setLive('');
    if (!supported) {
      setProblem('UNSUPPORTED');
      onFallback('UNSUPPORTED');
      return;
    }
    const s = startThaiDictation({
      onText: setLive,
      onEnd: ({ text, problem: p }) => {
        setListening(false);
        session.current = null;
        if (text) onTranscript(text);
        else if (p && p !== 'ABORTED') {
          setProblem(p);
          if (p === 'DENIED' || p === 'UNSUPPORTED' || p === 'NETWORK') onFallback(p);
        }
      },
    });
    if (s) {
      session.current = s;
      setListening(true);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => (listening ? session.current?.stop() : start())}
        aria-pressed={listening}
        className={`flex min-h-[88px] w-full items-center justify-center gap-3 rounded-3xl px-4 text-2xl font-bold shadow-md transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${
          listening ? 'bg-yai-alert text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {listening ? <Square className="h-8 w-8" aria-hidden="true" /> : <Mic className="h-9 w-9" aria-hidden="true" />}
        {listening ? 'กำลังฟัง… กดอีกครั้งเมื่อเล่าจบ' : label}
      </button>
      {listening && (
        <p className="rounded-2xl bg-white/90 p-3 text-lg text-yai-ink" aria-live="polite">
          <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-yai-alert motion-reduce:animate-none" aria-hidden="true" />
          {live || 'พูดได้เลยค่ะ…'}
        </p>
      )}
      {problem && problem !== 'ABORTED' && (
        <p role="status" className="rounded-2xl bg-amber-50 p-3 text-base font-semibold text-amber-950">
          {VOICE_PROBLEM_TH[problem]}
        </p>
      )}
      {!listening && !problem && (
        <p className="text-sm text-yai-ink/70">
          {supported ? 'เบราว์เซอร์จะแปลงเสียงเป็นข้อความ (อาจส่งเสียงไปยังบริการของเบราว์เซอร์) แล้วให้ยายตรวจก่อนบันทึก' : 'เครื่องนี้ฟังเสียงไม่ได้ กดแล้วจะเปิดช่องพิมพ์ให้'}
        </p>
      )}
    </div>
  );
};
