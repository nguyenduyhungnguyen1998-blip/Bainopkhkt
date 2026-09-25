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

// Đồng bộ <html lang> với lựa chọn đã lưu ngay từ lần tải đầu (SR đọc đúng ngôn ngữ).
if (typeof document !== 'undefined') document.documentElement.lang = current;

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
  locked: { vi: 'Chưa ghé thăm', en: 'Not visited' },
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
  backToSite: { vi: 'Về trang khu di sản', en: 'Back to site overview' },
  startScanning: { vi: 'Bắt đầu quét điểm đầu tiên', en: 'Scan your first spot' },
  quizNextSpot: { vi: 'Điểm tiếp theo có thử thách', en: 'Next spot with a quiz' },
  quizAtSpot: { vi: 'Thử tài tại đây', en: 'Quiz yourself here' },
  viewStamp: { vi: 'Xem dấu trong hộ chiếu', en: 'See stamp in passport' },
  stampHint: { vi: 'Quét mã QR tại điểm để nhận dấu', en: 'Scan the QR tag on site to get stamped' },
  nextInSite: { vi: 'Kế tiếp', en: 'Next' },
  siteDoneTitle: { vi: 'Hoàn thành hành trình!', en: 'Journey complete!' },
  siteDoneBody: { vi: 'Bạn đã nhận đủ dấu của khu di sản này', en: 'You collected every stamp in this site' },
  zoomIn: { vi: 'Phóng to', en: 'Zoom in' },
  zoomOut: { vi: 'Thu nhỏ', en: 'Zoom out' },
  zoomControls: { vi: 'Nút thu phóng', en: 'Zoom controls' },
  regionFilter: { vi: 'Lọc vùng', en: 'Filter region' },
  dismiss: { vi: 'Đóng', en: 'Dismiss' },
  skipOnboard: { vi: 'Bỏ qua', en: 'Skip' },
  playbackSpeed: { vi: 'Tốc độ đọc', en: 'Playback speed' },
  audioProgress: { vi: 'Tiến độ nghe', en: 'Listening progress' },
  aspects: { vi: 'Khía cạnh', en: 'Aspects' },
  videoSoon: { vi: 'Đang ghi hình tại hiện trường – bạn nghe thuyết minh trước nhé', en: 'Filming on site – try the audio narration meanwhile' },
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
  search: { vi: 'Tìm kiếm', en: 'Search' },
  searchPlaceholder: { vi: 'Tìm địa danh, tỉnh…', en: 'Search a site or province…' },
  noResults: { vi: 'Không tìm thấy', en: 'No matches' },
  manualCode: { vi: 'Mã in trên tem QR (dự phòng)', en: 'Code printed on the QR tag (backup)' },
  manualCodeUse: { vi: 'Nhận dấu', en: 'Check in' },
  codeInvalid: { vi: 'Mã không đúng', en: 'Invalid code' },
  visitInfo: { vi: 'Thông tin tham quan', en: 'Visitor information' },
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
  modeAudio: { vi: 'Nghe thuyết minh', en: 'Audio narration' },
  modeAudioDesc: { vi: 'Giọng đọc thuyết minh theo từng điểm', en: 'Spoken narration at every stop' },
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
  exportPassport: { vi: 'Sao lưu tiến độ', en: 'Back up progress' },
  importPassport: { vi: 'Khôi phục bản sao', en: 'Restore a backup' },
  importOk: { vi: 'Đã khôi phục tiến độ', en: 'Progress restored' },
  importBad: { vi: 'Tệp không đúng định dạng bản sao', en: 'Not a valid backup file' },
  backupTitle: { vi: 'Sao lưu & chuyển thiết bị', en: 'Backup & transfer' },
  backupDesc: { vi: 'Dùng khi chuyển hành trình sang điện thoại khác.', en: 'Use when moving your journey to another phone.' },
  backupExported: { vi: 'Đã tải bản sao tiến độ', en: 'Backup downloaded' },
  backupPreviewTitle: { vi: 'Xem trước bản sao', en: 'Backup preview' },
  backupMerge: { vi: 'Gộp với hiện tại', en: 'Merge with current' },
  backupReplace: { vi: 'Thay thế tiến độ', en: 'Replace progress' },
  cancel: { vi: 'Hủy', en: 'Cancel' },
  sharePassport: { vi: 'Chia sẻ hành trình', en: 'Share journey' },
  shareCopied: { vi: 'Đã chép nội dung chia sẻ', en: 'Share text copied' },
  quizExplain: { vi: 'Vì sao?', en: 'Why?' },
  quizTrial: { vi: 'Chơi thử – điểm chưa ghé thăm nên không nhận XP', en: 'Practice run – no XP until you visit the spot' },
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
  // Tối ưu UX sâu – khoảnh khắc mở khóa, finale, lỗi, cập nhật
  badgeEarned: { vi: 'Huy hiệu mới', en: 'New badge' },
  finaleTitle: { vi: 'Hoàn thành hành trình!', en: 'Journey complete!' },
  finaleBody: {
    vi: 'Bạn đã mở khóa toàn bộ điểm di sản – hành trình Mở Dấu Việt khép lại trọn vẹn.',
    en: 'You unlocked every heritage spot – the Mo Dau Viet journey is complete.',
  },
  finalePassport: { vi: 'Xem hộ chiếu đầy đủ', en: 'View full passport' },
  errTitle: { vi: 'Có lỗi nhỏ rồi', en: 'Something went wrong' },
  errBody: {
    vi: 'Tiến độ của bạn vẫn an toàn trong máy. Thử tải lại trang nhé.',
    en: 'Your progress is safe on this device. Try reloading the page.',
  },
  errReload: { vi: 'Tải lại trang', en: 'Reload page' },
  errHome: { vi: 'Về bản đồ', en: 'Back to map' },
  updateReady: { vi: 'Có bản cập nhật mới', en: 'New version available' },
  updateNow: { vi: 'Cập nhật', en: 'Update' },
  quizProgress: { vi: 'Tiến độ câu hỏi', en: 'Question progress' },
  quizPraisePerfect: { vi: 'Tràng nguyên! Đỗ đạt toàn bộ!', en: 'Full marks, scholar!' },
  quizPraiseGood: { vi: 'Khá lắm, sĩ tử!', en: 'Well done, scholar!' },
  quizPraiseLow: { vi: 'Cố lên – sĩ tử rèn thêm nhé!', en: 'Keep practicing, scholar!' },
  quizLockedHint: { vi: 'Chơi trước được – điểm chưa mở', en: 'Preview – spot not unlocked' },
} satisfies Record<string, Localized>;
