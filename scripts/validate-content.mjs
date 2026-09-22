#!/usr/bin/env node
/**
 * D2 – Content Validator.
 * Kiểm tra toàn bộ src/data/sites/*.json:
 *  1. Hợp lệ theo JSON Schema (site.schema.json).
 *  2. entityId / spotId / journeyOrder không trùng.
 *  3. Mọi ảnh, poster tham chiếu phải tồn tại trong public/ và không quá nặng.
 *  4. Tọa độ nằm trong khung bản đồ (đã ràng buộc trong schema) – ở đây kiểm tra thêm khớp vùng Bắc/Trung/Nam theo vĩ độ.
 *  5. Video: src nếu có phải là https.
 *  6. Cảnh báo (không fail): nguồn chưa được duyệt (reviewed=false), điểm chưa có clip video.
 * Thoát mã 1 nếu có lỗi -> chặn CI.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = new URL('..', import.meta.url).pathname;
const sitesDir = join(root, 'src/data/sites');
const pub = join(root, 'public');
const schema = JSON.parse(readFileSync(join(root, 'src/data/schema/site.schema.json'), 'utf8'));

const IMG_MAX_KB = 300;

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

const files = readdirSync(sitesDir).filter((f) => f.endsWith('.json')).sort();
if (files.length === 0) err('sites/', 'không có tệp nội dung nào');

const seenEntity = new Map();
const seenOrder = new Map();
const seenBadge = new Map();

for (const f of files) {
  let site;
  try {
    site = JSON.parse(readFileSync(join(sitesDir, f), 'utf8'));
  } catch (e) {
    err(f, `JSON không parse được: ${e.message}`);
    continue;
  }

  if (!validate(site)) {
    for (const e of validate.errors) err(f, `schema ${e.instancePath || '/'} ${e.message}`);
    continue;
  }

  // Tên tệp phải trùng entityId để dễ tra cứu
  if (f !== `${site.entityId}.json`) err(f, `tên tệp phải là ${site.entityId}.json`);

  if (seenEntity.has(site.entityId)) err(f, `entityId "${site.entityId}" trùng với ${seenEntity.get(site.entityId)}`);
  seenEntity.set(site.entityId, f);

  if (seenOrder.has(site.journeyOrder)) err(f, `journeyOrder ${site.journeyOrder} trùng với ${seenOrder.get(site.journeyOrder)}`);
  seenOrder.set(site.journeyOrder, f);

  const badgeId = site.gamificationConfig.badge.id;
  if (seenBadge.has(badgeId)) err(f, `badge.id "${badgeId}" trùng với ${seenBadge.get(badgeId)}`);
  seenBadge.set(badgeId, f);

  // Vùng miền khớp vĩ độ (ranh giới thô: Bắc >= 20, Trung 11.5–20, Nam < 11.5)
  const lat = site.coords[1];
  const expected = lat >= 20 ? 'bac' : lat >= 11.5 ? 'trung' : 'nam';
  if (site.region !== expected) warn(f, `region="${site.region}" nhưng vĩ độ ${lat} gợi ý "${expected}" – kiểm tra lại`);

  const assets = new Set([site.heroImage]);
  const spotIds = new Set();

  for (const spot of site.spots) {
    const tag = `${f} › ${spot.spotId}`;
    if (spotIds.has(spot.spotId)) err(tag, 'spotId trùng trong cùng khu');
    spotIds.add(spot.spotId);

    let hasHero = false;
    let hasAudio = false;
    let hasVideoSrc = false;
    for (const card of spot.layoutSchema) {
      if (card.type === 'hero') hasHero = true;
      if (card.type === 'audio') hasAudio = true;
      if ((card.type === 'hero' || card.type === 'image') && card.image) assets.add(card.image);
      if (card.type === 'video') {
        if (card.poster) assets.add(card.poster);
        if (card.src) {
          hasVideoSrc = true;
          if (!card.src.startsWith('https://')) err(tag, `video.src phải là https: ${card.src}`);
        }
      }
      if (card.type === 'audio') {
        if (card.script.vi.length !== card.script.en.length)
          warn(tag, `audio.script vi có ${card.script.vi.length} câu, en có ${card.script.en.length} câu`);
      }
      if (card.type === 'aspects') {
        const ids = card.aspects.map((a) => a.id);
        if (new Set(ids).size !== ids.length) err(tag, 'aspects.id trùng');
      }
    }
    if (!hasHero) err(tag, 'thiếu card hero (mọi điểm phải có ảnh mở đầu)');
    if (!hasAudio) err(tag, 'thiếu card audio (TTS là kênh dự phòng bắt buộc)');
    if (!hasVideoSrc) warn(tag, 'chưa có link video – sẽ hiển thị khung chờ');

    for (const s of spot.sources) if (!s.reviewed) warn(tag, `nguồn chưa duyệt: "${s.title}"`);

    if (spot.quiz) {
      for (const [i, q] of spot.quiz.entries()) {
        if (q.answer >= q.options.length) err(tag, `quiz[${i}].answer=${q.answer} vượt số phương án`);
      }
    }
  }

  for (const a of assets) {
    const abs = join(pub, a);
    if (!existsSync(abs)) {
      err(f, `thiếu tệp ${a}`);
      continue;
    }
    const kb = statSync(abs).size / 1024;
    if (kb > IMG_MAX_KB) err(f, `${a} nặng ${kb.toFixed(0)} KB > ${IMG_MAX_KB} KB (nén lại)`);
  }
}

// Hành trình phải liên tục 1..n
const orders = [...seenOrder.keys()].sort((a, b) => a - b);
orders.forEach((o, i) => {
  if (o !== i + 1) err('journeyOrder', `thứ tự phải liên tục 1..${orders.length}, thiếu ${i + 1}`);
});

const summary = `${files.length} khu, ${files.reduce((n, f) => {
  try {
    return n + JSON.parse(readFileSync(join(sitesDir, f), 'utf8')).spots.length;
  } catch {
    return n;
  }
}, 0)} điểm QR`;

for (const w of warnings) console.log(`  ⚠  ${w}`);
for (const e of errors) console.error(`  ✖  ${e}`);
console.log(`\nD2 Content Validator: ${summary} – ${errors.length} lỗi, ${warnings.length} cảnh báo.`);
process.exit(errors.length ? 1 : 0);
