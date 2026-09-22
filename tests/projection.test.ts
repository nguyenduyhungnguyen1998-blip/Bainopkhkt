import { describe, it, expect } from 'vitest';
import { project, unproject } from '../src/map/projection';
import { MAP_WIDTH, MAP_HEIGHT } from '../src/map/vietnam-geometry';

describe('phép chiếu bản đồ', () => {
  it('Hà Nội khớp với tọa độ do build-map.mjs sinh (189.8, 253.8)', () => {
    const [x, y] = project(105.85, 21.03);
    expect(x).toBeCloseTo(189.8, 0);
    expect(y).toBeCloseTo(253.8, 0);
  });
  it('project/unproject là nghịch đảo của nhau', () => {
    const [lon, lat] = unproject(...project(108.124, 15.764));
    expect(lon).toBeCloseTo(108.124, 4);
    expect(lat).toBeCloseTo(15.764, 4);
  });
  it('Hoàng Sa và Trường Sa nằm trong khung bản đồ', () => {
    for (const [lon, lat] of [[112, 16.5], [114, 10]]) {
      const [x, y] = project(lon, lat);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(MAP_WIDTH);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(MAP_HEIGHT);
    }
  });
});
