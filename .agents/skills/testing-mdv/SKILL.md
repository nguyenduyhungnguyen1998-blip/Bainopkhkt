---
name: testing-mdv
description: E2E test conventions for the Mở Dấu Việt Preact PWA — dev server, CDP emulation, real QR boot, progress module gotchas, offline SW testing, input dispatch quirks.
---

# Testing Mở Dấu Việt (mo-dau-viet PWA)

## Environment
- Repo: `/home/ubuntu/repos/Bainopkhkt`. Dev server: `npm run dev -- --port 5173` (check `curl localhost:5173` first).
- Chrome headful with CDP on `localhost:29229` (`/json` → page ws). Python `websocket-client` (needs `suppress_origin=True`).
- Physical window shows ~561 CSS px at DSF=2 → emulate **390×560** (`Emulation.setDeviceMetricsOverride`) so bottom-anchored UI (sheets/dock/FAB) is visible in recordings. `Page.captureScreenshot` still captures the full emulated viewport.
- Mobile-viewport geometry checks belong at 390px; layout math differs at 844 — measure BOTH before calling something a bug.

## Baseline state
- `localStorage`: `mdv.lang='vi'`, `mdv.seen`, `mdv.hintDone`, `mdv.welcomed` (set BEFORE scanning `?s=`/`?q=` URLs — else ScanConfirm shows the language gate first).
- Reset progress: `import(...).then(m=>m.resetProgress())` — see module-URL gotcha below.

## Module gotchas (important)
- **Progress lives in IndexedDB `mdv` (store `progress`), NOT localStorage.** `localStorage.clear()` does not reset progress.
- **Vite `?t=` versioning splits module instances.** After HMR, the app imports `src/lib/progress.ts?t=<ts>` while a bare `import('/src/lib/progress.ts')` creates a SECOND, empty module record — `getProgress()` then reads a fresh EMPTY state even though the app unlocked spots. Always resolve the app's real URL:
  `performance.getEntriesByType('resource').map(r=>r.name).filter(n=>n.includes('src/lib/progress.ts')).filter(n=>n.includes('?t=')).pop()` then `import(that)`. Same for `src/data/content.ts` (`m.getSpot(site,spot).spot` — returns `{site,spot}`, not the spot itself).
- On a **prod build** there are no `/src/*.ts` modules — read progress via IDB or UI only.

## QR testing
- Real tags from `public/qr-sheet.html`: compact `/?q=NN.SIG` (qrId `mdvqNN`) and old `?d=site/spot&s=SIG` — both resolve via `resolveQrRedirect` to `#/d/site/spot?s=sig`. Unknown qrId → no redirect (lands on map).
- ScanConfirm: `.dpick` = valid (aspects + CTA "Nhận dấu & xem tổng quan (+N XP)"); `.dscan--bad` = invalid; missing `s` → no panel. Re-scan → "Bạn đã nhận dấu điểm này rồi — không cộng XP lần nữa" + CTA "Vào trang điểm".
- On a **fresh origin** (e.g. prod build on :8080) expect the language gate inside `.dscan` first.
- Unlock toast `.dtoast__txt` "Đã nhận dấu: <name>+<xp> XP · Tổng <total> XP" (+ possible badge suffix).

## Input dispatch quirks (CDP)
- Clicks at `getBoundingClientRect` centers via `Input.dispatchMouseEvent` (real pointer pipeline).
- **Clicks outside the emulated viewport silently no-op** — `scrollIntoView({block:'center'})`, re-fetch rect, then click.
- **Short-viewport occlusion**: at ≤560px the `.mdv-dock` covers the `.dscan__cta` bottom (dock y478-544 vs CTA y484-524). Scroll `.dpick__panel` to bottom first, then click the CTA's uncovered top sliver (`dock.top - 4`). NOT a bug at 844.
- **Keyboard activation**: Enter/Space on a button fires `click` with `detail===0`. `Input.dispatchKeyEvent` type `rawKeyDown` does NOT run default actions — use `keyDown`. Enter clicks on keyDOWN, Space on keyUP. The demo FAB toggles via `e.detail===0` clicks.

## Offline / prod build
- `npm run build -- --base=/Bainopkhkt/` (base REQUIRED for SW/precache paths) → `ln -sfn dist /tmp/serve/Bainopkhkt` → `python3 -m http.server 8080 -d /tmp/serve`. SW: `getRegistration().active` + `controller` before going offline.
- `Network.emulateNetworkConditions{offline:true}` works fine WITH an active SW — `caches.match` runs inside the worker, not the network. qr-sheet.html serves (precached, 10 inline SVG QRs), `?q=` URLs get index.html via OFFLINE_URL → full scan→verify→stamp works offline (WebCrypto needs no network).
- Block a resource class with `Network.setBlockedURLs` (e.g. `*m4a*` → exercises the audio-error → TTS-fallback path). Unblock with `urls:[]` after.
- `PRECACHE` may overlap `OFFLINE_URL` — install must dedupe before `addAll`: verify `new Set(` in `scripts/gen-sw.mjs` AND in `dist/sw.js`.
- Prod errorlog: window.onerror/unhandledrejection record into `mdv.errors.v1` localStorage (200-entry ring) even on prod builds — read it via eval to inspect errors without DevTools attached during a field demo.
- `?q=`/`?d=` navigation: a Location nav may not reply within its timeout — the nav still proceeds; drive post-nav evals with a retry-on-timeout loop (5s).
- Manual QR entry without a camera: open the map filters strip, type the 6-hex code in `.msearch__code` → ScanConfirm panel (same gate as a real tag — set `mdv.lang` first).
- `.msearch__filters` row: `.mscreen__searchbtn` can be clipped at 390px (observed in a build) — verify before asserting the search button is gone.

## TTS / voices
- Box has **0 TTS voices** → real "Nghe" lands in `failed` fallback. For durable `playing`: `speechSynthesis.speak=u=>{window.__utt=u;setTimeout(()=>!u.__dead&&u.onstart&&u.onstart(),30)}; cancel=()=>{if(window.__utt)window.__utt.__dead=true}; pause=resume=()=>{}`.
- Playing state: `.dcard__playbtn` text "Tạm dừng" + aria-pressed, `.dcard__script[data-reading]`, progressbar valuenow>0.

## Demo dock / admin
- Enable: visit `#/admin` (mount calls `enableDemoDock` → `mdv.admin` LS flag). FAB `.demodock__fab` (tap toggles; keyboard via detail===0 click). FAB taps run through `onPointerDown`→`startDrag`→`setPointerCapture(pointerId)` — synthetic PointerEvents with fake pointerIds throw and the tap never registers; use real `Input.dispatchTouchEvent`/`dispatchMouseEvent`, or `el.click()` (detail===0 path). Panel `.demodock__panel`; ctx `.dd__ctx` + `.dd__fold` (▸/▾, `--fold` class). ConfirmSheet `.confirm__card[role=alertdialog]` — Esc/Hủy/confirm; NOT a browser dialog. Achievements under "XP" tab (`●`/`○` + "Thu hồi"/"Đạt luôn").
- `relockAll` refunds each spot's raw `spot.xp` (NOT badge bonuses) — "Gỡ hết" on N stamped spots → xp drops by sum of raw xp; quizDone + badges kept.
- **Known bug observed 2025-10**: `defaultPos` (innerHeight-156) overlaps the map counter (~32×25px) at 560 AND 844 — verify it got fixed before asserting FAB clears the counter.

## Celebrate / achievements
- `mdv:achievement` → `.mbadge` banner "Huy hiệu mới: <name>" (+ `.celebrate` confetti). Fire order seen: Khởi hành (1st stamp) → Lữ khách (3rd) → Sĩ tử Thăng Long (site complete, +100 bonus XP) → Trạng nguyên (perfect quiz). Site badge bonus counts in toast XP but is NOT refunded by relockAll.
- Quiz UI: `.quiz__opt` (shuffled per play via `orders`), `.quiz__mark` Đúng!/mark, next button `.mdv-card .mdv-btn--primary`, done `.quiz__result` + "Chơi lại" (reshuffles). Record DOM order of a question's options across plays to prove shuffle (4 opts → P(same)=1/24; draw ≥3).

## Map-specific gotchas
- Node tap targets: use `.vnode__hit` circle's `getBoundingClientRect()` center — the `<g>` bbox includes the label text.
- Tap detection: <350ms and <6px move → tap; longer = pan. Sheet grip: drag up>60px→expand 90dvh, down>120px from full→peek, down>90px from peek→close. Plain tap on grip = expand.
- Zooming beyond k=4.6 near a multi-spot site auto-opens the level-2 site map (`svg.smap`).
- After zooming, `.mscreen__chipbtn--home` ("Về hành trình") may appear over the node — `elementFromPoint` before tapping, or click the chip to re-center first.
- Transient anims (onboarding draw ~1.6s, unlock ripple ~1.4s, toast ~2.4s): use `Page.captureScreenshot` at timed offsets.
- Journey "draw-in" uses `pathLength={1}` + dashoffset. Verify via `p.getAnimations()[0].currentTime`.

## Audio-card selectors
- `.dcard--audio`; play btn `.dcard__playbtn` (aria-pressed), ambient chip `.dcard--audio .mdv-chip[aria-pressed]`, script `ol.dcard__script[data-reading]`, bar `.dcard__progbar[aria-valuenow]`.
- Spots with a recorded file (`card.src`, e.g. van-mieu-mon) render `<audio>` instead of TTS — pick a `src`-less spot for the TTS path. File-error state: `.dcard__recnote[role="alert"]` + "Thử lại"/"Dùng giọng đọc tự động".

## Debug HUD & misc tools
- Debug HUD starts EXPANDED on every fresh page load and covers the right ~65% including `.mscreen__zoomctl` — collapse via `.hud__toggle` before tapping bottom-right.
- Hidden `<input type=file>` (passport import): `DOM.getDocument` → `DOM.querySelector` → `DOM.setFileInputFiles` fires the real change handler.
- Downloads (passport export): `Browser.setDownloadBehavior` on the BROWSER websocket with `downloadPath`.
- lang change needs a REAL `Page.reload` (module-level cache). Same for `mdv.theme`. Same-URL `Page.navigate` does NOT reload — always `Page.reload` or navigate elsewhere first.
- SVG `tabindex={0}` on `<g>` DOES make it keyboard-focusable — `g[role=button][tabindex="0"]` joins Tab order; drive real Enter/Space with `Input.dispatchKeyEvent` keyDown/keyUp (KeyboardEvent only verifies the handler wiring, not focusability).
- Errorlog introspection via `await import(<resolved ?t= url>)` — see module-URL gotcha above; a bare `/src/*.ts` import reads an empty twin module.
- Evals that `const`-declare a name twice die with `already been declared` — wrap in `(()=>{...})()`/`(async()=>{...})()`.
