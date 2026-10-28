// Photos captured in the current scan, handed from /yai/scan to /yai/scan/review.
// Kept in sessionStorage so a refresh on the review page does not lose them.

const KEY = 'yai-scan-session';

export const scanSession = {
  get(): string[] {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  },
  add(photoId: string) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify([...this.get(), photoId].slice(-6)));
    } catch {
      // ignore
    }
  },
  remove(photoId: string) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(this.get().filter((id) => id !== photoId)));
    } catch {
      // ignore
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};
