import { render } from 'preact';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app';
import { installErrorLog } from './debug/errorlog';
import { initProgress } from './lib/progress';

installErrorLog();
// IndexedDB là nguồn chuẩn (P3): hydrate xong mới render để mọi màn đọc tiến độ đồng bộ.
void initProgress().finally(() => {
  render(<App />, document.getElementById('app')!);
});
