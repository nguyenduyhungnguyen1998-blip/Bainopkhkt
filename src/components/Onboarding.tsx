import { createPortal } from 'preact/compat';
import { useEffect } from 'preact/hooks';
import { UI, t, type Lang } from '../lib/i18n';
import { routeHref } from '../lib/router';
import { goCard, goTour } from '../lib/tour';
import { asset } from '../lib/asset';
import { Icon } from './Icon';
import './tour.css';

/** Ẩn banner cập nhật/offline suốt lúc overlay mở — không chen khoảnh khắc onboarding. */
function useOverlayFlag() {
  useEffect(() => {
    document.documentElement.dataset.overlay = '1';
    return () => {
      delete document.documentElement.dataset.overlay;
    };
  }, []);
}

/** Màn chào lần đầu: hỏi khách đã biết dùng chưa → đi thẳng vào hoặc xem tour. */
export function WelcomeModal({ lang, onKnow, onTour }: { lang: Lang; onKnow: () => void; onTour: () => void }) {
  useOverlayFlag();
  // Portal ra body — xem ghi chú stacking-context (.mscreen z1 < dock z80) trong Tour.tsx.
  return createPortal(
    <div class="ob__back" role="dialog" aria-modal="true" aria-label={t(UI.welcomeTitle, lang)}>
      <div class="ob__card">
        <span class="ob__sticker" aria-hidden="true">
          <img class="ob__mascot" src={asset('img/mascot.webp')} alt="" />
        </span>
        <h2 class="ob__title">{t(UI.welcomeTitle, lang)}</h2>
        <p class="ob__ask">{t(UI.welcomeAsk, lang)}</p>
        <div class="ob__ctl">
          <button class="mdv-btn mdv-btn--primary" onClick={onTour}>
            <Icon name="compass" size={19} /> {t(UI.welcomeNo, lang)}
          </button>
          <button class="mdv-btn mdv-btn--ghost" onClick={onKnow}>
            {t(UI.welcomeYes, lang)}
          </button>
        </div>
        <p class="ob__foot">{t(UI.welcomeFoot, lang)}</p>
      </div>
    </div>,
    document.body
  );
}

/** Menu nút ?: mở lại tour tương tác, thẻ 3 bước nhanh hoặc trang trợ giúp đầy đủ.
    Dùng được ở mọi màn — tour/thẻ tự điều hướng về bản đồ khi cần. */
export function HelpMenu({
  lang,
  onClose,
  onTour = goTour,
  onCard = goCard,
  tourTitle = UI.helpMenuTour,
  tourSub = UI.helpMenuTourSub,
}: {
  lang: Lang;
  onClose: () => void;
  onTour?: () => void;
  onCard?: () => void;
  /** Nhãn của lựa chọn tour — đổi khi ? ở tab khác chạy tour riêng của tab đó. */
  tourTitle?: { vi: string; en: string };
  tourSub?: { vi: string; en: string };
}) {
  useOverlayFlag();
  return createPortal(
    <div class="ob__back" role="dialog" aria-modal="true" aria-label={t(UI.helpMenuTitle, lang)} onClick={onClose}>
      <div class="ob__menu" onClick={(e) => e.stopPropagation()}>
        <h3 class="ob__menutitle">{t(UI.helpMenuTitle, lang)}</h3>
        <button class="ob__opt" onClick={onTour}>
          <span class="ob__opticon">
            <Icon name="compass" size={20} />
          </span>
          <span class="ob__optxt">
            <b>{t(tourTitle, lang)}</b>
            <small>{t(tourSub, lang)}</small>
          </span>
          <Icon name="forward" size={17} />
        </button>
        <button class="ob__opt" onClick={onCard}>
          <span class="ob__opticon">
            <Icon name="book" size={20} />
          </span>
          <span class="ob__optxt">
            <b>{t(UI.helpMenuCard, lang)}</b>
          </span>
          <Icon name="forward" size={17} />
        </button>
        <a class="ob__opt" href={routeHref.help} onClick={onClose}>
          <span class="ob__opticon">
            <Icon name="help" size={20} />
          </span>
          <span class="ob__optxt">
            <b>{t(UI.helpMenuHelp, lang)}</b>
          </span>
          <Icon name="forward" size={17} />
        </a>
      </div>
    </div>,
    document.body
  );
}
