/**
 * Tour hướng dẫn dùng chung cho mọi màn hình. GuidedTour sống ở App (portal trên body)
 * nên đi được xuyên route: phần đầu soi bản đồ quốc gia, phần sau tự mở Văn Miếu –
 * Quốc Tử Giám để soi tính năng bên trong một điểm (phân khu/gallery/nghe/quiz/dấu).
 *
 * Hai kênh kích hoạt:
 *  - goTour(): từ bất kỳ màn nào — set cờ + về #/map; MapScreen nhận cờ/sự kiện,
 *    dọn overlay + bay camera về điểm kế tiếp rồi bắn 'mdv:tour-start' để App mở tour.
 *  - goCard(): thẻ "3 bước nhanh" — cùng cơ chế, mở hint card trên bản đồ.
 */
import type { TourStep } from '../components/Tour';
import { UI } from './i18n';
import { navigate } from './router';
import { getSite } from '../data/content';
import { isSpotUnlocked } from './progress';

export const WELCOME_KEY = 'mdv.welcomed'; // đã trả lời màn chào
export const TOUR_REQ_KEY = 'mdv.tourReq'; // cờ mở tour từ màn khác
export const HINT_REQ_KEY = 'mdv.hintReq'; // cờ mở thẻ 3 bước từ màn khác

const onMapRoute = () => location.hash === '' || location.hash === '#/' || location.hash.startsWith('#/map');

export function goTour(): void {
  try {
    localStorage.setItem(WELCOME_KEY, '1');
    localStorage.setItem(TOUR_REQ_KEY, '1');
  } catch {
    /* bộ nhớ riêng tư */
  }
  if (onMapRoute()) window.dispatchEvent(new CustomEvent('mdv:tour-request'));
  else navigate('map');
}

export function goCard(): void {
  try {
    localStorage.setItem(HINT_REQ_KEY, '1');
  } catch {
    /* bộ nhớ riêng tư */
  }
  if (onMapRoute()) window.dispatchEvent(new CustomEvent('mdv:hint-request'));
  else navigate('map');
}

const toMap = () => {
  if (!onMapRoute()) navigate('map');
};

/** Mặc định mở Quốc Tử Giám: khu làm sâu nhất, đủ phân khu/gallery/nghe/quiz để soi. */
const openDemoSpot = () => {
  const site = getSite('van-mieu');
  if (!site) return;
  const spot = site.spots.find((sp) => !isSpotUnlocked(site.entityId, sp.spotId)) ?? site.spots[0];
  if (spot) navigate(`d/${site.entityId}/${spot.spotId}`);
};

/** 12 bước: 6 soi bản đồ → 5 soi bên trong điểm → 1 lời chốt. */
export const TOUR_STEPS: TourStep[] = [
  { sel: ['.vnode--next', '.vnode'], icon: 'compass', title: UI.tourS1T, body: UI.tourS1B, enter: toMap },
  { sel: '.mscreen__searchbtn', icon: 'search', title: UI.tourS2T, body: UI.tourS2B },
  { sel: '.mscreen__legend', icon: 'flag', title: UI.tourS3T, body: UI.tourS3B },
  { sel: '.mscreen__counter', icon: 'passport', title: UI.tourS4T, body: UI.tourS4B },
  { sel: '.mscreen__zoomctl', icon: 'locate', title: UI.tourS5T, body: UI.tourS5B },
  { sel: '.mdv-dock', icon: 'layers', title: UI.tourS6T, body: UI.tourS6B },
  { sel: '.dest__spots', icon: 'map', title: UI.tourS7T, body: UI.tourS7B, enter: openDemoSpot },
  { sel: ['.dcard--gal', '.dcard--hero'], icon: 'spark', title: UI.tourS8T, body: UI.tourS8B },
  { sel: '.dcard__playbtn', icon: 'volume', title: UI.tourS9T, body: UI.tourS9B },
  { sel: '.dcard__tabs', icon: 'book', title: UI.tourS10T, body: UI.tourS10B },
  { sel: '.dvisit', icon: 'clock', title: UI.tourS11T, body: UI.tourS11B },
  { sel: '.dchain', icon: 'quiz', title: UI.tourS12T, body: UI.tourS12B },
  { icon: 'spark', title: UI.tourEndT, body: UI.tourEndB, kind: 'finale' },
];
