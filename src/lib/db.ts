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
    // Deadline đọc: transaction có thể treo vô hạn (QR-11) — coi như không có dữ liệu.
    const timer = setTimeout(() => resolve(null), 1200);
    const done = (v: unknown) => {
      clearTimeout(timer);
      resolve(v);
    };
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => done(req.result ?? null);
      req.onerror = () => done(null);
    } catch {
      done(null);
    }
  });
}

/** true = đã ghi xong; false = không ghi được (QR-01: caller phải biết để cảnh báo mất dữ liệu). */
export async function idbSet(key: string, value: unknown): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
