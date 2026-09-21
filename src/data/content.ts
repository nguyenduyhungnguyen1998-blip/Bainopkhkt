import type { Site, Spot } from './types';

// Vite gom toàn bộ JSON nội dung vào bundle -> dùng offline được ngay từ lần tải đầu.
const modules = import.meta.glob<{ default: Site }>('./sites/*.json', { eager: true });

export const SITES: Site[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.journeyOrder - b.journeyOrder);

const byId = new Map(SITES.map((s) => [s.entityId, s]));

export function getSite(id: string): Site | undefined {
  return byId.get(id);
}

export function getSpot(siteId: string, spotId?: string): { site: Site; spot: Spot } | undefined {
  const site = byId.get(siteId);
  if (!site) return undefined;
  const spot = spotId ? site.spots.find((s) => s.spotId === spotId) : site.spots[0];
  return spot ? { site, spot } : undefined;
}

export const TOTAL_SPOTS = SITES.reduce((n, s) => n + s.spots.length, 0);
