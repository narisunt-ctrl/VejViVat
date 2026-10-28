// Keeps the original, full-resolution source image of every photo in IndexedDB (localStorage only holds
// a smaller preview). Originals stay in this browser, are never edited, and are wiped with the demo data.

const DB = 'yai-photos';
const STORE = 'originals';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const photoStore = {
  available: () => typeof indexedDB !== 'undefined',
  put: (photoId: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, photoId)).then(() => true),
  get: (photoId: string) => tx<Blob | undefined>('readonly', (s) => s.get(photoId)),
  remove: (photoId: string) => tx('readwrite', (s) => s.delete(photoId)).then(() => true),
  clear: () => tx('readwrite', (s) => s.clear()).then(() => true),
};
