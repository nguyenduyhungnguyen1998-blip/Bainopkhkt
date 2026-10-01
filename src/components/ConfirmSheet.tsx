/**
 * Hộp xác nhận trong app — thay confirm() trình duyệt: giữ ngữ cảnh màn hình,
 * đọc được bởi trình đọc màn (alertdialog), Esc/backdrop để hủy, nút xác nhận tự focus.
 * Dùng: const [ask, setAsk] = useState<ConfirmAsk | null>(null);
 *       <ConfirmSheet ask={ask} lang={lang} onClose={() => setAsk(null)} />
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Lang } from '../data/types';
import { UI, t } from '../lib/i18n';
import './confirm.css';

export interface ConfirmAsk {
  title: string;
  body?: string;
  /** Nhãn nút xác nhận (mặc định "Đồng ý"). */
  ok?: string;
  /** true = hành động hủy dữ liệu → nút tô đỏ. */
  danger?: boolean;
  act: () => void;
}

export function useConfirm() {
  const [ask, setAsk] = useState<ConfirmAsk | null>(null);
  return { ask, setAsk };
}

export function ConfirmSheet({ ask, lang, onClose }: { ask: ConfirmAsk | null; lang: Lang; onClose: () => void }) {
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ask) okRef.current?.focus();
  }, [ask]);
  useEffect(() => {
    if (!ask) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ask, onClose]);
  if (!ask) return null;
  return (
    <div class="finale confirm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="finale__card confirm__card" role="alertdialog" aria-modal="true" aria-label={ask.title}>
        <h2 class="confirm__title">{ask.title}</h2>
        {ask.body && <p class="confirm__body">{ask.body}</p>}
        <div class="confirm__btns">
          <button class="mdv-btn mdv-btn--ghost" onClick={onClose}>
            {t(UI.cancel, lang)}
          </button>
          <button
            ref={okRef}
            class={`mdv-btn ${ask.danger ? 'confirm__ok--danger' : 'mdv-btn--primary'}`}
            onClick={() => {
              ask.act();
              onClose();
            }}
          >
            {ask.ok ?? t(UI.confirm, lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
