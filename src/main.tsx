import { render } from 'preact';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app';
import { SITES } from './data/content';
import { installErrorLog } from './debug/errorlog';
import { initProgress } from './lib/progress';
import { registerSw } from './lib/sw';

installErrorLog();
registerSw();
// Tem QR in ngoài thực tế dùng URL không-fragment vì một số camera/scanner cắt
// phần sau '#'. Hai dạng: ?q=<nn>.<sig> (ngắn — qrId mdvqNN, tem mới) và
// ?d=site/spot&s=<sig> (tem cũ). Đổi sang hash route trước khi app khởi động.
{
  const q = new URLSearchParams(location.search);
  const compact = q.get('q')?.match(/^(\d+)\.([0-9a-f]{16})$/i);
  if (compact) {
    const qrId = `mdvq${compact[1].padStart(2, '0')}`;
    const found = SITES.flatMap((s) => s.spots.map((sp) => [s, sp] as const)).find(([, sp]) => sp.qrId === qrId);
    if (found)
      location.replace(`${location.pathname}#/d/${found[0].entityId}/${found[1].spotId}?s=${compact[2].toLowerCase()}`);
  } else {
    const dParam = q.get('d');
    if (dParam && /^[\w-]+\/[\w-]+$/.test(dParam)) {
      const sParam = q.get('s');
      location.replace(`${location.pathname}#/d/${dParam}${sParam ? `?s=${encodeURIComponent(sParam)}` : ''}`);
    }
  }
}
// IndexedDB là nguồn chuẩn (P3): hydrate xong mới render để mọi màn đọc tiến độ đồng bộ.
void initProgress().finally(() => {
  const el = document.getElementById('app')!;
  el.innerHTML = ''; // dọn splash boot
  render(<App />, el);
});
