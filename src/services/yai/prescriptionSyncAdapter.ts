import { useSyncExternalStore } from 'react';
import type { MedicationOrderSnapshot } from '../../domain/yai/prescriptionSync';
import { orderKey } from '../../domain/yai/prescriptionSync';

// Demo bridge between CareBridge (clinician app) and ยายพร้อม (patient app): both run in this same browser, so
// published order versions are kept in localStorage and read by the patient app ("เชื่อมข้อมูลจำลองภายในแอป").
// This is NOT a hospital/HIS/HOSxP connection, has no authentication and sends nothing anywhere.
// Production would replace it with an authenticated backend (FHIR MedicationRequest/MedicationDispense, event
// outbox, immutable audit), behind the same publish/latest interface.

const KEY = 'carebridge-demo-orders-v1';

export interface OrderEvent {
  at: string;
  actor: string;
  action: 'PUBLISHED';
  orderKey: string;
  version: number;
  summary: string;
}

interface Outbox {
  /** every published version, append-only */
  versions: MedicationOrderSnapshot[];
  events: OrderEvent[];
}

let memory: Outbox = { versions: [], events: [] };
const listeners = new Set<() => void>();

function read(): Outbox {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) return JSON.parse(raw) as Outbox;
  } catch {
    // fall back to memory
  }
  return memory;
}

function write(next: Outbox) {
  memory = next;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // keep working in memory
  }
  snapshotCache = null;
  listeners.forEach((l) => l());
}

let snapshotCache: Outbox | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      snapshotCache = null;
      listeners.forEach((l) => l());
    }
  });
}

export const carebridgeOutbox = {
  get(): Outbox {
    if (!snapshotCache) snapshotCache = read();
    return snapshotCache;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  latestVersion(sourceSystem: string, sourceOrderId: string): MedicationOrderSnapshot | null {
    const k = orderKey({ sourceSystem, sourceOrderId });
    return this.get().versions.filter((v) => orderKey(v) === k).sort((a, b) => b.sourceVersion - a.sourceVersion)[0] ?? null;
  },

  /** Latest version of every order for one patient (what the patient app imports) */
  latestForPatient(patientId: string): MedicationOrderSnapshot[] {
    const latest = new Map<string, MedicationOrderSnapshot>();
    for (const v of this.get().versions) {
      if (v.patientId !== patientId) continue;
      const k = orderKey(v);
      if (!latest.has(k) || latest.get(k)!.sourceVersion < v.sourceVersion) latest.set(k, v);
    }
    return [...latest.values()];
  },

  /** Publish the next version of an order; the version number is assigned here so it is always increasing */
  publish(snapshot: Omit<MedicationOrderSnapshot, 'sourceVersion'>, actor: string, summary: string): MedicationOrderSnapshot {
    const prev = this.latestVersion(snapshot.sourceSystem, snapshot.sourceOrderId);
    const versioned = { ...snapshot, sourceVersion: (prev?.sourceVersion ?? 0) + 1 } as MedicationOrderSnapshot;
    const state = read();
    write({
      versions: [...state.versions, versioned],
      events: [{ at: versioned.lastChangedAt, actor, action: 'PUBLISHED' as const, orderKey: orderKey(versioned), version: versioned.sourceVersion, summary }, ...state.events].slice(0, 100),
    });
    return versioned;
  },

  reset() {
    write({ versions: [], events: [] });
  },
};

export function useCarebridgeOutbox(): Outbox {
  return useSyncExternalStore(carebridgeOutbox.subscribe, () => carebridgeOutbox.get(), () => carebridgeOutbox.get());
}
