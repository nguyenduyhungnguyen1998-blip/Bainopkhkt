# Kịch bản trình diễn 3 phút — TVN – Mở dấu Việt

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
- **Nạp trước offline cache**: mở app, lướt qua 5 địa danh 1 lượt (để SW cache ảnh), rồi tắt. **Nếu định cho xem video khi ngoại tuyến: mở video Văn Miếu Môn phát vài giây trước khi thi — máy lưu bản tải trong cache, bật máy bay vẫn phát được. Không tải trước = không hứa video offline.**
- **Thử giọng đọc trên đúng máy demo**: bấm Nghe một đoạn ngắn — TTS phụ thuộc giọng cài sẵn trên máy; nếu máy không có giọng, khách sẽ thấy bản chữ thuyết minh đọc được ngay (đã sửa lỗi ẩn).
- **Nói đúng phạm vi**: "hành trình mẫu 10 điểm — làm sâu 6 điểm tại Văn Miếu – Quốc Tử Giám, cộng 4 điểm mở rộng ở Dinh Độc Lập, Hạ Long, Huế, Mỹ Sơn". Không nói "phủ đều cả nước" hay "mọi điểm đều có video" (mới có video ở Văn Miếu Môn).

## 1. Hook (20s) — "Điểm đau"

> "Du khách đến Văn Miếu muốn hiểu 82 bia tiến sĩ kể gì — nhưng bảng thông tin ít, hướng dẫn viên quá tải, và cài thêm một app thì mất 2 phút + 200MB. Chúng em làm cách khác: **quét một mã QR là có ngay người kể chuyện** — không cần cài gì cả."

Chỉ cái tem QR đã in trên tay ban giám khảo.

## 2. Bản đồ S (25s) — "Kho báu quốc gia"

- Mở app → bản đồ Việt Nam chữ S, 10 điểm di sản **mở dần theo hành trình** từ Bắc vào Nam, kể cả **Hoàng Sa – Trường Sa**.
- Zoom mượt bằng pinch/nút +/−; bấm điểm → bay vào (fly-to).
- Nói: "Cái này không phải Google Maps nhúng — em tự vẽ lãnh thổ từ dữ liệu bản đồ mở, nên chạy được cả **khi không có mạng**."

## 3. QR → trợ lý (40s) — wow factor chính

- Quét tem **Văn Miếu Môn** → màn chọn chủ đề → **chọn chủ đề cũng nhận dấu luôn** (+30 XP, confetti). Nói đúng: "chạm bất kỳ lựa chọn nào là có dấu — phần thưởng đến ngay".
- Vào một điểm → **gallery nhiều ảnh** vuốt/« › + **nền mờ đổi theo ảnh đang xem** — chỉ khi khách chạm gallery, nền mới đổi.
- Bấm **Nghe thuyết minh** → TTS đọc. Nói đúng độ dài: bài Văn Miếu Môn kể cả câu chuyện lớn của khu (vài phút), các điểm khác ngắn ~1 phút. Trên sân khấu chỉ cho nghe một đoạn rồi bấm tạm dừng. Nếu máy không có giọng → vẫn mở "Đọc bản thuyết minh" để thấy chữ.
- Lướt qua aspect **Nguồn gốc** → video thuyết minh 3 phút đã nén 16.7MB — **phát được offline chỉ khi đã mở một lần trước** (bản tải nằm trong cache máy).
- Dự phòng: nếu camera máy giám khảo yếu → nhập tay mã 16 ký tự in dưới tem, hoặc mở `/#/admin` từ máy mình.

## 4. Quiz + Hộ chiếu (30s)

- Làm **1 câu** quiz tại điểm vừa mở (bộ Văn Miếu Môn có 5 câu — không làm hết trên sân khấu) → mỗi câu đúng có **giải thích 1 câu** + XP.
- Vào `#/passport`: vòng 10 dấu, XP, **12 danh hiệu** (huy hiệu Khởi hành vừa sáng); bấm **Sao lưu** → tải thẻ "Hộ chiếu hành trình" (.html đẹp, mở xem ngay, nhúng sẵn payload — đổi máy chỉ cần Khôi phục chọn file này).

## 5. "Sự cố giả lập" (30s) — climax

> "Nhưng ở Vịnh Hạ Long hay Mỹ Sơn, sóng 4G chập chờn. Kính mời Ban giám khảo xem…"

- **Bật chế độ máy bay ngay trên màn Scrcpy** (kéo thanh trạng thái, bấm ✈).
- Tiếp tục điều hướng app: bản đồ, mở điểm đã quét, xem ảnh, đọc bản thuyết minh, làm quiz, hộ chiếu — **mọi thứ vẫn chạy**.
- Video: **chỉ phát nếu đã mở một lần trước** (bản tải trong cache). Nếu chưa tải trước thì nói thẳng "video cần nạp một lần" — không hứa quá.
- Nói: "Service Worker đã nạp sẵn toàn bộ khung app; dữ liệu nằm trong máy. Mất mạng ≠ mất trải nghiệm."
- Tắt airplane → app không cần reload.

## 6. Kết (15s)

> "Một tem QR 2cm + một file web — biến mỗi điểm di sản thành một hướng dẫn viên số hai ngôn ngữ, chạy được cả trong rừng. Đó là 'du lịch thông minh' mà người dân dùng được ngay hôm nay."

**Lưu ý**: không dùng tour hướng dẫn 13 bước trong 3 phút này — chỉ mở thẻ "Cách sử dụng" 3 bước nếu giám khảo hỏi khách mới dùng thế nào (nút `?` trên bản đồ → "Hướng dẫn nhanh 3 bước").

## Nút cứu hộ (memorize)

| Tình huống | Cách xử lý |
|---|---|
| QR không quét được | Nhập mã 16 ký tự (ô "Nhập mã trên tem" trong màn bản đồ) |
| Cần reset nhanh | `#/admin` → DemoDock → "Reset hành trình" |
| Máy chiếu nhỏ/khó đọc | `?theme=light` + zoom trình duyệt 125% |
| App kẹt | Reload — tiến độ lưu IndexedDB, không mất gì |
| Muốn demo toàn bộ mà không quét đủ 10 tem | DemoDock → "Mở hết điểm" / cộng XP |
