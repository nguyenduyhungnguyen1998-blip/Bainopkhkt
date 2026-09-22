/**
 * Đăng ký service worker (chỉ prod) + hook trạng thái cho D5 / UI cập nhật.
 * SW sinh tự động bởi scripts/gen-sw.mjs sau build – file này chỉ nói chuyện với nó.
 */
import { useEffect, useState } from 'preact/hooks';
import { logError } from '../debug/errorlog';

export type SwStatus = 'unsupported' | 'installing' | 'waiting' | 'active' | 'none';

/** Trạng thái SW hiện tại để HUD/D5 hiển thị. */
export function useSwStatus(): { status: SwStatus; hasUpdate: boolean } {
  const [status, setStatus] = useState<SwStatus>('none');
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return setStatus('unsupported');
    let alive = true;
    const read = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!alive) return;
        if (!reg) return setStatus('none');
        if (reg.waiting) {
          setStatus('waiting');
          setHasUpdate(true);
        } else if (reg.installing) {
          setStatus('installing');
        } else {
          setStatus('active');
          setHasUpdate(false);
        }
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          setStatus('installing');
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              setStatus('waiting');
              setHasUpdate(true);
            }
          });
        });
      } catch (e) {
        logError('manual', 'sw: useSwStatus failed', String(e));
      }
    };
    void read();
    const id = setInterval(read, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return { status, hasUpdate };
}

/** Yêu cầu SW đang chờ chiếm quyền → controllerchange reload trang. */
export function applySwUpdate(): void {
  void navigator.serviceWorker.getRegistration().then((reg) => reg?.waiting?.postMessage('SKIP_WAITING'));
}

/** Xóa mọi cache (khi demo lỗi cache cũ). */
export async function clearSwCaches(): Promise<void> {
  const ks = await caches.keys();
  await Promise.all(ks.filter((k) => k.startsWith('mdv-')).map((k) => caches.delete(k)));
}

/** Gọi một lần ở entry: đăng ký SW + auto reload khi SW mới chiếm quyền. */
export function registerSw(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const url = `${import.meta.env.BASE_URL}sw.js`;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(url).catch((e) => logError('manual', 'sw: register failed', String(e)));
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
  });
}
