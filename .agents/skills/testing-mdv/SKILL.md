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
- SW sanity: check `getRegistration().active` after a real reload — on some branches install throws `Cache.addAll(): duplicate requests` (`/index.html` in PRECACHE + OFFLINE_URL).
- SVG `tabIndex` on `<g>` is not keyboard-focusable: dispatch `new KeyboardEvent('keydown',{key:'Enter',bubbles:true})` on `g[role=button]` to verify keydown wiring.
- Errorlog introspection: `await import('/src/lib/progress.ts')`/etc. via `Runtime.evaluate` (vite serves source modules; same module instance as the app — `unlockSpot`/`resetProgress`/`getProgress` mutate real state).
- Progress reset: `localStorage.clear()` does NOT clear IndexedDB — use `import('/src/lib/progress.ts').then(m=>m.resetProgress())` + reload.
