import { useSyncExternalStore } from 'react';

// Messages a doctor sends from CareBridge to ยายพร้อม (e.g. "please talk to us about taking X with Y"), and the
// patient's "รับทราบ". Same-browser demo channel in localStorage, like the order adapter: no push, no SMS, no server.
// The patient app shows a message only while the patient's consent to this clinic is active.

export interface ClinicianMessage {
  id: string;
  patientId: string;
  /** consent recipient id of the sending clinic */
  fromRecipientId: string;
  fromName: string;
  at: string;
  kind: 'INTERACTION_ALERT' | 'FOLLOW_UP';
  title: string;
  body: string;
  /** interaction rule the doctor was looking at, for provenance */
  ruleId?: string;
  acknowledgedAt?: string;
  isSynthetic: true;
}

const KEY = 'carebridge-demo-messages-v1';
let memory: ClinicianMessage[] = [];
let cache: ClinicianMessage[] | null = null;
const listeners = new Set<() => void>();

function read(): ClinicianMessage[] {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) return JSON.parse(raw) as ClinicianMessage[];
  } catch {
    // fall back to memory
  }
  return memory;
}

function write(next: ClinicianMessage[]) {
  memory = next;
  cache = null;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // keep in memory
  }
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

export const clinicianMessages = {
  all(): ClinicianMessage[] {
    if (!cache) cache = read();
    return cache;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  forPatient(patientId: string) {
    return this.all().filter((m) => m.patientId === patientId);
  },
  send(m: Omit<ClinicianMessage, 'id' | 'at' | 'isSynthetic'>): ClinicianMessage {
    const msg: ClinicianMessage = { ...m, id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), isSynthetic: true };
    write([msg, ...read()].slice(0, 100));
    return msg;
  },
  acknowledge(id: string) {
    write(read().map((m) => (m.id === id && !m.acknowledgedAt ? { ...m, acknowledgedAt: new Date().toISOString() } : m)));
  },
  reset() {
    write([]);
  },
};

export function useClinicianMessages(): ClinicianMessage[] {
  return useSyncExternalStore(clinicianMessages.subscribe, () => clinicianMessages.all(), () => clinicianMessages.all());
}
