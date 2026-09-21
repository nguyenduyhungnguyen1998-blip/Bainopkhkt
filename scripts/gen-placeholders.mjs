// Sinh ảnh SVG placeholder cho các khu/điểm chưa có ảnh thật.
// Chạy: node scripts/gen-placeholders.mjs  (idempotent, KHÔNG ghi đè file đã tồn tại)
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sitesDir = join(root, 'src/data/sites');
const pub = join(root, 'public');

const palettes = {
  'lich-su': ['#C84B31', '#7A1F12'],
  'tu-nhien': ['#0FA37F', '#0B3C4D'],
  'tam-linh': ['#FFD56A', '#8A4B1C'],
};

function svg(label, [a, b], w = 1200, h = 800) {
  const esc = label.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M24 4 44 24 24 44 4 24Z" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/></pattern></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#p)"/>
<circle cx="${w * 0.78}" cy="${h * 0.3}" r="${h * 0.22}" fill="#fff" fill-opacity=".08"/>
<text x="64" y="${h - 96}" font-family="Be Vietnam Pro, system-ui, sans-serif" font-size="56" font-weight="800" fill="#F4F1EA">${esc}</text>
<text x="64" y="${h - 48}" font-family="Be Vietnam Pro, system-ui, sans-serif" font-size="26" fill="#F4F1EA" fill-opacity=".8">Ảnh minh họa tạm – sẽ thay bằng ảnh thực địa</text>
</svg>`;
}

let made = 0;
for (const f of readdirSync(sitesDir).filter((f) => f.endsWith('.json'))) {
  const site = JSON.parse(readFileSync(join(sitesDir, f), 'utf8'));
  const pal = palettes[site.themeContext] ?? palettes['lich-su'];
  const targets = new Map([[site.heroImage, site.name.vi]]);
  for (const spot of site.spots) {
    for (const card of spot.layoutSchema) {
      if ((card.type === 'hero' || card.type === 'image') && card.image) targets.set(card.image, spot.name.vi);
      if (card.type === 'video' && card.poster) targets.set(card.poster, spot.name.vi);
    }
  }
  for (const [path, label] of targets) {
    if (!path.endsWith('.svg')) continue;
    const abs = join(pub, path);
    if (existsSync(abs)) continue;
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, svg(label, pal));
    made++;
  }
}
console.log(`Placeholder: tạo ${made} tệp SVG mới.`);
