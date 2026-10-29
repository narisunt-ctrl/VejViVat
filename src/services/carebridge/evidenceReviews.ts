import { useSyncExternalStore } from 'react';
import type { EvidenceTier } from './herbEvidence';

// Clinician peer review of research articles, and guideline drafts built from those reviews.
// Same-browser demo storage (localStorage). A real deployment needs a shared backend with authenticated users,
// conflict-of-interest declarations and an approval committee; the rules below are kept as pure functions so
// the same logic can move there.

export type ReviewerRole = 'MODERN' | 'TTM' | 'PHARMACIST' | 'TCM';
export const ROLE_TH: Record<ReviewerRole, string> = {
  MODERN: 'แพทย์แผนปัจจุบัน',
  TTM: 'แพทย์แผนไทย',
  PHARMACIST: 'เภสัชกร',
  TCM: 'แพทย์แผนจีน',
};

export type Verdict = 'SUPPORTS' | 'NO_EFFECT' | 'UNCERTAIN' | 'HARM_SIGNAL';
export const VERDICT_TH: Record<Verdict, string> = {
  SUPPORTS: 'สนับสนุนประสิทธิผล',
  NO_EFFECT: 'ไม่พบประโยชน์',
  UNCERTAIN: 'ยังสรุปไม่ได้',
  HARM_SIGNAL: 'พบสัญญาณอันตราย',
};

/** GRADE-style certainty the reviewer assigns after reading the paper */
export type Certainty = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
export const CERTAINTY_TH: Record<Certainty, string> = { HIGH: 'สูง', MODERATE: 'ปานกลาง', LOW: 'ต่ำ', VERY_LOW: 'ต่ำมาก' };

export interface ArticleReview {
  id: string;
  /** herb id + condition the article was reviewed for */
  topicKey: string;
  pmid: string;
  title: string;
  journal: string;
  year: number | null;
  tier: EvidenceTier;
  reviewer: string;
  role: ReviewerRole;
  verdict: Verdict;
  certainty: Certainty;
  note: string;
  at: string;
}

export interface GuidelineDraft {
  id: string;
  topicKey: string;
  herbId: string;
  herbThai: string;
  condition: string;
  version: number;
  status: 'DRAFT' | 'APPROVED';
  /** panel's recommendation in its own words; required before approval */
  recommendation: string;
  /** modern-medicine comparator / standard care, with a citation link */
  modern: { text: string; citation: string };
  /** Chinese medicine view, with a citation link (optional) */
  chinese: { text: string; citation: string };
  benefitsNote: string;
  harmsNote: string;
  evidencePmids: string[];
  authors: { name: string; role: ReviewerRole }[];
  approvals: { name: string; role: ReviewerRole; at: string }[];
  createdAt: string;
  updatedAt: string;
  isSynthetic: true;
}

export const topicKeyOf = (herbId: string, condition: string) => `${herbId}|${condition.trim().toLowerCase() || 'all'}`;

function localStore<T>(key: string) {
  let cache: T[] | null = null;
  const listeners = new Set<() => void>();
  const read = (): T[] => {
    try {
      return JSON.parse(globalThis.localStorage?.getItem(key) ?? '[]') as T[];
    } catch {
      return [];
    }
  };
  return {
    all(): T[] {
      if (!cache) cache = read();
      return cache;
    },
    write(next: T[]) {
      cache = next;
      try {
        globalThis.localStorage?.setItem(key, JSON.stringify(next));
      } catch {
        // memory only
      }
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

const reviewStore = localStore<ArticleReview>('carebridge-evidence-reviews-v1');
const guidelineStore = localStore<GuidelineDraft>('carebridge-guidelines-v1');

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const evidenceReviews = {
  all: () => reviewStore.all(),
  subscribe: reviewStore.subscribe,
  /** One review per reviewer per article and topic: reviewing again replaces the earlier one */
  add(r: Omit<ArticleReview, 'id' | 'at'>): ArticleReview {
    const review = { ...r, id: uid('review'), at: new Date().toISOString() };
    reviewStore.write([review, ...reviewStore.all().filter((x) => !(x.topicKey === r.topicKey && x.pmid === r.pmid && x.reviewer.trim() === r.reviewer.trim()))]);
    return review;
  },
  forTopic: (topicKey: string) => reviewStore.all().filter((r) => r.topicKey === topicKey),
  reset: () => reviewStore.write([]),
};

export const guidelines = {
  all: () => guidelineStore.all(),
  subscribe: guidelineStore.subscribe,
  get: (id: string) => guidelineStore.all().find((g) => g.id === id) ?? null,
  create(g: Omit<GuidelineDraft, 'id' | 'version' | 'status' | 'approvals' | 'createdAt' | 'updatedAt' | 'isSynthetic'>): GuidelineDraft {
    const now = new Date().toISOString();
    const prev = guidelineStore.all().filter((x) => x.topicKey === g.topicKey);
    const draft: GuidelineDraft = { ...g, id: uid('guideline'), version: prev.length + 1, status: 'DRAFT', approvals: [], createdAt: now, updatedAt: now, isSynthetic: true };
    guidelineStore.write([draft, ...guidelineStore.all()]);
    return draft;
  },
  /** Editing an approved guideline sends it back to draft: approvals are for the exact text they saw */
  update(id: string, patch: Partial<Pick<GuidelineDraft, 'recommendation' | 'modern' | 'chinese' | 'benefitsNote' | 'harmsNote'>>) {
    guidelineStore.write(
      guidelineStore.all().map((g) => (g.id === id ? { ...g, ...patch, status: 'DRAFT', approvals: [], updatedAt: new Date().toISOString() } : g))
    );
  },
  approve(id: string, name: string, role: ReviewerRole): { ok: boolean; reason?: string } {
    const g = guidelineStore.all().find((x) => x.id === id);
    if (!g) return { ok: false, reason: 'ไม่พบร่าง' };
    const check = canApprove(g, name);
    if (!check.ok) return check;
    const approvals = [...g.approvals, { name: name.trim(), role, at: new Date().toISOString() }];
    guidelineStore.write(guidelineStore.all().map((x) => (x.id === id ? { ...x, approvals, status: isApproved(approvals) ? 'APPROVED' : 'DRAFT' } : x)));
    return { ok: true };
  },
  reset: () => guidelineStore.write([]),
};

export function useReviews(): ArticleReview[] {
  return useSyncExternalStore(evidenceReviews.subscribe, evidenceReviews.all, evidenceReviews.all);
}
export function useGuidelines(): GuidelineDraft[] {
  return useSyncExternalStore(guidelines.subscribe, guidelines.all, guidelines.all);
}

// ---- rules -----------------------------------------------------------------------------------------------

export interface Consensus {
  reviewers: number;
  counts: Record<Verdict, number>;
  /** the verdict most reviewers chose, or null when tied / nobody reviewed */
  majority: Verdict | null;
  roles: ReviewerRole[];
}

export function consensusOf(reviews: ArticleReview[]): Consensus {
  const counts: Record<Verdict, number> = { SUPPORTS: 0, NO_EFFECT: 0, UNCERTAIN: 0, HARM_SIGNAL: 0 };
  reviews.forEach((r) => counts[r.verdict]++);
  const sorted = (Object.entries(counts) as [Verdict, number][]).sort((a, b) => b[1] - a[1]);
  const majority = sorted[0][1] > 0 && sorted[0][1] > sorted[1][1] ? sorted[0][0] : null;
  return { reviewers: reviews.length, counts, majority, roles: [...new Set(reviews.map((r) => r.role))] };
}

export const GUIDELINE_RULES = { minArticles: 3, minReviewersPerArticle: 2 };

/**
 * A topic is ready to draft a guideline when at least 3 human-study articles each have at least 2 reviewers,
 * and the reviewers include both a modern-medicine doctor and a Thai traditional medicine doctor.
 */
export function guidelineReadiness(reviews: ArticleReview[]): { ready: boolean; reviewedArticles: number; missing: string[] } {
  const byArticle = new Map<string, ArticleReview[]>();
  reviews.filter((r) => r.tier !== 'PRECLINICAL').forEach((r) => byArticle.set(r.pmid, [...(byArticle.get(r.pmid) ?? []), r]));
  const reviewedArticles = [...byArticle.values()].filter((rs) => new Set(rs.map((r) => r.reviewer)).size >= GUIDELINE_RULES.minReviewersPerArticle).length;
  const roles = new Set(reviews.map((r) => r.role));
  const missing: string[] = [];
  if (reviewedArticles < GUIDELINE_RULES.minArticles)
    missing.push(`ต้องมีงานวิจัยในคนที่มีผู้รีวิวอย่างน้อย ${GUIDELINE_RULES.minReviewersPerArticle} คน ครบ ${GUIDELINE_RULES.minArticles} ฉบับ (ตอนนี้ ${reviewedArticles})`);
  if (!roles.has('MODERN')) missing.push('ต้องมีแพทย์แผนปัจจุบันร่วมรีวิว');
  if (!roles.has('TTM')) missing.push('ต้องมีแพทย์แผนไทยร่วมรีวิว');
  return { ready: missing.length === 0, reviewedArticles, missing };
}

/** Approved when a modern-medicine doctor and a Thai traditional medicine doctor have both approved */
export function isApproved(approvals: { role: ReviewerRole }[]): boolean {
  const roles = new Set(approvals.map((a) => a.role));
  return roles.has('MODERN') && roles.has('TTM');
}

export function canApprove(g: GuidelineDraft, name: string): { ok: boolean; reason?: string } {
  if (!name.trim()) return { ok: false, reason: 'ระบุชื่อผู้อนุมัติ' };
  if (!g.recommendation.trim()) return { ok: false, reason: 'ต้องเขียนข้อแนะนำของคณะผู้ทบทวนก่อน' };
  if (g.approvals.some((a) => a.name === name.trim())) return { ok: false, reason: 'ผู้อนุมัติคนนี้อนุมัติแล้ว' };
  if (g.modern.text.trim() && !/^https?:\/\/|^10\.\d{4,9}\//.test(g.modern.citation.trim())) return { ok: false, reason: 'ข้อมูลแผนปัจจุบันต้องมีลิงก์หรือ DOI อ้างอิง' };
  if (g.chinese.text.trim() && !/^https?:\/\/|^10\.\d{4,9}\//.test(g.chinese.citation.trim())) return { ok: false, reason: 'ข้อมูลแผนจีนต้องมีลิงก์หรือ DOI อ้างอิง' };
  return { ok: true };
}

/** Overall certainty for a guideline: the most common reviewer certainty among supporting reviews, else very low */
export function overallCertainty(reviews: ArticleReview[]): Certainty {
  const supporting = reviews.filter((r) => r.verdict === 'SUPPORTS' && r.tier !== 'PRECLINICAL');
  if (supporting.length === 0) return 'VERY_LOW';
  const order: Certainty[] = ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'];
  const counts = order.map((c) => supporting.filter((r) => r.certainty === c).length);
  return order[counts.indexOf(Math.max(...counts))];
}

const REVIEWER_KEY = 'carebridge-reviewer';
export function loadReviewer(): { name: string; role: ReviewerRole } {
  try {
    const v = JSON.parse(globalThis.localStorage?.getItem(REVIEWER_KEY) ?? 'null');
    if (v && typeof v.name === 'string') return v;
  } catch {
    // ignore
  }
  return { name: '', role: 'MODERN' };
}
export function saveReviewer(v: { name: string; role: ReviewerRole }) {
  try {
    globalThis.localStorage?.setItem(REVIEWER_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}
