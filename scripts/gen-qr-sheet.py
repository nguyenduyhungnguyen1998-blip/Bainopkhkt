#!/usr/bin/env python3
"""Sinh tờ QR in được cho mọi điểm (P6) — cùng thuật toán HMAC với src/lib/qr.ts.

Chạy: python3 scripts/gen-qr-sheet.py [base-url]
Mặc định base = trang GitHub Pages đang deploy.
Xuất: public/qr-sheet.html — file tự chứa (SVG vector), in A4 3×3.
Cần: pip3 install segno
"""
import glob
import hashlib
import hmac
import json
import os
import re
import sys

import segno

QR_SECRET = b"mdv-qr-v1"
SIG_LEN = 16
BASE = (
    sys.argv[1] if len(sys.argv) > 1
    else "https://nguyenduyhungnguyen1998-blip.github.io/Bainopkhkt/"
).rstrip("/") + "/"
OUT = "public/qr-sheet.html"
SHORT_PATH = "scripts/qr-shortlinks.json"
SHORT = json.load(open(SHORT_PATH, encoding="utf-8")) if os.path.exists(SHORT_PATH) else {}

cards = []
for path in sorted(glob.glob("src/data/sites/*.json")):
    site = json.load(open(path, encoding="utf-8"))
    for spot in site["spots"]:
        # Ký theo qrId bất biến (giống src/lib/qr.ts) – đổi slug không vỡ tem đã in.
        payload = spot.get("qrId", f"{site['entityId']}/{spot['spotId']}")
        sig = hmac.new(
            QR_SECRET,
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()[:SIG_LEN]
        # Tem encode SHORTLINK (scripts/qr-shortlinks.json — tinyurl redirect về
        # URL app): link ~28 ký tự → QR thưa (~37×37), quét dễ trên mọi scanner.
        # Dòng chữ dưới tem vẫn in URL app đầy đủ + mã dự phòng. Fallback khi
        # chưa có shortlink: ?q=<nn>.<sig> compact (qrId mdvqNN) rồi ?d=site/spot.
        key = f"{site['entityId']}/{spot['spotId']}"
        url = SHORT.get(key)
        if not url:
            m = re.fullmatch(r"mdvq(\d+)", payload)
            url = f"{BASE}?q={m.group(1)}.{sig}" if m else f"{BASE}?d={key}&s={sig}"
        # error='l' (sửa lỗi thấp) → mã thưa nhất; bản in sạch không cần chịu
        # mòn. border=4 = quiet zone tối thiểu theo chuẩn QR.
        svg = segno.make(url, error="l").svg_inline(
            scale=8, border=4, dark="#1b2434", light="#ffffff"
        )
        # segno svg_inline chỉ đặt width/height cố định, KHÔNG có viewBox → CSS
        # width:100% co viewport nhưng nội dung vẫn vẽ cỡ gốc → trình duyệt CẮT
        # QR chỉ còn ~70% góc trên-trái (mất finder góc dưới) = không quét được.
        # Đây là nguyên nhân gốc tem không đọc được từ trước tới nay.
        dim = re.search(r'width="(\d+)"', svg).group(1)
        svg = re.sub(r"<svg ", f'<svg viewBox="0 0 {dim} {dim}" ', svg, count=1)
        full = f"{BASE}?d={key}&s={sig}"
        cards.append({"site": site["name"]["vi"], "spot": spot["name"]["vi"], "sig": sig, "url": url, "full": full, "svg": svg})

body = "\n".join(
    f"""      <figure class="card">
        <figcaption class="site">{c['site']}</figcaption>
        {c['svg']}
        <figcaption class="spot">{c['spot']}</figcaption>
        <span class="sig">Mã: {c['sig']}</span>
        <span class="url">{c['full']}</span>
        <span class="cta">Quét để mở khóa điểm này</span>
      </figure>"""
    for c in cards
)

html = f"""<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mở Dấu Việt — Tem QR các điểm di sản</title>
<style>
  :root {{ --ink:#1b2434; --brand:#b22222; --muted:#5b5f6b; }}
  * {{ box-sizing:border-box; margin:0 }}
  body {{ font-family:'Be Vietnam Pro','Segoe UI',sans-serif; color:var(--ink); background:#fff; padding:24px }}
  h1 {{ font-size:20px; text-align:center; letter-spacing:.02em }}
  h1 b {{ color:var(--brand) }}
  .sub {{ text-align:center; font-size:12px; color:var(--muted); margin:6px 0 20px }}
  .grid {{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; max-width:190mm; margin:0 auto }}
  .card {{ border:1.6px dashed #b9a77f; border-radius:12px; padding:14px 12px 14px; text-align:center; break-inside:avoid; background:#fff }}
  .site {{ font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--brand); margin-bottom:8px }}
  .card svg {{ width:100%; max-width:185px; height:auto; display:block; margin:0 auto }}
  .spot {{ display:block; font-size:13px; font-weight:700; margin-top:8px; line-height:1.3 }}
  .sig {{ display:block; font-size:10px; color:var(--muted); font-family:ui-monospace,monospace; margin-top:4px }}
  .url {{ display:block; font-size:7px; color:var(--muted); font-family:ui-monospace,monospace; margin-top:2px; word-break:break-all }}
  .cta {{ display:block; font-size:10px; color:var(--ink); margin-top:6px }}
  @media print {{ body {{ padding:0 }} .grid {{ gap:10px }} }}
</style>
</head>
<body>
  <h1>Tem QR <b>Mở Dấu Việt</b> — dán tại các điểm di sản</h1>
  <p class="sub">Quét bằng camera điện thoại để mở khóa điểm trong app. Cắt theo viền nét đứt. Mã dự phòng gõ tay khi cần.</p>
  <div class="grid">
{body}
  </div>
</body>
</html>
"""

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)
print(f"{OUT}: {len(cards)} QR, base {BASE}")
for c in cards:
    print(f"  {c['sig']}  {c['spot']}  ->  {c['url']}")
