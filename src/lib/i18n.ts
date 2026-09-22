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
  videoOffline: { vi: 'Video cần mạng – nghe audio bên dưới nhé', en: 'Video needs network – try the audio below' },
  listen: { vi: 'Nghe thuyết minh', en: 'Listen' },
  theme: { vi: 'Giao diện', en: 'Theme' },
  dark: { vi: 'Nguyệt Quang (tối)', en: 'Moonlight (dark)' },
  light: { vi: 'Thái Dương (sáng)', en: 'Sunlight (light)' },
  language: { vi: 'Ngôn ngữ', en: 'Language' },
  xp: { vi: 'điểm kinh nghiệm', en: 'XP' },
  comingSoon: { vi: 'Sẽ có ở giai đoạn sau', en: 'Coming in a later phase' },
  simulateScan: { vi: 'Mô phỏng quét QR (demo)', en: 'Simulate QR scan (demo)' },
  unlockedToast: { vi: 'Đã mở khóa', en: 'Unlocked' },
  hintTap: { vi: 'Chạm điểm sáng để bắt đầu', en: 'Tap the glowing dot to start' },
  backToJourney: { vi: 'Về hành trình', en: 'Back to journey' },
  yourJourney: { vi: 'Hành trình của bạn', en: 'Your journey' },
  journeyQuote: {
    vi: 'Mỗi địa điểm được mở khóa là một câu chuyện Việt Nam được bạn khám phá.',
    en: 'Every place you unlock is a story of Vietnam you discover.',
  },
  heritageBadges: { vi: 'Huy hiệu di sản', en: 'Heritage badges' },
  earned: { vi: 'Đã đạt', en: 'Earned' },
  badgeLocked: { vi: 'Chưa đạt', en: 'Locked' },
  startExploring: { vi: 'Bắt đầu khám phá', en: 'Start exploring' },
  chooseLang: { vi: 'Chọn ngôn ngữ / Language', en: 'Choose language / Ngôn ngữ' },
  exploreMode: { vi: 'Hình thức khám phá', en: 'How to explore' },
  modeAudio: { vi: 'Audio / Video AI', en: 'Audio / AI video' },
  modeAudioDesc: { vi: 'Thuyết minh giọng đọc & clip AI', en: 'Narrated audio & AI clip' },
  modeText: { vi: 'Văn bản + Hình ảnh', en: 'Text + Images' },
  modeTextDesc: { vi: 'Tư liệu chi tiết & ảnh tư liệu', en: 'Detailed text & archive photos' },
  siteMap: { vi: 'Sơ đồ khu', en: 'Site map' },
  countryMap: { vi: 'Toàn quốc', en: 'Country' },
  gainedXp: { vi: 'Điểm kinh nghiệm', en: 'XP earned' },
  // P3 – quét QR & hộ chiếu
  scanValid: { vi: 'Mã QR hợp lệ', en: 'Valid QR code' },
  scanInvalid: { vi: 'Mã QR không đúng – có thể đã bị sửa. Bạn vẫn xem được nội dung.', en: 'QR signature mismatch – the code may be tampered. Content is still readable.' },
  confirmUnlock: { vi: 'Xác nhận mở khóa điểm này', en: 'Confirm unlock this spot' },
  unlockedDone: { vi: 'Đã mở khóa rồi', en: 'Already unlocked' },
  exportPassport: { vi: 'Xuất hộ chiếu (JSON)', en: 'Export passport (JSON)' },
  importPassport: { vi: 'Nhập hộ chiếu', en: 'Import passport' },
  importOk: { vi: 'Nhập hộ chiếu thành công', en: 'Passport imported' },
  importBad: { vi: 'Tệp không đúng định dạng hộ chiếu', en: 'Not a valid passport file' },
  // P2/P4 – audio & TTS
  listenFallback: { vi: 'Thiết bị không hỗ trợ đọc – đọc văn bản bên dưới', en: 'No speech on this device – read below' },
  play: { vi: 'Nghe', en: 'Play' },
  pause: { vi: 'Tạm dừng', en: 'Pause' },
  resume: { vi: 'Tiếp tục', en: 'Resume' },
  ambient: { vi: 'Âm thanh không gian', en: 'Ambient sound' },
  ambientOff: { vi: 'Tắt âm nền', en: 'Ambient off' },
  listeningTip: { vi: 'Gợi ý: nghe thuyết minh giọng đọc ở thẻ âm thanh', en: 'Tip: try the narrated audio card below' },
  // P3 – quiz
  quizStart: { vi: 'Bắt đầu thử tài', en: 'Start quiz' },
  quizPickSpot: { vi: 'Chọn điểm để thử tài', en: 'Pick a spot to challenge' },
  quizQuestion: { vi: 'Câu hỏi', en: 'Question' },
  quizResult: { vi: 'Kết quả', en: 'Result' },
  quizCorrect: { vi: 'câu đúng', en: 'correct' },
  quizAgain: { vi: 'Chơi lại', en: 'Play again' },
  quizNext: { vi: 'Câu tiếp', en: 'Next' },
  quizNoData: { vi: 'Điểm này chưa có bộ câu hỏi', en: 'No quiz for this spot yet' },
  bestScore: { vi: 'Kỷ lục', en: 'Best' },
  correctMark: { vi: 'Đúng!', en: 'Correct!' },
  wrongMark: { vi: 'Chưa đúng', en: 'Not quite' },
} satisfies Record<string, Localized>;
