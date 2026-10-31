# UAE Gold Calculator — Design Specification

## Intent

Build a lightweight Arabic iPhone web app for UAE customers to estimate a gold purchase from a manually entered per-gram gold price, making charge, purity, and weight. The app should feel immediate and focused, work without a backend, and remain usable offline after its first successful load.

## Goals

- Present an Arabic-only, right-to-left calculator optimized for iPhone Safari.
- Calculate gold cost, making charges, subtotal, 5% VAT, and total instantly.
- Use Western digits, thousands separators, two decimal places, and `د.إ` for money.
- Install cleanly from Safari using Add to Home Screen and run in standalone mode.
- Cache all essential files for offline use under a GitHub Pages project subpath.
- Restore the last entered values after reopening the app.
- Keep the implementation small, dependency-free, and easy to deploy.

## Non-goals

- Live gold prices, purity conversion, accounts, analytics, advertising, charts, currency conversion, backend services, or detailed tax rules.
- A general jewelry inventory, invoicing, or point-of-sale system.
- English labels in the visible interface.

## Anti-goals

- A crowded screen, long explanatory copy, unnecessary motion, or framework-generated complexity.
- Requiring a calculate button or a network connection after the initial cache is installed.
- Showing `NaN`, `Infinity`, negative totals, or misleading placeholder totals for incomplete input.

## Agreed Product Decisions

- The visible interface is Arabic only and fully RTL.
- Numeric values use Western digits.
- Gold price, making charge, and weight start empty on first launch.
- Purity defaults to 21K and is informational only.
- Monetary results use `د.إ`.
- The implementation uses plain HTML, CSS, and JavaScript with no runtime dependencies.

## Interface

The page uses a warm off-white background and one centered, narrow column sized for iPhones. Safe-area padding protects content from the Dynamic Island, browser chrome, and Home indicator.

The top area contains the app title `حاسبة الذهب` and a short Arabic line explaining that the result is an estimate. A compact input card follows with:

1. `سعر الذهب للجرام` — decimal numeric input, with a short note that the price must match the selected purity.
2. `سعر المصنعية للجرام` — decimal numeric input.
3. `عيار الذهب` — a four-option segmented selector for 18K, 21K, 22K, and 24K, defaulting to 21K.
4. `وزن الذهب بالجرام` — decimal numeric input.

All numeric inputs use an iPhone-friendly decimal keyboard, a minimum 16px font size, and clear focus styling. A small `إعادة تعيين` button clears the three numeric fields, restores 21K, clears saved values, and returns the output to its incomplete state.

A results card titled `تفاصيل السعر` shows gold cost, total making charges, and 5% VAT as compact rows. Below it, the subtotal and total including VAT appear as separate blocks. The VAT-inclusive total uses the strongest gold accent and largest type.

Until all required numeric inputs contain valid non-negative values, results show a neutral dash rather than a calculated zero. A valid zero is calculated normally once all required fields are present.

## Calculation and Formatting

The calculator treats entered values as decimal numbers and computes with their full JavaScript numeric precision:

```text
goldCost = goldPricePerGram × weight
makingCharges = makingChargePerGram × weight
subtotal = goldCost + makingCharges
vat = subtotal × 0.05
totalWithVat = subtotal + vat
```

Values are rounded only for display and formatted with Western digits, thousands separators, and exactly two decimal places. The acceptance example must display:

- Gold cost: `3,750.00 د.إ`
- Making charges: `250.00 د.إ`
- VAT: `200.00 د.إ`
- Total without VAT: `4,000.00 د.إ`
- Total with VAT: `4,200.00 د.إ`

Negative values and non-finite values are rejected. Empty or partial entries leave the results incomplete without errors.

## Persistence

Every valid edit is saved locally using `localStorage`. On launch, saved gold price, making charge, purity, and weight are restored. The app does not seed sample data. Reset removes the stored calculator state.

## PWA and Offline Behavior

The app consists of `index.html`, `style.css`, `app.js`, `manifest.webmanifest`, `service-worker.js`, local icons, and a README. All resource URLs are relative so deployment works at `https://USERNAME.github.io/REPOSITORY/`.

The service worker derives its cache scope from its own registration context, precaches the application shell, and serves cached local assets offline. Cache versions are explicit so updates replace old application assets. Navigation requests fall back to the cached `index.html` within the project scope.

The manifest and HTML include an Arabic app name, standalone display mode, theme/background colors, Apple mobile web app metadata, and local icons suitable for Safari Home Screen installation. No remote fonts, CDNs, APIs, or runtime resources are used.

## Accessibility and Mobile Constraints

- Semantic labels are connected to every control.
- Touch targets are at least 44px where practical.
- Text and gold accents maintain readable contrast.
- Results are exposed as a live region without intrusive announcements on every keystroke.
- The layout has no horizontal scrolling at narrow iPhone widths.
- Motion is minimal and respects reduced-motion preferences.

## Verification

Automated checks will cover the supplied example, decimal and fractional weights, zero values, blank and invalid values, negative input handling, reset behavior, and saved-state restoration. Static PWA checks will verify that required assets exist and use project-relative paths.

The finished app will also be inspected at narrow mobile viewport sizes and tested through a local static server for service-worker registration, cache installation, refresh persistence, and offline reload. Documentation will distinguish automated/browser simulation from physical iPhone testing; physical iPhone behavior will not be claimed unless actually performed.

## Approaches Considered

### Selected: dependency-free static application

Plain HTML, CSS, and JavaScript provide the smallest download, simplest offline cache, and direct GitHub Pages deployment. This matches the product's limited scope and simplicity requirement.

### Rejected: framework and build tool

A React-style application could provide component structure, but the calculator has too little state and UI complexity to justify dependencies, generated assets, and a build/deployment step.

### Rejected: single-file application

Inlining all CSS and JavaScript into one HTML file would reduce the file count, but it conflicts with the requested deliverable structure and makes maintenance and cache updates less clear.

## Builder Discretion

The builder may choose the exact warm-neutral and gold color values, type scale, spacing, icon geometry, internal function names, and test tooling, provided the agreed behavior, Arabic-only interface, accessibility, and zero-dependency runtime are preserved.
