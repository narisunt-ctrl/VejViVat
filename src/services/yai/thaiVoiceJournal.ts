// Thai speech-to-text for the journal, using the browser's own SpeechRecognition (Chrome/Edge/Safari).
// No transcript is ever generated: if the browser cannot listen, or permission is denied, the caller shows typing
// instead. Note that Chrome sends audio to its speech service; the UI says so before listening.

export type VoiceProblem = 'UNSUPPORTED' | 'DENIED' | 'NO_SPEECH' | 'NETWORK' | 'ABORTED' | 'OTHER';

export const VOICE_PROBLEM_TH: Record<VoiceProblem, string> = {
  UNSUPPORTED: 'เครื่องหรือเบราว์เซอร์นี้ฟังเสียงภาษาไทยไม่ได้ พิมพ์แทนได้เลยค่ะ',
  DENIED: 'ยังไม่ได้อนุญาตให้ใช้ไมโครโฟน อนุญาตในการตั้งค่าเบราว์เซอร์ หรือพิมพ์แทนได้ค่ะ',
  NO_SPEECH: 'หนูยังไม่ได้ยินเสียง ลองกดพูดอีกครั้ง หรือพิมพ์แทนได้ค่ะ',
  NETWORK: 'ฟังเสียงไม่ได้เพราะไม่มีอินเทอร์เน็ต พิมพ์แทนได้ค่ะ',
  ABORTED: 'หยุดฟังแล้ว',
  OTHER: 'ฟังเสียงไม่สำเร็จ พิมพ์แทนได้ค่ะ',
};

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function voiceInputSupported(): boolean {
  return recognitionCtor() !== null;
}

export function mapVoiceError(code: string): VoiceProblem {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'DENIED';
  if (code === 'no-speech') return 'NO_SPEECH';
  if (code === 'network') return 'NETWORK';
  if (code === 'aborted') return 'ABORTED';
  return 'OTHER';
}

export interface VoiceSession {
  stop(): void;
  abort(): void;
}

/**
 * Start listening in Thai. `onText` gets the transcript so far (final parts + current interim part);
 * `onEnd` gets the final transcript ('' if nothing was recognised) or a problem.
 */
export function startThaiDictation(handlers: {
  onText: (text: string) => void;
  onEnd: (result: { text: string; problem?: VoiceProblem }) => void;
}): VoiceSession | null {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    handlers.onEnd({ text: '', problem: 'UNSUPPORTED' });
    return null;
  }
  const rec = new Ctor();
  rec.lang = 'th-TH';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = '';
  let problem: VoiceProblem | undefined;
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += `${r[0].transcript} `;
      else interim += r[0].transcript;
    }
    handlers.onText(`${finalText}${interim}`.trim());
  };
  rec.onerror = (e) => {
    problem = mapVoiceError(e.error);
  };
  rec.onend = () => {
    const text = finalText.trim();
    handlers.onEnd({ text, problem: text ? undefined : problem ?? 'NO_SPEECH' });
  };
  try {
    rec.start();
  } catch {
    handlers.onEnd({ text: '', problem: 'OTHER' });
    return null;
  }
  return { stop: () => rec.stop(), abort: () => rec.abort() };
}

/** Read text aloud in Thai if supported; returns false when the device cannot speak */
export function speakThai(text: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'th-TH';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
