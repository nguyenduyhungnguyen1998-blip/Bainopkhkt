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
