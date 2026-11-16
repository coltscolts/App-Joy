// IndexedDB mínimo: un almacén para el estado (JSON) y otro para archivos (audio, fotos).
const DB_NAME = 'oficina-ejecutiva';
const VERSION = 1;
let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx<T>(store: 'state' | 'blobs', mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const idb = {
  getState: <T>(key: string) => tx<T | undefined>('state', 'readonly', (s) => s.get(key)),
  setState: (key: string, value: unknown) => tx('state', 'readwrite', (s) => s.put(value, key)),
  getBlob: (key: string) => tx<Blob | undefined>('blobs', 'readonly', (s) => s.get(key)),
  setBlob: (key: string, blob: Blob) => tx('blobs', 'readwrite', (s) => s.put(blob, key)),
  deleteBlob: (key: string) => tx('blobs', 'readwrite', (s) => s.delete(key)),
  blobKeys: () => tx<IDBValidKey[]>('blobs', 'readonly', (s) => s.getAllKeys()),
};
