# Mở Dấu Việt – Kế hoạch triển khai (v2)

Bản đầy đủ, có tương tác: [`docs/plan-v2.html`](./plan-v2.html) (mở trực tiếp, không cần server).

## Định hướng

Web thuần **hiện thực hóa** ý tưởng đã có trong tài liệu/bài báo, không thiết kế nghiên cứu mới.
Ba ưu tiên theo thứ tự: (1) **bản đồ chữ S** – điểm nhấn phải gây ấn tượng cao nhất; (2) UI/UX mượt,
thân thiện với du khách ngoài trời, di động; (3) tính interactive (chạm, kéo, zoom, mở khóa, phản hồi tức thì).
Video AI chỉ là khung nhúng chờ link – luôn có văn bản + TTS làm nền, không để màn trống.

## Lộ trình

| Phase | Nội dung | Exit criteria |
|---|---|---|
| **P0** Nền | Vite + TS + Preact, token 2 chế độ, font Be Vietnam Pro self-host, hash router, dock nổi, JSON Schema + dữ liệu 5 khu / 9 điểm QR, bản đồ chữ S bản 1, D1 HUD, D2 validator, D8 error log, CI | `npm run check` xanh; bản đồ pan/zoom/chạm được trên mobile; JS gzip < 120 KB |
| **P1** Bản đồ | Node co giãn theo zoom, nhãn chống chồng, mức khu (sơ đồ điểm QR trong Văn Miếu), D9 Map Inspector, gesture polish, haptics | 60 fps khi kéo/pinch trên Android tầm trung; chuyển quốc gia ↔ khu mượt |
| **P2** Điểm đến | Renderer thẻ JSON hoàn chỉnh, khung video (link thêm sau) + poster, ảnh thực địa, TTS Web Speech + watchdog (D3), Web Audio preset (D4) | Đọc được toàn bộ 5 điểm Văn Miếu VI/EN; TTS lỗi → rơi về văn bản trong < 1 s |
| **P3** Gamification | IndexedDB (schemaVersion), QR HMAC tĩnh, XP/huy hiệu/hộ chiếu, quiz, D6 Journey Simulator | Quét QR (thật + mô phỏng) mở điểm; hộ chiếu xuất/nhập JSON |
| **P4** Offline | Service Worker precache app shell + nội dung, video network-first, D5 SW Inspector | Tắt mạng vẫn dùng đủ bản đồ + 9 điểm; video rơi về TTS |
| **P5** Hoàn thiện | D7 Perf budget CI + Lighthouse, a11y (WCAG AA, 44 px), giảm hiệu ứng, kịch bản demo | Lighthouse PWA/Perf/A11y ≥ 90 trên Moto G4 profile |

## Hệ thống debugger

D1 Debug HUD (`?debug=1`) · D2 Content Validator (CI) · D3 Speech Probe · D4 Audio Graph Inspector ·
D5 SW/Cache Inspector · D6 Journey Simulator · D7 Perf Budget Gate (CI) · D8 Offline Error Log · D9 Map Inspector.
Mỗi rủi ro lớn có đúng một công cụ quan trắc; P0 đã có D1, D2, D8 và cổng D7 sơ khai trong CI.

## Quy ước

- Nội dung nằm trong `src/data/sites/*.json`, kiểm bằng `src/data/schema/site.schema.json` + `npm run validate`.
- Hình học bản đồ sinh tự động: `npm run map:build` → `src/map/vietnam-geometry.ts` (không sửa tay).
- Ảnh tạm: `node scripts/gen-placeholders.mjs` (không ghi đè ảnh thật).
- Route dạng hash để QR in tĩnh trỏ thẳng `#/d/<khu>/<điểm>` trên host tĩnh.
