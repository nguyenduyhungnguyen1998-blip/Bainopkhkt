import { describe, it, expect } from 'vitest';
import { computeStatuses, journeyStats, type Progress } from '../src/lib/progress';
import { SITES } from '../src/data/content';

const p = (unlocked: string[]): Progress => ({
  schemaVersion: 2,
  unlocked: Object.fromEntries(unlocked.map((k) => [k, 1])),
  quizDone: {},
  xp: 0,
  badges: [],
});

describe('trạng thái node hành trình', () => {
  it('chưa đi đâu: khu đầu tiên là next, còn lại locked', () => {
    const s = computeStatuses(p([]));
    expect(s.get(SITES[0].entityId)).toBe('next');
    for (const site of SITES.slice(1)) expect(s.get(site.entityId)).toBe('locked');
  });
  it('mở 1 điểm ở khu đầu: active + khu 2 là next', () => {
    const [a, b] = SITES;
    const s = computeStatuses(p([`${a.entityId}/${a.spots[0].spotId}`]));
    expect(s.get(a.entityId)).toBe(a.spots.length === 1 ? 'done' : 'active');
    expect(s.get(b.entityId)).toBe('next');
  });
  it('mở hết khu đầu -> done', () => {
    const a = SITES[0];
    const s = computeStatuses(p(a.spots.map((sp) => `${a.entityId}/${sp.spotId}`)));
    expect(s.get(a.entityId)).toBe('done');
  });
  it('đi lệch thứ tự (khu 3 trước): next là khu 4, khu 1-2 vẫn locked', () => {
    const c = SITES[2];
    const s = computeStatuses(p([`${c.entityId}/${c.spots[0].spotId}`]));
    expect(s.get(SITES[3].entityId)).toBe('next');
    expect(s.get(SITES[0].entityId)).toBe('locked');
  });
  it('mở hết mọi khu: không còn next', () => {
    const all = SITES.flatMap((s) => s.spots.map((sp) => `${s.entityId}/${sp.spotId}`));
    const s = computeStatuses(p(all));
    expect([...s.values()].every((v) => v === 'done')).toBe(true);
  });
});

describe('thống kê hành trình', () => {
  it('đếm dấu, khu xong, quiz và ngày từ tiến độ trên máy', () => {
    const site = SITES[0];
    const keys = site.spots.map((sp) => `${site.entityId}/${sp.spotId}`);
    const qs = site.spots.find((sp) => sp.quiz?.length)!;
    const qkey = `${site.entityId}/${qs.spotId}`;
    const prog: Progress = {
      schemaVersion: 2,
      unlocked: Object.fromEntries(keys.map((k, i) => [k, Date.UTC(2026, 9, 1 + (i % 2), 8)])),
      quizDone: { [qkey]: 1 },
      xp: 42,
      badges: [],
    };
    const st = journeyStats(prog);
    expect(st.stamps).toBe(keys.length);
    expect(st.sitesDone).toBe(1);
    expect(st.quizSets).toBe(1);
    expect(st.quizCorrect).toBe(1);
    expect(st.quizAsked).toBe(qs.quiz!.length);
    expect(st.activeDays).toBe(keys.length > 1 ? 2 : 1);
    expect(st.firstStampAt).toBe(Date.UTC(2026, 9, 1, 8));
    expect(st.xp).toBe(42);
  });
  it('chưa có gì: không chia cho 0', () => {
    const st = journeyStats(p([]));
    expect(st.stamps).toBe(0);
    expect(st.quizAsked).toBe(0);
    expect(st.firstStampAt).toBeNull();
  });
});
