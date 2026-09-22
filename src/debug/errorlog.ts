/**
 * D8 – Offline Error Log.
 * Bắt window.onerror + unhandledrejection, lưu vòng đệm 200 mục vào localStorage
 * (P5: chuyển sang IndexedDB) để đọc lại sau khi demo ngoài trời không có DevTools.
 */
export interface ErrorEntry {
  t: number;
  kind: 'error' | 'rejection' | 'manual';
  message: string;
  stack?: string;
  route: string;
  online: boolean;
}

const KEY = 'mdv.errors.v1';
const MAX = 200;
let buffer: ErrorEntry[] = load();
const listeners = new Set<() => void>();

function load(): ErrorEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(buffer));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function logError(kind: ErrorEntry['kind'], message: string, stack?: string) {
  buffer.push({ t: Date.now(), kind, message, stack, route: location.hash, online: navigator.onLine });
  if (buffer.length > MAX) buffer = buffer.slice(-MAX);
  persist();
}

export function getErrors(): ErrorEntry[] {
  return buffer;
}

export function clearErrors() {
  buffer = [];
  persist();
}

export function onErrorsChange(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function exportErrorsJson(): string {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), ua: navigator.userAgent, entries: buffer },
    null,
    2
  );
}

let installed = false;
export function installErrorLog() {
  if (installed) return;
  installed = true;
  window.addEventListener('error', (e) => {
    logError('error', e.message || String(e.error), e.error?.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    logError('rejection', r?.message || String(r), r?.stack);
  });
}
