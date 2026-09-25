/**
 * Tiến độ hành trình (P3: IndexedDB 'mdv' qua lib/db, localStorage giữ làm bản mirror/dự phòng).
 * Khởi tạo bất đồng bộ bằng initProgress() trước khi render app; sau đó mọi đọc là đồng bộ.
 * Quy tắc trạng thái node trên bản đồ toàn quốc:
 *  - done   : đã mở hết mọi điểm QR trong khu
 *  - active : đã mở ít nhất một điểm nhưng chưa hết
 *  - next   : khu gợi ý kế tiếp (khu chưa mở đầu tiên theo journeyOrder sau khu đã mở xa nhất)
 *  - locked : chưa đến; vẫn quét QR tại chỗ để mở được (du khách không buộc đi đúng thứ tự)
 */
import { useEffect, useState } from 'preact/hooks';
import { SITES } from '../data/content';
import type { Site } from '../data/types';
import { idbGet, idbSet } from './db';

export type NodeStatus = 'locked' | 'next' | 'active' | 'done';

export interface Progress {
  schemaVersion: 2;
  /** khóa "siteId/spotId" -> thời điểm mở (ms) */
  unlocked: Record<string, number>;
  /** khóa "siteId/spotId" -> số câu đúng cao nhất ở quiz điểm đó */
  quizDone: Record<string, number>;
  xp: number;
  badges: string[];
}

const LS_KEY = 'mdv.progress.v1';
const IDB_KEY = 'progress';
const EMPTY: Progress = { schemaVersion: 2, unlocked: {}, quizDone: {}, xp: 0, badges: [] };

/** Chấp nhận bản v1 (localStorage cũ, thiếu quizDone) lẫn v2. Trả null nếu không hợp lệ. */
function migrate(raw: unknown): Progress | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as { schemaVersion?: number } & Omit<Partial<Progress>, 'schemaVersion'>;
  if (p.schemaVersion !== 1 && p.schemaVersion !== 2) return null;
  if (!p.unlocked || typeof p.unlocked !== 'object') return null;
  return {
    schemaVersion: 2,
    unlocked: p.unlocked,
    quizDone: p.quizDone && typeof p.quizDone === 'object' ? p.quizDone : {},
    xp: typeof p.xp === 'number' ? p.xp : 0,
    badges: Array.isArray(p.badges) ? p.badges : [],
  };
}

function loadLocal(): Progress {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return migrate(raw ? JSON.parse(raw) : null) ?? { ...EMPTY, unlocked: {}, quizDone: {}, badges: [] };
  } catch {
    return { ...EMPTY, unlocked: {}, quizDone: {}, badges: [] };
  }
}

let state: Progress = loadLocal();
const listeners = new Set<() => void>();

function commit(next: Progress) {
  state = next;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* bộ nhớ riêng tư */
  }
  void idbSet(IDB_KEY, next);
  listeners.forEach((l) => l());
}

/**
 * Hydrate từ IndexedDB trước khi render. Nguồn ưu tiên: IDB (chuẩn P3) > localStorage (legacy/mirror).
 * Nếu chỉ có localStorage, ghi ngược lên IDB để lần sau đọc thẳng từ IDB.
 */
export async function initProgress(): Promise<void> {
  try {
    const fromIdb = migrate(await idbGet(IDB_KEY));
    if (fromIdb) {
      if (JSON.stringify(fromIdb) !== JSON.stringify(state)) {
        state = fromIdb;
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(fromIdb));
        } catch {
          /* bộ nhớ riêng tư */
        }
        listeners.forEach((l) => l());
      }
      return;
    }
    // Chỉ có localStorage (legacy v1 hoặc mirror): đẩy lên IDB.
    if (Object.keys(state.unlocked).length || state.xp || state.badges.length) void idbSet(IDB_KEY, state);
  } catch {
    /* IDB lỗi -> tiếp tục với localStorage */
  }
}

export function getProgress(): Progress {
  return state;
}

export function isSpotUnlocked(siteId: string, spotId: string): boolean {
  return `${siteId}/${spotId}` in state.unlocked;
}

export interface UnlockResult {
  alreadyUnlocked: boolean;
  gainedXp: number;
  newBadge?: Site['gamificationConfig']['badge'];
  siteCompleted: boolean;
}

/** Mở khóa một điểm (sau khi xác thực QR – P3). Trả về phần thưởng để UI hiển thị. */
export function unlockSpot(siteId: string, spotId: string): UnlockResult {
  const site = SITES.find((s) => s.entityId === siteId);
  const spot = site?.spots.find((s) => s.spotId === spotId);
  if (!site || !spot) return { alreadyUnlocked: false, gainedXp: 0, siteCompleted: false };
  const key = `${siteId}/${spotId}`;
  if (key in state.unlocked) return { alreadyUnlocked: true, gainedXp: 0, siteCompleted: false };

  const unlocked = { ...state.unlocked, [key]: Date.now() };
  let gained = spot.xp;
  const badges = [...state.badges];
  const completed = site.spots.every((s) => `${siteId}/${s.spotId}` in unlocked);
  let newBadge: UnlockResult['newBadge'];
  if (completed && !badges.includes(site.gamificationConfig.badge.id)) {
    badges.push(site.gamificationConfig.badge.id);
    gained += site.gamificationConfig.completionBonusXp;
    newBadge = site.gamificationConfig.badge;
  }
  commit({ ...state, unlocked, xp: state.xp + gained, badges });
  const result: UnlockResult = { alreadyUnlocked: false, gainedXp: gained, newBadge, siteCompleted: completed };
  // Chuỗi ăn mừng (sóng lan, vẽ đường, toast) lắng nghe sự kiện này — phát ra dù mở từ QR, HUD hay demo.
  window.dispatchEvent(new CustomEvent<UnlockResult & { siteId: string; spotId: string }>('mdv:unlock', { detail: { ...result, siteId, spotId } }));
  return result;
}

/** Công cụ demo (#/admin): cộng XP trực tiếp để dựng kịch bản trình diễn. */
export function grantXp(amount: number): void {
  if (!Number.isFinite(amount) || amount === 0) return;
  commit({ ...state, xp: Math.max(0, state.xp + amount) });
}

/** Công cụ demo (#/admin): gỡ dấu một điểm để diễn lại check-in (giữ XP/huy hiệu đã nhận). */
export function relockSpot(siteId: string, spotId: string): void {
  const key = `${siteId}/${spotId}`;
  if (!(key in state.unlocked)) return;
  const unlocked = { ...state.unlocked };
  delete unlocked[key];
  commit({ ...state, unlocked });
}

/** Công cụ demo: gỡ dấu mọi điểm (giữ XP/huy hiệu/điểm quiz) — dựng lại hành trình từ đầu. */
export function relockAll(): void {
  commit({ ...state, unlocked: {} });
}

/** Công cụ demo: xóa mọi điểm quiz (giữ dấu + XP) — để giám khảo chơi lại và thấy XP thưởng thật. */
export function clearQuizResults(): void {
  commit({ ...state, quizDone: {} });
}

export const QUIZ_XP_PER_CORRECT = 5;

/**
 * Ghi điểm quiz một điểm. XP thưởng chỉ tính phần vượt best cũ (làm lại vẫn được chơi
 * nhưng không farm XP); trả về số XP thực nhận.
 */
export function recordQuizResult(siteId: string, spotId: string, correct: number, total: number): number {
  const key = `${siteId}/${spotId}`;
  const prev = state.quizDone[key] ?? 0;
  const gained = Math.max(0, correct - Math.min(prev, total)) * QUIZ_XP_PER_CORRECT;
  const quizDone = correct > prev ? { ...state.quizDone, [key]: correct } : state.quizDone;
  commit({ ...state, quizDone, xp: state.xp + gained });
  return gained;
}

export function quizBest(siteId: string, spotId: string): number | undefined {
  return state.quizDone[`${siteId}/${spotId}`];
}

export function resetProgress() {
  // Reset hành trình -> cho phép finale 9/9 và finale cấp khu xuất hiện lại ở hành trình mới.
  try {
    localStorage.removeItem('mdv.finale.v1');
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('mdv.sitefin.')) localStorage.removeItem(k);
    }
  } catch {
    /* bộ nhớ riêng tư */
  }
  commit({ ...EMPTY, unlocked: {}, quizDone: {}, badges: [] });
}

export function siteUnlockedCount(site: Site, p: Progress = state): number {
  return site.spots.filter((s) => `${site.entityId}/${s.spotId}` in p.unlocked).length;
}

/** Tính trạng thái cho toàn bộ khu theo thứ tự hành trình. */
export function computeStatuses(p: Progress = state): Map<string, NodeStatus> {
  const out = new Map<string, NodeStatus>();
  let lastTouched = -1;
  SITES.forEach((site, i) => {
    const n = siteUnlockedCount(site, p);
    if (n === 0) out.set(site.entityId, 'locked');
    else {
      out.set(site.entityId, n === site.spots.length ? 'done' : 'active');
      lastTouched = i;
    }
  });
  // Khu gợi ý kế tiếp: khu "locked" đầu tiên sau khu đã chạm xa nhất; nếu không còn thì khu locked đầu tiên bất kỳ.
  const after = SITES.slice(lastTouched + 1).find((s) => out.get(s.entityId) === 'locked');
  const anyLocked = after ?? SITES.find((s) => out.get(s.entityId) === 'locked');
  if (anyLocked) out.set(anyLocked.entityId, 'next');
  return out;
}

/** Xuất hộ chiếu: toàn bộ trạng thái khôi phục được, kèm meta để người xem biết nguồn. */
export function exportPassportJson(): string {
  return JSON.stringify(
    { app: 'mo-dau-viet', kind: 'passport', exportedAt: new Date().toISOString(), progress: state },
    null,
    2
  );
}

/** Nhập hộ chiếu: chỉ chấp nhận đúng kind + schemaVersion hỗ trợ. Trả false nếu file lạ. */
export function importPassportJson(json: string): boolean {
  try {
    const raw = JSON.parse(json) as { kind?: string; progress?: unknown };
    if (raw?.kind !== 'passport') return false;
    const p = migrate(raw.progress);
    if (!p) return false;
    commit(p);
    return true;
  } catch {
    return false;
  }
}

/** Đọc file sao lưu mà không ghi đè – trả tóm tắt để hiện bản xem trước trước khi xác nhận. */
export function previewPassportJson(json: string): { progress: Progress; spots: number; xp: number; exportedAt: string | null } | null {
  try {
    const raw = JSON.parse(json) as { kind?: string; progress?: unknown; exportedAt?: string };
    if (raw?.kind !== 'passport') return null;
    const p = migrate(raw.progress);
    if (!p) return null;
    return { progress: p, spots: Object.keys(p.unlocked).length, xp: p.xp, exportedAt: raw.exportedAt ?? null };
  } catch {
    return null;
  }
}

/**
 * Áp bản sao đã xem trước: 'replace' ghi đè toàn bộ;
 * 'merge' hợp nhất điểm đã mở + lấy điểm quiz cao hơn + XP lấy mức lớn hơn + hợp nhất huy hiệu.
 */
export function applyPassportImport(p: Progress, mode: 'merge' | 'replace'): void {
  if (mode === 'replace') {
    commit(p);
    return;
  }
  const unlocked = { ...p.unlocked, ...state.unlocked };
  const quizDone: Record<string, number> = { ...p.quizDone };
  for (const [k, v] of Object.entries(state.quizDone)) quizDone[k] = Math.max(v, quizDone[k] ?? 0);
  commit({ ...p, unlocked, quizDone, badges: Array.from(new Set([...state.badges, ...p.badges])), xp: Math.max(p.xp, state.xp) });
}

export interface Achievement {
  id: string;
  icon: string;
  name: { vi: string; en: string };
  /** Điều kiện đạt – hiển thị dưới tên để user biết cần làm gì. */
  need: { vi: string; en: string };
  unlocked: boolean;
}

/** Huy hiệu thành tích độc lập với huy hiệu từng khu (demo P3 mở rộng thêm). */
export function computeAchievements(p: Progress = state): Achievement[] {
  const touchedSites = SITES.filter((s) => siteUnlockedCount(s, p) > 0).length;
  const doneSites = SITES.filter((s) => siteUnlockedCount(s, p) === s.spots.length).length;
  const answered = Object.keys(p.quizDone).length;
  return [
    {
      id: 'khoi-hanh',
      icon: 'flag',
      name: { vi: 'Khởi hành', en: 'First steps' },
      need: { vi: 'Quét mã QR đầu tiên', en: 'Scan your first QR' },
      unlocked: Object.keys(p.unlocked).length >= 1,
    },
    {
      id: 'tham-hiem',
      icon: 'compass',
      name: { vi: 'Thám hiểm', en: 'Explorer' },
      need: { vi: 'Chạm vào 3 khu di sản', en: 'Unlock spots in 3 sites' },
      unlocked: touchedSites >= 3,
    },
    {
      id: 'si-tu',
      icon: 'award',
      name: { vi: 'Sĩ tử', en: 'Challenger' },
      need: { vi: 'Trả lời 3 bộ câu hỏi', en: 'Finish 3 quizzes' },
      unlocked: answered >= 3,
    },
    {
      id: 'hoc-gia',
      icon: 'book',
      name: { vi: 'Học giả', en: 'Scholar' },
      need: { vi: 'Hoàn thành cả 5 khu', en: 'Complete all 5 sites' },
      unlocked: doneSites === SITES.length,
    },
  ];
}

export function useProgress(): Progress {
  const [p, set] = useState(state);
  useEffect(() => {
    const l = () => set(state);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return p;
}
