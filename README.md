# Mở Dấu Việt — Nền tảng du lịch thông minh định danh văn hóa Việt

PWA (Progressive Web App) phục vụ hành trình di sản 5 khu – 10 điểm: **Văn Miếu – Quốc Tử Giám** (hành trình mẫu làm sâu, 6 điểm), **Dinh Độc Lập**, **Vịnh Hạ Long**, **Quần thể di tích cố đô Huế** và **Thánh địa Mỹ Sơn** (mỗi khu 1 điểm mở rộng). Du khách **quét mã QR tại từng điểm** để mở khóa nội dung, nghe thuyết minh, làm quiz, sưu tầm "dấu ấn" vào hộ chiếu số — **không cần cài app, hoạt động offline**.

Demo trực tiếp: https://nguyenduyhungnguyen1998-blip.github.io/Bainopkhkt/

---

## Kiến trúc hệ thống

```
┌────────────────────────────────────────────────────────────┐
│                        BROWSER / PWA                        │
│                                                             │
│  UI (Preact)          Domain                   Infra        │
│  ├─ screens/          ├─ data/sites/*.json     ├─ sw.ts     │
│  │   MapScreen        │   (content + schema)   │   Service  │
│  │   DestinationScreen├─ lib/progress.ts       │   Worker   │
│  │   Quiz/Passport/   │   (IndexedDB qua       │   (gen từ  │
│  │   Settings/Admin   │    db.ts – nguồn chuẩn)│   build)   │
│  ├─ map/              ├─ lib/qr.ts             ├─ qr.ts     │
│  │   VietnamMap       │   (HMAC-SHA256 verify, │   offline  │
│  │   SiteLevelMap     │    offline-verify)     │   verify)  │
│  │   useMapGestures   ├─ lib/i18n.ts (vi/en)   ├─ speech.ts │
│  │   projection.ts    ├─ lib/speech.ts (TTS)   │   fallback │
│  └─ components/       └─ lib/router.ts (hash)  └─ ambient   │
└────────────────────────────────────────────────────────────┘
```

- **Frontend**: Preact + TypeScript + Vite. Không cần backend — mọi logic chạy client-side để phù hợp môi trường khu du lịch sóng yếu.
- **Nội dung**: dữ liệu di tích trong `src/data/sites/*.json`, validate theo JSON Schema (`src/data/schema/`) bằng `scripts/validate-content.mjs` trong CI.
- **Bản đồ S-shaped**: SVG render tay (`vietnam-geometry.ts` sinh từ TopoJSON `world-atlas` qua `scripts/build-map.mjs`), chiếu Mercator (`projection.ts`), cử chỉ pinch/pan/wheel + fly-to (`useMapGestures.ts`). Node ổn định kích thước qua counter-scale `scale(1/k)`.
- **QR check-in**: tem QR mã hóa `?q=<nn>.<sig>`; `sig` = HMAC-SHA256(`site/spot`, secret) → xác thực **offline hoàn toàn**. Tem và script sinh: `public/qr-sheet.html`, `scripts/sign-qr.mjs`, `scripts/gen-qr-sheet.py`.
- **Tiến độ (dấu ấn)**: IndexedDB (`lib/db.ts`) hydrate vào `lib/progress.ts` — unlock spot, XP, huy hiệu, finale 10/10, sao lưu/nhập khẩu qua **thẻ hộ chiếu HTML** (payload nhúng trong file, mở xem ngay, vẫn nhận JSON cũ).
- **Offline-first**: `scripts/gen-sw.mjs` sinh Service Worker sau mỗi build — precache app shell (trừ `media/`), runtime cache ảnh/video khi đã mở. Đăng ký trong `lib/sw.ts`.
- **i18n**: `lib/i18n.ts` — vi/en toàn bộ UI + nội dung.
- **Theme**: dark (mặc định) / light (máy chiếu) qua `?theme=` hoặc Cài đặt; `prefers-color-scheme` fallback.

## Bắt đầu

```bash
npm install
npm run dev        # http://localhost:5173 (dev server)
npm run check      # typecheck + validate content + vitest + build + gen-sw
npm run preview    # serve bản build dist/ đúng như production
```

Yêu cầu: Node ≥ 20. Không cần biến môi trường hay credential nào — app chạy thuần client.

## Kiểm thử & CI

- `npm run typecheck` — TypeScript strict.
- `npm run validate` — kiểm tra toàn bộ JSON nội dung theo schema (ảnh tồn tại, video ≤ 50MB, aspect hợp lệ…).
- Nguồn ảnh & ghi công: `public/img/ATTRIBUTION.md` (27 ảnh — 18 từ Wikimedia Commons có license, 9 frame trích từ video tư liệu nhóm); hiển thị trong app tại Cài đặt → Nguồn tư liệu & hình ảnh.
- `npm test` — Vitest (signature QR, progress, router…).
- `npm run build` — build + sinh SW + manifest.

CI chạy `npm run check` trên mọi PR. Deploy: GitHub Pages qua workflow `.github/workflows/`.

## Cấu trúc thư mục

```
src/
  app.tsx              # shell + route + ErrorBoundary
  main.tsx             # boot: đổi ?q / ?d&s → hash, hydrate IndexedDB, render
  screens/             # MapScreen, DestinationScreen, Quiz, Passport, Settings, Admin
  map/                 # bản đồ VN + sơ đồ cấp khu + cử chỉ/chiếu
  lib/                 # db (IndexedDB), progress, qr (HMAC), i18n, speech, router, sw, theme
  data/                # sites/*.json + schema
  components/          # Icon, ErrorBoundary, Celebrate, DemoDock (bảng điều khiển demo)
  styles/              # tokens, base (a11y, reduced-motion)
public/
  media/               # video/ảnh lớn — runtime cache, không precache
  img/                 # icon PWA, hình nền
  qr-sheet.html        # trang in tem QR
docs/
  PLAN.md              # kế hoạch phát triển
  DEMO.md              # kịch bản trình diễn (Scrcpy, airplane-mode, QR dự phòng)
scripts/               # build-map, gen-sw, gen-qr-sheet, sign-qr, validate-content
```

## Ghi chú demo

- `#/admin` bật **DemoDock** — bảng điều khiển nổi: mở/khóa điểm, cộng XP, reset hành trình, nhận mã/link QR.
- Quét QR hỏng trên máy yếu → ô "nhập mã" dự phòng trong màn bản đồ (mã 16-ký-tự in trên tem).
- Màn `#/passport` tổng kết hành trình + chia sẻ/sao lưu tiến độ.

Xem kịch bản 3 phút chi tiết trong `docs/DEMO.md`.
