const WESTERN_DECIMAL_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

const moneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseNonNegativeDecimal(value) {
  const normalized = String(value ?? '').trim();

  if (!normalized || !WESTERN_DECIMAL_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function calculateQuote({ goldPrice, makingCharge, weight }) {
  const parsedGoldPrice = parseNonNegativeDecimal(goldPrice);
  const parsedMakingCharge = parseNonNegativeDecimal(makingCharge);
  const parsedWeight = parseNonNegativeDecimal(weight);

  if (parsedGoldPrice === null || parsedMakingCharge === null || parsedWeight === null) {
    return null;
  }

  const goldCost = parsedGoldPrice * parsedWeight;
  const makingCharges = parsedMakingCharge * parsedWeight;
  const subtotal = goldCost + makingCharges;
  const vat = subtotal * 0.05;
  const totalWithVat = subtotal + vat;
  const values = [goldCost, makingCharges, subtotal, vat, totalWithVat];

  if (!values.every(Number.isFinite)) {
    return null;
  }

  return { goldCost, makingCharges, subtotal, vat, totalWithVat };
}

export function formatMoney(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return `${moneyFormatter.format(value)} د.إ`;
}
