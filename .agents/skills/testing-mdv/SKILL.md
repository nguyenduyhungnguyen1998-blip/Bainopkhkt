---
name: testing-mdv
description: How to run & UI-test the Mở Dấu Việt Preact PWA in this repo (dev server, hash routes, CDP mobile emulation, map hit-testing, localStorage state keys)
---

# Testing "Mở Dấu Việt" (Preact PWA) on this box

## Run
- Dev server: `npm run dev -- --port 5173` (Vite; often already running in a background shell — check `curl -s localhost:5173` first). Serves `src/` live — no rebuild needed for UI testing.
- No login/secrets needed. All state is localStorage.

## URLs & flags
- Hash router: `#/map`, `#/passport`, `#/quiz`, `#/settings`, `#/d/<siteId>[/<spotId>]`. `#/d/<site>` (no spot) = destination intro; with spot = spot page.
- Query params go BEFORE the hash: `?debug=1#/map`, `?theme=dark#/map`. `?debug=1` persists via `localStorage mdv.debug` — clean up with `?debug=0`.
- NO `?lang=` param exists — language only via UI chips / `mdv.lang`.

## localStorage keys (reset between runs)
`mdv.seen` (onboarding gate), `mdv.progress.v1` (unlocks/XP/badges), `mdv.lang`, `mdv.theme`, `mdv.debug`, `mdv.exploreMode`. Clear via CDP `Runtime.evaluate` `localStorage.clear()` then reload to replay onboarding.

## Mobile viewport via CDP (browser on :29229)
Chrome headful min width ~500px — for 390px mobile use CDP emulation:
- `websocket-client` python pkg needed (`pip3 install websocket-client`); MUST pass `suppress_origin=True` to `create_connection` or Chrome 403s the WS handshake.
- `Emulation.setDeviceMetricsOverride {width:390, height:844, deviceScaleFactor:1, mobile:true}` → page renders top-left of window.
- **`Emulation.setDeviceMetricsOverride` is SESSION-scoped** — the override is cleared when the WS connection closes. Re-apply it on EVERY new connection (wrap it in your connect helper), or later evals/screenshots silently run at desktop width.
- `Page.captureScreenshot` returns clean phone-frame PNGs (better evidence than desktop screenshots); `Input.dispatchMouseEvent` coords are CSS px of the emulated viewport.
- `create_connection` defaults to a blocking `recv()` — call `ws.settimeout(n)` or evals that never settle (e.g. destroyed by an in-page reload) hang forever with no error.

## Map-specific gotchas
- Node tap targets: use `.vnode__hit` circle's `getBoundingClientRect()` center — the `<g>` bbox includes the label text, its center is NOT on the node.
- Tap detection: <350ms and <6px move → tap; longer = pan. Sheet grip: drag up>60px→expand 90dvh, down>120px from full→peek, down>90px from peek→close. Plain tap on grip = expand.
- Zooming beyond k=4.6 near a multi-spot site auto-opens the level-2 site map — avoid deep zoom when testing pan/"Về hành trình" on level 1.
- Transient anims (onboarding draw ~1.6s, unlock ripple ~1.4s, toast ~2.4s): screenshot latency of the computer tool may miss them — use `Page.captureScreenshot` at timed offsets instead.
- Journey "draw-in" uses `pathLength={1}` + `stroke-dasharray`/`strokeDashoffset` (path-space units, not px). To verify it live: sample `getComputedStyle(p).strokeDashoffset` right after an unlock via `p.getAnimations()[0].currentTime` — mid-animation values ≠0 prove the draw is rendering (screenshots alone can be ambiguous at low zoom).

## Debug HUD & P3 tools
- Debug HUD starts EXPANDED on every fresh page load (`useState(true)` — route-change auto-collapse only fires on in-app hashchange). It covers the right ~65% INCLUDING the bottom-right `.mscreen__zoomctl` buttons and can sit over map nodes — always collapse via `.hud__toggle` (or verify `.hud.hud--min` in DOM) before tapping anything bottom-right, and hit-test with `elementFromPoint` before clicking. HUD also overflows past 844px viewport — D3/D4 buttons below fold need a taller `setDeviceMetricsOverride` (e.g. 390x1400) to click with real input.
- Hidden `<input type=file>` (passport import): drive via CDP `DOM.enable` → `DOM.getDocument` → `DOM.querySelector` → `DOM.setFileInputFiles` — fires the real change handler.
- Downloads (passport export): enable via `Browser.setDownloadBehavior` on the BROWSER websocket (`/json/version` → webSocketDebuggerUrl) with `downloadPath` — `Page.setDownloadBehavior` alone may not capture.
- lang change needs a REAL `Page.reload` (module-level cache) — hash navigation won't re-init; localStorage.setItem('mdv.lang','en') + reload.
- Same for `mdv.theme` — the inline boot script in index.html only applies it at document load.
- Settings theme chips are labelled `Nguyệt Quang (tối)` / `Thái Dương (sáng)` — don't grep for plain 'Sáng'/'Tối'.
- SW sanity: don't trust `register()` resolving — check `getRegistration().active` after a real reload. A registration object with all-null workers = install failed. (A past bug where install threw `Cache.addAll(): duplicate requests` from `/index.html` being both in PRECACHE and OFFLINE_URL was fixed via a Set dedupe in gen-sw — verify `new Set(` in `dist/sw.js` before assuming offline works.)
- SVG `<g>` nodes ARE keyboard-focusable in current builds (`tabindex="0"` lowercased attr): Tab order = filter chips → `.mscreen__searchbtn` → `.vnode g[role=button]` ×N → zoom ×3 → dock links ×4 → BODY. `.focus()` works; Enter/Space via real `Input.dispatchKeyEvent` or dispatched `KeyboardEvent` opens the sheet. If Tab skips expected items, check `document.activeElement` first — `.focus()` calls persist across evals and your sequence may start mid-order.
- `?debug=1` needs query BEFORE hash: `?debug=1#/map`. Signed scan URLs: `#/d/<site>/<spot>?s=<sig>` — generate via `node scripts/sign-qr.mjs`.
- This box has 0 TTS voices → utterances error instantly → cards/probe hit the fallback path; to verify real playback you'd need espeak voices.
- Errorlog introspection: dev = `await import('/src/debug/errorlog.ts').then(m=>m.getErrors())` in Runtime.evaluate; production build has no `/src/` modules → read `localStorage.getItem('mdv.errors.v1')` (200-entry ring buffer, includes manual `logError` calls like `speechSynthesis: synthesis-failed`).

## Production build (dist/) testing
- Serve dist statically (`python3 -m http.server` at a dir containing the build) — `vite preview` serves `sw.js` with wrong MIME → SW fails falsely.
- Progress lives in IndexedDB `mdv` (localStorage `mdv.progress.v1` is only a mirror). Reset = `localStorage.clear()` + `indexedDB.deleteDatabase('mdv')` + reload — localStorage.clear() alone leaves progress intact.
- Signed QR scan URLs: `?q=NN.<sig>` (NN = spot num, sig = HMAC-SHA256("mdvqNN","mdv-qr-v1")[:16] — generate w/ `node scripts/sign-qr.mjs`); boot rewrites to `#/d/<site>/<spot>?s=<sig>`. Legacy `?d=site/spot&s=<sig>` converges to same path. Bad sig → `.dscan--bad` alert.
- Navigating to `?q=` URLs: `Page.navigate` reply can be lost (in-page `location.replace` + SW reload storms). Fire nav, don't await reply, verify `location.hash` after ~4.5s silent settle before any `Runtime.evaluate` (eval during boot context-destroy hangs). Wrap evals in retry-on-timeout (3×, 1.2s backoff).
- Top-level `const`/`let` in a Runtime.evaluate persist across evals in the same session → wrap eval bodies in `(()=>{...})()` to avoid "already been declared".
- `.mscreen__searchbtn` can be clipped offscreen in the horizontal `.mscreen__filters` row → `scrollTo({left:300, behavior:'instant'})` on the row before `tap_sel`.
- `Browser.setDownloadBehavior`: omit `browserContextId` (passing null errors); blob downloads land in `~/Downloads` regardless of `downloadPath` — check there.
- DemoDock (`.demodock`) only mounts after `localStorage mdv.admin=1` (set by visiting `#/admin`) — then FAB floats over ALL screens; `removeItem` + `dispatchEvent(new Event('mdv:demo-dock'))` to unmount without reload. Never exposed via guest nav links.
- Manual QR code: search modal has `.msearch__code` input — enter the 16-char sig, press "Nhận dấu" → routes to `#/d/…?s=<sig>` (already-unlocked spots show "Vào trang điểm" CTA).

## P4/P5-era gotchas
- `mdv.hintDone` gate: onboarding hint chip (`.mhint`, NOT `.mscreen__hint`) persists until first node tap; reset = `localStorage.removeItem('mdv.seen')` + `localStorage.removeItem('mdv.hintDone')` + reload.
- Map zoom level: read the `transform` ATTRIBUTE on `.vmap__world` (`translate(...) scale(k)`) or inline `--k` — `style.transform` is empty (SVG attr, not CSS).
- Zoom buttons `.mscreen__zoombtn` sit behind the open bottom sheet (`msheet__head` intercepts) — close sheet via `.msheet__close` first.
- Same-URL `Page.navigate` does NOT reload — hop via `about:blank` or use `Page.reload {ignoreCache:true}` to re-import modules (e.g. after editing a served data JSON).
- Video offline hint (`UI.videoOffline`) only renders for cards with `src` — NO shipped card has `src`/`poster` (dead branch as shipped); to verify, inject `"src"`/`"poster"` into a `layoutSchema` video card in `src/data/sites/*.json`, hard-reload, emulate offline (`Network.emulateNetworkConditions` + `dispatchEvent(new Event('offline'))`), then `git checkout` the file.
- Progress reset: `localStorage.clear()` does NOT clear IndexedDB progress — use `import('/src/lib/progress.ts').then(m=>m.resetProgress())` + reload.
