// Mở Dấu Việt service worker – sinh tự động bởi scripts/gen-sw.mjs, không sửa tay.
const VERSION = '10e8282c662c';
const PRE = 'mdv-pre-' + VERSION;
const RUNTIME = 'mdv-rt-' + VERSION;
const BASE = '/Bainopkhkt';
const PRECACHE = [
  "/Bainopkhkt/assets/hud-iz6amFdH.js",
  "/Bainopkhkt/assets/hud-tKoDLev6.css",
  "/Bainopkhkt/assets/index--_eLYBVW.css",
  "/Bainopkhkt/assets/index-Czz85tmj.js",
  "/Bainopkhkt/fonts/be-vietnam-pro-400-latin.woff2",
  "/Bainopkhkt/fonts/be-vietnam-pro-400-vietnamese.woff2",
  "/Bainopkhkt/fonts/be-vietnam-pro-600-latin.woff2",
  "/Bainopkhkt/fonts/be-vietnam-pro-600-vietnamese.woff2",
  "/Bainopkhkt/fonts/be-vietnam-pro-800-latin.woff2",
  "/Bainopkhkt/fonts/be-vietnam-pro-800-vietnamese.woff2",
  "/Bainopkhkt/img/apple-touch-icon.png",
  "/Bainopkhkt/img/dinh-doc-lap/hero.svg",
  "/Bainopkhkt/img/ha-long/hero.svg",
  "/Bainopkhkt/img/hue/hero.svg",
  "/Bainopkhkt/img/icon-192.png",
  "/Bainopkhkt/img/icon-512.png",
  "/Bainopkhkt/img/my-son/hero.svg",
  "/Bainopkhkt/img/van-mieu/bia-tien-si.svg",
  "/Bainopkhkt/img/van-mieu/chu-van-an.webp",
  "/Bainopkhkt/img/van-mieu/dai-thanh.svg",
  "/Bainopkhkt/img/van-mieu/hero.svg",
  "/Bainopkhkt/img/van-mieu/khong-tu.webp",
  "/Bainopkhkt/img/van-mieu/khue-van-cac.svg",
  "/Bainopkhkt/img/van-mieu/nha-thai-hoc-altar.webp",
  "/Bainopkhkt/img/van-mieu/thai-hoc.svg",
  "/Bainopkhkt/img/van-mieu/tu-phoi-1.webp",
  "/Bainopkhkt/img/van-mieu/tu-phoi-2.webp",
  "/Bainopkhkt/img/van-mieu/van-mieu-mon.svg",
  "/Bainopkhkt/index.html",
  "/Bainopkhkt/manifest.webmanifest",
  "/Bainopkhkt/qr-sheet.html",
  "/Bainopkhkt/robots.txt"
];
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
