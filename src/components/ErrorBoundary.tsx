/**
 * Chống "trắng màn" giữa demo: một exception render chỉ hạ đúng phần màn hình lỗi,
 * hiện thẻ fallback có nút tải lại + về bản đồ. Lỗi được ghi vào errorlog (D8)
 * để mở Debug HUD đọc lại sau.
 */
import { Component } from 'preact';
import type { ComponentChildren } from 'preact';
import { logError } from '../debug/errorlog';
import { UI, t, getLang } from '../lib/i18n';
import { Icon } from './Icon';

interface Props {
  children: ComponentChildren;
}
interface State {
  err: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error) {
    logError('error', err.message || String(err), err.stack);
  }

  render() {
    const err = this.state.err;
    if (!err) return this.props.children;
    const lang = getLang();
    return (
      <main class="mdv-screen errb" role="alert">
        <div class="mdv-card errb__card">
          <Icon name="warn" size={40} />
          <h1>{t(UI.errTitle, lang)}</h1>
          <p class="mdv-muted">{t(UI.errBody, lang)}</p>
          <div class="errb__actions">
            <button class="mdv-btn mdv-btn--primary" onClick={() => location.reload()}>
              {t(UI.errReload, lang)}
            </button>
            <a
              class="mdv-btn mdv-btn--ghost"
              href="#/map"
              onClick={() => this.setState({ err: null })}
            >
              {t(UI.errHome, lang)}
            </a>
          </div>
          <details class="errb__detail">
            <summary>{err.name}</summary>
            <code>{err.message}</code>
          </details>
        </div>
      </main>
    );
  }
}
