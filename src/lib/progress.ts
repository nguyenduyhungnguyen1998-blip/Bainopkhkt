/**
 * Tiến độ hành trình (P0: localStorage; P3 chuyển sang IndexedDB kèm schemaVersion).
 * Quy tắc trạng thái node trên bản đồ toàn quốc:
 *  - done   : đã mở hết mọi điểm QR trong khu
 *  - active : đã mở ít nhất một điểm nhưng chưa hết
 *  - next   : khu gợi ý kế tiếp (khu chưa mở đầu tiên theo journeyOrder sau khu đã mở xa nhất)
 *  - locked : chưa đến; vẫn quét QR tại chỗ để mở được (du khách không buộc đi đúng thứ tự)
 */
import { useEffect, useState } from 'preact/hooks';
import { SITES } from '../data/content';
import type { Site } from '../data/types';

export type NodeStatus = 'locked' | 'next' | 'active' | 'done';

export interface Progress {
  schemaVersion: 1;
  /** khóa "siteId/spotId" -> thời điểm mở (ms) */
  unlocked: Record<string, number>;
  xp: number;
  badges: string[];
}

const KEY = 'mdv.progress.v1';
const EMPTY: Progress = { schemaVersion: 1, unlocked: {}, xp: 0, badges: [] };

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Progress;
    if (p.schemaVersion !== 1) return { ...EMPTY };
    return p;
  } catch {
    return { ...EMPTY };
  }
}

let state: Progress = load();
const listeners = new Set<() => void>();

function commit(next: Progress) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
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
  return { alreadyUnlocked: false, gainedXp: gained, newBadge, siteCompleted: completed };
}

export function resetProgress() {
  commit({ ...EMPTY, unlocked: {}, badges: [] });
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
