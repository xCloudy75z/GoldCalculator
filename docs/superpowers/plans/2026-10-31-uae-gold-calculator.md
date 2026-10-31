# UAE Gold Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free Arabic iPhone PWA that calculates a UAE gold purchase estimate, persists inputs, and works offline from a GitHub Pages project path.

**Architecture:** A static `index.html` renders the calculator, `style.css` owns the mobile RTL presentation, and `app.js` contains pure calculation/formatting functions plus guarded browser initialization. A scoped service worker precaches the local application shell; Node's built-in test runner verifies logic and static PWA contracts without adding runtime dependencies.

**Tech Stack:** Semantic HTML5, CSS, JavaScript ES modules, Web App Manifest, Service Worker API, localStorage, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-31-uae-gold-calculator-design.md`

## Global Constraints

- Visible UI copy is Arabic only, uses RTL layout, Western digits, and `د.إ` for money.
- Gold price, making charge, and weight are empty on first launch; purity defaults to 21K.
- VAT is exactly 5% of gold cost plus making charges.
- Runtime code has no external fonts, CDNs, APIs, libraries, tracking, or backend.
- All application asset URLs must work below `https://USERNAME.github.io/REPOSITORY/`.
- Inputs must remain usable on iPhone Safari without focus zoom or horizontal scrolling.
- Do not claim physical iPhone testing unless it actually occurs.

## Review Focus

- Decimal commas pasted into numeric fields must be rejected consistently rather than silently miscalculated; Task 1 pins strict decimal parsing.
- Extremely large finite inputs must never render `Infinity`; Task 1 tests non-finite calculated results.
- An installed old service worker must update to the new cache version without deleting unrelated caches; Task 3 tests cache-name scoping.
- Corrupt or unavailable localStorage must not prevent calculator startup; Task 2 tests the storage fallback.
- A reset after persisted edits must clear storage, restore 21K, and return every result to a dash; Task 2 tests the complete reset path.

---

### Task 1: Calculation and formatting core

**Files:**
- Create: `package.json`
- Create: `app.js`
- Create: `tests/app.test.js`

**Interfaces:**
- Produces: `parseNonNegativeDecimal(value: string) -> number | null`
- Produces: `calculateQuote({ goldPrice, makingCharge, weight }) -> { goldCost, makingCharges, subtotal, vat, totalWithVat } | null`
- Produces: `formatMoney(value: number | null) -> string`

- [ ] **Step 1: Write failing calculation and formatting tests**

Use `node:test` assertions for the supplied `375`, `25`, `10` example; fractional weight `12.75`; valid zero fields; blank, negative, malformed, decimal-comma, and non-finite inputs; and Western-digit formatting with two decimals and `د.إ`.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- --test-name-pattern="calculation|formatting|parsing"`

Expected: FAIL because `app.js` exports do not exist.

- [ ] **Step 3: Implement the pure functions in `app.js`**

Use strict finite non-negative parsing, compute the five specified values without intermediate display rounding, return `null` for incomplete/invalid or non-finite calculations, and format valid amounts with `Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` followed by ` د.إ`.

- [ ] **Step 4: Run the focused tests and verify success**

Run: `npm test -- --test-name-pattern="calculation|formatting|parsing"`

Expected: all focused tests PASS.

### Task 2: Arabic calculator interface, persistence, and reset

**Files:**
- Create: `index.html`
- Create: `style.css`
- Modify: `app.js`
- Modify: `tests/app.test.js`

**Interfaces:**
- Consumes: Task 1 calculation and formatting exports.
- Produces: `loadSavedState(storage) -> { goldPrice: string, makingCharge: string, purity: string, weight: string }`
- Produces: `saveState(storage, state) -> boolean`
- Produces: `clearSavedState(storage) -> boolean`
- Produces: guarded `initializeCalculator(document, storage)` browser initializer.

- [ ] **Step 1: Add failing persistence and DOM-state tests**

Test saved-state restoration, invalid/corrupt storage fallback, storage exceptions, edits saved under one namespaced key, incomplete results rendered as `—`, and reset clearing storage/restoring `21`/clearing the three numeric inputs and five results.

- [ ] **Step 2: Run the interface-state tests and verify failure**

Run: `npm test -- --test-name-pattern="state|storage|reset|render"`

Expected: FAIL because persistence and initialization interfaces do not exist.

- [ ] **Step 3: Build the semantic Arabic-only markup in `index.html`**

Include the four labeled controls, 18K/21K/22K/24K segmented purity buttons, Arabic estimate note, reset button, three detail rows, subtotal block, prominent VAT-inclusive total, `dir="rtl"`, decimal input modes, PWA metadata, and relative asset links.

- [ ] **Step 4: Implement the mobile visual system in `style.css`**

Use local system fonts, a warm off-white canvas, restrained gold accents, safe-area insets, 16px minimum input text, 44px touch targets, responsive narrow-screen spacing, readable focus states, reduced-motion handling, and overflow protection.

- [ ] **Step 5: Implement browser behavior in `app.js`**

Restore state defensively, update results on each input, use the purity selector only as saved informational state, save edits, implement full reset, and register the service worker through the relative URL `./service-worker.js` only in a secure context with API support.

- [ ] **Step 6: Run all app tests and verify success**

Run: `npm test`

Expected: all calculation, persistence, reset, and render tests PASS.

### Task 3: Installable offline PWA and local icons

**Files:**
- Create: `manifest.webmanifest`
- Create: `service-worker.js`
- Create: `icons/icon-192.png`
- Create: `icons/icon-512.png`
- Create: `icons/icon-maskable-512.png`
- Create: `icons/apple-touch-icon.png`
- Create: `tests/pwa.test.js`

**Interfaces:**
- Consumes: Task 2 relative asset links and service-worker registration.
- Produces: a scoped app-shell cache and offline navigation fallback for the GitHub Pages project path.

- [ ] **Step 1: Write failing static PWA contract tests**

Assert manifest Arabic names, `standalone` display, relative start URL/scope, required icon sizes and purposes, local icon existence/signatures, HTML Apple metadata, explicit calculator-prefixed cache version, only relative precache URLs, scoped old-cache cleanup, and cached `index.html` navigation fallback.

- [ ] **Step 2: Run PWA tests and verify failure**

Run: `npm test -- --test-name-pattern="PWA|manifest|service worker|icons"`

Expected: FAIL because the manifest, worker, and icons do not exist.

- [ ] **Step 3: Add `manifest.webmanifest` and PWA metadata**

Set `name` and `short_name` to `حاسبة الذهب`, use relative `start_url` and `scope`, standalone display, matching theme/background colors, `lang: ar`, `dir: rtl`, and local 192px, 512px, and maskable icons.

- [ ] **Step 4: Implement `service-worker.js`**

Precache every essential local asset using `./` paths, call `skipWaiting()` and `clients.claim()`, delete only older caches whose names begin with the calculator cache prefix, serve same-origin GET assets cache-first with refresh, and fall back to cached `./index.html` for failed navigation requests.

- [ ] **Step 5: Create the PNG icon set**

Render a simple original gold calculator/ingot mark on an opaque warm background at 192×192, 512×512, maskable 512×512 with safe padding, and 180×180 for Apple touch.

- [ ] **Step 6: Run all tests and verify success**

Run: `npm test`

Expected: all test files PASS and each PNG has the required dimensions.

### Task 4: Deployment guide and end-to-end verification

**Files:**
- Create: `README.md`
- Create: `tests/content.test.js`
- Modify: any implementation file found deficient during verification.

**Interfaces:**
- Consumes: the complete static application from Tasks 1–3.
- Produces: a deployable project with reproducible setup, installation, offline-test, and validation instructions.

- [ ] **Step 1: Add failing documentation/content tests**

Assert the README includes GitHub Settings → Pages deployment, the `USERNAME.github.io/REPOSITORY/` shape, Safari Add to Home Screen instructions, Airplane Mode offline verification, calculation formulas, automated test command, and the physical-device testing limitation.

- [ ] **Step 2: Run documentation tests and verify failure**

Run: `npm test -- --test-name-pattern="README|content"`

Expected: FAIL because `README.md` does not exist.

- [ ] **Step 3: Write `README.md`**

Document local viewing through a static server, tests, formulas, GitHub Pages deployment, Safari installation, first-load caching, Airplane Mode verification, update behavior, and the exact automated versus manual checks performed.

- [ ] **Step 4: Run the full automated suite**

Run: `npm test`

Expected: all calculation, state, PWA, icon, and documentation tests PASS.

- [ ] **Step 5: Serve and inspect the app at mobile widths**

Run: `python -m http.server 4173` and inspect at 320px, 375px, and 430px widths. Confirm RTL alignment, no horizontal scrolling, safe-area spacing, 16px inputs, segmented-control wrapping/fit, live calculations, reset, and refresh persistence.

- [ ] **Step 6: Verify browser cache and offline reload**

In a browser with service workers enabled, load once online, confirm worker activation and cached app-shell entries, switch the browser context offline, and reload the page successfully. Record that this is browser verification rather than a physical iPhone test.

- [ ] **Step 7: Re-run tests after any verification fixes**

Run: `npm test`

Expected: all tests PASS after the final source state.
