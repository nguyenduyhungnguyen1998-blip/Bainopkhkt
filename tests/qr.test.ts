import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { signSpot, verifySignature, QR_SECRET } from '../src/lib/qr';
import { SITES } from '../src/data/content';

describe('chữ ký QR HMAC', () => {
  it('khớp với script Node dùng in tem QR', async () => {
    for (const site of SITES) {
      for (const spot of site.spots) {
        const expectSig = createHmac('sha256', QR_SECRET).update(`${site.entityId}/${spot.spotId}`).digest('hex').slice(0, 16);
        expect(await signSpot(site.entityId, spot.spotId)).toBe(expectSig);
      }
    }
  });
  it('xác thực đúng, từ chối chữ ký sai/sửa', async () => {
    const sig = await signSpot('van-mieu', 'khue-van-cac');
    expect(await verifySignature('van-mieu', 'khue-van-cac', sig)).toBe(true);
    expect(await verifySignature('van-mieu', 'khue-van-cac', 'f'.repeat(16))).toBe(false);
    expect(await verifySignature('van-mieu', 'dai-thanh', sig)).toBe(false);
    expect(await verifySignature('van-mieu', 'khue-van-cac', sig + 'ab')).toBe(false);
    expect(await verifySignature('van-mieu', 'khue-van-cac', 'xyz!!')).toBe(false);
  });
  it('chấp nhận chữ ký payload cũ "site/spot" trên tem in trước qrId', async () => {
    // Tem in cũ ký theo "site/spot"; spot nay có qrId vẫn phải mở được.
    const legacy = createHmac('sha256', QR_SECRET).update('van-mieu/khue-van-cac').digest('hex').slice(0, 16);
    const spot = SITES.flatMap((s) => s.spots).find((sp) => sp.spotId === 'khue-van-cac')!;
    expect(spot.qrId).toBeTruthy();
    expect(await verifySignature('van-mieu', 'khue-van-cac', legacy, spot.qrId)).toBe(true);
  });
});
