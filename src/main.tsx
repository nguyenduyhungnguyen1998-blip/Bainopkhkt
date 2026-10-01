import { render } from 'preact';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app';
import { SITES } from './data/content';
import { installErrorLog } from './debug/errorlog';
import { initProgress } from './lib/progress';
import { resolveQrRedirect } from './lib/qr';
import { registerSw } from './lib/sw';
import { installAudioBus } from './lib/audio-bus';

installErrorLog();
registerSw();
installAudioBus();
// Mốc tiến độ khởi động cho thanh tải trên splash (window.__bp gắn trong index.html).
const boot = (v: number) => (window as unknown as { __bp?: (v: number) => void }).__bp?.(v);
boot(45);
// Tem QR in ngoài thực tế dùng URL không-fragment vì một số camera/scanner cắt
// phần sau '#'. Đổi sang hash route trước khi app khởi động.
{
  const spots = SITES.flatMap((s) => s.spots.map((sp) => ({ entityId: s.entityId, spotId: sp.spotId, qrId: sp.qrId })));
  const to = resolveQrRedirect(location.search, spots);
  if (to) location.replace(`${location.pathname}${to}`);
}
// IndexedDB là nguồn chuẩn (P3): hydrate xong mới render để mọi màn đọc tiến độ đồng bộ.
void initProgress().finally(() => {
  boot(90);
  const el = document.getElementById('app')!;
  el.innerHTML = ''; // dọn splash boot
  render(<App />, el);
});
