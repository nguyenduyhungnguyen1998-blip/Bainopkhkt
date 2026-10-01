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
  gotStamp: { vi: 'Đã nhận dấu', en: 'Stamp collected' },
  totalXp: { vi: 'Tổng', en: 'Total' },
  readScript: { vi: 'Đọc bản thuyết minh đầy đủ', en: 'Read the full narration script' },
  recordedNarration: { vi: 'Bản thu sẵn — giọng đọc thật, thuyết minh đầy đủ', en: 'Recorded narration — real voice, full tour' },
  audioFileError: { vi: 'Không tải được bản thu — thường do mạng chập chờn', en: 'Could not load the recording — usually a network issue' },
  retry: { vi: 'Thử lại', en: 'Retry' },
  useAutoVoice: { vi: 'Dùng giọng đọc tự động', en: 'Use auto voice' },
  verifyingCode: { vi: 'Đang kiểm tra mã…', en: 'Verifying code…' },
  alreadyStamped: { vi: 'Bạn đã nhận dấu điểm này rồi — không cộng XP lần nữa', en: 'Already stamped — no XP twice' },
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
  confirmUnlock: { vi: 'Nhận dấu & xem tổng quan', en: 'Stamp & view overview' },
  unlockedDone: { vi: 'Điểm này đã có dấu', en: 'Stamp already collected' },
  chooseLangShort: { vi: 'Ngôn ngữ', en: 'Language' },
  exploreWhat: { vi: 'Bạn muốn khám phá gì?', en: 'What do you want to explore?' },
  exploreSpot: { vi: 'Vào trang điểm', en: 'Open the spot page' },
  exportPassport: { vi: 'Tải thẻ hộ chiếu', en: 'Download passport card' },
  importPassport: { vi: 'Khôi phục bản sao', en: 'Restore a backup' },
  importOk: { vi: 'Đã khôi phục tiến độ', en: 'Progress restored' },
  importBad: { vi: 'Tệp không đúng định dạng bản sao', en: 'Not a valid backup file' },
  backupTitle: { vi: 'Sao lưu & chuyển thiết bị', en: 'Backup & transfer' },
  backupDesc: { vi: 'Thẻ hộ chiếu .html đẹp — mở xem được ngay, in/chia sẻ được, đổi máy thì nhập lại file này.', en: 'A pretty .html passport card — open it anywhere, print or share it, and import it back to move phones.' },
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
  locateMe: { vi: 'Vị trí của tôi', en: 'My location' },
  locating: { vi: 'Đang định vị…', en: 'Locating…' },
  locDenied: { vi: 'Không lấy được vị trí – hãy bật GPS', en: 'Location unavailable – enable GPS' },
  locOutside: { vi: 'Bạn đang ngoài vùng bản đồ di sản', en: 'You are outside the heritage map area' },
  youAreHere: { vi: 'Bạn đang ở đây', en: 'You are here' },
  // Hướng dẫn người mới + cài đặt nâng cao + màn phụ
  howto: { vi: 'Cách sử dụng', en: 'How to use' },
  howtoStep1: { vi: 'Chạm một điểm sáng trên bản đồ để chọn di tích', en: 'Tap a glowing dot on the map to pick a site' },
  howtoStep2: { vi: 'Tại điểm, quét mã QR trên tem (hoặc nhập mã in dưới tem)', en: 'At the spot, scan the tag QR (or type the code under it)' },
  howtoStep3: { vi: 'Chọn chủ đề muốn khám phá — nhận dấu + XP ngay, xem trong hộ chiếu', en: 'Pick a topic — stamp + XP saved instantly, see it in your passport' },
  gotIt: { vi: 'Đã hiểu', en: 'Got it' },
  fontSize: { vi: 'Cỡ chữ', en: 'Text size' },
  flatLevel: { vi: 'Nền dễ đọc — giảm ảnh mờ sau nội dung', en: 'Easier-to-read background — fade the photo behind content' },
  lvCompact: { vi: 'Nhỏ gọn', en: 'Compact' },
  lvStandard: { vi: 'Vừa đọc', en: 'Standard' },
  lvLarge: { vi: 'Lớn', en: 'Large' },
  lvXLarge: { vi: 'Rất lớn', en: 'Extra large' },
  lvAmbient: { vi: 'Giữ nền mờ', en: 'Keep ambience' },
  lvSubtle: { vi: 'Nhẹ', en: 'Subtle' },
  lvMedium: { vi: 'Vừa', en: 'Medium' },
  lvSolid: { vi: 'Nền đơn sắc', en: 'Solid' },
  groupDisplay: { vi: 'Hiển thị & nghe', en: 'Display & sound' },
  groupJourney: { vi: 'Hành trình & dữ liệu', en: 'Journey & data' },
  groupHelp: { vi: 'Trợ giúp & thông tin', en: 'Help & info' },
  storedLocally: {
    vi: 'Hành trình được lưu trên thiết bị này — dùng Sao lưu để chuyển máy.',
    en: 'Journey is stored on this device — use Backup to move phones.',
  },
  help: { vi: 'Trợ giúp', en: 'Help' },
  about: { vi: 'Về Mở Dấu Việt', en: 'About Mở Dấu Việt' },
  sourcesTitle: { vi: 'Nguồn tư liệu & hình ảnh', en: 'Media & content sources' },
  scanOkHint: {
    vi: 'Chọn điều muốn khám phá — mỗi lựa chọn đều nhận dấu luôn',
    en: 'Pick what to explore — every choice collects your stamp',
  },
  photoSources: { vi: 'Nguồn hình ảnh', en: 'Photo credits' },
  contentSources: { vi: 'Tư liệu nội dung', en: 'Content sources' },
  licenseLbl: { vi: 'Giấy phép', en: 'License' },
  viewSource: { vi: 'Xem nguồn gốc', en: 'View source' },
  crossChecking: { vi: 'đang đối chiếu', en: 'cross-checking' },
  photoCreditAria: { vi: 'Nguồn ảnh', en: 'Photo credit' },
  welcomeTitle: { vi: 'Chào mừng đến với Mở Dấu Việt', en: 'Welcome to Mở Dấu Việt' },
  welcomeAsk: { vi: 'Bạn đã biết cách sử dụng chưa?', en: 'Do you already know your way around?' },
  welcomeYes: { vi: 'Đã biết — vào khám phá ngay', en: 'I do — take me in' },
  welcomeNo: { vi: 'Chưa — xem hướng dẫn', en: 'Not yet — show me around' },
  welcomeFoot: { vi: 'Mở lại bất cứ lúc nào bằng nút ? trên bản đồ', en: 'Reopen anytime via the ? button on the map' },
  helpMenuTitle: { vi: 'Bạn cần giúp gì?', en: 'How can we help?' },
  helpMenuTour: { vi: 'Tour khám phá chi tiết', en: 'Full guided tour' },
  helpMenuTourSub: { vi: 'Soi từng nút trên bản đồ rồi vào trong điểm, ~2 phút', en: 'Every map button then inside a spot, ~2 minutes' },
  helpMenuCard: { vi: 'Hướng dẫn nhanh 3 bước', en: 'Quick 3-step guide' },
  helpMenuHelp: { vi: 'Trợ giúp đầy đủ & câu hỏi thường gặp', en: 'Full help & FAQ' },
  helpMenuTourPassport: { vi: 'Tour màn Hộ chiếu', en: 'Tour this Passport screen' },
  helpMenuTourPassportSub: { vi: 'Soi vòng tiến độ, huy hiệu & cách chia sẻ', en: 'Progress ring, badges & sharing' },
  helpMenuTourQuiz: { vi: 'Tour màn Thử tài', en: 'Tour this Quiz screen' },
  helpMenuTourQuizSub: { vi: 'Cách chọn bộ câu hỏi & kiếm XP', en: 'Pick a quiz set & earn XP' },
  helpMenuTourDest: { vi: 'Tour trang điểm này', en: 'Tour this spot page' },
  helpMenuTourDestSub: { vi: 'Nghe, xem ảnh & nhận dấu — không rời trang', en: 'Listen, photos & stamping — stays on this page' },
  tourDeepLink: { vi: 'Xem tour chi tiết', en: 'Full guided tour' },
  latestStamp: { vi: 'Dấu mới nhất', en: 'Latest stamp' },
  nextGoal: { vi: 'Mục tiêu kế tiếp', en: 'Next goal' },
  badgesShowAll: { vi: 'Xem tất cả danh hiệu', en: 'Show all badges' },
  badgesHide: { vi: 'Thu gọn', en: 'Collapse' },
  visitNote: { vi: 'Giờ mở cửa & giá vé mang tính tham khảo — kiểm tra lại trước khi đi · Cập nhật 9/2026', en: 'Hours & prices are for reference — check before you go · Updated 9/2026' },
  tourStep: { vi: 'Bước', en: 'Step' },
  tourNext: { vi: 'Tiếp theo', en: 'Next' },
  tourBack: { vi: 'Quay lại', en: 'Back' },
  tourSkip: { vi: 'Bỏ qua tour', en: 'Skip tour' },
  tourGo: { vi: 'Bắt đầu khám phá', en: 'Start exploring' },
  tourWatch: { vi: 'Xem tour hướng dẫn', en: 'Watch the guided tour' },
  tourS1T: { vi: 'Điểm sáng trên bản đồ', en: 'Glowing dots on the map' },
  tourS1B: { vi: 'Mỗi điểm là một địa danh di sản thật. Chạm để xem câu chuyện, hình ảnh — và cách nhận dấu tại đây.', en: 'Each dot is a real heritage place. Tap it for stories, photos — and how to collect its stamp.' },
  tourS2T: { vi: 'Tìm kiếm & nhập mã', en: 'Search & manual code' },
  tourS2B: { vi: 'Tìm địa danh theo tên. Camera khó quét? Nhập 16 ký tự in dưới tem QR — mất mạng vẫn mở được dấu.', en: 'Find sites by name. Camera struggling? Type the 16-letter code under the QR tag — works offline too.' },
  tourS3T: { vi: 'Màu sắc nói trạng thái', en: 'Colors tell status' },
  tourS3B: { vi: 'Xám là chưa ghé · Vàng là điểm kế tiếp của bạn · Ngọc là đã nhận dấu.', en: 'Grey means unvisited · Yellow is your next stop · Teal means the stamp is yours.' },
  tourS4T: { vi: 'Hành trình của bạn', en: 'Your journey so far' },
  tourS4B: { vi: 'Số điểm đã ghé hiện ngay đây — đủ 10 điểm là trọn bộ hộ chiếu di sản.', en: 'Your visited count lives here — collect all 10 stamps to complete the passport.' },
  tourS5T: { vi: 'Zoom & định vị', en: 'Zoom & locate' },
  tourS5B: { vi: 'Chạm kéo, cuộn hay bấm +/− để phóng to. Nút la bàn đưa bản đồ về đúng vị trí của bạn.', en: 'Drag, scroll or tap +/− to zoom. The compass button flies the map to where you are.' },
  tourS6T: { vi: 'Thanh công cụ', en: 'Your toolbox' },
  tourS6B: { vi: 'Hộ chiếu giữ dấu & XP · Thử tài mở quiz vui · Cài đặt đổi ngôn ngữ, cỡ chữ và sao lưu hành trình.', en: 'Passport keeps stamps & XP · Quiz tests your knowledge · Settings changes language, text size and backups.' },
  tourS7T: { vi: 'Một khu, nhiều phân khu', en: 'One site, many sub-areas' },
  tourS7B: { vi: 'Vào trong rồi nhé! Hàng này là các phân khu thật của di tích — chạm để đổi điểm, dấu đã nhận sáng lên.', en: 'We are inside now! This row is the site\'s real sub-areas — tap to switch, collected stamps light up.' },
  tourS8T: { vi: 'Ảnh thật, vuốt xem thoải mái', en: 'Real photos, swipe freely' },
  tourS8B: { vi: 'Bấm ‹ › hoặc vuốt trái/phải để xem thêm ảnh. Nền phía sau tự đổi theo ảnh bạn đang xem — cứ đắm mình vào.', en: 'Tap ‹ › or swipe to see more photos. The soft backdrop follows the photo you are viewing — just sink in.' },
  tourS9T: { vi: 'Nghe kể chuyện', en: 'Listen to the story' },
  tourS9B: { vi: 'Bấm Nghe để nghe thuyết minh đọc bằng giọng nói — có tạm dừng và chỉnh tốc độ; đứng tại di tích nghe rất đã.', en: 'Tap Play for spoken narration — with pause and speed control; wonderful while standing at the site.' },
  tourS10T: { vi: 'Đào sâu từng khía cạnh', en: 'Dig into each facet' },
  tourS10B: { vi: 'Tab phía trên chia câu chuyện thành từng khía cạnh — nguồn gốc, kiến trúc, chuyện xưa — có cả video ở nhiều điểm.', en: 'The tabs above split the story into facets — origins, architecture, old tales — many with videos.' },
  tourS11T: { vi: 'Thông tin tham quan thật', en: 'Real visit info' },
  tourS11B: { vi: 'Địa chỉ, giờ mở cửa, vé — những thứ bạn cần hỏi khi thực sự đứng trước cổng di tích.', en: 'Address, opening hours, tickets — the things you actually ask when standing at the gate.' },
  tourS12T: { vi: 'Thử tài & nhận dấu', en: 'Quiz & collect the stamp' },
  tourS12B: { vi: 'Trả lời vài câu quiz vui để kiếm thêm XP — và nhớ quét mã QR tại điểm để nhận dấu vào hộ chiếu nhé.', en: 'Answer a fun quiz for extra XP — and remember to scan the QR on-site to stamp your passport.' },
  tourEndT: { vi: 'Xong rồi!', en: 'All set!' },
  tourEndB: { vi: 'Chạm điểm vàng đang sáng trên bản đồ để bắt đầu — chuyến ghé thăm đầu tiên chỉ mất khoảng 30 giây.', en: 'Tap the glowing yellow dot to begin — your first visit takes about 30 seconds.' },
  // — Tour riêng màn Hộ chiếu —
  tourPP1T: { vi: 'Vòng hành trình', en: 'Journey ring' },
  tourPP1B: { vi: 'Phần trăm di sản bạn đã mở — cứ nhận đủ dấu ở các điểm là vòng sẽ đầy dần lên.', en: 'How much of the journey you have unlocked — collect stamps and the ring fills up.' },
  tourPP2T: { vi: 'Khoe hành trình', en: 'Share your journey' },
  tourPP2B: { vi: 'Chia sẻ số dấu và XP của bạn cho bạn bè qua tin nhắn hay mạng xã hội.', en: 'Share your stamps and XP with friends via messages or social media.' },
  tourPP3T: { vi: '12 danh hiệu', en: '12 badges' },
  tourPP3B: { vi: 'Mỗi danh hiệu là một cột mốc: đủ dấu một khu, đi xa hơn, làm quiz giỏi… Bấm giữ để xem điều kiện mở.', en: 'Each badge marks a milestone: finish a region, travel further, ace quizzes… Long-press to see how to earn it.' },
  tourPP4T: { vi: 'Tiến độ từng khu', en: 'Progress per region' },
  tourPP4B: { vi: 'Mỗi đoạn sáng là một dấu đã nhận. Chạm vào một khu để mở lại trang điểm đến của nó.', en: 'Each lit segment is a collected stamp. Tap a region to reopen its destination page.' },
  // — Tour riêng màn Thử tài —
  tourQ1T: { vi: 'Chọn khu để thử tài', en: 'Pick a region' },
  tourQ1B: { vi: 'Mỗi khu di sản có bộ câu hỏi riêng về đúng địa danh đó — chọn nơi bạn muốn thử.', en: 'Each heritage site has its own quiz about that exact place — pick where to test yourself.' },
  tourQ2T: { vi: 'Một hàng = một bộ câu hỏi', en: 'One row = one quiz set' },
  tourQ2B: { vi: 'Bộ nào có ổ khóa thì quét mã tại điểm để mở. Điểm cao nhất được lưu lại — đúng hết một bộ sẽ nhận danh hiệu Trạng nguyên.', en: 'Locked sets open by scanning the QR on-site. Your best score is saved — a perfect run earns the Trạng Nguyên badge.' },
  // — Tour riêng trang điểm đến (nút ? khi đang ở trong một điểm) —
  tourD1T: { vi: 'Ảnh thật của điểm này', en: 'Real photos of this spot' },
  tourD1B: { vi: 'Bấm ‹ › hoặc vuốt để xem thêm ảnh — nền phía sau tự đổi theo ảnh bạn đang xem.', en: 'Tap ‹ › or swipe for more photos — the backdrop follows the photo you are viewing.' },
  tourD2T: { vi: 'Nghe thuyết minh', en: 'Hear the narration' },
  tourD2B: { vi: 'Bấm Nghe để nghe câu chuyện của đúng điểm này — có tạm dừng, tốc độ, và bản chữ đọc được khi máy không có giọng.', en: 'Tap Play for this spot\'s story — with pause, speed, and a readable transcript when speech is unavailable.' },
  tourD3T: { vi: 'Khía cạnh câu chuyện', en: 'Story facets' },
  tourD3B: { vi: 'Các tab chia nội dung thành từng khía cạnh — nguồn gốc, kiến trúc, ý nghĩa — nhiều tab có cả video.', en: 'Tabs split the story into facets — origins, architecture, meaning — some include videos.' },
  tourD4T: { vi: 'Thông tin tham quan', en: 'Visit information' },
  tourD4B: { vi: 'Địa chỉ, giờ mở cửa, vé — tham khảo trước khi đi; phía dưới còn quiz và dẫn sang điểm kế tiếp.', en: 'Address, hours, tickets — check before you go; below are the quiz and the next spot.' },
} satisfies Record<string, Localized>;
