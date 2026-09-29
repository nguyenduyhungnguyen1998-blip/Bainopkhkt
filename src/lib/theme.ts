import { useEffect, useState } from 'preact/hooks';

export type Theme = 'dark' | 'light';
const KEY = 'mdv.theme';

export function getTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme) || 'dark';
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent('mdv:theme', { detail: t }));
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, set] = useState<Theme>(getTheme);
  useEffect(() => {
    const on = (e: Event) => set((e as CustomEvent<Theme>).detail);
    window.addEventListener('mdv:theme', on);
    return () => window.removeEventListener('mdv:theme', on);
  }, []);
  return [theme, setTheme];
}

// ── Tùy chọn tiếp cận: cỡ chữ % & độ phẳng nền % ───────────────────────
// Thanh trượt % (thay mức rời cũ). Cỡ chữ → style.fontSize trên <html> nên mọi
// token rem co theo. Độ phẳng → biến --flat 0..1: giảm dần opacity ảnh nền đồng
// bộ, họa tiết và blur kính; 100% bật thêm data-contrast để tắt hẳn nền.
export const FONT_PCT_MIN = 85;
export const FONT_PCT_MAX = 130;
export const FLAT_PCT_MAX = 100;
const FONT_PCT_KEY = 'mdv.fontPct';
const FLAT_PCT_KEY = 'mdv.flatPct';
// Migrate một lần từ khoá cũ (mức rời) → giá trị % tương đương.
const LEGACY: Record<string, { key: string; map: Record<string, number> }> = {
  [FONT_PCT_KEY]: { key: 'mdv.font', map: { md: 100, lg: 112, xl: 125 } },
  [FLAT_PCT_KEY]: { key: 'mdv.contrast', map: { on: 100, off: 0 } },
};

function readPct(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v != null) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    const legacy = LEGACY[key];
    if (legacy) {
      const lv = localStorage.getItem(legacy.key);
      if (lv != null && lv in legacy.map) {
        const n = legacy.map[lv];
        try {
          localStorage.setItem(key, String(n));
          localStorage.removeItem(legacy.key);
        } catch {
          /* private mode */
        }
        return n;
      }
    }
  } catch {
    /* private mode */
  }
  return fallback;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

export function useFontScale(): [number, (v: number) => void] {
  const [v, setV] = useState(() => readPct(FONT_PCT_KEY, 100));
  const write = (n: number) => {
    n = clamp(n, FONT_PCT_MIN, FONT_PCT_MAX);
    setV(n);
    document.documentElement.style.fontSize = `${n}%`;
    try {
      localStorage.setItem(FONT_PCT_KEY, String(n));
    } catch {
      /* private mode */
    }
  };
  return [v, write];
}

export function useAmbientFlat(): [number, (v: number) => void] {
  const [v, setV] = useState(() => readPct(FLAT_PCT_KEY, 0));
  const write = (n: number) => {
    n = clamp(n, 0, FLAT_PCT_MAX);
    setV(n);
    const root = document.documentElement;
    root.style.setProperty('--flat', String(n / 100));
    if (n >= FLAT_PCT_MAX) root.dataset.contrast = 'on';
    else delete root.dataset.contrast;
    try {
      localStorage.setItem(FLAT_PCT_KEY, String(n));
    } catch {
      /* private mode */
    }
  };
  return [v, write];
}

/** Theo dõi online/offline cho dải trạng thái. */
export function useOnline(): boolean {
  const [online, set] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => set(true);
    const down = () => set(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}
