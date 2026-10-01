import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { signSpot, verifySignature, QR_SECRET } from '../src/lib/qr';

const ref = (payload: string) => createHmac('sha256', QR_SECRET).update(payload).digest('hex').slice(0, 16);

describe('qr sign — WebCrypto và fallback JS cho kết quả giống nhau', () => {
  const realCrypto = globalThis.crypto;

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true });
  });

  it('với crypto.subtle', async () => {
    expect(await signSpot('van-mieu', 'van-mieu-mon', 'mdvq01')).toBe(ref('mdvq01'));
    expect(await signSpot('ha-long', 'hang-sung-sot', 'mdvq03')).toBe(ref('mdvq03'));
  });

  it('fallback JS khi crypto.subtle vắng mặt — bit-perfect', async () => {
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    for (const p of ['mdvq01', 'mdvq03', 'mdvq10', 'van-mieu/van-mieu-mon', 'hue/ngo-mon']) {
      expect(await signSpot('x', 'y', p)).toBe(ref(p));
    }
    // verifySignature nhận cả qrId lẫn payload cũ site/spot
    expect(await verifySignature('van-mieu', 'van-mieu-mon', await signSpot('van-mieu', 'van-mieu-mon', 'mdvq01'), 'mdvq01')).toBe(true);
    expect(await verifySignature('van-mieu', 'van-mieu-mon', ref('van-mieu/van-mieu-mon'), 'mdvq01')).toBe(true);
    expect(await verifySignature('van-mieu', 'van-mieu-mon', 'deadbeefdeadbeef', 'mdvq01')).toBe(false);
    expect(await verifySignature('van-mieu', 'van-mieu-mon', 'not-hex!!!zzzzzz', 'mdvq01')).toBe(false);
  });
});
