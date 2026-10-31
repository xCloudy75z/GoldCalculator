import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

function pngDimensions(buffer) {
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function loadWorkerHarness({
  cacheKeys = [],
  cachedIndex = null,
  fetchResult = null,
  scope = 'https://example.test/repository/',
} = {}) {
  const source = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
  const listeners = new Map();
  const deleted = [];
  const precached = [];
  const cacheEntries = new Map();
  const caches = {
    async open() {
      return {
        async addAll(urls) {
          precached.push(...urls);
        },
        async put(request, response) {
          cacheEntries.set(request.url ?? request, response);
        },
      };
    },
    async keys() {
      return cacheKeys;
    },
    async delete(key) {
      deleted.push(key);
      return true;
    },
    async match(request) {
      if (request === './index.html') return cachedIndex;
      return cacheEntries.get(request.url ?? request) ?? null;
    },
  };
  const self = {
    location: new URL('service-worker.js', scope),
    registration: { scope },
    clients: { async claim() {} },
    skipWaiting() {},
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
  };
  const context = {
    self,
    caches,
    URL,
    Response,
    Request,
    fetch: async () => {
      if (fetchResult instanceof Error) throw fetchResult;
      return fetchResult ?? new Response('network');
    },
  };

  vm.runInNewContext(source, context, { filename: 'service-worker.js' });
  return { listeners, deleted, precached };
}

test('PWA manifest is Arabic, standalone, project-relative, and has required icons', async () => {
  const manifest = await readJson('../manifest.webmanifest');
  assert.equal(manifest.name, 'حاسبة الذهب');
  assert.equal(manifest.short_name, 'حاسبة الذهب');
  assert.equal(manifest.lang, 'ar');
  assert.equal(manifest.dir, 'rtl');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.deepEqual(
    manifest.icons.map(({ src, sizes, purpose = 'any' }) => ({ src, sizes, purpose })),
    [
      { src: './icons/icon-192.png', sizes: '192x192', purpose: 'any' },
      { src: './icons/icon-512.png', sizes: '512x512', purpose: 'any' },
      { src: './icons/icon-maskable-512.png', sizes: '512x512', purpose: 'maskable' },
    ],
  );
});

test('icons are real PNGs with the declared dimensions', async () => {
  const cases = [
    ['../icons/icon-192.png', 192],
    ['../icons/icon-512.png', 512],
    ['../icons/icon-maskable-512.png', 512],
    ['../icons/apple-touch-icon.png', 180],
  ];

  for (const [path, size] of cases) {
    const buffer = await readFile(new URL(path, import.meta.url));
    assert.deepEqual(pngDimensions(buffer), { width: size, height: size }, path);
  }
});

test('HTML exposes Apple installation metadata and relative PWA assets', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="حاسبة الذهب"/);
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon" href="\.\/icons\/apple-touch-icon\.png"/);
});

test('service worker precaches only project-relative application-shell URLs', async () => {
  const harness = await loadWorkerHarness();
  let work;
  harness.listeners.get('install')({ waitUntil(promise) { work = promise; } });
  await work;

  assert.ok(harness.precached.includes('./index.html'));
  assert.ok(harness.precached.includes('./app.js'));
  assert.ok(harness.precached.includes('./manifest.webmanifest'));
  assert.ok(harness.precached.every((url) => url.startsWith('./')));
});

test('service worker activation deletes only older calculator caches', async () => {
  const harness = await loadWorkerHarness({
    cacheKeys: [
      'uae-gold-calculator-%2Frepository%2F-v0',
      'uae-gold-calculator-%2Frepository%2F-v1',
      'uae-gold-calculator-%2Fother-project%2F-v0',
      'another-app-v1',
    ],
  });
  let work;
  harness.listeners.get('activate')({ waitUntil(promise) { work = promise; } });
  await work;

  assert.deepEqual(harness.deleted, ['uae-gold-calculator-%2Frepository%2F-v0']);
});

test('service worker cache cleanup is isolated between project scopes', async () => {
  const harness = await loadWorkerHarness({
    scope: 'https://example.test/second-repository/',
    cacheKeys: [
      'uae-gold-calculator-%2Frepository%2F-v0',
      'uae-gold-calculator-%2Fsecond-repository%2F-v0',
      'uae-gold-calculator-%2Fsecond-repository%2F-v1',
    ],
  });
  let work;
  harness.listeners.get('activate')({ waitUntil(promise) { work = promise; } });
  await work;

  assert.deepEqual(harness.deleted, ['uae-gold-calculator-%2Fsecond-repository%2F-v0']);
});

test('service worker returns cached index when offline navigation fails', async () => {
  const offlinePage = new Response('<h1>offline</h1>');
  const harness = await loadWorkerHarness({
    cachedIndex: offlinePage,
    fetchResult: new Error('offline'),
  });
  let responsePromise;
  const request = new Request('https://example.test/repository/deep-link');
  Object.defineProperty(request, 'mode', { value: 'navigate' });
  harness.listeners.get('fetch')({
    request,
    respondWith(promise) { responsePromise = promise; },
  });

  assert.equal(await responsePromise, offlinePage);
});
