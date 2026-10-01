/**
 * E2E smoke (mức logic, chạy trong CI không cần trình duyệt):
 * đường đi vàng của du khách — quét QR → xác thực → mở điểm → quiz → danh hiệu → finale,
 * + asserts cấu trúc service worker (các nhánh cache từng gây bug: navigate, 206 media).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createHmac } from 'node:crypto';
import { buildSw } from '../scripts/gen-sw.mjs';
import { SITES } from '../src/data/content';
import { QR_SECRET, resolveQrRedirect, signSpot, verifySignature } from '../src/lib/qr';

// progress.ts đọc localStorage lúc import -> shim trước, rồi import động.
const store = new Map<string, string>();
const winListeners = new Map<string, Set<(e: Event) => void>>();
const fired: { type: string; detail: unknown }[] = [];

const mk = () => {
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    },
    window: {
      dispatchEvent: (e: Event) => {
        fired.push({ type: e.type, detail: (e as CustomEvent).detail });
        for (const f of winListeners.get(e.type) ?? []) f(e);
        return true;
      },
      addEventListener: (t: string, f: (e: Event) => void) => {
        winListeners.set(t, new Set([...(winListeners.get(t) ?? []), f]));
      },
      removeEventListener: (t: string, f: (e: Event) => void) => winListeners.get(t)?.delete(f),
      location: { pathname: '/Bainopkhkt/', search: '', hash: '' },
    },
  });
};

const spotIndex = SITES.flatMap((s) => s.spots.map((sp) => ({ entityId: s.entityId, spotId: sp.spotId, qrId: sp.qrId })));

let progress: typeof import('../src/lib/progress');
beforeAll(async () => {
  mk();
  progress = await import('../src/lib/progress');
});

describe('tem QR → hash route (boot redirect)', () => {
  it('tem mới ?q=NN.SIG giải ra đúng điểm qua qrId', () => {
    for (const sp of spotIndex.filter((s) => s.qrId)) {
      const nn = sp.qrId!.replace('mdvq', '');
      expect(resolveQrRedirect(`?q=${nn}.0123456789abcdef`, spotIndex)).toBe(`#/d/${sp.entityId}/${sp.spotId}?s=0123456789abcdef`);
    }
  });
  it('tem cũ ?d=site/spot&s=SIG chuyển hash giữ nguyên sig', () => {
    expect(resolveQrRedirect('?d=van-mieu/khue-van-cac&s=AbCd1234EfGh5678', spotIndex)).toBe('#/d/van-mieu/khue-van-cac?s=AbCd1234EfGh5678');
  });
  it('URL lạ / sig sai định dạng → không redirect', () => {
    expect(resolveQrRedirect('', spotIndex)).toBeNull();
    expect(resolveQrRedirect('?q=abc.xyz', spotIndex)).toBeNull();
    expect(resolveQrRedirect('?q=99.0123456789abcdef', spotIndex)).toBeNull(); // qrId không tồn tại
    expect(resolveQrRedirect('?d=van-mieu', spotIndex)).toBeNull();
  });
});

describe('đường đi vàng: QR → mở điểm → quiz → danh hiệu → finale', () => {
  it('quét tem thật (chữ ký từ qr-sheet) mở điểm đầu tiên', async () => {
    const vm = SITES.find((s) => s.entityId === 'van-mieu')!;
    const sp = vm.spots[0];
    const sig = createHmac('sha256', QR_SECRET).update(sp.qrId!).digest('hex').slice(0, 16);
    expect(await verifySignature(vm.entityId, sp.spotId, sig, sp.qrId)).toBe(true);

    const res = progress.unlockSpot(vm.entityId, sp.spotId);
    expect(res.alreadyUnlocked).toBe(false);
    expect(res.gainedXp).toBe(sp.xp);
    expect(progress.isSpotUnlocked(vm.entityId, sp.spotId)).toBe(true);
    expect(fired.some((e) => e.type === 'mdv:unlock')).toBe(true);
    // Danh hiệu "Khởi hành" (dấu đầu tiên) bắn qua mdv:achievement — trước đây im lặng.
    expect(fired.some((e) => e.type === 'mdv:achievement' && (e.detail as { id: string }).id === 'khoi-hanh')).toBe(true);
  });

  it('quét lại điểm đã mở → alreadyUnlocked, không cộng XP', () => {
    const vm = SITES[0];
    const sp = vm.spots[0];
    const xpBefore = progress.getProgress().xp;
    const res = progress.unlockSpot(vm.entityId, sp.spotId);
    expect(res.alreadyUnlocked).toBe(true);
    expect(progress.getProgress().xp).toBe(xpBefore);
  });

  it('hoàn thành khu → badge + completionBonusXp', () => {
    const vm = SITES[0];
    const before = progress.getProgress().xp;
    let res: ReturnType<typeof progress.unlockSpot> | undefined;
    for (const sp of vm.spots.slice(1)) res = progress.unlockSpot(vm.entityId, sp.spotId);
    expect(res?.siteCompleted).toBe(true);
    expect(res?.newBadge?.id).toBe(vm.gamificationConfig.badge.id);
    expect(progress.getProgress().xp).toBe(before + vm.spots.slice(1).reduce((n, s) => n + s.xp, 0) + vm.gamificationConfig.completionBonusXp);
  });

  it('quiz perfect → XP theo số câu đúng + danh hiệu quiz bắn event', () => {
    const vm = SITES[0];
    const sp = vm.spots.find((s) => s.quiz?.length)!;
    const n = sp.quiz!.length;
    const xpBefore = progress.getProgress().xp;
    const gained = progress.recordQuizResult(vm.entityId, sp.spotId, n, n);
    expect(gained).toBe(n * progress.QUIZ_XP_PER_CORRECT);
    expect(progress.getProgress().xp).toBe(xpBefore + gained);
    expect(progress.quizBest(vm.entityId, sp.spotId)).toBe(n);
    // 1 bộ perfect → "Trạng nguyên" mở khoá ngay, event phải đã bắn.
    expect(fired.some((e) => e.type === 'mdv:achievement' && (e.detail as { id: string }).id === 'trang-nguyen')).toBe(true);
  });

  it('mở hết mọi điểm → sẵn sàng finale (điều kiện Celebrate kiểm tra)', () => {
    const all = SITES.flatMap((s) => s.spots.map((sp) => [s, sp] as const));
    for (const [s, sp] of all) progress.unlockSpot(s.entityId, sp.spotId);
    const total = all.length;
    expect(Object.keys(progress.getProgress().unlocked).length).toBe(total);
    // Mọi khu done — không còn node 'next'/'locked'.
    const st = progress.computeStatuses();
    expect([...st.values()].every((v) => v === 'done')).toBe(true);
  });

  it('revokeAchievement quiz-type → danh hiệu khoá lại', () => {
    progress.revokeAchievement('trang-nguyen');
    const a = progress.computeAchievements().find((x) => x.id === 'trang-nguyen')!;
    expect(a.unlocked).toBe(false);
  });

  it('revokeBadge khu → badge achievement khoá lại', () => {
    const vm = SITES[0];
    progress.revokeBadge(vm.gamificationConfig.badge.id, vm.gamificationConfig.completionBonusXp);
    const a = progress.computeAchievements().find((x) => x.id === vm.gamificationConfig.badge.id)!;
    expect(a.unlocked).toBe(false);
  });
});

describe('service worker (scripts/gen-sw.mjs buildSw)', () => {
  const sw = buildSw({ version: 'testv1', precache: ['/Bainopkhkt/index.html'], base: '/Bainopkhkt' });
  it('navigate: cache.match thực trước khi rơi về OFFLINE_URL', () => {
    expect(sw).toContain("req.mode === 'navigate'");
    expect(sw).toContain('caches.match(req, { ignoreSearch: true })');
    expect(sw).toContain('caches.match(OFFLINE_URL)');
  });
  it('media 206: full-fetch nền cho clip nhỏ + put chỉ khi 200', () => {
    expect(sw).toContain('res.status === 206 && mediaLike');
    expect(sw).toContain('Content-Range');
    expect(sw).toContain('15 * 1024 * 1024');
    expect(sw).toContain('e.waitUntil(');
  });
  it('không cache response lỗi: chỉ put khi 200 hoặc opaque', () => {
    expect(sw).toContain('res.status === 200 || res.type === \'opaque\'');
    expect(sw).not.toContain('res.ok');
  });
  it('precache + version được nhúng', () => {
    expect(sw).toContain("const VERSION = 'testv1'");
    expect(sw).toContain('/Bainopkhkt/index.html');
    expect(sw).toContain('mdv-pre-');
  });
});
