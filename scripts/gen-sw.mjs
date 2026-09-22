#!/usr/bin/env node
/**
 * Sinh dist/sw.js sau build: precache toàn bộ app shell + nội dung (JS/CSS/font/ảnh SVG
 * đều nằm trong dist), runtime network-first cho asset cross-origin (video/poster CDN),
 * navigation → index.html để hash router vẫn mở được khi offline.
 * Chạy: node scripts/gen-sw.mjs [--base=/ten/] (base được vite build chuyển tiếp).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

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
const precache = files.sort().map((f) => `${base}/${f}`);

const sw = `// Mở Dấu Việt service worker – sinh tự động bởi scripts/gen-sw.mjs, không sửa tay.
const VERSION = '${version}';
const PRE = 'mdv-pre-' + VERSION;
const RUNTIME = 'mdv-rt-' + VERSION;
const BASE = '${base}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};
const OFFLINE_URL = BASE + '/index.html';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(PRE)
      .then((c) => c.addAll(PRECACHE.concat([OFFLINE_URL])))
      .then(() => self.skipWaiting())
  );
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

  // Điều hướng trang: network-first, rớt mạng → shell đã precache (hash router tự xử lý).
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Asset cùng origin trong precache: cache-first (đổi VERSION khi build mới → cache mới).
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: url.pathname === OFFLINE_URL }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req, copy));
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
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
`;

writeFileSync(join(dist, 'sw.js'), sw);
console.log(`sw.js: ${precache.length + 1} precache entries, version ${version}`);
