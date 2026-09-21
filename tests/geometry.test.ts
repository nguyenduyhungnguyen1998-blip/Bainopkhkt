import { describe, it, expect } from 'vitest';
import { smoothPath, bboxOf, fitBox, clampTransform } from '../src/map/geometry-utils';
import { buildNodes } from '../src/map/VietnamMap';
import { SITES } from '../src/data/content';

describe('hình học bản đồ', () => {
  it('smoothPath đi qua đúng các điểm đầu/cuối', () => {
    const d = smoothPath([[0, 0], [10, 10], [20, 0]]);
    expect(d.startsWith('M0.0,0.0')).toBe(true);
    expect(d.endsWith('20.0,0.0')).toBe(true);
    expect(d.match(/C/g)?.length).toBe(2);
  });
  it('fitBox không vượt maxK và căn giữa', () => {
    const t = fitBox({ x: 100, y: 100, w: 100, h: 100 }, 720, 1000, 3);
    expect(t.k).toBe(3);
    expect(t.tx + 150 * t.k).toBeCloseTo(360);
    expect(t.ty + 150 * t.k).toBeCloseTo(500);
  });
  it('clampTransform giới hạn zoom', () => {
    expect(clampTransform({ k: 99, tx: 0, ty: 0 }, 720, 1000, 1, 6).k).toBe(6);
    expect(clampTransform({ k: 0.1, tx: 0, ty: 0 }, 720, 1000, 1, 6).k).toBe(1);
  });
  it('node hành trình: 5 khu sắp Bắc -> Nam (y tăng dần) và nằm trong khung', () => {
    const nodes = buildNodes(new Map(), new Map());
    expect(nodes.length).toBe(SITES.length);
    for (let i = 1; i < nodes.length; i++) expect(nodes[i].y).toBeGreaterThan(nodes[i - 1].y);
    const box = bboxOf(nodes.map((n) => [n.x, n.y]));
    expect(box.x).toBeGreaterThan(0);
    expect(box.x + box.w).toBeLessThan(720);
  });
  it('Văn Miếu đẩy nhãn sang trái vì Hạ Long sát bên phải', () => {
    const nodes = buildNodes(new Map(), new Map());
    expect(nodes.find((n) => n.site.entityId === 'van-mieu')?.labelSide).toBe('left');
    expect(nodes.find((n) => n.site.entityId === 'ha-long')?.labelSide).toBe('right');
  });
});
