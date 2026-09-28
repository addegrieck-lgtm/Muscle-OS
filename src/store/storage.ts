/**
 * Couche de persistance « local-first ».
 * - État applicatif (JSON) : localStorage via un adaptateur interchangeable.
 * - Photos (binaires) : IndexedDB.
 * Pour une future version commerciale, il suffira d'implémenter `StorageAdapter`
 * avec une synchronisation cloud (ex. Supabase, CouchDB…) sans toucher à l'UI.
 */

export interface StorageAdapter<T> {
  load(): T | null;
  save(state: T): void;
  clear(): void;
}

export class LocalStorageAdapter<T> implements StorageAdapter<T> {
  constructor(private key: string) {}
  load(): T | null {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  save(state: T): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch (e) {
      console.error('Sauvegarde impossible', e);
    }
  }
  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }
}

// ---------------- IndexedDB (photos) ----------------

const DB_NAME = 'muscleos';
const STORE = 'photos';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const photoStore = {
  put: (key: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, key)),
  get: (key: string) => tx<Blob | undefined>('readonly', (s) => s.get(key) as IDBRequest<Blob | undefined>),
  remove: (key: string) => tx('readwrite', (s) => s.delete(key)),
  keys: () => tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys()),
};

/** Redimensionne et compresse une image (JPEG ~1280 px) avant stockage local. */
export async function compressImage(file: File, maxSize = 1280, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const blobToDataUrl = (b: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(b);
  });

export const dataUrlToBlob = async (d: string): Promise<Blob> => (await fetch(d)).blob();
