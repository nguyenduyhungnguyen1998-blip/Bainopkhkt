import { describe, it, expect, beforeAll } from 'vitest';
import { extractBackupJson, previewPassportJson, importPassportJson, exportPassportCardHtml } from '../src/lib/progress';

const payload = JSON.stringify({
  app: 'mo-dau-viet',
  kind: 'passport',
  exportedAt: '2026-09-28T00:00:00.000Z',
  progress: {
    schemaVersion: 2,
    unlocked: { 'van-mieu/van-mieu-mon': 1, 'van-mieu/khue-van-cac': 1, 'dinh-doc-lap/cong-chinh': 1 },
    quizDone: {},
    xp: 120,
    badges: [],
  },
});

let card = '';
beforeAll(() => {
  importPassportJson(payload);
  card = exportPassportCardHtml();
});

describe('thẻ hộ chiếu html', () => {
  it('card embeds the backup payload', () => {
    expect(card).toContain('mdv-backup');
    const raw = extractBackupJson(card);
    expect(raw).toContain('"kind": "passport"');
  });
  it('previews stamp count from the card', () => {
    const p = previewPassportJson(card);
    expect(p?.spots).toBe(3);
    expect(p?.xp).toBe(120);
  });
  it('still accepts a raw json payload', () => {
    expect(previewPassportJson(payload)?.spots).toBe(3);
  });
  it('drops stamp keys for spots that no longer exist', () => {
    const p = previewPassportJson(
      JSON.stringify({
        kind: 'passport',
        progress: {
          schemaVersion: 2,
          unlocked: { 'van-mieu/van-mieu-mon': 1, 'old-site/gone-spot': 1, 'van-mieu': 1 },
          quizDone: { 'old-site/gone-spot': 4, 'van-mieu/khue-van-cac': 3 },
          xp: 50,
          badges: [],
        },
      })
    );
    expect(p?.spots).toBe(1);
    expect(p?.progress.quizDone).toEqual({ 'van-mieu/khue-van-cac': 3 });
  });
  it('rejects garbage', () => {
    expect(previewPassportJson('<html><body>no backup</body></html>')).toBeNull();
    expect(previewPassportJson('{"a":1}')).toBeNull();
    expect(extractBackupJson('<html></html>')).toBeNull();
  });
  it('import accepts the card file text', () => {
    expect(importPassportJson(card)).toBe(true);
    expect(importPassportJson('<html></html>')).toBe(false);
  });
});
