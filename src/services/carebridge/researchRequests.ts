import { useSyncExternalStore } from 'react';

// Research requests to use ยายพร้อม herb data, submitted by researchers on CareBridge. Access needs two gates:
// an ethics committee approval (recorded by the researcher with its reference) and a data access committee
// decision. Only aggregate or in-platform analysis is offered; no identifiable data leaves the platform.
// Same-browser demo store with simulated committee decisions, clearly labelled.

export type DataAccessType = 'AGGREGATE' | 'IN_PLATFORM' | 'RECRUITMENT';
export type RequestStatus = 'SUBMITTED' | 'ETHICS_PENDING' | 'APPROVED' | 'DECLINED';

export interface ResearchRequest {
  id: string;
  at: string;
  researcher: string;
  institution: string;
  herb: string;
  question: string;
  access: DataAccessType;
  /** ethics committee reference as given by the researcher; empty = not approved yet */
  ethicsRef: string;
  status: RequestStatus;
  decidedAt?: string;
  decisionNote?: string;
  isSynthetic: true;
}

const KEY = 'carebridge-research-requests-v1';
let cache: ResearchRequest[] | null = null;
const listeners = new Set<() => void>();

function read(): ResearchRequest[] {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '[]') as ResearchRequest[];
  } catch {
    return [];
  }
}
function write(next: ResearchRequest[]) {
  cache = next;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // memory only
  }
  listeners.forEach((l) => l());
}

/** A request can be approved only with an ethics reference; without one it waits for ethics */
export function initialStatus(ethicsRef: string): RequestStatus {
  return ethicsRef.trim() ? 'SUBMITTED' : 'ETHICS_PENDING';
}

export const researchRequests = {
  all(): ResearchRequest[] {
    if (!cache) cache = read();
    return cache;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  submit(r: Omit<ResearchRequest, 'id' | 'at' | 'status' | 'isSynthetic'>): ResearchRequest {
    const req: ResearchRequest = { ...r, id: `rr-${Date.now().toString(36)}`, at: new Date().toISOString(), status: initialStatus(r.ethicsRef), isSynthetic: true };
    write([req, ...this.all()]);
    return req;
  },
  /** Simulated data access committee decision; approval is refused while there is no ethics reference */
  decide(id: string, approve: boolean, note: string): { ok: boolean; reason?: string } {
    const r = this.all().find((x) => x.id === id);
    if (!r) return { ok: false, reason: 'ไม่พบคำขอ' };
    if (approve && !r.ethicsRef.trim()) return { ok: false, reason: 'ต้องมีเลขที่อนุมัติจากคณะกรรมการจริยธรรมก่อน' };
    write(this.all().map((x) => (x.id === id ? { ...x, status: approve ? 'APPROVED' : 'DECLINED', decidedAt: new Date().toISOString(), decisionNote: note } : x)));
    return { ok: true };
  },
  addEthicsRef(id: string, ref: string) {
    write(this.all().map((x) => (x.id === id && x.status === 'ETHICS_PENDING' && ref.trim() ? { ...x, ethicsRef: ref.trim(), status: 'SUBMITTED' } : x)));
  },
  reset() {
    write([]);
  },
};

export function useResearchRequests(): ResearchRequest[] {
  return useSyncExternalStore(researchRequests.subscribe.bind(researchRequests), () => researchRequests.all());
}
