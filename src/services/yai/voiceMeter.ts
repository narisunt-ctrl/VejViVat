import type { VoiceMeasures } from '../../domain/yai/models';
import { detectPitch, frameRms, summariseFrames, VoiceFrame } from '../../domain/yai/voiceFeatures';

// Measures voice features in the browser while the user speaks: loudness and pitch per short frame from the
// microphone, summarised when listening stops. Audio samples are read into a reused buffer and discarded; nothing
// is recorded, stored or sent. If the microphone cannot be opened alongside speech recognition (some phones allow
// only one), the meter quietly returns null and the voice entry carries on without measures.

const FRAME_MS = 50;

export interface VoiceMeterSession {
  stop(): Promise<VoiceMeasures | null>;
}

export async function startVoiceMeter(): Promise<VoiceMeterSession | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') return null;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    return null;
  }
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const frames: VoiceFrame[] = [];
  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    frames.push({ rms: frameRms(buf), pitch: detectPitch(buf, ctx.sampleRate) });
    if (frames.length > 20 * 60 * 3) window.clearInterval(timer); // stop measuring after 3 minutes
  }, FRAME_MS);

  return {
    async stop() {
      window.clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      try {
        await ctx.close();
      } catch {
        // already closed
      }
      return frames.length ? summariseFrames(frames, FRAME_MS / 1000) : null;
    },
  };
}
