import { useSyncExternalStore } from 'react';

// Internal hand-off between clinicians in the same hospital: a modern-medicine doctor asks the Thai traditional
// medicine team to review a patient. Same-browser demo store; production would use the hospital's own system.

export interface ConsultRequest {
  id: string;
  patientId: string;
  at: string;
  from: string;
  to: 'TTM';
  question: string;
  /** interaction rule ids the doctor attached */
  ruleIds: string[];
  acceptedAt?: string;
  isSynthetic: true;
}

const KEY = 'carebridge-consults-v1';
let cache: ConsultRequest[] | null = null;
const listeners = new Set<() => void>();

function read(): ConsultRequest[] {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '[]') as ConsultRequest[];
  } catch {
    return [];
  }
}
function write(next: ConsultRequest[]) {
  cache = next;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // memory only
  }
  listeners.forEach((l) => l());
}

export const consults = {
  all(): ConsultRequest[] {
    if (!cache) cache = read();
    return cache;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  request(c: Omit<ConsultRequest, 'id' | 'at' | 'to' | 'isSynthetic'>): ConsultRequest {
    const req: ConsultRequest = { ...c, id: `consult-${Date.now().toString(36)}`, at: new Date().toISOString(), to: 'TTM', isSynthetic: true };
    write([req, ...this.all()]);
    return req;
  },
  accept(id: string) {
    write(this.all().map((c) => (c.id === id && !c.acceptedAt ? { ...c, acceptedAt: new Date().toISOString() } : c)));
  },
  reset() {
    write([]);
  },
};

export function useConsults(): ConsultRequest[] {
  return useSyncExternalStore(consults.subscribe, () => consults.all(), () => consults.all());
}
