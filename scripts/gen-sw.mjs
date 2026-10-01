#!/usr/bin/env node
/**
 * Sinh dist/sw.js sau build: precache toàn bộ app shell + nội dung (JS/CSS/font/ảnh SVG
 * đều nằm trong dist), runtime network-first cho asset cross-origin (video/poster CDN),
 * navigation → index.html để hash router vẫn mở được khi offline.
 * Chạy: node scripts/gen-sw.mjs [--base=/ten/] (base được vite build chuyển tiếp).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

/**
 * Thân service worker — tách ra để test cấu trúc (journey-e2e.test.ts) mà không
 * cần build dist. Mọi nhánh fetch quan trọng được test assert trực tiếp vào đây.
 */
export function buildSw({ version, precache, base }) {
  return `// Du lịch Việt Nam service worker – sinh tự động bởi scripts/gen-sw.mjs, không sửa tay.
const VERSION = '${version}';
const PRE = 'mdv-pre-' + VERSION;
const RUNTIME = 'mdv-rt-' + VERSION;
const BASE = '${base}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};
const OFFLINE_URL = BASE + '/index.html';

self.addEventListener('install', (e) => {
  // KHÔNG skipWaiting ở đây: bản mới nằm chờ, app hiện toast "Có bản mới"
  // và chỉ chiếm quyền khi user bấm cập nhật (message SKIP_WAITING) –
  // tránh trang tự reload giữa demo.
  e.waitUntil(caches.open(PRE).then((c) => c.addAll([...new Set([...PRECACHE, OFFLINE_URL])])));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('mdv-') && k !== PRE && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'CLEAR_CACHES') {
    caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).then(() => e.ports[0]?.postMessage('cleared'));
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  const url = new URL(req.url);

  // Điều hướng trang: network-first, rớt mạng → trang tĩnh đã precache (qr-sheet…) rồi mới tới shell.
  // Không check cache trước thì tem QR dù đã cache vẫn bị nuốt thành index.html (văng về map).
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match(OFFLINE_URL))
      )
    );
    return;
  }

  // Asset cùng origin trong precache: cache-first (đổi VERSION khi build mới → cache mới).
  if (url.origin === location.origin) {
    const mediaLike = /[.](mp4|m4a|mp3|webm|wav)$/i.test(url.pathname);
    e.respondWith(
      caches.match(req, { ignoreSearch: url.pathname === OFFLINE_URL }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.status === 200) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req, copy).catch(() => {}));
            } else if (res.status === 206 && mediaLike) {
              // <audio>/<video> gửi Range → 206 không cache.put được (spec cấm).
              // Clip nhỏ (<15MB): kéo bản đầy đủ nền để offline xem lại được.
              const total = Number((res.headers.get('Content-Range') || '').split('/')[1]) || 0;
              if (total > 0 && total <= 15 * 1024 * 1024) {
                e.waitUntil(
                  fetch(new Request(url.href))
                    .then((full) => {
                      if (full.status === 200) return caches.open(RUNTIME).then((c) => c.put(new Request(url.href), full));
                    })
                    .catch(() => {})
                );
              }
            }
            return res;
          })
      )
    );
    return;
  }

  // Cross-origin (video/poster CDN): network-first, offline → bản cache nếu đã tải lần trước.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.status === 200 || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy).catch(() => {}));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
`;
}

// Chỉ chạy phần sinh file khi gọi trực tiếp `node scripts/gen-sw.mjs` —
// import (vitest) thì không đụng vào dist.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const dist = new URL('../dist/', import.meta.url).pathname;
  const baseArg = process.argv.find((a) => a.startsWith('--base=')) ?? '';
  // Base: ưu tiên argv, còn không suy ra từ đường dẫn asset trong index.html (khớp --base của vite).
  let base = baseArg ? baseArg.slice('--base='.length).replace(/\/$/, '') : '';
  if (!baseArg) {
    const html = readFileSync(join(dist, 'index.html'), 'utf8');
    const m = html.match(/src="(\/[^"]+)\/assets\//) ?? html.match(/src="assets\//);
    base = m && m[1] !== undefined ? m[1].replace(/\/$/, '') : '';
  }

  const files = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f !== 'sw.js') files.push(relative(dist, p));
    }
  };
  walk(dist);

  const version = createHash('sha256').update(files.sort().join('|')).digest('hex').slice(0, 12);
  // Không precache media nặng (video thuyết minh): tải theo nhu cầu, runtime cache giữ lại sau lần phát đầu.
  const precache = files.sort().filter((f) => !f.startsWith('media/')).map((f) => `${base}/${f}`);

  writeFileSync(join(dist, 'sw.js'), buildSw({ version, precache, base }));
  console.log(`sw.js: ${precache.length + 1} precache entries, version ${version}`);
}
