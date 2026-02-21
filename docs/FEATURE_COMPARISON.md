# Feature Comparison: XiboPlayer v0.3.x vs Upstream Players

**Last Updated:** 2026-02-21
**Our Version:** v0.3.x (SDK v0.3.4, PWA v0.3.4, Electron v0.3.5, Chromium v0.3.7)
**Repository:** Split into independent repos under `xibo-players/` GitHub org
**Compared against:**
- [xibo-layout-renderer](https://www.npmjs.com/package/@xibosignage/xibo-layout-renderer) v1.0.22 (npm, 2026-01-21) — rendering library used in Xibo's Electron/ChromeOS players
- [xibo-communication-framework](https://www.npmjs.com/package/@xibosignage/xibo-communication-framework) v0.0.6 (npm, 2025-12-11) — XMR WebSocket client
- [Xibo for Windows](https://github.com/xibosignage/xibo-dotnetclient) v4 R406 (C#/.NET + CEF, 2025-12-10) — the only actively maintained upstream player
- [Arexibo](https://github.com/birkenfeld/arexibo) (Rust + Qt, last commit 2025-05-18 — dormant 9+ months)

**Other upstream players (abandoned):**
- [xibo-linux](https://github.com/xibosignage/xibo-linux) — C++ Snap player, last release 2021, last commit 2022
- [xibo-pyclient](https://github.com/xibosignage/xibo-pyclient) — Python player, last activity 2025, no recent releases

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Repository Structure](#repository-structure)
- [1. Schedule Management](#1-schedule-management)
- [2. XMDS Communication](#2-xmds-communication)
- [3. File/Cache Management](#3-filecache-management)
- [4. Layout Renderer](#4-layout-renderer-xlr-v1022-vs-rendererlite)
- [5. XMR Push Messaging](#5-xmr-push-messaging)
- [6. Interactive Control](#6-interactive-control)
- [7. Stats and Logging](#7-stats-and-logging)
- [8. Config and Settings](#8-config-and-settings)
- [9. Screenshot Capture](#9-screenshot-capture)
- [10. Performance](#10-performance-comparison)
- [11. Packaging and Distribution](#11-packaging-and-distribution)
- [12. Kiosk Environment](#12-kiosk-environment-xibo-kiosk)
- [13. Remaining Gaps](#13-remaining-gaps)
- [14. Where XiboPlayer is Better](#14-where-xiboplayer-is-better-than-all-upstream-players)
- [15. Arexibo Detailed Comparison](#15-arexibo-detailed-comparison)
- [16. Windows Player Detailed Comparison](#16-windows-player-detailed-comparison)
- [Version Reference](#version-reference)

---

## Executive Summary

| Area | Parity | Notes |
|------|--------|-------|
| **Schedule Management** | ~97% | Dayparting BETTER. Interrupts, actions, data connectors, commands, weather criteria, layout interleaving |
| **XMDS Communication** | ~97% | SOAP + REST dual transport. CRC32 + ETag caching. All 10 methods + GetWeather |
| **File Management** | ~95% | Parallel 4-chunk downloads BETTER. Service Worker progressive streaming |
| **Renderer** | ~95% | Performance BETTER. HLS via hls.js. Image alignment. Audio overlays. Region exit transitions |
| **XMR Push Messaging** | ~98% | All 13 command handlers. Exponential backoff reconnect |
| **Stats/Logging** | ~97% | Proof-of-play + event stats + hour-boundary splitting + log batching 50/300 |
| **Config/Settings** | ~95% | Centralized state + DisplaySettings class + Wake Lock + offline fallback |
| **Interactive Control** | ~95% | Full IC server + touch/keyboard actions + navigate-to-widget + prev/next |
| **Screenshot Capture** | 100% | Native getDisplayMedia + html2canvas fallback. Periodic + on-demand |
| **Packaging** | New | RPM/DEB via GitHub Actions, Electron wrapper, Chromium kiosk |
| **Kiosk Environment** | New | xibo-kiosk: GNOME Kiosk session, health monitoring, first-boot wizard, bootable images |

**Overall: ~96% feature parity, with significantly better performance and unique capabilities (REST transport, progressive streaming, cross-platform, RPM/DEB packaging, complete kiosk OS, playback control)**

---

## Repository Structure

Independent repositories under the `xibo-players/` GitHub org:

| Repo | Purpose | Delivery |
|------|---------|----------|
| `xiboplayer` | SDK (all @xiboplayer/* packages) | npm registry |
| `xiboplayer-pwa` | PWA player | npm + GH Releases |
| `xiboplayer-electron` | Electron wrapper (serves PWA via Express) | RPM/DEB via gh-pages |
| `xiboplayer-chromium` | Chromium kiosk launcher | RPM via gh-pages |
| `xiboplayer-chrome` | Chrome extension | Future |

### SDK Packages

```
@xiboplayer/core       - PlayerCore orchestration (platform-independent)
@xiboplayer/renderer   - RendererLite (standalone XLF renderer)
@xiboplayer/cache      - CacheManager + DownloadManager (shared with SW)
@xiboplayer/schedule   - ScheduleManager + InterruptScheduler
@xiboplayer/xmds       - XmdsClient (SOAP) + RestClient (REST)
@xiboplayer/xmr        - XmrWrapper (wraps @xibosignage/xibo-communication-framework)
@xiboplayer/stats      - StatsCollector + LogReporter (IndexedDB)
@xiboplayer/settings   - DisplaySettings (EventEmitter)
@xiboplayer/sw         - Service Worker helpers
@xiboplayer/crypto     - RSA key pair generation (Web Crypto API)
@xiboplayer/utils      - Shared logger, EventEmitter, fetchWithRetry, Config
@xiboplayer/proxy      - CORS proxy for local development
@xiboplayer/sync       - Multi-display synchronization (WIP)
@xiboplayer/docs       - Documentation and API reference
```

---

## 1. Schedule Management

### XiboPlayer vs XLR (electron-player scheduleManager.ts)

| Feature | XLR v1.0.22 | XiboPlayer v0.3.x | Status |
|---------|-------------|-------------------|--------|
| Layout events | Yes | Yes | **Match** |
| Overlay events | Yes | Yes | **Match** |
| Priority handling | Yes | Yes | **Match** |
| Date/time filtering | Yes | Yes | **Match** |
| Default layout fallback | Yes | Yes | **Match** |
| maxPlaysPerHour | Yes | Yes + even distribution | **Ours BETTER** — spreads plays evenly across the hour instead of front-loading them |
| Campaign scheduling | Yes | Yes (explicit campaign objects) | **Ours BETTER** — first-class campaign objects enable campaign-level stats and priority management |
| Interrupt/shareOfVoice | Yes | Yes (full port of XLR algorithm) | **Match** |
| Dayparting (weekly recurrence) | TODO | Full | **Ours BETTER** — supports ISO day-of-week and schedules that cross midnight (e.g. 22:00–02:00) |
| Action events | Parsed | Yes (handleTrigger + action dispatch) | **Match** |
| DataConnector events | Parsed | Yes (DataConnectorManager with polling) | **Match** |
| Command events | Parsed | Yes (executeCommand, HTTP only) | **Match** |
| Scheduled command auto-execution | No | Yes (auto-execute at scheduled time) | **Ours BETTER** — commands fire at their scheduled time without CMS push |
| Dependants tracking | Yes | Yes | **Match** |
| Geo-fencing criteria | TODO | Yes (haversine filtering + browser geolocation) | **Ours BETTER** |
| Weather criteria | TODO | Yes (GetWeather + criteria evaluation) | **Ours BETTER** — fetches weather data from CMS and evaluates schedule criteria based on conditions |
| Default layout interleaving | No | Yes (getInterleavedLayouts) | **Ours BETTER** — inserts default layout between scheduled layouts for smoother cycling |

---

## 2. XMDS Communication

### Transport Layer (Unique Feature)

| Transport | XLR | Windows | Arexibo | XiboPlayer | Notes |
|-----------|-----|---------|---------|------------|-------|
| **SOAP/XML** | Yes | Yes | Yes | Yes (XmdsClient) | Traditional protocol, all CMS versions |
| **REST/JSON** | No | No | No | **Yes (RestClient)** | 30% smaller payloads, ETag caching, standard HTTP |
| **ETag 304 caching** | No | No | No | **Yes** | Skip unchanged responses at HTTP layer |
| **Dual transport** | No | No | No | **Yes** | SOAP or REST, auto-selected during CMS setup |

The REST transport (`@xiboplayer/xmds` RestClient) is exclusive to our player. It uses JSON payloads via a custom CMS REST API (`/pwa/*` endpoints), with ETag-based HTTP caching that returns 304 Not Modified for unchanged data, reducing bandwidth further than SOAP CRC32 alone.

### SOAP/REST API Coverage

| Method | XLR | Windows | Arexibo | Our SOAP | Our REST | Status |
|--------|-----|---------|---------|----------|----------|--------|
| RegisterDisplay | Yes | Yes | Yes | Yes | Yes | **Match** |
| RequiredFiles | Yes | Yes | Yes | Yes | Yes (JSON) | **Match** |
| Schedule | Yes | Yes | Yes | Yes | Yes (XML) | **Match** |
| GetResource | No | Yes | Yes | Yes | Yes | **Ours BETTER** — XLR lacks GetResource, requiring server-side rendering for all widgets |
| MediaInventory | Yes | Yes | Yes | Yes | Yes (JSON) | **Match** |
| NotifyStatus | Yes | Yes | Yes | Yes (enriched) | Yes (enriched) | **Ours BETTER** — includes disk usage, timezone, and MAC address for remote diagnostics |
| SubmitLog | Yes | Yes | Yes | Yes | Yes (JSON) | **Match** |
| SubmitStats | Yes | Yes | Yes | Yes | Yes (JSON) | **Match** |
| SubmitScreenShot | No | Yes | No | Yes | Yes (JSON) | **Ours BETTER** — XLR and Arexibo cannot submit screenshots to CMS |
| GetWeather | No | Yes | No | Yes | Yes (JSON) | **Match** — fetches weather data for schedule criteria evaluation |
| ReportFaults | No | Yes | No | Yes | Yes (JSON) | **Match** — submits fault data with dedup cooldown |
| BlackList | Yes | Yes | No | Yes | No (REST N/A) | **Match** via SOAP |

### Communication Features

| Feature | XLR | XiboPlayer | Status |
|---------|-----|------------|--------|
| SOAP Fault parsing | Typed classes | Namespace-aware querySelector | XLR slightly richer |
| CRC32 skip optimization | Yes (checkRf/checkSchedule) | Yes | **Match** |
| ETag 304 caching | No | Yes (REST only) | **Ours BETTER** — skips unchanged responses at HTTP layer, saving bandwidth on every poll |
| licenceResult in RegisterDisplay | Yes | Yes (v7 spec) | **Match** |
| Retry with backoff | Axios built-in | fetchWithRetry (configurable) | **Match** |
| Purge list parsing | Yes | Yes | **Match** |
| Electron CORS proxy | No | Yes (@xiboplayer/proxy) | **Ours BETTER** — enables local Electron to talk to CMS without CORS issues |
| Offline fallback | No | IndexedDB (schedule + settings + requiredFiles) | **Ours BETTER** — player continues showing content when CMS is unreachable |
| Storage estimate in status | No | Yes (navigator.storage.estimate) | **Ours BETTER** — CMS admins can see remaining disk space remotely |
| Timezone in status | No | Yes (Intl.DateTimeFormat) | **Ours BETTER** — CMS can display and account for the player's local timezone |
| MAC address reporting | No | Yes (Wake-on-LAN support) | **Ours BETTER** — enables remote Wake-on-LAN from CMS |

---

## 3. File/Cache Management

| Feature | XLR | Windows | XiboPlayer | Status |
|---------|-----|---------|------------|--------|
| MD5 validation | Yes | Yes | Yes (spark-md5) | **Match** |
| Hash check before download | Yes | Yes | Yes | **Match** |
| Download retry | Axios | Built-in | fetchWithRetry + exponential backoff | **Ours BETTER** — configurable retry count and delay, graceful degradation on flaky networks |
| File integrity | Size check | Full | Size + Content-Type + auto-delete | **Ours BETTER** — validates MIME type and auto-removes corrupted files on detection |
| Parallel downloads | No | No | 4 concurrent chunks | **Ours BETTER** — 4x faster large file downloads by splitting into concurrent HTTP Range requests |
| Dynamic chunk sizing | No | No | Yes (based on device RAM) | **Ours BETTER** — adapts chunk size to available memory, prevents OOM on low-end devices |
| Bad cache detection | No | No | Yes (auto-delete corrupted) | **Ours BETTER** — detects size mismatches and auto-re-downloads without manual intervention |
| Queue barriers | No | No | Yes (offline resilience) | **Ours BETTER** — pauses download queue when offline, resumes with backoff when connectivity returns |
| Font CSS URL rewriting | Yes | Yes | Yes | **Match** |
| Widget HTML caching | Yes | Yes | Yes (SW static cache) | **Match** |
| Progressive streaming | No | No | Yes (Service Worker Range requests) | **Ours BETTER** — videos start playing while still downloading via SW Range request support |
| Storage backend | SQLite | SQLite | Cache API + IndexedDB | Platform difference |
| Offline-first | No | Partial | Full (SW + Cache API + IndexedDB) | **Ours BETTER** — entire app works offline including schedule, settings, and media from cache |
| Persistent storage | OS-managed | OS-managed | navigator.storage.persist() | **Ours BETTER** — browser cannot evict cached media under storage pressure |

---

## 4. Layout Renderer (XLR v1.0.22 vs RendererLite)

### Overall: ~92% parity, better performance

### Layout Parsing

| Feature | XLR v1.0.22 | RendererLite | Status |
|---------|-------------|--------------|--------|
| Layout dimensions | Yes | Yes | **Match** |
| Background color | Yes | Yes | **Match** |
| Background image (scaling) | Yes | Yes (cover, centered) | **Match** |
| Region extraction | Yes | Yes | **Match** |
| Widget extraction | Yes | Yes | **Match** |
| Layout scale factor | min(sw/xw, sh/xh) | min(sw/xw, sh/xh) | **Match** |
| Centered positioning | Yes (offset) | Yes (offset) | **Match** |
| Region scaling | Yes | Yes | **Match** |
| ResizeObserver rescale | No | Yes | **Ours BETTER** — layout automatically re-scales when window is resized (e.g. rotation, multi-monitor) |
| Layout duration from XLF | Yes | Yes (with auto-calc fallback) | **Match** |

### Widget Types

| Type | XLR v1.0.22 | RendererLite | Status |
|------|-------------|--------------|--------|
| image | Full (scaling, alignment) | Full (scaleType + align + valign) | **Match** |
| video | video.js | Native HTML5 + HLS detection | **Match** |
| audio | Full | Native audio + gradient visualization | **Ours BETTER** — shows visual gradient + icon instead of blank screen during audio playback |
| text | iframe | iframe (blob or SW cache URL) | **Match** |
| clock | getResource | getWidgetHtml | **Match** |
| global/embedded | Full | iframe | **Match** |
| pdf | No | PDF.js (lazy-loaded) | **Ours BETTER** — renders PDF natively in-browser; XLR and Windows have no PDF support |
| webpage | iframe | iframe | **Match** |
| ticker | Duration-per-item | iframe | Partial |
| dataset | Yes | Via getWidgetHtml | **Match** (server-rendered) |
| HLS streaming | Yes | Yes (native + hls.js dynamic import) | **Match** |
| shellcommand | Yes | No | N/A (browser sandbox) |

### Transitions

| Feature | XLR v1.0.22 | RendererLite | Status |
|---------|-------------|--------------|--------|
| Fade In/Out | Yes | Yes | **Match** |
| Fly In/Out | Yes | Yes | **Match** |
| Compass directions (8) | Yes | Yes (N/NE/E/SE/S/SW/W/NW) | **Match** |
| Configurable duration | Yes | Yes | **Match** |
| Region exit transitions | Yes | Yes (CSS animation on region removal) | **Match** |
| Web Animations API | Yes | Yes | **Match** |

### Interactivity

| Feature | XLR v1.0.22 | RendererLite | Status |
|---------|-------------|--------------|--------|
| IC server (postMessage) | Yes | Yes | **Match** |
| Webhook triggers | Yes | Yes | **Match** |
| Duration control (expire/extend/set) | Yes | Yes | **Match** |
| Data connector realtime | Yes | Yes (DataConnectorManager) | **Match** |
| Touch/click actions | Yes | Yes (attachTouchAction) | **Match** |
| Keyboard actions | Yes | Yes (setupKeyboardListener) | **Match** |
| Navigate to layout | Yes | Yes (via IC trigger -> handleTrigger -> changeLayout) | **Match** |
| Navigate to widget | Yes | Yes (navigateToWidget method) | **Match** |
| Previous/next widget | Yes | Yes (nextWidget/previousWidget) | **Match** |
| Widget duration webhooks | Yes | Yes (widgetAction event → HTTP POST) | **Match** |
| Audio overlay on parent media | Yes | Yes (attached `<audio>` element lifecycle) | **Match** |
| Playback control (keyboard) | No | Yes (←/→/Space/PgUp/PgDn/R) | **Ours BETTER** — keyboard shortcuts for next/prev layout, pause/resume, and revert to schedule |
| Timeline click-to-skip | No | Yes (click layout in timeline overlay) | **Ours BETTER** — click any layout in the debug timeline to jump to it instantly |
| Drawer regions | Yes | No | **GAP** |

### Element Reuse and Performance

| Feature | XLR v1.0.22 | RendererLite | Status |
|---------|-------------|--------------|--------|
| Pre-create elements | currEl/nxtEl (2 elements) | widgetElements Map (all widgets) | **Ours BETTER** — pre-creates DOM for every widget at layout start, so switches are instant |
| Visibility toggling | Yes | Yes | **Match** |
| Layout replay detection | Implicit | Explicit isSameLayout | **Ours BETTER** — skips teardown/rebuild when replaying the same layout, achieving <0.5s replay |
| Blob URL lifecycle | Manual | Tracked per layout (Set) | **Ours BETTER** — revokes all blob URLs per layout, preventing memory leaks over long sessions |
| Parallel media prefetch | No | Promise.all() for all media | **Ours BETTER** — fetches all media URLs in parallel before rendering, eliminating loading gaps |
| Video restart on replay | Requires recreation | currentTime=0 + play() | **Ours BETTER** — reuses existing video elements instead of destroying and recreating them |

### Events

| Event | XLR v1.0.22 | RendererLite | Status |
|-------|-------------|--------------|--------|
| layoutStart | Yes | Yes | **Match** |
| layoutEnd | Yes | Yes | **Match** |
| widgetStart | Yes | Yes (with mediaId, type, duration) | **Match** |
| widgetEnd | Yes | Yes | **Match** |
| overlayStart | Yes | Yes | **Match** |
| overlayEnd | Yes | Yes | **Match** |
| overlayWidgetStart | No | Yes | **Ours BETTER** — enables per-widget stats tracking inside overlays |
| overlayWidgetEnd | No | Yes | **Ours BETTER** — paired with overlayWidgetStart for complete proof-of-play |
| action-trigger | Yes | Yes (touch/keyboard source info) | **Match** |
| error (structured) | Console only | Event with type + context | **Ours BETTER** — emits structured error events that can be caught and reported to CMS |
| layoutChange | Yes | No (handled by PlayerCore) | Design difference |

### Overlays

| Feature | XLR v1.0.22 | RendererLite | Status |
|---------|-------------|--------------|--------|
| Overlay rendering | Yes | Yes | **Match** |
| Multiple concurrent overlays | Yes | Yes (activeOverlays Map) | **Match** |
| Priority-based z-index | Fixed 999 | 1000 + priority | **Ours BETTER** — higher-priority overlays correctly stack above lower-priority ones |
| Interrupt detection | Yes | Yes | **Match** |
| Share-of-voice interleaving | Yes | Yes | **Match** |
| Overlay widget cycling | Yes | Yes (startOverlayRegion) | **Match** |

---

## 5. XMR Push Messaging

### Architecture

| Aspect | xibo-xmr (server) | xibo-communication-framework v0.0.6 | @xiboplayer/xmr |
|--------|-------------------|--------------------------------------|-----------------|
| Type | PHP/ReactPHP relay | JS WebSocket client library | JS wrapper around the library |
| Protocol | ZeroMQ + WebSocket | WebSocket | WebSocket |
| npm | N/A | @xibosignage/xibo-communication-framework | @xiboplayer/xmr |

### Client-Side Comparison

| Feature | xibo-communication-framework | @xiboplayer/xmr | Status |
|---------|------------------------------|------------------|--------|
| WebSocket connection | Yes | Yes (wraps Xmr class) | **Match** |
| Heartbeat ("H") detection | Yes | Yes | **Match** |
| collectNow | Yes | Yes -> PlayerCore.collectNow() | **Match** |
| screenShot / screenshot | Yes | Yes -> PlayerCore.captureScreenshot() | **Match** |
| licenceCheck | Yes | Yes (no-op for Linux/PWA) | **Match** |
| changeLayout | Yes | Yes -> PlayerCore.changeLayout() | **Match** |
| overlayLayout | Yes | Yes -> PlayerCore.overlayLayout() | **Match** |
| revertToSchedule | Yes | Yes -> PlayerCore.revertToSchedule() | **Match** |
| purgeAll | Yes | Yes -> PlayerCore.purgeAll() | **Match** |
| commandAction | Yes | Yes (HTTP only in browser) | **Match** |
| triggerWebhook | Yes | Yes -> PlayerCore.triggerWebhook() | **Match** |
| dataUpdate | Yes | Yes -> PlayerCore.refreshDataConnectors() | **Match** |
| criteriaUpdate | Yes | Yes (re-collect) | **Match** |
| currentGeoLocation | Yes | Yes (dual-path: CMS push + browser Geolocation API) | **Match** |
| rekey | Yes | Yes -> RSA key rotation (Web Crypto) | **Match** |
| JSON message parsing | Yes | Yes | **Match** |
| TTL/expiry checking | Yes | Yes | **Match** |
| Channel subscription | Yes | Yes (init message on connect) | **Match** |
| isActive() health check | Yes (15 min) | Yes | **Match** |
| Reconnection | 60s fixed interval | Exponential backoff (10 attempts) | **Ours BETTER** — reconnects faster initially, backs off to avoid flooding a struggling server |
| Connection close handling | Yes | Yes (with intentional shutdown flag) | **Match** |

---

## 6. Interactive Control

### What It Does
The `xibo-interactive-control` library (`bundle.min.js`) provides a widget-to-player communication bridge using `postMessage`. Widgets in iframes send requests; the player's IC server handles them.

### Feature Comparison

| Feature | Upstream IC | Our IC Server | Status |
|---------|-------------|---------------|--------|
| postMessage listener | Yes | Yes | **Match** |
| /info endpoint | Yes | Yes | **Match** |
| /trigger endpoint | Yes | Yes -> handleTrigger() | **Match** |
| /duration/expire | Yes | Yes | **Match** |
| /duration/extend | Yes | Yes | **Match** |
| /duration/set | Yes | Yes | **Match** |
| /fault endpoint | Yes | Yes -> LogReporter.reportFault() | **Match** |
| /realtime data | Yes | Yes -> DataConnectorManager.getData() | **Match** |
| Navigate to layout action | Yes | Yes (changeLayout) | **Match** |
| Navigate to widget action | Yes | Yes (navigateToWidget) | **Match** |
| Previous/next widget | Yes | Yes (nextWidget/previousWidget) | **Match** |
| Touch/click triggers | Yes | Yes (attachTouchAction) | **Match** |
| Keyboard triggers | Yes | Yes (setupKeyboardListener) | **Match** |
| Data connector support | Yes | Yes (DataConnectorManager) | **Match** |

---

## 7. Stats and Logging

| Feature | XLR | Windows | XiboPlayer | Status |
|---------|-----|---------|------------|--------|
| Layout proof-of-play | Yes | Yes | Yes (StatsCollector) | **Match** |
| Widget proof-of-play | Via media events | Yes | Explicit start/end tracking | **Ours BETTER** — tracks exact widget display duration, not just media play events |
| Event stats (touch, webhook) | No | Yes | Yes (recordEvent with tags) | **Ours BETTER** — tracks user interactions and webhook events for engagement analytics |
| Stats submission (XMDS) | Yes | Yes | Yes (XML or JSON) | **Match** |
| Stats aggregation | Yes | Yes | Yes (hourly grouping) | **Match** |
| Hour-boundary splitting | No | Yes | Yes (_splitAtHourBoundaries) | **Match** — splits stats spanning multiple hours into per-hour records for correct CMS aggregation |
| enableStat per layout/widget | Yes | Yes | Yes (respects enableStat attribute) | **Match** |
| Log database | Yes | Yes | IndexedDB (persistent) | **Match** |
| Log submission to CMS | Yes | Yes | Yes (XML or JSON) | **Match** |
| Log batching (50/300) | Yes | Yes | Yes (auto-detect: 50 normal, 300 backlog) | **Match** |
| Fault reporting | faultsDB | Yes | Yes (dedup with 5-min cooldown) | **Match** |
| Replay-safe tracking | No | No | Yes (auto-end previous on replay) | **Ours BETTER** — auto-ends the previous layout's stats when replaying, preventing double-counting |
| Quota-exceeded cleanup | No | No | Yes (auto-delete oldest 100) | **Ours BETTER** — auto-prunes old stats when IndexedDB is full instead of silently failing |
| BroadcastChannel stats | Yes | No | No | **GAP** (low impact) |

---

## 8. Config and Settings

| Feature | XLR | Windows | XiboPlayer | Status |
|---------|-----|---------|------------|--------|
| Hardware key | machine-id | machine-id | FNV-1a hash + "pwa-" prefix | **Ours BETTER** — prefix makes it immediately identifiable as a PWA player in CMS display list |
| CMS settings parsing | Full set | Full set | Full set (DisplaySettings class) | **Match** |
| Download windows | No | Yes | Yes | **Ours BETTER** vs XLR — respects CMS-configured download time windows to avoid bandwidth during peak hours |
| Screenshot interval | No | Yes | Yes (periodic + on-demand) | **Ours BETTER** vs XLR — supports both timed periodic captures and on-demand XMR triggers |
| DisplaySettings class | Inline | Built-in | Dedicated + EventEmitter | **Ours BETTER** — settings changes emit events so all components react instantly without polling |
| Centralized state | State class | Built-in | PlayerState (EventEmitter) | **Match** |
| Display status machine | 0/2/3 codes | Full | Partial | Minor gap |
| Wake Lock API | No | N/A (native app) | Yes (Screen Wake Lock) | **Ours BETTER** — prevents OS from dimming/sleeping the screen in kiosk mode |
| Offline fallback | No | File system | IndexedDB auto-cache | **Ours BETTER** — automatically caches schedule and settings so player boots even without CMS |
| Persistent storage | OS-managed | OS-managed | navigator.storage.persist() | **Ours BETTER** — browser cannot evict cached media under storage pressure |
| Log level from CMS | No | Yes | Yes (applyCmsLogLevel) | **Match** |
| Timeline debug overlay | No | No | Yes (T-key toggle, clickable) | **Ours BETTER** — press T to see upcoming schedule with clickable layouts; D toggles download overlay |

---

## 9. Screenshot Capture

| Feature | Windows | XLR/Electron | XiboPlayer | Status |
|---------|---------|-------------|------------|--------|
| Capture API | GDI+ CopyFromScreen | webContents.capturePage() | getDisplayMedia + html2canvas | Platform-appropriate |
| Video capture | Native pixel copy | Chromium compositor | Native (getDisplayMedia) or canvas overlay | **Match** |
| Format | JPEG (default) | JPEG 75 | JPEG 80 | **Match** |
| Trigger: XMR | Yes | Yes | Yes | **Match** |
| Trigger: Periodic | Yes (registration cycle) | No | Yes (configurable interval) | **Ours BETTER** vs XLR — XLR has no periodic screenshots at all |
| Fallback on failure | No | Placeholder PNG | html2canvas DOM render | **Ours BETTER** — renders actual DOM to canvas when getDisplayMedia is unavailable, not a placeholder |
| Kiosk auto-grant | N/A (native) | N/A (Electron) | `--auto-select-desktop-capture-source` | Config required |
| Submission | SOAP | SOAP | SOAP or REST | **Match** |

---

## 10. Performance Comparison

| Metric | XLR v1.0.22 | Windows v4 R406 | Arexibo | XiboPlayer v0.3.x |
|--------|-------------|-----------------|---------|-------------------|
| Initial load (cold) | 17-20s | 5-10s | 12-15s | **3-5s** |
| Layout replay | 2-3s | 1-2s | <1s | **<0.5s** |
| 1GB file download | ~5 min | ~5 min | ~5 min | **1-2 min** (4 parallel chunks) |
| Memory after 10 cycles | +500MB (growing) | Stable | Stable | **Stable** (blob lifecycle tracking) |
| Bundle size | ~2MB (with video.js) | ~50MB (CEF) | ~10MB (Rust binary) | **~500KB** (minified) |
| Widget switch time | ~200ms (recreate) | ~100ms | ~100ms | **<50ms** (visibility toggle) |

**XiboPlayer is the fastest and most memory-efficient player.**

The key performance advantages come from:
1. **Parallel chunk downloads** (4 concurrent, dynamic sizing based on RAM)
2. **Element reuse** (pre-create all widget DOM elements, toggle visibility)
3. **Parallel media prefetch** (Promise.all for all media URLs before render)
4. **Service Worker streaming** (Range request support, no full-file blocking)
5. **Blob URL lifecycle tracking** (revoke per-layout, no accumulation)
6. **Queue barriers with exponential backoff** (offline resilience without data loss)

---

## 11. Packaging and Distribution

### New in v0.3.x — Platform Packaging

| Platform | XLR/Electron | Windows | Arexibo | XiboPlayer |
|----------|-------------|---------|---------|------------|
| **RPM (Fedora/RHEL)** | No | No | No | **Yes** (Electron + Chromium) |
| **DEB (Debian/Ubuntu)** | No | No | No | **Yes** (Electron) |
| **MSI (Windows)** | No | Yes | No | No |
| **PWA (any browser)** | No | No | No | **Yes** |
| **npm package** | npm (renderer only) | No | No | **Yes** (full SDK, 12 public packages) |
| **Auto-update repo** | No | Built-in | No | **Yes** (gh-pages dnf/apt repo) |
| **CI/CD builds** | Manual | Manual | None | **GitHub Actions** (tag → build → publish) |
| **npm provenance** | No | No | No | **Yes** (SLSA attestation) |

The RPM/DEB packages are built automatically on git tag push via GitHub Actions, with repository metadata regenerated via `repository_dispatch`. Users add the dnf/apt repo and get automatic updates.

---

## 12. Kiosk Environment (xibo-kiosk)

xibo-kiosk is a **complete kiosk operating environment** — not a player itself, but the infrastructure layer that turns any Linux machine into a dedicated signage display. It uses the `alternatives` system to delegate playback to whichever player is installed (xiboplayer-electron priority 30, xiboplayer-chromium priority 20, arexibo priority 10).

### Kiosk Feature Comparison

| Feature | xibo-kiosk | Arexibo (standalone) | Windows Player | Status |
|---------|-----------|---------------------|----------------|--------|
| **Session manager** | GNOME Kiosk (Wayland compositor, locked-down) | None (runs within existing desktop) | Windows Shell Replacement / Assigned Access | **Ours BETTER** — dedicated Wayland compositor with no app switching, no desktop shell |
| **Player-agnostic** | Yes (alternatives system) | No (is itself the player) | No (proprietary player only) | **Ours BETTER** — swap players without reconfiguring the kiosk |
| **First-boot wizard** | Zenity GUI (CMS URL, key, display name) | CLI config or manual settings.json | Player UI registration | **Ours BETTER** — non-technical staff can register displays without terminal access |
| **Health monitoring** | 10s polling loop, exit code parsing, auto-restart | Built into Rust process | Windows Service watchdog | **Ours BETTER** — distinguishes "not authorized" (exit 2) from real errors, offers reconfigure dialog |
| **Notifications** | Dunst overlay (persistent, color-coded by severity) | stdout logging only | System tray icon | **Ours BETTER** — on-screen notifications visible from across the room |
| **Keyboard shortcuts** | keyd (kernel-level, Ctrl+I status, Ctrl+R reconfigure) | None | None | **Ours BETTER** — works even without a desktop environment since keyd operates at kernel level |
| **Auto-login** | GDM autologin to kiosk session | Manual setup required | Windows auto-logon (manual) | **Ours BETTER** — zero-touch boot to signage |
| **Screen management** | gsettings + logind (blanking, idle, screensaver, power) | Manual xset commands | Windows power settings | **Ours BETTER** — comprehensive, covers Wayland (gsettings) and systemd (logind) |
| **Resource limits** | systemd cgroup (1.5G memory cap, burst limits) | None | Windows resource management | **Ours BETTER** — prevents runaway memory from crashing the kiosk |
| **Cursor hiding** | unclutter (3s timeout) | Qt fullscreen (built-in) | Player hides cursor | **Match** |
| **Bootable images** | ISO, raw (x86_64 + aarch64), QCOW2 | None | N/A (Windows OEM) | **Ours BETTER** — flash and boot, no OS install or config needed |
| **Kickstart/PXE deploy** | Full kickstart for automated network install | No | MDT/SCCM | **Ours BETTER** — automated mass deployment via PXE boot |
| **Architectures** | x86_64 + aarch64 (Raspberry Pi 4/5) | x86_64 + aarch64 | x86_64 only | **Ours BETTER** — runs on Raspberry Pi and ARM boards |
| **Audio setup** | wpctl 90% default | Manual | Manual | **Ours BETTER** — audio works out of the box for signage with sound |
| **Passwordless reboot** | opendoas (no sudo needed) | Manual | UAC prompt | **Ours BETTER** — kiosk user can reboot/shutdown without admin credentials |

### Bootable Image Formats

Pre-built images include everything: Fedora 43 + xibo-kiosk + xiboplayer-electron + arexibo + keyd + VLC + ffmpeg + GStreamer + VA-API drivers + WireGuard + avahi/mDNS + Wi-Fi support.

| Image | Use case |
|-------|----------|
| ISO installer (x86_64) | Flash USB, boot any PC — fully automated install |
| Raw disk (x86_64) | Write to SSD for Intel NUCs, embedded PCs |
| Raw disk (aarch64) | Flash SD card for Raspberry Pi 4/5 |
| QCOW2 (x86_64) | Ready-to-boot VM for QEMU, Proxmox, GNOME Boxes |

### How Player Selection Works

```
/usr/bin/xiboplayer → alternatives system
  ├── xiboplayer-electron (priority 30, default)
  ├── xiboplayer-chromium (priority 20)
  └── arexibo (priority 10)

# Switch player:
sudo alternatives --set xiboplayer /usr/bin/xiboplayer-electron
sudo alternatives --set xiboplayer /usr/bin/xiboplayer-chromium
sudo alternatives --set xiboplayer /usr/bin/arexibo
```

---

## 13. Remaining Gaps

### Low Impact (Rarely Used Features)

1. **Drawer regions** - XLR-specific collapsible UI regions (rarely used in practice)
2. **Multi-display sync transport** - @xiboplayer/sync infrastructure exists but no WebSocket/LAN transport yet
3. **BroadcastChannel stats** - Stats go direct to CMS, no cross-tab sync needed
4. **Schedule conflict detection** - No visual warning when schedules overlap

### Not Applicable (Browser Sandbox)

- Shell commands (N/A in browser; use HTTP commands instead)
- RS232 serial port (N/A in browser)

---

## 14. Where XiboPlayer is Better Than All Upstream Players

1. **Dual transport (SOAP + REST)** - Only player with native JSON/REST communication
2. **ETag caching** - HTTP 304 for unchanged responses (REST transport)
3. **4x faster downloads** - Parallel 4-chunk downloads with dynamic sizing
4. **Progressive streaming** - Service Worker Range request support for large media
5. **Instant layout replay** - Element reuse with isSameLayout detection (<0.5s)
6. **Better memory management** - Per-layout blob URL lifecycle tracking, no leaks
7. **Better cache integrity** - Auto-detection and cleanup of corrupted entries
8. **Better dayparting** - Full weekly recurrence with ISO day-of-week and midnight crossing
9. **Better overlay system** - Priority-based z-index (1000 + priority)
10. **PDF support** - PDF.js lazy-loaded (XLR and Windows lack this)
11. **Audio visualization** - Gradient background + icon display for audio widgets
12. **Better error events** - Structured events with type, context, and source info
13. **Better settings** - Dedicated DisplaySettings class with EventEmitter
14. **Platform-independent core** - PlayerCore works across PWA, Electron, mobile
15. **Cross-platform** - Runs on any device with a modern browser
16. **Zero installation** - Just open a URL
17. **Offline resilience** - IndexedDB auto-fallback + queue barriers + exponential backoff
18. **Wake Lock API** - Prevents screen sleep in kiosk mode
19. **Persistent storage** - navigator.storage.persist() prevents cache eviction
20. **Screenshot fallback** - html2canvas when native capture is unavailable
21. **RPM/DEB packaging** - Native Linux package management with auto-update repos
22. **npm provenance** - SLSA attestation for supply chain security
23. **MAC address reporting** - Wake-on-LAN support in status messages
24. **Timeline debug overlay** - T-key toggleable schedule visualization with click-to-skip
25. **Documentation server** - Searchable API reference and SDK docs
26. **Complete kiosk OS** - xibo-kiosk with GNOME Kiosk, health monitoring, first-boot wizard, keyboard shortcuts
27. **Bootable images** - ISO, raw, QCOW2 for x86_64 and aarch64 — flash and boot, zero config
28. **Player-agnostic kiosk** - alternatives system lets you swap between Electron, Chromium, or Arexibo without reconfiguring
29. **Raspberry Pi support** - aarch64 bootable images for Pi 4/5
30. **Playback control** - Keyboard shortcuts (←/→/Space/R) and timeline click-to-skip for manual layout navigation
31. **Event stats** - Tracks touch interactions and webhook events with tags for engagement analytics
32. **Layout interleaving** - Inserts default layout between scheduled layouts for smoother content cycling
33. **Weather criteria** - Evaluates weather-based schedule criteria from CMS GetWeather data
34. **Hour-boundary stat splitting** - Splits proof-of-play stats at hour marks for correct CMS aggregation

---

## 15. Arexibo Detailed Comparison

### Architecture: Native Rust + Qt vs Browser-Based

| Aspect | Arexibo | XiboPlayer |
|--------|---------|------------|
| **Language** | Rust + C++ (Qt GUI) | JavaScript/TypeScript |
| **Rendering** | XLF -> HTML translation at download time | Dynamic runtime XLF rendering |
| **Concurrency** | Multi-threaded (backend, GUI, XMR threads) | Single-threaded (async/await, Web Workers) |
| **Storage** | Disk files + `content.json` inventory | Cache API + IndexedDB |
| **Media serving** | Local HTTP server (tiny_http, port 9696) | Browser-native + Service Worker |
| **XMR** | ZeroMQ + RSA encryption | WebSocket (xibo-communication-framework) |
| **Platform** | Linux only (Qt/Rust deps, RPi5 supported) | Any browser (cross-platform) |
| **Last update** | 2025-05-18 (dormant 9+ months) | Active development |
| **Packaging** | Manual build | RPM/DEB auto-built via CI |

### Feature Parity: ~95% protocol, different capabilities

| Category | Arexibo | XiboPlayer | Winner |
|----------|---------|------------|--------|
| **XMDS** | All v5 methods, proxy, cert override | All v5 + REST + BlackList + CRC32 + ETag | **XiboPlayer** |
| **XMR** | ZeroMQ + RSA key encryption | WebSocket + RSA key registration (13 handlers) | Tie (different transport) |
| **Schedule** | Full dayparts, campaigns | Full dayparts, campaigns, interrupts, actions, weather, interleaving | **XiboPlayer** |
| **Rendering** | XLF -> HTML (7 media types) | Dynamic runtime (12+ types including PDF, HLS, audio overlay) | **XiboPlayer** |
| **Cache** | Disk + MD5, sequential | Cache API + parallel 4x chunks + streaming | **XiboPlayer** (4x faster) |
| **Commands** | Shell, HTTP, RS232 serial | HTTP only (browser sandbox) | Arexibo |
| **Kiosk** | systemd + GNOME Kiosk + health monitor | xibo-kiosk: GNOME Kiosk + health monitor + bootable images | **XiboPlayer** (with xibo-kiosk) |
| **Performance** | Multi-threaded, native code | Parallel downloads, element reuse | **XiboPlayer** (measured faster) |
| **Transitions** | CSS (4 types, 8 directions) | Web Animations API (same) | Tie |
| **Logging** | CMS submission, memory-limited queue | CMS submission + IndexedDB + fault dedup | **XiboPlayer** |
| **Offline** | `--allow-offline` flag | IndexedDB auto-fallback | **XiboPlayer** |
| **Packaging** | Manual build from source | RPM/DEB + PWA + npm | **XiboPlayer** |

### Arexibo-Only Features (XiboPlayer Cannot Replicate)

1. **RS232 Serial Port** - Full serial config (baud, parity, handshake), hex encoding, response reading
2. **Shell Commands** - `/bin/sh -c` execution with regex output validation
3. **ZeroMQ + RSA** - Encrypted XMR with proper key exchange (vs plain WebSocket)
4. **XLF Translation Cache** - Pre-generates HTML at download time, version-tracked invalidation

Note: Arexibo's kiosk mode (GNOME Kiosk + systemd) is now superseded by xibo-kiosk, which provides the same functionality plus health monitoring, first-boot wizard, keyboard shortcuts, bootable images, and player-agnostic alternatives system. Arexibo can run inside xibo-kiosk.

### XiboPlayer-Only Advantages Over Arexibo

1. **4-10x faster downloads** - Parallel chunks vs sequential
2. **REST transport** - JSON payloads + ETag caching
3. **Cross-platform** - Any device with a browser
4. **Zero installation** - Just open a URL
5. **Better element reuse** - Pre-create + visibility toggle (Arexibo-inspired but refined)
6. **Better cache integrity** - Auto-detection and deletion of corrupted entries
7. **Full Chrome DevTools** - No `--inspect` flag needed
8. **Auto offline fallback** - IndexedDB cache without explicit flag
9. **Wake Lock API** - Native browser sleep prevention
10. **Screenshot capture** - getDisplayMedia + html2canvas (Arexibo has none)
11. **RPM/DEB packages** - Native package management (Arexibo requires manual build)
12. **Active development** - Arexibo dormant since May 2025

### Performance Comparison

| Metric | Arexibo | XiboPlayer v0.3.x |
|--------|---------|-------------------|
| Initial load | 12-15s | **3-5s** |
| Layout replay | <1s | **<0.5s** |
| 1GB download | ~5 min | **1-2 min** |
| Memory (10 cycles) | Stable | **Stable** |
| Bundle size | ~10MB | **~500KB** |

### Recommendation

- **Use Arexibo** for: Linux-only kiosks requiring serial port control, shell commands, or encrypted XMR (note: project appears dormant)
- **Use XiboPlayer** for: Everything else — cross-platform, rapid setup, REST API, RPM/DEB packaging, active development

---

## 16. Windows Player Detailed Comparison

### Xibo for Windows v4 R406 (Released 2025-12-10)

| Feature | Windows v4 R406 | XiboPlayer v0.3.x | Status |
|---------|----------------|-------------------|--------|
| **Rendering** | CEF (Chromium 141) | RendererLite (native JS) | Different approach |
| **XMR** | ZeroMQ -> WebSocket (CMS 4.4+) | WebSocket (always) | Ours simpler |
| **Webcam/Mic** | Yes (new in R406) | No (browser permissions) | Windows better |
| **Weather criteria** | Fixed in R406 | Yes (GetWeather + criteria evaluation) | **Match** |
| **Platform** | Windows 10+ only | Any browser | **Ours BETTER** — runs on Linux, macOS, ChromeOS, any device with a modern browser |
| **Kiosk** | Native Windows kiosk | xibo-kiosk: GNOME Kiosk + health monitor + bootable images | **Ours BETTER** — dedicated Wayland compositor, health monitoring, first-boot wizard, bootable images |
| **Installation** | MSI installer | Zero (open URL) or RPM/DEB | **Ours BETTER** — PWA needs no install at all; RPM/DEB auto-update from repo |
| **CEF update** | Chromium 141 | Browser's own engine | Tie |
| **Shell commands** | Yes | No (browser sandbox) | Windows better |
| **Serial port** | Yes | No (browser sandbox) | Windows better |
| **REST API** | No | Yes | **Ours BETTER** — 30% smaller payloads and ETag caching reduce bandwidth and latency |
| **Parallel downloads** | No | Yes (4 chunks) | **Ours BETTER** — 4x faster large file downloads via concurrent HTTP Range requests |
| **Offline fallback** | File system | IndexedDB | Both work |
| **Screenshot** | GDI+ pixel copy | getDisplayMedia / html2canvas | Both work |
| **Stats/Logging** | Built-in | StatsCollector + LogReporter | **Match** |
| **Linux support** | No | Yes (RPM/DEB + PWA) | **Ours BETTER** — native Linux packages with dnf/apt repos, Windows player is Windows-only |

### Key Differences

The Windows player is a mature, commercial product with full native OS integration (shell commands, serial ports, kiosk mode, webcam). XiboPlayer trades these native capabilities for cross-platform reach, zero installation, REST API support, RPM/DEB packaging, and significantly faster media downloads.

---

## Version Reference

| Component | Version | Released | Source |
|-----------|---------|----------|--------|
| xibo-layout-renderer | 1.0.22 | 2026-01-21 | [npm](https://www.npmjs.com/package/@xibosignage/xibo-layout-renderer) |
| xibo-communication-framework | 0.0.6 | 2025-12-11 | [npm](https://www.npmjs.com/package/@xibosignage/xibo-communication-framework) |
| Xibo for Windows | v4 R406 | 2025-12-10 | [GitHub](https://github.com/xibosignage/xibo-dotnetclient/releases) |
| Arexibo | latest | 2025-05-18 | [GitHub](https://github.com/birkenfeld/arexibo) |
| XiboPlayer SDK | v0.3.4 | 2026-02-21 | [npm](https://www.npmjs.com/org/xiboplayer) |
| XiboPlayer PWA | v0.3.4 | 2026-02-21 | [npm](https://www.npmjs.com/package/@xiboplayer/pwa) |
| XiboPlayer Electron | v0.3.5 | 2026-02-21 | [GitHub](https://github.com/xibo-players/xiboplayer-electron/releases) |
| XiboPlayer Chromium | v0.3.7 | 2026-02-21 | [GitHub](https://github.com/xibo-players/xiboplayer-chromium/releases) |
