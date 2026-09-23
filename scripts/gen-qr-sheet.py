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
import sys

import segno

QR_SECRET = b"mdv-qr-v1"
SIG_LEN = 16
BASE = (
    sys.argv[1] if len(sys.argv) > 1
    else "https://nguyenduyhungnguyen1998-blip.github.io/Bainopkhkt/"
).rstrip("/") + "/"
OUT = "public/qr-sheet.html"

cards = []
for path in sorted(glob.glob("src/data/sites/*.json")):
    site = json.load(open(path, encoding="utf-8"))
    for spot in site["spots"]:
        sig = hmac.new(
            QR_SECRET,
            f"{site['entityId']}/{spot['spotId']}".encode(),
            hashlib.sha256,
        ).hexdigest()[:SIG_LEN]
        url = f"{BASE}#/d/{site['entityId']}/{spot['spotId']}?s={sig}"
        svg = segno.make(url, error="m").svg_inline(
            scale=8, border=2, dark="#1b2434", light="#ffffff"
        )
        cards.append({"site": site["name"]["vi"], "spot": spot["name"]["vi"], "sig": sig, "url": url, "svg": svg})

body = "\n".join(
    f"""      <figure class="card">
        <figcaption class="site">{c['site']}</figcaption>
        {c['svg']}
        <figcaption class="spot">{c['spot']}</figcaption>
        <span class="sig">Mã: {c['sig']}</span>
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
  .card {{ border:1.6px dashed #b9a77f; border-radius:12px; padding:12px 10px 14px; text-align:center; break-inside:avoid; background:#fffdf8 }}
  .site {{ font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--brand); margin-bottom:8px }}
  .card svg {{ width:100%; max-width:150px; height:auto; display:block; margin:0 auto }}
  .spot {{ display:block; font-size:13px; font-weight:700; margin-top:8px; line-height:1.3 }}
  .sig {{ display:block; font-size:10px; color:var(--muted); font-family:ui-monospace,monospace; margin-top:4px }}
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
