import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateQuote,
  clearSavedState,
  formatMoney,
  initializeCalculator,
  loadSavedState,
  parseNonNegativeDecimal,
  saveState,
  startCalculator,
} from '../app.js';

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  toggle(name, force) {
    if (force) this.values.add(name);
    else this.values.delete(name);
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor({ value = '', dataset = {} } = {}) {
    this.value = value;
    this.dataset = dataset;
    this.textContent = '';
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.attributes = new Map();
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  dispatch(type) {
    this.listeners.get(type)?.({ currentTarget: this });
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }
}

function createFakeDocument() {
  const elements = {
    'gold-price': new FakeElement(),
    'making-charge': new FakeElement(),
    weight: new FakeElement(),
    reset: new FakeElement(),
    'gold-cost': new FakeElement(),
    'making-total': new FakeElement(),
    vat: new FakeElement(),
    subtotal: new FakeElement(),
    total: new FakeElement(),
  };
  const purityButtons = ['18', '21', '22', '24'].map(
    (purity) => new FakeElement({ dataset: { purity } }),
  );

  return {
    elements,
    purityButtons,
    getElementById(id) {
      return elements[id] ?? null;
    },
    querySelectorAll(selector) {
      return selector === '[data-purity]' ? purityButtons : [];
    },
  };
}

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    entries() {
      return [...values.entries()];
    },
  };
}

test('parsing accepts complete non-negative Western decimal values', () => {
  assert.equal(parseNonNegativeDecimal('375.50'), 375.5);
  assert.equal(parseNonNegativeDecimal('0'), 0);
  assert.equal(parseNonNegativeDecimal('.5'), 0.5);
  assert.equal(parseNonNegativeDecimal('10.'), 10);
});

test('parsing rejects blank, negative, malformed, comma, and non-finite values', () => {
  for (const value of ['', '   ', '-1', '+1', '1,25', '1.2.3', 'abc', 'Infinity', '1e309']) {
    assert.equal(parseNonNegativeDecimal(value), null, value);
  }
});

test('calculation matches the supplied acceptance example', () => {
  assert.deepEqual(
    calculateQuote({ goldPrice: '375', makingCharge: '25', weight: '10' }),
    {
      goldCost: 3750,
      makingCharges: 250,
      subtotal: 4000,
      vat: 200,
      totalWithVat: 4200,
    },
  );
});

test('calculation keeps fractional weight precision until display', () => {
  assert.deepEqual(
    calculateQuote({ goldPrice: '375.5', makingCharge: '25.25', weight: '12.75' }),
    {
      goldCost: 4787.625,
      makingCharges: 321.9375,
      subtotal: 5109.5625,
      vat: 255.478125,
      totalWithVat: 5365.040625,
    },
  );
});

test('calculation accepts explicit zero values', () => {
  assert.deepEqual(
    calculateQuote({ goldPrice: '0', makingCharge: '0', weight: '0' }),
    {
      goldCost: 0,
      makingCharges: 0,
      subtotal: 0,
      vat: 0,
      totalWithVat: 0,
    },
  );
});

test('calculation rejects incomplete, invalid, and overflowing inputs', () => {
  assert.equal(calculateQuote({ goldPrice: '', makingCharge: '25', weight: '10' }), null);
  assert.equal(calculateQuote({ goldPrice: '-1', makingCharge: '25', weight: '10' }), null);
  assert.equal(
    calculateQuote({ goldPrice: `1${'0'.repeat(307)}`, makingCharge: '0', weight: '100' }),
    null,
  );
});

test('formatting uses Western digits, separators, two decimals, and dirhams', () => {
  assert.equal(formatMoney(4200), '4,200.00 د.إ');
  assert.equal(formatMoney(0), '0.00 د.إ');
  assert.equal(formatMoney(5365.040625), '5,365.04 د.إ');
  assert.equal(formatMoney(null), '—');
  assert.equal(formatMoney(Number.POSITIVE_INFINITY), '—');
});

test('state defaults to empty numeric fields and 21K purity', () => {
  assert.deepEqual(loadSavedState(createMemoryStorage()), {
    goldPrice: '',
    makingCharge: '',
    purity: '21',
    weight: '',
  });
});

test('storage restores valid state and falls back from corrupt or unavailable data', () => {
  const state = { goldPrice: '375', makingCharge: '25', purity: '22', weight: '10' };
  const storage = createMemoryStorage({ 'uae-gold-calculator-state-v1': JSON.stringify(state) });
  assert.deepEqual(loadSavedState(storage), state);

  const corrupt = createMemoryStorage({ 'uae-gold-calculator-state-v1': '{broken' });
  assert.deepEqual(loadSavedState(corrupt), { goldPrice: '', makingCharge: '', purity: '21', weight: '' });

  const unavailable = { getItem() { throw new Error('blocked'); } };
  assert.deepEqual(loadSavedState(unavailable), { goldPrice: '', makingCharge: '', purity: '21', weight: '' });
});

test('storage saves one namespaced state entry and clears it', () => {
  const storage = createMemoryStorage();
  const state = { goldPrice: '375', makingCharge: '25', purity: '21', weight: '10' };

  assert.equal(saveState(storage, state), true);
  assert.deepEqual(storage.entries(), [['uae-gold-calculator-state-v1', JSON.stringify(state)]]);
  assert.equal(clearSavedState(storage), true);
  assert.equal(storage.length, 0);

  const unavailable = {
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  assert.equal(saveState(unavailable, state), false);
  assert.equal(clearSavedState(unavailable), false);
});

test('render restores saved values and displays a complete quote', () => {
  const document = createFakeDocument();
  const state = { goldPrice: '375', makingCharge: '25', purity: '22', weight: '10' };
  const storage = createMemoryStorage({ 'uae-gold-calculator-state-v1': JSON.stringify(state) });

  initializeCalculator(document, storage);

  assert.equal(document.elements['gold-price'].value, '375');
  assert.equal(document.elements['making-charge'].value, '25');
  assert.equal(document.elements.weight.value, '10');
  assert.equal(document.elements['gold-cost'].textContent, '3,750.00 د.إ');
  assert.equal(document.elements['making-total'].textContent, '250.00 د.إ');
  assert.equal(document.elements.vat.textContent, '200.00 د.إ');
  assert.equal(document.elements.subtotal.textContent, '4,000.00 د.إ');
  assert.equal(document.elements.total.textContent, '4,200.00 د.إ');
  assert.equal(document.purityButtons[2].classList.contains('is-selected'), true);
  assert.equal(document.purityButtons[2].getAttribute('aria-pressed'), 'true');
});

test('render leaves every result incomplete until all numeric fields are valid', () => {
  const document = createFakeDocument();
  initializeCalculator(document, createMemoryStorage());

  for (const id of ['gold-cost', 'making-total', 'vat', 'subtotal', 'total']) {
    assert.equal(document.elements[id].textContent, '—');
  }
});

test('state edits save and reset clears values, results, storage, and purity', () => {
  const document = createFakeDocument();
  const storage = createMemoryStorage();
  initializeCalculator(document, storage);

  document.elements['gold-price'].value = '375';
  document.elements['gold-price'].dispatch('input');
  document.elements['making-charge'].value = '25';
  document.elements['making-charge'].dispatch('input');
  document.elements.weight.value = '10';
  document.elements.weight.dispatch('input');
  document.purityButtons[3].dispatch('click');

  assert.equal(JSON.parse(storage.entries()[0][1]).purity, '24');
  assert.equal(document.elements.total.textContent, '4,200.00 د.إ');

  document.elements.reset.dispatch('click');

  assert.equal(document.elements['gold-price'].value, '');
  assert.equal(document.elements['making-charge'].value, '');
  assert.equal(document.elements.weight.value, '');
  assert.equal(document.purityButtons[1].classList.contains('is-selected'), true);
  assert.equal(document.elements.total.textContent, '—');
  assert.equal(storage.length, 0);
});

test('startup remains usable when reading the localStorage property throws', () => {
  const document = createFakeDocument();
  const windowObject = {
    isSecureContext: false,
    get localStorage() {
      throw new DOMException('Blocked', 'SecurityError');
    },
  };

  assert.doesNotThrow(() => startCalculator(document, windowObject, {}));
  assert.equal(document.elements.total.textContent, '—');
  document.elements['gold-price'].value = '375';
  assert.doesNotThrow(() => document.elements['gold-price'].dispatch('input'));
});
