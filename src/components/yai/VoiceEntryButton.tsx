import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { startThaiDictation, VOICE_PROBLEM_TH, VoiceProblem, VoiceSession, voiceInputSupported } from '../../services/yai/thaiVoiceJournal';
import { startVoiceMeter, VoiceMeterSession } from '../../services/yai/voiceMeter';
import { useYai } from '../../services/yai/yaiStore';
import type { VoiceMeasures } from '../../domain/yai/models';

/**
 * The home screen's main action: tap, speak Thai, tap again to finish. Shows only what the browser actually
 * recognised. When listening is impossible it says why and offers typing; it never pretends to record.
 * With voice measures turned on (Settings, experimental) it also measures pace, pauses, pitch and loudness on the
 * device while listening; no audio is kept. `look="orb"` draws it as the large breathing microphone of the home hero.
 */
export const VoiceEntryButton: React.FC<{
  onTranscript: (text: string, voice?: VoiceMeasures) => void;
  onFallback: (problem: VoiceProblem) => void;
  label?: string;
  look?: 'button' | 'orb';
}> = ({ onTranscript, onFallback, label = 'กดพูด เล่าให้หนูฟัง', look = 'button' }) => {
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState('');
  const [problem, setProblem] = useState<VoiceProblem | null>(null);
  const session = useRef<VoiceSession | null>(null);
  const meter = useRef<Promise<VoiceMeterSession | null> | null>(null);
  const measure = useYai((s) => !!s.settings.voiceMeasures);
  const supported = voiceInputSupported();

  const stopMeter = async () => {
    const m = meter.current;
    meter.current = null;
    return m ? ((await m)?.stop() ?? null) : null;
  };

  useEffect(
    () => () => {
      session.current?.abort();
      void stopMeter();
    },
    []
  );

  const start = () => {
    setProblem(null);
    setLive('');
    if (!supported) {
      setProblem('UNSUPPORTED');
      onFallback('UNSUPPORTED');
      return;
    }
    if (measure) meter.current = startVoiceMeter();
    const s = startThaiDictation({
      onText: setLive,
      onEnd: async ({ text, problem: p }) => {
        setListening(false);
        session.current = null;
        const voice = await stopMeter();
        if (text) onTranscript(text, voice ?? undefined);
        else if (p && p !== 'ABORTED') {
          setProblem(p);
          if (p === 'DENIED' || p === 'UNSUPPORTED' || p === 'NETWORK') onFallback(p);
        }
      },
    });
    if (s) {
      session.current = s;
      setListening(true);
    } else void stopMeter();
  };

  const note = (
    <>
      {problem && problem !== 'ABORTED' && (
        <p role="status" className="rounded-2xl bg-amber-50 p-3 text-base font-semibold text-amber-950">
          {VOICE_PROBLEM_TH[problem]}
        </p>
      )}
    </>
  );

  if (look === 'orb')
    return (
      <div className="space-y-4">
        <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
          <span className={`mic-ring ${listening ? 'mic-ring-live' : ''}`} aria-hidden="true" />
          <span className={`mic-ring mic-ring-2 ${listening ? 'mic-ring-live' : ''}`} aria-hidden="true" />
          <span className={`mic-ring mic-ring-3 ${listening ? 'mic-ring-live' : ''}`} aria-hidden="true" />
          <button
            type="button"
            onClick={() => (listening ? session.current?.stop() : start())}
            aria-pressed={listening}
            aria-label={listening ? 'เล่าจบแล้ว หยุดฟัง' : label}
            className={`relative flex h-36 w-36 flex-col items-center justify-center rounded-full text-[#0B1F1B] shadow-[0_18px_50px_-12px_rgb(0_0_0/0.55)] transition duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 active:scale-95 ${
              listening ? 'bg-white' : 'bg-gradient-to-br from-[#D6F6A0] to-[#A0DE6E]'
            }`}
          >
            {listening ? <Square className="h-12 w-12 fill-current" aria-hidden="true" /> : <Mic className="h-14 w-14" aria-hidden="true" />}
            <span className="mt-1 text-base font-bold">{listening ? 'เล่าจบแล้ว' : 'กดพูด'}</span>
          </button>
        </div>
        {listening && (
          <p className="mx-auto min-h-[4.5rem] max-w-[26rem] rounded-3xl bg-black/20 p-4 text-left text-xl leading-relaxed backdrop-blur-sm" aria-live="polite">
            {live || <span className="text-white/60">พูดได้เลยค่ะ…</span>}
          </p>
        )}
        {note}
      </div>
    );

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
        <p className="text-sm opacity-75">
          {supported ? 'เบราว์เซอร์จะแปลงเสียงเป็นข้อความ (อาจส่งเสียงไปยังบริการของเบราว์เซอร์) แล้วให้ตรวจก่อนบันทึกทุกครั้ง' : 'เครื่องนี้ฟังเสียงไม่ได้ กดแล้วจะเปิดช่องพิมพ์ให้'}
          {supported && measure ? ' · เปิดวัดลักษณะเสียงในเครื่องไว้ (ทดลอง ไม่เก็บไฟล์เสียง)' : ''}
        </p>
      )}
    </div>
  );
};
