// TVN – Mở dấu Việt service worker – sinh tự động bởi scripts/gen-sw.mjs, không sửa tay.
const VERSION = '7f1d9b427a57';
const PRE = 'mdv-pre-' + VERSION;
const RUNTIME = 'mdv-rt-' + VERSION;
const BASE = '/Bainopkhkt';
const PRECACHE = [
  "/Bainopkhkt/assets/hud-RgcJzn5A.js",
  "/Bainopkhkt/assets/hud-tKoDLev6.css",
  "/Bainopkhkt/assets/index-Berqfefo.js",
  "/Bainopkhkt/assets/index-C7cCuC73.css",
  "/Bainopkhkt/fonts/be-vietnam-pro-400-latin.woff2",
  "/Bainopkhkt/fonts/be-vietnam-pro-400-vietnamese.woff2",
  "/Bainopkhkt/fonts/be-vietnam-pro-600-latin.woff2",
  "/Bainopkhkt/fonts/be-vietnam-pro-600-vietnamese.woff2",
  "/Bainopkhkt/fonts/be-vietnam-pro-800-latin.woff2",
  "/Bainopkhkt/fonts/be-vietnam-pro-800-vietnamese.woff2",
  "/Bainopkhkt/img/ATTRIBUTION.md",
  "/Bainopkhkt/img/apple-touch-icon.png",
  "/Bainopkhkt/img/brand/emblem-256.webp",
  "/Bainopkhkt/img/brand/emblem.png",
  "/Bainopkhkt/img/dinh-doc-lap/cong-chinh.webp",
  "/Bainopkhkt/img/dinh-doc-lap/hero.webp",
  "/Bainopkhkt/img/ha-long/hang-sung-sot.webp",
  "/Bainopkhkt/img/ha-long/hero.webp",
  "/Bainopkhkt/img/hue/hero.webp",
  "/Bainopkhkt/img/hue/ngo-mon.webp",
  "/Bainopkhkt/img/icon-192.png",
  "/Bainopkhkt/img/icon-512.png",
  "/Bainopkhkt/img/mascot.webp",
  "/Bainopkhkt/img/my-son/hero.webp",
  "/Bainopkhkt/img/my-son/nhom-thap-b.webp",
  "/Bainopkhkt/img/van-mieu/ba-vua-tang-tren.webp",
  "/Bainopkhkt/img/van-mieu/bia-nha-bia-gieng.webp",
  "/Bainopkhkt/img/van-mieu/bia-rua-doc-bia.webp",
  "/Bainopkhkt/img/van-mieu/bia-tien-si.webp",
  "/Bainopkhkt/img/van-mieu/chu-van-an.webp",
  "/Bainopkhkt/img/van-mieu/dai-thanh-dien.webp",
  "/Bainopkhkt/img/van-mieu/hero.webp",
  "/Bainopkhkt/img/van-mieu/ho-van-kim-chau.webp",
  "/Bainopkhkt/img/van-mieu/khong-tu.webp",
  "/Bainopkhkt/img/van-mieu/khue-van-cac.webp",
  "/Bainopkhkt/img/van-mieu/kvc-gac-cau-doi.webp",
  "/Bainopkhkt/img/van-mieu/kvc-qua-dai-trung-mon.webp",
  "/Bainopkhkt/img/van-mieu/nha-thai-hoc-altar.webp",
  "/Bainopkhkt/img/van-mieu/nhap-dao-duong.webp",
  "/Bainopkhkt/img/van-mieu/so-do-van-mieu.webp",
  "/Bainopkhkt/img/van-mieu/thai-hoc-san.webp",
  "/Bainopkhkt/img/van-mieu/tien-an-tu-tru.webp",
  "/Bainopkhkt/img/van-mieu/toan-canh-tren-cao.webp",
  "/Bainopkhkt/img/van-mieu/toan-canh-truc-chinh.webp",
  "/Bainopkhkt/img/van-mieu/tu-phoi-1.webp",
  "/Bainopkhkt/img/van-mieu/tu-phoi-2.webp",
  "/Bainopkhkt/img/van-mieu/van-mieu-mon.webp",
  "/Bainopkhkt/img/van-mieu/vuon-giam-bat-giac.webp",
  "/Bainopkhkt/img/van-mieu/vuon-giam-canh-quan.webp",
  "/Bainopkhkt/img/van-mieu/vuon-giam-duong-di.webp",
  "/Bainopkhkt/img/van-mieu/vuon-giam.webp",
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

  // Điều hướng trang: network-first, rớt mạng → trang tĩnh đã precache (qr-sheet…) rồi mới tới shell.
  // Không check cache trước thì tem QR dù đã cache vẫn bị nuốt thành index.html (văng về map).
  // Deadline 4s (QR-15): mạng chập chờn treo fetch vô hạn — quá hạn rơi về cache/shell.
  if (req.mode === 'navigate') {
    const offline = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match(OFFLINE_URL));
    const timed = new Promise((_, rej) => setTimeout(() => rej(new Error('nav-timeout')), 4000));
    e.respondWith(Promise.race([fetch(req), timed]).catch(offline));
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
