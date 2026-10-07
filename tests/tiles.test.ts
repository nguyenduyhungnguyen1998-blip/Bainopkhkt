import { describe, expect, it } from 'vitest';
import { TILE_PROVIDERS, lonLatToTile } from '../src/map/tiles';

describe('lonLatToTile', () => {
  it('gốc tọa độ ở tâm lưới', () => {
    expect(lonLatToTile(0, 0, 1)).toEqual({ x: 1, y: 1 });
  });
  it('Văn Miếu ở zoom 16 rơi đúng ô OSM', () => {
    const { x, y } = lonLatToTile(105.8356, 21.0277, 16);
    expect(Math.floor(x)).toBe(52034);
    expect(Math.floor(y)).toBe(28851);
  });
  it('có ít nhất 2 nguồn ô bản đồ để dự phòng', () => {
    expect(TILE_PROVIDERS.length).toBeGreaterThanOrEqual(2);
    expect(TILE_PROVIDERS[0].url(16, 1, 2)).toContain('/16/1/2');
  });
});
