import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateQuote,
  formatMoney,
  parseNonNegativeDecimal,
} from '../app.js';

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
