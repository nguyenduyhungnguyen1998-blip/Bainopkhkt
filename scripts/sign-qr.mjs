#!/usr/bin/env node
/**
 * In bảng URL QR có chữ ký HMAC cho mọi điểm (P3) — giống hệt src/lib/qr.ts.
 * Chạy: node scripts/sign-qr.mjs [base-url]
 *   node scripts/sign-qr.mjs https://nguyenduyhungnguyen1998-blip.github.io/Bainopkhkt/
 * Không truyền base thì in dạng tương đối (chỉ hash) để ghép sau.
 */
import { createHmac } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const QR_SECRET = 'mdv-qr-v1';
const SIG_LEN = 16;

const base = process.argv[2] ?? '';
const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/data/sites');
const rows = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const site = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  for (const spot of site.spots) {
    // Ký theo qrId bất biến (giống src/lib/qr.ts) – đổi slug không vỡ tem đã in.
    const payload = spot.qrId ?? `${site.entityId}/${spot.spotId}`;
    const sig = createHmac('sha256', QR_SECRET).update(payload).digest('hex').slice(0, SIG_LEN);
    rows.push({ site: site.entityId, spot: spot.spotId, sig, url: `${base}${base.endsWith('/') ? '' : '/'}#/d/${site.entityId}/${spot.spotId}?s=${sig}` });
  }
}
const w = Math.max(...rows.map((r) => r.spot.length));
for (const r of rows) console.log(`${r.site.padEnd(14)} ${r.spot.padEnd(w)} ${r.sig}  ${r.url}`);
