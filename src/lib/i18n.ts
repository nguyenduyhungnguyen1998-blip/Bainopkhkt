import { useEffect, useState } from 'preact/hooks';
import type { Lang, Localized } from '../data/types';
export type { Lang, Localized };

const KEY = 'mdv.lang';
let current: Lang = (() => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'vi' || v === 'en') return v;
  } catch {
    /* ignore */
  }
  return 'vi';
})();

export function getLang(): Lang {
  return current;
}

export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = l;
  window.dispatchEvent(new CustomEvent('mdv:lang', { detail: l }));
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, set] = useState<Lang>(current);
  useEffect(() => {
    const on = (e: Event) => set((e as CustomEvent<Lang>).detail);
    window.addEventListener('mdv:lang', on);
    return () => window.removeEventListener('mdv:lang', on);
  }, []);
  return [lang, setLang];
}

/** Lấy chuỗi theo ngôn ngữ hiện tại, rơi về tiếng Việt nếu thiếu. */
export function t(text: Localized | undefined, lang: Lang = current): string {
  if (!text) return '';
  return text[lang] || text.vi;
}

/** Chuỗi giao diện (UI strings) – tách khỏi nội dung di sản. */
export const UI = {
  map: { vi: 'Bản đồ', en: 'Map' },
  passport: { vi: 'Hộ chiếu', en: 'Passport' },
  quiz: { vi: 'Thử tài', en: 'Quiz' },
  settings: { vi: 'Cài đặt', en: 'Settings' },
  explore: { vi: 'Khám phá', en: 'Explore' },
  locked: { vi: 'Chưa mở', en: 'Locked' },
  next: { vi: 'Điểm kế tiếp', en: 'Next stop' },
  unlocked: { vi: 'Đã mở', en: 'Unlocked' },
  offline: { vi: 'Đang ngoại tuyến – nội dung đã lưu vẫn dùng được', en: 'Offline – saved content still works' },
  all: { vi: 'Toàn quốc', en: 'All' },
  north: { vi: 'Bắc', en: 'North' },
  central: { vi: 'Trung', en: 'Central' },
  south: { vi: 'Nam', en: 'South' },
  myJourney: { vi: 'Hành trình của tôi', en: 'My journey' },
  scanToUnlock: { vi: 'Quét mã QR tại điểm để mở khóa', en: 'Scan the QR code on site to unlock' },
  spots: { vi: 'điểm', en: 'spots' },
  back: { vi: 'Quay lại', en: 'Back' },
  videoSoon: { vi: 'Clip thuyết minh sẽ được cập nhật', en: 'Narrated clip coming soon' },
  listen: { vi: 'Nghe thuyết minh', en: 'Listen' },
  theme: { vi: 'Giao diện', en: 'Theme' },
  dark: { vi: 'Nguyệt Quang (tối)', en: 'Moonlight (dark)' },
  light: { vi: 'Thái Dương (sáng)', en: 'Sunlight (light)' },
  language: { vi: 'Ngôn ngữ', en: 'Language' },
  xp: { vi: 'điểm kinh nghiệm', en: 'XP' },
  comingSoon: { vi: 'Sẽ có ở giai đoạn sau', en: 'Coming in a later phase' },
  simulateScan: { vi: 'Mô phỏng quét QR (demo)', en: 'Simulate QR scan (demo)' },
  unlockedToast: { vi: 'Đã mở khóa', en: 'Unlocked' },
} satisfies Record<string, Localized>;
