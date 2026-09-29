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

// ── Tùy chọn tiếp cận: cỡ chữ & tương phản ─────────────────────────────
export type FontSize = 'md' | 'lg' | 'xl';
const FONT_KEY = 'mdv.font';
const CONTRAST_KEY = 'mdv.contrast';

function pref<T extends string>(key: string, attr: 'font' | 'contrast', fallback: T): [() => T, (v: T) => void] {
  const read = (): T => (document.documentElement.dataset[attr] as T) || fallback;
  const write = (v: T) => {
    if (v === fallback) delete document.documentElement.dataset[attr];
    else document.documentElement.dataset[attr] = v;
    try {
      localStorage.setItem(key, v);
    } catch {
      /* private mode */
    }
    window.dispatchEvent(new CustomEvent(`mdv:${attr}`, { detail: v }));
  };
  return [read, write];
}

function usePref<T extends string>(key: string, attr: 'font' | 'contrast', fallback: T): [T, (v: T) => void] {
  const [read, write] = pref(key, attr, fallback);
  const [val, set] = useState<T>(read);
  useEffect(() => {
    const on = (e: Event) => set((e as CustomEvent<T>).detail);
    window.addEventListener(`mdv:${attr}`, on);
    return () => window.removeEventListener(`mdv:${attr}`, on);
  }, []);
  return [val, write];
}

export function useFontSize(): [FontSize, (v: FontSize) => void] {
  return usePref<FontSize>(FONT_KEY, 'font', 'md');
}

export function useContrast(): [boolean, (v: boolean) => void] {
  const [v, set] = usePref<'on' | 'off'>(CONTRAST_KEY, 'contrast', 'off');
  return [v === 'on', (on) => set(on ? 'on' : 'off')];
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
