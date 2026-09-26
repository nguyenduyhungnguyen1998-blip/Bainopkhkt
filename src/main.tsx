import { render } from 'preact';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app';
import { installErrorLog } from './debug/errorlog';
import { initProgress } from './lib/progress';
import { registerSw } from './lib/sw';

installErrorLog();
registerSw();
// Tem QR in ngoài thực tế dùng URL không-fragment (?d=site/spot&s=sig) vì một số
// camera/scanner cắt phần sau '#'. Đổi sang hash route trước khi app khởi động.
{
  const q = new URLSearchParams(location.search);
  const dParam = q.get('d');
  if (dParam && /^[\w-]+\/[\w-]+$/.test(dParam)) {
    const sParam = q.get('s');
    location.replace(`${location.pathname}#/d/${dParam}${sParam ? `?s=${encodeURIComponent(sParam)}` : ''}`);
  }
}
// IndexedDB là nguồn chuẩn (P3): hydrate xong mới render để mọi màn đọc tiến độ đồng bộ.
void initProgress().finally(() => {
  render(<App />, document.getElementById('app')!);
});
