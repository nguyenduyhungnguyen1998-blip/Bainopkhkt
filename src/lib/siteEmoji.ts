/** Emoji nhận diện theo khu — chỉ dùng trang trí (thẻ hộ chiếu, danh sách, tiêu đề). */
import type { Site } from '../data/types';

const SITE_EMOJI: Record<string, string> = {
  'van-mieu': '🏛️',
  'ha-long': '🐉',
  'hue': '🏯',
  'my-son': '🛕',
  'dinh-doc-lap': '🏢',
};

export function siteEmoji(site: Pick<Site, 'entityId'> | string): string {
  const id = typeof site === 'string' ? site : site.entityId;
  return SITE_EMOJI[id] ?? '📍';
}
