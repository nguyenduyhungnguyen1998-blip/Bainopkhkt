---
name: testing-mdv
description: How to run & UI-test the Mở Dấu Việt Preact PWA in this repo (dev server, hash routes, CDP mobile emulation, map hit-testing, localStorage state keys, TTS workaround)
---

# Testing "Mở Dấu Việt" (Preact PWA) on this box

## Run
- Dev server: `npm run dev -- --port 5173` (Vite; often already running in a background shell — check `curl -s localhost:5173` first). Serves `src/` live — no rebuild needed for UI testing.
- No login/secrets needed. All state is localStorage + IndexedDB.

## URLs & flags
- Hash router: `#/map`, `#/passport`, `#/quiz`, `#/settings`, `#/d/<siteId>[/<spotId>]`, `#/admin`. `#/d/<site>` (no spot) = destination intro; with spot = spot page.
- Query params go BEFORE the hash: `?debug=1#/map`, `?theme=dark#/map`. `?debug=1` persists via `localStorage mdv.debug` — clean up with `?debug=0`.
- Signed scan URLs (real QR path): navigate to `http://localhost:5173/?q=<NN>.<sig>` — `main.tsx` redirects to `#/d/<site>/<spot>?s=<sig>` before the app renders (tests the full visitor flow). Or build `#/d/<site>/<spot>?s=<sig>` directly in the hash query. Generate sigs via `node scripts/sign-qr.mjs`.
- NO `?lang=` param exists — language only via UI chips / `mdv.lang`. Set `mdv.lang` BEFORE loading a scan URL or ScanConfirm shows the language gate instead.

## localStorage keys (reset between runs)
`mdv.seen` (onboarding gate), `mdv.progress.v1` (unlocks/XP/badges), `mdv.lang`, `mdv.theme`, `mdv.debug`, `mdv.exploreMode`, `mdv.welcomed` (welcome modal), `mdv.hintDone` (hint chip). Clear + reload to replay onboarding.

## Mobile viewport via CDP (browser on :29229)
Chrome headful min width ~500px — for mobile emulation use CDP:
- `websocket-client` python pkg needed (`pip3 install websocket-client`); MUST pass `suppress_origin=True` to `create_connection` or Chrome 403s the WS handshake.
- `Emulation.setDeviceMetricsOverride {width, height, deviceScaleFactor:1, mobile:true}` → page renders top-left of window.
- **`Emulation.setDeviceMetricsOverride` is SESSION-scoped** — re-apply on EVERY new connection.
- **Screen-recording trick**: with `--force-device-scale-factor=2` the physical window is only ~561 CSS px tall, so a 390x844 emulated page is clipped below y≈561 (bottom sheet/dock invisible on screen, though `Page.captureScreenshot` still captures the full emulated viewport). Emulate **390x560** when you need bottom-anchored UI (site sheet "Khám phá", dock) visible in a screen recording.
- `Page.captureScreenshot` returns clean phone-frame PNGs; `Input.dispatchMouseEvent` coords are CSS px of the emulated viewport.
- **Clicks outside the emulated viewport silently no-op** — `elementFromPoint` returns null there. Always `scrollIntoView({block:'center'})` the target, re-fetch its `getBoundingClientRect`, then dispatch. Same-URL `Page.navigate` does NOT reload — use `Page.reload`.
- `create_connection` defaults to a blocking `recv()` — call `ws.settimeout(n)`.

## TTS / audio-card gotchas
- This box has **0 TTS voices** → utterances error instantly → cards hit the `failed` fallback (`.dcard__notice` + open scriptwrap). To exercise a durable `playing` state (e.g. pause/resume, ambient-toggle regressions), inject a mock BEFORE pressing Nghe:
  `speechSynthesis.speak = u => { window.__utt=u; setTimeout(()=>!u.__dead && u.onstart && u.onstart(), 30); }; speechSynthesis.cancel = () => { if (window.__utt) window.__utt.__dead = true; }; speechSynthesis.pause = speechSynthesis.resume = () => {};`
  The card then shows `Tạm dừng`, `data-reading`, progress>0 until `player.stop()`.
- Audio cards: `.dcard--audio`; play btn `.dcard__playbtn` (aria-pressed), ambient chip `.dcard--audio .mdv-chip[aria-pressed]`, script `ol.dcard__script[data-reading]`, bar `.dcard__progbar[aria-valuenow]`. Spots with a recorded file (`card.src`, e.g. van-mieu-mon) render an `<audio>` instead of TTS — pick a `src`-less spot for the TTS path.

## Map-specific gotchas
- Node tap targets: use `.vnode__hit` circle's `getBoundingClientRect()` center — the `<g>` bbox includes the label text.
- Tap detection: <350ms and <6px move → tap; longer = pan. Sheet grip: drag up>60px→expand 90dvh, down>120px from full→peek, down>90px from peek→close. Plain tap on grip = expand.
- Zooming beyond k=4.6 near a multi-spot site auto-opens the level-2 site map (`svg.smap`).
- After zooming, `.mscreen__chipbtn--home` ("Về hành trình") may appear over the node — `elementFromPoint` before tapping, or click the chip to re-center on the next node first.
- Transient anims (onboarding draw ~1.6s, unlock ripple ~1.4s, toast ~2.4s): use `Page.captureScreenshot` at timed offsets.
- Journey "draw-in" uses `pathLength={1}` + dashoffset. Verify via `p.getAnimations()[0].currentTime`.

## Debug HUD & P3 tools
- Debug HUD starts EXPANDED on every fresh page load and covers the right ~65% including `.mscreen__zoomctl` — collapse via `.hud__toggle` before tapping anything bottom-right.
- Hidden `<input type=file>` (passport import): `DOM.getDocument` → `DOM.querySelector` → `DOM.setFileInputFiles` fires the real change handler. Buttons in the import preview may render below the emulated fold — scrollIntoView first.
- Downloads (passport export): `Browser.setDownloadBehavior` on the BROWSER websocket with `downloadPath`.
- lang change needs a REAL `Page.reload` (module-level cache). Same for `mdv.theme`.
- SW sanity: check `getRegistration().active` after a real reload. A past bug where install threw `Cache.addAll(): duplicate requests` from `/index.html` being both in PRECACHE and OFFLINE_URL was fixed via a Set dedupe in gen-sw — verify `new Set(` in `dist/sw.js` before assuming offline works.
- SVG `<g>` nodes ARE keyboard-focusable in current builds (`tabindex={0}` lowercased attr): Tab order = filter chips → `.mscreen__searchbtn` → `.vnode g[role=button]` ×N → zoom ×3 → dock links ×4 → BODY. `.focus()` works; Enter/Space via real `Input.dispatchKeyEvent` or dispatched `KeyboardEvent` opens the sheet. If Tab skips expected items, check `document.activeElement` first — `.focus()` calls persist across evals and your sequence may start mid-order.
- Errorlog introspection: dev = `await import('/src/lib/progress.ts')`/etc. via `Runtime.evaluate` (vite serves source modules; same module instance as the app — `unlockSpot`/`resetProgress`/`getProgress` mutate real state). Production build has no `/src/` modules → read `localStorage.getItem('mdv.errors.v1')` (200-entry ring buffer, includes manual `logError` calls like `speechSynthesis: synthesis-failed`).
- Progress reset: `localStorage.clear()` does NOT clear IndexedDB — use `import('/src/lib/progress.ts').then(m=>m.resetProgress())` + reload.

## Production build (dist/) testing
- Serve dist statically (`python3 -m http.server` at a dir containing the build, symlinked under the repo's base path e.g. `/tmp/site/Bainopkhkt -> dist`) — `vite preview` serves `sw.js` with wrong MIME → SW fails falsely.
- Progress lives in IndexedDB `mdv` (localStorage `mdv.progress.v1` is only a mirror). Reset = `localStorage.clear()` + `indexedDB.deleteDatabase('mdv')` + reload — localStorage.clear() alone leaves progress intact.
- Signed QR scan URLs: `?q=NN.<sig>` (NN = spot num, sig = HMAC-SHA256("mdvqNN","mdv-qr-v1")[:16] — generate w/ `node scripts/sign-qr.mjs`); boot rewrites to `#/d/<site>/<spot>?s=<sig>`. Legacy `?d=site/spot&s=<sig>` converges to same path. Bad sig → `.dscan--bad` alert.
- Navigating to `?q=` URLs: `Page.navigate` reply can be lost (in-page `location.replace` + SW reload storms). Fire nav, don't await reply, verify `location.hash` after ~4.5s silent settle before any `Runtime.evaluate` (eval during boot context-destroy hangs). Wrap evals in retry-on-timeout (3×, 1.2s backoff).
- Top-level `const`/`let` in a Runtime.evaluate persist across evals in the same session → wrap eval bodies in `(()=>{...})()` to avoid "already been declared".
- `.mscreen__searchbtn` can be clipped offscreen in the horizontal `.mscreen__filters` row → `scrollTo({left:300, behavior:'instant'})` on the row before `tap_sel`.
- `Browser.setDownloadBehavior`: omit `browserContextId` (passing null errors); blob downloads land in `~/Downloads` regardless of `downloadPath` — check there.
- DemoDock (`.demodock`) only mounts after `localStorage mdv.admin=1` (set by visiting `#/admin`) — then FAB floats over ALL screens; `removeItem` + `dispatchEvent(new Event('mdv:demo-dock'))` to unmount without reload. Never exposed via guest nav links. FAB toggle is pointer-driven (`onPointerDown` → window `pointerup` listener, with `setPointerCapture`) — synthetic `.click()`/dispatched `PointerEvent` fail (`setPointerCapture` throws on fake pointerIds); use real `Input.dispatchTouchEvent`.
- Manual QR code: search modal has `.msearch__code` input — enter the 16-char sig, press "Nhận dấu" → routes to `#/d/…?s=<sig>` (already-unlocked spots show "Vào trang điểm" CTA).
- Native `confirm()`/`alert()` (dock "Gỡ hết"/"Xóa quiz"/"Reset hành trình", app reset buttons) blocks the whole JS thread — every subsequent eval hangs. Hook `window.confirm = () => true` BEFORE clicking, and re-hook after every navigation.
