/**
 * Lớp lưu trữ IndexedDB tối giản (P3): một object store dạng key–value.
 * Mọi thao tác đều rơi về `null`/no-op khi IndexedDB không có (private mode, vitest),
 * để caller dùng localStorage làm dự phòng mà không cần try/catch lặp lại.
 */

const DB_NAME = 'mdv';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    // Nếu open bị block vô hạn (origin đang bị xoá, profile lỗi) thì fallback
    // localStorage thay vì kẹt splash mãi — app vẫn boot được.
    const timer = setTimeout(() => resolve(null), 1500);
    req.onsuccess = () => {
      clearTimeout(timer);
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => { clearTimeout(timer); resolve(null); };
    req.onblocked = () => { clearTimeout(timer); resolve(null); };
  });
  return dbPromise;
}

export async function idbGet(key: string): Promise<unknown> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
