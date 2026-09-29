# Kịch bản trình diễn 3 phút — Mở Dấu Việt

Mục tiêu: hội đồng **phi kỹ thuật** thấy được "mượt + ấn tượng + không chết". Tập trung vào lợi ích, không phải công nghệ.

## 0. Chuẩn bị (trước khi vào phòng)

- **Phản chiếu**: cài [Scrcpy](https://scrcpy.org) trên máy trình chiếu, cắm điện thoại qua **cáp USB** (không dùng Miracast/AirPlay — sóng hội trường nhiễu).
  - Lệnh tối ưu máy yếu: `scrcpy --bit-rate 8M --max-size 1024`
  - Bật USB debugging trên máy Android trước; test một lần ở nhà.
- **Tab sẵn trên điện thoại demo**:
  1. App chính: `https://nguyenduyhungnguyen1998-blip.github.io/Bainopkhkt/`
  2. Bảng điều khiển: `.../#/admin` (bật DemoDock để cứu hộ khi cần)
  3. Trang tem QR: `.../qr-sheet.html` (in sẵn 1 bộ tem thật, cắt rời)
- **Light mode**: mở app với `?theme=light` — máy chiếu hội trường cần tương phản sáng, không dùng dark mode.
- **Nạp trước offline cache**: mở app, lướt qua 5 địa danh 1 lượt (để SW cache ảnh), rồi tắt.
- **Nói đúng phạm vi**: "hành trình mẫu 10 điểm — làm sâu 6 điểm tại Văn Miếu – Quốc Tử Giám, cộng 4 điểm mở rộng ở Dinh Độc Lập, Hạ Long, Huế, Mỹ Sơn". Không nói "phủ đều cả nước" hay "mọi điểm đều có video" (mới có video ở Văn Miếu Môn).

## 1. Hook (20s) — "Điểm đau"

> "Du khách đến Văn Miếu muốn hiểu 82 bia tiến sĩ kể gì — nhưng bảng thông tin ít, hướng dẫn viên quá tải, và cài thêm một app thì mất 2 phút + 200MB. Chúng em làm cách khác: **quét một mã QR là có ngay người kể chuyện** — không cần cài gì cả."

Chỉ cái tem QR đã in trên tay ban giám khảo.

## 2. Bản đồ S (25s) — "Kho báu quốc gia"

- Mở app → bản đồ Việt Nam chữ S, 10 điểm di sản **mở dần theo hành trình** từ Bắc vào Nam, kể cả **Hoàng Sa – Trường Sa**.
- Zoom mượt bằng pinch/nút +/−; bấm điểm → bay vào (fly-to).
- Nói: "Cái này không phải Google Maps nhúng — em tự vẽ lãnh thổ từ dữ liệu bản đồ mở, nên chạy được cả **khi không có mạng**."

## 3. QR → trợ lý (40s) — wow factor chính

- Quét tem **Văn Miếu Môn** → màn xác nhận "Mã hợp lệ — chạm Nhận dấu" → nhận dấu, confetti + XP.
- Vào một điểm → **gallery nhiều ảnh** vuốt/« › + **nền mờ đổi theo ảnh đang xem** — chỉ khi khách chạm gallery, nền mới đổi.
- Bấm **Nghe thuyết minh** → TTS đọc kịch bản chuẩn (17 câu VI/EN chính thống).
- Lướt qua aspect **Nguồn gốc** → video thuyết minh 3 phút đã nén 16.7MB chạy offline.
- Dự phòng: nếu camera máy giám khảo yếu → nhập tay mã 16 ký tự in dưới tem, hoặc mở `/#/admin` từ máy mình.

## 4. Quiz + Hộ chiếu (30s)

- Làm quiz 3 câu tại điểm vừa mở → mỗi câu đúng có **giải thích 1 câu** + XP.
- Vào `#/passport`: 10 dấu ấn, XP, danh hiệu; bấm **Sao lưu** → tải thẻ "Hộ chiếu hành trình" (.html đẹp, mở xem ngay, nhúng sẵn payload — đổi máy chỉ cần Khôi phục chọn file này).

## 5. "Sự cố giả lập" (30s) — climax

> "Nhưng ở Vịnh Hạ Long hay Mỹ Sơn, sóng 4G chập chờn. Kính mời Ban giám khảo xem…"

- **Bật chế độ máy bay ngay trên màn Scrcpy** (kéo thanh trạng thái, bấm ✈).
- Tiếp tục điều hướng app: mở điểm đã quét, nghe audio, xem video, làm quiz — **mọi thứ vẫn chạy**.
- Nói: "Service Worker đã nạp sẵn toàn bộ khung app; dữ liệu nằm trong máy. Mất mạng ≠ mất trải nghiệm."
- Tắt airplane → app không cần reload.

## 6. Kết (15s)

> "Một tem QR 2cm + một file web — biến mỗi điểm di sản thành một hướng dẫn viên số hai ngôn ngữ, chạy được cả trong rừng. Đó là 'du lịch thông minh' mà người dân dùng được ngay hôm nay."

## Nút cứu hộ (memorize)

| Tình huống | Cách xử lý |
|---|---|
| QR không quét được | Nhập mã 16 ký tự (ô "Nhập mã trên tem" trong màn bản đồ) |
| Cần reset nhanh | `#/admin` → DemoDock → "Reset hành trình" |
| Máy chiếu nhỏ/khó đọc | `?theme=light` + zoom trình duyệt 125% |
| App kẹt | Reload — tiến độ lưu IndexedDB, không mất gì |
| Muốn demo toàn bộ mà không quét đủ 10 tem | DemoDock → "Mở hết điểm" / cộng XP |
