import { describe, it, expect } from 'vitest';
import { parseHash } from '../src/lib/router';

describe('hash router', () => {
  it('mặc định về bản đồ', () => {
    expect(parseHash('')).toEqual({ name: 'map' });
    expect(parseHash('#/')).toEqual({ name: 'map' });
  });
  it('deep link điểm đến từ QR kèm query', () => {
    const r = parseHash('#/d/van-mieu/khue-van-cac?s=abc');
    expect(r.name).toBe('destination');
    if (r.name === 'destination') {
      expect(r.siteId).toBe('van-mieu');
      expect(r.spotId).toBe('khue-van-cac');
      expect(r.query.get('s')).toBe('abc');
    }
  });
  it('đường lạ -> notfound', () => {
    expect(parseHash('#/abc').name).toBe('notfound');
    expect(parseHash('#/d').name).toBe('notfound');
  });
});
